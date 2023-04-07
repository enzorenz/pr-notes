import * as core from '@actions/core'
import * as github from '@actions/github'

import {Octokit, Commit, PrEntry, PrEntryWithRelatedIssues} from '../types'
import {COMMIT_TYPES} from '../constants'

const urlRegex =
  /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)/g

export class BodyUtility {
  private octokit: Octokit

  constructor(octokit: Octokit) {
    this.octokit = octokit
  }

  /**
   * This function composes a changelog by retrieving PR links and grouping them by related issues or
   * commit types.
   * @param {string} sourceBranch - The name of the source branch to compare with the target branch.
   * @param {string} targetBranch - The target branch is the branch that the changes will be merged
   * into.
   * @param {string} body - The `body` parameter is a string that represents the body of the pull
   * request. It can be used to add additional information or context to the pull request. If no value
   * is provided, an empty string is used.
   * @param {string} resolveLineKeyword - `resolveLineKeyword` is a string parameter that represents a
   * keyword used to identify if a pull request has been resolved. This is used in the
   * `fetchPrsWithIssues` function to filter out pull requests that have already been resolved.
   * @param {string} listTitle - The `listTitle` parameter is a string that represents the title of the
   * changelog list that will be added to the body of the pull request. If this parameter is not
   * provided, an empty string will be used instead.
   * @param {string[]} excludeKeywords - `excludeKeywords` is an array of strings that contains
   * keywords that should be excluded from the changelog. If a commit message contains any of these
   * keywords, it will not be included in the changelog.
   * @param {boolean} commitTypeGrouping - A boolean flag that determines whether the PRs should be
   * grouped by commit type or not. If set to true, the PRs will be grouped by commit type and
   * displayed under their respective headings. If set to false, the PRs will be displayed in a flat
   * list without any grouping.
   * @param {boolean} withAuthor - The `withAuthor` parameter is a boolean flag that determines whether
   * or not to include the author's name in the generated changelog. If `true`, the author's name will
   * be included in the changelog, otherwise it will not be included.
   * @returns a Promise that resolves to a string. The string is the body of a changelog that includes
   * links to pull requests and related issues, grouped by commit type and/or related issue. The body
   * may also include a title for the list and exclude certain keywords. The function takes several
   * parameters, including the source and target branches, the body of the changelog, and various
   * options for grouping
   */
  async compose(
    sourceBranch: string,
    targetBranch: string,
    body: string,
    resolveLineKeyword: string,
    listTitle: string,
    excludeKeywords: string[],
    commitTypeGrouping: boolean,
    withAuthor: boolean
  ): Promise<string> {
    core.info(
      `Retrieving PR links for all diffs between head ${sourceBranch} and base ${targetBranch}...`
    )
    let bodyWithChangelog: string = body ?? ''

    if (listTitle) {
      bodyWithChangelog += listTitle ? `\n\r### ${listTitle}` : ''
    }

    const commitShas = await this.getCommitShas(sourceBranch, targetBranch)
    const prsWithIssues = await this.fetchPrsWithIssues(
      commitShas,
      resolveLineKeyword,
      excludeKeywords
    )

    // collect all issues so we can group prs via related issue
    let prsObject: Record<number, PrEntryWithRelatedIssues> = {}
    let allIssues: string[] = []
    let prsWithoutRelatedIssue: PrEntry[] = []
    for (const [pr, relatedIssues] of prsWithIssues) {
      prsObject[pr.id] = {
        ...pr,
        relatedIssues
      }
      allIssues = allIssues.concat(relatedIssues)
      if (!relatedIssues.length) {
        prsWithoutRelatedIssue.push(pr)
      }
    }
    // returns unique issues, removing duplicates
    allIssues = [...new Set(allIssues)]

    // creates object of issues with related prs as the value
    core.info('Grouping by related issues...')
    let issuesObject: Record<string, PrEntryWithRelatedIssues[]> = {}
    for (const issue of allIssues) {
      const prs: PrEntryWithRelatedIssues[] = []
      for (const pr in prsObject) {
        if (prsObject[pr].relatedIssues?.includes(issue)) {
          prs.push(prsObject[pr])
        }
      }

      issuesObject[issue] = prs
    }
    issuesObject['no-issue'] = prsWithoutRelatedIssue

    // Process body changelog without commit type grouping
    if (!commitTypeGrouping) {
      core.info('Processing body changelog without commit type grouping...')
      for (const issue in issuesObject) {
        if (issue === 'no-issue') {
          for (const pr of issuesObject[issue]) {
            const author = pr.head.user?.name ?? `${pr.head.user?.login}`
            bodyWithChangelog += `\n- ${pr.html_url}${
              withAuthor && author ? ' - ' + author : ''
            }`
          }
          continue
        }

        bodyWithChangelog += `\n- ${issue}`
        for (const pr of issuesObject[issue]) {
          const author = pr.head.user?.name ?? `${pr.head.user?.login}`
          bodyWithChangelog += `\n  - ${pr.html_url}${
            withAuthor && author ? ' - ' + author : ''
          }`
        }
      }

      return bodyWithChangelog
    }

    const commitTypesObject = this.groupByCommitType(issuesObject)

    core.info('Rearranging commit groups...')
    const rearrangedCommitTypesObject: typeof commitTypesObject = {}
    for (const v of Object.values(COMMIT_TYPES)) {
      if (!commitTypesObject[v]) {
        continue
      }
      rearrangedCommitTypesObject[v] = commitTypesObject[v]
    }

    // Process body changelog without commit type grouping
    core.info('Processing body changelog with commit type grouping...')
    for (const commitType in rearrangedCommitTypesObject) {
      if (
        commitType === COMMIT_TYPES.other &&
        !Object.keys(rearrangedCommitTypesObject[commitType]).length
      ) {
        continue
      }

      bodyWithChangelog += `\n## ${commitType}`

      for (const issue in rearrangedCommitTypesObject[commitType]) {
        if (issue === 'no-issue') {
          for (const pr of issuesObject[issue]) {
            const author = pr.head.user?.name ?? `${pr.head.user?.login}`
            bodyWithChangelog += `\n- ${pr.html_url}${
              withAuthor && author ? ' - ' + author : ''
            }`
          }
          continue
        }

        bodyWithChangelog += `\n- ${issue}`
        for (const pr of rearrangedCommitTypesObject[commitType][issue]) {
          const author = pr.head.user?.name ?? `${pr.head.user?.login}`
          bodyWithChangelog += `\n  - ${pr.html_url}${
            withAuthor && author ? ' - ' + author : ''
          }`
        }
      }
    }

    return bodyWithChangelog
  }

  /**
   * This function fetches all associated commits between two branches and returns their SHA values.
   * @param {string} sourceBranch - The name of the source branch that you want to compare with the
   * target branch.
   * @param {string} targetBranch - The target branch is the branch that you want to compare the source
   * branch to. In the code snippet, it is passed as a parameter to the `getCommitShas` function.
   * @returns an array of strings, which are the SHA values of all the associated commits between the
   * sourceBranch and targetBranch.
   */
  private async getCommitShas(
    sourceBranch: string,
    targetBranch: string
  ): Promise<string[]> {
    core.debug(
      `Fetching all associated commits of ${sourceBranch} and ${targetBranch}...`
    )

    const resp = await this.octokit.rest.repos.compareCommits({
      ...github.context.repo,
      head: sourceBranch,
      base: targetBranch
    })

    return resp.data.commits.map((entry: Commit) => entry.sha)
  }

  /**
   * This function fetches associated pull request links and related issues of commit shas.
   * @param {string[]} commitShas - An array of commit SHA values for which associated pull requests
   * and related issues need to be fetched.
   * @param {string} resolveLineKeyword - `resolveLineKeyword` is a string parameter that represents a
   * keyword used to identify a line in the body of a pull request that contains information about
   * related issues. This method searches for this keyword in the body of each pull request associated
   * with a given commit SHA.
   * @param {string[]} excludeKeywords - `excludeKeywords` is an array of strings that contains
   * keywords that should be excluded from the search for associated pull requests. If a pull request's
   * title includes any of these keywords, it will be skipped and not included in the final result.
   * @returns a Promise that resolves to a Map object, where each key is a PrEntry object and each
   * value is an array of related issue numbers as strings.
   */
  private async fetchPrsWithIssues(
    commitShas: string[],
    resolveLineKeyword: string,
    excludeKeywords: string[]
  ): Promise<Map<PrEntry, string[]>> {
    core.debug(
      `Fetching associated pull request's link and related issues of commit shas: ${commitShas.toString()}`
    )
    const prUrlWithIssues = new Map<PrEntry, string[]>()

    for (const commitSha of commitShas) {
      const resp =
        await this.octokit.rest.repos.listPullRequestsAssociatedWithCommit({
          ...github.context.repo,
          commit_sha: commitSha
        })

      for (const entryPR of resp.data) {
        if (
          entryPR.state === 'open' ||
          excludeKeywords.some(keyword =>
            entryPR.title.toLowerCase().includes(keyword)
          )
        ) {
          continue
        }
        const entryBody = entryPR.body ?? ''
        const bodyLines = entryBody.split('\n')
        const resolvesKeywordLine =
          bodyLines.find(line =>
            line.toLowerCase().includes(resolveLineKeyword)
          ) ?? ''

        const relatedIssuesFromHashtag =
          resolvesKeywordLine.match(/[^[{()}\]\s]*#\d*/g) ?? []
        const relatedIssuesFromLink =
          resolvesKeywordLine
            .match(urlRegex)
            ?.filter(url => url.includes('issues/')) ?? []
        const issues = [
          ...relatedIssuesFromHashtag,
          ...this.formatIssueLinksToHashtag(relatedIssuesFromLink)
        ]
        prUrlWithIssues.set(entryPR, [...new Set(issues)])
      }
    }

    return prUrlWithIssues
  }

  /**
   * This function formats a list of issue links into hashtags.
   * @param {string[]} links - The `links` parameter is an array of strings that represent links to
   * issues.
   * @returns The function `formatIssueLinksToHashtag` takes an array of strings called `links` as
   * input and returns a new array of strings. Each string in the new array is a hashtag followed by
   * the issue number extracted from the corresponding string in the input array. If the input string
   * does not contain an issue number, an empty string is returned instead.
   */
  private formatIssueLinksToHashtag(links: string[]) {
    return links.map(link => {
      const issue = link.match(/issues\/\d*/) ?? []
      return '#' + issue[0]?.split('/')[1] ?? ''
    })
  }

  /**
   * This function groups issues by the commit type of the first PR title that has a prefix.
   * @param issuesObject - The `issuesObject` parameter is an object with string keys and values that
   * are arrays of `PrEntryWithRelatedIssues` objects. It is used to group the issues by commit type of
   * the first PR title that has a prefix.
   * @returns a record object that groups the input `issuesObject` by the commit type of the first PR
   * title that has a prefix. The keys of the returned object are the commit types, and the values are
   * objects that contain the same structure as the input `issuesObject`, but only with the issues that
   * have a PR with a title that starts with the corresponding commit type prefix. If an
   */
  private groupByCommitType(
    issuesObject: Record<string, PrEntryWithRelatedIssues[]>
  ): Record<string, typeof issuesObject> {
    // Group issues by commit type of first PR title that has prefix
    core.info('Grouping issues by commit type of first PR title with prefix...')
    const commitTypesObject: Record<string, typeof issuesObject> = {}
    commitTypesObject[COMMIT_TYPES.other] = {}
    for (const issue in issuesObject) {
      for (const [idx, pr] of issuesObject[issue].entries()) {
        const prTitle = pr.title
        let isDone = false

        for (const prefix in COMMIT_TYPES) {
          if (prTitle.startsWith(prefix)) {
            commitTypesObject[COMMIT_TYPES[prefix]] = {
              ...(commitTypesObject[COMMIT_TYPES[prefix]] ?? {}),
              [issue]: issuesObject[issue]
            }
            isDone = true
            break
          }
        }
        if (isDone) {
          break
        }

        if (idx === issuesObject[issue].length - 1) {
          commitTypesObject[COMMIT_TYPES.other] = {
            ...(commitTypesObject[COMMIT_TYPES.other] ?? {}),
            [issue]: issuesObject[issue]
          }
        }
      }
    }

    return commitTypesObject
  }
}

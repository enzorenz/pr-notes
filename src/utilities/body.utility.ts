import * as core from '@actions/core'
import * as github from '@actions/github'

import {Octokit, Commit, PrEntry, PrEntryWithRelatedIssues} from '../types'
import {COMMIT_TYPES} from '../constants'

const urlRegex =
  // eslint-disable-next-line no-useless-escape
  /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)/g

export class BodyUtility {
  private octokit: Octokit

  constructor(octokit: Octokit) {
    this.octokit = octokit
  }

  /**
   * This is a function that composes a pull request body with a changelog based on the
   * differences between two branches, grouping commits by type and related issues.
   * @param {string} sourceBranch - The name of the source branch for the pull request.
   * @param {string} targetBranch - The target branch is the branch that the pull request is being
   * merged into.
   * @param {string} currentBody - The current body of the pull request, which is the existing text in
   * the pull request description.
   * @param {string} body - The `body` parameter is a string representing the new body of the pull
   * request. It is an optional parameter that can be used to append the generated changelog to the
   * existing pull request body. If not provided, an empty string will be used as the default value.
   * @param {string} resolveLineKeyword - The `resolveLineKeyword` parameter is a string that is used
   * to identify lines in the pull request body that indicate a resolved issue or pull request. These
   * lines will be excluded from the changelog generated by the `compose` function.
   * @param {string} listTitle - The `listTitle` parameter is a string that represents the title of the
   * changelog list that will be added to the pull request body. If it is not provided, an empty string
   * will be used instead.
   * @param {string[]} excludeKeywords - `excludeKeywords` is an array of strings that contains
   * keywords that should be excluded when searching for pull requests related to issues. If a pull
   * request contains any of these keywords in its title or body, it will not be included in the
   * changelog.
   * @param {boolean} commitTypeGrouping - A boolean flag indicating whether to group pull requests by
   * commit type in the changelog. If set to true, pull requests will be grouped by their commit type
   * (e.g. "feat", "fix", "docs", etc.) in the changelog. If set to false, pull requests will be
   * @param {boolean} withAuthor - A boolean flag indicating whether to include the author's name in
   * the changelog entry for each pull request. If true, the author's name will be included. If false,
   * only the pull request URL will be included.
   * @param {boolean} withCheckbox - A boolean flag indicating whether to include checkboxes in the
   * changelog for each PR.
   * @returns a Promise that resolves to a string. The string is the body of a pull request with a
   * changelog of all the diffs between two branches, grouped by related issues and optionally by
   * commit type. The changelog includes links to the pull requests and checkboxes for each item. The
   * function also takes in several parameters to customize the changelog.
   */
  async compose(
    sourceBranch: string,
    targetBranch: string,
    currentBody: string,
    body: string,
    resolveLineKeyword: string,
    listTitle: string,
    excludeKeywords: string[],
    commitTypeGrouping: boolean,
    withAuthor: boolean,
    withCheckbox: boolean
  ): Promise<string> {
    core.info(
      `Retrieving PR links for all diffs between head ${sourceBranch} and base ${targetBranch}...`
    )
    let bodyWithChangelog: string = body ?? ''

    // Retrieves all checked items from the current body of the pull request
    const checkedItems = currentBody
      .split('\n')
      .filter(line => /^- \[x\] (.+)/.test(line))
      .map(line => {
        const match = line.match(/^-\s*\[x\]\s*(.+?)(\s+-\s+.+)?$/)
        if (match) {
          return match[1]
        }
        return null
      })
      .filter((item): item is string => item !== null)
    core.debug(`Checked Items: ${JSON.stringify(checkedItems)}`)

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
    const prsObject: Record<number, PrEntryWithRelatedIssues> = {}
    let allIssues: string[] = []
    const prsWithoutRelatedIssue: PrEntry[] = []
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
    const issuesObject: Record<string, PrEntryWithRelatedIssues[]> = {}
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

    core.debug(
      `Sample PR: ${
        Object.keys(prsObject)[0]
          ? JSON.stringify(
              prsObject[Object.keys(prsObject)[0] as unknown as number] ||
                undefined
            )
          : ''
      }`
    )

    // Process body changelog without commit type grouping
    if (!commitTypeGrouping) {
      core.info('Processing body changelog without commit type grouping...')
      for (const issue in issuesObject) {
        if (issue === 'no-issue') {
          const uniquePRs = this.removeDuplicates(issuesObject[issue])
          for (const pr of uniquePRs) {
            const author = pr.user?.login
            const checkbox = this.addCheckbox(
              withCheckbox,
              checkedItems,
              pr.html_url
            )
            bodyWithChangelog += `\n- ${checkbox}${pr.html_url}${
              withAuthor && author ? ` - ${author}` : ''
            }`
          }
          continue
        }

        const checkbox = this.addCheckbox(withCheckbox, checkedItems, issue)
        bodyWithChangelog += `\n- ${checkbox}${issue}`
        for (const pr of issuesObject[issue]) {
          const author = pr.user?.login
          bodyWithChangelog += `\n  - ${pr.html_url}${
            withAuthor && author ? ` - ${author}` : ''
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

    // Process body changelog with commit type grouping
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
          const uniquePRs = this.removeDuplicates(
            rearrangedCommitTypesObject[commitType][issue]
          )
          for (const pr of uniquePRs) {
            const author = pr.user?.login
            const checkbox = this.addCheckbox(
              withCheckbox,
              checkedItems,
              pr.html_url
            )
            bodyWithChangelog += `\n- ${checkbox}${pr.html_url}${
              withAuthor && author ? ` - ${author}` : ''
            }`
          }
          continue
        }

        const checkbox = this.addCheckbox(withCheckbox, checkedItems, issue)
        bodyWithChangelog += `\n- ${checkbox}${issue}`
        for (const pr of rearrangedCommitTypesObject[commitType][issue]) {
          const author = pr.user?.login
          bodyWithChangelog += `\n  - ${pr.html_url}${
            withAuthor && author ? ` - ${author}` : ''
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
  private formatIssueLinksToHashtag(links: string[]): string[] {
    return links.map(link => {
      const issue = link.match(/issues\/\d*/) ?? []
      return `#${issue[0]?.split('/')[1]}` ?? ''
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
    const commitPrefixes = Object.keys(COMMIT_TYPES)
    for (const issue in issuesObject) {
      const isNoIssue = issue === 'no-issue'

      for (const [idx, pr] of issuesObject[issue].entries()) {
        const prTitle = pr.title ?? ''
        let isDone = false

        // Loop through COMMIT_TYPES object and check if prTitle starts with a key in COMMIT_TYPES
        for (const prefix in COMMIT_TYPES) {
          if (prTitle.toLowerCase().startsWith(prefix)) {
            if (isNoIssue) {
              if (
                commitTypesObject[COMMIT_TYPES[prefix]] &&
                commitTypesObject[COMMIT_TYPES[prefix]][issue]
              ) {
                commitTypesObject[COMMIT_TYPES[prefix]][issue].push(pr)
              } else {
                commitTypesObject[COMMIT_TYPES[prefix]] = {
                  ...(commitTypesObject[COMMIT_TYPES[prefix]] ?? {}),
                  [issue]: [pr]
                }
              }
            } else {
              commitTypesObject[COMMIT_TYPES[prefix]] = {
                ...(commitTypesObject[COMMIT_TYPES[prefix]] ?? {}),
                [issue]: issuesObject[issue]
              }
            }
            isDone = true
            break
          } else if (
            idx !== issuesObject[issue].length - 1 &&
            isNoIssue &&
            !commitPrefixes.some(key => prTitle.toLowerCase().startsWith(key))
          ) {
            // If prTitle doesn't start with any of the keys in COMMIT_TYPES
            if (
              commitTypesObject[COMMIT_TYPES.other] &&
              commitTypesObject[COMMIT_TYPES.other][issue]
            ) {
              commitTypesObject[COMMIT_TYPES.other][issue].push(pr)
            } else {
              commitTypesObject[COMMIT_TYPES.other] = {
                ...(commitTypesObject[COMMIT_TYPES.other] ?? {}),
                [issue]: [pr]
              }
            }
            isDone = true
            break
          }
        }

        // If commit type is found, continue or break loop depending on value of isNoIssue
        if (isDone) {
          if (isNoIssue) {
            continue
          } else {
            break
          }
        }

        // If no commits from the issue has prefix then just put in others
        if (idx === issuesObject[issue].length - 1) {
          if (isNoIssue) {
            if (
              commitTypesObject[COMMIT_TYPES.other] &&
              commitTypesObject[COMMIT_TYPES.other][issue]
            ) {
              commitTypesObject[COMMIT_TYPES.other][issue].push(pr)
            } else {
              commitTypesObject[COMMIT_TYPES.other] = {
                ...(commitTypesObject[COMMIT_TYPES.other] ?? {}),
                [issue]: [pr]
              }
            }
          } else {
            commitTypesObject[COMMIT_TYPES.other] = {
              ...(commitTypesObject[COMMIT_TYPES.other] ?? {}),
              [issue]: issuesObject[issue]
            }
          }
        }
      }
    }

    return commitTypesObject
  }

  /**
   * This function adds a checkbox to a string based on a boolean value and an array of checked items.
   * @param {boolean} withCheckbox - A boolean value indicating whether a checkbox should be added or
   * not.
   * @param {string[]} checkedItems - `checkedItems` is an array of strings that contains the items
   * that have been checked.
   * @param {string} target - The target parameter is a string that represents the item for which the
   * checkbox is being added.
   * @returns a string that contains either '[x] ' or '[ ] ' depending on the value of the
   * `withCheckbox` parameter and whether the `target` parameter is included in the `checkedItems`
   * array. If `withCheckbox` is true and `target` is included in `checkedItems`, the function returns
   * '[x] '. If `withCheckbox` is true but `target
   */
  private addCheckbox(
    withCheckbox: boolean,
    checkedItems: string[],
    target: string
  ): string {
    return withCheckbox ? (checkedItems.includes(target) ? '[x] ' : '[ ] ') : ''
  }

  /**
   * This function removes duplicates from an array of objects based on a specific property.
   * @param {PrEntryWithRelatedIssues[]} arrayOfPRs - An array of objects of type
   * `PrEntryWithRelatedIssues` which contains information about pull requests and related issues.
   * @returns The `removeDuplicates` function is returning an array of `PrEntryWithRelatedIssues`
   * objects with duplicates removed. It uses the `Map` object to filter out duplicate objects based on
   * their `id` property.
   */
  private removeDuplicates(
    arrayOfPRs: PrEntryWithRelatedIssues[]
  ): PrEntryWithRelatedIssues[] {
    return [...new Map(arrayOfPRs.map(item => [item.id, item])).values()]
  }
}

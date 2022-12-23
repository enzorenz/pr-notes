import * as core from '@actions/core'
import * as github from '@actions/github'

import {Octokit, Commit} from '../types'

const urlRegex =
  /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)/g

export class BodyUtility {
  private octokit: Octokit

  constructor(octokit: Octokit) {
    this.octokit = octokit
  }

  async compose(
    sourceBranch: string,
    targetBranch: string,
    body: string,
    resolveLineKeyword: string,
    listTitle: string
  ): Promise<string> {
    core.info(
      `Start retrieving PR links for all diffs between head ${sourceBranch} and base ${targetBranch}`
    )
    let bodyWithChangelog: string = body + listTitle ? `###${listTitle}` : ''
    const commitShas = await this.getCommitShas(sourceBranch, targetBranch)
    const prUrlWithIssues = await this.fetchPrUrlWithIssues(
      commitShas,
      resolveLineKeyword
    )

    // collect all issues so we can group prs via related issue
    let prLinksObject: Record<string, string[]> = {}
    let allIssues: string[] = []
    let prLinksWithoutRelatedIssue = []
    for (const [link, relatedIssues] of prUrlWithIssues) {
      prLinksObject[link] = relatedIssues
      allIssues = allIssues.concat(relatedIssues)
      if (!relatedIssues.length) {
        prLinksWithoutRelatedIssue.push(link)
      }
    }
    // returns unique issues, removing duplicates
    allIssues = [...new Set(allIssues)]

    // creates object of issues with related prs as the value
    let issuesObject: Record<string, string[]> = {}
    for (const issue of allIssues) {
      const prLinks = []
      for (const prLink in prLinksObject) {
        if (prLinksObject[prLink].includes(issue)) {
          prLinks.push(prLink)
        }
      }

      issuesObject[issue] = prLinks
    }

    for (const issue in issuesObject) {
      bodyWithChangelog += `\n- ${issue}`

      for (const prLink of issuesObject[issue]) {
        bodyWithChangelog += `\n  - ${prLink}`
      }
    }

    for (const prLink of prLinksWithoutRelatedIssue) {
      bodyWithChangelog += `\n- ${prLink}`
    }

    return bodyWithChangelog
  }

  private async getCommitShas(
    sourceBranch: string,
    targetBranch: string
  ): Promise<string[]> {
    core.debug(
      `Fetching all associated commits of ${sourceBranch} and ${targetBranch}`
    )

    const resp = await this.octokit.rest.repos.compareCommits({
      ...github.context.repo,
      head: sourceBranch,
      base: targetBranch
    })

    return resp.data.commits.map((entry: Commit) => entry.sha)
  }

  private async fetchPrUrlWithIssues(
    commitShas: string[],
    resolveLineKeyword: string
  ): Promise<Map<string, string[]>> {
    core.debug(
      `Fetching associated pull request's title and links of commit shas: ${commitShas.toString()}`
    )
    const prUrlWithIssues = new Map<string, string[]>()

    for (const commitSha of commitShas) {
      const resp =
        await this.octokit.rest.repos.listPullRequestsAssociatedWithCommit({
          ...github.context.repo,
          commit_sha: commitSha
        })

      for (const entry of resp.data) {
        if (entry.state === 'open') {
          continue
        }
        const entryBody = entry.body ?? ''
        const bodyLines = entryBody.split('\n')
        const resolvesKeywordLine =
          bodyLines.find(line =>
            line.toLowerCase().includes(resolveLineKeyword)
          ) ?? ''

        const relatedIssuesFromHashtag =
          resolvesKeywordLine.match(/[^[{()}\]\s]*#\d*/g) ?? []
        const relatedIssuesFromLink = resolvesKeywordLine.match(urlRegex) ?? []
        const issues = [...relatedIssuesFromHashtag, ...relatedIssuesFromLink]
        prUrlWithIssues.set(entry.html_url, [...new Set(issues)])
      }
    }

    return prUrlWithIssues
  }
}

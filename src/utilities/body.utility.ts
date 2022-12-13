import * as core from '@actions/core'
import * as github from '@actions/github'

import {Octokit, Commit} from '../types'

export class BodyUtility {
  private octokit: Octokit

  constructor(octokit: Octokit) {
    this.octokit = octokit
  }

  async compose(
    sourceBranch: string,
    targetBranch: string,
    body?: string
  ): Promise<string> {
    core.info(
      `Start retrieving PR links for all diffs between head ${sourceBranch} and base ${targetBranch}`
    )
    let bodyWithLinks: string = body ?? ''
    const commitShas = await this.getCommitShas(sourceBranch, targetBranch)
    const titleLinkHash = await this.fetchTitleAndLinks(commitShas)

    for (const [title, link] of titleLinkHash) {
      bodyWithLinks += `\n\r- [${title}](${link})`
    }

    return bodyWithLinks
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

  private async fetchTitleAndLinks(
    commitShas: string[]
  ): Promise<Map<string, string>> {
    core.debug(
      `Fetching associated pull request's title and links of commit shas: ${commitShas.toString()}`
    )

    const titleWithLinks = new Map<string, string>()

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
        titleWithLinks.set(entry.title, entry.html_url)
      }
    }

    return titleWithLinks
  }
}

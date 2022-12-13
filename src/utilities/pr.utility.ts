import * as core from '@actions/core'
import * as github from '@actions/github'

import {Octokit, PullRequest} from '../types'

export class PullRequestUtility {
  private octokit: Octokit

  constructor(octokit: Octokit) {
    this.octokit = octokit
  }

  async getNumber(
    targetBranch: string,
    sourceBranch: string
  ): Promise<number | undefined> {
    core.debug(
      `Looking up pull request with source branch: "${sourceBranch}" and target branch: "${targetBranch}"`
    )
    const prs = (
      await this.octokit.rest.pulls.list({
        ...github.context.repo,
        state: 'open',
        base: targetBranch,
        head: `${github.context.repo.owner}:${sourceBranch}`
      })
    ).data as PullRequest[]

    core.debug(`Found ${prs.length} matches`)
    return prs.pop()?.number
  }

  async update(
    prNumber: number,
    title: string = 'TEST',
    body?: string
  ): Promise<PullRequest> {
    core.debug(`Updating PR "${title}"`)
    const pr = (
      await this.octokit.rest.pulls.update({
        ...github.context.repo,
        pull_number: prNumber,
        // title,
        body
      })
    ).data

    return pr
  }
}

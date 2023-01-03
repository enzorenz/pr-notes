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
      `Looking up pull request with source branch: "${sourceBranch}" and target branch: "${targetBranch}"...`
    )
    const prs = (
      await this.octokit.rest.pulls.list({
        ...github.context.repo,
        state: 'open',
        base: targetBranch,
        head: `${github.context.repo.owner}:${sourceBranch}`
      })
    ).data as PullRequest[]

    core.debug(`Found ${prs.length} matches.`)
    return prs.pop()?.number
  }

  async update(prNumber: number, body?: string): Promise<PullRequest> {
    core.debug(`Updating PR...`)
    const pr = (
      await this.octokit.rest.pulls.update({
        ...github.context.repo,
        pull_number: prNumber,
        body
      })
    ).data

    return pr
  }

  async create(
    targetBranch: string,
    sourceBranch: string,
    draft: boolean,
    title: string,
    body?: string,
    labels?: string[],
    assignees?: string[]
  ): Promise<PullRequest> {
    core.debug(`Creating PR "${title}"...`)
    const pullRequest = (
      await this.octokit.rest.pulls.create({
        ...github.context.repo,
        draft,
        title,
        head: sourceBranch,
        base: targetBranch,
        body
      })
    ).data

    if (labels && labels.length) {
      await this.addPrLabels(pullRequest.number, labels)
    }

    if (assignees && assignees.length > 0) {
      await this.addPrAssignees(pullRequest.number, assignees)
    }

    return pullRequest
  }

  private async addPrLabels(prNumber: number, labels: string[]): Promise<void> {
    core.debug(`Adding ${labels.length} Labels to PR: ${labels.toString()}...`)
    await this.octokit.rest.issues.addLabels({
      ...github.context.repo,
      issue_number: prNumber,
      labels
    })
  }

  private async addPrAssignees(
    prNumber: number,
    assignees: string[]
  ): Promise<void> {
    core.debug(
      `Adding ${assignees.length} Assignees to PR: ${assignees.toString()}...`
    )
    await this.octokit.rest.issues.addAssignees({
      ...github.context.repo,
      issue_number: prNumber,
      assignees
    })
  }
}

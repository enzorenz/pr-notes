import * as github from '@actions/github'

import {Octokit, Repo} from '../types'
import {ExecUtility} from '.'

export class GitUtility {
  private readonly exec: ExecUtility
  constructor() {
    this.exec = new ExecUtility()
  }

  async branchExists(branchName: string): Promise<boolean> {
    const result = await this.exec.run(
      `git ls-remote --exit-code --heads origin "${branchName}"`
    )
    return 0 === result
  }

  async getTargetBranch(branch: string, octokit: Octokit): Promise<string> {
    if (branch) {
      return branch
    } else {
      return this.getDefaultBranch(octokit)
    }
  }

  private async getDefaultBranch(octokit: Octokit): Promise<string> {
    const repo = (
      await octokit.rest.repos.get({
        ...github.context.repo
      })
    ).data as Repo

    return repo.default_branch
  }
}

import * as core from '@actions/core'

export class Input {
  token: string
  sourceBranch: string
  targetBranch: string

  constructor() {
    this.token = core.getInput('token', {required: true})
    this.sourceBranch = core.getInput('source-branch', {required: true})
    this.targetBranch = core.getInput('target-branch', {required: true})

    core.setSecret(this.token)
  }
}

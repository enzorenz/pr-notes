import * as core from '@actions/core'

export class Input {
  token: string
  sourceBranch: string
  targetBranch: string
  draft: boolean
  title: string
  body: string
  resolveLineKeyword: string
  listTitle: string
  labels: string[]
  assignees: string[]
  commitTypeGrouping: boolean
  excludeKeywords: string[]
  withAuthor: boolean

  constructor() {
    this.token = core.getInput('token', {required: true})
    this.sourceBranch = core.getInput('source-branch', {required: true})
    this.targetBranch = core.getInput('target-branch', {required: true})
    this.draft = (core.getInput('draft') ?? '').toLowerCase() === 'true'
    this.title = core.getInput('title', {required: true})
    this.body = core.getInput('body')
    this.resolveLineKeyword = core.getInput('resolve-line-keyword')
    this.listTitle = core.getInput('list-title')
    this.labels = convertInputToArray('labels')
    this.assignees = convertInputToArray('assignees')
    this.commitTypeGrouping =
      (core.getInput('commit-type-grouping') ?? '').toLowerCase() === 'true'
    this.excludeKeywords = convertInputToArray('exclude-keywords')
    this.withAuthor =
      (core.getInput('with-author') ?? '').toLowerCase() === 'true'

    core.setSecret(this.token)
  }
}

function convertInputToArray(
  input: string,
  options?: core.InputOptions
): string[] {
  const str = core.getInput(input, options)
  const arr = (str || null)?.split(',') ?? []
  return arr.map(item => item.trim()).filter(item => item.length > 0)
}

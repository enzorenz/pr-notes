import * as core from '@actions/core'

import {Section} from '../types'

export class Input {
  token: string
  sourceBranch: string
  targetBranch: string
  draft: boolean
  title: string
  body: string
  resolveLineKeyword: string
  resolveGrouping: boolean
  listTitle: string
  labels: string[]
  reviewers: string[]
  assignees: string[]
  commitTypeGrouping: boolean
  excludeKeywords: string[]
  withAuthor: boolean
  withCheckbox: boolean
  postReleaseChecklistTitle: string
  sections: Section[]

  constructor() {
    this.token = core.getInput('token', {required: true})
    this.sourceBranch = core.getInput('source-branch', {required: true})
    this.targetBranch = core.getInput('target-branch', {required: true})
    this.draft = (core.getInput('draft') ?? '').toLowerCase() === 'true'
    this.title = core.getInput('title', {required: true})
    this.body = core.getInput('body')
    this.resolveLineKeyword = core.getInput('resolve-line-keyword')
    this.resolveGrouping =
      (core.getInput('resolve-grouping') ?? '').toLowerCase() === 'true'
    this.listTitle = core.getInput('list-title')
    this.labels = convertInputToArray('labels')
    this.reviewers = convertInputToArray('reviewers')
    this.assignees = convertInputToArray('assignees')
    this.commitTypeGrouping =
      (core.getInput('commit-type-grouping') ?? '').toLowerCase() === 'true'
    this.excludeKeywords = convertInputToArray('exclude-keywords')
    this.withAuthor =
      (core.getInput('with-author') ?? '').toLowerCase() === 'true'
    this.withCheckbox =
      (core.getInput('with-checkbox') ?? '').toLowerCase() === 'true'
    this.postReleaseChecklistTitle = core.getInput(
      'post-release-checklist-title'
    )
    this.sections = buildSections(
      core.getInput('custom-sections'),
      this.postReleaseChecklistTitle
    )

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

function buildSections(
  customSections: string,
  postReleaseChecklistTitle: string
): Section[] {
  const sections: Section[] = []
  const seenTitles = new Set<string>()

  const addSection = (title: string, checklist: boolean): void => {
    const trimmed = title.trim()
    if (trimmed.length === 0) return
    if (seenTitles.has(trimmed)) {
      core.warning(
        `custom-sections: duplicate section title "${trimmed}" ignored.`
      )
      return
    }
    seenTitles.add(trimmed)
    sections.push({title: trimmed, checklist})
  }

  if (postReleaseChecklistTitle.trim().length > 0) {
    addSection(postReleaseChecklistTitle, true)
  }

  if (customSections.trim().length > 0) {
    try {
      const parsed: unknown = JSON.parse(customSections)
      if (!Array.isArray(parsed)) {
        core.warning('custom-sections must be a JSON array; ignoring it.')
        return sections
      }
      for (const item of parsed) {
        if (item === null || typeof item !== 'object' || Array.isArray(item)) {
          core.warning('custom-sections: skipping entry that is not an object.')
          continue
        }
        const title = (item as {title?: unknown}).title
        if (typeof title !== 'string' || title.trim().length === 0) {
          core.warning(
            'custom-sections: skipping entry without a valid "title".'
          )
          continue
        }
        const checklist = parseChecklist(
          (item as {checklist?: unknown}).checklist
        )
        addSection(title, checklist)
      }
    } catch (error) {
      core.warning(
        `Failed to parse custom-sections JSON: ${(error as Error).message}`
      )
    }
  }

  return sections
}

function parseChecklist(value: unknown): boolean {
  if (value === undefined) return false
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }
  core.warning(
    `custom-sections: "checklist" should be a boolean; got ${JSON.stringify(
      value
    )}. Treating as false.`
  )
  return false
}

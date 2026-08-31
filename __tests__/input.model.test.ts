import {jest, describe, it, expect, beforeEach} from '@jest/globals'
import * as core from '@actions/core'

jest.mock('@actions/core')

const mockedCore = jest.mocked(core)

function mockGetInput(overrides: Record<string, string> = {}): void {
  const defaults: Record<string, string> = {
    token: 'ghp_testtoken',
    'source-branch': 'feature-branch',
    'target-branch': 'main',
    title: 'Test PR Title',
    draft: 'false',
    body: '',
    'resolve-line-keyword': 'resolves',
    'list-title': '',
    labels: '',
    reviewers: '',
    assignees: '',
    'commit-type-grouping': 'false',
    'resolve-grouping': 'false',
    'exclude-keywords': '',
    'with-author': 'false',
    'with-checkbox': 'false'
  }
  const values = {...defaults, ...overrides}
  mockedCore.getInput.mockImplementation((name: string) => values[name] ?? '')
}

describe('Input', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('parses required string inputs', () => {
    mockGetInput()
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {Input} = require('../src/models/input.model')
    const input = new Input()

    expect(input.token).toBe('ghp_testtoken')
    expect(input.sourceBranch).toBe('feature-branch')
    expect(input.targetBranch).toBe('main')
    expect(input.title).toBe('Test PR Title')
  })

  it('parses boolean inputs as false by default', () => {
    mockGetInput()
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {Input} = require('../src/models/input.model')
    const input = new Input()

    expect(input.draft).toBe(false)
    expect(input.commitTypeGrouping).toBe(false)
    expect(input.resolveGrouping).toBe(false)
    expect(input.withAuthor).toBe(false)
    expect(input.withCheckbox).toBe(false)
  })

  it('parses boolean inputs as true', () => {
    mockGetInput({
      draft: 'true',
      'commit-type-grouping': 'true',
      'resolve-grouping': 'true',
      'with-author': 'true',
      'with-checkbox': 'true'
    })
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {Input} = require('../src/models/input.model')
    const input = new Input()

    expect(input.draft).toBe(true)
    expect(input.commitTypeGrouping).toBe(true)
    expect(input.resolveGrouping).toBe(true)
    expect(input.withAuthor).toBe(true)
    expect(input.withCheckbox).toBe(true)
  })

  it('parses optional string inputs', () => {
    mockGetInput({
      body: 'Custom PR body',
      'resolve-line-keyword': 'closes',
      'list-title': 'Changelog'
    })
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {Input} = require('../src/models/input.model')
    const input = new Input()

    expect(input.body).toBe('Custom PR body')
    expect(input.resolveLineKeyword).toBe('closes')
    expect(input.listTitle).toBe('Changelog')
  })

  it('parses comma-separated arrays', () => {
    mockGetInput({
      labels: 'bug, enhancement , documentation',
      reviewers: 'user1,user2',
      assignees: 'user3'
    })
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {Input} = require('../src/models/input.model')
    const input = new Input()

    expect(input.labels).toEqual(['bug', 'enhancement', 'documentation'])
    expect(input.reviewers).toEqual(['user1', 'user2'])
    expect(input.assignees).toEqual(['user3'])
  })

  it('returns empty arrays when no values provided', () => {
    mockGetInput()
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {Input} = require('../src/models/input.model')
    const input = new Input()

    expect(input.labels).toEqual([])
    expect(input.reviewers).toEqual([])
    expect(input.assignees).toEqual([])
    expect(input.excludeKeywords).toEqual([])
  })

  it('calls setSecret with the token', () => {
    mockGetInput({token: 'ghp_secret123'})
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {Input} = require('../src/models/input.model')
    new Input()

    expect(mockedCore.setSecret).toHaveBeenCalledWith('ghp_secret123')
  })

  it('parses exclude-keywords as array', () => {
    mockGetInput({'exclude-keywords': 'wip, draft, do-not-merge'})
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {Input} = require('../src/models/input.model')
    const input = new Input()

    expect(input.excludeKeywords).toEqual(['wip', 'draft', 'do-not-merge'])
  })

  it('returns empty sections by default', () => {
    mockGetInput()
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {Input} = require('../src/models/input.model')
    const input = new Input()

    expect(input.sections).toEqual([])
  })

  it('parses custom-sections JSON array', () => {
    mockGetInput({
      'custom-sections':
        '[{"title":"My Checklist","checklist":true},{"title":"Release Notes"}]'
    })
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {Input} = require('../src/models/input.model')
    const input = new Input()

    expect(input.sections).toEqual([
      {title: 'My Checklist', checklist: true},
      {title: 'Release Notes', checklist: false}
    ])
  })

  it('includes post-release-checklist-title when custom-sections is empty', () => {
    mockGetInput({'post-release-checklist-title': 'Post-Release Checklist'})
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {Input} = require('../src/models/input.model')
    const input = new Input()

    expect(input.sections).toEqual([
      {title: 'Post-Release Checklist', checklist: true}
    ])
  })

  it('returns empty sections on invalid custom-sections JSON', () => {
    mockGetInput({'custom-sections': 'not-json'})
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {Input} = require('../src/models/input.model')
    const input = new Input()

    expect(input.sections).toEqual([])
  })

  it('combines custom-sections with post-release-checklist-title', () => {
    mockGetInput({
      'post-release-checklist-title': 'Post-Release Checklist',
      'custom-sections': '[{"title":"My Checklist","checklist":true}]'
    })
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {Input} = require('../src/models/input.model')
    const input = new Input()

    expect(input.sections).toEqual([
      {title: 'Post-Release Checklist', checklist: true},
      {title: 'My Checklist', checklist: true}
    ])
  })

  it('treats checklist string "true" as true', () => {
    mockGetInput({
      'custom-sections': '[{"title":"My Checklist","checklist":"true"}]'
    })
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {Input} = require('../src/models/input.model')
    const input = new Input()

    expect(input.sections).toEqual([{title: 'My Checklist', checklist: true}])
  })

  it('warns and skips invalid custom-sections entries', () => {
    mockGetInput({
      'custom-sections': '[{"title":"Good","checklist":true},{"no-title":true}]'
    })
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {Input} = require('../src/models/input.model')
    const input = new Input()

    expect(input.sections).toEqual([{title: 'Good', checklist: true}])
    expect(mockedCore.warning).toHaveBeenCalledWith(
      expect.stringContaining('without a valid "title"')
    )
  })
})

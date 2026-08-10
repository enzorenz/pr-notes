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
    expect(input.withAuthor).toBe(false)
    expect(input.withCheckbox).toBe(false)
  })

  it('parses boolean inputs as true', () => {
    mockGetInput({
      draft: 'true',
      'commit-type-grouping': 'true',
      'with-author': 'true',
      'with-checkbox': 'true'
    })
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {Input} = require('../src/models/input.model')
    const input = new Input()

    expect(input.draft).toBe(true)
    expect(input.commitTypeGrouping).toBe(true)
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
})

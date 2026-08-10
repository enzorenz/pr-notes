import {describe, it, expect} from '@jest/globals'
import {BodyUtility} from '../src/utilities/body.utility'
import {PrEntryWithRelatedIssues} from '../src/types'
import {COMMIT_TYPES} from '../src/constants'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyBodyUtility = any

function makePr(
  id: number,
  title: string,
  htmlUrl?: string,
  login?: string | null
): PrEntryWithRelatedIssues {
  return {
    id,
    number: id,
    title,
    html_url: htmlUrl ?? `https://github.com/owner/repo/pull/${id}`,
    user:
      login === undefined
        ? {login: `user${id}`}
        : login
          ? {login}
          : (null as unknown as {login: string}),
    state: 'closed',
    body: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    closed_at: null,
    merged_at: null,
    merge_commit_sha: null,
    assignee: null,
    assignees: [],
    requested_reviewers: [],
    requested_teams: [],
    labels: [],
    milestone: null,
    draft: false,
    commits_url: '',
    review_comments_url: '',
    review_comment_url: '',
    comments_url: '',
    statuses_url: '',
    head: {label: '', ref: '', sha: '', user: null, repo: null},
    base: {label: '', ref: '', sha: '', user: null, repo: null},
    _links: {},
    author_association: 'CONTRIBUTOR',
    auto_merge: null,
    active_lock_reason: null,
    node_id: `node${id}`,
    url: '',
    diff_url: '',
    patch_url: '',
    issue_url: '',
    locked: false
  } as unknown as PrEntryWithRelatedIssues
}

function makeUtility(): BodyUtility {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new BodyUtility({} as any)
}

describe('addCheckbox', () => {
  const utility = makeUtility()

  it('returns [x] when target is in checkedItems', () => {
    const result = (utility as AnyBodyUtility).addCheckbox(
      true,
      ['https://github.com/owner/repo/pull/1', '#42'],
      'https://github.com/owner/repo/pull/1'
    )
    expect(result).toBe('[x] ')
  })

  it('returns [ ] when target is NOT in checkedItems', () => {
    const result = (utility as AnyBodyUtility).addCheckbox(
      true,
      ['#99'],
      'https://github.com/owner/repo/pull/1'
    )
    expect(result).toBe('[ ] ')
  })

  it('returns empty string when checkbox is disabled', () => {
    const result = (utility as AnyBodyUtility).addCheckbox(
      false,
      ['https://github.com/owner/repo/pull/1'],
      'https://github.com/owner/repo/pull/1'
    )
    expect(result).toBe('')
  })

  it('returns [ ] when checkedItems is empty', () => {
    const result = (utility as AnyBodyUtility).addCheckbox(
      true,
      [],
      'https://github.com/owner/repo/pull/1'
    )
    expect(result).toBe('[ ] ')
  })
})

describe('removeDuplicates', () => {
  const utility = makeUtility()

  it('returns same array when no duplicates', () => {
    const prs = [makePr(1, 'feat: a'), makePr(2, 'fix: b')]
    const result = (utility as AnyBodyUtility).removeDuplicates(prs)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe(1)
    expect(result[1].id).toBe(2)
  })

  it('deduplicates by id keeping last occurrence', () => {
    const prs = [
      makePr(1, 'feat: first'),
      makePr(2, 'fix: b'),
      makePr(1, 'feat: first (dup)')
    ]
    const result = (utility as AnyBodyUtility).removeDuplicates(prs)
    expect(result).toHaveLength(2)
    expect(result.map((p: PrEntryWithRelatedIssues) => p.id).sort()).toEqual([
      1, 2
    ])
  })

  it('returns empty array for empty input', () => {
    const result = (utility as AnyBodyUtility).removeDuplicates([])
    expect(result).toEqual([])
  })
})

describe('formatIssueLinksToHashtag', () => {
  const utility = makeUtility()

  it('converts issue URLs to hashtags', () => {
    const result = (utility as AnyBodyUtility).formatIssueLinksToHashtag([
      'https://github.com/owner/repo/issues/123',
      'https://github.com/owner/repo/issues/456'
    ])
    expect(result).toEqual(['#123', '#456'])
  })

  it('returns empty string for non-issue URLs', () => {
    const result = (utility as AnyBodyUtility).formatIssueLinksToHashtag([
      'https://github.com/owner/repo/pull/10'
    ])
    expect(result).toEqual([''])
  })

  it('handles empty array', () => {
    const result = (utility as AnyBodyUtility).formatIssueLinksToHashtag([])
    expect(result).toEqual([])
  })
})

describe('groupByCommitType', () => {
  const utility = makeUtility()

  it('groups a feat PR under Features', () => {
    const issuesObject = {
      'no-issue': [
        makePr(1, 'feat: add login', 'https://github.com/owner/repo/pull/1')
      ]
    }
    const result = (utility as AnyBodyUtility).groupByCommitType(issuesObject)
    expect(result[COMMIT_TYPES.feat]).toBeDefined()
    expect(result[COMMIT_TYPES.feat]['no-issue']).toHaveLength(1)
  })

  it('groups multiple PRs with different prefixes', () => {
    const issuesObject = {
      'no-issue': [
        makePr(1, 'feat: login', 'https://github.com/owner/repo/pull/1'),
        makePr(2, 'fix: crash', 'https://github.com/owner/repo/pull/2'),
        makePr(3, 'docs: readme', 'https://github.com/owner/repo/pull/3')
      ]
    }
    const result = (utility as AnyBodyUtility).groupByCommitType(issuesObject)
    expect(result[COMMIT_TYPES.feat]['no-issue']).toHaveLength(1)
    expect(result[COMMIT_TYPES.fix]['no-issue']).toHaveLength(1)
    expect(result[COMMIT_TYPES.docs]['no-issue']).toHaveLength(1)
  })

  it('groups PRs without prefix under Others', () => {
    const issuesObject = {
      'no-issue': [
        makePr(1, 'update dependencies', 'https://github.com/owner/repo/pull/1')
      ]
    }
    const result = (utility as AnyBodyUtility).groupByCommitType(issuesObject)
    expect(result[COMMIT_TYPES.other]).toBeDefined()
    expect(result[COMMIT_TYPES.other]['no-issue']).toHaveLength(1)
  })

  it('groups an issue with PRs under first PR prefix', () => {
    const issuesObject = {
      '#42': [
        makePr(1, 'feat: add feature', 'https://github.com/owner/repo/pull/1'),
        makePr(2, 'fix: tweak', 'https://github.com/owner/repo/pull/2')
      ]
    }
    const result = (utility as AnyBodyUtility).groupByCommitType(issuesObject)
    expect(result[COMMIT_TYPES.feat]).toBeDefined()
    expect(result[COMMIT_TYPES.feat]['#42']).toHaveLength(2)
    expect(result[COMMIT_TYPES.fix]).toBeUndefined()
  })

  it('groups mixed issues and no-issue PRs correctly', () => {
    const issuesObject = {
      '#1': [
        makePr(1, 'feat: big feature', 'https://github.com/owner/repo/pull/1')
      ],
      'no-issue': [
        makePr(2, 'fix: crash', 'https://github.com/owner/repo/pull/2')
      ]
    }
    const result = (utility as AnyBodyUtility).groupByCommitType(issuesObject)
    expect(result[COMMIT_TYPES.feat]['#1']).toHaveLength(1)
    expect(result[COMMIT_TYPES.fix]['no-issue']).toHaveLength(1)
  })

  it('accumulates multiple no-issue PRs in the same prefix group', () => {
    const issuesObject = {
      'no-issue': [
        makePr(1, 'fix: crash on login', 'https://github.com/owner/repo/pull/1'),
        makePr(2, 'fix: memory leak', 'https://github.com/owner/repo/pull/2')
      ]
    }
    const result = (utility as AnyBodyUtility).groupByCommitType(issuesObject)
    expect(result[COMMIT_TYPES.fix]['no-issue']).toHaveLength(2)
  })

  it('groups has-issue PRs with no prefix under Others', () => {
    const issuesObject = {
      '#99': [
        makePr(1, 'update dependencies', 'https://github.com/owner/repo/pull/1'),
        makePr(2, 'cleanup code', 'https://github.com/owner/repo/pull/2')
      ]
    }
    const result = (utility as AnyBodyUtility).groupByCommitType(issuesObject)
    expect(result[COMMIT_TYPES.other]).toBeDefined()
    expect(result[COMMIT_TYPES.other]['#99']).toHaveLength(2)
  })

  it('splits no-issue PRs between prefix groups and Others', () => {
    const issuesObject = {
      'no-issue': [
        makePr(1, 'feat: new feature', 'https://github.com/owner/repo/pull/1'),
        makePr(2, 'update config', 'https://github.com/owner/repo/pull/2'),
        makePr(3, 'fix: bug', 'https://github.com/owner/repo/pull/3')
      ]
    }
    const result = (utility as AnyBodyUtility).groupByCommitType(issuesObject)
    expect(result[COMMIT_TYPES.feat]['no-issue']).toHaveLength(1)
    expect(result[COMMIT_TYPES.fix]['no-issue']).toHaveLength(1)
    expect(result[COMMIT_TYPES.other]['no-issue']).toHaveLength(1)
  })
})

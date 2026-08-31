import {describe, it, expect} from '@jest/globals'
import {BodyUtility} from '../src/utilities/body.utility'
import {ChecklistItem, PrEntryWithRelatedIssues} from '../src/types'
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
        makePr(
          1,
          'fix: crash on login',
          'https://github.com/owner/repo/pull/1'
        ),
        makePr(2, 'fix: memory leak', 'https://github.com/owner/repo/pull/2')
      ]
    }
    const result = (utility as AnyBodyUtility).groupByCommitType(issuesObject)
    expect(result[COMMIT_TYPES.fix]['no-issue']).toHaveLength(2)
  })

  it('groups has-issue PRs with no prefix under Others', () => {
    const issuesObject = {
      '#99': [
        makePr(
          1,
          'update dependencies',
          'https://github.com/owner/repo/pull/1'
        ),
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

describe('extractPostReleaseChecklistItems', () => {
  const utility = makeUtility()

  function makePrEntryWithBody(
    id: number,
    title: string,
    body: string | null,
    htmlUrl?: string
  ): PrEntryWithRelatedIssues {
    const pr = makePr(id, title, htmlUrl)
    return {...pr, body} as unknown as PrEntryWithRelatedIssues
  }

  function getItemsForPr(
    result: Map<PrEntryWithRelatedIssues, ChecklistItem[]>,
    prId: number
  ): ChecklistItem[] {
    for (const [pr, items] of result) {
      if (pr.id === prId) return items
    }
    return []
  }

  it('extracts checkbox items from a matching section, grouped by PR', () => {
    const prMap = new Map<PrEntryWithRelatedIssues, string[]>()
    prMap.set(
      makePrEntryWithBody(
        1,
        'feat: something',
        '## Post-Release Checklist\n- [ ] Notify the team\n- [ ] Update docs'
      ),
      []
    )
    const result = (utility as AnyBodyUtility).extractPostReleaseChecklistItems(
      prMap,
      'Post-Release Checklist'
    )
    expect(result.size).toBe(1)
    expect(getItemsForPr(result, 1)).toEqual([
      {text: 'Notify the team', depth: 0},
      {text: 'Update docs', depth: 0}
    ])
  })

  it('extracts plain bullets (not just checkboxes)', () => {
    const prMap = new Map<PrEntryWithRelatedIssues, string[]>()
    prMap.set(
      makePrEntryWithBody(
        1,
        'feat: something',
        '## Post-Release Checklist\n- Do this\n- [x] Do that\n- Also this'
      ),
      []
    )
    const result = (utility as AnyBodyUtility).extractPostReleaseChecklistItems(
      prMap,
      'Post-Release Checklist'
    )
    expect(getItemsForPr(result, 1)).toEqual([
      {text: 'Do this', depth: 0},
      {text: 'Do that', depth: 0},
      {text: 'Also this', depth: 0}
    ])
  })

  it('stops extraction at the next ## heading', () => {
    const prMap = new Map<PrEntryWithRelatedIssues, string[]>()
    prMap.set(
      makePrEntryWithBody(
        1,
        'feat: something',
        '## Post-Release Checklist\n- Item 1\n## Other Section\n- Should not appear'
      ),
      []
    )
    const result = (utility as AnyBodyUtility).extractPostReleaseChecklistItems(
      prMap,
      'Post-Release Checklist'
    )
    expect(getItemsForPr(result, 1)).toEqual([{text: 'Item 1', depth: 0}])
  })

  it('stops at # heading as well', () => {
    const prMap = new Map<PrEntryWithRelatedIssues, string[]>()
    prMap.set(
      makePrEntryWithBody(
        1,
        'feat: something',
        '## Post-Release Checklist\n- Item 1\n# Top Level\n- Should not appear'
      ),
      []
    )
    const result = (utility as AnyBodyUtility).extractPostReleaseChecklistItems(
      prMap,
      'Post-Release Checklist'
    )
    expect(getItemsForPr(result, 1)).toEqual([{text: 'Item 1', depth: 0}])
  })

  it('ignores PR bodies without the section', () => {
    const prMap = new Map<PrEntryWithRelatedIssues, string[]>()
    prMap.set(
      makePrEntryWithBody(1, 'feat: something', '## Changelog\n- Some item'),
      []
    )
    const result = (utility as AnyBodyUtility).extractPostReleaseChecklistItems(
      prMap,
      'Post-Release Checklist'
    )
    expect(result.size).toBe(0)
  })

  it('keeps duplicate items from different PRs (no dedup)', () => {
    const prMap = new Map<PrEntryWithRelatedIssues, string[]>()
    prMap.set(
      makePrEntryWithBody(
        1,
        'feat: a',
        '## Post-Release Checklist\n- Notify team\n- Update docs'
      ),
      []
    )
    prMap.set(
      makePrEntryWithBody(
        2,
        'feat: b',
        '## Post-Release Checklist\n- Notify team\n- Run migrations'
      ),
      []
    )
    const result = (utility as AnyBodyUtility).extractPostReleaseChecklistItems(
      prMap,
      'Post-Release Checklist'
    )
    expect(result.size).toBe(2)
    expect(getItemsForPr(result, 1)).toEqual([
      {text: 'Notify team', depth: 0},
      {text: 'Update docs', depth: 0}
    ])
    expect(getItemsForPr(result, 2)).toEqual([
      {text: 'Notify team', depth: 0},
      {text: 'Run migrations', depth: 0}
    ])
  })

  it('handles PRs with null body', () => {
    const prMap = new Map<PrEntryWithRelatedIssues, string[]>()
    prMap.set(makePrEntryWithBody(1, 'feat: something', null), [])
    const result = (utility as AnyBodyUtility).extractPostReleaseChecklistItems(
      prMap,
      'Post-Release Checklist'
    )
    expect(result.size).toBe(0)
  })

  it('handles empty Map', () => {
    const prMap = new Map<PrEntryWithRelatedIssues, string[]>()
    const result = (utility as AnyBodyUtility).extractPostReleaseChecklistItems(
      prMap,
      'Post-Release Checklist'
    )
    expect(result.size).toBe(0)
  })

  it('skips PR that has the section but no list items', () => {
    const prMap = new Map<PrEntryWithRelatedIssues, string[]>()
    prMap.set(
      makePrEntryWithBody(
        1,
        'feat: empty',
        '## Post-Release Checklist\n\n## Next Section'
      ),
      []
    )
    const result = (utility as AnyBodyUtility).extractPostReleaseChecklistItems(
      prMap,
      'Post-Release Checklist'
    )
    expect(result.size).toBe(0)
  })

  it('preserves nested child items with depth levels', () => {
    const prMap = new Map<PrEntryWithRelatedIssues, string[]>()
    prMap.set(
      makePrEntryWithBody(
        1,
        'feat: nested',
        '## Post-Release Checklist\n- Parent\n  - Child A\n  - Child B\n- Other'
      ),
      []
    )
    const result = (utility as AnyBodyUtility).extractPostReleaseChecklistItems(
      prMap,
      'Post-Release Checklist'
    )
    expect(getItemsForPr(result, 1)).toEqual([
      {text: 'Parent', depth: 0},
      {text: 'Child A', depth: 1},
      {text: 'Child B', depth: 1},
      {text: 'Other', depth: 0}
    ])
  })
})

describe('appendReleaseChecklist', () => {
  const utility = makeUtility()

  function makePrEntryWithBody(
    id: number,
    title: string,
    body: string | null,
    htmlUrl?: string
  ): PrEntryWithRelatedIssues {
    const pr = makePr(id, title, htmlUrl)
    return {...pr, body} as unknown as PrEntryWithRelatedIssues
  }

  it('returns body unchanged when sectionTitle is empty', () => {
    const prMap = new Map<PrEntryWithRelatedIssues, string[]>()
    const result = (utility as AnyBodyUtility).appendReleaseChecklist(
      'Existing body',
      '',
      prMap,
      ''
    )
    expect(result).toBe('Existing body')
  })

  it('returns body unchanged when no items found in PRs', () => {
    const prMap = new Map<PrEntryWithRelatedIssues, string[]>()
    prMap.set(makePrEntryWithBody(1, 'feat: x', '## Other\n- item'), [])
    const result = (utility as AnyBodyUtility).appendReleaseChecklist(
      'Existing body',
      '',
      prMap,
      'Post-Release Checklist'
    )
    expect(result).toBe('Existing body')
  })

  it('appends checklist section with items grouped under PR headers', () => {
    const prMap = new Map<PrEntryWithRelatedIssues, string[]>()
    prMap.set(
      makePrEntryWithBody(
        1,
        'feat: x',
        '## Post-Release Checklist\n- Notify team\n- Deploy'
      ),
      []
    )
    const result = (utility as AnyBodyUtility).appendReleaseChecklist(
      'Existing body',
      '',
      prMap,
      'Post-Release Checklist'
    )
    expect(result).toBe(
      'Existing body\n\n## Post-Release Checklist\n- #1\n  - [ ] Notify team\n  - [ ] Deploy'
    )
  })

  it('groups items from multiple PRs separately', () => {
    const prMap = new Map<PrEntryWithRelatedIssues, string[]>()
    prMap.set(
      makePrEntryWithBody(1, 'feat: a', '## Post-Release Checklist\n- Task A'),
      []
    )
    prMap.set(
      makePrEntryWithBody(2, 'fix: b', '## Post-Release Checklist\n- Task B'),
      []
    )
    const result = (utility as AnyBodyUtility).appendReleaseChecklist(
      'Existing body',
      '',
      prMap,
      'Post-Release Checklist'
    )
    expect(result).toBe(
      'Existing body\n\n## Post-Release Checklist\n- #1\n  - [ ] Task A\n- #2\n  - [ ] Task B'
    )
  })

  it('duplicate item text across PRs renders under each PR independently', () => {
    const prMap = new Map<PrEntryWithRelatedIssues, string[]>()
    prMap.set(
      makePrEntryWithBody(
        1,
        'feat: a',
        '## Post-Release Checklist\n- Notify team'
      ),
      []
    )
    prMap.set(
      makePrEntryWithBody(
        2,
        'fix: b',
        '## Post-Release Checklist\n- Notify team'
      ),
      []
    )
    const result = (utility as AnyBodyUtility).appendReleaseChecklist(
      'Existing body',
      '',
      prMap,
      'Post-Release Checklist'
    )
    expect(result).toBe(
      'Existing body\n\n## Post-Release Checklist\n- #1\n  - [ ] Notify team\n- #2\n  - [ ] Notify team'
    )
  })

  it('persists checked state independently per PR instance', () => {
    const prMap = new Map<PrEntryWithRelatedIssues, string[]>()
    prMap.set(
      makePrEntryWithBody(
        1,
        'feat: a',
        '## Post-Release Checklist\n- Notify team'
      ),
      []
    )
    prMap.set(
      makePrEntryWithBody(
        2,
        'fix: b',
        '## Post-Release Checklist\n- Notify team'
      ),
      []
    )
    // Only #2's instance is checked
    const currentBody =
      '## Post-Release Checklist\n- #1\n  - [ ] Notify team\n- #2\n  - [x] Notify team'
    const result = (utility as AnyBodyUtility).appendReleaseChecklist(
      'Existing body',
      currentBody,
      prMap,
      'Post-Release Checklist'
    )
    expect(result).toBe(
      'Existing body\n\n## Post-Release Checklist\n- #1\n  - [ ] Notify team\n- #2\n  - [x] Notify team'
    )
  })

  it('persists checked state from current body matching PR scoping', () => {
    const prMap = new Map<PrEntryWithRelatedIssues, string[]>()
    prMap.set(
      makePrEntryWithBody(
        1,
        'feat: x',
        '## Post-Release Checklist\n- Notify team\n- Deploy'
      ),
      []
    )
    const currentBody =
      '## Post-Release Checklist\n- #1\n  - [x] Notify team\n  - [ ] Deploy'
    const result = (utility as AnyBodyUtility).appendReleaseChecklist(
      'Existing body',
      currentBody,
      prMap,
      'Post-Release Checklist'
    )
    expect(result).toBe(
      'Existing body\n\n## Post-Release Checklist\n- #1\n  - [x] Notify team\n  - [ ] Deploy'
    )
  })

  it('only scans checked items from within the release checklist section', () => {
    const prMap = new Map<PrEntryWithRelatedIssues, string[]>()
    prMap.set(
      makePrEntryWithBody(
        1,
        'feat: x',
        '## Post-Release Checklist\n- Release item'
      ),
      []
    )
    // Checked item outside the release checklist section should be ignored
    const currentBody =
      '- [x] Unrelated item\n## Post-Release Checklist\n- #1\n  - [ ] Release item'
    const result = (utility as AnyBodyUtility).appendReleaseChecklist(
      'Existing body',
      currentBody,
      prMap,
      'Post-Release Checklist'
    )
    expect(result).toBe(
      'Existing body\n\n## Post-Release Checklist\n- #1\n  - [ ] Release item'
    )
  })

  it('falls back to html_url when PR has no number', () => {
    const pr = makePrEntryWithBody(
      1,
      'feat: x',
      '## Post-Release Checklist\n- Task'
    )
    ;(pr as unknown as {number: number | null}).number = null
    const prMap = new Map<PrEntryWithRelatedIssues, string[]>()
    prMap.set(pr, [])
    const result = (utility as AnyBodyUtility).appendReleaseChecklist(
      'Existing body',
      '',
      prMap,
      'Post-Release Checklist'
    )
    expect(result).toBe(
      'Existing body\n\n## Post-Release Checklist\n- https://github.com/owner/repo/pull/1\n  - [ ] Task'
    )
  })

  it('renders nested child items indented under their parent', () => {
    const prMap = new Map<PrEntryWithRelatedIssues, string[]>()
    prMap.set(
      makePrEntryWithBody(
        1,
        'feat: nested',
        '## Post-Release Checklist\n- Notify the team\n  - Send email\n  - Send Slack\n- Update docs'
      ),
      []
    )
    const result = (utility as AnyBodyUtility).appendReleaseChecklist(
      'Existing body',
      '',
      prMap,
      'Post-Release Checklist'
    )
    expect(result).toBe(
      'Existing body\n\n## Post-Release Checklist\n- #1\n  - [ ] Notify the team\n    - Send email\n    - Send Slack\n  - [ ] Update docs'
    )
  })

  it('renders nested child items without checkboxes and persists parent state', () => {
    const prMap = new Map<PrEntryWithRelatedIssues, string[]>()
    prMap.set(
      makePrEntryWithBody(
        1,
        'feat: nested',
        '## Post-Release Checklist\n- Notify the team\n  - Send email\n  - Send Slack'
      ),
      []
    )
    const currentBody =
      '## Post-Release Checklist\n- #1\n  - [x] Notify the team\n    - Send email\n    - Send Slack'
    const result = (utility as AnyBodyUtility).appendReleaseChecklist(
      'Existing body',
      currentBody,
      prMap,
      'Post-Release Checklist'
    )
    expect(result).toBe(
      'Existing body\n\n## Post-Release Checklist\n- #1\n  - [x] Notify the team\n    - Send email\n    - Send Slack'
    )
  })
})

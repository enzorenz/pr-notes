# PR Notes

This action adds changelog to your pull request. It creates a pull request if it does not exist and fails silently if already exists, it will also update the existing pull request body.

With `resolve-grouping: true`, a pull request that resolves an issue will have that issue as the main changelog item with the pull request nested as its sub item. By default (`false`) pull requests are listed flat.

### Auto Generated Body

```
## Summary
This PR adds the new billing dashboard and fixes the login flow.

### Changes
- [ ] https://github.com/acme/app/pull/45 - jdoe
- [x] https://github.com/acme/app/pull/47 - msmith

## Features
- [ ] https://github.com/acme/app/pull/45 - jdoe

## Bug Fixes
- [x] https://github.com/acme/app/pull/47 - msmith

## Post-Release Checklist
- #45
  - [ ] Notify the team on Slack
  - [ ] Update the API docs
- #47
  - [ ] Notify the team on Slack
  - [x] Run database migrations
```

> Set `resolve-grouping: true` to group pull requests under their related issues instead (see [Linking Issues](#linking-issues)).

#### With Checkbox

It also supports converting the changelog to a checklist. It can retain items that were already checked/unchecked and restore them when action reruns so no worries losing status.

#### Post-Release Checklist

Add a `## Post-Release Checklist` section to any merged PR body with list items. The action aggregates them into a grouped checklist at the bottom of the generated description — each PR's items are nested under its PR number, and checkbox state persists independently per PR instance. Nested list items keep their indentation; only top-level items carry checkboxes. Customize the section title with the `post-release-checklist-title` input (set to empty to disable).

#### Custom Sections

Use the `custom-sections` input to aggregate multiple sections, each with its own title and an optional `checklist` flag. It accepts a JSON array of `{"title": string, "checklist": boolean}` objects:

```yaml
with:
  custom-sections: |
    [
      {"title": "My Own Checklist", "checklist": true},
      {"title": "Release Notes"}
    ]
```

- `title` — the `## <title>` heading to scan for in merged PR bodies.
- `checklist` — when `true`, top-level items render as checkboxes with persisted state; when omitted or `false` (or the string `"false"`), items render as plain bullets. Accepts a boolean or the strings `"true"`/`"false"`. Defaults to `false`.

Nested items are preserved in all cases. Sections from `custom-sections` are combined with `post-release-checklist-title` (which is always included as a checklist section when non-empty). Duplicate titles are skipped with a warning. When `with-author` is enabled, each PR line also shows its author (e.g. `- #45 - jdoe`).

### Usage

Create a workflow

```
name: 'your-workflow-name'
on:
  push:
    branches:
      - main

jobs:
  your-job-name
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: enzorenz/pr-notes@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          source-branch: test-branch
          target-branch: main
          draft: true
          title: YOUR PR TITLE
          commit-type-grouping: true
          with-author: true
```

### Linking Issues

To properly pull the correct issues please link them in resolve keyword line using hash (#), example:

For same repository:
`Resolves #<issue_number>`

```
Resolves #1234
```

For different repository:
`Resolves <owner>/<repository_name>#<issue_number>`

```
Resolves enzorenz/pr-notes#1234
```

Grouping the changelog by related issues is opt-in via the `resolve-grouping` input (default `false`). When disabled, the resolve line issue detection is skipped and the changelog lists pull requests flat instead of grouping them under their related issues.

### Inputs

<table>
  <thead>
    <tr>
      <th align="center">Name</th>
      <th align="center">Description</th>
      <th align="center">Default</th>
      <th align="center">Required</th>
      <th align="center">Example</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center">token</td>
      <td align="center">GitHub Token to use for this action</td>
      <td align="center">N/A</td>
      <td align="center">true</td>
      <td align="center"><code>${{ secrets.GITHUB_TOKEN }}</code></td>
    </tr>
    <tr>
      <td align="center">source-branch</td>
      <td align="center">Head branch of the pull request</td>
      <td align="center">N/A</td>
      <td align="center">true</td>
      <td align="center"><code>develop</code></td>
    </tr>
    <tr>
      <td align="center">target-branch</td>
      <td align="center">Base branch of the pull request</td>
      <td align="center">N/A</td>
      <td align="center">true</td>
      <td align="center"><code>master</code></td>
    </tr>
    <tr>
      <td align="center">draft</td>
      <td align="center">Set created pull request status to draft</td>
      <td align="center"><code>false</code></td>
      <td align="center">false</td>
      <td align="center"><code>true</code></td>
    </tr>
    <tr>
      <td align="center">title</td>
      <td align="center">Title for creating pull request (ignored if PR already exists)</td>
      <td align="center">N/A</td>
      <td align="center">true</td>
      <td align="center"><code>Initial Pull Request</code></td>
    </tr>
    <tr>
      <td align="center">body</td>
      <td align="center">Body for pull request</td>
      <td align="center">empty</td>
      <td align="center">false</td>
      <td align="center"><code>This is a body</code></td>
    </tr>
    <tr>
      <td align="center">resolve-line-keyword</td>
      <td align="center">Keyword for detecting the resolve line to retrieve related issue/link (case insensitive)</td>
      <td align="center"><code>resolves</code></td>
      <td align="center">false</td>
      <td align="center"><code>resolves</code></td>
    </tr>
    <tr>
      <td align="center">resolve-grouping</td>
      <td align="center">Group changelog by related issues detected from the resolve line (set to false to list PRs flat)</td>
      <td align="center"><code>false</code></td>
      <td align="center">false</td>
      <td align="center"><code>true</code></td>
    </tr>
    <tr>
      <td align="center">list-title</td>
      <td align="center">Title for changes list</td>
      <td align="center">empty</td>
      <td align="center">false</td>
      <td align="center"><code>Changelog</code></td>
    </tr>
    <tr>
      <td align="center">labels</td>
      <td align="center">Labels to add to the PR (comma separated)</td>
      <td align="center">N/A</td>
      <td align="center">false</td>
      <td align="center"><code>test, fix</code></td>
    </tr>
    <tr>
      <td align="center">reviewers</td>
      <td align="center">Reviewers to request to the PR (comma separated)</td>
      <td align="center">N/A</td>
      <td align="center">false</td>
      <td align="center"><code>username1, username2</code></td>
    </tr>
    <tr>
      <td align="center">assignees</td>
      <td align="center">Assignees to add to the PR (comma separated)</td>
      <td align="center">N/A</td>
      <td align="center">false</td>
      <td align="center"><code>username1, username2</code></td>
    </tr>
    <tr>
      <td align="center">commit-type-grouping</td>
      <td align="center">Groups commits by prefixes (feat, fix, docs, etc.), see commit types below</td>
      <td align="center">false</td>
      <td align="center">false</td>
      <td align="center"><code>true</code></td>
    </tr>
    <tr>
      <td align="center">exclude-keywords</td>
      <td align="center">Exclude PRs with similar keywords (comma separated)</td>
      <td align="center">N/A</td>
      <td align="center">false</td>
      <td align="center"><code>first_keyword, second_keyword</code></td>
    </tr>
    <tr>
      <td align="center">with-author</td>
      <td align="center">Includes the PR author in the changelog and checklist sections</td>
      <td align="center">false</td>
      <td align="center">false</td>
      <td align="center"><code>true</code></td>
    </tr>
    <tr>
      <td align="center">with-checkbox</td>
      <td align="center">Adds a checkbox to changelog main items making it a checklist</td>
      <td align="center">false</td>
      <td align="center">false</td>
      <td align="center"><code>true</code></td>
    </tr>
    <tr>
      <td align="center">post-release-checklist-title</td>
      <td align="center">Heading title for aggregating post-release checklist items from merged PRs (set to empty to disable)</td>
      <td align="center"><code>Post-Release Checklist</code></td>
      <td align="center">false</td>
      <td align="center"><code>My Checklist</code></td>
    </tr>
    <tr>
      <td align="center">custom-sections</td>
      <td align="center">JSON array of custom sections to aggregate from merged PRs, e.g. <code>[{"title":"My Checklist","checklist":true}]</code></td>
      <td align="center"><code></code></td>
      <td align="center">false</td>
      <td align="center"><code>[{"title":"My Checklist","checklist":true}]</code></td>
    </tr>
  </tbody>
</table>

### Commit Types

```
{
  feat: 'Features',
  fix: 'Bug Fixes',
  docs: 'Documentation',
  style: 'Styles',
  refactor: 'Code Refactoring',
  perf: 'Performance Improvements',
  test: 'Tests',
  build: 'Builds',
  ci: 'Continuous Integrations',
  chore: 'Chores',
  revert: 'Reverts',
  merge: 'Merges',
  release: 'Releases',
  sync: 'Syncs',
  other: 'Others' // for PR titles that does not use prefix
}
```

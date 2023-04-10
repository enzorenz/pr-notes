# PR Notes

This action adds changelog to your pull request. It creates a pull request if it does not exist and fails silently if already exists, it will also update the existing pull request body.

If associated pull request is a resolution to an issue then that issue will be the main item to the changelog list while the pull request will be included as its sub item.

### Auto Generated Body

<img width="689" alt="image" src="https://user-images.githubusercontent.com/42469290/230652349-78011c74-79ac-4d5c-868e-bc301e5fbe16.png">

#### With Checkbox

It also supports converting the changelog to a checklist. It can retain items that were already checked/unchecked and restore them when action reruns so no worries losing status.

<img width="689" alt="image" src="https://user-images.githubusercontent.com/42469290/230721858-6a9483c9-2814-4582-92c4-06dcd5dabeb9.png">

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
      - uses: actions/checkout@v3
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
      <td align="center">Includes commit author in the list</td>
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

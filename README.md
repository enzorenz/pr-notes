# PR Notes

This action adds changelog to your pull request. It creates a pull request if it does not exist and fails silently if already exists, it will also update the existing pull request body.

If associated pull request is a resolution to an issue then that issue will be the main item to the changelog list while the pull request will be included as its sub item.

### Auto Generated Body

<img width="689" alt="image" src="https://user-images.githubusercontent.com/42469290/210353553-48bac4f8-8348-4867-b94e-1125bce2cd07.png">

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
          body: This is a body
          list-title: Changelog
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
  </tbody>
</table>

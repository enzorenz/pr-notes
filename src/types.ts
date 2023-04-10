import * as github from '@actions/github'
// eslint-disable-next-line import/no-unresolved
import {components} from '@octokit/openapi-types'

export type Octokit = ReturnType<typeof github.getOctokit>

export type Repo = components['schemas']['repository']
export type PullRequest = components['schemas']['pull-request']
export type Commit = components['schemas']['commit']

export type PrEntry = components['schemas']['pull-request-simple']
export type PrEntryWithRelatedIssues =
  components['schemas']['pull-request-simple'] & {
    relatedIssues?: string[]
  }

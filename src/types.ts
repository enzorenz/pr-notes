import * as github from '@actions/github'
import {components} from '@octokit/openapi-types'

export type Octokit = ReturnType<typeof github.getOctokit>

export type Repo = components['schemas']['repository']
export type PullRequest = components['schemas']['pull-request']
export type Commit = components['schemas']['commit']

import * as core from '@actions/core'
import * as github from '@actions/github'

import {Input} from './models'
import {PullRequestUtility, GitUtility, BodyUtility} from './utilities'

async function run(): Promise<void> {
  try {
    // START
    const input = new Input()
    const octokit = github.getOctokit(input.token)
    const gitUtility = new GitUtility()
    const prUtility = new PullRequestUtility(octokit)
    const bodyUtility = new BodyUtility(octokit)
    const targetBranch = await gitUtility.getTargetBranch(
      input.targetBranch,
      octokit
    )

    core.startGroup('Prerequisite Checks')
    core.info('🔍 Checking if branches exists...')
    const isSourceBranchExists = await gitUtility.branchExists(
      input.sourceBranch
    )
    if (!isSourceBranchExists) {
      core.setFailed(`Source branch '${input.sourceBranch}' does not exist!`)
    }
    core.info(`Source branch: "${input.sourceBranch}" exists.`)
    const isTargetBranchExists = await gitUtility.branchExists(targetBranch)
    if (!isTargetBranchExists) {
      core.setFailed(`💥 Target branch '${targetBranch}' does not exist!`)
    }
    core.info(`Target branch: "${input.targetBranch}" exists.`)

    core.info(
      '🔍 Checking if there is an open PR for the source to target branch...'
    )
    const prDetail = await prUtility.getDetail(targetBranch, input.sourceBranch)

    if (prDetail) {
      core.info(`PR# ${prDetail.number} exists.`)
    } else {
      core.info(`PR does not exist yet.`)
    }
    core.endGroup()

    core.startGroup('Pull Request Processing')
    const body = await bodyUtility.compose(
      input.sourceBranch,
      input.targetBranch,
      prDetail?.body ?? '',
      input.body,
      input.resolveLineKeyword,
      input.listTitle,
      input.excludeKeywords,
      input.commitTypeGrouping,
      input.withAuthor,
      input.withCheckbox
    )

    if (prDetail) {
      core.info('Updating Pull Request...')
      const pull = await prUtility.update(
        prDetail.number,
        body,
        input.reviewers
      )
      core.info(`🎉 Pull Request updated: ${pull.html_url} (#${pull.number})`)
      core.setOutput('pr-number', pull.number)
    } else {
      core.info('Creating new Pull Request...')
      const pull = await prUtility.create(
        targetBranch,
        input.sourceBranch,
        input.draft,
        input.title,
        body,
        input.labels,
        input.reviewers,
        input.assignees
      )
      const prNumber = pull.number
      core.info(`🎉 Pull Request created: ${pull.html_url} (#${prNumber})`)
      core.setOutput('pr-number', prNumber)
    }
    core.endGroup()
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()

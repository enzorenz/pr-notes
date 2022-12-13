import * as core from '@actions/core'
import * as github from '@actions/github'

import {wait} from './wait'
import {Input} from './models'
import {PullRequestUtility, GitUtility, BodyUtility} from './utilities'

async function run(): Promise<void> {
  try {
    // const ms: string = core.getInput('milliseconds')
    // core.debug(`Waiting ${ms} milliseconds ...`) // debug is only output if you set the secret `ACTIONS_STEP_DEBUG` to true

    // core.debug(new Date().toTimeString())
    // await wait(parseInt(ms, 10))
    // core.debug(new Date().toTimeString())

    // core.setOutput('time', new Date().toTimeString())

    // START
    const input = new Input()
    const octokit = github.getOctokit(input.token)
    const gitUtility = new GitUtility()
    const prUtility = new PullRequestUtility(octokit)
    const bodyUtility = new BodyUtility(octokit)
    // const bodyUtils = new BodyUtils(octokit)
    const targetBranch = await gitUtility.getTargetBranch(
      input.targetBranch,
      octokit
    )

    core.startGroup('Checks')
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
    const prNumber = await prUtility.getNumber(targetBranch, input.sourceBranch)

    core.info(`PR: ${prNumber}`)
    core.endGroup()

    core.startGroup('PR')
    const body = await bodyUtility.compose(
      input.sourceBranch,
      input.targetBranch
    )

    if (prNumber) {
      const pull = await prUtility.update(prNumber, 'TEST', body)
      core.info(`🎉 Pull Request updated: ${pull.html_url} (#${pull.number})`)
      core.setOutput('pr_nr', pull.number)
    }

    // if (pullRequestNr) {
    //   core.info('♻️ Update existing PR')
    //   const pull = await pr.updatePr(
    //     pullRequestNr,
    //     input.prTitle,
    //     body,
    //     input.prLabels,
    //     input.prAssignees
    //   )
    //   core.info(`🎉 Pull Request updated: ${pull.html_url} (#${pull.number})`)
    //   core.setOutput('pr_nr', pull.number)
    // } else {
    //   core.info('➕ Creating new PR')
    //   const pull = await pr.createPr(
    //     tgtBranch,
    //     input.prSource,
    //     input.prTitle,
    //     body,
    //     input.prLabels,
    //     input.prAssignees
    //   )
    //   const prNumber = pull.number
    //   core.info(`🎉 Pull Request created: ${pull.html_url} (#${prNumber})`)
    //   core.setOutput('pr_nr', prNumber)
    // }
    core.endGroup()
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()

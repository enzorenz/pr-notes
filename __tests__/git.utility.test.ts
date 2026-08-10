import {jest, describe, it, expect, beforeEach} from '@jest/globals'
import * as execModule from '@actions/exec'

jest.mock('@actions/exec')
jest.mock('@actions/github', () => ({
  context: {
    repo: {
      owner: 'testowner',
      repo: 'testrepo'
    }
  }
}))

const mockedExec = jest.mocked(execModule)

describe('GitUtility.branchExists', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns true when git ls-remote exits with code 0', async () => {
    mockedExec.exec.mockResolvedValue(0)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {GitUtility} = require('../src/utilities/git.utility')
    const git = new GitUtility()

    const result = await git.branchExists('feature-branch')
    expect(result).toBe(true)
    expect(mockedExec.exec).toHaveBeenCalledWith(
      'git ls-remote --exit-code --heads origin "feature-branch"',
      undefined,
      expect.objectContaining({
        failOnStdErr: false,
        silent: true,
        ignoreReturnCode: true
      })
    )
  })

  it('returns false when git ls-remote exits with non-zero code', async () => {
    mockedExec.exec.mockResolvedValue(2)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {GitUtility} = require('../src/utilities/git.utility')
    const git = new GitUtility()

    const result = await git.branchExists('nonexistent-branch')
    expect(result).toBe(false)
  })
})

describe('GitUtility.getTargetBranch', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns the provided branch when non-empty', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {GitUtility} = require('../src/utilities/git.utility')
    const git = new GitUtility()
    const mockOctokit = {
      rest: {
        repos: {
          get: jest.fn<() => Promise<unknown>>()
        }
      }
    }

    const result = await git.getTargetBranch('develop', mockOctokit)
    expect(result).toBe('develop')
    expect(mockOctokit.rest.repos.get).not.toHaveBeenCalled()
  })

  it('falls back to default branch when branch is falsy (empty string)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {GitUtility} = require('../src/utilities/git.utility')
    const git = new GitUtility()
    const mockOctokit = {
      rest: {
        repos: {
          get: jest
            .fn<() => Promise<{data: {default_branch: string}}>>()
            .mockResolvedValue({
              data: {default_branch: 'main'}
            })
        }
      }
    }

    const result = await git.getTargetBranch('', mockOctokit)
    expect(result).toBe('main')
    expect(mockOctokit.rest.repos.get).toHaveBeenCalledWith({
      owner: 'testowner',
      repo: 'testrepo'
    })
  })
})

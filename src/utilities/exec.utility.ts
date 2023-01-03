import {ExecOptions, exec} from '@actions/exec'

export class ExecUtility {
  async run(commandLine: string, args?: string[] | undefined): Promise<number> {
    const execOpts = {} as ExecOptions

    execOpts.failOnStdErr = false
    execOpts.silent = true
    execOpts.ignoreReturnCode = true

    return exec(commandLine, args, execOpts)
  }
}

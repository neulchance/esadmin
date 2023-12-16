/* copy+paste from Typescript code base (TypeScript/scripts/build/utils.mjs) */
import {
  CancelError,
} from '@esfx/canceltoken'
import {
  spawn,
} from 'child_process'
import chalk from 'chalk'
import which from 'which'

/**
 * Executes the provided command once with the supplied arguments.
 * @param {string} cmd
 * @param {string[]} args
 * @param {ExecOptions} [options]
 *
 * @typedef ExecOptions
 * @property {boolean} [ignoreExitCode]
 * @property {boolean} [hidePrompt]
 * @property {boolean} [waitForExit=true]
 * @property {boolean} [ignoreStdout]
 * @property {import("@esfx/canceltoken").CancelToken} [token]
 */
export async function exec(cmd, args, options = {}) {
  return /**@type {Promise<{exitCode?: number}>}*/ (new Promise((resolve, reject) => {
    const { ignoreExitCode, waitForExit = true, ignoreStdout } = options;

    if (!options.hidePrompt) console.log(`> ${chalk.green(cmd)} ${args.join(" ")}`);
    const proc = spawn(which.sync(cmd), args, { stdio: waitForExit ? ignoreStdout ? ["inherit", "ignore", "inherit"] : "inherit" : "ignore", detached: !waitForExit });
    if (waitForExit) {
      const onCanceled = () => {
        proc.kill();
      };
      const subscription = options.token?.subscribe(onCanceled);
      proc.on("exit", exitCode => {
        if (exitCode === 0 || ignoreExitCode) {
          resolve({ exitCode: exitCode ?? undefined });
        }
        else {
          const reason = options.token?.signaled ? options.token.reason ?? new CancelError() :
            new ExecError(exitCode);
          reject(reason);
        }
        subscription?.unsubscribe();
      });
      proc.on("error", error => {
        reject(error);
        subscription?.unsubscribe();
      });
    }
    else {
      proc.unref();
      resolve({ exitCode: undefined });
    }
  }));
}

export class ExecError extends Error {
  exitCode;

  /**
   * @param {number | null} exitCode
   * @param {string} message
   */
  constructor(exitCode, message = `Process exited with code: ${exitCode}`) {
    super(message);
    this.exitCode = exitCode;
  }
}
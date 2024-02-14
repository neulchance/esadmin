import {exec} from '../utils.mjs'

export async function watch() {
  await exec('ts-node', ['-T', './scripts/build/tasks/watch'])
}

export async function transpile() {
  await exec('ts-node', ['-T', './scripts/build/tasks/transpile'])
}

/**
 * @param {string[]} args
 */
export async function copyFiles(args) {
  const commaSeparatedString = args.join(',')
  await exec('ts-node', ['-T', './scripts/build/tasks/copy', '--filetypes', commaSeparatedString])
}
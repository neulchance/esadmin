import {exec} from '../utils.mjs'

export async function watch() {
  await exec('ts-node', ['-T', './scripts/build/tasks/watch'])
}

export async function transpile() {
  // eslint-disable-next-line no-undef
  console.log(globalThis)
  await exec('ts-node', ['-T', './scripts/build/tasks/transpile'])
}
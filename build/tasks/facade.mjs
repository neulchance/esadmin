import {exec} from '../utils.mjs'

export async function watch() {
  await exec('ts-node', ['-T', './build/tasks/facade/watch'])
}

export async function transpile() {
  await exec('ts-node', ['-T', './build/tasks/transpile-facade'])
}
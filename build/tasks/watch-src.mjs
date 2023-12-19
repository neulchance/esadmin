import {exec} from '../utils.mjs'

export async function watch() {
  await exec('ts-node', ['-T', './build/tasks/lib/watch'])
}
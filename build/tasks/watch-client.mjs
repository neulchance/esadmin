import {exec} from '../utils.mjs'

export async function watch() {
  // await exec('ts-node', ['./build/watch.ts'])
  await exec('ts-node', ['-T', './build/watch'])
}
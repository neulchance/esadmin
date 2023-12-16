import path from 'path'
import ts from 'typescript'
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {exec} from './utils.mjs'

export async function watch() {
  const projectPath = path.join(__dirname, '../', 'src', 'tsconfig.json');
  const parsed = ts.readConfigFile(projectPath, ts.sys.readFile)
  await exec('ts-node', ['--version'])
  // await exec('ts-node', ['./build/watch.ts'])
  await exec('ts-node', ['./build/watch'])
  // exec('ts-node', [''])
  // console.log(parsed)
}
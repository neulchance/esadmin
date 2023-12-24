/* 
How to get console.log line numbers shown in Nodejs?
https://stackoverflow.com/a/59859740 
*/
const { log } = console;
function proxiedLog(...args: any) {
  const line = (((new Error('log'))
    .stack!.split('\n')[2] || '…')
    .match(/\(([^)]+)\)/) || [, 'not found'])[1];
  log.call(console, `${line}\n`, ...args);
}
console.info = proxiedLog;
console.log = proxiedLog;

import os from 'os';
import fs from 'fs'
import path, {basename} from 'path'
import { pipeline } from 'node:stream/promises'
import { Transform, Writable, Readable, Duplex, PassThrough } from 'node:stream'
import ts from 'typescript'
import * as util from '../lib/util'
import { glob, globSync, globStream, globStreamSync, Glob } from 'glob'
import Vinyl from 'vinyl'
import {logger} from '../base/logger';
import * as compilation from '../lib/compilation'
const {compose} = require('node:stream')

async function main() {
  transpileTask('src', 'out', true)
}

export async function transpileTask(src: string, out: string, swc: boolean) {
  /**
   * ⓵
   * Sourcing through glob
   */
  async function* sourceFileURLs() {
    const tsFiles = await glob('src/**/*.{ts,js}', { ignore: 'node_modules/**', withFileTypes: true})
    logger.info(`— ${tsFiles.length}`)
    for (const tsFile of tsFiles) {
      logger.info(`✓`)
      yield tsFile.fullpath()
    }
  }
  
  /**
   * ⓶
   * Read file & Conver to Vinyl
   */
  const rootDir = path.join(__dirname, '../../');
  const sourcingFile = new Transform({
    readableObjectMode: true,
    writableObjectMode: true,
    transform(relative, encoding, callback) {
      // logger.info(`😎 ${rootDir}${relative.toString()}`)
      const file = fs.readFileSync(relative.toString())
      const vinyl = new Vinyl({
        path: `${rootDir}${relative.toString()}`,
        contents: file
      })
      this.push(vinyl)
      callback()
    }
  })

  /**
   * ⓷
   * Check What it is.
   */
  const what = new PassThrough({
    readableObjectMode: true,
    writableObjectMode: true,
    transform(file: Vinyl, encoding, callback) {
      logger.info(`⓶: path.dirname ${path.dirname(file.path)}`)
      logger.info(`⓶: base ${file.base}`)
      logger.info(`⓶: basename ${file.basename}`)
      logger.info(`⓶: cwd ${file.cwd}`)
      logger.info(`⓶: path ${file.path}`)
      callback(null, file)
    }
  })

  const saveFile = new Writable({
    objectMode: true,
    write(file: Vinyl, encoding, callback) {
      fs.mkdirSync(path.dirname(file.path), {recursive: true})
      fs.writeFileSync(file.path, file.contents.toString())
      callback()
    }
  })
  
  const traspile = compilation.createCompile(src, false, true, {swc})
  try {
    await pipeline(
      sourcingFileURL,
      sourcingFile,
      traspile(),
      // what,
      saveFile
    )
  } catch (error) {
    console.error(error)
  }
}

main()
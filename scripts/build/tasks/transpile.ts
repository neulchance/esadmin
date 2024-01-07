/* 
How to get console.log line numbers shown in Nodejs?
https://stackoverflow.com/a/59859740 
*/
// const {log} = console;
// function proxiedLog(...args: any) {
//   const line = (((new Error('log'))
//     .stack!.split('\n')[2] || '…')
//     // eslint-disable-next-line no-sparse-arrays
//     .match(/\(([^)]+)\)/) || [, 'not found'])[1];
//   log.call(console, `${line}\n`, ...args);
// }
// console.info = proxiedLog;
// console.log = proxiedLog;

import os from 'os';
import fs from 'fs'
import path, {basename} from 'path'
import {pipeline} from 'node:stream/promises'
import {Transform, Writable, Readable, Duplex, PassThrough} from 'node:stream'
import ts from 'typescript'
import * as util from '../lib/util'
import {glob, globSync, globStream, globStreamSync, Glob} from 'glob'
import Vinyl from 'vinyl'
import {logger} from '../base/logger';
import * as compilation from '../lib/compilation'

async function main() {
  transpileTask('src', 'out', true)
}

export async function transpileTask(src: string, out: string, swc: boolean) {
  /**
   * ⓵
   * AsyncGenerator to be source of stream
   */
  async function* sourcePath() {
    const srcFiles = await glob('src/**/*.{ts,js,css}', {ignore: 'node_modules/**', withFileTypes: true})
    for (const srcFile of srcFiles) {
      yield srcFile.fullpath()
    }
  }
  
  /**
   * ⓶
   * Read file & Conver to Vinyl
   */
  const sourceVinyl = new Transform({
    readableObjectMode: true,
    writableObjectMode: true,
    transform(path, encoding, callback) {
      const file = fs.readFileSync(path)
      const vinyl = new Vinyl({
        path: path,
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
  
  const transpile = compilation.createCompile(src, false, true, {swc})
  
  try {
    await pipeline(
      sourcePath,
      sourceVinyl,
      transpile(),
      // what,
      saveFile
    )
  } catch (error) {
    console.error(error)
  }
}

main()
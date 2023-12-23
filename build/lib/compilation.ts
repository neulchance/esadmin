import os from 'os';
import fs from 'fs'
import path, {basename} from 'path'
import { pipeline } from 'node:stream/promises'
import { Transform, Writable, Readable, Duplex, PassThrough } from 'node:stream'
import ts from 'typescript'
import * as util from './util'
import { glob, globSync, globStream, globStreamSync, Glob } from 'glob'
import Vinyl from 'vinyl'
import {logger} from '../base/logger';
const {compose} = require('node:stream')

function getTypeScriptCompilerOptions(src: string): ts.CompilerOptions {
	const rootDir = path.join(__dirname, `../../${src}`);
	const options: ts.CompilerOptions = {};
	options.verbose = false;
	options.sourceMap = true;
	if (process.env['VSCODE_NO_SOURCEMAP']) { // To be used by developers in a hurry
		options.sourceMap = false;
	}
	options.rootDir = rootDir;
	options.baseUrl = rootDir;
	options.sourceRoot = util.toFileUri(rootDir);
	options.newLine = /\r\n/.test(fs.readFileSync(__filename, 'utf8')) ? 0 : 1;
	return options;
}

export function createCompile(src: string, build: boolean, emitError: boolean, transpileOnly: boolean | { swc: boolean }) {
  const tsb = require('./tsb') as typeof import('./tsb')
  
  const rootDir = path.join(__dirname, '../../');
  const projectPath = path.join(rootDir, src, 'tsconfig.json')
  const overrideOptions = {...getTypeScriptCompilerOptions(src), inlineSources: Boolean(build)}
  if (!build) {
		overrideOptions.inlineSourceMap = true;
	}

  /* Creating a compiler among TSC, SWC, and So on. */
  const compilation = tsb.create(projectPath, overrideOptions, {
    verbose: true,
    transpileOnly: Boolean(transpileOnly),
    transpileWithSwc: typeof transpileOnly !== 'boolean' && transpileOnly.swc
  })

  const isRuntimeJs = (f: Vinyl) => f.path.endsWith('.js') && !f.path.includes('fixtures');
  // async function* toUpper(source) {
  //   for await (const chunk of source) {
  //     yield String(chunk).toUpperCase();
  //   }
  // }
  function* toUpper(source: any) {
    logger.info(`💪😂 ${"hihihi"}`)
    logger.info(`💪😂 ${source}`)
    console.log(source)
    yield source
  }
  const composed = compose(compilation(), toUpper)
  
  function pipeline() {
    return composed
  }
  return pipeline

}

export async function transpileTask(src: string, out: string, swc: boolean) {
  /**
   * ⓵
   * Sourcing through glob
   */
  const sourcingFileURL = new Readable({
    objectMode: true,
    async read() {
      const g3 = new Glob('src/**/*.ts', { withFileTypes: true })
      // console.log(g3)
      const tsFiles = await glob('src/**/*.{ts,js}', { ignore: 'node_modules/**', })
      for (const tsFile of tsFiles) {
        this.push(tsFile)
      }
      this.pause()
      // this.emit('end')
    }
  })
  
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
  
  const traspile = createCompile(src, false, true, {swc})
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


export function compileTask(src: string, out: string, build: boolean, options: { disableMangle?: boolean } = {}) {
  if (os.totalmem() < 4_000_000_000) {
    throw new Error('compilation requires 4GB of RAM');
  }
}

export function watchTask(out: string, build: boolean) {
  // console.log(out, build)
  // console.log(path.basename(out))
  createCompile('src', build, false, false)
  if (os.totalmem() < 4_000_000_000) {
    throw new Error('compilation requires 4GB of RAM');
  }
}
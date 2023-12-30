import os from 'os';
import fs from 'fs'
import path, {basename} from 'path'
import {pipeline} from 'node:stream/promises'
import {Transform, Writable, Readable, Duplex, PassThrough} from 'node:stream'
import ts from 'typescript'
import * as util from './util'
import {glob, globSync, globStream, globStreamSync, Glob} from 'glob'
import Vinyl from 'vinyl'
import {logger} from '../base/logger';
const {compose} = require('node:stream')

function getTypeScriptCompilerOptions(src: string): ts.CompilerOptions {
	const rootDir = path.join(__dirname, `../../../${src}`);
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
  
  const rootDir = path.join(__dirname, '../../../');
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
  const what = new PassThrough({
    readableObjectMode: true,
    writableObjectMode: true,
    transform(file: Vinyl, encoding, callback) {
      const replace = file.path.replace('src', 'out')
      file.path = replace
      logger.info(`⓶: path ${file.path}`)
      this.push(file)
      callback()
    }
  })
  
  const replacePath = new PassThrough({
    readableObjectMode: true,
    writableObjectMode: true,
    transform(file: Vinyl, encoding, callback) {
      /* '.ts' file converted in compilation() stream process, but '.js' is not. so its path replace 'src' to 'out'. */
      const replace = file.path.replace('src', 'out')
      file.path = replace
      logger.info(`📁 file.path replced -> ${replace}`)
      this.push(file)
      callback()
    }
  })

  const tsFilter = util.filter(data => /\.ts$/.test(data.path))

  const dtsFilter = util.filter(data => !/\.d.ts$/.test(data.path))

  function pipeline() {
    return compose(
      dtsFilter,
      tsFilter,
      compilation(),
      tsFilter.restore,
      replacePath,
    )
  }
  pipeline.tsProjectSrc = () => {
		return compilation.src({base: src});
	};
  return pipeline

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
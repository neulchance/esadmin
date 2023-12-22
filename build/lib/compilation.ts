import os from 'os';
import fs from 'fs'
import path from 'path'
import ts from 'typescript'
import * as util from './util'
// import * as tsb from './tsb'

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

function createCompile(src: string, build: boolean, emitError: boolean, transpileOnly: boolean | { swc: boolean }) {
  const tsb = require('./tsb') as typeof import('./tsb')
  
  const rootDir = path.join(__dirname, '../../');
  const projectPath = path.join(rootDir, src, 'tsconfig.json')
  const overrideOptions = {...getTypeScriptCompilerOptions(src), inlineSources: Boolean(build)}
  if (!build) {
		overrideOptions.inlineSourceMap = true;
	}

  // console.log(overrideOptions)
  const compilation = tsb.creaete(
    projectPath,
    overrideOptions,
    {
      verbose: false,
      transpileOnly: Boolean(transpileOnly),
      transpileWithSwc: typeof transpileOnly !== 'boolean' && transpileOnly.swc
    }
  )
  console.log(compilation)
  /* const compilation = tsb.create(projectPath, overrideOptions, {
		verbose: false,
		transpileOnly: Boolean(transpileOnly),
		transpileWithSwc: typeof transpileOnly !== 'boolean' && transpileOnly.swc
	}); */
}

export function transpileTask(src: string, out: string, swc: boolean) {
  createCompile(src, false, true, {swc})
  if (os.totalmem() < 4_000_000_000) {
    throw new Error('compilation requires 4GB of RAM');
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
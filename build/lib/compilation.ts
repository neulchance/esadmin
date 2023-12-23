import os from 'os';
import fs from 'fs'
import path, {basename} from 'path'
import { pipeline } from 'node:stream/promises'
import { Transform, Writable, Readable, Duplex } from 'node:stream'
import ts from 'typescript'
import * as util from './util'
import { glob, globSync, globStream, globStreamSync, Glob } from 'glob'
import Vinyl from 'vinyl'
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
  console.log('😂😂😂😂', rootDir)
  const projectPath = path.join(rootDir, src, 'tsconfig.json')
  const overrideOptions = {...getTypeScriptCompilerOptions(src), inlineSources: Boolean(build)}
  if (!build) {
		overrideOptions.inlineSourceMap = true;
	}

  /* Creating a compiler among TSC, SWC, and So on. */
  const compilation = tsb.create(
    projectPath,
    overrideOptions,
    {
      verbose: true,
      transpileOnly: Boolean(transpileOnly),
      transpileWithSwc: typeof transpileOnly !== 'boolean' && transpileOnly.swc
    }
  )

  function pipeline() {

  }
  // const a = compilation().pipe(fs.createWriteStream('./aa.txt'))
  

  const myDuplex = new Duplex({
    read(size) {
      // ...
    },
    write(chunk, encoding, callback) {
      // ...
    },
  });
  // pipeline()
  // console.log(compilation())
  return compilation

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
      const tsFiles = await glob('src/**/*.ts', { ignore: 'node_modules/**' })
      for (const tsFile of tsFiles) {
        this.push(tsFile)
      }
      this.pause()
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
    // objectMode: true,
    transform(data, encoding, callback) {
      const file = fs.readFileSync(data.toString())
      const vinyl = new Vinyl({
        path: rootDir+data.toString(),
        contents: file
      })
      this.push(vinyl)
      callback()
    }
  })

  /**
   * ⓷
   * Save it to out
   */
  const what = new Transform({
    readableObjectMode: true,
    writableObjectMode: true,
    transform(data, encoding, callback) {
      console.log(data)
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
      // traspile(),
      // removeSpaces,
      // fs.createWriteStream('temp.js'),
      // toUpper,
      // (err) => {
      //   console.log(err)
      // }
    )
  } catch (error) {
    console.error(error)
  }
  // task()
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
import path, {dirname} from 'path'
import {Readable, Writable, Transform} from 'stream'
import ts, { transpile } from 'typescript'
import {ITranspiler, SwcTranspiler} from './transpiler'
import Vinyl from 'vinyl'
import * as builder from './builder'
import * as os from 'os'

export interface IncrementalCompiler {
	(token?: any): Readable & Writable
	src(opts?: { cwd?: string; base?: string }): Readable
}
/**
 * Create typescript bulder
 * @param projectPath 
 * @param existingOptions 
 * @param config 
 * @returns 
 */
export function creaete(
  projectPath: string,
  existingOptions: Partial<ts.CompilerOptions>,
  config: { verbose?: boolean; transpileOnly?: boolean; transpileOnlyIncludesDts?: boolean; transpileWithSwc?: boolean },
): IncrementalCompiler {

  // TRANSPILE ONLY stream doing just TS to JS conversion
	function createTranspileStream(transpiler: ITranspiler): Readable & Writable {
    return new Transform({
      transform(file: Vinyl, encoding, callback) {
        // give the file to the compiler
        if (file.isStream()) {
          this.emit('error', 'no support for stream')
          return
        }
        if (!file.contents) {
          return
        }
        if (!config.transpileOnlyIncludesDts && file.path.endsWith('.d.ts')) {
          return
        }
        if (!transpiler.onOutfile) {
          /* Binding @Output */
				  transpiler.onOutfile = file => this.push(file)
        }
        transpiler.transpile(file);
      },
      destroy() {
        transpiler.join().then(() => {
          this.push(null)
          transpiler.onOutfile = undefined;
        })
      },
    })
	}

  /* ⓵ Prepare typescript config file */
  const parsed = ts.readConfigFile(projectPath, ts.sys.readFile)
  const cmdLine = ts.parseJsonConfigFileContent(parsed.config, ts.sys, dirname(projectPath), existingOptions)

  /* ⓶ */
  const transpiler = new SwcTranspiler(projectPath, cmdLine);
  
  let result: any/* IncrementalCompiler */
  result = 'You have to made!'
  result = <any>(() => createTranspileStream(transpiler))
  // createCompileStream()
  
  // const _builder = builder.createTypeScriptBuilder(/* { logFn },  */projectPath, cmdLine)
  // createCompileStream()
  
  // result = <any>(() => createTranspileStream(transpiler));
  // result = <any>((token: builder.CancellationToken) => createCompileStream(_builder, token));
  return <IncrementalCompiler>result
}
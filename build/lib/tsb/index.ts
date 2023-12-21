import path, {dirname} from 'path'
import {Readable, Writable} from 'stream'
import ts from 'typescript'

import {SwcTranspiler} from './transpiler'
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
  /* ⓵ Prepare typescript config file */
  const parsed = ts.readConfigFile(projectPath, ts.sys.readFile)
  const cmdLine = ts.parseJsonConfigFileContent(parsed.config, ts.sys, dirname(projectPath), /* existingOptions */)

  // ? new TscTranspiler(logFn, printDiagnostic, projectPath, cmdLine)
  // : new SwcTranspiler(logFn, printDiagnostic, projectPath, cmdLine);
  let result: any/* IncrementalCompiler */
  result = 'You have to made!'
  // const traspiler = new SwcTranspiler()
  // traspiler.transpile()
  // createTranspileStream()
  // createCompileStream()
  const _builder = builder.createTypeScriptBuilder(/* { logFn },  */projectPath, cmdLine)
  // createCompileStream()
  
  // result = <any>(() => createTranspileStream(transpiler));
  // result = <any>((token: builder.CancellationToken) => createCompileStream(_builder, token));
  return <IncrementalCompiler>result
}
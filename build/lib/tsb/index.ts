import path, {dirname} from 'path'
import {Readable, Writable} from 'stream'
import ts from 'typescript'
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
		return through(
      
      function (
        this: through.ThroughStream & { queue(a: any): void },
        file: Vinyl
      ) {
        // give the file to the compiler
        if (file.isStream()) {
          this.emit('error', 'no support for streams');
          return;
        }
        if (!file.contents) {
          return;
        }
        if (!config.transpileOnlyIncludesDts && file.path.endsWith('.d.ts')) {
          return;
        }

        if (!transpiler.onOutfile) {
          transpiler.onOutfile = file => this.queue(file);
        }

        transpiler.transpile(file);
      },

      function (this: { queue(a: any): void }) {
			  transpiler.join().then(() => {
				  this.queue(null);
				  transpiler.onOutfile = undefined;
			  });
      }
    );
	}

  /* ⓵ Prepare typescript config file */
  const parsed = ts.readConfigFile(projectPath, ts.sys.readFile)
  const cmdLine = ts.parseJsonConfigFileContent(parsed.config, ts.sys, dirname(projectPath), /* existingOptions */)

  /* ⓶ */
  const traspiler = new SwcTranspiler(projectPath, cmdLine);
  
  let result: any/* IncrementalCompiler */
  result = 'You have to made!'
  // const traspiler = new SwcTranspiler()
  // traspiler.transpile()
  // createTranspileStream()
  // createCompileStream()
  
  // const _builder = builder.createTypeScriptBuilder(/* { logFn },  */projectPath, cmdLine)
  // createCompileStream()
  
  // result = <any>(() => createTranspileStream(transpiler));
  // result = <any>((token: builder.CancellationToken) => createCompileStream(_builder, token));
  return <IncrementalCompiler>result
}
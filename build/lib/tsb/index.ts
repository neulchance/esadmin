import path, {dirname} from 'path'
import {Readable, Writable, Transform, Duplex} from 'stream'
import ts, { transpile } from 'typescript'
import Vinyl from 'vinyl'
import {ITranspiler, SwcTranspiler} from './transpiler'
import {strings} from '../util'
import {logger} from '../../base/logger'

export interface IncrementalCompiler {
	(token?: any): Readable & Writable
	src(opts?: { cwd?: string; base?: string }): Readable
}

const _defaultOnError = (err: string) => console.log(JSON.stringify(err, null, 4));

export function create(
  projectPath: string,
  existingOptions: Partial<ts.CompilerOptions>,
  config: { verbose?: boolean; transpileOnly?: boolean; transpileOnlyIncludesDts?: boolean; transpileWithSwc?: boolean },
  onError: (message: string) => void = _defaultOnError
): IncrementalCompiler {

  function printDiagnostic(diag: ts.Diagnostic | Error): void {
    
		if (diag instanceof Error) {
			onError(diag.message);
		} else if (!diag.file || !diag.start) {
			onError(ts.flattenDiagnosticMessageText(diag.messageText, '\n'));
		} else {
			const lineAndCh = diag.file.getLineAndCharacterOfPosition(diag.start);
			onError(strings.format('{0}({1},{2}): {3}',
				diag.file.fileName,
				lineAndCh.line + 1,
				lineAndCh.character + 1,
				ts.flattenDiagnosticMessageText(diag.messageText, '\n'))
			);
		}
	}

  /* ⓵-⓵ Read & Dianogstic tsconfig.json file */
  const parsed = ts.readConfigFile(projectPath, ts.sys.readFile)
  if (parsed.error) {
  }
  /* ⓵-⓶ Read & Parse from parsed-json file include extends file */
  const cmdLine = ts.parseJsonConfigFileContent(parsed.config, ts.sys, dirname(projectPath), existingOptions)
  if (cmdLine.errors.length > 0) {
		// cmdLine.errors.forEach(printDiagnostic);
		// return createNullCompiler();
	}

  function logFn(topic: string, message: string): void {
		if (config.verbose) {
			logger.info(`${topic} ${message}`)
		}
	}

  // TRANSPILE ONLY stream doing just TS to JS conversion
	function createTranspileStream(transpiler: ITranspiler): Readable & Writable {
    return new Transform({
      /**
       * TypeError: The "chunk" argument must be of type string or an instance of Buffer or Uint8Array. Received an instance of File
       */
      readableObjectMode: true, // givableObjectMode (주기위해 읽는다, 넥스트 스트림에 쓸 수 있다)
      writableObjectMode: true, // In the previouse stream 에서 여기에 쓰려고 할 때 (읽기위해 쓴다, 이전 스트림으로 부터 읽을 수 있다.) */
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
				  transpiler.onOutfile = file => {
            this.push(file)
            callback()
          }
        }
        transpiler.transpile(file);
      },
      destroy(error, callback) {
        if (error) {
          logger.info(error)
        }
        transpiler.join().then(() => {
          this.push(null)
          transpiler.onOutfile = undefined;
        })
      },
    })
	}

  /* ⓶ */
  const transpiler = new SwcTranspiler(logFn, printDiagnostic, projectPath, cmdLine);
  
  let result: IncrementalCompiler
  result = <any>(() => createTranspileStream(transpiler))
  // const _builder = builder.createTypeScriptBuilder(/* { logFn },  */projectPath, cmdLine)
  // result = <any>((token: builder.CancellationToken) => createCompileStream(_builder, token));
  return <IncrementalCompiler>result
}
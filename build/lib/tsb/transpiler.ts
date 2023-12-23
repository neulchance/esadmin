import fs from 'node:fs'
import ts from 'typescript'
import Vinyl from 'vinyl'
import * as swc from '@swc/core'
import { logger } from '../../base/logger';

class OutputFileNameOracle {

	readonly getOutputFileName: (name: string) => string;

	constructor(cmdLine: ts.ParsedCommandLine, configFilePath: string) {
		// very complicated logic to re-use TS internal functions to know the output path
		// given a TS input path and its config
		type InternalTsApi = typeof ts & {
			normalizePath(path: string): string;
			getOutputFileNames(commandLine: ts.ParsedCommandLine, inputFileName: string, ignoreCase: boolean): readonly string[];
		};
		this.getOutputFileName = (file) => {
			try {

				// windows: path-sep normalizing
				file = (<InternalTsApi>ts).normalizePath(file);

				if (!cmdLine.options.configFilePath) {
					// this is needed for the INTERNAL getOutputFileNames-call below...
					cmdLine.options.configFilePath = configFilePath;
				}
				const isDts = file.endsWith('.d.ts');
				if (isDts) {
					file = file.slice(0, -5) + '.ts';
					cmdLine.fileNames.push(file);
				}

				// logger.info(cmdLine.fileNames)
				// logger.info(`💪😂 ${file}`)
				const outfile = (<InternalTsApi>ts).getOutputFileNames(cmdLine, file, true)[0];

				if (isDts) {
					cmdLine.fileNames.pop();
				}
				return outfile;

			} catch (err: any) {

				// console.error(file, cmdLine.fileNames);
				// console.error(err);
				throw new Error();
			}
		};
	}
}

export interface ITranspiler {
	onOutfile?: (file: Vinyl) => void;
	join(): Promise<void>;
	transpile(file: Vinyl): void;
}

export class SwcTranspiler {
	onOutfile?: ((file: Vinyl) => void) | undefined;
	private readonly _outputFileNames: OutputFileNameOracle;
	private _jobs: Promise<any>[] = [];

	constructor(
		private readonly _logFn: (topic: string, message: string) => void,
		private readonly _onError: (err: any) => void,
		configFilePath: string,
		private readonly _cmdLine: ts.ParsedCommandLine
	) {
		this._outputFileNames = new OutputFileNameOracle(_cmdLine, configFilePath);
	}

	async join(): Promise<void> {
		const jobs = this._jobs.slice();
		this._jobs.length = 0;
		// 모든 promises가 settled 되면
		await Promise.allSettled(jobs);
	}

	transpile(file: Vinyl): void {
		if (this._cmdLine.options.noEmit) {
			// not doing ANYTHING here
			return;
		}

		const tsSrc = String(file.contents);
		const t1 = Date.now()

		let options: swc.Options = SwcTranspiler._swcrcEsm;
		if (this._cmdLine.options.module === ts.ModuleKind.AMD) {
			const isAmd = /\n(import|export)/m.test(tsSrc);
			if (isAmd) {
				options = SwcTranspiler._swcrcAmd;
			}
		} else if (this._cmdLine.options.module === ts.ModuleKind.CommonJS) {
			options = SwcTranspiler._swcrcCommonJS;
		}
		this._jobs.push(swc.transform(tsSrc, options).then(output => {

			// check if output of a DTS-files isn't just "empty" and iff so
			// skip this file
			const outBase = this._cmdLine.options.outDir ?? file.base;
			const outPath = this._outputFileNames.getOutputFileName(file.path);

			this.onOutfile!(new Vinyl({
				path: outPath,
				base: outBase,
				contents: Buffer.from(output.code),
			}))

			this._logFn('Transpile', `swc took ${Date.now() - t1}ms for ${file.path}`);

		}).catch(err => {
			this._onError(err);
		}))
	}

	// --- .swcrc

	private static readonly _swcrcAmd: swc.Options = {
		exclude: '\.js$',
		jsc: {
			parser: {
				syntax: 'typescript',
				tsx: false,
				decorators: true
			},
			target: 'es2022',
			loose: false,
			minify: {
				compress: false,
				mangle: false
			},
			transform: {
				useDefineForClassFields: false,
			},
		},
		module: {
			type: 'amd',
			noInterop: true
		},
		minify: false,
	};

	private static readonly _swcrcCommonJS: swc.Options = {
		...this._swcrcAmd,
		module: {
			type: 'commonjs',
			importInterop: 'none'
		}
	};

	private static readonly _swcrcEsm: swc.Options = {
		...this._swcrcAmd,
		module: {
			type: 'es6'
		}
	};
}

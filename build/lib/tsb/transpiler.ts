// import swc from '@swc/core'
// import ts from 'typescript'
import fs from 'node:fs'

export interface ITranspiler {
	onOutfile?: (file: fs.ReadStream/* Vinyl */) => void;
	join(): Promise<void>;
	transpile(file: fs.ReadStream/* Vinyl */): void;
}

export class SwcTranspiler {
  transpile(): void {
    console.log('transpile')
  }
}
import os from 'os';
import * as tsb from './tsb'

export function transpileTask() {
  throw new Error('not implemented.');
}


export function compileTask(src: string, out: string, build: boolean, options: { disableMangle?: boolean } = {}) {
  tsb.creaete(src)
  if (os.totalmem() < 4_000_000_000) {
    throw new Error('compilation requires 4GB of RAM');
  }
}
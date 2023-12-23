/* 
How to get console.log line numbers shown in Nodejs?
https://stackoverflow.com/a/59859740 
*/
const { log } = console;
function proxiedLog(...args: any) {
  const line = (((new Error('log'))
    .stack!.split('\n')[2] || '…')
    .match(/\(([^)]+)\)/) || [, 'not found'])[1];
  log.call(console, `${line}\n`, ...args);
}
console.info = proxiedLog;
console.log = proxiedLog;

// import * as compilation from '../../lib/compilation'
import {transpileTask} from './transpile-task'

async function main() {
  transpileTask('src', 'out', true)
}

main()
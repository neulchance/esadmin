import path, {dirname} from 'path'
import ts from 'typescript'
import {SwcTranspiler} from './transpiler'
import * as os from 'os';



export function creaete(src: string) {
  const rootDir = path.join(__dirname, '../../../');
  const projectPath = path.join(rootDir, src, 'tsconfig.json')
  
  const parsed = ts.readConfigFile(projectPath, ts.sys.readFile)

  // console.log(parsed.config);
  const cmdLine = ts.parseJsonConfigFileContent(parsed.config, ts.sys, dirname(projectPath), /* existingOptions */);
  // console.log(cmdLine);
  
  const traspiler = new SwcTranspiler()
  traspiler.transpile()
  console.log(os.totalmem())
  
}
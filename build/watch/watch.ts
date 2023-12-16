import path from 'path'
// import ts from 'typescript'
// import * as swc from '@swc/core'

async function main(wrootName: string) {
  const wrootPathIndexStart = __dirname.indexOf(wrootName)
  const wrootPath = __dirname.slice(0, wrootPathIndexStart + wrootName.length)
  const projectPath = path.join(wrootPath, 'src', 'tsconfig.json')
  console.log(projectPath)
  // const projectPath = path.join(__dirname, '../', 'src', 'tsconfig.json');
  // console.log(__dirname, __filename)
  // const projectPath = path.join(__dirname, '../', 'src', 'tsconfig.json');
  
  // path.join(__dirname, '../', 'src', 'tsconfig.json');
  // const wrootPathIndex = __dirname.indexOf('neulchan-tddev')

  // const __dirname.slice(0, wrootPathIndex)
  // console.log(projectPath.indexOf('neulchan-tddev'))
  // const i = projectPath.indexOf('neulchan-tddev')
  // console.log(projectPath.slice(0, i))
// /Users/home/workspace/organizations/org-neulchance/with-electron/neulchan-tddev/build/watch

  // const parsed = ts.readConfigFile(projectPath, ts.sys.readFile)
  // console.log(parsed)
  // const appDir = dirname(__dirname);
  // console.log(appDir)
}

main('neulchan-tddev')
import fs from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { Transform } from 'node:stream'
import ts from 'typescript'
import { glob, globSync, globStream, globStreamSync, Glob } from 'glob'

export async function  createTypeScriptBuilder(projectFile: string, cmd: ts.ParsedCommandLine) {
  console.log('createTypeScriptBuilder')

  // const tsfiles = await glob('**/*.ts', { ignore: 'node_modules/**' })
  const tsFiles = await glob('src/**/*.ts', { ignore: 'node_modules/**' })
  for (const tsFile of tsFiles) {
    run(tsFile)
  }
}


const rS = new Transform({
  transform(data, encoding, callback) {
    const reversedData = data.toString().split("").reverse().join("")
    // const reversedData = String(data).replace(/\s/, "")
    this.push(reversedData)
    callback()
  }
})

const removeSpaces = new Transform({
  transform(chunk, encoding, callback) {
    const regex = /\s/gi;
    // const reversedData = data.toString().replace(regex, "")
    callback(null, chunk.toString().replace(regex, ""))
  },
})

async function* toUpper(source: fs.ReadStream) {
  for await (const chunk of source) {
    yield String(chunk).toUpperCase()
  }
}

async function run(file: string) {
  const jsFile = file.split('.')[0] + '.js'
  const ac = new AbortController()
  const signal = ac.signal
  
  try {
    await pipeline(
      fs.createReadStream(file),
      /* async function * (source: fs.ReadStream) {
        console.log(source.bytesRead.toString())
        source.on('data', (chunk) => {
          console.log(`Received ${chunk.length} bytes of data.`)
        }) 
        // source.on('readable', () => {
        //   console.log(source.read())
        // })
        // await someLongRunningfn({ signal })
        yield source
      }, */
      toUpper,
      rS,
      removeSpaces,
      fs.createWriteStream('temp.js'),
      {signal}
    )
  } catch (error) {
    console.error(error)
  }
}

class LanguageServiceHost implements ts.LanguageServiceHost {
  getCompilationSettings(): ts.CompilerOptions {
    throw new Error('Method not implemented.')
  }
  getScriptFileNames(): string[] {
    throw new Error('Method not implemented.')
  }
  getScriptVersion(fileName: string): string {
    throw new Error('Method not implemented.')
  }
  getScriptSnapshot(fileName: string): ts.IScriptSnapshot | undefined {
    throw new Error('Method not implemented.')
  }
  getCurrentDirectory(): string {
    throw new Error('Method not implemented.')
  }
  getDefaultLibFileName(options: ts.CompilerOptions): string {
    throw new Error('Method not implemented.')
  }
  readFile(path: string, encoding?: string | undefined): string | undefined {
    throw new Error('Method not implemented.')
  }
  fileExists(path: string): boolean {
    throw new Error('Method not implemented.')
  }
}
import {glob} from 'glob'
import fs from 'fs'
import path from 'path'

// Get the command-line arguments
const args = process.argv.slice(2); // Exclude 'ts-node' and the script filename

// Find the index of the '--filetypes' argument
const dataIndex = args.findIndex(arg => arg === '--filetypes');

if (dataIndex !== -1 && dataIndex + 1 < args.length) {
    // Extract the comma-separated string from the arguments
    const dataString = args[dataIndex + 1];
    main(dataString)
} else {
    console.error('filetype list not provided.');
}

async function main(filetypes: string) {
  doCopyFiles('src', 'out', filetypes)
}

export async function doCopyFiles(from: string, to: string, filetypes: string) {
  const srcFiles = await glob(`src/**/*.{${filetypes}}`, {ignore: 'node_modules/**', withFileTypes: true})
  for (const srcFile of srcFiles) {
    const srcFullpath = srcFile.fullpath()
    const outFullpath = srcFile.fullpath().replace(from, to)
    fs.mkdirSync(path.dirname(outFullpath), {recursive: true})
    fs.promises.cp(srcFullpath, outFullpath)
  }
}


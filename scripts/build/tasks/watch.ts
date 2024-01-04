import path from 'path'
import fs from 'fs'
import {pipeline} from 'node:stream/promises'
import {Transform, Writable, Readable, Duplex, PassThrough} from 'node:stream'
import parcelWatcher from '@parcel/watcher'
import Vinyl from 'vinyl'
import {logger} from '../base/logger'
import * as compilation from '../lib/compilation'


async function main() {
  watchTask('src', 'out')
}


export async function watchTask(src: string, out: string) {
  /**
   * cwd: current working directory
   * process.cwd()는 명령어가 실행된 위치의 'path'를 나타낸다.
   */
  parcelWatcher.subscribe(path.join(process.cwd(), 'src'), (err, events) => {
    if (err) {
      logger.info(err)
    }
    logger.info(events.at(0)?.path)
    start.push(events.at(0)?.path)
  })

  const start = new Readable({
    objectMode: true,
    read() {},
    destroy(err, callback) {
      console.log(err)
    }
  })

  const sourceVinyl = new Transform({
    readableObjectMode: true,
    writableObjectMode: true,
    transform(path, encoding, callback) {
      const file = fs.readFileSync(path)
      const vinyl = new Vinyl({
        path: path,
        contents: file
      })
      this.push(vinyl)
      callback()
    }
  })

  const transpile = compilation.createCompile(src, false, true, {swc: true})

  const saveFile = new Writable({
    objectMode: true,
    write(file: Vinyl, encoding, callback) {
      fs.mkdirSync(path.dirname(file.path), {recursive: true})
      fs.writeFileSync(file.path, file.contents.toString())
      callback()
    }
  })

  const what = new PassThrough({
    readableObjectMode: true,
    writableObjectMode: true,
    transform(file: any, encoding, callback) {
      logger.info('2')
      logger.info(file)
      callback(null, file)
    }
  })

  try {
    await pipeline(
      start,
      sourceVinyl,
      transpile(),
      saveFile
    )
  } catch (error) {
    console.error(error)
  }
}

main()
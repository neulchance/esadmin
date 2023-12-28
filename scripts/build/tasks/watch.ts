import path from 'path'
import {pipeline} from 'node:stream/promises'
import {Transform, Writable, Readable, Duplex, PassThrough} from 'node:stream'
import parcelWatcher from '@parcel/watcher'
import {logger} from '../base/logger'


async function main() {
  watchTask('src', 'out')
}


export async function watchTask(src: string, out: string) {
  
  parcelWatcher.subscribe(path.join(process.cwd(), 'src'), (err, events) => {
    if (err) {
      logger.info(err)
    }
    logger.info('1')
    t1.push(events)
  })

  

  const t1 = new Readable({
    objectMode: true,
    read() {},
    destroy(err, callback) {
      console.log(err)
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
      t1,
      what
    )
  } catch (error) {
    console.error(error)
  }
}

main()
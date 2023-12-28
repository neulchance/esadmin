import {PassThrough, Duplex, Readable, Writable, Stream, Transform} from 'node:stream'
import {pipeline, finished} from 'node:stream/promises'
import {pathToFileURL} from 'url'
import Vinyl from 'vinyl'
import fs from 'fs'
import {logger} from '../base/logger'

export function toFileUri(filePath: string): string {
	const match = filePath.match(/^([a-z])\:(.*)$/i);

	if (match) {
		filePath = '/' + match[1].toUpperCase() + ':' + match[2];
	}

	return 'file://' + filePath.replace(/\\/g, '/');
}

/** Splits items in the stream based on the predicate, sending them to onTrue if true, or onFalse otherwise */
export function $if(test: boolean | ((f: Vinyl) => boolean), onTrue: NodeJS.ReadWriteStream, onFalse: NodeJS.ReadWriteStream = new PassThrough()) {
	if (typeof test === 'boolean') {
		return test ? onTrue : onFalse;
	}

	// return ternaryStream(test, onTrue, onFalse);
}

export interface FilterStream extends NodeJS.ReadWriteStream {
	restore: PassThrough;
}

export function filter(fn: (data: any) => boolean): FilterStream {
	
	const result = <FilterStream><any>new PassThrough({
		readableObjectMode: true,
		writableObjectMode: true,
		transform(chunk: Vinyl, encoding, callback) {
			if (fn(chunk)) {
				this.push(chunk)
			} else {
				/* flow to restore로 흘려 보낸다 */
				result.restore.push(chunk)
			}
			callback()
		},
		destroy(err, callback) {
			logger.info(`'1', ${err}`)
		}
	})

	result.restore = new PassThrough({
		readableObjectMode: true,
		writableObjectMode: true,
		transform(chunk, encoding, callback) {
			this.push(chunk)
			callback()
		},
		destroy(err, callback) {
			logger.info(`'2', ${err}`)
		}
	});
	return result
}
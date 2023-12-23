import {PassThrough, Duplex, Readable, Writable, Stream, Transform} from 'node:stream'

import {pipeline, finished} from 'node:stream/promises'
import { pathToFileURL } from 'url'
import Vinyl from 'vinyl'
import fs from 'fs'

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


async function* splitToWords(source: Vinyl) {
  // for await (const chunk of source) {
    // const words = String(chunk).split(' ');

    // for (const word of words) {
    //   yield word;
    // }
  // }
}

/** Operator that appends the js files' original path a sourceURL, so debug locations map */
// export function appendOwnPathSourceURL(): NodeJS.ReadWriteStream {		
	
// }

export module strings {

	/**
	 * The empty string. The one and only.
	 */
	export const empty = '';

	export const eolUnix = '\r\n';

	export function format(value: string, ...rest: any[]): string {
		return value.replace(/({\d+})/g, function (match) {
			const index = Number(match.substring(1, match.length - 1));
			return String(rest[index]) || match;
		});
	}
}
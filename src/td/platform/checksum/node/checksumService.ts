/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {createHash} from 'crypto';
import {listenStream} from 'td/base/common/stream';
import {URI} from 'td/base/common/uri';
import {IChecksumService} from 'td/platform/checksum/common/checksumService';
import {IFileService} from 'td/platform/files/common/files';

export class ChecksumService implements IChecksumService {

	declare readonly _serviceBrand: undefined;

	constructor(@IFileService private readonly fileService: IFileService) { }

	async checksum(resource: URI): Promise<string> {
		const stream = (await this.fileService.readFileStream(resource)).value;
		return new Promise<string>((resolve, reject) => {
			const hash = createHash('sha256');

			listenStream(stream, {
				onData: data => hash.update(data.buffer),
				onError: error => reject(error),
				onEnd: () => resolve(hash.digest('base64').replace(/=+$/, ''))
			});
		});
	}
}

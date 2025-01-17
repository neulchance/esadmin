/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {bufferToStream, streamToBuffer, VSBuffer} from 'td/base/common/buffer';
import {CancellationToken} from 'td/base/common/cancellation';
import {Event} from 'td/base/common/event';
import {IChannel, IServerChannel} from 'td/base/parts/ipc/common/ipc';
import {IHeaders, IRequestContext, IRequestOptions} from 'td/base/parts/request/common/request';
import {IRequestService} from 'td/platform/request/common/request';

type RequestResponse = [
	{
		headers: IHeaders;
		statusCode?: number;
	},
	VSBuffer
];

export class RequestChannel implements IServerChannel {

	constructor(private readonly service: IRequestService) { }

	listen(context: any, event: string): Event<any> {
		throw new Error('Invalid listen');
	}

	call(context: any, command: string, args?: any, token: CancellationToken = CancellationToken.None): Promise<any> {
		switch (command) {
			case 'request': return this.service.request(args[0], token)
				.then(async ({res, stream}) => {
					const buffer = await streamToBuffer(stream);
					return <RequestResponse>[{statusCode: res.statusCode, headers: res.headers}, buffer];
				});
			case 'resolveProxy': return this.service.resolveProxy(args[0]);
			case 'loadCertificates': return this.service.loadCertificates();
		}
		throw new Error('Invalid call');
	}
}

export class RequestChannelClient implements IRequestService {

	declare readonly _serviceBrand: undefined;

	constructor(private readonly channel: IChannel) { }

	async request(options: IRequestOptions, token: CancellationToken): Promise<IRequestContext> {
		const [res, buffer] = await this.channel.call<RequestResponse>('request', [options], token);
		return {res, stream: bufferToStream(buffer)};
	}

	async resolveProxy(url: string): Promise<string | undefined> {
		return this.channel.call<string | undefined>('resolveProxy', [url]);
	}

	async loadCertificates(): Promise<string[]> {
		return this.channel.call<string[]>('loadCertificates');
	}
}

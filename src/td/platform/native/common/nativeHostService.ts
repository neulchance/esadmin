/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {ProxyChannel} from 'td/base/parts/ipc/common/ipc';
import {IMainProcessService} from 'td/platform/ipc/common/mainProcessService';
import {INativeHostService} from 'td/platform/native/common/native';

// @ts-expect-error: interface is implemented via proxy
export class NativeHostService implements INativeHostService {

	declare readonly _serviceBrand: undefined;

	constructor(
		readonly windowId: number,
		@IMainProcessService mainProcessService: IMainProcessService
	) {
		console.log('mainProcessService', mainProcessService)
		return ProxyChannel.toService<INativeHostService>(mainProcessService.getChannel('nativeHost'), {
			context: windowId,
			properties: (() => {
				const properties = new Map<string, unknown>();
				properties.set('windowId', windowId);

				return properties;
			})()
		});
	}
}

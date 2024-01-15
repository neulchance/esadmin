/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IWorkspacesService} from 'td/platform/workspaces/common/workspaces';
import {IMainProcessService} from 'td/platform/ipc/common/mainProcessService';
import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {ProxyChannel} from 'td/base/parts/ipc/common/ipc';
import {INativeHostService} from 'td/platform/native/common/native';

// @ts-ignore: interface is implemented via proxy
export class NativeWorkspacesService implements IWorkspacesService {

	declare readonly _serviceBrand: undefined;

	constructor(
		@IMainProcessService mainProcessService: IMainProcessService,
		@INativeHostService nativeHostService: INativeHostService
	) {
		return ProxyChannel.toService<IWorkspacesService>(mainProcessService.getChannel('workspaces'), {context: nativeHostService.windowId});
	}
}

registerSingleton(IWorkspacesService, NativeWorkspacesService, InstantiationType.Delayed);

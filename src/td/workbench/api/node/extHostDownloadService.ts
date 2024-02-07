/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {join} from 'td/base/common/path';
import {tmpdir} from 'os';
import {generateUuid} from 'td/base/common/uuid';
import {IExtHostCommands} from 'td/workbench/api/common/extHostCommands';
import {Disposable} from 'td/base/common/lifecycle';
import {MainContext} from 'td/workbench/api/common/extHost.protocol';
import {URI} from 'td/base/common/uri';
import {IExtHostRpcService} from 'td/workbench/api/common/extHostRpcService';

export class ExtHostDownloadService extends Disposable {

	constructor(
		@IExtHostRpcService extHostRpc: IExtHostRpcService,
		@IExtHostCommands commands: IExtHostCommands
	) {
		super();

		const proxy = extHostRpc.getProxy(MainContext.MainThreadDownloadService);
		console.log('\x1b[34m iam going to go \x1b[0m')

		commands.registerCommand(false, '_workbench.downloadResource', async (resource: URI): Promise<any> => {
			const location = URI.file(join(tmpdir(), generateUuid()));
			await proxy.$download(resource, location);
			return location;
		});
	}
}

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'td/nls';
import { ILoggerService } from 'td/platform/log/common/log';
import { LogService } from 'td/platform/log/common/logService';
import { IExtHostInitDataService } from 'td/workbench/api/common/extHostInitDataService';

export class ExtHostLogService extends LogService {

	declare readonly _serviceBrand: undefined;

	constructor(
		isWorker: boolean,
		@ILoggerService loggerService: ILoggerService,
		@IExtHostInitDataService initData: IExtHostInitDataService,
	) {
		const id = initData.remote.isRemote ? 'remoteexthost' : isWorker ? 'workerexthost' : 'exthost';
		const name = initData.remote.isRemote ? localize('remote', "Extension Host (Remote)") : isWorker ? localize('worker', "Extension Host (Worker)") : localize('local', "Extension Host");
		super(loggerService.createLogger(id, { name }));
	}

}

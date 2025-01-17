/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {isMacintosh} from 'td/base/common/platform';
import {getMachineId, getSqmMachineId} from 'td/base/node/id';
import {ILogService} from 'td/platform/log/common/log';
import {IStateReadService} from 'td/platform/state/node/state';
import {machineIdKey, sqmIdKey} from 'td/platform/telemetry/common/telemetry';


export async function resolveMachineId(stateService: IStateReadService, logService: ILogService): Promise<string> {
	// We cache the machineId for faster lookups
	// and resolve it only once initially if not cached or we need to replace the macOS iBridge device
	let machineId = stateService.getItem<string>(machineIdKey);
	if (typeof machineId !== 'string' || (isMacintosh && machineId === '6c9d2bc8f91b89624add29c0abeae7fb42bf539fa1cdb2e3e57cd668fa9bcead')) {
		machineId = await getMachineId(logService.error.bind(logService));
	}

	return machineId;
}

export async function resolveSqmId(stateService: IStateReadService, logService: ILogService): Promise<string> {
	let sqmId = stateService.getItem<string>(sqmIdKey);
	if (typeof sqmId !== 'string') {
		sqmId = await getSqmMachineId(logService.error.bind(logService));
	}

	return sqmId;
}

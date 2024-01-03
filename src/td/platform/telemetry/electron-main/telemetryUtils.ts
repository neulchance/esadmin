/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {ILogService} from 'td/platform/log/common/log';
import {IStateService} from 'td/platform/state/node/state';
import {machineIdKey, sqmIdKey} from 'td/platform/telemetry/common/telemetry';
import {resolveMachineId as resolveNodeMachineId, resolveSqmId as resolveNodeSqmId} from 'td/platform/telemetry/node/telemetryUtils';

export async function resolveMachineId(stateService: IStateService, logService: ILogService): Promise<string> {
	// Call the node layers implementation to avoid code duplication
	const machineId = await resolveNodeMachineId(stateService, logService);
	stateService.setItem(machineIdKey, machineId);
	return machineId;
}

export async function resolveSqmId(stateService: IStateService, logService: ILogService): Promise<string> {
	const sqmId = await resolveNodeSqmId(stateService, logService);
	stateService.setItem(sqmIdKey, sqmId);
	return sqmId;
}

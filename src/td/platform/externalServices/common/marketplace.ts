/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IHeaders} from 'td/base/parts/request/common/request';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {IEnvironmentService} from 'td/platform/environment/common/environment';
import {getServiceMachineId} from 'td/platform/externalServices/common/serviceMachineId';
import {IFileService} from 'td/platform/files/common/files';
import {IProductService} from 'td/platform/product/common/productService';
import {IStorageService} from 'td/platform/storage/common/storage';
import {ITelemetryService, TelemetryLevel} from 'td/platform/telemetry/common/telemetry';
import {getTelemetryLevel, supportsTelemetry} from 'td/platform/telemetry/common/telemetryUtils';

export async function resolveMarketplaceHeaders(version: string,
	productService: IProductService,
	environmentService: IEnvironmentService,
	configurationService: IConfigurationService,
	fileService: IFileService,
	storageService: IStorageService | undefined,
	telemetryService: ITelemetryService): Promise<IHeaders> {

	const headers: IHeaders = {
		'X-Market-Client-Id': `VSCode ${version}`,
		'User-Agent': `VSCode ${version} (${productService.nameShort})`
	};

	if (supportsTelemetry(productService, environmentService) && getTelemetryLevel(configurationService) === TelemetryLevel.USAGE) {
		const serviceMachineId = await getServiceMachineId(environmentService, fileService, storageService);
		headers['X-Market-User-Id'] = serviceMachineId;
		// Send machineId as VSCode-SessionId so we can correlate telemetry events across different services
		// machineId can be undefined sometimes (eg: when launching from CLI), so send serviceMachineId instead otherwise
		// Marketplace will reject the request if there is no VSCode-SessionId header
		headers['VSCode-SessionId'] = telemetryService.machineId || serviceMachineId;
	}

	return headers;
}

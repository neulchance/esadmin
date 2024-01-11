/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {ILoggerService} from 'td/platform/log/common/log';
import {RequestService} from 'td/platform/request/browser/requestService';
import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {IRequestService} from 'td/platform/request/common/request';
import {INativeHostService} from 'td/platform/native/common/native';

export class NativeRequestService extends RequestService {

	constructor(
		@IConfigurationService configurationService: IConfigurationService,
		@ILoggerService loggerService: ILoggerService,
		@INativeHostService private nativeHostService: INativeHostService
	) {
		super(configurationService, loggerService);
	}

	override async resolveProxy(url: string): Promise<string | undefined> {
		return this.nativeHostService.resolveProxy(url);
	}

	override async loadCertificates(): Promise<string[]> {
		return this.nativeHostService.loadCertificates();
	}
}

registerSingleton(IRequestService, NativeRequestService, InstantiationType.Delayed);

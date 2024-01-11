/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {CancellationToken} from 'td/base/common/cancellation';
import {request} from 'td/base/parts/request/browser/request';
import {IRequestContext, IRequestOptions} from 'td/base/parts/request/common/request';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {ILoggerService} from 'td/platform/log/common/log';
import {AbstractRequestService, IRequestService} from 'td/platform/request/common/request';

/**
 * This service exposes the `request` API, while using the global
 * or configured proxy settings.
 */
export class RequestService extends AbstractRequestService implements IRequestService {

	declare readonly _serviceBrand: undefined;

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@ILoggerService loggerService: ILoggerService
	) {
		super(loggerService);
	}

	async request(options: IRequestOptions, token: CancellationToken): Promise<IRequestContext> {
		if (!options.proxyAuthorization) {
			options.proxyAuthorization = this.configurationService.getValue<string>('http.proxyAuthorization');
		}
		return this.logAndRequest('browser', options, () => request(options, token));
	}

	async resolveProxy(url: string): Promise<string | undefined> {
		return undefined; // not implemented in the web
	}

	async loadCertificates(): Promise<string[]> {
		return []; // not implemented in the web
	}
}

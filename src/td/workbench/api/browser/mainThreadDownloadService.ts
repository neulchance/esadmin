/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {Disposable} from 'td/base/common/lifecycle';
import {MainContext, MainThreadDownloadServiceShape} from 'td/workbench/api/common/extHost.protocol';
import {extHostNamedCustomer, IExtHostContext} from 'td/workbench/services/extensions/common/extHostCustomers';
import {IDownloadService} from 'td/platform/download/common/download';
import {UriComponents, URI} from 'td/base/common/uri';

@extHostNamedCustomer(MainContext.MainThreadDownloadService)
export class MainThreadDownloadService extends Disposable implements MainThreadDownloadServiceShape {

	constructor(
		extHostContext: IExtHostContext,
		@IDownloadService private readonly downloadService: IDownloadService
	) {
		super();
	}

	$download(uri: UriComponents, to: UriComponents): Promise<void> {
		return this.downloadService.download(URI.revive(uri), URI.revive(to));
	}

}

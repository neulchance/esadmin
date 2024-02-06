/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {extHostNamedCustomer, IExtHostContext} from 'td/workbench/services/extensions/common/extHostCustomers';
import {MainContext, MainThreadConsoleShape} from 'td/workbench/api/common/extHost.protocol';
import {IEnvironmentService} from 'td/platform/environment/common/environment';
import {IRemoteConsoleLog, log} from 'td/base/common/console';
import {logRemoteEntry, logRemoteEntryIfError} from 'td/workbench/services/extensions/common/remoteConsoleUtil';
import {parseExtensionDevOptions} from 'td/workbench/services/extensions/common/extensionDevOptions';
import {ILogService} from 'td/platform/log/common/log';

@extHostNamedCustomer(MainContext.MainThreadConsole)
export class MainThreadConsole implements MainThreadConsoleShape {

	private readonly _isExtensionDevTestFromCli: boolean;

	constructor(
		_extHostContext: IExtHostContext,
		@IEnvironmentService private readonly _environmentService: IEnvironmentService,
		@ILogService private readonly _logService: ILogService,
	) {
		const devOpts = parseExtensionDevOptions(this._environmentService);
		this._isExtensionDevTestFromCli = devOpts.isExtensionDevTestFromCli;
	}

	dispose(): void {
		//
	}

	$logExtensionHostMessage(entry: IRemoteConsoleLog): void {
		if (this._isExtensionDevTestFromCli) {
			// If running tests from cli, log to the log service everything
			logRemoteEntry(this._logService, entry);
		} else {
			// Log to the log service only errors and log everything to local console
			logRemoteEntryIfError(this._logService, entry, 'Extension Host');
			log(entry, 'Extension Host');
		}
	}
}

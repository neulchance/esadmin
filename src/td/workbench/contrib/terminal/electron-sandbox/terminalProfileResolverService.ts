/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {ErrorNoTelemetry} from 'td/base/common/errors';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {ITerminalLogService} from 'td/platform/terminal/common/terminal';
import {IWorkspaceContextService} from 'td/platform/workspace/common/workspace';
import {ITerminalInstanceService} from 'td/workbench/contrib/terminal/browser/terminal';
import {BaseTerminalProfileResolverService} from 'td/workbench/contrib/terminal/browser/terminalProfileResolverService';
import {ITerminalProfileService} from 'td/workbench/contrib/terminal/common/terminal';
import {IConfigurationResolverService} from 'td/workbench/services/configurationResolver/common/configurationResolver';
import {IHistoryService} from 'td/workbench/services/history/common/history';
import {IRemoteAgentService} from 'td/workbench/services/remote/common/remoteAgentService';

export class ElectronTerminalProfileResolverService extends BaseTerminalProfileResolverService {

	constructor(
		@IConfigurationResolverService configurationResolverService: IConfigurationResolverService,
		@IConfigurationService configurationService: IConfigurationService,
		@IHistoryService historyService: IHistoryService,
		@ITerminalLogService logService: ITerminalLogService,
		@IWorkspaceContextService workspaceContextService: IWorkspaceContextService,
		@ITerminalProfileService terminalProfileService: ITerminalProfileService,
		@IRemoteAgentService remoteAgentService: IRemoteAgentService,
		@ITerminalInstanceService terminalInstanceService: ITerminalInstanceService
	) {
		super(
			{
				getDefaultSystemShell: async (remoteAuthority, platform) => {
					const backend = await terminalInstanceService.getBackend(remoteAuthority);
					if (!backend) {
						throw new ErrorNoTelemetry(`Cannot get default system shell when there is no backend for remote authority '${remoteAuthority}'`);
					}
					return backend.getDefaultSystemShell(platform);
				},
				getEnvironment: async (remoteAuthority) => {
					const backend = await terminalInstanceService.getBackend(remoteAuthority);
					if (!backend) {
						throw new ErrorNoTelemetry(`Cannot get environment when there is no backend for remote authority '${remoteAuthority}'`);
					}
					return backend.getEnvironment();
				}
			},
			configurationService,
			configurationResolverService,
			historyService,
			logService,
			terminalProfileService,
			workspaceContextService,
			remoteAgentService
		);
	}
}

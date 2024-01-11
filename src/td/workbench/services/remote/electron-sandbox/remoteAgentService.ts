/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'td/nls';
import {IRemoteAgentService} from 'td/workbench/services/remote/common/remoteAgentService';
import {IRemoteAuthorityResolverService, RemoteConnectionType, RemoteAuthorityResolverError} from 'td/platform/remote/common/remoteAuthorityResolver';
import {IProductService} from 'td/platform/product/common/productService';
import {AbstractRemoteAgentService} from 'td/workbench/services/remote/common/abstractRemoteAgentService';
import {ISignService} from 'td/platform/sign/common/sign';
import {ILogService} from 'td/platform/log/common/log';
import {IWorkbenchEnvironmentService} from 'td/workbench/services/environment/common/environmentService';
import {INotificationService, IPromptChoice, Severity} from 'td/platform/notification/common/notification';
import {Registry} from 'td/platform/registry/common/platform';
import {IWorkbenchContribution, IWorkbenchContributionsRegistry, Extensions} from 'td/workbench/common/contributions';
import {LifecyclePhase} from 'td/workbench/services/lifecycle/common/lifecycle';
import {ITelemetryService} from 'td/platform/telemetry/common/telemetry';
import {INativeHostService} from 'td/platform/native/common/native';
import {URI} from 'td/base/common/uri';
import {IOpenerService} from 'td/platform/opener/common/opener';
import {IUserDataProfileService} from 'td/workbench/services/userDataProfile/common/userDataProfile';
import {IRemoteSocketFactoryService} from 'td/platform/remote/common/remoteSocketFactoryService';

export class RemoteAgentService extends AbstractRemoteAgentService implements IRemoteAgentService {
	constructor(
		@IRemoteSocketFactoryService remoteSocketFactoryService: IRemoteSocketFactoryService,
		@IUserDataProfileService userDataProfileService: IUserDataProfileService,
		@IWorkbenchEnvironmentService environmentService: IWorkbenchEnvironmentService,
		@IProductService productService: IProductService,
		@IRemoteAuthorityResolverService remoteAuthorityResolverService: IRemoteAuthorityResolverService,
		// @ISignService signService: ISignService,
		@ILogService logService: ILogService,
	) {
		super(remoteSocketFactoryService, userDataProfileService, environmentService, productService, remoteAuthorityResolverService, /* signService, */ logService);
	}
}

class RemoteConnectionFailureNotificationContribution implements IWorkbenchContribution {

	constructor(
		@IRemoteAgentService private readonly _remoteAgentService: IRemoteAgentService,
		@INotificationService notificationService: INotificationService,
		@IWorkbenchEnvironmentService environmentService: IWorkbenchEnvironmentService,
		@ITelemetryService telemetryService: ITelemetryService,
		@INativeHostService nativeHostService: INativeHostService,
		@IRemoteAuthorityResolverService private readonly _remoteAuthorityResolverService: IRemoteAuthorityResolverService,
		@IOpenerService openerService: IOpenerService,
	) {
		// Let's cover the case where connecting to fetch the remote extension info fails
		this._remoteAgentService.getRawEnvironment()
			.then(undefined, err => {

				if (!RemoteAuthorityResolverError.isHandled(err)) {
					const choices: IPromptChoice[] = [
						{
							label: nls.localize('devTools', "Open Developer Tools"),
							run: () => nativeHostService.openDevTools()
						}
					];
					const troubleshootingURL = this._getTroubleshootingURL();
					if (troubleshootingURL) {
						choices.push({
							label: nls.localize('directUrl', "Open in browser"),
							run: () => openerService.open(troubleshootingURL, {openExternal: true})
						});
					}
					notificationService.prompt(
						Severity.Error,
						nls.localize('connectionError', "Failed to connect to the remote extension host server (Error: {0})", err ? err.message : ''),
						choices
					);
				}
			});
	}

	private _getTroubleshootingURL(): URI | null {
		const remoteAgentConnection = this._remoteAgentService.getConnection();
		if (!remoteAgentConnection) {
			return null;
		}
		const connectionData = this._remoteAuthorityResolverService.getConnectionData(remoteAgentConnection.remoteAuthority);
		if (!connectionData || connectionData.connectTo.type !== RemoteConnectionType.WebSocket) {
			return null;
		}
		return URI.from({
			scheme: 'http',
			authority: `${connectionData.connectTo.host}:${connectionData.connectTo.port}`,
			path: `/version`
		});
	}

}

const workbenchRegistry = Registry.as<IWorkbenchContributionsRegistry>(Extensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(RemoteConnectionFailureNotificationContribution, LifecyclePhase.Ready);

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {localize} from 'td/nls';
import {Schemas} from 'td/base/common/network';
import {ExtensionInstallLocation, IExtensionManagementServer, IExtensionManagementServerService} from 'td/workbench/services/extensionManagement/common/extensionManagement';
import {IRemoteAgentService} from 'td/workbench/services/remote/common/remoteAgentService';
import {IChannel} from 'td/base/parts/ipc/common/ipc';
import {ISharedProcessService} from 'td/platform/ipc/electron-sandbox/services';
import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {NativeRemoteExtensionManagementService} from 'td/workbench/services/extensionManagement/electron-sandbox/remoteExtensionManagementService';
import {ILabelService} from 'td/platform/label/common/label';
import {IExtension} from 'td/platform/extensions/common/extensions';
import {IInstantiationService} from 'td/platform/instantiation/common/instantiation';
import {IUserDataProfileService} from 'td/workbench/services/userDataProfile/common/userDataProfile';
import {NativeExtensionManagementService} from 'td/workbench/services/extensionManagement/electron-sandbox/nativeExtensionManagementService';
import {Disposable} from 'td/base/common/lifecycle';
import {IUserDataProfilesService} from 'td/platform/userDataProfile/common/userDataProfile';

export class ExtensionManagementServerService extends Disposable implements IExtensionManagementServerService {

	declare readonly _serviceBrand: undefined;

	readonly localExtensionManagementServer: IExtensionManagementServer;
	readonly remoteExtensionManagementServer: IExtensionManagementServer | null = null;
	readonly webExtensionManagementServer: IExtensionManagementServer | null = null;

	constructor(
		@ISharedProcessService sharedProcessService: ISharedProcessService,
		@IRemoteAgentService remoteAgentService: IRemoteAgentService,
		@ILabelService labelService: ILabelService,
		@IUserDataProfilesService userDataProfilesService: IUserDataProfilesService,
		@IUserDataProfileService userDataProfileService: IUserDataProfileService,
		@IInstantiationService instantiationService: IInstantiationService,
	) {
		super();
		const localExtensionManagementService = this._register(instantiationService.createInstance(NativeExtensionManagementService, sharedProcessService.getChannel('extensions')));
		this.localExtensionManagementServer = {extensionManagementService: localExtensionManagementService, id: 'local', label: localize('local', "Local")};
		const remoteAgentConnection = remoteAgentService.getConnection();
		if (remoteAgentConnection) {
			const extensionManagementService = instantiationService.createInstance(NativeRemoteExtensionManagementService, remoteAgentConnection.getChannel<IChannel>('extensions'), this.localExtensionManagementServer);
			this.remoteExtensionManagementServer = {
				id: 'remote',
				extensionManagementService,
				get label() { return labelService.getHostLabel(Schemas.vscodeRemote, remoteAgentConnection!.remoteAuthority) || localize('remote', "Remote"); },
			};
		}

	}

	getExtensionManagementServer(extension: IExtension): IExtensionManagementServer {
		if (extension.location.scheme === Schemas.file) {
			return this.localExtensionManagementServer;
		}
		if (this.remoteExtensionManagementServer && extension.location.scheme === Schemas.vscodeRemote) {
			return this.remoteExtensionManagementServer;
		}
		throw new Error(`Invalid Extension ${extension.location}`);
	}

	getExtensionInstallLocation(extension: IExtension): ExtensionInstallLocation | null {
		const server = this.getExtensionManagementServer(extension);
		return server === this.remoteExtensionManagementServer ? ExtensionInstallLocation.Remote : ExtensionInstallLocation.Local;
	}
}

registerSingleton(IExtensionManagementServerService, ExtensionManagementServerService, InstantiationType.Delayed);

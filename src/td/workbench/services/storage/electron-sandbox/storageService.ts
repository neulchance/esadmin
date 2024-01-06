/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IEnvironmentService} from 'td/platform/environment/common/environment';
import {IMainProcessService} from 'td/platform/ipc/common/mainProcessService';
import {RemoteStorageService} from 'td/platform/storage/common/storageService';
import {IUserDataProfilesService} from 'td/platform/userDataProfile/common/userDataProfile';
import {IAnyWorkspaceIdentifier} from 'td/platform/workspace/common/workspace';
import {IUserDataProfileService} from 'td/workbench/services/userDataProfile/common/userDataProfile';

export class NativeWorkbenchStorageService extends RemoteStorageService {

	constructor(
		workspace: IAnyWorkspaceIdentifier | undefined,
		private readonly userDataProfileService: IUserDataProfileService,
		userDataProfilesService: IUserDataProfilesService,
		mainProcessService: IMainProcessService,
		environmentService: IEnvironmentService
	) {
		super(workspace, {currentProfile: userDataProfileService.currentProfile, defaultProfile: userDataProfilesService.defaultProfile}, mainProcessService, environmentService);

		this.registerListeners();
	}

	private registerListeners(): void {
		this._register(this.userDataProfileService.onDidChangeCurrentProfile(e => e.join(this.switchToProfile(e.profile))));
	}
}

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {Event} from 'td/base/common/event';
import {INativeEnvironmentService} from 'td/platform/environment/common/environment';
import {IFileService} from 'td/platform/files/common/files';
import {refineServiceDecorator} from 'td/platform/instantiation/common/instantiation';
import {ILogService} from 'td/platform/log/common/log';
import {IUriIdentityService} from 'td/platform/uriIdentity/common/uriIdentity';
import {IUserDataProfilesService, WillCreateProfileEvent, WillRemoveProfileEvent, IUserDataProfile} from 'td/platform/userDataProfile/common/userDataProfile';
import {UserDataProfilesService} from 'td/platform/userDataProfile/node/userDataProfile';
import {IAnyWorkspaceIdentifier, IEmptyWorkspaceIdentifier} from 'td/platform/workspace/common/workspace';
import {IStateService} from 'td/platform/state/node/state';

export const IUserDataProfilesMainService = refineServiceDecorator<IUserDataProfilesService, IUserDataProfilesMainService>(IUserDataProfilesService);
export interface IUserDataProfilesMainService extends IUserDataProfilesService {
	getProfileForWorkspace(workspaceIdentifier: IAnyWorkspaceIdentifier): IUserDataProfile | undefined;
	unsetWorkspace(workspaceIdentifier: IAnyWorkspaceIdentifier, transient?: boolean): void;
	getAssociatedEmptyWindows(): IEmptyWorkspaceIdentifier[];
	readonly onWillCreateProfile: Event<WillCreateProfileEvent>;
	readonly onWillRemoveProfile: Event<WillRemoveProfileEvent>;
}

export class UserDataProfilesMainService extends UserDataProfilesService implements IUserDataProfilesMainService {

	constructor(
		@IStateService stateService: IStateService,
		@IUriIdentityService uriIdentityService: IUriIdentityService,
		@INativeEnvironmentService environmentService: INativeEnvironmentService,
		@IFileService fileService: IFileService,
		@ILogService logService: ILogService,
	) {
		super(stateService, uriIdentityService, environmentService, fileService, logService);
	}

	getAssociatedEmptyWindows(): IEmptyWorkspaceIdentifier[] {
		const emptyWindows: IEmptyWorkspaceIdentifier[] = [];
		for (const id of this.profilesObject.emptyWindows.keys()) {
			emptyWindows.push({id});
		}
		return emptyWindows;
	}

}

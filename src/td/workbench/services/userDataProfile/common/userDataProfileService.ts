/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {Promises} from 'td/base/common/async';
import {Emitter} from 'td/base/common/event';
import {Disposable} from 'td/base/common/lifecycle';
import {equals} from 'td/base/common/objects';
import {ThemeIcon} from 'td/base/common/themables';
import {IUserDataProfile} from 'td/platform/userDataProfile/common/userDataProfile';
import {defaultUserDataProfileIcon, DidChangeUserDataProfileEvent, IUserDataProfileService} from 'td/workbench/services/userDataProfile/common/userDataProfile';

export class UserDataProfileService extends Disposable implements IUserDataProfileService {

	readonly _serviceBrand: undefined;

	private readonly _onDidChangeCurrentProfile = this._register(new Emitter<DidChangeUserDataProfileEvent>());
	readonly onDidChangeCurrentProfile = this._onDidChangeCurrentProfile.event;

	private _currentProfile: IUserDataProfile;
	get currentProfile(): IUserDataProfile { return this._currentProfile; }

	constructor(
		currentProfile: IUserDataProfile
	) {
		super();
		this._currentProfile = currentProfile;
	}

	async updateCurrentProfile(userDataProfile: IUserDataProfile): Promise<void> {
		if (equals(this._currentProfile, userDataProfile)) {
			return;
		}
		const previous = this._currentProfile;
		this._currentProfile = userDataProfile;
		const joiners: Promise<void>[] = [];
		this._onDidChangeCurrentProfile.fire({
			previous,
			profile: userDataProfile,
			join(promise) {
				joiners.push(promise);
			}
		});
		await Promises.settled(joiners);
	}

	getShortName(profile: IUserDataProfile): string {
		if (!profile.isDefault && profile.shortName && ThemeIcon.fromId(profile.shortName)) {
			return profile.shortName;
		}
		return `$(${defaultUserDataProfileIcon.id})`;
	}

}

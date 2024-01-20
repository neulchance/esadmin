/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IUserDataAutoSyncService, UserDataSyncError} from 'td/platform/userDataSync/common/userDataSync';
import {ISharedProcessService} from 'td/platform/ipc/electron-sandbox/services';
import {IChannel} from 'td/base/parts/ipc/common/ipc';
import {Event} from 'td/base/common/event';
import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';

class UserDataAutoSyncService implements IUserDataAutoSyncService {

	declare readonly _serviceBrand: undefined;

	private readonly channel: IChannel;
	get onError(): Event<UserDataSyncError> { return Event.map(this.channel.listen<Error>('onError'), e => UserDataSyncError.toUserDataSyncError(e)); }

	constructor(
		@ISharedProcessService sharedProcessService: ISharedProcessService,
	) {
		this.channel = sharedProcessService.getChannel('userDataAutoSync');
	}

	triggerSync(sources: string[], hasToLimitSync: boolean, disableCache: boolean): Promise<void> {
		return this.channel.call('triggerSync', [sources, hasToLimitSync, disableCache]);
	}

	turnOn(): Promise<void> {
		return this.channel.call('turnOn');
	}

	turnOff(everywhere: boolean): Promise<void> {
		return this.channel.call('turnOff', [everywhere]);
	}

}

registerSingleton(IUserDataAutoSyncService, UserDataAutoSyncService, InstantiationType.Delayed);

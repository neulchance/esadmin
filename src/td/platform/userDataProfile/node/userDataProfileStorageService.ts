/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IStorageService} from 'td/platform/storage/common/storage';
import {ILogService} from 'td/platform/log/common/log';
import {IUserDataProfilesService} from 'td/platform/userDataProfile/common/userDataProfile';
import {IMainProcessService} from 'td/platform/ipc/common/mainProcessService';
import {RemoteUserDataProfileStorageService} from 'td/platform/userDataProfile/common/userDataProfileStorageService';

export class NativeUserDataProfileStorageService extends RemoteUserDataProfileStorageService {

	constructor(
		@IMainProcessService mainProcessService: IMainProcessService,
		@IUserDataProfilesService userDataProfilesService: IUserDataProfilesService,
		@IStorageService storageService: IStorageService,
		@ILogService logService: ILogService,
	) {
		super(mainProcessService, userDataProfilesService, storageService, logService);
	}
}

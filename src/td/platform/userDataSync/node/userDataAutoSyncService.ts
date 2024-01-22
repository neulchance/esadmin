/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
//
import {Event} from 'td/base/common/event';
import {INativeHostService} from 'td/platform/native/common/native';
import {IProductService} from 'td/platform/product/common/productService';
import {IStorageService} from 'td/platform/storage/common/storage';
import {ITelemetryService} from 'td/platform/telemetry/common/telemetry';
import {UserDataAutoSyncService as BaseUserDataAutoSyncService} from 'td/platform/userDataSync/common/userDataAutoSyncService';
import {IUserDataSyncEnablementService, IUserDataSyncLogService, IUserDataSyncService, IUserDataSyncStoreManagementService, IUserDataSyncStoreService} from 'td/platform/userDataSync/common/userDataSync';
import {IUserDataSyncAccountService} from 'td/platform/userDataSync/common/userDataSyncAccount';
import {IUserDataSyncMachinesService} from 'td/platform/userDataSync/common/userDataSyncMachines';

export class UserDataAutoSyncService extends BaseUserDataAutoSyncService {

	constructor(
		@IProductService productService: IProductService,
		@IUserDataSyncStoreManagementService userDataSyncStoreManagementService: IUserDataSyncStoreManagementService,
		@IUserDataSyncStoreService userDataSyncStoreService: IUserDataSyncStoreService,
		@IUserDataSyncEnablementService userDataSyncEnablementService: IUserDataSyncEnablementService,
		@IUserDataSyncService userDataSyncService: IUserDataSyncService,
		@INativeHostService nativeHostService: INativeHostService,
		@IUserDataSyncLogService logService: IUserDataSyncLogService,
		@IUserDataSyncAccountService authTokenService: IUserDataSyncAccountService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IUserDataSyncMachinesService userDataSyncMachinesService: IUserDataSyncMachinesService,
		@IStorageService storageService: IStorageService,
	) {
		super(productService, userDataSyncStoreManagementService, userDataSyncStoreService, userDataSyncEnablementService, userDataSyncService, logService, authTokenService, telemetryService, userDataSyncMachinesService, storageService);

		this._register(Event.debounce<string, string[]>(Event.any<string>(
			Event.map(nativeHostService.onDidFocusMainWindow, () => 'windowFocus'),
			Event.map(nativeHostService.onDidOpenMainWindow, () => 'windowOpen'),
		), (last, source) => last ? [...last, source] : [source], 1000)(sources => this.triggerSync(sources, true, false)));
	}

}
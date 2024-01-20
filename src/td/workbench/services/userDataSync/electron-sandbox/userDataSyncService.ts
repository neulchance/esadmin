/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IUserDataSyncResourceProviderService, IUserDataSyncService, IUserDataSyncStoreManagementService} from 'td/platform/userDataSync/common/userDataSync';
import {registerSharedProcessRemoteService} from 'td/platform/ipc/electron-sandbox/services';
import {UserDataSyncServiceChannelClient} from 'td/platform/userDataSync/common/userDataSyncServiceIpc';
import {IUserDataSyncMachinesService} from 'td/platform/userDataSync/common/userDataSyncMachines';
import {UserDataSyncAccountServiceChannelClient, UserDataSyncStoreManagementServiceChannelClient} from 'td/platform/userDataSync/common/userDataSyncIpc';
import {IUserDataSyncAccountService} from 'td/platform/userDataSync/common/userDataSyncAccount';

registerSharedProcessRemoteService(IUserDataSyncService, 'userDataSync', {channelClientCtor: UserDataSyncServiceChannelClient});
registerSharedProcessRemoteService(IUserDataSyncResourceProviderService, 'IUserDataSyncResourceProviderService');
registerSharedProcessRemoteService(IUserDataSyncMachinesService, 'userDataSyncMachines');
registerSharedProcessRemoteService(IUserDataSyncAccountService, 'userDataSyncAccount', {channelClientCtor: UserDataSyncAccountServiceChannelClient});
registerSharedProcessRemoteService(IUserDataSyncStoreManagementService, 'userDataSyncStoreManagement', {channelClientCtor: UserDataSyncStoreManagementServiceChannelClient});

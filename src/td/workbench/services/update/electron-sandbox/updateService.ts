/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IUpdateService} from 'td/platform/update/common/update';
import {registerMainProcessRemoteService} from 'td/platform/ipc/electron-sandbox/services';
import {UpdateChannelClient} from 'td/platform/update/common/updateIpc';

registerMainProcessRemoteService(IUpdateService, 'update', {channelClientCtor: UpdateChannelClient});

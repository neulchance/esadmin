/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IExtensionHostDebugService} from 'td/platform/debug/common/extensionHostDebug';
import {registerMainProcessRemoteService} from 'td/platform/ipc/electron-sandbox/services';
import {ExtensionHostDebugChannelClient, ExtensionHostDebugBroadcastChannel} from 'td/platform/debug/common/extensionHostDebugIpc';

registerMainProcessRemoteService(IExtensionHostDebugService, ExtensionHostDebugBroadcastChannel.ChannelName, {channelClientCtor: ExtensionHostDebugChannelClient});

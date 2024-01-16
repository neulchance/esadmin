/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IMenubarService} from 'td/platform/menubar/electron-sandbox/menubar';
import {registerMainProcessRemoteService} from 'td/platform/ipc/electron-sandbox/services';

registerMainProcessRemoteService(IMenubarService, 'menubar');

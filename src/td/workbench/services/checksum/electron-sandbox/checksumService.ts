/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IChecksumService} from 'td/platform/checksum/common/checksumService';
import {registerSharedProcessRemoteService} from 'td/platform/ipc/electron-sandbox/services';

registerSharedProcessRemoteService(IChecksumService, 'checksum');

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {registerMainProcessRemoteService} from 'td/platform/ipc/electron-sandbox/services';
import {IEncryptionService} from 'td/platform/encryption/common/encryptionService';

registerMainProcessRemoteService(IEncryptionService, 'encryption');

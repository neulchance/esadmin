/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IDiagnosticsService} from 'td/platform/diagnostics/common/diagnostics';
import {registerSharedProcessRemoteService} from 'td/platform/ipc/electron-sandbox/services';

registerSharedProcessRemoteService(IDiagnosticsService, 'diagnostics');

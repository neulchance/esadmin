/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {registerAction2} from 'td/platform/actions/common/actions';
import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {IWebviewService} from 'td/workbench/contrib/webview/browser/webview';
import * as webviewCommands from 'td/workbench/contrib/webview/electron-sandbox/webviewCommands';
import {ElectronWebviewService} from 'td/workbench/contrib/webview/electron-sandbox/webviewService';

registerSingleton(IWebviewService, ElectronWebviewService, InstantiationType.Delayed);

registerAction2(webviewCommands.OpenWebviewDeveloperToolsAction);

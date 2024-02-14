/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {IWebviewViewService, WebviewViewService} from 'td/workbench/contrib/webviewView/browser/webviewViewService';

registerSingleton(IWebviewViewService, WebviewViewService, InstantiationType.Delayed);

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {NativeTitleService} from 'td/workbench/electron-sandbox/parts/titlebar/titlebarPart';
import {ITitleService} from 'td/workbench/services/title/browser/titleService';

registerSingleton(ITitleService, NativeTitleService, InstantiationType.Eager);

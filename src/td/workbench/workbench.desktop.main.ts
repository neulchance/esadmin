/*----------------------------------------------------------------------------------------------------
 *  Copyright (c) TinyDeskDev. All rights reserved.
 *  Licensed under the UNLICENSED License. See License.txt in the project root for license information.
 *---------------------------------------------------------------------------------------------------*/

//#region --- workbench common

import 'td/workbench/workbench.common.main';

//#endregion


//#region --- workbench (desktop main)

import 'td/workbench/electron-sandbox/desktop.main';

//#endregion


//#region --- workbench services

import 'td/workbench/services/lifecycle/electron-sandbox/lifecycleService';
import 'td/workbench/services/host/electron-sandbox/nativeHostService';
import 'td/workbench/services/themes/electron-sandbox/nativeHostColorSchemeService';
import 'td/platform/extensionResourceLoader/common/extensionResourceLoaderService';
import 'td/workbench/services/telemetry/electron-sandbox/telemetryService';
import 'td/workbench/services/extensions/electron-sandbox/nativeExtensionService';

import {registerSingleton} from 'td/platform/instantiation/common/extensions';
import {IUserDataInitializationService, UserDataInitializationService} from 'td/workbench/services/userData/browser/userDataInit';
import {SyncDescriptor} from 'td/platform/instantiation/common/descriptors';

registerSingleton(IUserDataInitializationService, new SyncDescriptor(UserDataInitializationService, [[]], true));

//#endregion

export {main} from 'td/workbench/electron-sandbox/desktop.main';
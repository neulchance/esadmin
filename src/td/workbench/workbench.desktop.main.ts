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
// 
import 'td/workbench/services/extensions/electron-sandbox/nativeExtensionService';
import 'td/workbench/services/contextmenu/electron-sandbox/contextmenuService';
import 'td/workbench/services/extensionManagement/electron-sandbox/extensionManagementService';
import 'td/workbench/services/path/electron-sandbox/pathService';
import 'td/platform/remote/electron-sandbox/sharedProcessTunnelService';
import 'td/workbench/services/tunnel/electron-sandbox/tunnelService';
import 'td/workbench/services/request/electron-sandbox/requestService';

import {registerSingleton} from 'td/platform/instantiation/common/extensions';
import {IUserDataInitializationService, UserDataInitializationService} from 'td/workbench/services/userData/browser/userDataInit';
import {SyncDescriptor} from 'td/platform/instantiation/common/descriptors';

registerSingleton(IUserDataInitializationService, new SyncDescriptor(UserDataInitializationService, [[]], true));

//#endregion


//#region --- workbench contributions

// Extensions Management
import 'td/workbench/contrib/extensions/electron-sandbox/extensions.contribution';

//#endregion

export {main} from 'td/workbench/electron-sandbox/desktop.main';
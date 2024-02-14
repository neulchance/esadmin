/*----------------------------------------------------------------------------------------------------
 *  Copyright (c) TinyDeskDev. All rights reserved.
 *  Licensed under the UNLICENSED License. See License.txt in the project root for license information.
 *---------------------------------------------------------------------------------------------------*/


// #######################################################################
// ###                                                                 ###
// ### !!! PLEASE ADD COMMON IMPORTS INTO WORKBENCH.COMMON.MAIN.TS !!! ###
// ###                                                                 ###
// #######################################################################

//#region --- workbench common

import 'td/workbench/workbench.common.main';

//#endregion


//#region --- workbench (desktop main)

import 'td/workbench/electron-sandbox/desktop.main';
import 'td/workbench/electron-sandbox/desktop.contribution';

//#endregion


//#region --- workbench services

import 'td/workbench/services/textfile/electron-sandbox/nativeTextFileService';
import 'td/workbench/services/dialogs/electron-sandbox/fileDialogService';
import 'td/workbench/services/workspaces/electron-sandbox/workspacesService';
import 'td/workbench/services/menubar/electron-sandbox/menubarService';
import 'td/workbench/services/url/electron-sandbox/urlService';
import 'td/workbench/services/encryption/electron-sandbox/encryptionService';
import 'td/workbench/services/secrets/electron-sandbox/secretStorageService';
import 'td/workbench/services/lifecycle/electron-sandbox/lifecycleService';
import 'td/workbench/services/host/electron-sandbox/nativeHostService';
import 'td/workbench/services/update/electron-sandbox/updateService';
import 'td/workbench/services/themes/electron-sandbox/nativeHostColorSchemeService';
import 'td/platform/extensionResourceLoader/common/extensionResourceLoaderService';
import 'td/workbench/services/telemetry/electron-sandbox/telemetryService';
import 'td/workbench/services/configurationResolver/electron-sandbox/configurationResolverService';
import 'td/workbench/services/title/electron-sandbox/titleService';
import 'td/workbench/services/extensions/electron-sandbox/extensionHostStarter';
import 'td/workbench/services/extensions/electron-sandbox/nativeExtensionService';
import 'td/workbench/services/localization/electron-sandbox/languagePackService';
import 'td/workbench/services/contextmenu/electron-sandbox/contextmenuService';
import 'td/workbench/services/workspaces/electron-sandbox/workspaceEditingService';
import 'td/workbench/services/workingCopy/electron-sandbox/workingCopyBackupService';
import 'td/workbench/services/integrity/electron-sandbox/integrityService';
import 'td/workbench/services/checksum/electron-sandbox/checksumService';
import 'td/workbench/services/history/browser/historyService';
import 'td/workbench/services/userDataSync/electron-sandbox/userDataSyncService';
import 'td/workbench/services/userDataSync/electron-sandbox/userDataAutoSyncService';
import 'td/workbench/services/extensionManagement/electron-sandbox/extensionManagementService';
import 'td/workbench/services/extensionManagement/electron-sandbox/extensionTipsService';
import 'td/workbench/services/path/electron-sandbox/pathService';
import 'td/platform/remote/electron-sandbox/sharedProcessTunnelService';
import 'td/workbench/services/tunnel/electron-sandbox/tunnelService';
import 'td/platform/diagnostics/electron-sandbox/diagnosticsService';
import 'td/workbench/services/request/electron-sandbox/requestService';
import 'td/workbench/services/extensions/electron-sandbox/extensionsScannerService';
import 'td/workbench/services/extensionManagement/electron-sandbox/extensionManagementServerService';
import 'td/workbench/services/accessibility/electron-sandbox/accessibilityService';
import 'td/workbench/services/keybinding/electron-sandbox/nativeKeyboardLayout';
import 'td/workbench/services/userDataSync/browser/userDataSyncEnablementService';
import 'td/workbench/services/files/electron-sandbox/elevatedFileService';
import 'td/workbench/services/localization/electron-sandbox/localeService'

import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {IUserDataInitializationService, UserDataInitializationService} from 'td/workbench/services/userData/browser/userDataInit';
import {IExtensionsProfileScannerService} from 'td/platform/extensionManagement/common/extensionsProfileScannerService';
import {ExtensionsProfileScannerService} from 'td/platform/extensionManagement/electron-sandbox/extensionsProfileScannerService';
import {SyncDescriptor} from 'td/platform/instantiation/common/descriptors';

registerSingleton(IUserDataInitializationService, new SyncDescriptor(UserDataInitializationService, [[]], true));
registerSingleton(IExtensionsProfileScannerService, ExtensionsProfileScannerService, InstantiationType.Delayed);

//#endregion


//#region --- workbench contributions

// Extensions Management
import 'td/workbench/contrib/extensions/electron-sandbox/extensions.contribution';

// Debug
import 'td/workbench/contrib/debug/electron-sandbox/extensionHostDebugService';

// Terminal
import 'td/workbench/contrib/terminal/electron-sandbox/terminal.contribution';

// Webview
import 'td/workbench/contrib/webview/electron-sandbox/webview.contribution';

//#endregion

export {main} from 'td/workbench/electron-sandbox/desktop.main';
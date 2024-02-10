/*----------------------------------------------------------------------------------------------------
 *  Copyright (c) TinyDeskDev. All rights reserved.
 *  Licensed under the UNLICENSED License. See License.txt in the project root for license information.
 *---------------------------------------------------------------------------------------------------*/

//#region --- editor/workbench core

// import 'td/editor/editor.all';

import 'td/workbench/api/browser/extensionHost.contribution';
import 'td/workbench/browser/workbench.contribution';

//#endregion

//#region --- workbench actions

import 'td/workbench/browser/actions/listCommands';
import 'td/workbench/browser/actions/workspaceActions';
import 'td/workbench/browser/actions/quickAccessActions';

//#endregion


//#region --- workbench parts

import 'td/workbench/browser/parts/editor/editor.contribution';
import 'td/workbench/browser/parts/editor/editorParts';
import 'td/workbench/browser/parts/paneCompositePartService';
import 'td/workbench/browser/parts/banner/bannerPart';
import 'td/workbench/browser/parts/statusbar/statusbarPart';

//#endregion


//#region --- workbench services

import 'td/platform/actions/common/actions.contribution';
import 'td/platform/undoRedo/common/undoRedoService';
import 'td/workbench/services/dialogs/common/dialogService';
import 'td/workbench/services/progress/browser/progressService';
import 'td/workbench/services/decorations/browser/decorationsService';
import 'td/workbench/services/themes/browser/workbenchThemeService';
import 'td/workbench/services/notification/common/notificationService';
import 'td/workbench/services/remote/common/remoteExtensionsScanner';
import 'td/workbench/services/editor/browser/codeEditorService';
import 'td/workbench/services/preferences/browser/preferencesService';
import 'td/workbench/services/clipboard/electron-sandbox/clipboardService';
import 'td/workbench/services/configuration/common/jsonEditingService';
import 'td/workbench/services/textmodelResolver/common/textModelResolverService';
import 'td/workbench/services/extensions/common/extensionManifestPropertiesService';
import 'td/workbench/services/extensionManagement/browser/extensionEnablementService';
import 'td/workbench/services/extensionManagement/browser/builtinExtensionsScannerService';
import 'td/workbench/services/extensionRecommendations/common/extensionIgnoredRecommendationsService';
import 'td/workbench/services/extensionRecommendations/common/workspaceExtensionsConfig';
import 'td/workbench/services/extensionManagement/common/extensionFeaturesManagemetService';
import 'td/workbench/services/label/common/labelService';
import 'td/workbench/services/commands/common/commandService';
import 'td/workbench/services/filesConfiguration/common/filesConfigurationService';
import 'td/workbench/services/views/browser/viewDescriptorService';
import 'td/workbench/services/views/browser/viewsService';
import 'td/editor/browser/services/hoverService';
import 'td/editor/common/services/languageFeaturesService';
import 'td/workbench/services/keybinding/browser/keybindingService';
import 'td/workbench/services/editor/browser/editorService';
import 'td/workbench/services/editor/browser/editorResolverService';
import 'td/workbench/services/untitled/common/untitledTextEditorService';
import 'td/workbench/services/textfile/common/textEditorService';
import 'td/workbench/services/textresourceProperties/common/textResourcePropertiesService';
import 'td/workbench/services/language/common/languageService';
import 'td/workbench/services/model/common/modelService';
import 'td/workbench/services/quickinput/browser/quickInputService';
import 'td/workbench/services/userDataSync/browser/userDataSyncWorkbenchService';
import 'td/workbench/services/activity/browser/activityService';
import 'td/workbench/services/timer/electron-sandbox/timerService';

import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {ExtensionGalleryService} from 'td/platform/extensionManagement/common/extensionGalleryService';
import {IExtensionGalleryService, IGlobalExtensionEnablementService} from 'td/platform/extensionManagement/common/extensionManagement';
import {GlobalExtensionEnablementService} from 'td/platform/extensionManagement/common/extensionEnablementService';
import {ContextViewService} from 'td/platform/contextview/browser/contextViewService';
import {IContextViewService} from 'td/platform/contextview/browser/contextView';
import {IMarkerService} from 'td/platform/markers/common/markers';
import {MarkerService} from 'td/platform/markers/common/markerService';
import {ContextKeyService} from 'td/platform/contextkey/browser/contextKeyService';
import {IContextKeyService} from 'td/platform/contextkey/common/contextkey';
import {ITextResourceConfigurationService} from 'td/editor/common/services/textResourceConfiguration';
import {TextResourceConfigurationService} from 'td/editor/common/services/textResourceConfigurationService';
import {IOpenerService} from 'td/platform/opener/common/opener';
import {OpenerService} from 'td/editor/browser/services/openerService';
import {ExtensionStorageService, IExtensionStorageService} from 'td/platform/extensionManagement/common/extensionStorage';
import {IIgnoredExtensionsManagementService, IgnoredExtensionsManagementService} from 'td/platform/userDataSync/common/ignoredExtensions';
import {IUserDataSyncLogService} from 'td/platform/userDataSync/common/userDataSync';
import {UserDataSyncLogService} from 'td/platform/userDataSync/common/userDataSyncLog';
import {IDownloadService} from 'td/platform/download/common/download';
import {DownloadService} from 'td/platform/download/common/downloadService';
import {IEditorWorkerService} from 'td/editor/common/services/editorWorker';
import {EditorWorkerService} from 'td/editor/browser/services/editorWorkerService';
import {IListService, ListService} from 'td/platform/list/browser/listService';

registerSingleton(IExtensionGalleryService, ExtensionGalleryService, InstantiationType.Delayed);
registerSingleton(IUserDataSyncLogService, UserDataSyncLogService, InstantiationType.Delayed);
registerSingleton(IGlobalExtensionEnablementService, GlobalExtensionEnablementService, InstantiationType.Delayed);
registerSingleton(IIgnoredExtensionsManagementService, IgnoredExtensionsManagementService, InstantiationType.Delayed);
registerSingleton(IContextViewService, ContextViewService, InstantiationType.Delayed);
registerSingleton(IListService, ListService, InstantiationType.Delayed);
registerSingleton(IMarkerService, MarkerService, InstantiationType.Delayed);
registerSingleton(IExtensionStorageService, ExtensionStorageService, InstantiationType.Delayed);
registerSingleton(IEditorWorkerService, EditorWorkerService, InstantiationType.Eager /* registers link detection and word based suggestions for any document */);
registerSingleton(IContextKeyService, ContextKeyService, InstantiationType.Delayed);
registerSingleton(ITextResourceConfigurationService, TextResourceConfigurationService, InstantiationType.Delayed);
registerSingleton(IOpenerService, OpenerService, InstantiationType.Delayed);
registerSingleton(IDownloadService, DownloadService, InstantiationType.Delayed);

//#endregion


//#region --- workbench contributions

// Explorer
import 'td/workbench/contrib/files/browser/explorerViewlet';
import 'td/workbench/contrib/files/browser/fileActions.contribution';
import 'td/workbench/contrib/files/browser/files.contribution';/* this help to working the EditorFactoryRegistry.getFileEditorFactory */

// Extensions Management
import 'td/workbench/contrib/extensions/browser/extensions.contribution';
import 'td/workbench/contrib/extensions/browser/extensionsViewlet';

// Themes
import 'td/workbench/contrib/themes/browser/themes.contribution';

// User Data Sync
import 'td/workbench/contrib/userDataSync/browser/userDataSync.contribution';

// Output View
// import 'td/workbench/contrib/output/common/outputChannelModelService';
import 'td/workbench/contrib/output/browser/output.contribution';

// import 'td/workbench/contrib/output/browser/outputView';

// Bulk Edit
// import 'td/workbench/contrib/bulkEdit/browser/bulkEditService';

// Terminal
import 'td/workbench/contrib/terminal/terminal.all';

// Quickaccess
import 'td/workbench/contrib/quickaccess/browser/quickAccess.contribution';

// Audio Cues
import 'td/workbench/contrib/audioCues/browser/audioCues.contribution';


//#endregion

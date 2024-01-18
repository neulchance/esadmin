/*----------------------------------------------------------------------------------------------------
 *  Copyright (c) TinyDeskDev. All rights reserved.
 *  Licensed under the UNLICENSED License. See License.txt in the project root for license information.
 *---------------------------------------------------------------------------------------------------*/

//#region --- editor/workbench core

import 'td/workbench/browser/workbench.contribution';

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
import 'td/workbench/services/configuration/common/jsonEditingService';
import 'td/workbench/services/textmodelResolver/common/textModelResolverService';
import 'td/workbench/services/extensionManagement/browser/extensionEnablementService';
import 'td/workbench/services/label/common/labelService';
import 'td/workbench/services/commands/common/commandService';
import 'td/workbench/services/filesConfiguration/common/filesConfigurationService';
import 'td/workbench/services/views/browser/viewDescriptorService';
import 'td/workbench/services/views/browser/viewsService';
import 'td/editor/browser/services/hoverService';
import 'td/workbench/services/keybinding/browser/keybindingService';
import 'td/workbench/services/editor/browser/editorService';
import 'td/workbench/services/editor/browser/editorResolverService';
import 'td/workbench/services/untitled/common/untitledTextEditorService';
import 'td/workbench/services/textfile/common/textEditorService';
import 'td/workbench/services/textresourceProperties/common/textResourcePropertiesService';
import 'td/workbench/services/language/common/languageService';
import 'td/workbench/services/model/common/modelService';
import 'td/workbench/services/quickinput/browser/quickInputService';
import 'td/workbench/services/activity/browser/activityService';


import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
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

registerSingleton(IContextViewService, ContextViewService, InstantiationType.Delayed);
registerSingleton(IMarkerService, MarkerService, InstantiationType.Delayed);
registerSingleton(IContextKeyService, ContextKeyService, InstantiationType.Delayed);
registerSingleton(ITextResourceConfigurationService, TextResourceConfigurationService, InstantiationType.Delayed);
registerSingleton(IOpenerService, OpenerService, InstantiationType.Delayed);

//#endregion


//#region --- workbench contributions

// Explorer
import 'td/workbench/contrib/files/browser/explorerViewlet';
import 'td/workbench/contrib/files/browser/fileActions.contribution';
import 'td/workbench/contrib/files/browser/files.contribution';/* this help to working the EditorFactoryRegistry.getFileEditorFactory */

//#endregion

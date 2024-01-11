/*----------------------------------------------------------------------------------------------------
 *  Copyright (c) TinyDeskDev. All rights reserved.
 *  Licensed under the UNLICENSED License. See License.txt in the project root for license information.
 *---------------------------------------------------------------------------------------------------*/

//#region --- workbench parts

// import 'td/workbench/browser/parts/editor/editor.contribution';
// import 'td/workbench/browser/parts/editor/editorParts';
// import 'td/workbench/browser/parts/paneCompositePartService';
// import 'td/workbench/browser/parts/banner/bannerPart';
import 'td/workbench/browser/parts/statusbar/statusbarPart';
// import 'td/workbench/browser/parts/views/viewsService';

//#endregion


//#region --- workbench services

import 'td/platform/actions/common/actions.contribution';
import 'td/workbench/services/dialogs/common/dialogService';
import 'td/workbench/services/themes/browser/workbenchThemeService';
import 'td/workbench/services/notification/common/notificationService';
import 'td/workbench/services/remote/common/remoteExtensionsScanner';
import 'td/workbench/services/extensionManagement/browser/extensionEnablementService';
import 'td/workbench/services/label/common/labelService';

import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {ContextViewService} from 'td/platform/contextview/browser/contextViewService';
import {IContextViewService} from 'td/platform/contextview/browser/contextView';
import {ContextKeyService} from 'td/platform/contextkey/browser/contextKeyService';
import {IContextKeyService} from 'td/platform/contextkey/common/contextkey';

registerSingleton(IContextViewService, ContextViewService, InstantiationType.Delayed);
registerSingleton(IContextKeyService, ContextKeyService, InstantiationType.Delayed);

//#endregion

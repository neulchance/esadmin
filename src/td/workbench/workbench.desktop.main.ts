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
// import 'td/workbench/services/host/electron-sandbox/nativeHostService';

//#endregion

export {main} from 'td/workbench/electron-sandbox/desktop.main';
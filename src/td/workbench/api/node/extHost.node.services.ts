/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {ExtHostTerminalService} from 'td/workbench/api/node/extHostTerminalService';
import {ExtHostTask} from 'td/workbench/api/node/extHostTask';
import {ExtHostDebugService} from 'td/workbench/api/node/extHostDebugService';
import {NativeExtHostSearch} from 'td/workbench/api/node/extHostSearch';
import {ExtHostExtensionService} from 'td/workbench/api/node/extHostExtensionService';
import {NodeExtHostTunnelService} from 'td/workbench/api/node/extHostTunnelService';
import {IExtHostDebugService} from 'td/workbench/api/common/extHostDebugService';
import {IExtHostExtensionService} from 'td/workbench/api/common/extHostExtensionService';
import {IExtHostSearch} from 'td/workbench/api/common/extHostSearch';
import {IExtHostTask} from 'td/workbench/api/common/extHostTask';
import {IExtHostTerminalService} from 'td/workbench/api/common/extHostTerminalService';
import {IExtHostTunnelService} from 'td/workbench/api/common/extHostTunnelService';
import {IExtensionStoragePaths} from 'td/workbench/api/common/extHostStoragePaths';
import {ExtensionStoragePaths} from 'td/workbench/api/node/extHostStoragePaths';
import {ExtHostLoggerService} from 'td/workbench/api/node/extHostLoggerService';
import {ILogService, ILoggerService} from 'td/platform/log/common/log';
import {NodeExtHostVariableResolverProviderService} from 'td/workbench/api/node/extHostVariableResolverService';
import {IExtHostVariableResolverProvider} from 'td/workbench/api/common/extHostVariableResolverService';
import {ExtHostLogService} from 'td/workbench/api/common/extHostLogService';
import {SyncDescriptor} from 'td/platform/instantiation/common/descriptors';
import {ISignService} from 'td/platform/sign/common/sign';
import {SignService} from 'td/platform/sign/node/signService';

// #########################################################################
// ###                                                                   ###
// ### !!! PLEASE ADD COMMON IMPORTS INTO extHost.common.services.ts !!! ###
// ###                                                                   ###
// #########################################################################

const red = "\x1b[31m"; const green = "\x1b[32m"; const blue = "\x1b[34m"; const x1b35 = "\x1b[35m"; const done = "\x1b[0m"; 
console.log(`${blue}FIGUREOUTs exHost.node.services.ts${done}`)

registerSingleton(IExtHostExtensionService, ExtHostExtensionService, InstantiationType.Eager);
registerSingleton(ILoggerService, ExtHostLoggerService, InstantiationType.Delayed);
registerSingleton(ILogService, new SyncDescriptor(ExtHostLogService, [false], true));
registerSingleton(ISignService, SignService, InstantiationType.Delayed);
registerSingleton(IExtensionStoragePaths, ExtensionStoragePaths, InstantiationType.Eager);

registerSingleton(IExtHostDebugService, ExtHostDebugService, InstantiationType.Eager);
registerSingleton(IExtHostSearch, NativeExtHostSearch, InstantiationType.Eager);
registerSingleton(IExtHostTask, ExtHostTask, InstantiationType.Eager);
registerSingleton(IExtHostTerminalService, ExtHostTerminalService, InstantiationType.Eager);
registerSingleton(IExtHostTunnelService, NodeExtHostTunnelService, InstantiationType.Eager);
registerSingleton(IExtHostVariableResolverProvider, NodeExtHostVariableResolverProviderService, InstantiationType.Eager);

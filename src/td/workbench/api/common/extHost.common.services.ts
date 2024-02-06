/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {IExtHostOutputService, ExtHostOutputService} from 'td/workbench/api/common/extHostOutput';
import {IExtHostWorkspace, ExtHostWorkspace} from 'td/workbench/api/common/extHostWorkspace';
import {IExtHostDecorations, ExtHostDecorations} from 'td/workbench/api/common/extHostDecorations';
import {IExtHostConfiguration, ExtHostConfiguration} from 'td/workbench/api/common/extHostConfiguration';
import {IExtHostCommands, ExtHostCommands} from 'td/workbench/api/common/extHostCommands';
import {IExtHostDocumentsAndEditors, ExtHostDocumentsAndEditors} from 'td/workbench/api/common/extHostDocumentsAndEditors';
import {IExtHostTerminalService, WorkerExtHostTerminalService} from 'td/workbench/api/common/extHostTerminalService';
import {IExtHostTask, WorkerExtHostTask} from 'td/workbench/api/common/extHostTask';
import {IExtHostDebugService, WorkerExtHostDebugService} from 'td/workbench/api/common/extHostDebugService';
import {IExtHostSearch, ExtHostSearch} from 'td/workbench/api/common/extHostSearch';
import {IExtHostStorage, ExtHostStorage} from 'td/workbench/api/common/extHostStorage';
import {IExtHostTunnelService, ExtHostTunnelService} from 'td/workbench/api/common/extHostTunnelService';
import {IExtHostApiDeprecationService, ExtHostApiDeprecationService,} from 'td/workbench/api/common/extHostApiDeprecationService';
import {IExtHostWindow, ExtHostWindow} from 'td/workbench/api/common/extHostWindow';
import {IExtHostConsumerFileSystem, ExtHostConsumerFileSystem} from 'td/workbench/api/common/extHostFileSystemConsumer';
import {IExtHostFileSystemInfo, ExtHostFileSystemInfo} from 'td/workbench/api/common/extHostFileSystemInfo';
import {IExtHostSecretState, ExtHostSecretState} from 'td/workbench/api/common/extHostSecretState';
import {ExtHostTelemetry, IExtHostTelemetry} from 'td/workbench/api/common/extHostTelemetry';
import {ExtHostEditorTabs, IExtHostEditorTabs} from 'td/workbench/api/common/extHostEditorTabs';
import {ExtHostLoggerService} from 'td/workbench/api/common/extHostLoggerService';
import {ILoggerService} from 'td/platform/log/common/log';
import {ExtHostVariableResolverProviderService, IExtHostVariableResolverProvider} from 'td/workbench/api/common/extHostVariableResolverService';
import {ExtHostLocalizationService, IExtHostLocalizationService} from 'td/workbench/api/common/extHostLocalizationService';
import {ExtHostManagedSockets, IExtHostManagedSockets} from 'td/workbench/api/common/extHostManagedSockets';

registerSingleton(IExtHostLocalizationService, ExtHostLocalizationService, InstantiationType.Delayed);
registerSingleton(ILoggerService, ExtHostLoggerService, InstantiationType.Delayed);
registerSingleton(IExtHostApiDeprecationService, ExtHostApiDeprecationService, InstantiationType.Delayed);
registerSingleton(IExtHostCommands, ExtHostCommands, InstantiationType.Eager);
registerSingleton(IExtHostConfiguration, ExtHostConfiguration, InstantiationType.Eager)
// 🤤
registerSingleton(IExtHostConsumerFileSystem, ExtHostConsumerFileSystem, InstantiationType.Eager);
registerSingleton(IExtHostDebugService, WorkerExtHostDebugService, InstantiationType.Eager);
registerSingleton(IExtHostDecorations, ExtHostDecorations, InstantiationType.Eager);
registerSingleton(IExtHostDocumentsAndEditors, ExtHostDocumentsAndEditors, InstantiationType.Eager);
// registerSingleton(IExtHostManagedSockets, ExtHostManagedSockets, InstantiationType.Eager);
registerSingleton(IExtHostFileSystemInfo, ExtHostFileSystemInfo, InstantiationType.Eager);
registerSingleton(IExtHostOutputService, ExtHostOutputService, InstantiationType.Delayed);
registerSingleton(IExtHostSearch, ExtHostSearch, InstantiationType.Eager);
registerSingleton(IExtHostStorage, ExtHostStorage, InstantiationType.Eager);
registerSingleton(IExtHostTask, WorkerExtHostTask, InstantiationType.Eager);
registerSingleton(IExtHostTerminalService, WorkerExtHostTerminalService, InstantiationType.Eager);
registerSingleton(IExtHostTunnelService, ExtHostTunnelService, InstantiationType.Eager);
registerSingleton(IExtHostWindow, ExtHostWindow, InstantiationType.Eager);
registerSingleton(IExtHostWorkspace, ExtHostWorkspace, InstantiationType.Eager);
registerSingleton(IExtHostSecretState, ExtHostSecretState, InstantiationType.Eager);
registerSingleton(IExtHostTelemetry, ExtHostTelemetry, InstantiationType.Eager);
registerSingleton(IExtHostEditorTabs, ExtHostEditorTabs, InstantiationType.Eager);
registerSingleton(IExtHostVariableResolverProvider, ExtHostVariableResolverProviderService, InstantiationType.Eager);

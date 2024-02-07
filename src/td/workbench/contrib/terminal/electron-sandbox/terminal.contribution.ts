/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {registerMainProcessRemoteService} from 'td/platform/ipc/electron-sandbox/services';
import {Registry} from 'td/platform/registry/common/platform';
import {ILocalPtyService, TerminalIpcChannels} from 'td/platform/terminal/common/terminal';
import {IWorkbenchContributionsRegistry, Extensions as WorkbenchExtensions} from 'td/workbench/common/contributions';
import {ITerminalProfileResolverService} from 'td/workbench/contrib/terminal/common/terminal';
import {TerminalNativeContribution} from 'td/workbench/contrib/terminal/electron-sandbox/terminalNativeContribution';
import {ElectronTerminalProfileResolverService} from 'td/workbench/contrib/terminal/electron-sandbox/terminalProfileResolverService';
import {LifecyclePhase} from 'td/workbench/services/lifecycle/common/lifecycle';
import {LocalTerminalBackendContribution} from 'td/workbench/contrib/terminal/electron-sandbox/localTerminalBackend';

// Register services
registerMainProcessRemoteService(ILocalPtyService, TerminalIpcChannels.LocalPty);
registerSingleton(ITerminalProfileResolverService, ElectronTerminalProfileResolverService, InstantiationType.Delayed);

// Register workbench contributions
const workbenchRegistry = Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench);

// This contribution needs to be active during the Startup phase to be available when a remote resolver tries to open a local
// terminal while connecting to the remote.
workbenchRegistry.registerWorkbenchContribution(LocalTerminalBackendContribution, LifecyclePhase.Starting);
workbenchRegistry.registerWorkbenchContribution(TerminalNativeContribution, LifecyclePhase.Restored);

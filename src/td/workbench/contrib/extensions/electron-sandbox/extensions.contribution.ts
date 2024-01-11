/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {Registry} from 'td/platform/registry/common/platform';
import {IWorkbenchContributionsRegistry, Extensions as WorkbenchExtensions, IWorkbenchContribution} from 'td/workbench/common/contributions';
import {RemoteExtensionsInitializerContribution} from 'td/workbench/contrib/extensions/electron-sandbox/remoteExtensionsInit';
import {LifecyclePhase} from 'td/workbench/services/lifecycle/common/lifecycle';


const workbenchRegistry = Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(RemoteExtensionsInitializerContribution, LifecyclePhase.Restored);
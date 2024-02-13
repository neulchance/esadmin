/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IInstantiationService} from 'td/platform/instantiation/common/instantiation';
import {LifecyclePhase} from 'td/workbench/services/lifecycle/common/lifecycle';
import {Registry} from 'td/platform/registry/common/platform';
import {Extensions as WorkbenchExtensions, IWorkbenchContributionsRegistry} from 'td/workbench/common/contributions';
import {ViewsWelcomeContribution} from 'td/workbench/contrib/welcomeViews/common/viewsWelcomeContribution';
import {ViewsWelcomeExtensionPoint, viewsWelcomeExtensionPointDescriptor} from 'td/workbench/contrib/welcomeViews/common/viewsWelcomeExtensionPoint';
import {ExtensionsRegistry} from 'td/workbench/services/extensions/common/extensionsRegistry';

const extensionPoint = ExtensionsRegistry.registerExtensionPoint<ViewsWelcomeExtensionPoint>(viewsWelcomeExtensionPointDescriptor);

class WorkbenchConfigurationContribution {
	constructor(
		@IInstantiationService instantiationService: IInstantiationService,
	) {
		instantiationService.createInstance(ViewsWelcomeContribution, extensionPoint);
	}
}

Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench)
	.registerWorkbenchContribution(WorkbenchConfigurationContribution, LifecyclePhase.Restored);

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IWorkbenchContribution, IWorkbenchContributionsRegistry, Extensions as WorkbenchExtensions} from 'td/workbench/common/contributions';
import {Registry} from 'td/platform/registry/common/platform';
import {IInstantiationService} from 'td/platform/instantiation/common/instantiation';
import {LifecyclePhase} from 'td/workbench/services/lifecycle/common/lifecycle';

// --- other interested parties
import {JSONValidationExtensionPoint} from 'td/workbench/api/common/jsonValidationExtensionPoint';
// import {ColorExtensionPoint} from 'td/workbench/services/themes/common/colorExtensionPoint';
// import {IconExtensionPoint} from 'td/workbench/services/themes/common/iconExtensionPoint';
// import {TokenClassificationExtensionPoints} from 'td/workbench/services/themes/common/tokenClassificationExtensionPoint';
// import {LanguageConfigurationFileHandler} from 'td/workbench/contrib/codeEditor/browser/languageConfigurationExtensionPoint';
// import {StatusBarItemsExtensionPoint} from 'td/workbench/api/browser/statusBarExtensionPoint';

// --- mainThread participants
// import './mainThreadBulkEdits';
import './mainThreadExtensionService';
import './mainThreadWindow';
import './mainThreadErrors';
import './mainThreadLogService';
// import './mainThreadShare';
import './mainThreadWorkspace';
import './mainThreadMessageService';
import './mainThreadConfiguration';
import './mainThreadFileSystem';
import './mainThreadDocuments';

export class ExtensionPoints implements IWorkbenchContribution {

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService
	) {
		// Classes that handle extension points...
		this.instantiationService.createInstance(JSONValidationExtensionPoint);
		// this.instantiationService.createInstance(ColorExtensionPoint);
		// this.instantiationService.createInstance(IconExtensionPoint);
		// this.instantiationService.createInstance(TokenClassificationExtensionPoints);
		// this.instantiationService.createInstance(LanguageConfigurationFileHandler);
		// this.instantiationService.createInstance(StatusBarItemsExtensionPoint);
	}
}

Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(ExtensionPoints, LifecyclePhase.Starting);
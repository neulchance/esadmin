/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// import {IWorkbenchContribution, IWorkbenchContributionsRegistry, Extensions as WorkbenchExtensions} from 'td/workbench/common/contributions';
import {IWorkbenchContribution, WorkbenchPhase, registerWorkbenchContribution2} from 'td/workbench/common/contributions';
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
import './mainThreadLocalization';
import './mainThreadConsole';
import './mainThreadExtensionService';
import './mainThreadWindow';
import './mainThreadCommands';
import './mainThreadClipboard';
import './mainThreadUrls';
import './mainThreadErrors';
import './mainThreadDocuments';
import './mainThreadDocumentsAndEditors';
import './mainThreadDialogs';
import './mainThreadLogService';
import './mainThreadWorkspace';
import './mainThreadMessageService';
import './mainThreadDiagnostics';
import './mainThreadConfiguration';
import './mainThreadFileSystem';
import './mainThreadDownloadService';
import './mainThreadLanguageFeatures';
import './mainThreadDocumentContentProviders';
import './mainThreadStatusBar';
import './mainThreadStorage';
import './mainThreadTunnelService';
import './mainThreadManagedSockets';
import './mainThreadOutputService';
import './mainThreadTerminalService';
import './mainThreadSecretState';
import './mainThreadDecorations';

export class ExtensionPoints implements IWorkbenchContribution {

	static readonly ID = 'workbench.contrib.extensionPoints';

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

registerWorkbenchContribution2(ExtensionPoints.ID, ExtensionPoints, WorkbenchPhase.BlockStartup);

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {INativeWorkbenchEnvironmentService} from 'td/workbench/services/environment/electron-sandbox/environmentService';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {ICommandService} from 'td/platform/commands/common/commands';
import {IWorkspaceContextService} from 'td/platform/workspace/common/workspace';
import {IEditorService} from 'td/workbench/services/editor/common/editorService';
import {IQuickInputService} from 'td/platform/quickinput/common/quickInput';
import {IConfigurationResolverService} from 'td/workbench/services/configurationResolver/common/configurationResolver';
import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {BaseConfigurationResolverService} from 'td/workbench/services/configurationResolver/browser/baseConfigurationResolverService';
import {ILabelService} from 'td/platform/label/common/label';
import {IShellEnvironmentService} from 'td/workbench/services/environment/electron-sandbox/shellEnvironmentService';
import {IPathService} from 'td/workbench/services/path/common/pathService';
import {IExtensionService} from 'td/workbench/services/extensions/common/extensions';

export class ConfigurationResolverService extends BaseConfigurationResolverService {

	constructor(
		@IEditorService editorService: IEditorService,
		@INativeWorkbenchEnvironmentService environmentService: INativeWorkbenchEnvironmentService,
		@IConfigurationService configurationService: IConfigurationService,
		@ICommandService commandService: ICommandService,
		@IWorkspaceContextService workspaceContextService: IWorkspaceContextService,
		@IQuickInputService quickInputService: IQuickInputService,
		@ILabelService labelService: ILabelService,
		@IShellEnvironmentService shellEnvironmentService: IShellEnvironmentService,
		@IPathService pathService: IPathService,
		@IExtensionService extensionService: IExtensionService,
	) {
		super({
			getAppRoot: (): string | undefined => {
				return environmentService.appRoot;
			},
			getExecPath: (): string | undefined => {
				return environmentService.execPath;
			},
		}, shellEnvironmentService.getShellEnv(), editorService, configurationService, commandService,
			workspaceContextService, quickInputService, labelService, pathService, extensionService);
	}
}

registerSingleton(IConfigurationResolverService, ConfigurationResolverService, InstantiationType.Delayed);

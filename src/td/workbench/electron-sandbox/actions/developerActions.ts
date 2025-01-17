/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {localize2} from 'td/nls';
import {INativeHostService} from 'td/platform/native/common/native';
import {IEditorService} from 'td/workbench/services/editor/common/editorService';
import {Action2, MenuId} from 'td/platform/actions/common/actions';
import {Categories} from 'td/platform/action/common/actionCommonCategories';
import {ServicesAccessor} from 'td/platform/instantiation/common/instantiation';
import {IWorkbenchEnvironmentService} from 'td/workbench/services/environment/common/environmentService';
import {KeybindingWeight} from 'td/platform/keybinding/common/keybindingsRegistry';
import {IsDevelopmentContext} from 'td/platform/contextkey/common/contextkeys';
import {KeyCode, KeyMod} from 'td/base/common/keyCodes';
import {IFileService} from 'td/platform/files/common/files';
import {INativeWorkbenchEnvironmentService} from 'td/workbench/services/environment/electron-sandbox/environmentService';
import {URI} from 'td/base/common/uri';
import {getActiveWindow} from 'td/base/browser/dom';

export class ToggleDevToolsAction extends Action2 {

	constructor() {
		super({
			id: 'workbench.action.toggleDevTools',
			title: localize2('toggleDevTools', 'Toggle Developer Tools'),
			category: Categories.Developer,
			f1: true,
			keybinding: {
				weight: KeybindingWeight.WorkbenchContrib + 50,
				when: IsDevelopmentContext,
				primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyI,
				mac: {primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KeyI}
			},
			menu: {
				id: MenuId.MenubarHelpMenu,
				group: '5_tools',
				order: 1
			}
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const nativeHostService = accessor.get(INativeHostService);

		console.log('getActiveWindow().tddevWindowId', getActiveWindow().tddevWindowId);
		return nativeHostService.toggleDevTools({targetWindowId: getActiveWindow().tddevWindowId});
	}
}

export class ConfigureRuntimeArgumentsAction extends Action2 {

	constructor() {
		super({
			id: 'workbench.action.configureRuntimeArguments',
			title: localize2('configureRuntimeArguments', 'Configure Runtime Arguments'),
			category: Categories.Preferences,
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const editorService = accessor.get(IEditorService);
		const environmentService = accessor.get(IWorkbenchEnvironmentService);

		await editorService.openEditor({
			resource: environmentService.argvResource,
			options: {pinned: true}
		});
	}
}

export class ReloadWindowWithExtensionsDisabledAction extends Action2 {

	constructor() {
		super({
			id: 'workbench.action.reloadWindowWithExtensionsDisabled',
			title: localize2('reloadWindowWithExtensionsDisabled', 'Reload With Extensions Disabled'),
			category: Categories.Developer,
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		return accessor.get(INativeHostService).reload({disableExtensions: true});
	}
}

export class OpenUserDataFolderAction extends Action2 {

	constructor() {
		super({
			id: 'workbench.action.openUserDataFolder',
			title: localize2('openUserDataFolder', 'Open User Data Folder'),
			category: Categories.Developer,
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const nativeHostService = accessor.get(INativeHostService);
		const fileService = accessor.get(IFileService);
		const environmentService = accessor.get(INativeWorkbenchEnvironmentService);

		const userDataHome = URI.file(environmentService.userDataPath);
		const file = await fileService.resolve(userDataHome);

		let itemToShow: URI;
		if (file.children && file.children.length > 0) {
			itemToShow = file.children[0].resource;
		} else {
			itemToShow = userDataHome;
		}

		return nativeHostService.showItemInFolder(itemToShow.fsPath);
	}
}

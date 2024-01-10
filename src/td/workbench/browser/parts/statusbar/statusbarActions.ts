/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {localize, localize2} from 'td/nls';
import {IStatusbarService} from 'td/workbench/services/statusbar/browser/statusbar';
import {Action} from 'td/base/common/actions';
import {Parts, IWorkbenchLayoutService} from 'td/workbench/services/layout/browser/layoutService';
import {KeyCode} from 'td/base/common/keyCodes';
import {KeybindingsRegistry, KeybindingWeight} from 'td/platform/keybinding/common/keybindingsRegistry';
// import {ServicesAccessor} from 'td/editor/browser/editorExtensions';
import {Action2, registerAction2} from 'td/platform/actions/common/actions';
import {Categories} from 'td/platform/action/common/actionCommonCategories';
// import {IEditorService} from 'td/workbench/services/editor/common/editorService';
import {StatusbarViewModel} from 'td/workbench/browser/parts/statusbar/statusbarModel';
import {StatusBarFocused} from 'td/workbench/common/contextkeys';
import {getActiveWindow} from 'td/base/browser/dom';
import {ServicesAccessor as InstantiationServicesAccessor} from 'td/platform/instantiation/common/instantiation';

export type ServicesAccessor = InstantiationServicesAccessor;

export class ToggleStatusbarEntryVisibilityAction extends Action {

	constructor(id: string, label: string, private model: StatusbarViewModel) {
		super(id, label, undefined, true);

		this.checked = !model.isHidden(id);
	}

	override async run(): Promise<void> {
		if (this.model.isHidden(this.id)) {
			this.model.show(this.id);
		} else {
			this.model.hide(this.id);
		}
	}
}

export class HideStatusbarEntryAction extends Action {

	constructor(id: string, name: string, private model: StatusbarViewModel) {
		super(id, localize('hide', "Hide '{0}'", name), undefined, true);
	}

	override async run(): Promise<void> {
		this.model.hide(this.id);
	}
}

KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: 'workbench.statusBar.focusPrevious',
	weight: KeybindingWeight.WorkbenchContrib,
	primary: KeyCode.LeftArrow,
	secondary: [KeyCode.UpArrow],
	when: StatusBarFocused,
	handler: (accessor: ServicesAccessor) => {
		const statusBarService = accessor.get(IStatusbarService);
		statusBarService.focusPreviousEntry();
	}
});

KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: 'workbench.statusBar.focusNext',
	weight: KeybindingWeight.WorkbenchContrib,
	primary: KeyCode.RightArrow,
	secondary: [KeyCode.DownArrow],
	when: StatusBarFocused,
	handler: (accessor: ServicesAccessor) => {
		const statusBarService = accessor.get(IStatusbarService);
		statusBarService.focusNextEntry();
	}
});

KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: 'workbench.statusBar.focusFirst',
	weight: KeybindingWeight.WorkbenchContrib,
	primary: KeyCode.Home,
	when: StatusBarFocused,
	handler: (accessor: ServicesAccessor) => {
		const statusBarService = accessor.get(IStatusbarService);
		statusBarService.focus(false);
		statusBarService.focusNextEntry();
	}
});

KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: 'workbench.statusBar.focusLast',
	weight: KeybindingWeight.WorkbenchContrib,
	primary: KeyCode.End,
	when: StatusBarFocused,
	handler: (accessor: ServicesAccessor) => {
		const statusBarService = accessor.get(IStatusbarService);
		statusBarService.focus(false);
		statusBarService.focusPreviousEntry();
	}
});

KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: 'workbench.statusBar.clearFocus',
	weight: KeybindingWeight.WorkbenchContrib,
	primary: KeyCode.Escape,
	when: StatusBarFocused,
	handler: (accessor: ServicesAccessor) => {
		const statusBarService = accessor.get(IStatusbarService);
		// const editorService = accessor.get(IEditorService);
		if (statusBarService.isEntryFocused()) {
			statusBarService.focus(false);
    }
  }
});

class FocusStatusBarAction extends Action2 {

	constructor() {
		super({
			id: 'workbench.action.focusStatusBar',
			title: localize2('focusStatusBar', 'Focus Status Bar'),
			category: Categories.View,
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const layoutService = accessor.get(IWorkbenchLayoutService);
		layoutService.focusPart(Parts.STATUSBAR_PART, getActiveWindow());
	}
}

registerAction2(FocusStatusBarAction);

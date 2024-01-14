/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {KeyCode} from 'td/base/common/keyCodes';
import {EditorAction2, ServicesAccessor} from 'td/editor/browser/editorExtensions';
import {localize} from 'td/nls';
import {Categories} from 'td/platform/action/common/actionCommonCategories';
import {Action2, MenuId} from 'td/platform/actions/common/actions';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {KeybindingWeight} from 'td/platform/keybinding/common/keybindingsRegistry';
import {ContextKeyExpr} from 'td/platform/contextkey/common/contextkey';
import {EditorContextKeys} from 'td/editor/common/editorContextKeys';
import {ICodeEditor} from 'td/editor/browser/editorBrowser';
import {StickyScrollController} from 'td/editor/contrib/stickyScroll/browser/stickyScrollController';

export class ToggleStickyScroll extends Action2 {

	constructor() {
		super({
			id: 'editor.action.toggleStickyScroll',
			title: {
				value: localize('toggleStickyScroll', "Toggle Sticky Scroll"),
				mnemonicTitle: localize({key: 'mitoggleStickyScroll', comment: ['&& denotes a mnemonic']}, "&&Toggle Sticky Scroll"),
				original: 'Toggle Sticky Scroll',
			},
			category: Categories.View,
			toggled: {
				condition: ContextKeyExpr.equals('config.editor.stickyScroll.enabled', true),
				title: localize('stickyScroll', "Sticky Scroll"),
				mnemonicTitle: localize({key: 'miStickyScroll', comment: ['&& denotes a mnemonic']}, "&&Sticky Scroll"),
			},
			menu: [
				{id: MenuId.CommandPalette},
				{id: MenuId.MenubarAppearanceMenu, group: '4_editor', order: 3},
				{id: MenuId.StickyScrollContext}
			]
		});
	}

	override async run(accessor: ServicesAccessor): Promise<void> {
		const configurationService = accessor.get(IConfigurationService);
		const newValue = !configurationService.getValue('editor.stickyScroll.enabled');
		return configurationService.updateValue('editor.stickyScroll.enabled', newValue);
	}
}

const weight = KeybindingWeight.EditorContrib;

export class FocusStickyScroll extends EditorAction2 {

	constructor() {
		super({
			id: 'editor.action.focusStickyScroll',
			title: {
				value: localize('focusStickyScroll', "Focus Sticky Scroll"),
				mnemonicTitle: localize({key: 'mifocusStickyScroll', comment: ['&& denotes a mnemonic']}, "&&Focus Sticky Scroll"),
				original: 'Focus Sticky Scroll',
			},
			precondition: ContextKeyExpr.and(ContextKeyExpr.has('config.editor.stickyScroll.enabled'), EditorContextKeys.stickyScrollVisible),
			menu: [
				{id: MenuId.CommandPalette},
			]
		});
	}

	runEditorCommand(_accessor: ServicesAccessor, editor: ICodeEditor) {
		StickyScrollController.get(editor)?.focus();
	}
}

export class SelectNextStickyScrollLine extends EditorAction2 {
	constructor() {
		super({
			id: 'editor.action.selectNextStickyScrollLine',
			title: {
				value: localize('selectNextStickyScrollLine.title', "Select next sticky scroll line"),
				original: 'Select next sticky scroll line'
			},
			precondition: EditorContextKeys.stickyScrollFocused.isEqualTo(true),
			keybinding: {
				weight,
				primary: KeyCode.DownArrow
			}
		});
	}

	runEditorCommand(_accessor: ServicesAccessor, editor: ICodeEditor) {
		StickyScrollController.get(editor)?.focusNext();
	}
}

export class SelectPreviousStickyScrollLine extends EditorAction2 {
	constructor() {
		super({
			id: 'editor.action.selectPreviousStickyScrollLine',
			title: {
				value: localize('selectPreviousStickyScrollLine.title', "Select previous sticky scroll line"),
				original: 'Select previous sticky scroll line'
			},
			precondition: EditorContextKeys.stickyScrollFocused.isEqualTo(true),
			keybinding: {
				weight,
				primary: KeyCode.UpArrow
			}
		});
	}

	runEditorCommand(_accessor: ServicesAccessor, editor: ICodeEditor) {
		StickyScrollController.get(editor)?.focusPrevious();
	}
}

export class GoToStickyScrollLine extends EditorAction2 {
	constructor() {
		super({
			id: 'editor.action.goToFocusedStickyScrollLine',
			title: {
				value: localize('goToFocusedStickyScrollLine.title', "Go to focused sticky scroll line"),
				original: 'Go to focused sticky scroll line'
			},
			precondition: EditorContextKeys.stickyScrollFocused.isEqualTo(true),
			keybinding: {
				weight,
				primary: KeyCode.Enter
			}
		});
	}

	runEditorCommand(_accessor: ServicesAccessor, editor: ICodeEditor) {
		StickyScrollController.get(editor)?.goToFocused();
	}
}

export class SelectEditor extends EditorAction2 {

	constructor() {
		super({
			id: 'editor.action.selectEditor',
			title: {
				value: localize('selectEditor.title', "Select Editor"),
				original: 'Select Editor'
			},
			precondition: EditorContextKeys.stickyScrollFocused.isEqualTo(true),
			keybinding: {
				weight,
				primary: KeyCode.Escape
			}
		});
	}

	runEditorCommand(_accessor: ServicesAccessor, editor: ICodeEditor) {
		StickyScrollController.get(editor)?.selectEditor();
	}
}

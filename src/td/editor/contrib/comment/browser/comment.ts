/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {KeyChord, KeyCode, KeyMod} from 'td/base/common/keyCodes';
import {ICodeEditor} from 'td/editor/browser/editorBrowser';
import {EditorAction, IActionOptions, registerEditorAction, ServicesAccessor} from 'td/editor/browser/editorExtensions';
import {EditorOption} from 'td/editor/common/config/editorOptions';
import {Range} from 'td/editor/common/core/range';
import {ICommand} from 'td/editor/common/editorCommon';
import {EditorContextKeys} from 'td/editor/common/editorContextKeys';
import {ILanguageConfigurationService} from 'td/editor/common/languages/languageConfigurationRegistry';
import {BlockCommentCommand} from 'td/editor/contrib/comment/browser/blockCommentCommand';
import {LineCommentCommand, Type} from 'td/editor/contrib/comment/browser/lineCommentCommand';
import * as nls from 'td/nls';
import {MenuId} from 'td/platform/actions/common/actions';
import {KeybindingWeight} from 'td/platform/keybinding/common/keybindingsRegistry';

abstract class CommentLineAction extends EditorAction {

	private readonly _type: Type;

	constructor(type: Type, opts: IActionOptions) {
		super(opts);
		this._type = type;
	}

	public run(accessor: ServicesAccessor, editor: ICodeEditor): void {
		const languageConfigurationService = accessor.get(ILanguageConfigurationService);

		if (!editor.hasModel()) {
			return;
		}

		const model = editor.getModel();
		const commands: ICommand[] = [];
		const modelOptions = model.getOptions();
		const commentsOptions = editor.getOption(EditorOption.comments);

		const selections = editor.getSelections().map((selection, index) => ({selection, index, ignoreFirstLine: false}));
		selections.sort((a, b) => Range.compareRangesUsingStarts(a.selection, b.selection));

		// Remove selections that would result in copying the same line
		let prev = selections[0];
		for (let i = 1; i < selections.length; i++) {
			const curr = selections[i];
			if (prev.selection.endLineNumber === curr.selection.startLineNumber) {
				// these two selections would copy the same line
				if (prev.index < curr.index) {
					// prev wins
					curr.ignoreFirstLine = true;
				} else {
					// curr wins
					prev.ignoreFirstLine = true;
					prev = curr;
				}
			}
		}


		for (const selection of selections) {
			commands.push(new LineCommentCommand(
				languageConfigurationService,
				selection.selection,
				modelOptions.tabSize,
				this._type,
				commentsOptions.insertSpace,
				commentsOptions.ignoreEmptyLines,
				selection.ignoreFirstLine
			));
		}

		editor.pushUndoStop();
		editor.executeCommands(this.id, commands);
		editor.pushUndoStop();
	}

}

class ToggleCommentLineAction extends CommentLineAction {
	constructor() {
		super(Type.Toggle, {
			id: 'editor.action.commentLine',
			label: nls.localize('comment.line', "Toggle Line Comment"),
			alias: 'Toggle Line Comment',
			precondition: EditorContextKeys.writable,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primary: KeyMod.CtrlCmd | KeyCode.Slash,
				weight: KeybindingWeight.EditorContrib
			},
			menuOpts: {
				menuId: MenuId.MenubarEditMenu,
				group: '5_insert',
				title: nls.localize({key: 'miToggleLineComment', comment: ['&& denotes a mnemonic']}, "&&Toggle Line Comment"),
				order: 1
			}
		});
	}
}

class AddLineCommentAction extends CommentLineAction {
	constructor() {
		super(Type.ForceAdd, {
			id: 'editor.action.addCommentLine',
			label: nls.localize('comment.line.add', "Add Line Comment"),
			alias: 'Add Line Comment',
			precondition: EditorContextKeys.writable,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KeyK, KeyMod.CtrlCmd | KeyCode.KeyC),
				weight: KeybindingWeight.EditorContrib
			}
		});
	}
}

class RemoveLineCommentAction extends CommentLineAction {
	constructor() {
		super(Type.ForceRemove, {
			id: 'editor.action.removeCommentLine',
			label: nls.localize('comment.line.remove', "Remove Line Comment"),
			alias: 'Remove Line Comment',
			precondition: EditorContextKeys.writable,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KeyK, KeyMod.CtrlCmd | KeyCode.KeyU),
				weight: KeybindingWeight.EditorContrib
			}
		});
	}
}

class BlockCommentAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.action.blockComment',
			label: nls.localize('comment.block', "Toggle Block Comment"),
			alias: 'Toggle Block Comment',
			precondition: EditorContextKeys.writable,
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primary: KeyMod.Shift | KeyMod.Alt | KeyCode.KeyA,
				linux: {primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyA},
				weight: KeybindingWeight.EditorContrib
			},
			menuOpts: {
				menuId: MenuId.MenubarEditMenu,
				group: '5_insert',
				title: nls.localize({key: 'miToggleBlockComment', comment: ['&& denotes a mnemonic']}, "Toggle &&Block Comment"),
				order: 2
			}
		});
	}

	public run(accessor: ServicesAccessor, editor: ICodeEditor): void {
		const languageConfigurationService = accessor.get(ILanguageConfigurationService);

		if (!editor.hasModel()) {
			return;
		}

		const commentsOptions = editor.getOption(EditorOption.comments);
		const commands: ICommand[] = [];
		const selections = editor.getSelections();
		for (const selection of selections) {
			commands.push(new BlockCommentCommand(selection, commentsOptions.insertSpace, languageConfigurationService));
		}

		editor.pushUndoStop();
		editor.executeCommands(this.id, commands);
		editor.pushUndoStop();
	}
}

registerEditorAction(ToggleCommentLineAction);
registerEditorAction(AddLineCommentAction);
registerEditorAction(RemoveLineCommentAction);
registerEditorAction(BlockCommentAction);

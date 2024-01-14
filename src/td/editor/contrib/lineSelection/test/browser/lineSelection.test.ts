/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import {ensureNoDisposablesAreLeakedInTestSuite} from 'td/base/test/common/utils';
import type {ICodeEditor} from 'td/editor/browser/editorBrowser';
import {EditorAction} from 'td/editor/browser/editorExtensions';
import {Position} from 'td/editor/common/core/position';
import {Selection} from 'td/editor/common/core/selection';
import {ExpandLineSelectionAction} from 'td/editor/contrib/lineSelection/browser/lineSelection';
import {withTestCodeEditor} from 'td/editor/test/browser/testCodeEditor';

function executeAction(action: EditorAction, editor: ICodeEditor): void {
	action.run(null!, editor, undefined);
}

suite('LineSelection', () => {

	ensureNoDisposablesAreLeakedInTestSuite();

	test('', () => {
		const LINE1 = '    \tMy First Line\t ';
		const LINE2 = '\tMy Second Line';
		const LINE3 = '    Third Line🐶';
		const LINE4 = '';
		const LINE5 = '1';

		const TEXT =
			LINE1 + '\r\n' +
			LINE2 + '\n' +
			LINE3 + '\n' +
			LINE4 + '\r\n' +
			LINE5;

		withTestCodeEditor(TEXT, {}, (editor, viewModel) => {
			const action = new ExpandLineSelectionAction();

			//              0          1         2
			//              01234 56789012345678 0
			// let LINE1 = '    \tMy First Line\t ';
			editor.setPosition(new Position(1, 1));
			executeAction(action, editor);
			assert.deepStrictEqual(editor.getSelection(), new Selection(1, 1, 2, 1));

			editor.setPosition(new Position(1, 2));
			executeAction(action, editor);
			assert.deepStrictEqual(editor.getSelection(), new Selection(1, 1, 2, 1));

			editor.setPosition(new Position(1, 5));
			executeAction(action, editor);
			assert.deepStrictEqual(editor.getSelection(), new Selection(1, 1, 2, 1));

			editor.setPosition(new Position(1, 19));
			executeAction(action, editor);
			assert.deepStrictEqual(editor.getSelection(), new Selection(1, 1, 2, 1));

			editor.setPosition(new Position(1, 20));
			executeAction(action, editor);
			assert.deepStrictEqual(editor.getSelection(), new Selection(1, 1, 2, 1));

			editor.setPosition(new Position(1, 21));
			executeAction(action, editor);
			assert.deepStrictEqual(editor.getSelection(), new Selection(1, 1, 2, 1));
			executeAction(action, editor);
			assert.deepStrictEqual(editor.getSelection(), new Selection(1, 1, 3, 1));
			executeAction(action, editor);
			assert.deepStrictEqual(editor.getSelection(), new Selection(1, 1, 4, 1));
			executeAction(action, editor);
			assert.deepStrictEqual(editor.getSelection(), new Selection(1, 1, 5, 1));
			executeAction(action, editor);
			assert.deepStrictEqual(editor.getSelection(), new Selection(1, 1, 5, LINE5.length + 1));
			executeAction(action, editor);
			assert.deepStrictEqual(editor.getSelection(), new Selection(1, 1, 5, LINE5.length + 1));
		});
	});
});

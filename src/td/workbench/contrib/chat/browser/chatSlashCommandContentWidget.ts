/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'td/css!./chatSlashCommandContentWidget';
import {IKeyboardEvent} from 'td/base/browser/keyboardEvent';
import {Range} from 'td/editor/common/core/range';
import {Disposable} from 'td/base/common/lifecycle';
import {ContentWidgetPositionPreference, ICodeEditor, IContentWidget} from 'td/editor/browser/editorBrowser';
import {KeyCode} from 'td/base/common/keyCodes';
import {localize} from 'td/nls';
import * as aria from 'td/base/browser/ui/aria/aria';
import {EditorOption} from 'td/editor/common/config/editorOptions';

export class SlashCommandContentWidget extends Disposable implements IContentWidget {
	private _domNode = document.createElement('div');
	private _lastSlashCommandText: string | undefined;
	private _isVisible = false;

	constructor(private _editor: ICodeEditor) {
		super();

		this._domNode.toggleAttribute('hidden', true);
		this._domNode.classList.add('chat-slash-command-content-widget');

		// If backspace at a slash command boundary, remove the slash command
		this._register(this._editor.onKeyDown((e) => this._handleKeyDown(e)));
	}

	override dispose() {
		this.hide();
		super.dispose();
	}

	show() {
		if (!this._isVisible) {
			this._isVisible = true;
			this._domNode.toggleAttribute('hidden', false);
			this._editor.addContentWidget(this);
		}
	}

	hide() {
		if (this._isVisible) {
			this._isVisible = false;
			this._domNode.toggleAttribute('hidden', true);
			this._editor.removeContentWidget(this);
		}
	}

	setCommandText(slashCommand: string) {
		this._domNode.innerText = `/${slashCommand} `;
		this._lastSlashCommandText = slashCommand;
	}

	getId() {
		return 'chat-slash-command-content-widget';
	}

	getDomNode() {
		return this._domNode;
	}

	getPosition() {
		return {position: {lineNumber: 1, column: 1}, preference: [ContentWidgetPositionPreference.EXACT]};
	}

	beforeRender(): null {
		const lineHeight = this._editor.getOption(EditorOption.lineHeight);
		this._domNode.style.lineHeight = `${lineHeight - 2 /*padding*/}px`;
		return null;
	}

	private _handleKeyDown(e: IKeyboardEvent) {
		if (e.keyCode !== KeyCode.Backspace) {
			return;
		}

		const firstLine = this._editor.getModel()?.getLineContent(1);
		const selection = this._editor.getSelection();
		const withSlash = `/${this._lastSlashCommandText} `;
		if (!firstLine?.startsWith(withSlash) || !selection?.isEmpty() || selection?.startLineNumber !== 1 || selection?.startColumn !== withSlash.length + 1) {
			return;
		}

		// Allow to undo the backspace
		this._editor.executeEdits('chat-slash-command', [{
			range: new Range(1, 1, 1, selection.startColumn),
			text: null
		}]);

		// Announce the deletion
		aria.alert(localize('exited slash command mode', 'Exited {0} mode', this._lastSlashCommandText));
	}
}

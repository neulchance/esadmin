/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {MarkdownString} from 'td/base/common/htmlContent';
import {Disposable} from 'td/base/common/lifecycle';
import {ICodeEditor} from 'td/editor/browser/editorBrowser';
import {EditorContributionInstantiation, registerEditorContribution} from 'td/editor/browser/editorExtensions';
import {EditorOption} from 'td/editor/common/config/editorOptions';
import {IEditorContribution} from 'td/editor/common/editorCommon';
import {MessageController} from 'td/editor/contrib/message/browser/messageController';
import * as nls from 'td/nls';

export class ReadOnlyMessageController extends Disposable implements IEditorContribution {

	public static readonly ID = 'editor.contrib.readOnlyMessageController';

	constructor(
		private readonly editor: ICodeEditor
	) {
		super();
		this._register(this.editor.onDidAttemptReadOnlyEdit(() => this._onDidAttemptReadOnlyEdit()));
	}

	private _onDidAttemptReadOnlyEdit(): void {
		const messageController = MessageController.get(this.editor);
		if (messageController && this.editor.hasModel()) {
			let message = this.editor.getOptions().get(EditorOption.readOnlyMessage);
			if (!message) {
				if (this.editor.isSimpleWidget) {
					message = new MarkdownString(nls.localize('editor.simple.readonly', "Cannot edit in read-only input"));
				} else {
					message = new MarkdownString(nls.localize('editor.readonly', "Cannot edit in read-only editor"));
				}
			}

			messageController.showMessage(message, this.editor.getPosition());
		}
	}
}

registerEditorContribution(ReadOnlyMessageController.ID, ReadOnlyMessageController, EditorContributionInstantiation.BeforeFirstInteraction);

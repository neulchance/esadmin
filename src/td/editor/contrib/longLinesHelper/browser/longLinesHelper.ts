/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {Disposable} from 'td/base/common/lifecycle';
import {ICodeEditor, MouseTargetType} from 'td/editor/browser/editorBrowser';
import {EditorContributionInstantiation, registerEditorContribution} from 'td/editor/browser/editorExtensions';
import {EditorOption} from 'td/editor/common/config/editorOptions';
import {IEditorContribution} from 'td/editor/common/editorCommon';

class LongLinesHelper extends Disposable implements IEditorContribution {
	public static readonly ID = 'editor.contrib.longLinesHelper';

	public static get(editor: ICodeEditor): LongLinesHelper | null {
		return editor.getContribution<LongLinesHelper>(LongLinesHelper.ID);
	}

	constructor(
		private readonly _editor: ICodeEditor,
	) {
		super();

		this._register(this._editor.onMouseDown((e) => {
			const stopRenderingLineAfter = this._editor.getOption(EditorOption.stopRenderingLineAfter);
			if (stopRenderingLineAfter >= 0 && e.target.type === MouseTargetType.CONTENT_TEXT && e.target.position.column >= stopRenderingLineAfter) {
				this._editor.updateOptions({
					stopRenderingLineAfter: -1
				});
			}
		}));
	}
}

registerEditorContribution(LongLinesHelper.ID, LongLinesHelper, EditorContributionInstantiation.BeforeFirstInteraction);

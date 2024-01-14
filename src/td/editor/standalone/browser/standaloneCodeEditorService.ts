/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { windowOpenNoOpener } from 'td/base/browser/dom';
import { Schemas } from 'td/base/common/network';
import { URI } from 'td/base/common/uri';
import { ICodeEditor } from 'td/editor/browser/editorBrowser';
import { AbstractCodeEditorService } from 'td/editor/browser/services/abstractCodeEditorService';
import { ICodeEditorService } from 'td/editor/browser/services/codeEditorService';
import { IRange } from 'td/editor/common/core/range';
import { ScrollType } from 'td/editor/common/editorCommon';
import { ITextModel } from 'td/editor/common/model';
import { IContextKey, IContextKeyService } from 'td/platform/contextkey/common/contextkey';
import { ITextResourceEditorInput } from 'td/platform/editor/common/editor';
import { InstantiationType, registerSingleton } from 'td/platform/instantiation/common/extensions';
import { IThemeService } from 'td/platform/theme/common/themeService';

export class StandaloneCodeEditorService extends AbstractCodeEditorService {

	private readonly _editorIsOpen: IContextKey<boolean>;
	private _activeCodeEditor: ICodeEditor | null;

	constructor(
		@IContextKeyService contextKeyService: IContextKeyService,
		@IThemeService themeService: IThemeService,
	) {
		super(themeService);
		this._register(this.onCodeEditorAdd(() => this._checkContextKey()));
		this._register(this.onCodeEditorRemove(() => this._checkContextKey()));
		this._editorIsOpen = contextKeyService.createKey('editorIsOpen', false);
		this._activeCodeEditor = null;

		this._register(this.registerCodeEditorOpenHandler(async (input, source, sideBySide) => {
			if (!source) {
				return null;
			}
			return this.doOpenEditor(source, input);
		}));
	}

	private _checkContextKey(): void {
		let hasCodeEditor = false;
		for (const editor of this.listCodeEditors()) {
			if (!editor.isSimpleWidget) {
				hasCodeEditor = true;
				break;
			}
		}
		this._editorIsOpen.set(hasCodeEditor);
	}

	public setActiveCodeEditor(activeCodeEditor: ICodeEditor | null): void {
		this._activeCodeEditor = activeCodeEditor;
	}

	public getActiveCodeEditor(): ICodeEditor | null {
		return this._activeCodeEditor;
	}


	private doOpenEditor(editor: ICodeEditor, input: ITextResourceEditorInput): ICodeEditor | null {
		const model = this.findModel(editor, input.resource);
		if (!model) {
			if (input.resource) {

				const schema = input.resource.scheme;
				if (schema === Schemas.http || schema === Schemas.https) {
					// This is a fully qualified http or https URL
					windowOpenNoOpener(input.resource.toString());
					return editor;
				}
			}
			return null;
		}

		const selection = <IRange>(input.options ? input.options.selection : null);
		if (selection) {
			if (typeof selection.endLineNumber === 'number' && typeof selection.endColumn === 'number') {
				editor.setSelection(selection);
				editor.revealRangeInCenter(selection, ScrollType.Immediate);
			} else {
				const pos = {
					lineNumber: selection.startLineNumber,
					column: selection.startColumn
				};
				editor.setPosition(pos);
				editor.revealPositionInCenter(pos, ScrollType.Immediate);
			}
		}

		return editor;
	}

	private findModel(editor: ICodeEditor, resource: URI): ITextModel | null {
		const model = editor.getModel();
		if (model && model.uri.toString() !== resource.toString()) {
			return null;
		}

		return model;
	}
}

registerSingleton(ICodeEditorService, StandaloneCodeEditorService, InstantiationType.Eager);

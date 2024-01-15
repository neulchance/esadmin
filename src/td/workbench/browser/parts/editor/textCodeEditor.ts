/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {localize} from 'td/nls';
import {URI} from 'td/base/common/uri';
import {assertIsDefined} from 'td/base/common/types';
import {ITextEditorPane} from 'td/workbench/common/editor';
import {applyTextEditorOptions} from 'td/workbench/common/editor/editorOptions';
import {IContextKeyService} from 'td/platform/contextkey/common/contextkey';
import {ITextEditorOptions} from 'td/platform/editor/common/editor';
import {isEqual} from 'td/base/common/resources';
import {IEditorOptions as ICodeEditorOptions} from 'td/editor/common/config/editorOptions';
import {CodeEditorWidget, ICodeEditorWidgetOptions} from 'td/editor/browser/widget/codeEditorWidget';
import {IEditorViewState, ScrollType} from 'td/editor/common/editorCommon';
import {ICodeEditor} from 'td/editor/browser/editorBrowser';
import {AbstractTextEditor} from 'td/workbench/browser/parts/editor/textEditor';
import {Dimension} from 'td/base/browser/dom';
import {IEditorGroup} from 'td/workbench/services/editor/common/editorGroupsService';

/**
 * A text editor using the code editor widget.
 */
export abstract class AbstractTextCodeEditor<T extends IEditorViewState> extends AbstractTextEditor<T> implements ITextEditorPane {

	protected editorControl: ICodeEditor | undefined = undefined;

	override get scopedContextKeyService(): IContextKeyService | undefined {
		return this.editorControl?.invokeWithinContext(accessor => accessor.get(IContextKeyService));
	}

	override getTitle(): string {
		if (this.input) {
			return this.input.getName();
		}

		return localize('textEditor', "Text Editor");
	}

	protected createEditorControl(parent: HTMLElement, initialOptions: ICodeEditorOptions): void {
		this.editorControl = this._register(this.instantiationService.createInstance(CodeEditorWidget, parent, initialOptions, this.getCodeEditorWidgetOptions()));
	}

	protected getCodeEditorWidgetOptions(): ICodeEditorWidgetOptions {
		return Object.create(null);
	}

	protected updateEditorControlOptions(options: ICodeEditorOptions): void {
		this.editorControl?.updateOptions(options);
	}

	protected getMainControl(): ICodeEditor | undefined {
		return this.editorControl;
	}

	override getControl(): ICodeEditor | undefined {
		return this.editorControl;
	}

	protected override computeEditorViewState(resource: URI): T | undefined {
		if (!this.editorControl) {
			return undefined;
		}

		const model = this.editorControl.getModel();
		if (!model) {
			return undefined; // view state always needs a model
		}

		const modelUri = model.uri;
		if (!modelUri) {
			return undefined; // model URI is needed to make sure we save the view state correctly
		}

		if (!isEqual(modelUri, resource)) {
			return undefined; // prevent saving view state for a model that is not the expected one
		}

		return this.editorControl.saveViewState() as unknown as T ?? undefined;
	}

	override setOptions(options: ITextEditorOptions | undefined): void {
		super.setOptions(options);

		if (options) {
			applyTextEditorOptions(options, assertIsDefined(this.editorControl), ScrollType.Smooth);
		}
	}

	override focus(): void {
		super.focus();

		this.editorControl?.focus();
	}

	override hasFocus(): boolean {
		return this.editorControl?.hasTextFocus() || super.hasFocus();
	}

	protected override setEditorVisible(visible: boolean, group: IEditorGroup | undefined): void {
		super.setEditorVisible(visible, group);

		if (visible) {
			this.editorControl?.onVisible();
		} else {
			this.editorControl?.onHide();
		}
	}

	override layout(dimension: Dimension): void {
		this.editorControl?.layout(dimension);
	}
}

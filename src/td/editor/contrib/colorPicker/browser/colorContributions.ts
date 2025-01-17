/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {Disposable} from 'td/base/common/lifecycle';
import {ICodeEditor, IEditorMouseEvent, MouseTargetType} from 'td/editor/browser/editorBrowser';
import {EditorContributionInstantiation, registerEditorContribution} from 'td/editor/browser/editorExtensions';
import {EditorOption} from 'td/editor/common/config/editorOptions';
import {Range} from 'td/editor/common/core/range';
import {IEditorContribution} from 'td/editor/common/editorCommon';
import {ColorDecorationInjectedTextMarker} from 'td/editor/contrib/colorPicker/browser/colorDetector';
import {ColorHoverParticipant} from 'td/editor/contrib/colorPicker/browser/colorHoverParticipant';
import {HoverController} from 'td/editor/contrib/hover/browser/hover';
import {HoverStartMode, HoverStartSource} from 'td/editor/contrib/hover/browser/hoverOperation';
import {HoverParticipantRegistry} from 'td/editor/contrib/hover/browser/hoverTypes';

export class ColorContribution extends Disposable implements IEditorContribution {

	public static readonly ID: string = 'editor.contrib.colorContribution';

	static readonly RECOMPUTE_TIME = 1000; // ms

	constructor(private readonly _editor: ICodeEditor,
	) {
		super();
		this._register(_editor.onMouseDown((e) => this.onMouseDown(e)));
	}

	override dispose(): void {
		super.dispose();
	}

	private onMouseDown(mouseEvent: IEditorMouseEvent) {

		const colorDecoratorsActivatedOn = this._editor.getOption(EditorOption.colorDecoratorsActivatedOn);
		if (colorDecoratorsActivatedOn !== 'click' && colorDecoratorsActivatedOn !== 'clickAndHover') {
			return;
		}

		const target = mouseEvent.target;

		if (target.type !== MouseTargetType.CONTENT_TEXT) {
			return;
		}

		if (!target.detail.injectedText) {
			return;
		}

		if (target.detail.injectedText.options.attachedData !== ColorDecorationInjectedTextMarker) {
			return;
		}

		if (!target.range) {
			return;
		}

		const hoverController = this._editor.getContribution<HoverController>(HoverController.ID);
		if (!hoverController) {
			return;
		}
		if (!hoverController.isColorPickerVisible) {
			const range = new Range(target.range.startLineNumber, target.range.startColumn + 1, target.range.endLineNumber, target.range.endColumn + 1);
			hoverController.showContentHover(range, HoverStartMode.Immediate, HoverStartSource.Mouse, false, true);
		}
	}
}

registerEditorContribution(ColorContribution.ID, ColorContribution, EditorContributionInstantiation.BeforeFirstInteraction);
HoverParticipantRegistry.register(ColorHoverParticipant);

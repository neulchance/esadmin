/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from 'td/base/browser/dom';
import {MarkdownString} from 'td/base/common/htmlContent';
import {DisposableStore, IDisposable} from 'td/base/common/lifecycle';
import {autorun, constObservable} from 'td/base/common/observable';
import {ICodeEditor, IEditorMouseEvent, MouseTargetType} from 'td/editor/browser/editorBrowser';
import {EditorOption} from 'td/editor/common/config/editorOptions';
import {Range} from 'td/editor/common/core/range';
import {ILanguageService} from 'td/editor/common/languages/language';
import {IModelDecoration} from 'td/editor/common/model';
import {HoverAnchor, HoverAnchorType, HoverForeignElementAnchor, IEditorHoverParticipant, IEditorHoverRenderContext, IHoverPart} from 'td/editor/contrib/hover/browser/hoverTypes';
import {InlineCompletionsController} from 'td/editor/contrib/inlineCompletions/browser/inlineCompletionsController';
import {InlineSuggestionHintsContentWidget} from 'td/editor/contrib/inlineCompletions/browser/inlineCompletionsHintsWidget';
import {MarkdownRenderer} from 'td/editor/browser/widget/markdownRenderer/browser/markdownRenderer';
import * as nls from 'td/nls';
import {IAccessibilityService} from 'td/platform/accessibility/common/accessibility';
import {IInstantiationService} from 'td/platform/instantiation/common/instantiation';
import {IOpenerService} from 'td/platform/opener/common/opener';
import {ITelemetryService} from 'td/platform/telemetry/common/telemetry';

export class InlineCompletionsHover implements IHoverPart {
	constructor(
		public readonly owner: IEditorHoverParticipant<InlineCompletionsHover>,
		public readonly range: Range,
		public readonly controller: InlineCompletionsController
	) { }

	public isValidForHoverAnchor(anchor: HoverAnchor): boolean {
		return (
			anchor.type === HoverAnchorType.Range
			&& this.range.startColumn <= anchor.range.startColumn
			&& this.range.endColumn >= anchor.range.endColumn
		);
	}
}

export class InlineCompletionsHoverParticipant implements IEditorHoverParticipant<InlineCompletionsHover> {

	public readonly hoverOrdinal: number = 4;

	constructor(
		private readonly _editor: ICodeEditor,
		@ILanguageService private readonly _languageService: ILanguageService,
		@IOpenerService private readonly _openerService: IOpenerService,
		@IAccessibilityService private readonly accessibilityService: IAccessibilityService,
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@ITelemetryService private readonly _telemetryService: ITelemetryService,
	) {
	}

	suggestHoverAnchor(mouseEvent: IEditorMouseEvent): HoverAnchor | null {
		const controller = InlineCompletionsController.get(this._editor);
		if (!controller) {
			return null;
		}

		const target = mouseEvent.target;
		if (target.type === MouseTargetType.CONTENT_VIEW_ZONE) {
			// handle the case where the mouse is over the view zone
			const viewZoneData = target.detail;
			if (controller.shouldShowHoverAtViewZone(viewZoneData.viewZoneId)) {
				return new HoverForeignElementAnchor(1000, this, Range.fromPositions(this._editor.getModel()!.validatePosition(viewZoneData.positionBefore || viewZoneData.position)), mouseEvent.event.posx, mouseEvent.event.posy, false);
			}
		}
		if (target.type === MouseTargetType.CONTENT_EMPTY) {
			// handle the case where the mouse is over the empty portion of a line following ghost text
			if (controller.shouldShowHoverAt(target.range)) {
				return new HoverForeignElementAnchor(1000, this, target.range, mouseEvent.event.posx, mouseEvent.event.posy, false);
			}
		}
		if (target.type === MouseTargetType.CONTENT_TEXT) {
			// handle the case where the mouse is directly over ghost text
			const mightBeForeignElement = target.detail.mightBeForeignElement;
			if (mightBeForeignElement && controller.shouldShowHoverAt(target.range)) {
				return new HoverForeignElementAnchor(1000, this, target.range, mouseEvent.event.posx, mouseEvent.event.posy, false);
			}
		}
		return null;
	}

	computeSync(anchor: HoverAnchor, lineDecorations: IModelDecoration[]): InlineCompletionsHover[] {
		if (this._editor.getOption(EditorOption.inlineSuggest).showToolbar !== 'onHover') {
			return [];
		}

		const controller = InlineCompletionsController.get(this._editor);
		if (controller && controller.shouldShowHoverAt(anchor.range)) {
			return [new InlineCompletionsHover(this, anchor.range, controller)];
		}
		return [];
	}

	renderHoverParts(context: IEditorHoverRenderContext, hoverParts: InlineCompletionsHover[]): IDisposable {
		const disposableStore = new DisposableStore();
		const part = hoverParts[0];

		this._telemetryService.publicLog2<{}, {
			owner: 'hediet';
			comment: 'This event tracks whenever an inline completion hover is shown.';
		}>('inlineCompletionHover.shown');

		if (this.accessibilityService.isScreenReaderOptimized() && !this._editor.getOption(EditorOption.screenReaderAnnounceInlineSuggestion)) {
			this.renderScreenReaderText(context, part, disposableStore);
		}

		const model = part.controller.model.get()!;

		const w = this._instantiationService.createInstance(InlineSuggestionHintsContentWidget, this._editor, false,
			constObservable(null),
			model.selectedInlineCompletionIndex,
			model.inlineCompletionsCount,
			model.selectedInlineCompletion.map(v => /** @description commands */ v?.inlineCompletion.source.inlineCompletions.commands ?? []),
		);
		context.fragment.appendChild(w.getDomNode());

		model.triggerExplicitly();

		disposableStore.add(w);

		return disposableStore;
	}

	private renderScreenReaderText(context: IEditorHoverRenderContext, part: InlineCompletionsHover, disposableStore: DisposableStore) {
		const $ = dom.$;
		const markdownHoverElement = $('div.hover-row.markdown-hover');
		const hoverContentsElement = dom.append(markdownHoverElement, $('div.hover-contents', {['aria-live']: 'assertive'}));
		const renderer = disposableStore.add(new MarkdownRenderer({editor: this._editor}, this._languageService, this._openerService));
		const render = (code: string) => {
			disposableStore.add(renderer.onDidRenderAsync(() => {
				hoverContentsElement.className = 'hover-contents code-hover-contents';
				context.onContentsChanged();
			}));

			const inlineSuggestionAvailable = nls.localize('inlineSuggestionFollows', "Suggestion:");
			const renderedContents = disposableStore.add(renderer.render(new MarkdownString().appendText(inlineSuggestionAvailable).appendCodeblock('text', code)));
			hoverContentsElement.replaceChildren(renderedContents.element);
		};

		disposableStore.add(autorun(reader => {
			/** @description update hover */
			const ghostText = part.controller.model.read(reader)?.ghostText.read(reader);
			if (ghostText) {
				const lineText = this._editor.getModel()!.getLineContent(ghostText.lineNumber);
				render(ghostText.renderForScreenReader(lineText));
			} else {
				dom.reset(hoverContentsElement);
			}
		}));

		context.fragment.appendChild(markdownHoverElement);
	}
}

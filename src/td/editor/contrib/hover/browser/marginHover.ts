/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from 'td/base/browser/dom';
import {asArray} from 'td/base/common/arrays';
import {IMarkdownString, isEmptyMarkdownString} from 'td/base/common/htmlContent';
import {Disposable, DisposableStore} from 'td/base/common/lifecycle';
import {MarkdownRenderer} from 'td/editor/browser/widget/markdownRenderer/browser/markdownRenderer';
import {ICodeEditor, IOverlayWidget, IOverlayWidgetPosition} from 'td/editor/browser/editorBrowser';
import {ConfigurationChangedEvent, EditorOption} from 'td/editor/common/config/editorOptions';
import {ILanguageService} from 'td/editor/common/languages/language';
import {HoverOperation, HoverStartMode, IHoverComputer} from 'td/editor/contrib/hover/browser/hoverOperation';
import {IOpenerService} from 'td/platform/opener/common/opener';
import {HoverWidget} from 'td/base/browser/ui/hover/hoverWidget';
import {GlyphMarginLane} from 'td/editor/common/model';

const $ = dom.$;

export interface IHoverMessage {
	value: IMarkdownString;
}

type LaneOrLineNumber = GlyphMarginLane | 'lineNo';

export class MarginHoverWidget extends Disposable implements IOverlayWidget {

	public static readonly ID = 'editor.contrib.modesGlyphHoverWidget';

	private readonly _editor: ICodeEditor;
	private readonly _hover: HoverWidget;

	private _isVisible: boolean;
	private _messages: IHoverMessage[];

	private readonly _markdownRenderer: MarkdownRenderer;
	private readonly _computer: MarginHoverComputer;
	private readonly _hoverOperation: HoverOperation<IHoverMessage>;
	private readonly _renderDisposeables = this._register(new DisposableStore());

	constructor(
		editor: ICodeEditor,
		languageService: ILanguageService,
		openerService: IOpenerService,
	) {
		super();
		this._editor = editor;

		this._isVisible = false;
		this._messages = [];

		this._hover = this._register(new HoverWidget());
		this._hover.containerDomNode.classList.toggle('hidden', !this._isVisible);

		this._markdownRenderer = this._register(new MarkdownRenderer({editor: this._editor}, languageService, openerService));
		this._computer = new MarginHoverComputer(this._editor);
		this._hoverOperation = this._register(new HoverOperation(this._editor, this._computer));
		this._register(this._hoverOperation.onResult((result) => {
			this._withResult(result.value);
		}));

		this._register(this._editor.onDidChangeModelDecorations(() => this._onModelDecorationsChanged()));
		this._register(this._editor.onDidChangeConfiguration((e: ConfigurationChangedEvent) => {
			if (e.hasChanged(EditorOption.fontInfo)) {
				this._updateFont();
			}
		}));

		this._editor.addOverlayWidget(this);
	}

	public override dispose(): void {
		this._editor.removeOverlayWidget(this);
		super.dispose();
	}

	public getId(): string {
		return MarginHoverWidget.ID;
	}

	public getDomNode(): HTMLElement {
		return this._hover.containerDomNode;
	}

	public getPosition(): IOverlayWidgetPosition | null {
		return null;
	}

	private _updateFont(): void {
		const codeClasses: HTMLElement[] = Array.prototype.slice.call(this._hover.contentsDomNode.getElementsByClassName('code'));
		codeClasses.forEach(node => this._editor.applyFontInfo(node));
	}

	private _onModelDecorationsChanged(): void {
		if (this._isVisible) {
			// The decorations have changed and the hover is visible,
			// we need to recompute the displayed text
			this._hoverOperation.cancel();
			this._hoverOperation.start(HoverStartMode.Delayed);
		}
	}

	public startShowingAt(lineNumber: number, laneOrLine: LaneOrLineNumber): void {
		if (this._computer.lineNumber === lineNumber && this._computer.lane === laneOrLine) {
			// We have to show the widget at the exact same line number as before, so no work is needed
			return;
		}

		this._hoverOperation.cancel();

		this.hide();

		this._computer.lineNumber = lineNumber;
		this._computer.lane = laneOrLine;
		this._hoverOperation.start(HoverStartMode.Delayed);
	}

	public hide(): void {
		this._computer.lineNumber = -1;
		this._hoverOperation.cancel();
		if (!this._isVisible) {
			return;
		}
		this._isVisible = false;
		this._hover.containerDomNode.classList.toggle('hidden', !this._isVisible);
	}

	private _withResult(result: IHoverMessage[]): void {
		this._messages = result;

		if (this._messages.length > 0) {
			this._renderMessages(this._computer.lineNumber, this._messages);
		} else {
			this.hide();
		}
	}

	private _renderMessages(lineNumber: number, messages: IHoverMessage[]): void {
		this._renderDisposeables.clear();

		const fragment = document.createDocumentFragment();

		for (const msg of messages) {
			const markdownHoverElement = $('div.hover-row.markdown-hover');
			const hoverContentsElement = dom.append(markdownHoverElement, $('div.hover-contents'));
			const renderedContents = this._renderDisposeables.add(this._markdownRenderer.render(msg.value));
			hoverContentsElement.appendChild(renderedContents.element);
			fragment.appendChild(markdownHoverElement);
		}

		this._updateContents(fragment);
		this._showAt(lineNumber);
	}

	private _updateContents(node: Node): void {
		this._hover.contentsDomNode.textContent = '';
		this._hover.contentsDomNode.appendChild(node);
		this._updateFont();
	}

	private _showAt(lineNumber: number): void {
		if (!this._isVisible) {
			this._isVisible = true;
			this._hover.containerDomNode.classList.toggle('hidden', !this._isVisible);
		}

		const editorLayout = this._editor.getLayoutInfo();
		const topForLineNumber = this._editor.getTopForLineNumber(lineNumber);
		const editorScrollTop = this._editor.getScrollTop();
		const lineHeight = this._editor.getOption(EditorOption.lineHeight);
		const nodeHeight = this._hover.containerDomNode.clientHeight;
		const top = topForLineNumber - editorScrollTop - ((nodeHeight - lineHeight) / 2);
		const left = editorLayout.glyphMarginLeft + editorLayout.glyphMarginWidth + (this._computer.lane === 'lineNo' ? editorLayout.lineNumbersWidth : 0);
		this._hover.containerDomNode.style.left = `${left}px`;
		this._hover.containerDomNode.style.top = `${Math.max(Math.round(top), 0)}px`;
	}
}

class MarginHoverComputer implements IHoverComputer<IHoverMessage> {

	private _lineNumber: number = -1;
	private _laneOrLine: LaneOrLineNumber = GlyphMarginLane.Center;

	public get lineNumber(): number {
		return this._lineNumber;
	}

	public set lineNumber(value: number) {
		this._lineNumber = value;
	}

	public get lane(): LaneOrLineNumber {
		return this._laneOrLine;
	}

	public set lane(value: LaneOrLineNumber) {
		this._laneOrLine = value;
	}

	constructor(
		private readonly _editor: ICodeEditor
	) {
	}

	public computeSync(): IHoverMessage[] {

		const toHoverMessage = (contents: IMarkdownString): IHoverMessage => {
			return {
				value: contents
			};
		};

		const lineDecorations = this._editor.getLineDecorations(this._lineNumber);

		const result: IHoverMessage[] = [];
		const isLineHover = this._laneOrLine === 'lineNo';
		if (!lineDecorations) {
			return result;
		}

		for (const d of lineDecorations) {
			const lane = d.options.glyphMargin?.position ?? GlyphMarginLane.Center;
			if (!isLineHover && lane !== this._laneOrLine) {
				continue;
			}

			const hoverMessage = isLineHover ? d.options.lineNumberHoverMessage : d.options.glyphMarginHoverMessage;
			if (!hoverMessage || isEmptyMarkdownString(hoverMessage)) {
				continue;
			}

			result.push(...asArray(hoverMessage).map(toHoverMessage));
		}

		return result;
	}
}

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createTrustedTypesPolicy } from 'td/base/browser/trustedTypes';
import * as strings from 'td/base/common/strings';
import { ColorId, FontStyle, MetadataConsts } from 'td/editor/common/encodedTokenAttributes';
import { ILanguageIdCodec, ITokenizationSupport, TokenizationRegistry } from 'td/editor/common/languages';
import { ILanguageService } from 'td/editor/common/languages/language';
import { ITextModel } from 'td/editor/common/model';
import { IViewLineTokens, LineTokens } from 'td/editor/common/tokens/lineTokens';
import { RenderLineInput, renderViewLine2 as renderViewLine } from 'td/editor/common/viewLayout/viewLineRenderer';
import { ViewLineRenderingData } from 'td/editor/common/viewModel';
import { MonarchTokenizer } from 'td/editor/standalone/common/monarch/monarchLexer';
import { IStandaloneThemeService } from 'td/editor/standalone/common/standaloneTheme';

const ttPolicy = createTrustedTypesPolicy('standaloneColorizer', { createHTML: value => value });

export interface IColorizerOptions {
	tabSize?: number;
}

export interface IColorizerElementOptions extends IColorizerOptions {
	theme?: string;
	mimeType?: string;
}

export class Colorizer {

	public static colorizeElement(themeService: IStandaloneThemeService, languageService: ILanguageService, domNode: HTMLElement, options: IColorizerElementOptions): Promise<void> {
		options = options || {};
		const theme = options.theme || 'vs';
		const mimeType = options.mimeType || domNode.getAttribute('lang') || domNode.getAttribute('data-lang');
		if (!mimeType) {
			console.error('Mode not detected');
			return Promise.resolve();
		}
		const languageId = languageService.getLanguageIdByMimeType(mimeType) || mimeType;

		themeService.setTheme(theme);

		const text = domNode.firstChild ? domNode.firstChild.nodeValue : '';
		domNode.className += ' ' + theme;
		const render = (str: string) => {
			const trustedhtml = ttPolicy?.createHTML(str) ?? str;
			domNode.innerHTML = trustedhtml as string;
		};
		return this.colorize(languageService, text || '', languageId, options).then(render, (err) => console.error(err));
	}

	public static async colorize(languageService: ILanguageService, text: string, languageId: string, options: IColorizerOptions | null | undefined): Promise<string> {
		const languageIdCodec = languageService.languageIdCodec;
		let tabSize = 4;
		if (options && typeof options.tabSize === 'number') {
			tabSize = options.tabSize;
		}

		if (strings.startsWithUTF8BOM(text)) {
			text = text.substr(1);
		}
		const lines = strings.splitLines(text);
		if (!languageService.isRegisteredLanguageId(languageId)) {
			return _fakeColorize(lines, tabSize, languageIdCodec);
		}

		const tokenizationSupport = await TokenizationRegistry.getOrCreate(languageId);
		if (tokenizationSupport) {
			return _colorize(lines, tabSize, tokenizationSupport, languageIdCodec);
		}

		return _fakeColorize(lines, tabSize, languageIdCodec);
	}

	public static colorizeLine(line: string, mightContainNonBasicASCII: boolean, mightContainRTL: boolean, tokens: IViewLineTokens, tabSize: number = 4): string {
		const isBasicASCII = ViewLineRenderingData.isBasicASCII(line, mightContainNonBasicASCII);
		const containsRTL = ViewLineRenderingData.containsRTL(line, isBasicASCII, mightContainRTL);
		const renderResult = renderViewLine(new RenderLineInput(
			false,
			true,
			line,
			false,
			isBasicASCII,
			containsRTL,
			0,
			tokens,
			[],
			tabSize,
			0,
			0,
			0,
			0,
			-1,
			'none',
			false,
			false,
			null
		));
		return renderResult.html;
	}

	public static colorizeModelLine(model: ITextModel, lineNumber: number, tabSize: number = 4): string {
		const content = model.getLineContent(lineNumber);
		model.tokenization.forceTokenization(lineNumber);
		const tokens = model.tokenization.getLineTokens(lineNumber);
		const inflatedTokens = tokens.inflate();
		return this.colorizeLine(content, model.mightContainNonBasicASCII(), model.mightContainRTL(), inflatedTokens, tabSize);
	}
}

function _colorize(lines: string[], tabSize: number, tokenizationSupport: ITokenizationSupport, languageIdCodec: ILanguageIdCodec): Promise<string> {
	return new Promise<string>((c, e) => {
		const execute = () => {
			const result = _actualColorize(lines, tabSize, tokenizationSupport, languageIdCodec);
			if (tokenizationSupport instanceof MonarchTokenizer) {
				const status = tokenizationSupport.getLoadStatus();
				if (status.loaded === false) {
					status.promise.then(execute, e);
					return;
				}
			}
			c(result);
		};
		execute();
	});
}

function _fakeColorize(lines: string[], tabSize: number, languageIdCodec: ILanguageIdCodec): string {
	let html: string[] = [];

	const defaultMetadata = (
		(FontStyle.None << MetadataConsts.FONT_STYLE_OFFSET)
		| (ColorId.DefaultForeground << MetadataConsts.FOREGROUND_OFFSET)
		| (ColorId.DefaultBackground << MetadataConsts.BACKGROUND_OFFSET)
	) >>> 0;

	const tokens = new Uint32Array(2);
	tokens[0] = 0;
	tokens[1] = defaultMetadata;

	for (let i = 0, length = lines.length; i < length; i++) {
		const line = lines[i];

		tokens[0] = line.length;
		const lineTokens = new LineTokens(tokens, line, languageIdCodec);

		const isBasicASCII = ViewLineRenderingData.isBasicASCII(line, /* check for basic ASCII */true);
		const containsRTL = ViewLineRenderingData.containsRTL(line, isBasicASCII, /* check for RTL */true);
		const renderResult = renderViewLine(new RenderLineInput(
			false,
			true,
			line,
			false,
			isBasicASCII,
			containsRTL,
			0,
			lineTokens,
			[],
			tabSize,
			0,
			0,
			0,
			0,
			-1,
			'none',
			false,
			false,
			null
		));

		html = html.concat(renderResult.html);
		html.push('<br/>');
	}

	return html.join('');
}

function _actualColorize(lines: string[], tabSize: number, tokenizationSupport: ITokenizationSupport, languageIdCodec: ILanguageIdCodec): string {
	let html: string[] = [];
	let state = tokenizationSupport.getInitialState();

	for (let i = 0, length = lines.length; i < length; i++) {
		const line = lines[i];
		const tokenizeResult = tokenizationSupport.tokenizeEncoded(line, true, state);
		LineTokens.convertToEndOffset(tokenizeResult.tokens, line.length);
		const lineTokens = new LineTokens(tokenizeResult.tokens, line, languageIdCodec);
		const isBasicASCII = ViewLineRenderingData.isBasicASCII(line, /* check for basic ASCII */true);
		const containsRTL = ViewLineRenderingData.containsRTL(line, isBasicASCII, /* check for RTL */true);
		const renderResult = renderViewLine(new RenderLineInput(
			false,
			true,
			line,
			false,
			isBasicASCII,
			containsRTL,
			0,
			lineTokens.inflate(),
			[],
			tabSize,
			0,
			0,
			0,
			0,
			-1,
			'none',
			false,
			false,
			null
		));

		html = html.concat(renderResult.html);
		html.push('<br/>');

		state = tokenizeResult.endState;
	}

	return html.join('');
}

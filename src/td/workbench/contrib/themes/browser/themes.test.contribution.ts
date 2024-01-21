/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {URI} from 'td/base/common/uri';
import {ILanguageService} from 'td/editor/common/languages/language';
import {CommandsRegistry} from 'td/platform/commands/common/commands';
import {IInstantiationService, ServicesAccessor} from 'td/platform/instantiation/common/instantiation';
import {IWorkbenchThemeService, IWorkbenchColorTheme} from 'td/workbench/services/themes/common/workbenchThemeService';
import {IEditorService} from 'td/workbench/services/editor/common/editorService';
import {EditorResourceAccessor} from 'td/workbench/common/editor';
// import {ITextMateTokenizationService} from 'td/workbench/services/textMate/browser/textMateTokenizationFeature';
// import type {IGrammar, StateStack} from 'vscode-textmate';
import {TokenizationRegistry} from 'td/editor/common/languages';
import {TokenMetadata} from 'td/editor/common/encodedTokenAttributes';
import {ThemeRule, findMatchingThemeRule} from 'td/workbench/services/textMate/common/TMHelper';
import {Color} from 'td/base/common/color';
import {IFileService} from 'td/platform/files/common/files';
import {basename} from 'td/base/common/resources';
import {Schemas} from 'td/base/common/network';
import {splitLines} from 'td/base/common/strings';

interface IToken {
	c: string;
	t: string;
	r: { [themeName: string]: string | undefined };
}

interface IThemedToken {
	text: string;
	color: Color;
}

interface IThemesResult {
	[themeName: string]: {
		document: ThemeDocument;
		tokens: IThemedToken[];
	};
}

class ThemeDocument {
	private readonly _theme: IWorkbenchColorTheme;
	private readonly _cache: { [scopes: string]: ThemeRule };
	private readonly _defaultColor: string;

	constructor(theme: IWorkbenchColorTheme) {
		this._theme = theme;
		this._cache = Object.create(null);
		this._defaultColor = '#000000';
		for (let i = 0, len = this._theme.tokenColors.length; i < len; i++) {
			const rule = this._theme.tokenColors[i];
			if (!rule.scope) {
				this._defaultColor = rule.settings.foreground!;
			}
		}
	}

	private _generateExplanation(selector: string, color: Color): string {
		return `${selector}: ${Color.Format.CSS.formatHexA(color, true).toUpperCase()}`;
	}

	public explainTokenColor(scopes: string, color: Color): string {

		const matchingRule = this._findMatchingThemeRule(scopes);
		if (!matchingRule) {
			const expected = Color.fromHex(this._defaultColor);
			// No matching rule
			if (!color.equals(expected)) {
				throw new Error(`[${this._theme.label}]: Unexpected color ${Color.Format.CSS.formatHexA(color)} for ${scopes}. Expected default ${Color.Format.CSS.formatHexA(expected)}`);
			}
			return this._generateExplanation('default', color);
		}

		const expected = Color.fromHex(matchingRule.settings.foreground!);
		if (!color.equals(expected)) {
			throw new Error(`[${this._theme.label}]: Unexpected color ${Color.Format.CSS.formatHexA(color)} for ${scopes}. Expected ${Color.Format.CSS.formatHexA(expected)} coming in from ${matchingRule.rawSelector}`);
		}
		return this._generateExplanation(matchingRule.rawSelector, color);
	}

	private _findMatchingThemeRule(scopes: string): ThemeRule {
		if (!this._cache[scopes]) {
			this._cache[scopes] = findMatchingThemeRule(this._theme, scopes.split(' '))!;
		}
		return this._cache[scopes];
	}
}

class Snapper {

	constructor(
		@ILanguageService private readonly languageService: ILanguageService,
		@IWorkbenchThemeService private readonly themeService: IWorkbenchThemeService,
		// @ITextMateTokenizationService private readonly textMateService: ITextMateTokenizationService
	) {
	}


	private _enrichResult(result: IToken[], themesResult: IThemesResult): void {
		const index: { [themeName: string]: number } = {};
		const themeNames = Object.keys(themesResult);
		for (const themeName of themeNames) {
			index[themeName] = 0;
		}

		for (let i = 0, len = result.length; i < len; i++) {
			const token = result[i];

			for (const themeName of themeNames) {
				const themedToken = themesResult[themeName].tokens[index[themeName]];

				themedToken.text = themedToken.text.substr(token.c.length);
				token.r[themeName] = themesResult[themeName].document.explainTokenColor(token.t, themedToken.color);
				if (themedToken.text.length === 0) {
					index[themeName]++;
				}
			}
		}
	}

	public captureSyntaxTokens(fileName: string, content: string): Promise<IToken[]> {
		const languageId = this.languageService.guessLanguageIdByFilepathOrFirstLine(URI.file(fileName));
		return this.textMateService.createTokenizer(languageId!).then((grammar) => {
			if (!grammar) {
				return [];
			}
			const lines = splitLines(content);

			const result = this._tokenize(grammar, lines);
			return this._getThemesResult(grammar, lines).then((themesResult) => {
				this._enrichResult(result, themesResult);
				return result.filter(t => t.c.length > 0);
			});
		});
	}
}

CommandsRegistry.registerCommand('_workbench.captureSyntaxTokens', function (accessor: ServicesAccessor, resource: URI) {

	const process = (resource: URI) => {
		const fileService = accessor.get(IFileService);
		const fileName = basename(resource);
		const snapper = accessor.get(IInstantiationService).createInstance(Snapper);

		return fileService.readFile(resource).then(content => {
			return snapper.captureSyntaxTokens(fileName, content.value.toString());
		});
	};

	if (!resource) {
		const editorService = accessor.get(IEditorService);
		const file = editorService.activeEditor ? EditorResourceAccessor.getCanonicalUri(editorService.activeEditor, {filterByScheme: Schemas.file}) : null;
		if (file) {
			process(file).then(result => {
				console.log(result);
			});
		} else {
			console.log('No file editor active');
		}
	} else {
		return process(resource);
	}
	return undefined;
});

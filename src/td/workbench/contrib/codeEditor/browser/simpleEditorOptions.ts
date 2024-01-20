/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IEditorOptions} from 'td/editor/common/config/editorOptions';
import {ICodeEditorWidgetOptions} from 'td/editor/browser/widget/codeEditorWidget';
import {ContextMenuController} from 'td/editor/contrib/contextmenu/browser/contextmenu';
import {SnippetController2} from 'td/editor/contrib/snippet/browser/snippetController2';
import {SuggestController} from 'td/editor/contrib/suggest/browser/suggestController';
import {MenuPreventer} from 'td/workbench/contrib/codeEditor/browser/menuPreventer';
import {SelectionClipboardContributionID} from 'td/workbench/contrib/codeEditor/browser/selectionClipboard';
import {TabCompletionController} from 'td/workbench/contrib/snippets/browser/tabCompletion';
import {EditorExtensionsRegistry} from 'td/editor/browser/editorExtensions';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';

export function getSimpleEditorOptions(configurationService: IConfigurationService): IEditorOptions {
	return {
		wordWrap: 'on',
		overviewRulerLanes: 0,
		glyphMargin: false,
		lineNumbers: 'off',
		folding: false,
		selectOnLineNumbers: false,
		hideCursorInOverviewRuler: true,
		selectionHighlight: false,
		scrollbar: {
			horizontal: 'hidden'
		},
		lineDecorationsWidth: 0,
		overviewRulerBorder: false,
		scrollBeyondLastLine: false,
		renderLineHighlight: 'none',
		fixedOverflowWidgets: true,
		acceptSuggestionOnEnter: 'smart',
		dragAndDrop: false,
		revealHorizontalRightPadding: 5,
		minimap: {
			enabled: false
		},
		guides: {
			indentation: false
		},
		accessibilitySupport: configurationService.getValue<'auto' | 'off' | 'on'>('editor.accessibilitySupport'),
		cursorBlinking: configurationService.getValue<'blink' | 'smooth' | 'phase' | 'expand' | 'solid'>('editor.cursorBlinking')
	};
}

export function getSimpleCodeEditorWidgetOptions(): ICodeEditorWidgetOptions {
	return {
		isSimpleWidget: true,
		contributions: EditorExtensionsRegistry.getSomeEditorContributions([
			MenuPreventer.ID,
			SelectionClipboardContributionID,
			ContextMenuController.ID,
			SuggestController.ID,
			SnippetController2.ID,
			TabCompletionController.ID,
		])
	};
}

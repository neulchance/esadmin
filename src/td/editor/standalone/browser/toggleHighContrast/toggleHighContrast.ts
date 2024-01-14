/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ICodeEditor } from 'td/editor/browser/editorBrowser';
import { EditorAction, ServicesAccessor, registerEditorAction } from 'td/editor/browser/editorExtensions';
import { IStandaloneThemeService } from 'td/editor/standalone/common/standaloneTheme';
import { ToggleHighContrastNLS } from 'td/editor/common/standaloneStrings';
import { isDark, isHighContrast } from 'td/platform/theme/common/theme';
import { HC_BLACK_THEME_NAME, HC_LIGHT_THEME_NAME, VS_DARK_THEME_NAME, VS_LIGHT_THEME_NAME } from 'td/editor/standalone/browser/standaloneThemeService';

class ToggleHighContrast extends EditorAction {

	private _originalThemeName: string | null;

	constructor() {
		super({
			id: 'editor.action.toggleHighContrast',
			label: ToggleHighContrastNLS.toggleHighContrast,
			alias: 'Toggle High Contrast Theme',
			precondition: undefined
		});
		this._originalThemeName = null;
	}

	public run(accessor: ServicesAccessor, editor: ICodeEditor): void {
		const standaloneThemeService = accessor.get(IStandaloneThemeService);
		const currentTheme = standaloneThemeService.getColorTheme();
		if (isHighContrast(currentTheme.type)) {
			// We must toggle back to the integrator's theme
			standaloneThemeService.setTheme(this._originalThemeName || (isDark(currentTheme.type) ? VS_DARK_THEME_NAME : VS_LIGHT_THEME_NAME));
			this._originalThemeName = null;
		} else {
			standaloneThemeService.setTheme(isDark(currentTheme.type) ? HC_BLACK_THEME_NAME : HC_LIGHT_THEME_NAME);
			this._originalThemeName = currentTheme.themeName;
		}
	}
}

registerEditorAction(ToggleHighContrast);

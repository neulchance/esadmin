/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IColorTheme} from 'td/platform/theme/common/themeService';
import {ColorIdentifier} from 'td/platform/theme/common/colorRegistry';
import {Color} from 'td/base/common/color';
import {ColorScheme} from 'td/platform/theme/common/theme';

export class EditorTheme {

	private _theme: IColorTheme;

	public get type(): ColorScheme {
		return this._theme.type;
	}

	public get value(): IColorTheme {
		return this._theme;
	}

	constructor(theme: IColorTheme) {
		this._theme = theme;
	}

	public update(theme: IColorTheme): void {
		this._theme = theme;
	}

	public getColor(color: ColorIdentifier): Color | undefined {
		return this._theme.getColor(color);
	}
}

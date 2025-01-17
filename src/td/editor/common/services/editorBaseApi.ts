/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {CancellationTokenSource} from 'td/base/common/cancellation';
import {Emitter} from 'td/base/common/event';
import {KeyChord, KeyMod as ConstKeyMod} from 'td/base/common/keyCodes';
import {URI} from 'td/base/common/uri';
import {Position} from 'td/editor/common/core/position';
import {Range} from 'td/editor/common/core/range';
import {Selection} from 'td/editor/common/core/selection';
import {Token} from 'td/editor/common/languages';
import * as standaloneEnums from 'td/editor/common/standalone/standaloneEnums';

export class KeyMod {
	public static readonly CtrlCmd: number = ConstKeyMod.CtrlCmd;
	public static readonly Shift: number = ConstKeyMod.Shift;
	public static readonly Alt: number = ConstKeyMod.Alt;
	public static readonly WinCtrl: number = ConstKeyMod.WinCtrl;

	public static chord(firstPart: number, secondPart: number): number {
		return KeyChord(firstPart, secondPart);
	}
}

export function createMonacoBaseAPI(): typeof monaco {
	return {
		editor: undefined!, // undefined override expected here
		languages: undefined!, // undefined override expected here
		CancellationTokenSource: CancellationTokenSource,
		Emitter: Emitter,
		KeyCode: standaloneEnums.KeyCode,
		KeyMod: KeyMod,
		Position: Position,
		Range: Range,
		Selection: <any>Selection,
		SelectionDirection: standaloneEnums.SelectionDirection,
		MarkerSeverity: standaloneEnums.MarkerSeverity,
		MarkerTag: standaloneEnums.MarkerTag,
		Uri: <any>URI,
		Token: Token
	};
}

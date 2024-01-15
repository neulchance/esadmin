/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {Event} from 'td/base/common/event';
import {IKeyboardLayoutInfo, IKeyboardMapping} from 'td/platform/keyboardLayout/common/keyboardLayout';

export interface IKeyboardLayoutData {
	keyboardLayoutInfo: IKeyboardLayoutInfo;
	keyboardMapping: IKeyboardMapping;
}

export interface INativeKeyboardLayoutService {
	readonly _serviceBrand: undefined;
	readonly onDidChangeKeyboardLayout: Event<IKeyboardLayoutData>;
	getKeyboardLayoutData(): Promise<IKeyboardLayoutData>;
}

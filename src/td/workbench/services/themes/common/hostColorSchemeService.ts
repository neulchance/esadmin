/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {Event} from 'td/base/common/event';
import {createDecorator} from 'td/platform/instantiation/common/instantiation';

export const IHostColorSchemeService = createDecorator<IHostColorSchemeService>('hostColorSchemeService');

export interface IHostColorSchemeService {

	readonly _serviceBrand: undefined;

	// readonly dark: boolean;
	// readonly highContrast: boolean;
	readonly onDidChangeColorScheme: Event<void>;

}

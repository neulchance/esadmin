/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {LegacyLinesDiffComputer} from 'td/editor/common/diff/legacyLinesDiffComputer';
import {DefaultLinesDiffComputer} from 'td/editor/common/diff/defaultLinesDiffComputer/defaultLinesDiffComputer';
import {ILinesDiffComputer} from 'td/editor/common/diff/linesDiffComputer';

export const linesDiffComputers = {
	getLegacy: () => new LegacyLinesDiffComputer(),
	getDefault: () => new DefaultLinesDiffComputer(),
} satisfies Record<string, () => ILinesDiffComputer>;

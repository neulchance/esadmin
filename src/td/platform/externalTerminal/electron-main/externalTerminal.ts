/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IExternalTerminalService} from 'td/platform/externalTerminal/common/externalTerminal';
import {createDecorator} from 'td/platform/instantiation/common/instantiation';

export const IExternalTerminalMainService = createDecorator<IExternalTerminalMainService>('externalTerminal');

export interface IExternalTerminalMainService extends IExternalTerminalService {
	readonly _serviceBrand: undefined;
}

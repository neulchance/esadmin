/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IExtensionHostInitData } from 'td/workbench/services/extensions/common/extensionHostProtocol';
import { createDecorator } from 'td/platform/instantiation/common/instantiation';

export const IExtHostInitDataService = createDecorator<IExtHostInitDataService>('IExtHostInitDataService');

export interface IExtHostInitDataService extends Readonly<IExtensionHostInitData> {
	readonly _serviceBrand: undefined;
}


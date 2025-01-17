/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {URI} from 'td/base/common/uri';
import {IExtensionDescription} from 'td/platform/extensions/common/extensions';
import {createDecorator} from 'td/platform/instantiation/common/instantiation';

export const IRemoteExtensionsScannerService = createDecorator<IRemoteExtensionsScannerService>('IRemoteExtensionsScannerService');

export const RemoteExtensionsScannerChannelName = 'remoteExtensionsScanner';

export interface IRemoteExtensionsScannerService {
	readonly _serviceBrand: undefined;

	whenExtensionsReady(): Promise<void>;
	scanExtensions(): Promise<IExtensionDescription[]>;
	scanSingleExtension(extensionLocation: URI, isBuiltin: boolean): Promise<IExtensionDescription | null>;
}

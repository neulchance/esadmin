/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {ISharedProcessService} from 'td/platform/ipc/electron-sandbox/services';
import {IChannel} from 'td/base/parts/ipc/common/ipc';
import {IExtensionTipsService, IExecutableBasedExtensionTip, IConfigBasedExtensionTip} from 'td/platform/extensionManagement/common/extensionManagement';
import {URI} from 'td/base/common/uri';
import {ExtensionTipsService} from 'td/platform/extensionManagement/common/extensionTipsService';
import {IFileService} from 'td/platform/files/common/files';
import {IProductService} from 'td/platform/product/common/productService';
import {Schemas} from 'td/base/common/network';

class NativeExtensionTipsService extends ExtensionTipsService implements IExtensionTipsService {

	private readonly channel: IChannel;

	constructor(
		@IFileService fileService: IFileService,
		@IProductService productService: IProductService,
		@ISharedProcessService sharedProcessService: ISharedProcessService
	) {
		super(fileService, productService);
		this.channel = sharedProcessService.getChannel('extensionTipsService');
	}

	override getConfigBasedTips(folder: URI): Promise<IConfigBasedExtensionTip[]> {
		if (folder.scheme === Schemas.file) {
			return this.channel.call<IConfigBasedExtensionTip[]>('getConfigBasedTips', [folder]);
		}
		return super.getConfigBasedTips(folder);
	}

	override getImportantExecutableBasedTips(): Promise<IExecutableBasedExtensionTip[]> {
		return this.channel.call<IExecutableBasedExtensionTip[]>('getImportantExecutableBasedTips');
	}

	override getOtherExecutableBasedTips(): Promise<IExecutableBasedExtensionTip[]> {
		return this.channel.call<IExecutableBasedExtensionTip[]>('getOtherExecutableBasedTips');
	}

}

registerSingleton(IExtensionTipsService, NativeExtensionTipsService, InstantiationType.Delayed);

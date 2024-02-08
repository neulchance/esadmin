/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {ExtensionRecommendations, ExtensionRecommendation} from 'td/workbench/contrib/extensions/browser/extensionRecommendations';
import {IProductService} from 'td/platform/product/common/productService';
import {ExtensionRecommendationReason} from 'td/workbench/services/extensionRecommendations/common/extensionRecommendations';
import {localize} from 'td/nls';
import {IExtensionManagementServerService} from 'td/workbench/services/extensionManagement/common/extensionManagement';

export class WebRecommendations extends ExtensionRecommendations {

	private _recommendations: ExtensionRecommendation[] = [];
	get recommendations(): ReadonlyArray<ExtensionRecommendation> { return this._recommendations; }

	constructor(
		@IProductService private readonly productService: IProductService,
		@IExtensionManagementServerService private readonly extensionManagementServerService: IExtensionManagementServerService,
	) {
		super();
	}

	protected async doActivate(): Promise<void> {
		const isOnlyWeb = this.extensionManagementServerService.webExtensionManagementServer && !this.extensionManagementServerService.localExtensionManagementServer && !this.extensionManagementServerService.remoteExtensionManagementServer;
		if (isOnlyWeb && Array.isArray(this.productService.webExtensionTips)) {
			this._recommendations = this.productService.webExtensionTips.map(extensionId => (<ExtensionRecommendation>{
				extensionId: extensionId.toLowerCase(),
				reason: {
					reasonId: ExtensionRecommendationReason.Application,
					reasonText: localize('reason', "This extension is recommended for {0} for the Web", this.productService.nameLong)
				}
			}));
		}
	}

}


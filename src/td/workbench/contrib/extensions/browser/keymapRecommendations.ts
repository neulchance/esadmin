/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {ExtensionRecommendations, ExtensionRecommendation} from 'td/workbench/contrib/extensions/browser/extensionRecommendations';
import {IProductService} from 'td/platform/product/common/productService';
import {ExtensionRecommendationReason} from 'td/workbench/services/extensionRecommendations/common/extensionRecommendations';

export class KeymapRecommendations extends ExtensionRecommendations {

	private _recommendations: ExtensionRecommendation[] = [];
	get recommendations(): ReadonlyArray<ExtensionRecommendation> { return this._recommendations; }

	constructor(
		@IProductService private readonly productService: IProductService,
	) {
		super();
	}

	protected async doActivate(): Promise<void> {
		if (this.productService.keymapExtensionTips) {
			this._recommendations = this.productService.keymapExtensionTips.map(extensionId => (<ExtensionRecommendation>{
				extensionId: extensionId.toLowerCase(),
				reason: {
					reasonId: ExtensionRecommendationReason.Application,
					reasonText: ''
				}
			}));
		}
	}

}


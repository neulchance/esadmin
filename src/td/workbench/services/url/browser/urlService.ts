/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IURLService} from 'td/platform/url/common/url';
import {URI, UriComponents} from 'td/base/common/uri';
import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {AbstractURLService} from 'td/platform/url/common/urlService';
import {Event} from 'td/base/common/event';
import {IBrowserWorkbenchEnvironmentService} from 'td/workbench/services/environment/browser/environmentService';
import {IOpenerService, IOpener, OpenExternalOptions, OpenInternalOptions} from 'td/platform/opener/common/opener';
import {matchesScheme} from 'td/base/common/network';
import {IProductService} from 'td/platform/product/common/productService';

export interface IURLCallbackProvider {

	/**
	 * Indicates that a Uri has been opened outside of VSCode. The Uri
	 * will be forwarded to all installed Uri handlers in the system.
	 */
	readonly onCallback: Event<URI>;

	/**
	 * Creates a Uri that - if opened in a browser - must result in
	 * the `onCallback` to fire.
	 *
	 * The optional `Partial<UriComponents>` must be properly restored for
	 * the Uri passed to the `onCallback` handler.
	 *
	 * For example: if a Uri is to be created with `scheme:"vscode"`,
	 * `authority:"foo"` and `path:"bar"` the `onCallback` should fire
	 * with a Uri `vscode://foo/bar`.
	 *
	 * If there are additional `query` values in the Uri, they should
	 * be added to the list of provided `query` arguments from the
	 * `Partial<UriComponents>`.
	 */
	create(options?: Partial<UriComponents>): URI;
}

class BrowserURLOpener implements IOpener {

	constructor(
		private urlService: IURLService,
		private productService: IProductService
	) { }

	async open(resource: string | URI, options?: OpenInternalOptions | OpenExternalOptions): Promise<boolean> {
		if ((options as OpenExternalOptions | undefined)?.openExternal) {
			return false;
		}

		if (!matchesScheme(resource, this.productService.urlProtocol)) {
			return false;
		}

		if (typeof resource === 'string') {
			resource = URI.parse(resource);
		}

		return this.urlService.open(resource, {trusted: true});
	}
}

export class BrowserURLService extends AbstractURLService {

	private provider: IURLCallbackProvider | undefined;

	constructor(
		@IBrowserWorkbenchEnvironmentService environmentService: IBrowserWorkbenchEnvironmentService,
		@IOpenerService openerService: IOpenerService,
		@IProductService productService: IProductService
	) {
		super();

		this.provider = environmentService.options?.urlCallbackProvider;

		if (this.provider) {
			this._register(this.provider.onCallback(uri => this.open(uri, {trusted: true})));
		}

		this._register(openerService.registerOpener(new BrowserURLOpener(this, productService)));
	}

	create(options?: Partial<UriComponents>): URI {
		if (this.provider) {
			return this.provider.create(options);
		}

		return URI.parse('unsupported://');
	}
}

registerSingleton(IURLService, BrowserURLService, InstantiationType.Delayed);

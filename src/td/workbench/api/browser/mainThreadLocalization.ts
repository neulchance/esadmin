/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {MainContext, MainThreadLocalizationShape} from 'td/workbench/api/common/extHost.protocol';
import {extHostNamedCustomer, IExtHostContext} from 'td/workbench/services/extensions/common/extHostCustomers';
import {URI, UriComponents} from 'td/base/common/uri';
import {IFileService} from 'td/platform/files/common/files';
import {Disposable} from 'td/base/common/lifecycle';
import {ILanguagePackService} from 'td/platform/languagePacks/common/languagePacks';

@extHostNamedCustomer(MainContext.MainThreadLocalization)
export class MainThreadLocalization extends Disposable implements MainThreadLocalizationShape {

	constructor(
		extHostContext: IExtHostContext,
		@IFileService private readonly fileService: IFileService,
		@ILanguagePackService private readonly languagePackService: ILanguagePackService
	) {
		console.log('MainThreadLocalization#constructor');
		super();
	}

	async $fetchBuiltInBundleUri(id: string, language: string): Promise<URI | undefined> {
		try {
			const uri = await this.languagePackService.getBuiltInExtensionTranslationsUri(id, language);
			return uri;
		} catch (e) {
			return undefined;
		}
	}

	async $fetchBundleContents(uriComponents: UriComponents): Promise<string> {
		const contents = await this.fileService.readFile(URI.revive(uriComponents));
		return contents.value.toString();
	}
}

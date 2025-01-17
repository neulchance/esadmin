/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {buffer} from 'td/base/node/zip';
import {localize} from 'td/nls';
import {IExtensionManifest} from 'td/platform/extensions/common/extensions';

export function getManifest(vsix: string): Promise<IExtensionManifest> {
	return buffer(vsix, 'extension/package.json')
		.then(buffer => {
			try {
				return JSON.parse(buffer.toString('utf8'));
			} catch (err) {
				throw new Error(localize('invalidManifest', "VSIX invalid: package.json is not a JSON file."));
			}
		});
}

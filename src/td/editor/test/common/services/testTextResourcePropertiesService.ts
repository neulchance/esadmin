/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as platform from 'td/base/common/platform';
import { URI } from 'td/base/common/uri';
import { ITextResourcePropertiesService } from 'td/editor/common/services/textResourceConfiguration';
import { IConfigurationService } from 'td/platform/configuration/common/configuration';

export class TestTextResourcePropertiesService implements ITextResourcePropertiesService {

	declare readonly _serviceBrand: undefined;

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
	) {
	}

	getEOL(resource: URI, language?: string): string {
		const eol = this.configurationService.getValue('files.eol', { overrideIdentifier: language, resource });
		if (eol && typeof eol === 'string' && eol !== 'auto') {
			return eol;
		}
		return (platform.isLinux || platform.isMacintosh) ? '\n' : '\r\n';
	}
}

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {URI} from 'td/base/common/uri';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {ITextResourcePropertiesService} from 'td/editor/common/services/textResourceConfiguration';
import {OperatingSystem, OS} from 'td/base/common/platform';
import {Schemas} from 'td/base/common/network';
import {IStorageService, StorageScope, StorageTarget} from 'td/platform/storage/common/storage';
import {IWorkbenchEnvironmentService} from 'td/workbench/services/environment/common/environmentService';
import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {IRemoteAgentEnvironment} from 'td/platform/remote/common/remoteAgentEnvironment';
import {IRemoteAgentService} from 'td/workbench/services/remote/common/remoteAgentService';

export class TextResourcePropertiesService implements ITextResourcePropertiesService {

	declare readonly _serviceBrand: undefined;

	private remoteEnvironment: IRemoteAgentEnvironment | null = null;

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IRemoteAgentService remoteAgentService: IRemoteAgentService,
		@IWorkbenchEnvironmentService private readonly environmentService: IWorkbenchEnvironmentService,
		@IStorageService private readonly storageService: IStorageService
	) {
		remoteAgentService.getEnvironment().then(remoteEnv => this.remoteEnvironment = remoteEnv);
	}

	getEOL(resource?: URI, language?: string): string {
		const eol = this.configurationService.getValue('files.eol', {overrideIdentifier: language, resource});
		if (eol && typeof eol === 'string' && eol !== 'auto') {
			return eol;
		}
		const os = this.getOS(resource);
		return os === OperatingSystem.Linux || os === OperatingSystem.Macintosh ? '\n' : '\r\n';
	}

	private getOS(resource?: URI): OperatingSystem {
		let os = OS;

		const remoteAuthority = this.environmentService.remoteAuthority;
		if (remoteAuthority) {
			if (resource && resource.scheme !== Schemas.file) {
				const osCacheKey = `resource.authority.os.${remoteAuthority}`;
				os = this.remoteEnvironment ? this.remoteEnvironment.os : /* Get it from cache */ this.storageService.getNumber(osCacheKey, StorageScope.WORKSPACE, OS);
				this.storageService.store(osCacheKey, os, StorageScope.WORKSPACE, StorageTarget.MACHINE);
			}
		}

		return os;
	}
}

registerSingleton(ITextResourcePropertiesService, TextResourcePropertiesService, InstantiationType.Delayed);

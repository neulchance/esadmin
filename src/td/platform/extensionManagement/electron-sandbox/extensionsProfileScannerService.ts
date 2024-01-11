/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {ILogService} from 'td/platform/log/common/log';
import {IUserDataProfilesService} from 'td/platform/userDataProfile/common/userDataProfile';
import {IUriIdentityService} from 'td/platform/uriIdentity/common/uriIdentity';
import {ITelemetryService} from 'td/platform/telemetry/common/telemetry';
import {AbstractExtensionsProfileScannerService} from 'td/platform/extensionManagement/common/extensionsProfileScannerService';
import {IFileService} from 'td/platform/files/common/files';
import {INativeEnvironmentService} from 'td/platform/environment/common/environment';
import {URI} from 'td/base/common/uri';

export class ExtensionsProfileScannerService extends AbstractExtensionsProfileScannerService {
	constructor(
		@INativeEnvironmentService environmentService: INativeEnvironmentService,
		@IFileService fileService: IFileService,
		@IUserDataProfilesService userDataProfilesService: IUserDataProfilesService,
		@IUriIdentityService uriIdentityService: IUriIdentityService,
		@ITelemetryService telemetryService: ITelemetryService,
		@ILogService logService: ILogService,
	) {
		super(URI.file(environmentService.extensionsPath), fileService, userDataProfilesService, uriIdentityService, telemetryService, logService);
	}
}

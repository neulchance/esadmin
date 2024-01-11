/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {URI} from 'td/base/common/uri';
import {INativeEnvironmentService} from 'td/platform/environment/common/environment';
import {IExtensionsProfileScannerService} from 'td/platform/extensionManagement/common/extensionsProfileScannerService';
import {IExtensionsScannerService, NativeExtensionsScannerService,} from 'td/platform/extensionManagement/common/extensionsScannerService';
import {IFileService} from 'td/platform/files/common/files';
import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {IInstantiationService} from 'td/platform/instantiation/common/instantiation';
import {ILogService} from 'td/platform/log/common/log';
import {IProductService} from 'td/platform/product/common/productService';
import {IUriIdentityService} from 'td/platform/uriIdentity/common/uriIdentity';
import {IUserDataProfilesService} from 'td/platform/userDataProfile/common/userDataProfile';
import {IUserDataProfileService} from 'td/workbench/services/userDataProfile/common/userDataProfile';

export class ExtensionsScannerService extends NativeExtensionsScannerService implements IExtensionsScannerService {

	constructor(
		@IUserDataProfileService userDataProfileService: IUserDataProfileService,
		@IUserDataProfilesService userDataProfilesService: IUserDataProfilesService,
		@IExtensionsProfileScannerService extensionsProfileScannerService: IExtensionsProfileScannerService,
		@IFileService fileService: IFileService,
		@ILogService logService: ILogService,
		@INativeEnvironmentService environmentService: INativeEnvironmentService,
		@IProductService productService: IProductService,
		@IUriIdentityService uriIdentityService: IUriIdentityService,
		@IInstantiationService instantiationService: IInstantiationService,
	) {
		super(
			URI.file(environmentService.builtinExtensionsPath),
			URI.file(environmentService.extensionsPath),
			environmentService.userHome,
			userDataProfileService.currentProfile,
			userDataProfilesService, extensionsProfileScannerService, fileService, logService, environmentService, productService, uriIdentityService, instantiationService);
	}

}

registerSingleton(IExtensionsScannerService, ExtensionsScannerService, InstantiationType.Delayed);

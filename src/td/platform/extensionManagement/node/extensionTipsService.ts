/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IExtensionManagementService} from 'td/platform/extensionManagement/common/extensionManagement';
import {IFileService} from 'td/platform/files/common/files';
import {IProductService} from 'td/platform/product/common/productService';
import {INativeEnvironmentService} from 'td/platform/environment/common/environment';
import {IExtensionRecommendationNotificationService} from 'td/platform/extensionRecommendations/common/extensionRecommendations';
import {INativeHostService} from 'td/platform/native/common/native';
import {IStorageService} from 'td/platform/storage/common/storage';
import {ITelemetryService} from 'td/platform/telemetry/common/telemetry';
import {AbstractNativeExtensionTipsService} from 'td/platform/extensionManagement/common/extensionTipsService';

export class ExtensionTipsService extends AbstractNativeExtensionTipsService {

	constructor(
		@INativeEnvironmentService environmentService: INativeEnvironmentService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IExtensionManagementService extensionManagementService: IExtensionManagementService,
		@IStorageService storageService: IStorageService,
		@INativeHostService nativeHostService: INativeHostService,
		@IExtensionRecommendationNotificationService extensionRecommendationNotificationService: IExtensionRecommendationNotificationService,
		@IFileService fileService: IFileService,
		@IProductService productService: IProductService,
	) {
		super(environmentService.userHome, nativeHostService, telemetryService, extensionManagementService, storageService, extensionRecommendationNotificationService, fileService, productService);
	}
}

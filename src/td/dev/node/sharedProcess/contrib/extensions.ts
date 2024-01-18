/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {Disposable} from 'td/base/common/lifecycle';
import {IExtensionGalleryService, IGlobalExtensionEnablementService} from 'td/platform/extensionManagement/common/extensionManagement';
import {ExtensionStorageService, IExtensionStorageService} from 'td/platform/extensionManagement/common/extensionStorage';
import {migrateUnsupportedExtensions} from 'td/platform/extensionManagement/common/unsupportedExtensionsMigration';
import {INativeServerExtensionManagementService} from 'td/platform/extensionManagement/node/extensionManagementService';
import {ILogService} from 'td/platform/log/common/log';
import {IStorageService} from 'td/platform/storage/common/storage';

export class ExtensionsContributions extends Disposable {
	constructor(
		@INativeServerExtensionManagementService extensionManagementService: INativeServerExtensionManagementService,
		@IExtensionGalleryService extensionGalleryService: IExtensionGalleryService,
		@IExtensionStorageService extensionStorageService: IExtensionStorageService,
		@IGlobalExtensionEnablementService extensionEnablementService: IGlobalExtensionEnablementService,
		@IStorageService storageService: IStorageService,
		@ILogService logService: ILogService,
	) {
		super();

		extensionManagementService.cleanUp();
		migrateUnsupportedExtensions(extensionManagementService, extensionGalleryService, extensionStorageService, extensionEnablementService, logService);
		ExtensionStorageService.removeOutdatedExtensionVersions(extensionManagementService, storageService);
	}

}

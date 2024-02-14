/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IExtensionGalleryService, IGlobalExtensionEnablementService} from 'td/platform/extensionManagement/common/extensionManagement';
import {IExtensionStorageService} from 'td/platform/extensionManagement/common/extensionStorage';
import {migrateUnsupportedExtensions} from 'td/platform/extensionManagement/common/unsupportedExtensionsMigration';
import {ILogService} from 'td/platform/log/common/log';
import {IWorkbenchContribution} from 'td/workbench/common/contributions';
import {IExtensionManagementServerService} from 'td/workbench/services/extensionManagement/common/extensionManagement';

export class UnsupportedExtensionsMigrationContrib implements IWorkbenchContribution {

	constructor(
		@IExtensionManagementServerService extensionManagementServerService: IExtensionManagementServerService,
		@IExtensionGalleryService extensionGalleryService: IExtensionGalleryService,
		@IExtensionStorageService extensionStorageService: IExtensionStorageService,
		@IGlobalExtensionEnablementService extensionEnablementService: IGlobalExtensionEnablementService,
		@ILogService logService: ILogService,
	) {
		// Unsupported extensions are not migrated for local extension management server, because it is done in shared process
		if (extensionManagementServerService.remoteExtensionManagementServer) {
			migrateUnsupportedExtensions(extensionManagementServerService.remoteExtensionManagementServer.extensionManagementService, extensionGalleryService, extensionStorageService, extensionEnablementService, logService);
		}
		if (extensionManagementServerService.webExtensionManagementServer) {
			migrateUnsupportedExtensions(extensionManagementServerService.webExtensionManagementServer.extensionManagementService, extensionGalleryService, extensionStorageService, extensionEnablementService, logService);
		}
	}

}

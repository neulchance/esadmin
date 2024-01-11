/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {generateUuid} from 'td/base/common/uuid';
import {ILocalExtension, IExtensionGalleryService, InstallVSIXOptions} from 'td/platform/extensionManagement/common/extensionManagement';
import {URI} from 'td/base/common/uri';
import {ExtensionManagementService as BaseExtensionManagementService} from 'td/workbench/services/extensionManagement/common/extensionManagementService';
import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {IExtensionManagementServer, IExtensionManagementServerService, IWorkbenchExtensionManagementService} from 'td/workbench/services/extensionManagement/common/extensionManagement';
import {Schemas} from 'td/base/common/network';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {IDownloadService} from 'td/platform/download/common/download';
import {IProductService} from 'td/platform/product/common/productService';
import {INativeWorkbenchEnvironmentService} from 'td/workbench/services/environment/electron-sandbox/environmentService';
import {joinPath} from 'td/base/common/resources';
import {IUserDataSyncEnablementService} from 'td/platform/userDataSync/common/userDataSync';
import {IDialogService} from 'td/platform/dialogs/common/dialogs';
import {IWorkspaceTrustRequestService} from 'td/platform/workspace/common/workspaceTrust';
import {IExtensionManifestPropertiesService} from 'td/workbench/services/extensions/common/extensionManifestPropertiesService';
import {IInstantiationService} from 'td/platform/instantiation/common/instantiation';
import {IFileService} from 'td/platform/files/common/files';
import {ILogService} from 'td/platform/log/common/log';
import {IUserDataProfileService} from 'td/workbench/services/userDataProfile/common/userDataProfile';

export class ExtensionManagementService extends BaseExtensionManagementService {

	constructor(
		@INativeWorkbenchEnvironmentService private readonly environmentService: INativeWorkbenchEnvironmentService,
		// @IExtensionManagementServerService extensionManagementServerService: IExtensionManagementServerService,
		// @IExtensionGalleryService extensionGalleryService: IExtensionGalleryService,
		@IUserDataProfileService userDataProfileService: IUserDataProfileService,
		@IConfigurationService configurationService: IConfigurationService,
		@IProductService productService: IProductService,
		// @IDownloadService downloadService: IDownloadService,
		// @IUserDataSyncEnablementService userDataSyncEnablementService: IUserDataSyncEnablementService,
		@IDialogService dialogService: IDialogService,
		@IWorkspaceTrustRequestService workspaceTrustRequestService: IWorkspaceTrustRequestService,
		@IExtensionManifestPropertiesService extensionManifestPropertiesService: IExtensionManifestPropertiesService,
		@IFileService fileService: IFileService,
		@ILogService logService: ILogService,
		@IInstantiationService instantiationService: IInstantiationService,
	) {
		super(/* extensionManagementServerService, */ /* extensionGalleryService, */ userDataProfileService, configurationService, productService, /* downloadService, */ /* userDataSyncEnablementService, */ dialogService, workspaceTrustRequestService, extensionManifestPropertiesService, fileService, logService, instantiationService);
	}
}

registerSingleton(IWorkbenchExtensionManagementService, ExtensionManagementService, InstantiationType.Delayed);

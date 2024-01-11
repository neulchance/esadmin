/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {CancellationToken} from 'td/base/common/cancellation';
import {IEnvironmentService} from 'td/platform/environment/common/environment';
import {IExtensionGalleryService, IExtensionManagementService} from 'td/platform/extensionManagement/common/extensionManagement';
import {areSameExtensions} from 'td/platform/extensionManagement/common/extensionManagementUtil';
import {IFileService} from 'td/platform/files/common/files';
import {IInstantiationService} from 'td/platform/instantiation/common/instantiation';
import {ServiceCollection} from 'td/platform/instantiation/common/serviceCollection';
import {ILogService} from 'td/platform/log/common/log';
import {IRemoteAuthorityResolverService} from 'td/platform/remote/common/remoteAuthorityResolver';
import {IStorageService, IS_NEW_KEY, StorageScope, StorageTarget} from 'td/platform/storage/common/storage';
import {IUriIdentityService} from 'td/platform/uriIdentity/common/uriIdentity';
import {IUserDataProfilesService} from 'td/platform/userDataProfile/common/userDataProfile';
import {AbstractExtensionsInitializer} from 'td/platform/userDataSync/common/extensionsSync';
import {IIgnoredExtensionsManagementService} from 'td/platform/userDataSync/common/ignoredExtensions';
import {IRemoteUserData, /* IUserDataSyncEnablementService, */ IUserDataSyncStoreManagementService, SyncResource} from 'td/platform/userDataSync/common/userDataSync';
import {UserDataSyncStoreClient} from 'td/platform/userDataSync/common/userDataSyncStoreService';
import {IWorkbenchContribution} from 'td/workbench/common/contributions';
import {IAuthenticationService} from 'td/workbench/services/authentication/common/authentication';
import {IExtensionManifestPropertiesService} from 'td/workbench/services/extensions/common/extensionManifestPropertiesService';
import {IRemoteAgentService} from 'td/workbench/services/remote/common/remoteAgentService';

export class RemoteExtensionsInitializerContribution implements IWorkbenchContribution {
	constructor(
		@IStorageService private readonly storageService: IStorageService,
		@IRemoteAgentService private readonly remoteAgentService: IRemoteAgentService,
		@IUserDataSyncStoreManagementService private readonly userDataSyncStoreManagementService: IUserDataSyncStoreManagementService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@ILogService private readonly logService: ILogService,
		@IAuthenticationService private readonly authenticationService: IAuthenticationService,
		@IRemoteAuthorityResolverService private readonly remoteAuthorityResolverService: IRemoteAuthorityResolverService,
		// @IUserDataSyncEnablementService private readonly userDataSyncEnablementService: IUserDataSyncEnablementService,
	) {
		// this.initializeRemoteExtensions();
	}
}
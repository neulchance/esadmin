/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {IUserDataSyncEnablementService, SyncResource} from 'td/platform/userDataSync/common/userDataSync';
import {UserDataSyncEnablementService as BaseUserDataSyncEnablementService} from 'td/platform/userDataSync/common/userDataSyncEnablementService';
import {IBrowserWorkbenchEnvironmentService} from 'td/workbench/services/environment/browser/environmentService';

export class UserDataSyncEnablementService extends BaseUserDataSyncEnablementService implements IUserDataSyncEnablementService {

	protected get workbenchEnvironmentService(): IBrowserWorkbenchEnvironmentService { return <IBrowserWorkbenchEnvironmentService>this.environmentService; }

	override getResourceSyncStateVersion(resource: SyncResource): string | undefined {
		return resource === SyncResource.Extensions ? this.workbenchEnvironmentService.options?.settingsSyncOptions?.extensionsSyncStateVersion : undefined;
	}

}

registerSingleton(IUserDataSyncEnablementService, UserDataSyncEnablementService, InstantiationType.Delayed);

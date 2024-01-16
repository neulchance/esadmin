/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {localize} from 'td/nls';
import {WorkingCopyBackupService} from 'td/workbench/services/workingCopy/common/workingCopyBackupService';
import {URI} from 'td/base/common/uri';
import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {IWorkingCopyBackupService} from 'td/workbench/services/workingCopy/common/workingCopyBackup';
import {IFileService} from 'td/platform/files/common/files';
import {ILogService} from 'td/platform/log/common/log';
import {INativeWorkbenchEnvironmentService} from 'td/workbench/services/environment/electron-sandbox/environmentService';
import {Registry} from 'td/platform/registry/common/platform';
import {IWorkbenchContributionsRegistry, Extensions as WorkbenchExtensions} from 'td/workbench/common/contributions';
import {ILifecycleService, LifecyclePhase} from 'td/workbench/services/lifecycle/common/lifecycle';
import {NativeWorkingCopyBackupTracker} from 'td/workbench/services/workingCopy/electron-sandbox/workingCopyBackupTracker';

export class NativeWorkingCopyBackupService extends WorkingCopyBackupService {

	constructor(
		@INativeWorkbenchEnvironmentService environmentService: INativeWorkbenchEnvironmentService,
		@IFileService fileService: IFileService,
		@ILogService logService: ILogService,
		@ILifecycleService private readonly lifecycleService: ILifecycleService
	) {
		super(environmentService.backupPath ? URI.file(environmentService.backupPath).with({scheme: environmentService.userRoamingDataHome.scheme}) : undefined, fileService, logService);

		this.registerListeners();
	}

	private registerListeners(): void {

		// Lifecycle: ensure to prolong the shutdown for as long
		// as pending backup operations have not finished yet.
		// Otherwise, we risk writing partial backups to disk.
		this._register(this.lifecycleService.onWillShutdown(event => event.join(this.joinBackups(), {id: 'join.workingCopyBackups', label: localize('join.workingCopyBackups', "Backup working copies")})));
	}
}

// Register Service
registerSingleton(IWorkingCopyBackupService, NativeWorkingCopyBackupService, InstantiationType.Eager);

// Register Backup Tracker
Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(NativeWorkingCopyBackupTracker, LifecyclePhase.Starting);

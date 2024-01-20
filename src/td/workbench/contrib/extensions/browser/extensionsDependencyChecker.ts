/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IExtensionsWorkbenchService} from 'td/workbench/contrib/extensions/common/extensions';
import {IWorkbenchContribution} from 'td/workbench/common/contributions';
import {IExtensionService} from 'td/workbench/services/extensions/common/extensions';
import {CommandsRegistry} from 'td/platform/commands/common/commands';
import {MenuRegistry, MenuId} from 'td/platform/actions/common/actions';
import {localize} from 'td/nls';
import {areSameExtensions} from 'td/platform/extensionManagement/common/extensionManagementUtil';
import {INotificationService, Severity} from 'td/platform/notification/common/notification';
import {Action} from 'td/base/common/actions';
import {IHostService} from 'td/workbench/services/host/browser/host';
import {Disposable} from 'td/base/common/lifecycle';
import {CancellationToken} from 'td/base/common/cancellation';
import {Promises} from 'td/base/common/async';

export class ExtensionDependencyChecker extends Disposable implements IWorkbenchContribution {

	constructor(
		@IExtensionService private readonly extensionService: IExtensionService,
		@IExtensionsWorkbenchService private readonly extensionsWorkbenchService: IExtensionsWorkbenchService,
		@INotificationService private readonly notificationService: INotificationService,
		@IHostService private readonly hostService: IHostService
	) {
		super();
		CommandsRegistry.registerCommand('workbench.extensions.installMissingDependencies', () => this.installMissingDependencies());
		MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
			command: {
				id: 'workbench.extensions.installMissingDependencies',
				category: localize('extensions', "Extensions"),
				title: localize('auto install missing deps', "Install Missing Dependencies")
			}
		});
	}

	private async getUninstalledMissingDependencies(): Promise<string[]> {
		const allMissingDependencies = await this.getAllMissingDependencies();
		const localExtensions = await this.extensionsWorkbenchService.queryLocal();
		return allMissingDependencies.filter(id => localExtensions.every(l => !areSameExtensions(l.identifier, {id})));
	}

	private async getAllMissingDependencies(): Promise<string[]> {
		await this.extensionService.whenInstalledExtensionsRegistered();
		const runningExtensionsIds: Set<string> = this.extensionService.extensions.reduce((result, r) => { result.add(r.identifier.value.toLowerCase()); return result; }, new Set<string>());
		const missingDependencies: Set<string> = new Set<string>();
		for (const extension of this.extensionService.extensions) {
			if (extension.extensionDependencies) {
				extension.extensionDependencies.forEach(dep => {
					if (!runningExtensionsIds.has(dep.toLowerCase())) {
						missingDependencies.add(dep);
					}
				});
			}
		}
		return [...missingDependencies.values()];
	}

	private async installMissingDependencies(): Promise<void> {
		const missingDependencies = await this.getUninstalledMissingDependencies();
		if (missingDependencies.length) {
			const extensions = await this.extensionsWorkbenchService.getExtensions(missingDependencies.map(id => ({id})), CancellationToken.None);
			if (extensions.length) {
				await Promises.settled(extensions.map(extension => this.extensionsWorkbenchService.install(extension)));
				this.notificationService.notify({
					severity: Severity.Info,
					message: localize('finished installing missing deps', "Finished installing missing dependencies. Please reload the window now."),
					actions: {
						primary: [new Action('realod', localize('reload', "Reload Window"), '', true,
							() => this.hostService.reload())]
					}
				});
			}
		} else {
			this.notificationService.info(localize('no missing deps', "There are no missing dependencies to install."));
		}
	}
}

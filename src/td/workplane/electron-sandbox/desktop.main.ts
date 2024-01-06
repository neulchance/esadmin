import product from 'td/platform/product/common/product';
import {domContentLoaded} from 'td/base/browser/dom';
import {mainWindow} from 'td/base/browser/window';
import {Disposable} from 'td/base/common/lifecycle';
import {isBigSurOrNewer, isMacintosh} from 'td/base/common/platform';
import {URI} from 'td/base/common/uri';
import {localize} from 'td/nls';
import {ServiceCollection} from 'td/platform/instantiation/common/serviceCollection';
import {LoggerChannelClient} from 'td/platform/log/common/logIpc';
import {IProductService} from 'td/platform/product/common/productService';
import {INativeWindowConfiguration} from 'td/platform/window/common/window';
import {Workbench} from 'td/workbench/browser/workbench';
import {INativeWorkbenchEnvironmentService, NativeWorkbenchEnvironmentService} from 'td/workbench/services/environment/electron-sandbox/environmentService';
import {NativeWorkbenchStorageService} from 'td/workbench/services/storage/electron-sandbox/storageService';
import {ElectronIPCMainProcessService} from 'td/platform/ipc/electron-sandbox/mainProcessService';
import {IMainProcessService} from 'td/platform/ipc/common/mainProcessService';
import {ILogService, ILoggerService} from 'td/platform/log/common/log';
import {NativeLogService} from 'td/workbench/services/log/electron-sandbox/logService';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {IAnyWorkspaceIdentifier, toWorkspaceIdentifier} from 'td/platform/workspace/common/workspace';
import {IUserDataProfilesService, reviveProfile} from 'td/platform/userDataProfile/common/userDataProfile';
import {UserDataProfilesService} from 'td/platform/userDataProfile/common/userDataProfileIpc';
import {UserDataProfileService} from 'td/workbench/services/userDataProfile/common/userDataProfileService';
import {IUserDataProfileService} from 'td/workbench/services/userDataProfile/common/userDataProfile';

export class DesktopMain extends Disposable {
  
  constructor(
		private readonly configuration: INativeWindowConfiguration
	) {
    super()
	}

  async open(): Promise<void> {
    // Init services and wait for DOM to be ready in parallel
		const [services] = await Promise.all([this.initServices(), domContentLoaded(mainWindow)]);
    console.log('open')

    // Create Workplane
    const workbench = new Workbench(mainWindow.document.body, {extraClasses: this.getExtraClasses()}, services.serviceCollection, services.logService);

    // Listeners
		this.registerListeners(workbench, services.storageService);
  }

  private async initServices(): Promise<{serviceCollection: ServiceCollection; logService: ILogService; storageService: NativeWorkbenchStorageService; configurationService: IConfigurationService}> {
    const serviceCollection = new ServiceCollection();

    // Main Process
		const mainProcessService = this._register(new ElectronIPCMainProcessService(this.configuration.windowId));
		serviceCollection.set(IMainProcessService, mainProcessService);

    // Product
		const productService: IProductService = {_serviceBrand: undefined, ...product};
		serviceCollection.set(IProductService, productService);

    // Environment
		const environmentService = new NativeWorkbenchEnvironmentService(this.configuration, productService);
		serviceCollection.set(INativeWorkbenchEnvironmentService, environmentService);

    // Logger
		const loggers = [
			...this.configuration.loggers.global.map(loggerResource => ({...loggerResource, resource: URI.revive(loggerResource.resource)})),
			...this.configuration.loggers.window.map(loggerResource => ({...loggerResource, resource: URI.revive(loggerResource.resource), hidden: true})),
		];
		const loggerService = new LoggerChannelClient(this.configuration.windowId, this.configuration.logLevel, environmentService.windowLogsPath, loggers, mainProcessService.getChannel('logger'));
		serviceCollection.set(ILoggerService, loggerService);

		// Log
		const logService = this._register(new NativeLogService(loggerService, environmentService));
		serviceCollection.set(ILogService, logService);

    // User Data Profiles
		const userDataProfilesService = new UserDataProfilesService(this.configuration.profiles.all, URI.revive(this.configuration.profiles.home).with({scheme: environmentService.userRoamingDataHome.scheme}), mainProcessService.getChannel('userDataProfiles'));
    serviceCollection.set(IUserDataProfilesService, userDataProfilesService);
    const userDataProfileService = new UserDataProfileService(reviveProfile(this.configuration.profiles.profile, userDataProfilesService.profilesHome.scheme));
    serviceCollection.set(IUserDataProfileService, userDataProfileService);

    // Create services that require resolving in parallel
		const workspace = this.resolveWorkspaceIdentifier(environmentService);
		const [configurationService, storageService] = await Promise.all([
			this.createWorkspaceService(workspace, environmentService, userDataProfileService, userDataProfilesService, fileService, remoteAgentService, uriIdentityService, logService, policyService).then(service => {

				// Workspace
				serviceCollection.set(IWorkspaceContextService, service);

				// Configuration
				serviceCollection.set(IWorkbenchConfigurationService, service);

				return service;
			}),

			this.createStorageService(workspace, environmentService, userDataProfileService, userDataProfilesService, mainProcessService).then(service => {

				// Storage
				serviceCollection.set(IStorageService, service);

				return service;
			}),

			// this.createKeyboardLayoutService(mainProcessService).then(service => {

			// 	// KeyboardLayout
			// 	serviceCollection.set(INativeKeyboardLayoutService, service);

			// 	return service;
			// })
		]);

    return {serviceCollection, logService, storageService, configurationService};
  }

  private resolveWorkspaceIdentifier(environmentService: INativeWorkbenchEnvironmentService): IAnyWorkspaceIdentifier {

		// Return early for when a folder or multi-root is opened
		if (this.configuration.workspace) {
			return this.configuration.workspace;
		}

		// Otherwise, workspace is empty, so we derive an identifier
		return toWorkspaceIdentifier(this.configuration.backupPath, environmentService.isExtensionDevelopment);
	}

  private getExtraClasses(): string[] {
		// if (isMacintosh && isBigSurOrNewer(this.configuration.os.release)) {
		// 	return ['macos-bigsur-or-newer'];
		// }

		return [];
	}

  private registerListeners(workbench: Workbench, storageService: NativeWorkbenchStorageService): void {

		// Workbench Lifecycle
		this._register(workbench.onWillShutdown(event => event.join(storageService.close(), {id: 'join.closeStorage', label: localize('join.closeStorage', "Saving UI state")})));
		this._register(workbench.onDidShutdown(() => this.dispose()));
	}
}

export function main() {
  const workplane = new DesktopMain();
  workplane.open();
}
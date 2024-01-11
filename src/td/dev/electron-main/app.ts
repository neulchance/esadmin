/*----------------------------------------------------------------------------------------------------
 *  Copyright (c) TinyDeskDev. All rights reserved.
 *  Licensed under the UNLICENSED License. See License.txt in the project root for license information.
 *---------------------------------------------------------------------------------------------------*/

import {app, BrowserWindow, protocol, session, Session, systemPreferences, WebFrameMain} from 'electron';
import {IInstantiationService, ServicesAccessor} from 'td/platform/instantiation/common/instantiation';
import {ServiceCollection} from 'td/platform/instantiation/common/serviceCollection';
import {IWindowsMainService, OpenContext} from 'td/platform/windows/electron-main/windows';
import {IDevWindow} from 'td/platform/window/electron-main/window';
import {WindowsMainService} from 'td/platform/windows/electron-main/windowsMainService';
import {SyncDescriptor} from 'td/platform/instantiation/common/descriptors';
import {validatedIpcMain} from 'td/base/parts/ipc/electron-main/ipcMain';
import {NativeParsedArgs} from 'td/platform/environment/common/argv';
import {IProcessEnvironment} from 'td/base/common/platform';
import {IEnvironmentMainService} from 'td/platform/environment/electron-main/environmentMainService';
import {getResolvedShellEnv} from 'td/platform/shell/node/shellEnv';
import {ILogService} from 'td/platform/log/common/log';
import {toErrorMessage} from 'td/base/common/errorMessage';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {resolveMachineId, resolveSqmId} from 'td/platform/telemetry/electron-main/telemetryUtils';
import {IStateService} from 'td/platform/state/node/state';
import {Server as NodeIPCServer} from 'td/base/parts/ipc/node/ipc.net';
import {ApplicationStorageMainService, IApplicationStorageMainService, IStorageMainService, StorageMainService} from 'td/platform/storage/electron-main/storageMainService';
import {StorageDatabaseChannel} from 'td/platform/storage/electron-main/storageIpc';
import {Server as ElectronIPCServer} from 'td/base/parts/ipc/electron-main/ipc.electron';
import {Client as MessagePortClient} from 'td/base/parts/ipc/electron-main/ipc.mp';
import {ILifecycleMainService, ShutdownReason} from 'td/platform/lifecycle/electron-main/lifecycleMainService';
import {Disposable, DisposableStore} from 'td/base/common/lifecycle';
import {SharedProcess} from 'td/platform/sharedProcess/electron-main/sharedProcess';
import {ILoggerMainService} from 'td/platform/log/electron-main/loggerService';
import {LoggerChannel} from 'td/platform/log/electron-main/logIpc';
import {ProxyChannel} from 'td/base/parts/ipc/common/ipc';
import {IUserDataProfilesMainService} from 'td/platform/userDataProfile/electron-main/userDataProfile';
import {INativeHostMainService, NativeHostMainService} from 'td/platform/native/electron-main/nativeHostMainService';
import {IWorkspacesManagementMainService, WorkspacesManagementMainService} from 'td/platform/workspaces/electron-main/workspacesManagementMainService';
import {DialogMainService, IDialogMainService} from 'td/platform/dialogs/electron-main/dialogMainService';
import {IProductService} from 'td/platform/product/common/productService';

/**
 * The main TD Dev application. There will only ever be one instance,
 * even if the user starts many instances (e.g. from the command line).
 */
export class DevApplication extends Disposable {

  private windowsMainService: IWindowsMainService | undefined;
	private nativeHostMainService: INativeHostMainService | undefined;

  constructor(
		private readonly mainProcessNodeIpcServer: NodeIPCServer,
		private readonly userEnv: IProcessEnvironment,
    @IInstantiationService private readonly mainInstantiationService: IInstantiationService,
		@IEnvironmentMainService private readonly environmentMainService: IEnvironmentMainService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@ILogService private readonly logService: ILogService,
		@IStateService private readonly stateService: IStateService,
		@ILifecycleMainService private readonly lifecycleMainService: ILifecycleMainService,
		@IProductService private readonly productService: IProductService,
		@IUserDataProfilesMainService private readonly userDataProfilesMainService: IUserDataProfilesMainService
  ) {
		super()

    this.registerListeners()
  }

  private registerListeners(): void {
    // macOS dock activate
		app.on('activate', async (event, hasVisibleWindows) => {
			// this.logService.trace('app#activate');

			// Mac only event: open new window when we get activated
			if (!hasVisibleWindows) {
        console.log('hello activate')
				// await this.windowsMainService?.openEmptyWindow({context: OpenContext.DOCK});
			}
		});

    //#region Bootstrap IPC Handlers

		validatedIpcMain.handle('vscode:fetchShellEnv', event => {

			// Prefer to use the args and env from the target window
			// when resolving the shell env. It is possible that
			// a first window was opened from the UI but a second
			// from the CLI and that has implications for whether to
			// resolve the shell environment or not.
			//
			// Window can be undefined for e.g. the shared process
			// that is not part of our windows registry!
			const window = this.windowsMainService?.getWindowByWebContents(event.sender); // Note: this can be `undefined` for the shared process
			let args: NativeParsedArgs;
			let env: IProcessEnvironment;
			if (window?.config) {
				args = window.config;
				env = {...process.env, ...window.config.userEnv};
			} else {
				args = this.environmentMainService.args;
				env = process.env;
			}

			// Resolve shell env
			return this.resolveShellEnvironment(args, env, false);
		});
  }



  async startup(): Promise<void> {
		this.logService.setLevel(2)
		this.logService.debug('Starting VS Code');
		this.logService.debug(`from: ${this.environmentMainService.appRoot}`);
		// this.logService.debug('args:', this.environmentMainService.args);

		// Main process server (electron IPC based)
		const mainProcessElectronServer = new ElectronIPCServer();
		this.lifecycleMainService.onWillShutdown(e => {
			if (e.reason === ShutdownReason.KILL) {
				// When we go down abnormally, make sure to free up
				// any IPC we accept from other windows to reduce
				// the chance of doing work after we go down. Kill
				// is special in that it does not orderly shutdown
				// windows.
				mainProcessElectronServer.dispose();
			}
		});

		// Resolve unique machine ID
		const [machineId, sqmId] = await Promise.all([
			resolveMachineId(this.stateService, this.logService),
			resolveSqmId(this.stateService, this.logService)
		]);
		this.logService.info(`Resolved machine identifier: ${machineId}`);
		this.logService.info(`Resolved sqm identifier: ${sqmId}`);

		// Shared process
		const {sharedProcessReady, sharedProcessClient} = this.setupSharedProcess(machineId, sqmId);

    // Services
    const appInstantiationService = await this.initServices(machineId, sqmId, sharedProcessReady);

		// Init Channels
		appInstantiationService.invokeFunction(accessor => this.initChannels(accessor, mainProcessElectronServer, sharedProcessClient));
    
    // Open Windows
		await appInstantiationService.invokeFunction(accessor => this.openFirstWindow(accessor/* , initialProtocolUrls */));
  }

	private setupSharedProcess(machineId: string, sqmId: string): { sharedProcessReady: Promise<MessagePortClient>; sharedProcessClient: Promise<MessagePortClient> } {
		const sharedProcess = this._register(this.mainInstantiationService.createInstance(SharedProcess, machineId, sqmId));

		const sharedProcessClient = (async () => {
			this.logService.trace('Main->SharedProcess#connect');

			const port = await sharedProcess.connect();

			this.logService.trace('Main->SharedProcess#connect: connection established');

			return new MessagePortClient(port, 'main');
		})();

		const sharedProcessReady = (async () => {
			await sharedProcess.whenReady();

			return sharedProcessClient;
		})();

		return {sharedProcessReady, sharedProcessClient};
	}

  private async initServices(machineId: string, sqmId: string, sharedProcessReady: Promise<MessagePortClient>): Promise<IInstantiationService> {
    const services = new ServiceCollection();

		// Dialogs
		const dialogMainService = new DialogMainService(this.logService, this.productService);
		services.set(IDialogMainService, dialogMainService);

    // Windows
    services.set(IWindowsMainService, new SyncDescriptor(WindowsMainService, [machineId, sqmId, this.userEnv], false));

		// Native Host
		services.set(INativeHostMainService, new SyncDescriptor(NativeHostMainService, undefined, false /* proxied to other processes */));

		// Storage
		services.set(IStorageMainService, new SyncDescriptor(StorageMainService));
		services.set(IApplicationStorageMainService, new SyncDescriptor(ApplicationStorageMainService));

		// Workspaces
		const workspacesManagementMainService = new WorkspacesManagementMainService(this.environmentMainService, this.logService, this.userDataProfilesMainService/* , backupMainService, dialogMainService */);
		services.set(IWorkspacesManagementMainService, workspacesManagementMainService);

    return this.mainInstantiationService.createChild(services);
  }

	private initChannels(accessor: ServicesAccessor, mainProcessElectronServer: ElectronIPCServer, sharedProcessClient: Promise<MessagePortClient>): void {

		// Channels registered to node.js are exposed to second instances
		// launching because that is the only way the second instance
		// can talk to the first instance. Electron IPC does not work
		// across apps until `requestSingleInstance` APIs are adopted.
		
		const disposables = this._register(new DisposableStore());

		// Native host (main & shared process)
		this.nativeHostMainService = accessor.get(INativeHostMainService);
		// const nativeHostChannel = ProxyChannel.fromService(this.nativeHostMainService, disposables);
		// mainProcessElectronServer.registerChannel('nativeHost', nativeHostChannel);
		// sharedProcessClient.then(client => client.registerChannel('nativeHost', nativeHostChannel));
		
		// User Data Profiles
		const userDataProfilesService = ProxyChannel.fromService(accessor.get(IUserDataProfilesMainService), disposables);
		mainProcessElectronServer.registerChannel('userDataProfiles', userDataProfilesService);
		sharedProcessClient.then(client => client.registerChannel('userDataProfiles', userDataProfilesService));

		// Storage (main & shared process)
		const storageChannel = this._register(new StorageDatabaseChannel(this.logService, accessor.get(IStorageMainService)));
		mainProcessElectronServer.registerChannel('storage', storageChannel);
		sharedProcessClient.then(client => client.registerChannel('storage', storageChannel));

		// Logger
		const loggerChannel = new LoggerChannel(accessor.get(ILoggerMainService),);
		mainProcessElectronServer.registerChannel('logger', loggerChannel);
		sharedProcessClient.then(client => client.registerChannel('logger', loggerChannel));
	}

  private async openFirstWindow(accessor: ServicesAccessor, /* initialProtocolUrls: IInitialProtocolUrls | undefined */): Promise<IDevWindow[]> {
    const windowsMainService = this.windowsMainService = accessor.get(IWindowsMainService);
		
    return windowsMainService.open();
  }

	private async resolveShellEnvironment(args: NativeParsedArgs, env: IProcessEnvironment, notifyOnError: boolean): Promise<typeof process.env> {
		try {
			return await getResolvedShellEnv(this.configurationService, this.logService, args, env);
		} catch (error) {
			const errorMessage = toErrorMessage(error);
			if (notifyOnError) {
				this.windowsMainService?.sendToFocused('vscode:showResolveShellEnvError', errorMessage);
			} else {
				this.logService.error(errorMessage);
			}
		}

		return {};
	}
  
}
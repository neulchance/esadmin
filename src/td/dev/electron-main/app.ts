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

/**
 * The main TD Dev application. There will only ever be one instance,
 * even if the user starts many instances (e.g. from the command line).
 */
export class DevApplication /* extends Disposable */ {

  private windowsMainService: IWindowsMainService | undefined;

  constructor(
    @IInstantiationService private readonly mainInstantiationService: IInstantiationService,
		@IEnvironmentMainService private readonly environmentMainService: IEnvironmentMainService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@ILogService private readonly logService: ILogService,
  ) {

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
    // Services
    const appInstantiationService = await this.initServices(/* machineId, sqmId, sharedProcessReady */);
    
    // Open Windows
		await appInstantiationService.invokeFunction(accessor => this.openFirstWindow(accessor/* , initialProtocolUrls */));
  }

  private async initServices(): Promise<IInstantiationService> {
    const services = new ServiceCollection();

    // Windows
    services.set(IWindowsMainService, new SyncDescriptor(WindowsMainService/* , [machineId, sqmId, this.userEnv], false */));

    return this.mainInstantiationService.createChild(services);
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
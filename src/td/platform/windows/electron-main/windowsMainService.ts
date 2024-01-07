/*----------------------------------------------------------------------------------------------------
 *  Copyright (c) TinyDeskDev. All rights reserved.
 *  Licensed under the UNLICENSED License. See License.txt in the project root for license information.
 *---------------------------------------------------------------------------------------------------*/

import {BrowserWindow, WebContents} from 'electron';
import {distinct} from 'td/base/common/arrays';
import {IPath, IPathsToWaitFor} from 'td/platform/window/common/window';
import {IProcessEnvironment} from 'td/base/common/platform';
import {IEmptyWindowBackupInfo} from 'td/platform/backup/node/backup';
import {NativeParsedArgs} from 'td/platform/environment/common/argv';
import {IInstantiationService} from 'td/platform/instantiation/common/instantiation';
import {IUserDataProfile} from 'td/platform/userDataProfile/common/userDataProfile';
import {INativeWindowConfiguration} from 'td/platform/window/common/window';
import {IDevWindow} from 'td/platform/window/electron-main/window';
import {DevWindow} from 'td/platform/windows/electron-main/windowImpl';
import {ISingleFolderWorkspaceIdentifier, IWorkspaceIdentifier} from 'td/platform/workspace/common/workspace';
import {IEnvironmentMainService} from 'td/platform/environment/electron-main/environmentMainService';
import {ILoggerMainService} from 'td/platform/log/electron-main/loggerService';

interface IOpenBrowserWindowOptions {
	readonly userEnv?: IProcessEnvironment;
	readonly cli?: NativeParsedArgs;

	readonly workspace?: IWorkspaceIdentifier | ISingleFolderWorkspaceIdentifier;

	readonly remoteAuthority?: string;

	readonly initialStartup?: boolean;

	readonly filesToOpen?: IFilesToOpen;

	readonly forceNewWindow?: boolean;
	readonly forceNewTabbedWindow?: boolean;
	readonly windowToUse?: IDevWindow;

	readonly emptyWindowBackupInfo?: IEmptyWindowBackupInfo;
	readonly forceProfile?: string;
	readonly forceTempProfile?: boolean;
}

interface IFilesToOpen {
	readonly remoteAuthority?: string;

	filesToOpenOrCreate: IPath[];
	filesToDiff: IPath[];
	filesToMerge: IPath[];

	filesToWait?: IPathsToWaitFor;
}

export class WindowsMainService /* extends Disposable implements IWindowsMainService */ {

  private readonly windows = new Map<number, IDevWindow>();

  constructor(
    private readonly machineId: string,
		private readonly sqmId: string,
    private readonly initialUserEnv: IProcessEnvironment,
    @ILoggerMainService private readonly loggerService: ILoggerMainService,
    @IInstantiationService private readonly instantiationService: IInstantiationService,
    @IEnvironmentMainService private readonly environmentMainService: IEnvironmentMainService,
  ) {
  }

  async open(/* openConfig: IOpenConfiguration */): Promise<IDevWindow[]> {
    const {windows: usedWindows} = await this.doOpen()
    return usedWindows
  }

  private async doOpen(): Promise<{ windows: IDevWindow[];}> {
    const usedWindows: IDevWindow[] = [];

    function addUsedWindow(window: IDevWindow, openedFiles?: boolean): void {
			usedWindows.push(window);
		}

    addUsedWindow(await this.openInBrowserWindow())
    
    return {windows: distinct(usedWindows)};
  }

  private async openInBrowserWindow(/* options: IOpenBrowserWindowOptions */): Promise<IDevWindow> {
    let window: IDevWindow | undefined;

    // Build up the window configuration from provided options, config and environment
    const configuration/* : INativeWindowConfiguration */ = {

      windowId: -1,	// Will be filled in by the window once loaded later
      appRoot: this.environmentMainService.appRoot,

      userEnv: {...this.initialUserEnv/* , ...options.userEnv */},


      loggers: {
				window: [],
				global: this.loggerService.getRegisteredLoggers()
			},
    }

    console.log('this.environmentMainService.logsHome', this.environmentMainService.logsHome)

    if (!window) {
      const createdWindow = window = this.instantiationService.createInstance(DevWindow);
    }

    await this.doOpenInBrowserWindow(window, configuration/* , options, defaultProfile */);


    return window
  }

  private async doOpenInBrowserWindow(window: IDevWindow, configuration: any, options?: IOpenBrowserWindowOptions, defaultProfile?: IUserDataProfile): Promise<void> {
    console.log('configuration', configuration)
    window.load(configuration);
  }

  getWindowById(windowId: number): IDevWindow | undefined {
		return this.windows.get(windowId);
	}

  getWindowByWebContents(webContents: WebContents): IDevWindow | undefined {
		const browserWindow = BrowserWindow.fromWebContents(webContents);
		if (!browserWindow) {
			return undefined;
		}

		return this.getWindowById(browserWindow.id);
	}
}
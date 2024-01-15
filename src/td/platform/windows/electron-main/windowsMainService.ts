/*----------------------------------------------------------------------------------------------------
 *  Copyright (c) TinyDeskDev. All rights reserved.
 *  Licensed under the UNLICENSED License. See License.txt in the project root for license information.
 *---------------------------------------------------------------------------------------------------*/

import {BrowserWindow, WebContents} from 'electron';
import {hostname, release, arch} from 'os';
import {distinct} from 'td/base/common/arrays';
import {IPath, IPathsToWaitFor, IWindowSettings} from 'td/platform/window/common/window';
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
import {Schemas} from 'td/base/common/network';
import {IUserDataProfilesMainService} from 'td/platform/userDataProfile/electron-main/userDataProfile';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {Disposable} from 'td/base/common/lifecycle';
import {Emitter} from 'td/base/common/event';
import {IWindowsCountChangedEvent} from 'td/platform/windows/electron-main/windows';

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

export class WindowsMainService extends Disposable /* implements IWindowsMainService */ {

  declare readonly _serviceBrand: undefined;

  private readonly _onDidOpenWindow = this._register(new Emitter<IDevWindow>());
	readonly onDidOpenWindow = this._onDidOpenWindow.event;

  private readonly _onDidSignalReadyWindow = this._register(new Emitter<IDevWindow>());
	readonly onDidSignalReadyWindow = this._onDidSignalReadyWindow.event;

	private readonly _onDidDestroyWindow = this._register(new Emitter<IDevWindow>());
	readonly onDidDestroyWindow = this._onDidDestroyWindow.event;

	private readonly _onDidChangeWindowsCount = this._register(new Emitter<IWindowsCountChangedEvent>());
	readonly onDidChangeWindowsCount = this._onDidChangeWindowsCount.event;

	private readonly _onDidMaximizeWindow = this._register(new Emitter<IDevWindow>());
	readonly onDidMaximizeWindow = this._onDidMaximizeWindow.event;

	private readonly _onDidUnmaximizeWindow = this._register(new Emitter<IDevWindow>());
	readonly onDidUnmaximizeWindow = this._onDidUnmaximizeWindow.event;

	private readonly _onDidChangeFullScreen = this._register(new Emitter<IDevWindow>());
	readonly onDidChangeFullScreen = this._onDidChangeFullScreen.event;

  private readonly _onDidTriggerSystemContextMenu = this._register(new Emitter<{ window: IDevWindow; x: number; y: number }>());
	readonly onDidTriggerSystemContextMenu = this._onDidTriggerSystemContextMenu.event;

  private readonly windows = new Map<number, IDevWindow>();

  constructor(
    private readonly machineId: string,
		private readonly sqmId: string,
    private readonly initialUserEnv: IProcessEnvironment,
    @ILoggerMainService private readonly loggerService: ILoggerMainService,
    @IInstantiationService private readonly instantiationService: IInstantiationService,
    @IEnvironmentMainService private readonly environmentMainService: IEnvironmentMainService,
    @IUserDataProfilesMainService private readonly userDataProfilesMainService: IUserDataProfilesMainService,
    @IConfigurationService private readonly configurationService: IConfigurationService,
  ) {
    super()
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
    // const windowConfig = this.configurationService.getValue<IWindowSettings | undefined>('window');

    // const lastActiveWindow = this.getLastActiveWindow();
    // const defaultProfile = lastActiveWindow?.profile ?? this.userDataProfilesMainService.defaultProfile;
    const defaultProfile = this.userDataProfilesMainService.defaultProfile;

    let window: IDevWindow | undefined;

    // Build up the window configuration from provided options, config and environment
    const configuration/* : INativeWindowConfiguration */ = {

      windowId: -1,	// Will be filled in by the window once loaded later
      appRoot: this.environmentMainService.appRoot,

      profiles: {
				home: this.userDataProfilesMainService.profilesHome,
				all: this.userDataProfilesMainService.profiles,
				// Set to default profile first and resolve and update the profile
				// only after the workspace-backup is registered.
				// Because, workspace identifier of an empty window is known only then.
				profile: defaultProfile
			},

      homeDir: this.environmentMainService.userHome.with({scheme: Schemas.file}).fsPath,
			tmpDir: this.environmentMainService.tmpDir.with({scheme: Schemas.file}).fsPath,
      userDataDir: this.environmentMainService.userDataPath,

      userEnv: {...this.initialUserEnv/* , ...options.userEnv */},


      loggers: {
				window: [],
				global: this.loggerService.getRegisteredLoggers()
			},

      os: {release: release(), hostname: hostname(), arch: arch()},
    }
    
    if (!window) {
      const createdWindow = window = this.instantiationService.createInstance(DevWindow);
    }

    // Update window identifier and session now
		// that we have the window object in hand.
		configuration.windowId = window.id;

    await this.doOpenInBrowserWindow(window, configuration/* , options, defaultProfile */);


    return window
  }

  private async doOpenInBrowserWindow(window: IDevWindow, configuration: any, options?: IOpenBrowserWindowOptions, defaultProfile?: IUserDataProfile): Promise<void> {
  // console.log('configuration', configuration)
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
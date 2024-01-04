/*----------------------------------------------------------------------------------------------------
 *  Copyright (c) TinyDeskDev. All rights reserved.
 *  Licensed under the UNLICENSED License. See License.txt in the project root for license information.
 *---------------------------------------------------------------------------------------------------*/

import {BrowserWindow, WebContents} from 'electron';
import {distinct} from 'td/base/common/arrays';
import {IProcessEnvironment} from 'td/base/common/platform';
import {IInstantiationService} from 'td/platform/instantiation/common/instantiation';
import {IDevWindow} from 'td/platform/window/electron-main/window';
import {DevWindow} from 'td/platform/windows/electron-main/windowImpl';

export class WindowsMainService /* extends Disposable implements IWindowsMainService */ {

  private readonly windows = new Map<number, IDevWindow>();

  constructor(
    private readonly machineId: string,
		private readonly sqmId: string,
    private readonly initialUserEnv: IProcessEnvironment,
    @IInstantiationService private readonly instantiationService: IInstantiationService,
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

  private async openInBrowserWindow(): Promise<IDevWindow> {
    let window: IDevWindow | undefined;

    if (!window) {
      const createdWindow = window = this.instantiationService.createInstance(DevWindow);
    }

    return window
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
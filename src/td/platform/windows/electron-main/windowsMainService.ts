/*----------------------------------------------------------------------------------------------------
 *  Copyright (c) TinyDeskDev. All rights reserved.
 *  Licensed under the UNLICENSED License. See License.txt in the project root for license information.
 *---------------------------------------------------------------------------------------------------*/

import {distinct} from 'td/base/common/arrays';
import {IInstantiationService} from 'td/platform/instantiation/common/instantiation';
import {ICodeWindow} from 'td/platform/window/electron-main/window';
import {CodeWindow} from 'td/platform/windows/electron-main/windowImpl';

export class WindowsMainService /* extends Disposable implements IWindowsMainService */ {

  constructor(
    @IInstantiationService private readonly instantiationService: IInstantiationService,
  ) {
  }
  async open(/* openConfig: IOpenConfiguration */): Promise<ICodeWindow[]> {
    const {windows: usedWindows} = await this.doOpen()
    return usedWindows
  }

  private async doOpen(): Promise<{ windows: ICodeWindow[];}> {
    const usedWindows: ICodeWindow[] = [];

    function addUsedWindow(window: ICodeWindow, openedFiles?: boolean): void {
			usedWindows.push(window);
		}

    addUsedWindow(await this.openInBrowserWindow())
    
    return {windows: distinct(usedWindows)};
  }

  private async openInBrowserWindow(): Promise<ICodeWindow> {
    let window: ICodeWindow | undefined;

    if (!window) {
      const createdWindow = window = this.instantiationService.createInstance(CodeWindow);
    }
    
    return window
  }
}
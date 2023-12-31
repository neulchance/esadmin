/*----------------------------------------------------------------------------------------------------
 *  Copyright (c) TinyDeskDev. All rights reserved.
 *  Licensed under the UNLICENSED License. See License.txt in the project root for license information.
 *---------------------------------------------------------------------------------------------------*/

import {ICodeWindow} from 'td/platform/window/electron-main/window';
import {CodeWindow} from 'td/platform/windows/electron-main/windowImpl';

export class WindowsMainService /* extends Disposable implements IWindowsMainService */ {
  async open(/* openConfig: IOpenConfiguration */): Promise<ICodeWindow[]> {
    this.doOpen()
  }

  private async doOpen() {

  }
}
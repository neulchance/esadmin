/*----------------------------------------------------------------------------------------------------
 *  Copyright (c) TinyDeskDev. All rights reserved.
 *  Licensed under the UNLICENSED License. See License.txt in the project root for license information.
 *---------------------------------------------------------------------------------------------------*/

import {app, BrowserWindow, Display, nativeImage, NativeImage, Rectangle, screen, SegmentedControlSegment, systemPreferences, TouchBar, TouchBarSegmentedControl} from 'electron';
import * as path from 'path'

export class DevWindow {
  constructor() {
    
    console.log(path.join(__dirname, 'preload.js'))
    const win = new BrowserWindow({
      width: 800,
      height: 600,
      backgroundColor: 'black',
      webPreferences: {
        preload: 'file:///Users/home/workspace/organizations/org-neulchance/with-electron/neulchan-tddev/out/td/base/parts/sandbox/electron-sandbox/preload.js'
      }
    })

    win.loadURL('file:///Users/home/workspace/organizations/org-neulchance/with-electron/neulchan-tddev/out/td/dev/electron-sandbox/workbench/workbench.html')
  }
}
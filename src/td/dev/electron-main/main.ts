/*---------------------------------------------------------------------------------------------
 *  Copyright (c) TinyDeskDev. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {app, dialog} from 'electron';
// import { unlinkSync } from 'fs';
import {aa} from 'td/dev/electron-main/sub'

/**
 * The main VS Code entry point.
 *
 * Note: This class can exist more than once for example when VS Code is already
 * running and a second instance is started from the command line. It will always
 * try to communicate with an existing instance to prevent that 2 VS Code instances
 * are running at the same time.
 */
class DevMain {
  
  main(): void {
		try {
			this.startup();
		} catch (error) {
			console.error(error.message);
			app.exit(1);
		}
	}

  private async startup(): Promise<void> {
    console.log('startup')
  }

  constructor() {
    aa()
  }
}

// Main Startup
const dev = new DevMain();
dev.main();

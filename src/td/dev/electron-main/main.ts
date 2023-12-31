/*----------------------------------------------------------------------------------------------------
 *  Copyright (c) TinyDeskDev. All rights reserved.
 *  Licensed under the UNLICENSED License. See License.txt in the project root for license information.
 *---------------------------------------------------------------------------------------------------*/

import {app, dialog} from 'electron'
import {unlinkSync} from 'fs'
import {DevApplication} from 'td/dev/electron-main/app'
import {ServiceCollection} from 'td/platform/instantiation/common/serviceCollection'

/**
 * The main TD Dev entry point.
 *
 * Note: This class can exist more than once for example when VS Code is already
 * running and a second instance is started from the command line. It will always
 * try to communicate with an existing instance to prevent that 2 VS Code instances
 * are running at the same time.
 */
class DevMain {
  
  main(): void {
		try {
			this.startup()
		} catch (error) {
			console.error(error.message)
			app.exit(1)
		}
	}

  private async startup(): Promise<void> {

    // Create services
    this.createService()

    try {
      new DevApplication()
      // return instantiationService.createInstance(CodeApplication, mainProcessNodeIpcServer, instanceEnvironment).startup()
    } catch (error) {
      // instantiationService.invokeFunction(this.quit, error)
    }
  }

  private createService() {
    const services = new ServiceCollection()
    console.log('createService')
  }
}

// Main Startup
const dev = new DevMain()
dev.main()

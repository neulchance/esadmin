/*----------------------------------------------------------------------------------------------------
 *  Copyright (c) TinyDeskDev. All rights reserved.
 *  Licensed under the UNLICENSED License. See License.txt in the project root for license information.
 *---------------------------------------------------------------------------------------------------*/

import {app, dialog} from 'electron'
import {unlinkSync} from 'fs'
import {DevApplication} from 'td/dev/electron-main/app'
import {ServiceCollection} from 'td/platform/instantiation/common/serviceCollection'
import {InstantiationService} from 'td/platform/instantiation/common/instantiationService'
import {IInstantiationService} from 'td/platform/instantiation/common/instantiation'
import {ProtocolMainService} from 'td/platform/protocol/electron-main/protocolMainService'
import {IProtocolMainService} from 'td/platform/protocol/electron-main/protocol'

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
    const [instantiationService] = this.createService()

    try {

      try {
        // 
      } catch (error) {
        // 
      }

      // Startup
      await instantiationService.invokeFunction(async accessor => {
        // accessor.get()
        
        return instantiationService.createInstance(DevApplication).startup()
      })
    } catch (error) {
      // instantiationService.invokeFunction(this.quit, error)
    }
  }

  private createService(): [IInstantiationService] {
    const services = new ServiceCollection()

    // Protocol (instantiated early and not using sync descriptor for security reasons)
    // services.set(IProtocolMainService, new ProtocolMainService(environmentMainService, userDataProfilesMainService, logService));

    return [new InstantiationService(services, true)]
  }
}

// Main Startup
const dev = new DevMain()
dev.main()

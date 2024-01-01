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

/**
 * The main TD Dev application. There will only ever be one instance,
 * even if the user starts many instances (e.g. from the command line).
 */
export class DevApplication /* extends Disposable */ {

  private windowsMainService: IWindowsMainService | undefined;

  constructor(
    @IInstantiationService private readonly mainInstantiationService: IInstantiationService,
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
  
}
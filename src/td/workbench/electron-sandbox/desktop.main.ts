import {domContentLoaded} from 'td/base/browser/dom';
import {mainWindow} from 'td/base/browser/window';
import {Disposable} from 'td/base/common/lifecycle';
import {ServiceCollection} from 'td/platform/instantiation/common/serviceCollection';
import {INativeWindowConfiguration} from 'td/platform/window/common/window';
import {Workbench} from '../browser/workbench';

export class DesktopMain extends Disposable {
  
  constructor(
		private readonly configuration?: INativeWindowConfiguration
	) {
    super()

    this.init()
	}

  private init(): void {
    console.log('DesktopMain init')
  }

  async open(): Promise<void> {
    // Init services and wait for DOM to be ready in parallel
		const [services] = await Promise.all([this.initServices(), domContentLoaded(mainWindow)]);

    // Create Workbench
    const workbench = new Workbench(mainWindow.document.body/* , {extraClasses: this.getExtraClasses()}, services.serviceCollection, services.logService */);
    console.log('workbench', workbench)
  }

  private async initServices(): Promise<{serviceCollection: ServiceCollection; /* logService: ILogService; storageService: NativeWorkbenchStorageService; configurationService: IConfigurationService */}> {
    const serviceCollection = new ServiceCollection();

    return {serviceCollection};
  }
}

export function main() {
  const workbench = new DesktopMain();
  workbench.open();
}
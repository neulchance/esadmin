import {domContentLoaded} from 'td/base/browser/dom';
import {mainWindow} from 'td/base/browser/window';
import {Disposable} from 'td/base/common/lifecycle';
import {ServiceCollection} from 'td/platform/instantiation/common/serviceCollection';
import {INativeWindowConfiguration} from 'td/platform/window/common/window';

export class DesktopMain extends Disposable {
  
  constructor(
		private readonly configuration?: INativeWindowConfiguration
	) {
    super()
	}

  async open(): Promise<void> {
    // Init services and wait for DOM to be ready in parallel
		const [services] = await Promise.all([this.initServices(), domContentLoaded(mainWindow)]);
    console.log('open')

    // Create Workplane
    // const workbench = new Workbench(mainWindow.document.body, {extraClasses: this.getExtraClasses()}, services.serviceCollection, services.logService);
  }

  private async initServices(): Promise<{serviceCollection: ServiceCollection; /* logService: ILogService; storageService: NativeWorkbenchStorageService; configurationService: IConfigurationService */}> {
    const serviceCollection = new ServiceCollection();

    return {serviceCollection};
  }
}

export function main() {
  const workplane = new DesktopMain();
  workplane.open();
}
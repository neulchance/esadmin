import {Emitter} from 'td/base/common/event';
import {getSingletonServiceDescriptors} from 'td/platform/instantiation/common/extensions';
import {IInstantiationService} from 'td/platform/instantiation/common/instantiation';
import {ServiceCollection} from 'td/platform/instantiation/common/serviceCollection';
import {ILogService} from 'td/platform/log/common/log';
import {Layout} from 'td/workbench/browser/layout';
import {ILifecycleService, WillShutdownEvent} from 'td/workbench/services/lifecycle/common/lifecycle';
import {IWorkbenchLayoutService, Parts} from '../services/layout/browser/layoutService';
import {onUnexpectedError} from 'td/base/common/errors';
import {InstantiationService} from 'td/platform/instantiation/common/instantiationService';
import {IStorageService} from 'td/platform/storage/common/storage';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {INotificationService} from 'td/platform/notification/common/notification';
import {NotificationService} from 'td/workbench/services/notification/common/notificationService';
import {setARIAContainer} from 'td/base/browser/ui/aria/aria';
import {isChrome, isFirefox, isLinux, isSafari, isWeb, isWindows} from 'td/base/common/platform';
import {coalesce} from 'td/base/common/arrays';
import {mainWindow} from 'td/base/browser/window';
import {Part} from 'td/workbench/browser/part';

export interface IWorkbenchOptions {

	/**
	 * Extra classes to be added to the workbench container.
	 */
	extraClasses?: string[];
}

export class Workbench extends Layout {

  private readonly _onWillShutdown = this._register(new Emitter<WillShutdownEvent>());
  readonly onWillShutdown = this._onWillShutdown.event;

	private readonly _onDidShutdown = this._register(new Emitter<void>());
	readonly onDidShutdown = this._onDidShutdown.event;
  
  constructor(
    parent: HTMLElement,
    private readonly options: IWorkbenchOptions | undefined,
		private readonly serviceCollection: ServiceCollection,
		logService: ILogService
  ) {
    const red = "\x1b[31m"
    const green = "\x1b[32m"
    const blue = "\x1b[34m"
    const done = "\x1b[0m"
    console.log('%c Oh my heavens! ', 'background: #222; color: #bada55');
    console.log(`${green} Welcome to the app! ${done}`);
    console.log(`${blue}parent${done}`, parent)
    super(parent);
    
  }
  startup() {
    try {
      const red = "\x1b[31m"; const green = "\x1b[32m"; const blue = "\x1b[34m"; const done = "\x1b[0m"
      console.log(`${blue}try startup${done}`)

      // Services
      const instantiationService = this.initServices(this.serviceCollection);

      instantiationService.invokeFunction(accessor => {
        const lifecycleService = accessor.get(ILifecycleService);
        console.log('lifecycleService', lifecycleService)
				const storageService = accessor.get(IStorageService);
				const configurationService = accessor.get(IConfigurationService);
				// const hostService = accessor.get(IHostService);
				// const dialogService = accessor.get(IDialogService);
				const notificationService = accessor.get(INotificationService) as NotificationService;

				// Layout
				super.initLayout(accessor);

				// Registries
				// Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).start(accessor);
				// Registry.as<IEditorFactoryRegistry>(EditorExtensions.EditorFactory).start(accessor);

				// Context Keys
				// this._register(instantiationService.createInstance(WorkbenchContextKeysHandler));

				// Register Listeners
				// this.registerListeners(lifecycleService, storageService, configurationService, hostService, dialogService);

				// Render Workbench
				this.renderWorkbench(instantiationService, notificationService, storageService, configurationService);

				// Workbench Layout
				super.createWorkbenchLayout();

				// Layout
				super.layout();

				// Restore
				this.restore(lifecycleService);
      })

      return instantiationService;
    } catch (error) {
      onUnexpectedError(error);

			throw error; // rethrow because this is a critical issue we cannot handle properly here
    }
  }

  private initServices(serviceCollection: ServiceCollection): IInstantiationService {

    // Layout Service
		// @ts-expect-error
		serviceCollection.set(IWorkbenchLayoutService, this);

    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
		//
		// NOTE: Please do NOT register services here. Use `registerSingleton()`
		//       from `workbench.common.main.ts` if the service is shared between
		//       desktop and web or `workbench.desktop.main.ts` if the service
		//       is desktop only.
		//
		// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

		// All Contributed Services
		const contributedServices = getSingletonServiceDescriptors();
		for (const [id, descriptor] of contributedServices) {
			serviceCollection.set(id, descriptor);
		}

    const instantiationService = new InstantiationService(serviceCollection, true);

    return instantiationService
  }

  /**
   * Invoked from self in startup()
   */
  private renderWorkbench(instantiationService: IInstantiationService, notificationService: NotificationService, storageService: IStorageService, configurationService: IConfigurationService): void {
		
		// ARIA
		setARIAContainer(this.mainContainer);
		console.log('this.mainContainer', this.mainContainer)

		// State specific classes
		const platformClass = isWindows ? 'windows' : isLinux ? 'linux' : 'mac';
		const workbenchClasses = coalesce([
			'jangdan-workbench',
			platformClass,
			isWeb ? 'web' : undefined,
			isChrome ? 'chromium' : isFirefox ? 'firefox' : isSafari ? 'safari' : undefined,
			// ...this.getLayoutClasses(),
			...(this.options?.extraClasses ? this.options.extraClasses : [])
		]);

		this.mainContainer.classList.add(...workbenchClasses);
    mainWindow.document.body.classList.add(platformClass); // used by our fonts

		console.log('this.mainContainer 2', this.mainContainer)
    console.log('mainWindow', mainWindow)

		// Create Parts
		for (const {id, role, classes, options} of [
			{id: Parts.STATUSBAR_PART, role: 'status', classes: ['statusbar'], options: {}}
		]) {
			const partContainer = this.createPart(id, role, classes);

			// mark(`code/willCreatePart/${id}`);
			super.getPart(id).create(partContainer, options);
			// mark(`code/didCreatePart/${id}`);
		}

		// Add Workbench to DOM
		this.parent.appendChild(this.mainContainer)
  }

	private createPart(id: string, role: string, classes: string[]): HTMLElement {
		const part = document.createElement(role === 'status' ? 'footer' /* Use footer element for status bar #98376 */ : 'div');
		part.classList.add('part', ...classes);
		part.id = id;
		part.setAttribute('role', role);
		if (role === 'status') {
			part.setAttribute('aria-live', 'off');
		}

		return part;
	}

	private restore(lifecycleService: ILifecycleService): void {
	}
}
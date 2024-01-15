import {Emitter, setGlobalLeakWarningThreshold} from 'td/base/common/event';
import {getSingletonServiceDescriptors} from 'td/platform/instantiation/common/extensions';
import {IInstantiationService} from 'td/platform/instantiation/common/instantiation';
import {ServiceCollection} from 'td/platform/instantiation/common/serviceCollection';
import {ILogService} from 'td/platform/log/common/log';
import {Layout} from 'td/workbench/browser/layout';
import {ILifecycleService, LifecyclePhase, WillShutdownEvent} from 'td/workbench/services/lifecycle/common/lifecycle';
import {Position, Parts, IWorkbenchLayoutService, positionToString} from 'td/workbench/services/layout/browser/layoutService';
import {onUnexpectedError, setUnexpectedErrorHandler} from 'td/base/common/errors';
import {InstantiationService} from 'td/platform/instantiation/common/instantiationService';
import {IStorageService, StorageScope, StorageTarget, WillSaveStateReason} from 'td/platform/storage/common/storage';
import {IConfigurationChangeEvent, IConfigurationService} from 'td/platform/configuration/common/configuration';
import {INotificationService} from 'td/platform/notification/common/notification';
import {NotificationService} from 'td/workbench/services/notification/common/notificationService';
import {setARIAContainer} from 'td/base/browser/ui/aria/aria';
import {isChrome, isFirefox, isLinux, isMacintosh, isNative, isSafari, isWeb, isWindows} from 'td/base/common/platform';
import {coalesce} from 'td/base/common/arrays';
import {mainWindow} from 'td/base/browser/window';
import {Part} from 'td/workbench/browser/part';
import {Registry} from 'td/platform/registry/common/platform';
import {IWorkbenchContributionsRegistry, Extensions as WorkbenchExtensions} from 'td/workbench/common/contributions';
import {IHostService} from '../services/host/browser/host';
import {IDialogService} from 'td/platform/dialogs/common/dialogs';
import {FontMeasurements} from 'td/editor/browser/config/fontMeasurements';
import {addDisposableListener} from 'td/base/browser/dom';
import {toErrorMessage} from 'td/base/common/errorMessage';
import {localize} from 'td/nls';
import {EditorExtensions, IEditorFactoryRegistry} from '../common/editor';
import {BareFontInfo} from 'td/editor/common/config/fontInfo';
import {PixelRatio} from 'td/base/browser/browser';


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
    super(parent);

		this.registerErrorHandler(logService);
  }

	private registerErrorHandler(logService: ILogService): void {

		// Listen on unhandled rejection events
		this._register(addDisposableListener(mainWindow, 'unhandledrejection', event => {

			// See https://developer.mozilla.org/en-US/docs/Web/API/PromiseRejectionEvent
			onUnexpectedError(event.reason);

			// Prevent the printing of this event to the console
			event.preventDefault();
		}));

		// Install handler for unexpected errors
		setUnexpectedErrorHandler(error => this.handleUnexpectedError(error, logService));

		// Inform user about loading issues from the loader
		interface AnnotatedLoadingError extends Error {
			phase: 'loading';
			moduleId: string;
			neededBy: string[];
		}
		interface AnnotatedFactoryError extends Error {
			phase: 'factory';
			moduleId: string;
		}
		interface AnnotatedValidationError extends Error {
			phase: 'configuration';
		}
		type AnnotatedError = AnnotatedLoadingError | AnnotatedFactoryError | AnnotatedValidationError;

		if (typeof mainWindow.require?.config === 'function') {
			mainWindow.require.config({
				onError: (err: AnnotatedError) => {
					if (err.phase === 'loading') {
						onUnexpectedError(new Error(localize('loaderErrorNative', "Failed to load a required file. Please restart the application to try again. Details: {0}", JSON.stringify(err))));
					}
					console.error(err);
				}
			});
		}
	}

	private previousUnexpectedError: { message: string | undefined; time: number } = {message: undefined, time: 0};
	private handleUnexpectedError(error: unknown, logService: ILogService): void {
		const message = toErrorMessage(error, true);
		if (!message) {
			return;
		}

		const now = Date.now();
		if (message === this.previousUnexpectedError.message && now - this.previousUnexpectedError.time <= 1000) {
			return; // Return if error message identical to previous and shorter than 1 second
		}

		this.previousUnexpectedError.time = now;
		this.previousUnexpectedError.message = message;

		// Log it
		logService.error(message);
	}

  startup(): IInstantiationService {
		console.log('startup')
    try {

			// Configure emitter leak warning threshold
			setGlobalLeakWarningThreshold(175);

      // Services
      const instantiationService = this.initServices(this.serviceCollection);

      instantiationService.invokeFunction(accessor => {
        const lifecycleService = accessor.get(ILifecycleService);
				const storageService = accessor.get(IStorageService);
				const configurationService = accessor.get(IConfigurationService);
				const hostService = accessor.get(IHostService);
				const dialogService = accessor.get(IDialogService);
				const notificationService = accessor.get(INotificationService) as NotificationService;

				// Layout
				this.initLayout(accessor);

				// Registries
				Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).start(accessor);
				Registry.as<IEditorFactoryRegistry>(EditorExtensions.EditorFactory).start(accessor);

				// Context Keys
				// this._register(instantiationService.createInstance(WorkbenchContextKeysHandler));

				// Register Listeners
				this.registerListeners(lifecycleService, storageService, configurationService, hostService, dialogService);

				// Render Workbench
				this.renderWorkbench(instantiationService, /* notificationService, */ storageService, configurationService);

				// Workbench Layout
				this.createWorkbenchLayout();

				// Layout
				this.layout();

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

		// // Wrap up
		// instantiationService.invokeFunction(accessor => {
		// 	const lifecycleService = accessor.get(ILifecycleService);

		// 	// TODO@Sandeep debt around cyclic dependencies
		// 	const configurationService = accessor.get(IConfigurationService) as any;
		// 	if (typeof configurationService.acquireInstantiationService === 'function') {
		// 		configurationService.acquireInstantiationService(instantiationService);
		// 	}

		// 	// Signal to lifecycle that services are set
		// 	lifecycleService.phase = LifecyclePhase.Ready;
		// });

    return instantiationService
  }

	private registerListeners(lifecycleService: ILifecycleService, storageService: IStorageService, configurationService: IConfigurationService, hostService: IHostService, dialogService: IDialogService): void {

		// Configuration changes
		this._register(configurationService.onDidChangeConfiguration(e => this.updateFontAliasing(e, configurationService)));

		// Font Info
		if (isNative) {
			this._register(storageService.onWillSaveState(e => {
				if (e.reason === WillSaveStateReason.SHUTDOWN) {
					this.storeFontInfo(storageService);
				}
			}));
		} else {
			this._register(lifecycleService.onWillShutdown(() => this.storeFontInfo(storageService)));
		}

		// Lifecycle
		this._register(lifecycleService.onWillShutdown(event => this._onWillShutdown.fire(event)));
		this._register(lifecycleService.onDidShutdown(() => {
			this._onDidShutdown.fire();
			this.dispose();
		}));

		// In some environments we do not get enough time to persist state on shutdown.
		// In other cases, VSCode might crash, so we periodically save state to reduce
		// the chance of loosing any state.
		// The window loosing focus is a good indication that the user has stopped working
		// in that window so we pick that at a time to collect state.
		this._register(hostService.onDidChangeFocus(focus => {
			if (!focus) {
				storageService.flush();
			}
		}));

		// Dialogs showing/hiding
		this._register(dialogService.onWillShowDialog(() => this.mainContainer.classList.add('modal-dialog-visible')));
		this._register(dialogService.onDidShowDialog(() => this.mainContainer.classList.remove('modal-dialog-visible')));
	}

	private fontAliasing: 'default' | 'antialiased' | 'none' | 'auto' | undefined;
	private updateFontAliasing(e: IConfigurationChangeEvent | undefined, configurationService: IConfigurationService) {
		if (!isMacintosh) {
			return; // macOS only
		}

		if (e && !e.affectsConfiguration('workbench.fontAliasing')) {
			return;
		}

		const aliasing = configurationService.getValue<'default' | 'antialiased' | 'none' | 'auto'>('workbench.fontAliasing');
		if (this.fontAliasing === aliasing) {
			return;
		}

		this.fontAliasing = aliasing;

		// Remove all
		const fontAliasingValues: (typeof aliasing)[] = ['antialiased', 'none', 'auto'];
		this.mainContainer.classList.remove(...fontAliasingValues.map(value => `monaco-font-aliasing-${value}`));

		// Add specific
		if (fontAliasingValues.some(option => option === aliasing)) {
			this.mainContainer.classList.add(`monaco-font-aliasing-${aliasing}`);
		}
	}

	private restoreFontInfo(storageService: IStorageService, configurationService: IConfigurationService): void {
		const storedFontInfoRaw = storageService.get('editorFontInfo', StorageScope.APPLICATION);
		if (storedFontInfoRaw) {
			try {
				const storedFontInfo = JSON.parse(storedFontInfoRaw);
				if (Array.isArray(storedFontInfo)) {
					FontMeasurements.restoreFontInfo(storedFontInfo);
				}
			} catch (err) {
				/* ignore */
			}
		}

		FontMeasurements.readFontInfo(BareFontInfo.createFromRawSettings(configurationService.getValue('editor'), PixelRatio.value));
	}

	private storeFontInfo(storageService: IStorageService): void {
		const serializedFontInfo = FontMeasurements.serializeFontInfo();
		if (serializedFontInfo) {
			storageService.store('editorFontInfo', JSON.stringify(serializedFontInfo), StorageScope.APPLICATION, StorageTarget.MACHINE);
		}
	}

  /**
   * Invoked from self in startup()
   */
  private renderWorkbench(instantiationService: IInstantiationService, /* notificationService: NotificationService, */ storageService: IStorageService, configurationService: IConfigurationService): void {
		
		// ARIA
		setARIAContainer(this.mainContainer);

		// State specific classes
		const platformClass = isWindows ? 'windows' : isLinux ? 'linux' : 'mac';
		const workbenchClasses = coalesce([
			'monaco-workbench',
			platformClass,
			isWeb ? 'web' : undefined,
			isChrome ? 'chromium' : isFirefox ? 'firefox' : isSafari ? 'safari' : undefined,
			...this.getLayoutClasses(),
			...(this.options?.extraClasses ? this.options.extraClasses : [])
		]);

		this.mainContainer.classList.add(...workbenchClasses);
    mainWindow.document.body.classList.add(platformClass); // used by our fonts

		if (isWeb) {
			mainWindow.document.body.classList.add('web');
		}

		// Apply font aliasing
		this.updateFontAliasing(undefined, configurationService);

		// Warm up font cache information before building up too many dom elements
		this.restoreFontInfo(storageService, configurationService);

    console.log('go ahead!')

		// Create Parts
		for (const {id, role, classes, options} of [
			{id: Parts.TITLEBAR_PART, role: 'none', classes: ['titlebar']},
			{id: Parts.BANNER_PART, role: 'banner', classes: ['banner']},
			{id: Parts.ACTIVITYBAR_PART, role: 'none', classes: ['activitybar', this.getSideBarPosition() === Position.LEFT ? 'left' : 'right']}, // Use role 'none' for some parts to make screen readers less chatty #114892
			{id: Parts.STATUSBAR_PART, role: 'status', classes: ['statusbar'], options: {}},
			{id: Parts.SIDEBAR_PART, role: 'none', classes: ['sidebar', this.getSideBarPosition() === Position.LEFT ? 'left' : 'right']},
		]) {
			const partContainer = this.createPart(id, role, classes);

			// mark(`code/willCreatePart/${id}`);
			const red = "\x1b[31m"; const green = "\x1b[32m"; const blue = "\x1b[34m"; const x1b33m = "\x1b[33m"; const done = "\x1b[0m";
			console.log(`${x1b33m}renderWorkbench this.getPart${done}`);
			this.getPart(id).create(partContainer, options);
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
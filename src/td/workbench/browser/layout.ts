import {Disposable, DisposableMap, IDisposable} from 'td/base/common/lifecycle';
import {Position, Parts, PanelOpensMaximizedOptions, IWorkbenchLayoutService, positionFromString, positionToString, panelOpensMaximizedFromString, PanelAlignment, ActivityBarPosition, LayoutSettings, MULTI_WINDOW_PARTS, SINGLE_WINDOW_PARTS, ZenModeSettings, EditorTabsMode} from 'td/workbench/services/layout/browser/layoutService';
import {ServicesAccessor} from 'td/platform/instantiation/common/instantiation';
import {Part} from 'td/workbench/browser/part';
import {coalesce} from 'td/base/common/arrays';
import {IStatusbarService} from 'td/workbench/services/statusbar/browser/statusbar';
import {SerializableGrid, ISerializableView, ISerializedGrid, Orientation, ISerializedNode, ISerializedLeafNode, Direction, IViewSize, Sizing} from 'td/base/browser/ui/grid/grid';
import {IUntypedEditorInput} from 'td/workbench/common/editor';
import {ILifecycleService, StartupKind} from 'td/workbench//services/lifecycle/common/lifecycle';
import {IFileService} from 'td/platform/files/common/files';
import {IStorageService, StorageScope, StorageTarget} from 'td/platform/storage/common/storage';
import {IConfigurationChangeEvent, IConfigurationService} from 'td/platform/configuration/common/configuration';
import {IWorkspaceContextService, WorkbenchState, isTemporaryWorkspace} from 'td/platform/workspace/common/workspace';
import {Emitter} from 'td/base/common/event';
import {IDimension, getActiveDocument, getClientArea, getWindow, getWindowId, getWindows, position, size} from 'td/base/browser/dom';
import {ILogService} from 'td/platform/log/common/log';
import {IPaneCompositePartService} from '../services/panecomposite/browser/panecomposite';
import {IViewDescriptorService, ViewContainerLocation} from 'td/workbench/common/views';
import {IBrowserWorkbenchEnvironmentService} from '../services/environment/browser/environmentService';
import {IPath, getMenuBarVisibility, getTitleBarStyle} from 'td/platform/window/common/window';
import {EditorGroupLayout, GroupsOrder, IEditorGroupsService} from 'td/workbench/services/editor/common/editorGroupsService';
import {URI} from 'td/base/common/uri';
import {IHostService} from 'td/workbench/services/host/browser/host';
import {mainWindow} from 'td/base/browser/window';
import {isFullscreen, isWCOEnabled} from 'td/base/browser/browser';
import {isMacintosh, isNative, isWeb, isWindows} from 'td/base/common/platform';
import {SidebarPart} from 'td/workbench/browser/parts/sidebar/sidebarPart';
import {WINDOW_ACTIVE_BORDER, WINDOW_INACTIVE_BORDER} from 'td/workbench/common/theme';
import {IThemeService} from 'td/platform/theme/common/themeService';

interface ILayoutRuntimeState {
	activeContainerId: number;
	mainWindowFullscreen: boolean;
	readonly maximized: Set<number>;
	hasFocus: boolean;
	mainWindowBorder: boolean;
	readonly menuBar: {
		toggled: boolean;
	};
	readonly zenMode: {
		readonly transitionDisposables: DisposableMap<string, IDisposable>;
	};
}

interface IEditorToOpen {
	readonly editor: IUntypedEditorInput;
	readonly viewColumn?: number;
}

interface ILayoutInitializationState {
	readonly views: {
		readonly defaults: string[] | undefined;
		readonly containerToRestore: {
			sideBar?: string;
			panel?: string;
			auxiliaryBar?: string;
		};
	};
	readonly editor: {
		readonly restoreEditors: boolean;
		readonly editorsToOpen: Promise<IEditorToOpen[]>;
	};
	readonly layout?: {
		readonly editors?: EditorGroupLayout;
	};
}

interface ILayoutState {
	readonly runtime: ILayoutRuntimeState;
	readonly initialization: ILayoutInitializationState;
}

enum LayoutClasses {
	SIDEBAR_HIDDEN = 'nosidebar',
	MAIN_EDITOR_AREA_HIDDEN = 'nomaineditorarea',
	PANEL_HIDDEN = 'nopanel',
	AUXILIARYBAR_HIDDEN = 'noauxiliarybar',
	STATUSBAR_HIDDEN = 'nostatusbar',
	FULLSCREEN = 'fullscreen',
	MAXIMIZED = 'maximized',
	WINDOW_BORDER = 'border'
}

interface IPathToOpen extends IPath {
	readonly viewColumn?: number;
}

interface IInitialEditorsState {
	readonly filesToOpenOrCreate?: IPathToOpen[];
	readonly filesToDiff?: IPathToOpen[];
	readonly filesToMerge?: IPathToOpen[];

	readonly layout?: EditorGroupLayout;
}

export abstract class Layout extends Disposable /* implements IWorkbenchLayoutService */ {

  declare readonly _serviceBrand: undefined;

	//#region Events

	private readonly _onDidChangeZenMode = this._register(new Emitter<boolean>());
	readonly onDidChangeZenMode = this._onDidChangeZenMode.event;

	private readonly _onDidChangeCenteredLayout = this._register(new Emitter<boolean>());
	readonly onDidChangeCenteredLayout = this._onDidChangeCenteredLayout.event;

	private readonly _onDidChangePanelAlignment = this._register(new Emitter<PanelAlignment>());
	readonly onDidChangePanelAlignment = this._onDidChangePanelAlignment.event;

	private readonly _onDidChangeWindowMaximized = this._register(new Emitter<{ windowId: number; maximized: boolean }>());
	readonly onDidChangeWindowMaximized = this._onDidChangeWindowMaximized.event;

	private readonly _onDidChangePanelPosition = this._register(new Emitter<string>());
	readonly onDidChangePanelPosition = this._onDidChangePanelPosition.event;

	private readonly _onDidChangePartVisibility = this._register(new Emitter<void>());
	readonly onDidChangePartVisibility = this._onDidChangePartVisibility.event;

	private readonly _onDidChangeNotificationsVisibility = this._register(new Emitter<boolean>());
	readonly onDidChangeNotificationsVisibility = this._onDidChangeNotificationsVisibility.event;

	private readonly _onDidLayoutMainContainer = this._register(new Emitter<IDimension>());
	readonly onDidLayoutMainContainer = this._onDidLayoutMainContainer.event;

	private readonly _onDidLayoutActiveContainer = this._register(new Emitter<IDimension>());
	readonly onDidLayoutActiveContainer = this._onDidLayoutActiveContainer.event;

	private readonly _onDidLayoutContainer = this._register(new Emitter<{ container: HTMLElement; dimension: IDimension }>());
	readonly onDidLayoutContainer = this._onDidLayoutContainer.event;

	private readonly _onDidAddContainer = this._register(new Emitter<{ container: HTMLElement; disposables: DisposableStore }>());
	readonly onDidAddContainer = this._onDidAddContainer.event;

	private readonly _onDidChangeActiveContainer = this._register(new Emitter<void>());
	readonly onDidChangeActiveContainer = this._onDidChangeActiveContainer.event;

	//#endregion

  //#region Properties

  readonly mainContainer = document.createElement('div');
	get activeContainer() { return this.getContainerFromDocument(getActiveDocument()); }
	get containers(): Iterable<HTMLElement> {
		const containers: HTMLElement[] = [];
		for (const {window} of getWindows()) {
			containers.push(this.getContainerFromDocument(window.document));
		}

		return containers;
	}

	private getContainerFromDocument(targetDocument: Document): HTMLElement {
		if (targetDocument === this.mainContainer.ownerDocument) {
			// main window
			return this.mainContainer;
		} else {
			// auxiliary window
			return targetDocument.body.getElementsByClassName('monaco-workbench')[0] as HTMLElement;
		}
	}

	private _mainContainerDimension!: IDimension;
	get mainContainerDimension(): IDimension { return this._mainContainerDimension; }

  //#endregion

  private readonly parts = new Map<string, Part>();

	private initialized = false;
	private workbenchGrid!: SerializableGrid<ISerializableView>;

	private titleBarPartView!: ISerializableView;
	private bannerPartView!: ISerializableView;
	private activityBarPartView!: ISerializableView;
	private sideBarPartView!: ISerializableView;
	private panelPartView!: ISerializableView;
	private auxiliaryBarPartView!: ISerializableView;
	private editorPartView!: ISerializableView;
	private statusBarPartView!: ISerializableView;

	private environmentService!: IBrowserWorkbenchEnvironmentService;
	private paneCompositeService!: IPaneCompositePartService;
	private storageService!: IStorageService;
	private hostService!: IHostService;
	private configurationService!: IConfigurationService;
	private contextService!: IWorkspaceContextService;
	private statusBarService!: IStatusbarService;
	private viewDescriptorService!: IViewDescriptorService;
	private logService!: ILogService;
	private themeService!: IThemeService;

	private state!: ILayoutState;
	private stateModel!: LayoutStateModel;

	private disposed = false;

  constructor(
    protected readonly parent: HTMLElement
  ) {
    super();
  }

  protected initLayout(accessor: ServicesAccessor): void {

    // Services
		this.environmentService = accessor.get(IBrowserWorkbenchEnvironmentService);
		this.storageService = accessor.get(IStorageService);
		this.hostService = accessor.get(IHostService);
		this.configurationService = accessor.get(IConfigurationService);
		this.contextService! = accessor.get(IWorkspaceContextService);
		this.themeService = accessor.get(IThemeService);
		this.logService = accessor.get(ILogService);
		this.logService.setLevel(1)


    // Parts
		this.paneCompositeService = accessor.get(IPaneCompositePartService);
		this.viewDescriptorService = accessor.get(IViewDescriptorService);
		this.statusBarService = accessor.get(IStatusbarService);

		// State
		this.initLayoutState(accessor.get(ILifecycleService), accessor.get(IFileService));
  }

  protected createWorkbenchLayout(): void {
		console.log('createWorkbenchLayout this.getPart')
		// const titleBar = this.getPart(Parts.TITLEBAR_PART);
		// const bannerPart = this.getPart(Parts.BANNER_PART);
		// const editorPart = this.getPart(Parts.EDITOR_PART);
		// const activityBar = this.getPart(Parts.ACTIVITYBAR_PART);
		// const panelPart = this.getPart(Parts.PANEL_PART);
		// const auxiliaryBarPart = this.getPart(Parts.AUXILIARYBAR_PART);
		// const sideBar = this.getPart(Parts.SIDEBAR_PART);
		const statusBar = this.getPart(Parts.STATUSBAR_PART);

		// View references for all parts
		// this.titleBarPartView = titleBar;
		// this.bannerPartView = bannerPart;
		// this.sideBarPartView = sideBar;
		// this.activityBarPartView = activityBar;
		// this.editorPartView = editorPart;
		// this.panelPartView = panelPart;
		// this.auxiliaryBarPartView = auxiliaryBarPart;
		this.statusBarPartView = statusBar;

		const viewMap = {
			// [Parts.ACTIVITYBAR_PART]: this.activityBarPartView,
			// [Parts.BANNER_PART]: this.bannerPartView,
			// [Parts.TITLEBAR_PART]: this.titleBarPartView,
			// [Parts.EDITOR_PART]: this.editorPartView,
			// [Parts.PANEL_PART]: this.panelPartView,
			// [Parts.SIDEBAR_PART]: this.sideBarPartView,
			[Parts.STATUSBAR_PART]: this.statusBarPartView,
			// [Parts.AUXILIARYBAR_PART]: this.auxiliaryBarPartView
		};

		const fromJSON = ({type}: { type: Parts }) => viewMap[type];
		const workbenchGrid = SerializableGrid.deserialize(
			this.createGridDescriptor(),
			{fromJSON},
			{proportionalLayout: false}
		);

		this.mainContainer.prepend(workbenchGrid.element);
		this.mainContainer.setAttribute('role', 'application');
		this.workbenchGrid = workbenchGrid;

		this.workbenchGrid.setViewVisible(this.statusBarPartView, true);
  }

	private handleContainerDidLayout(container: HTMLElement, dimension: IDimension): void {
		/* if (container === this.mainContainer) {
			this._onDidLayoutMainContainer.fire(dimension);
		}

		if (isActiveDocument(container)) {
		this._onDidLayoutActiveContainer.fire(dimension);
		}

		this._onDidLayoutContainer.fire({container, dimension}); */
	}

  layout(): void {
		if (!this.disposed) {
			this._mainContainerDimension = getClientArea(this.parent)
			this.logService.trace(`Layout#layout, height: ${this._mainContainerDimension.height}, width: ${this._mainContainerDimension.width}`);
			console.log('this._mainContainerDimension', this._mainContainerDimension)

			position(this.mainContainer, 0, 0, 0, 0, 'relative');
			size(this.mainContainer, this._mainContainerDimension.width, this._mainContainerDimension.height);

			// Layout the grid widget
			this.workbenchGrid.layout(this._mainContainerDimension.width, this._mainContainerDimension.height);
			this.initialized = true;

			// Emit as event
			this.handleContainerDidLayout(this.mainContainer, this._mainContainerDimension);

			console.log('go aheaddd')
		}
	}

	registerPart(part: Part): void {
		this.parts.set(part.getId(), part);
	}

	/*  */
	protected getPart(key: Parts): Part {
		const red = "\x1b[31m"; const green = "\x1b[32m"; const blue = "\x1b[34m"; const done = "\x1b[0m";
		console.log(`${blue}getPart: ${key} ${done}`)
		const part = this.parts.get(key);
		if (!part) {
			throw new Error(`Unknown part ${key}`);
		}

		return part;
	}

	private updateWindowsBorder(skipLayout = false) {
		if (
			isWeb ||
			isWindows || // not working well with zooming and window control overlays
			getTitleBarStyle(this.configurationService) !== 'custom'
		) {
			return;
		}

		const theme = this.themeService.getColorTheme();

		const activeBorder = theme.getColor(WINDOW_ACTIVE_BORDER);
		const inactiveBorder = theme.getColor(WINDOW_INACTIVE_BORDER);

		const didHaveMainWindowBorder = this.hasMainWindowBorder();

		for (const container of this.containers) {
			const isMainContainer = container === this.mainContainer;
			const isActiveContainer = this.activeContainer === container;
			const containerWindowId = getWindowId(getWindow(container));

			let windowBorder = false;
			if (!this.state.runtime.mainWindowFullscreen && !this.state.runtime.maximized.has(containerWindowId) && (activeBorder || inactiveBorder)) {
				windowBorder = true;

				// If the inactive color is missing, fallback to the active one
				const borderColor = isActiveContainer && this.state.runtime.hasFocus ? activeBorder : inactiveBorder ?? activeBorder;
				container.style.setProperty('--window-border-color', borderColor?.toString() ?? 'transparent');
			}

			if (isMainContainer) {
				this.state.runtime.mainWindowBorder = windowBorder;
			}

			container.classList.toggle(LayoutClasses.WINDOW_BORDER, windowBorder);
		}

		if (!skipLayout && didHaveMainWindowBorder !== this.hasMainWindowBorder()) {
			this.layout();
		}
	}

	private initLayoutState(lifecycleService: ILifecycleService, fileService: IFileService): void {
		this.stateModel = new LayoutStateModel(this.storageService, this.configurationService, this.contextService, this.parent);
		this.stateModel.load();

		// Layout Initialization State
		const initialEditorsState = this.getInitialEditorsState();
		if (initialEditorsState) {
			this.logService.info('Initial editor state', initialEditorsState);
		}
		const initialLayoutState: ILayoutInitializationState = {
			layout: {
				editors: initialEditorsState?.layout
			},
			editor: {
				restoreEditors: this.shouldRestoreEditors(this.contextService, initialEditorsState),
				editorsToOpen: this.resolveEditorsToOpen(fileService, initialEditorsState),
			},
			views: {
				defaults: this.getDefaultLayoutViews(this.environmentService, this.storageService),
				containerToRestore: {}
			}
		};

		// Layout Runtime State
		const layoutRuntimeState: ILayoutRuntimeState = {
			activeContainerId: this.getActiveContainerId(),
			mainWindowFullscreen: isFullscreen(mainWindow),
			hasFocus: this.hostService.hasFocus,
			maximized: new Set<number>(),
			mainWindowBorder: false,
			menuBar: {
				toggled: false,
			},
			zenMode: {
				transitionDisposables: new DisposableMap(),
			}
		};

		this.state = {
			initialization: initialLayoutState,
			runtime: layoutRuntimeState,
		};

		// Sidebar View Container To Restore
		if (/* this.isVisible(Parts.SIDEBAR_PART) */true) {

			// Only restore last viewlet if window was reloaded or we are in development mode
			let viewContainerToRestore: string | undefined;
			console.log('lifecycleService.startupKind', lifecycleService.startupKind, this.environmentService.isBuilt)
			if (!this.environmentService.isBuilt || lifecycleService.startupKind === StartupKind.ReloadedWindow || isWeb) {
				viewContainerToRestore = this.storageService.get(SidebarPart.activeViewletSettingsKey, StorageScope.WORKSPACE, this.viewDescriptorService.getDefaultViewContainer(ViewContainerLocation.Sidebar)?.id);
				console.log('viewContainerToRestore1', viewContainerToRestore)				
			} else {
				viewContainerToRestore = this.viewDescriptorService.getDefaultViewContainer(ViewContainerLocation.Sidebar)?.id;
				console.log('viewContainerToRestore2', viewContainerToRestore)				
			}

			if (viewContainerToRestore) {
				this.state.initialization.views.containerToRestore.sideBar = viewContainerToRestore;
			} else {
				this.stateModel.setRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN, true);
			}
		}

		// Activity bar cannot be hidden
		// This check must be called after state is set
		// because canActivityBarBeHidden calls isVisible
		if (this.stateModel.getRuntimeValue(LayoutStateKeys.ACTIVITYBAR_HIDDEN) && !false) {
			this.stateModel.setRuntimeValue(LayoutStateKeys.ACTIVITYBAR_HIDDEN, false);
		}

		// Window border
		this.updateWindowsBorder(true);
	}

	
	/* private canActivityBarBeHidden(): boolean {
		return !(this.configurationService.getValue(LayoutSettings.ACTIVITY_BAR_LOCATION) === ActivityBarPosition.TOP && !this.isVisible(Parts.TITLEBAR_PART, mainWindow));
	} */

	getSideBarPosition(): Position {
		return this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_POSITON);
	}

	private getActiveContainerId(): number {
		const activeContainer = this.activeContainer;

		return getWindow(activeContainer).tddevWindowId;
	}

	private getDefaultLayoutViews(environmentService: IBrowserWorkbenchEnvironmentService, storageService: IStorageService): string[] | undefined {
		const defaultLayout = environmentService.options?.defaultLayout;
		if (!defaultLayout) {
			return undefined;
		}

		if (!defaultLayout.force && !storageService.isNew(StorageScope.WORKSPACE)) {
			return undefined;
		}

		const {views} = defaultLayout;
		if (views?.length) {
			return views.map(view => view.id);
		}

		return undefined;
	}

	private shouldRestoreEditors(contextService: IWorkspaceContextService, initialEditorsState: IInitialEditorsState | undefined): boolean {

		// Restore editors based on a set of rules:
		// - never when running on temporary workspace
		// - not when we have files to open, unless:
		// - always when `window.restoreWindows: preserve`

		if (isTemporaryWorkspace(contextService.getWorkspace())) {
			return false;
		}

		const forceRestoreEditors = this.configurationService.getValue<string>('window.restoreWindows') === 'preserve';
		return !!forceRestoreEditors || initialEditorsState === undefined;
	}

	private async resolveEditorsToOpen(fileService: IFileService, initialEditorsState: IInitialEditorsState | undefined): Promise<IEditorToOpen[]> {
		// Empty workbench configured to open untitled file if empty
		if (this.contextService.getWorkbenchState() === WorkbenchState.EMPTY && this.configurationService.getValue('workbench.startupEditor') === 'newUntitledFile') {
			return [{
				editor: {resource: undefined} // open empty untitled file
			}];
		}

		return [];
	}

	isVisible(part: MULTI_WINDOW_PARTS, targetWindow: Window): boolean;
	isVisible(part: SINGLE_WINDOW_PARTS): boolean;
	isVisible(part: Parts, targetWindow?: Window): boolean;
	isVisible(part: Parts, targetWindow: Window = mainWindow): boolean {
		if (targetWindow !== mainWindow && part === Parts.EDITOR_PART) {
			return true; // cannot hide editor part in auxiliary windows
		}

		if (this.initialized) {
			switch (part) {
				case Parts.TITLEBAR_PART:
					return this.workbenchGrid.isViewVisible(this.titleBarPartView);
				case Parts.SIDEBAR_PART:
					return !this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN);
				case Parts.PANEL_PART:
					return !this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_HIDDEN);
				case Parts.AUXILIARYBAR_PART:
					return !this.stateModel.getRuntimeValue(LayoutStateKeys.AUXILIARYBAR_HIDDEN);
				case Parts.STATUSBAR_PART:
					return !this.stateModel.getRuntimeValue(LayoutStateKeys.STATUSBAR_HIDDEN);
				case Parts.ACTIVITYBAR_PART:
					return !this.stateModel.getRuntimeValue(LayoutStateKeys.ACTIVITYBAR_HIDDEN);
				case Parts.EDITOR_PART:
					return !this.stateModel.getRuntimeValue(LayoutStateKeys.EDITOR_HIDDEN);
				case Parts.BANNER_PART:
					return this.workbenchGrid.isViewVisible(this.bannerPartView);
				default:
					return false; // any other part cannot be hidden
			}
		}

		switch (part) {
			case Parts.TITLEBAR_PART:
				return this.shouldShowTitleBar();
			case Parts.SIDEBAR_PART:
				return !this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN);
			case Parts.PANEL_PART:
				return !this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_HIDDEN);
			case Parts.AUXILIARYBAR_PART:
				return !this.stateModel.getRuntimeValue(LayoutStateKeys.AUXILIARYBAR_HIDDEN);
			case Parts.STATUSBAR_PART:
				return !this.stateModel.getRuntimeValue(LayoutStateKeys.STATUSBAR_HIDDEN);
			case Parts.ACTIVITYBAR_PART:
				return !this.stateModel.getRuntimeValue(LayoutStateKeys.ACTIVITYBAR_HIDDEN);
			case Parts.EDITOR_PART:
				return !this.stateModel.getRuntimeValue(LayoutStateKeys.EDITOR_HIDDEN);
			default:
				return false; // any other part cannot be hidden
		}
	}

	private shouldShowTitleBar(): boolean {

		// Using the native title bar, don't ever show the custom one
		if (getTitleBarStyle(this.configurationService) === 'native') {
			return false;
		}

		// with the command center enabled, we should always show
		if (this.configurationService.getValue<boolean>(LayoutSettings.COMMAND_CENTER)) {
			return true;
		}

		// with the activity bar on top, we should always show
		if (this.configurationService.getValue(LayoutSettings.ACTIVITY_BAR_LOCATION) === ActivityBarPosition.TOP) {
			return true;
		}

		// macOS desktop does not need a title bar when full screen
		if (isMacintosh && isNative) {
			return !this.state.runtime.mainWindowFullscreen;
		}

		// non-fullscreen native must show the title bar
		if (isNative && !this.state.runtime.mainWindowFullscreen) {
			return true;
		}

		// if WCO is visible, we have to show the title bar
		if (isWCOEnabled() && !this.state.runtime.mainWindowFullscreen) {
			return true;
		}

		// remaining behavior is based on menubar visibility
		switch (getMenuBarVisibility(this.configurationService)) {
			case 'classic':
				return !this.state.runtime.mainWindowFullscreen || this.state.runtime.menuBar.toggled;
			case 'compact':
			case 'hidden':
				return false;
			case 'toggle':
				return this.state.runtime.menuBar.toggled;
			case 'visible':
				return true;
			default:
				return isWeb ? false : !this.state.runtime.mainWindowFullscreen || this.state.runtime.menuBar.toggled;
		}
	}

	private shouldShowBannerFirst(): boolean {
		return isWeb && !isWCOEnabled();
	}

	private _openedDefaultEditors: boolean = false;
	get openedDefaultEditors() { return this._openedDefaultEditors; }

	private getInitialEditorsState(): IInitialEditorsState | undefined {

		// Check for editors / editor layout from `defaultLayout` options first
		const defaultLayout = this.environmentService.options?.defaultLayout;
		if ((defaultLayout?.editors?.length || defaultLayout?.layout?.editors) && (defaultLayout.force || this.storageService.isNew(StorageScope.WORKSPACE))) {
			this._openedDefaultEditors = true;

			return {
				layout: defaultLayout.layout?.editors,
				filesToOpenOrCreate: defaultLayout?.editors?.map(editor => {
					return {
						viewColumn: editor.viewColumn,
						fileUri: URI.revive(editor.uri),
						openOnlyIfExists: editor.openOnlyIfExists,
						options: editor.options
					};
				})
			};
		}

		// Then check for files to open, create or diff/merge from main side
		const {filesToOpenOrCreate, filesToDiff, filesToMerge} = this.environmentService;
		if (filesToOpenOrCreate || filesToDiff || filesToMerge) {
			return {filesToOpenOrCreate, filesToDiff, filesToMerge};
		}

		return undefined;
	}

	private arrangeEditorNodes(nodes: { editor: ISerializedNode; sideBar?: ISerializedNode; auxiliaryBar?: ISerializedNode }, availableHeight: number, availableWidth: number): ISerializedNode {
		if (!nodes.sideBar && !nodes.auxiliaryBar) {
			nodes.editor.size = availableHeight;
			return nodes.editor;
		}

		const result = [nodes.editor];
		nodes.editor.size = availableWidth;
		if (nodes.sideBar) {
			if (this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_POSITON) === Position.LEFT) {
				result.splice(0, 0, nodes.sideBar);
			} else {
				result.push(nodes.sideBar);
			}

			nodes.editor.size -= this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN) ? 0 : nodes.sideBar.size;
		}

		if (nodes.auxiliaryBar) {
			if (this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_POSITON) === Position.RIGHT) {
				result.splice(0, 0, nodes.auxiliaryBar);
			} else {
				result.push(nodes.auxiliaryBar);
			}

			nodes.editor.size -= this.stateModel.getRuntimeValue(LayoutStateKeys.AUXILIARYBAR_HIDDEN) ? 0 : nodes.auxiliaryBar.size;
		}

		return {
			type: 'branch',
			data: result,
			size: availableHeight
		};
	}

	private arrangeMiddleSectionNodes(nodes: {editor: ISerializedNode; panel: ISerializedNode; activityBar: ISerializedNode; sideBar: ISerializedNode; auxiliaryBar: ISerializedNode},
		availableWidth: number, availableHeight: number)
	: ISerializedNode[] {
		const activityBarSize = this.stateModel.getRuntimeValue(LayoutStateKeys.ACTIVITYBAR_HIDDEN) ? 0 : nodes.activityBar.size;
		const sideBarSize = this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN) ? 0 : nodes.sideBar.size;
		const auxiliaryBarSize = this.stateModel.getRuntimeValue(LayoutStateKeys.AUXILIARYBAR_HIDDEN) ? 0 : nodes.auxiliaryBar.size;
		const panelSize = this.stateModel.getInitializationValue(LayoutStateKeys.PANEL_SIZE) ? 0 : nodes.panel.size;

		const result = [] as ISerializedNode[];
		if (this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_POSITION) !== Position.BOTTOM) {
			result.push(nodes.editor);
			nodes.editor.size = availableWidth - activityBarSize - sideBarSize - panelSize - auxiliaryBarSize;
			if (this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_POSITION) === Position.RIGHT) {
				result.push(nodes.panel);
			} else {
				result.splice(0, 0, nodes.panel);
			}

			if (this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_POSITON) === Position.LEFT) {
				result.push(nodes.auxiliaryBar);
				result.splice(0, 0, nodes.sideBar);
				result.splice(0, 0, nodes.activityBar);
			} else {
				result.splice(0, 0, nodes.auxiliaryBar);
				result.push(nodes.sideBar);
				result.push(nodes.activityBar);
			}
		} else {
			const panelAlignment = this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_ALIGNMENT);
			const sideBarPosition = this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_POSITON);
			const sideBarNextToEditor = !(panelAlignment === 'center' || (sideBarPosition === Position.LEFT && panelAlignment === 'right') || (sideBarPosition === Position.RIGHT && panelAlignment === 'left'));
			const auxiliaryBarNextToEditor = !(panelAlignment === 'center' || (sideBarPosition === Position.RIGHT && panelAlignment === 'right') || (sideBarPosition === Position.LEFT && panelAlignment === 'left'));

			const editorSectionWidth = availableWidth - activityBarSize - (sideBarNextToEditor ? 0 : sideBarSize) - (auxiliaryBarNextToEditor ? 0 : auxiliaryBarSize);
			result.push({
				type: 'branch',
				data: [this.arrangeEditorNodes({
					editor: nodes.editor,
					sideBar: sideBarNextToEditor ? nodes.sideBar : undefined,
					auxiliaryBar: auxiliaryBarNextToEditor ? nodes.auxiliaryBar : undefined
				}, availableHeight - panelSize, editorSectionWidth), nodes.panel],
				size: editorSectionWidth
			});

			if (!sideBarNextToEditor) {
				if (sideBarPosition === Position.LEFT) {
					result.splice(0, 0, nodes.sideBar);
				} else {
					result.push(nodes.sideBar);
				}
			}

			if (!auxiliaryBarNextToEditor) {
				if (sideBarPosition === Position.RIGHT) {
					result.splice(0, 0, nodes.auxiliaryBar);
				} else {
					result.push(nodes.auxiliaryBar);
				}
			}

			if (sideBarPosition === Position.LEFT) {
				result.splice(0, 0, nodes.activityBar);
			} else {
				result.push(nodes.activityBar);
			}
		}

		return result;
	}

	hasMainWindowBorder(): boolean {
		return this.state.runtime.mainWindowBorder;
	}

	getLayoutClasses(): string[] {
		return coalesce([
			!this.isVisible(Parts.SIDEBAR_PART) ? LayoutClasses.SIDEBAR_HIDDEN : undefined,
			!this.isVisible(Parts.EDITOR_PART, mainWindow) ? LayoutClasses.MAIN_EDITOR_AREA_HIDDEN : undefined,
			!this.isVisible(Parts.PANEL_PART) ? LayoutClasses.PANEL_HIDDEN : undefined,
			!this.isVisible(Parts.AUXILIARYBAR_PART) ? LayoutClasses.AUXILIARYBAR_HIDDEN : undefined,
			!this.isVisible(Parts.STATUSBAR_PART) ? LayoutClasses.STATUSBAR_HIDDEN : undefined,
			this.state.runtime.mainWindowFullscreen ? LayoutClasses.FULLSCREEN : undefined
		]);
	}

	private createGridDescriptor(): ISerializedGrid {
		const {width, height} = this.stateModel.getInitializationValue(LayoutStateKeys.GRID_SIZE);
		const sideBarSize = this.stateModel.getInitializationValue(LayoutStateKeys.SIDEBAR_SIZE);
		const auxiliaryBarPartSize = this.stateModel.getInitializationValue(LayoutStateKeys.AUXILIARYBAR_SIZE);
		const panelSize = this.stateModel.getInitializationValue(LayoutStateKeys.PANEL_SIZE);

		const titleBarHeight = this.titleBarPartView.minimumHeight;
		const bannerHeight = this.bannerPartView.minimumHeight;
		const statusBarHeight = this.statusBarPartView.minimumHeight;
		const activityBarWidth = this.activityBarPartView.minimumWidth;
		const middleSectionHeight = height - titleBarHeight - statusBarHeight;

		const titleAndBanner: ISerializedNode[] = [
			{
				type: 'leaf',
				data: {type: Parts.TITLEBAR_PART},
				size: titleBarHeight,
				visible: /* this.isVisible(Parts.TITLEBAR_PART, mainWindow) */ false
			},
			{
				type: 'leaf',
				data: {type: Parts.BANNER_PART},
				size: bannerHeight,
				visible: false
			}
		];

		const activityBarNode: ISerializedLeafNode = {
			type: 'leaf',
			data: {type: Parts.ACTIVITYBAR_PART},
			size: activityBarWidth,
			visible: !this.stateModel.getRuntimeValue(LayoutStateKeys.ACTIVITYBAR_HIDDEN)
		};

		const sideBarNode: ISerializedLeafNode = {
			type: 'leaf',
			data: {type: Parts.SIDEBAR_PART},
			size: sideBarSize,
			visible: !this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_HIDDEN)
		};

		const auxiliaryBarNode: ISerializedLeafNode = {
			type: 'leaf',
			data: {type: Parts.AUXILIARYBAR_PART},
			size: auxiliaryBarPartSize,
			visible: /* this.isVisible(Parts.AUXILIARYBAR_PART) */ false
		};

		const editorNode: ISerializedLeafNode = {
			type: 'leaf',
			data: {type: Parts.EDITOR_PART},
			size: 0, // Update based on sibling sizes
			visible: !this.stateModel.getRuntimeValue(LayoutStateKeys.EDITOR_HIDDEN)
		};

		const panelNode: ISerializedLeafNode = {
			type: 'leaf',
			data: {type: Parts.PANEL_PART},
			size: panelSize,
			visible: !this.stateModel.getRuntimeValue(LayoutStateKeys.PANEL_HIDDEN)
		};

		const middleSection: ISerializedNode[] = this.arrangeMiddleSectionNodes({
			activityBar: activityBarNode,
			auxiliaryBar: auxiliaryBarNode,
			editor: editorNode,
			panel: panelNode,
			sideBar: sideBarNode
		}, width, middleSectionHeight);

		const result: ISerializedGrid = {
			root: {
				type: 'branch',
				size: width,
				data: [
					// ...(this.shouldShowBannerFirst() ? titleAndBanner.reverse() : titleAndBanner),
					{
						type: 'branch',
						data: middleSection,
						size: middleSectionHeight
					},
					{
						type: 'leaf',
						data: {type: Parts.STATUSBAR_PART},
						size: statusBarHeight,
						visible: !this.stateModel.getRuntimeValue(LayoutStateKeys.STATUSBAR_HIDDEN)
					}
				]
			},
			orientation: Orientation.VERTICAL,
			width,
			height
		};
		return result
	}

	override dispose(): void {
		super.dispose();

		this.disposed = true;
	}
}

//#region Layout State Model

interface IWorkbenchLayoutStateKey {
	readonly name: string;
	readonly runtime: boolean;
	readonly defaultValue: unknown;
	readonly scope: StorageScope;
	readonly target: StorageTarget;
	readonly zenModeIgnore?: boolean;
}

type StorageKeyType = string | boolean | number | object;

abstract class WorkbenchLayoutStateKey<T extends StorageKeyType> implements IWorkbenchLayoutStateKey {

	abstract readonly runtime: boolean;

	constructor(readonly name: string, readonly scope: StorageScope, readonly target: StorageTarget, public defaultValue: T) { }
}

class RuntimeStateKey<T extends StorageKeyType> extends WorkbenchLayoutStateKey<T> {

	readonly runtime = true;

	constructor(name: string, scope: StorageScope, target: StorageTarget, defaultValue: T, readonly zenModeIgnore?: boolean) {
		super(name, scope, target, defaultValue);
	}
}

class InitializationStateKey<T extends StorageKeyType> extends WorkbenchLayoutStateKey<T> {
	readonly runtime = false;
}

const LayoutStateKeys = {

	// Editor
	EDITOR_CENTERED: new RuntimeStateKey<boolean>('editor.centered', StorageScope.WORKSPACE, StorageTarget.MACHINE, false),

	// Zen Mode
	ZEN_MODE_ACTIVE: new RuntimeStateKey<boolean>('zenMode.active', StorageScope.WORKSPACE, StorageTarget.MACHINE, false),
	ZEN_MODE_EXIT_INFO: new RuntimeStateKey('zenMode.exitInfo', StorageScope.WORKSPACE, StorageTarget.MACHINE, {
		transitionedToCenteredEditorLayout: false,
		transitionedToFullScreen: false,
		handleNotificationsDoNotDisturbMode: false,
		wasVisible: {
			auxiliaryBar: false,
			panel: false,
			sideBar: false,
		},
	}),

	// Part Sizing
	GRID_SIZE: new InitializationStateKey('grid.size', StorageScope.PROFILE, StorageTarget.MACHINE, {width: 800, height: 600}),
	SIDEBAR_SIZE: new InitializationStateKey<number>('sideBar.size', StorageScope.PROFILE, StorageTarget.MACHINE, 200),
	AUXILIARYBAR_SIZE: new InitializationStateKey<number>('auxiliaryBar.size', StorageScope.PROFILE, StorageTarget.MACHINE, 200),
	PANEL_SIZE: new InitializationStateKey<number>('panel.size', StorageScope.PROFILE, StorageTarget.MACHINE, 300),

	PANEL_LAST_NON_MAXIMIZED_HEIGHT: new RuntimeStateKey<number>('panel.lastNonMaximizedHeight', StorageScope.PROFILE, StorageTarget.MACHINE, 300),
	PANEL_LAST_NON_MAXIMIZED_WIDTH: new RuntimeStateKey<number>('panel.lastNonMaximizedWidth', StorageScope.PROFILE, StorageTarget.MACHINE, 300),
	PANEL_WAS_LAST_MAXIMIZED: new RuntimeStateKey<boolean>('panel.wasLastMaximized', StorageScope.WORKSPACE, StorageTarget.MACHINE, false),

	// Part Positions
	SIDEBAR_POSITON: new RuntimeStateKey<Position>('sideBar.position', StorageScope.WORKSPACE, StorageTarget.MACHINE, Position.LEFT),
	PANEL_POSITION: new RuntimeStateKey<Position>('panel.position', StorageScope.WORKSPACE, StorageTarget.MACHINE, Position.BOTTOM),
	PANEL_ALIGNMENT: new RuntimeStateKey<PanelAlignment>('panel.alignment', StorageScope.PROFILE, StorageTarget.USER, 'center'),

	// Part Visibility
	ACTIVITYBAR_HIDDEN: new RuntimeStateKey<boolean>('activityBar.hidden', StorageScope.WORKSPACE, StorageTarget.MACHINE, false, true),
	SIDEBAR_HIDDEN: new RuntimeStateKey<boolean>('sideBar.hidden', StorageScope.WORKSPACE, StorageTarget.MACHINE, false),
	EDITOR_HIDDEN: new RuntimeStateKey<boolean>('editor.hidden', StorageScope.WORKSPACE, StorageTarget.MACHINE, false),
	PANEL_HIDDEN: new RuntimeStateKey<boolean>('panel.hidden', StorageScope.WORKSPACE, StorageTarget.MACHINE, true),
	AUXILIARYBAR_HIDDEN: new RuntimeStateKey<boolean>('auxiliaryBar.hidden', StorageScope.WORKSPACE, StorageTarget.MACHINE, true),
	STATUSBAR_HIDDEN: new RuntimeStateKey<boolean>('statusBar.hidden', StorageScope.WORKSPACE, StorageTarget.MACHINE, false, true)

} as const;

interface ILayoutStateChangeEvent<T extends StorageKeyType> {
	readonly key: RuntimeStateKey<T>;
	readonly value: T;
}

enum LegacyWorkbenchLayoutSettings {
	STATUSBAR_VISIBLE = 'workbench.statusBar.visible', // Deprecated to UI State
	SIDEBAR_POSITION = 'workbench.sideBar.location', // Deprecated to UI State
}

class LayoutStateModel extends Disposable {

	static readonly STORAGE_PREFIX = 'workbench.';

	private readonly _onDidChangeState = this._register(new Emitter<ILayoutStateChangeEvent<StorageKeyType>>());
	readonly onDidChangeState = this._onDidChangeState.event;

	private readonly stateCache = new Map<string, unknown>();

	constructor(
		private readonly storageService: IStorageService,
		private readonly configurationService: IConfigurationService,
		private readonly contextService: IWorkspaceContextService,
		private readonly container: HTMLElement
	) {
		super();

		this._register(this.configurationService.onDidChangeConfiguration(configurationChange => this.updateStateFromLegacySettings(configurationChange)));
	}

	private updateStateFromLegacySettings(configurationChangeEvent: IConfigurationChangeEvent): void {
		const isZenMode = this.getRuntimeValue(LayoutStateKeys.ZEN_MODE_ACTIVE);

		if (configurationChangeEvent.affectsConfiguration(LayoutSettings.ACTIVITY_BAR_LOCATION) && !isZenMode) {
			// this.setRuntimeValueAndFire(LayoutStateKeys.ACTIVITYBAR_HIDDEN, this.isActivityBarHidden());
		}

		if (configurationChangeEvent.affectsConfiguration(LegacyWorkbenchLayoutSettings.STATUSBAR_VISIBLE) && !isZenMode) {
			// this.setRuntimeValueAndFire(LayoutStateKeys.STATUSBAR_HIDDEN, !this.configurationService.getValue(LegacyWorkbenchLayoutSettings.STATUSBAR_VISIBLE));
		}

		if (configurationChangeEvent.affectsConfiguration(LegacyWorkbenchLayoutSettings.SIDEBAR_POSITION)) {
			this.setRuntimeValueAndFire(LayoutStateKeys.SIDEBAR_POSITON, positionFromString(this.configurationService.getValue(LegacyWorkbenchLayoutSettings.SIDEBAR_POSITION) ?? 'left'));
		}
	}

	private updateLegacySettingsFromState<T extends StorageKeyType>(key: RuntimeStateKey<T>, value: T): void {
		const isZenMode = this.getRuntimeValue(LayoutStateKeys.ZEN_MODE_ACTIVE);
		if (key.zenModeIgnore && isZenMode) {
			return;
		}

		if (key === LayoutStateKeys.ACTIVITYBAR_HIDDEN) {
			this.configurationService.updateValue(LayoutSettings.ACTIVITY_BAR_LOCATION, value ? ActivityBarPosition.HIDDEN : undefined);
		} else if (key === LayoutStateKeys.STATUSBAR_HIDDEN) {
			this.configurationService.updateValue(LegacyWorkbenchLayoutSettings.STATUSBAR_VISIBLE, !value);
		} else if (key === LayoutStateKeys.SIDEBAR_POSITON) {
			this.configurationService.updateValue(LegacyWorkbenchLayoutSettings.SIDEBAR_POSITION, positionToString(value as Position));
		}
	}

	load(): void {
		let key: keyof typeof LayoutStateKeys;

		// Apply all defaults
		for (key in LayoutStateKeys) {
			const stateKey = LayoutStateKeys[key];
			if (this.stateCache.get(stateKey.name) === undefined) {
				this.stateCache.set(stateKey.name, stateKey.defaultValue);
			}
		}
	}

	save(workspace: boolean, global: boolean): void {
		let key: keyof typeof LayoutStateKeys;

		const isZenMode = this.getRuntimeValue(LayoutStateKeys.ZEN_MODE_ACTIVE);

		for (key in LayoutStateKeys) {
			const stateKey = LayoutStateKeys[key] as WorkbenchLayoutStateKey<StorageKeyType>;
			if ((workspace && stateKey.scope === StorageScope.WORKSPACE) ||
				(global && stateKey.scope === StorageScope.PROFILE)) {
				if (isZenMode && stateKey instanceof RuntimeStateKey && stateKey.zenModeIgnore) {
					continue; // Don't write out specific keys while in zen mode
				}

				this.saveKeyToStorage(stateKey);
			}
		}
	}

	getInitializationValue<T extends StorageKeyType>(key: InitializationStateKey<T>): T {
		return this.stateCache.get(key.name) as T;
	}

	setInitializationValue<T extends StorageKeyType>(key: InitializationStateKey<T>, value: T): void {
		this.stateCache.set(key.name, value);
	}

	getRuntimeValue<T extends StorageKeyType>(key: RuntimeStateKey<T>, fallbackToSetting?: boolean): T {
		if (fallbackToSetting) {
			switch (key) {
				case LayoutStateKeys.ACTIVITYBAR_HIDDEN:
					this.stateCache.set(key.name, this.isActivityBarHidden());
					break;
				case LayoutStateKeys.STATUSBAR_HIDDEN:
					this.stateCache.set(key.name, !this.configurationService.getValue(LegacyWorkbenchLayoutSettings.STATUSBAR_VISIBLE));
					break;
				case LayoutStateKeys.SIDEBAR_POSITON:
					this.stateCache.set(key.name, this.configurationService.getValue(LegacyWorkbenchLayoutSettings.SIDEBAR_POSITION) ?? 'left');
					break;
			}
		}

		return this.stateCache.get(key.name) as T;
	}

	setRuntimeValue<T extends StorageKeyType>(key: RuntimeStateKey<T>, value: T): void {
		this.stateCache.set(key.name, value);
		const isZenMode = this.getRuntimeValue(LayoutStateKeys.ZEN_MODE_ACTIVE);

		if (key.scope === StorageScope.PROFILE) {
			if (!isZenMode || !key.zenModeIgnore) {
				this.saveKeyToStorage<T>(key);
				this.updateLegacySettingsFromState(key, value);
			}
		}
	}

	private isActivityBarHidden(): boolean {
		const oldValue = this.configurationService.getValue<boolean | undefined>('workbench.activityBar.visible');
		if (oldValue !== undefined) {
			return !oldValue;
		}
		return this.configurationService.getValue(LayoutSettings.ACTIVITY_BAR_LOCATION) !== ActivityBarPosition.SIDE;
	}

	private setRuntimeValueAndFire<T extends StorageKeyType>(key: RuntimeStateKey<T>, value: T): void {
		const previousValue = this.stateCache.get(key.name);
		if (previousValue === value) {
			return;
		}

		this.setRuntimeValue(key, value);
		this._onDidChangeState.fire({key, value});
	}

	private saveKeyToStorage<T extends StorageKeyType>(key: WorkbenchLayoutStateKey<T>): void {
		const value = this.stateCache.get(key.name) as T;
		this.storageService.store(`${LayoutStateModel.STORAGE_PREFIX}${key.name}`, typeof value === 'object' ? JSON.stringify(value) : value, key.scope, key.target);
	}

	private loadKeyFromStorage<T extends StorageKeyType>(key: WorkbenchLayoutStateKey<T>): T | undefined {
		let value: any = this.storageService.get(`${LayoutStateModel.STORAGE_PREFIX}${key.name}`, key.scope);

		if (value !== undefined) {
			switch (typeof key.defaultValue) {
				case 'boolean': value = value === 'true'; break;
				case 'number': value = parseInt(value); break;
				case 'object': value = JSON.parse(value); break;
			}
		}

		return value as T | undefined;
	}
}
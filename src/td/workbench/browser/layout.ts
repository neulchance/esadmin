import {Disposable, DisposableMap, IDisposable} from 'td/base/common/lifecycle';
import {Position, Parts, PanelOpensMaximizedOptions, IWorkbenchLayoutService, positionFromString, positionToString, panelOpensMaximizedFromString, PanelAlignment, ActivityBarPosition, LayoutSettings, MULTI_WINDOW_PARTS, SINGLE_WINDOW_PARTS, ZenModeSettings, EditorTabsMode} from 'td/workbench/services/layout/browser/layoutService';
import {ServicesAccessor} from 'td/platform/instantiation/common/instantiation';
import {Part} from 'td/workbench/browser/part';
import {coalesce} from 'td/base/common/arrays';
import {IStatusbarService} from 'td/workbench/services/statusbar/browser/statusbar';
import {SerializableGrid, ISerializableView, ISerializedGrid, Orientation, ISerializedNode, ISerializedLeafNode, Direction, IViewSize, Sizing} from 'td/base/browser/ui/grid/grid';
import {IUntypedEditorInput} from 'td/workbench/common/editor';
import {ILifecycleService} from '../services/lifecycle/common/lifecycle';
import {IFileService} from 'td/platform/files/common/files';
import {IStorageService, StorageScope, StorageTarget} from 'td/platform/storage/common/storage';
import {IConfigurationChangeEvent, IConfigurationService} from 'td/platform/configuration/common/configuration';
import {IWorkspaceContextService} from 'td/platform/workspace/common/workspace';
import {Emitter} from 'td/base/common/event';
import {IDimension, getClientArea, position, size} from 'td/base/browser/dom';
import {ILogService} from 'td/platform/log/common/log';
import {mainWindow} from 'td/base/browser/window';
import {IPaneCompositePartService} from '../services/panecomposite/browser/panecomposite';
import {IViewDescriptorService} from '../common/views';

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
		// readonly editors?: EditorGroupLayout;
	};
}

interface ILayoutState {
	readonly runtime: ILayoutRuntimeState;
	readonly initialization: ILayoutInitializationState;
}

export abstract class Layout extends Disposable /* implements IWorkbenchLayoutService */ {

  declare readonly _serviceBrand: undefined;

  //#region Properties

  readonly mainContainer = document.createElement('div');

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

	private paneCompositeService!: IPaneCompositePartService;
	private storageService!: IStorageService;
	private configurationService!: IConfigurationService;
	private contextService!: IWorkspaceContextService;
	private statusBarService!: IStatusbarService;
	private viewDescriptorService!: IViewDescriptorService;
	private logService!: ILogService;

	

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
		this.storageService = accessor.get(IStorageService);
		this.configurationService = accessor.get(IConfigurationService);
		this.contextService! = accessor.get(IWorkspaceContextService);
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
		const editorPart = this.getPart(Parts.EDITOR_PART);
		const statusBar = this.getPart(Parts.STATUSBAR_PART);
		const sideBar = this.getPart(Parts.SIDEBAR_PART);
		const activityBar = this.getPart(Parts.ACTIVITYBAR_PART);
		const red = "\x1b[31m"; const green = "\x1b[32m"; const blue = "\x1b[34m"; const done = "\x1b[0m";
		console.log(`${green} Welcome to the app! ${done}`);
		console.log(`${blue}activityBar${done}`)
		console.log(activityBar)

		this.statusBarPartView = statusBar;
		this.activityBarPartView = activityBar;
		this.editorPartView = editorPart;
		this.sideBarPartView = sideBar;

		const viewMap = {
			[Parts.EDITOR_PART]: this.editorPartView,
			[Parts.SIDEBAR_PART]: this.sideBarPartView,
			[Parts.ACTIVITYBAR_PART]: this.activityBarPartView,
			[Parts.STATUSBAR_PART]: this.statusBarPartView,
		}

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
		console.log(`${blue} getPart ${done}`)
		console.log(`${blue} ${key} ${done}`)
		console.log(key)
		const part = this.parts.get(key);
		if (!part) {
			throw new Error(`Unknown part ${key}`);
		}

		return part;
	}

	private initLayoutState(lifecycleService: ILifecycleService, fileService: IFileService): void {
		this.stateModel = new LayoutStateModel(this.storageService, this.configurationService, this.contextService, this.parent);
		this.stateModel.load();
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

	getSideBarPosition(): Position {
		return this.stateModel.getRuntimeValue(LayoutStateKeys.SIDEBAR_POSITON);
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

	getInitializationValue<T extends StorageKeyType>(key: InitializationStateKey<T>): T {
		return this.stateCache.get(key.name) as T;
	}

	getRuntimeValue<T extends StorageKeyType>(key: RuntimeStateKey<T>, fallbackToSetting?: boolean): T {
		if (fallbackToSetting) {
			switch (key) {
				case LayoutStateKeys.ACTIVITYBAR_HIDDEN:
				this.stateCache.set(key.name, false);
					break;
				case LayoutStateKeys.STATUSBAR_HIDDEN:
					this.stateCache.set(key.name, !this.configurationService.getValue('workbench.statusBar.visible'));
					break;
				case LayoutStateKeys.SIDEBAR_POSITON:
					this.stateCache.set(key.name, this.configurationService.getValue('left'));
					break;
			}
		}

		return this.stateCache.get(key.name) as T;
	}
}
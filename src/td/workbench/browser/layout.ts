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

	private statusBarPartView!: ISerializableView;

	private storageService!: IStorageService;
	private configurationService!: IConfigurationService;
	private contextService!: IWorkspaceContextService;
	private statusBarService!: IStatusbarService;
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
		this.statusBarService = accessor.get(IStatusbarService);

		// State
		this.initLayoutState(accessor.get(ILifecycleService), accessor.get(IFileService));
  }

  protected createWorkbenchLayout(): void {
		const statusBar = this.getPart(Parts.STATUSBAR_PART);

		this.statusBarPartView = statusBar;

		const viewMap = {
			[Parts.STATUSBAR_PART]: this.statusBarPartView,
		}

		const fromJSON = ({type}: { type: Parts }) => viewMap[type];
		const workbenchGrid = SerializableGrid.deserialize(
			this.createGridDescriptor(),
			{fromJSON},
			{proportionalLayout: false}
		);

		console.log('this.mainContainer', this.mainContainer)
		console.log('workbenchGrid', workbenchGrid)
		console.log('workbenchGrid.element', workbenchGrid.element)
		this.mainContainer.prepend(workbenchGrid.element);
		this.mainContainer.setAttribute('role', 'application');
		this.workbenchGrid = workbenchGrid;

		// this.workbenchGrid.setViewVisible(this.statusBarPartView, true);
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

	protected getPart(key: Parts): Part {
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

		const statusBarHeight = this.statusBarPartView.minimumHeight;

		const result: ISerializedGrid = {
			root: {
				type: 'branch',
				data: [],
				size: width,
			},
			orientation: Orientation.VERTICAL,
			width,
			height
		}
		return result
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

	// Part Sizing
	GRID_SIZE: new InitializationStateKey('grid.size', StorageScope.PROFILE, StorageTarget.MACHINE, {width: 800, height: 600}),
}

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
}
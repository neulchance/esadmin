/*----------------------------------------------------------------------------------------------------
 *  Copyright (c) TinyDeskDev. All rights reserved.
 *  Licensed under the UNLICENSED License. See License.txt in the project root for license information.
 *---------------------------------------------------------------------------------------------------*/

import {app, BrowserWindow, Display, nativeImage, NativeImage, Rectangle, screen, SegmentedControlSegment, systemPreferences, TouchBar, TouchBarSegmentedControl} from 'electron';
import {Emitter, Event} from 'td/base/common/event';
import {release} from 'os';
import {IWindowState, IDevWindow, ILoadEvent, WindowMode, WindowError, LoadReason, defaultWindowState, IBaseWindow} from 'td/platform/window/electron-main/window';
import * as path from 'path'
import {IProtocolMainService} from 'td/platform/protocol/electron-main/protocol';
import {Disposable} from 'td/base/common/lifecycle';
import {getTitleBarStyle, INativeWindowConfiguration, useNativeFullScreen, useWindowControlsOverlay} from 'td/platform/window/common/window';
import {isBigSurOrNewer, isMacintosh, isWindows} from 'td/base/common/platform';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {IStateService} from 'td/platform/state/node/state';
import {IEnvironmentMainService} from 'td/platform/environment/electron-main/environmentMainService';
import {DeferredPromise, timeout} from 'td/base/common/async';
import {FileAccess} from 'td/base/common/network';
import {NativeParsedArgs} from 'td/platform/environment/common/argv';

export interface IWindowCreationOptions {
	readonly state: IWindowState;
	readonly extensionDevelopmentPath?: string[];
	readonly isExtensionTestHost?: boolean;
}

interface ITouchBarSegment extends SegmentedControlSegment {
	readonly id: string;
}

interface ILoadOptions {
	readonly isReload?: boolean;
	readonly disableExtensions?: boolean;
}

const enum ReadyState {

	/**
	 * This window has not loaded anything yet
	 * and this is the initial state of every
	 * window.
	 */
	NONE,

	/**
	 * This window is navigating, either for the
	 * first time or subsequent times.
	 */
	NAVIGATING,

	/**
	 * This window has finished loading and is ready
	 * to forward IPC requests to the web contents.
	 */
	READY
}

export abstract class BaseWindow extends Disposable implements IBaseWindow {

	//#region Events

	private readonly _onDidClose = this._register(new Emitter<void>());
	readonly onDidClose = this._onDidClose.event;

	private readonly _onDidMaximize = this._register(new Emitter<void>());
	readonly onDidMaximize = this._onDidMaximize.event;

	private readonly _onDidUnmaximize = this._register(new Emitter<void>());
	readonly onDidUnmaximize = this._onDidUnmaximize.event;

	private readonly _onDidTriggerSystemContextMenu = this._register(new Emitter<{ x: number; y: number }>());
	readonly onDidTriggerSystemContextMenu = this._onDidTriggerSystemContextMenu.event;

	private readonly _onDidEnterFullScreen = this._register(new Emitter<void>());
	readonly onDidEnterFullScreen = this._onDidEnterFullScreen.event;

	private readonly _onDidLeaveFullScreen = this._register(new Emitter<void>());
	readonly onDidLeaveFullScreen = this._onDidLeaveFullScreen.event;

	//#endregion

	abstract readonly id: number;

	protected _lastFocusTime = Date.now(); // window is shown on creation so take current time
	get lastFocusTime(): number { return this._lastFocusTime; }

	protected _win: BrowserWindow | null = null;
	get win() { return this._win; }
	protected setWin(win: BrowserWindow): void {
		this._win = win;

		// Window Events
		this._register(Event.fromNodeEventEmitter(win, 'maximize')(() => this._onDidMaximize.fire()));
		this._register(Event.fromNodeEventEmitter(win, 'unmaximize')(() => this._onDidUnmaximize.fire()));
		this._register(Event.fromNodeEventEmitter(win, 'closed')(() => {
			this._onDidClose.fire();

			this.dispose();
		}));
		this._register(Event.fromNodeEventEmitter(win, 'focus')(() => {
			this._lastFocusTime = Date.now();
		}));
		this._register(Event.fromNodeEventEmitter(this._win, 'enter-full-screen')(() => this._onDidEnterFullScreen.fire()));
		this._register(Event.fromNodeEventEmitter(this._win, 'leave-full-screen')(() => this._onDidLeaveFullScreen.fire()));

		// Sheet Offsets
		const useCustomTitleStyle = getTitleBarStyle(this.configurationService) === 'custom';
		if (isMacintosh && useCustomTitleStyle) {
			win.setSheetOffset(isBigSurOrNewer(release()) ? 28 : 22); // offset dialogs by the height of the custom title bar if we have any
		}

		// Update the window controls immediately based on cached values
		if (useCustomTitleStyle && ((isWindows && useWindowControlsOverlay(this.configurationService)) || isMacintosh)) {
			const cachedWindowControlHeight = this.stateService.getItem<number>((BaseWindow.windowControlHeightStateStorageKey));
			if (cachedWindowControlHeight) {
				this.updateWindowControls({height: cachedWindowControlHeight});
			}
		}

		// Windows Custom System Context Menu
		// See https://github.com/electron/electron/issues/24893
		//
		// The purpose of this is to allow for the context menu in the Windows Title Bar
		//
		// Currently, all mouse events in the title bar are captured by the OS
		// thus we need to capture them here with a window hook specific to Windows
		// and then forward them to the correct window.
		if (isWindows && useCustomTitleStyle) {
			const WM_INITMENU = 0x0116; // https://docs.microsoft.com/en-us/windows/win32/menurc/wm-initmenu

			// This sets up a listener for the window hook. This is a Windows-only API provided by electron.
			win.hookWindowMessage(WM_INITMENU, () => {
				const [x, y] = win.getPosition();
				const cursorPos = screen.getCursorScreenPoint();
				const cx = cursorPos.x - x;
				const cy = cursorPos.y - y;

				// In some cases, show the default system context menu
				// 1) The mouse position is not within the title bar
				// 2) The mouse position is within the title bar, but over the app icon
				// We do not know the exact title bar height but we make an estimate based on window height
				const shouldTriggerDefaultSystemContextMenu = () => {
					// Use the custom context menu when over the title bar, but not over the app icon
					// The app icon is estimated to be 30px wide
					// The title bar is estimated to be the max of 35px and 15% of the window height
					if (cx > 30 && cy >= 0 && cy <= Math.max(win.getBounds().height * 0.15, 35)) {
						return false;
					}

					return true;
				};

				if (!shouldTriggerDefaultSystemContextMenu()) {

					// This is necessary to make sure the native system context menu does not show up.
					win.setEnabled(false);
					win.setEnabled(true);

					this._onDidTriggerSystemContextMenu.fire({x: cx, y: cy});
				}

				return 0;
			});
		}

		// Open devtools if instructed from command line args
		if (this.environmentMainService.args['open-devtools'] === true) {
			win.webContents.openDevTools();
		}
	}

	constructor(
		protected readonly configurationService: IConfigurationService,
		protected readonly stateService: IStateService,
		protected readonly environmentMainService: IEnvironmentMainService
	) {
		super();
	}

	private representedFilename: string | undefined;

	setRepresentedFilename(filename: string): void {
		if (isMacintosh) {
			this.win?.setRepresentedFilename(filename);
		} else {
			this.representedFilename = filename;
		}
	}

	getRepresentedFilename(): string | undefined {
		if (isMacintosh) {
			return this.win?.getRepresentedFilename();
		}

		return this.representedFilename;
	}

	private documentEdited: boolean | undefined;

	setDocumentEdited(edited: boolean): void {
		if (isMacintosh) {
			this.win?.setDocumentEdited(edited);
		}

		this.documentEdited = edited;
	}

	isDocumentEdited(): boolean {
		if (isMacintosh) {
			return Boolean(this.win?.isDocumentEdited());
		}

		return !!this.documentEdited;
	}

	focus(options?: { force: boolean }): void {
		if (isMacintosh && options?.force) {
			app.focus({steal: true});
		}

		const win = this.win;
		if (!win) {
			return;
		}

		if (win.isMinimized()) {
			win.restore();
		}

		win.focus();
	}

	handleTitleDoubleClick(): void {
		const win = this.win;
		if (!win) {
			return;
		}

		// Respect system settings on mac with regards to title click on windows title
		if (isMacintosh) {
			const action = systemPreferences.getUserDefault('AppleActionOnDoubleClick', 'string');
			switch (action) {
				case 'Minimize':
					win.minimize();
					break;
				case 'None':
					break;
				case 'Maximize':
				default:
					if (win.isMaximized()) {
						win.unmaximize();
					} else {
						win.maximize();
					}
			}
		}

		// Linux/Windows: just toggle maximize/minimized state
		else {
			if (win.isMaximized()) {
				win.unmaximize();
			} else {
				win.maximize();
			}
		}
	}

	//#region WCO

	private static readonly windowControlHeightStateStorageKey = 'windowControlHeight';

	private readonly hasWindowControlOverlay = useWindowControlsOverlay(this.configurationService);

	updateWindowControls(options: { height?: number; backgroundColor?: string; foregroundColor?: string }): void {
		const win = this.win;
		if (!win) {
			return;
		}

		// Cache the height for speeds lookups on startup
		if (options.height) {
			this.stateService.setItem((DevWindow.windowControlHeightStateStorageKey), options.height);
		}

		// Windows: window control overlay (WCO)
		if (isWindows && this.hasWindowControlOverlay) {
			win.setTitleBarOverlay({
				color: options.backgroundColor?.trim() === '' ? undefined : options.backgroundColor,
				symbolColor: options.foregroundColor?.trim() === '' ? undefined : options.foregroundColor,
				height: options.height ? options.height - 1 : undefined // account for window border
			});
		}

		// macOS: traffic lights
		else if (isMacintosh && options.height !== undefined) {
			const verticalOffset = (options.height - 15) / 2; // 15px is the height of the traffic lights
			if (!verticalOffset) {
				win.setWindowButtonPosition(null);
			} else {
				win.setWindowButtonPosition({x: verticalOffset, y: verticalOffset});
			}
		}
	}

	//#endregion

	//#region Fullscreen

	// TODO@electron workaround for https://github.com/electron/electron/issues/35360
	// where on macOS the window will report a wrong state for `isFullScreen()` while
	// transitioning into and out of native full screen.
	protected transientIsNativeFullScreen: boolean | undefined = undefined;
	protected joinNativeFullScreenTransition: DeferredPromise<void> | undefined = undefined;

	toggleFullScreen(): void {
		this.setFullScreen(!this.isFullScreen);
	}

	protected setFullScreen(fullscreen: boolean): void {

		// Set fullscreen state
		if (useNativeFullScreen(this.configurationService)) {
			this.setNativeFullScreen(fullscreen);
		} else {
			this.setSimpleFullScreen(fullscreen);
		}
	}

	get isFullScreen(): boolean {
		if (isMacintosh && typeof this.transientIsNativeFullScreen === 'boolean') {
			return this.transientIsNativeFullScreen;
		}

		const win = this.win;
		const isFullScreen = win?.isFullScreen();
		const isSimpleFullScreen = win?.isSimpleFullScreen();

		return Boolean(isFullScreen || isSimpleFullScreen);
	}

	private setNativeFullScreen(fullscreen: boolean): void {
		const win = this.win;
		if (win?.isSimpleFullScreen()) {
			win?.setSimpleFullScreen(false);
		}

		this.doSetNativeFullScreen(fullscreen);
	}

	private doSetNativeFullScreen(fullscreen: boolean): void {
		if (isMacintosh) {
			this.transientIsNativeFullScreen = fullscreen;
			this.joinNativeFullScreenTransition = new DeferredPromise<void>();
			Promise.race([
				this.joinNativeFullScreenTransition.p,
				// still timeout after some time in case the transition is unusually slow
				// this can easily happen for an OS update where macOS tries to reopen
				// previous applications and that can take multiple seconds, probably due
				// to security checks. its worth noting that if this takes more than
				// 10 seconds, users would see a window that is not-fullscreen but without
				// custom titlebar...
				timeout(10000)
			]).finally(() => {
				this.transientIsNativeFullScreen = undefined;
			});
		}

		const win = this.win;
		win?.setFullScreen(fullscreen);
	}

	private setSimpleFullScreen(fullscreen: boolean): void {
		const win = this.win;
		if (win?.isFullScreen()) {
			this.doSetNativeFullScreen(false);
		}

		win?.setSimpleFullScreen(fullscreen);
		win?.webContents.focus(); // workaround issue where focus is not going into window
	}

	//#endregion

	override dispose(): void {
		super.dispose();

		this._win = null!; // Important to dereference the window object to allow for GC
	}
}

export class DevWindow extends BaseWindow {
  private _id: number;
	get id(): number { return this._id; }

  protected override _win: BrowserWindow;
  private readonly configObjectUrl = this._register(this.protocolMainService.createIPCObjectUrl<INativeWindowConfiguration>());
  
  constructor(
    @IConfigurationService configurationService: IConfigurationService,
    @IStateService stateService: IStateService,
    @IEnvironmentMainService environmentMainService: IEnvironmentMainService,
		@IProtocolMainService private readonly protocolMainService: IProtocolMainService,
  ) {
    super(configurationService, stateService, environmentMainService);

		

    //#region create browser window
    {
      this._win = new BrowserWindow({
        width: 1000	,
        height: 600,
        backgroundColor: 'black',
        webPreferences: {
          preload: FileAccess.asFileUri('td/base/parts/sandbox/electron-sandbox/preload.js').fsPath,
					/* 
					Error in Electron Browser
					VM5:66 Uncaught (in promise) Error: Preload: did not find expected vscode-window-config in renderer process arguments list. */
					additionalArguments: [`--vscode-window-config=${this.configObjectUrl.resource.toString()}`],
        }
      })

      this._id = this._win.id;
    }
    //#endregion
    
  }

	/* Invoked in windowsMainService.ts #doOpenInBrowserWindow */
	load(configuration: INativeWindowConfiguration, options: ILoadOptions = Object.create(null)): void {
		// this._win.loadURL(FileAccess.asBrowserUri(`td/dev/electron-sandbox/workbench/workbench${this.environmentMainService.isBuilt ? '' : '-dev'}.html`).toString(true));

		// Update configuration values based on our window context
		// and set it into the config object URL for usage
		this.updateConfiguration(configuration)

		this._win.loadURL(FileAccess.asBrowserUri(`td/dev/electron-sandbox/workbench/workbench.html`).toString(true));
	}

	private updateConfiguration(configuration: INativeWindowConfiguration, options?: ILoadOptions): void {
		// Update in config object URL for usage in renderer
		this.configObjectUrl.update(configuration);
	}
}
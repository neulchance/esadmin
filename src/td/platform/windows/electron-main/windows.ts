/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {BrowserWindowConstructorOptions, WebContents} from 'electron';
import {Event} from 'td/base/common/event';
import {IProcessEnvironment, isLinux, isMacintosh, isWindows} from 'td/base/common/platform';
import {URI} from 'td/base/common/uri';
import {NativeParsedArgs} from 'td/platform/environment/common/argv';
import {ServicesAccessor, createDecorator} from 'td/platform/instantiation/common/instantiation';
import {IDevWindow, IWindowState} from 'td/platform/window/electron-main/window';
import {IOpenEmptyWindowOptions, IWindowOpenable, IWindowSettings, WindowMinimumSize, hasNativeTitlebar, useNativeFullScreen, useWindowControlsOverlay, zoomLevelToZoomFactor} from 'td/platform/window/common/window';
import {IThemeMainService} from 'td/platform/theme/electron-main/themeMainService';
import {IProductService} from 'td/platform/product/common/productService';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {IEnvironmentMainService} from 'td/platform/environment/electron-main/environmentMainService';
import {join} from 'td/base/common/path';
import {IAuxiliaryWindow} from 'td/platform/auxiliaryWindow/electron-main/auxiliaryWindow';
import {IAuxiliaryWindowsMainService} from 'td/platform/auxiliaryWindow/electron-main/auxiliaryWindows';
import {Color} from 'td/base/common/color';

export const IWindowsMainService = createDecorator<IWindowsMainService>('windowsMainService');

export interface IWindowsMainService {

	readonly _serviceBrand: undefined;

	readonly onDidChangeWindowsCount: Event<IWindowsCountChangedEvent>;

	readonly onDidOpenWindow: Event<IDevWindow>;
	readonly onDidSignalReadyWindow: Event<IDevWindow>;
	readonly onDidMaximizeWindow: Event<IDevWindow>;
	readonly onDidUnmaximizeWindow: Event<IDevWindow>;
	readonly onDidChangeFullScreen: Event<{ window: IDevWindow; fullscreen: boolean }>;
	readonly onDidTriggerSystemContextMenu: Event<{ readonly window: IDevWindow; readonly x: number; readonly y: number }>;
	readonly onDidDestroyWindow: Event<IDevWindow>;

	open(openConfig: IOpenConfiguration): Promise<IDevWindow[]>;
	openEmptyWindow(openConfig: IOpenEmptyConfiguration, options?: IOpenEmptyWindowOptions): Promise<IDevWindow[]>;
	openExtensionDevelopmentHostWindow(extensionDevelopmentPath: string[], openConfig: IOpenConfiguration): Promise<IDevWindow[]>;

	openExistingWindow(window: IDevWindow, openConfig: IOpenConfiguration): void;

	sendToFocused(channel: string, ...args: any[]): void;
	sendToOpeningWindow(channel: string, ...args: any[]): void;
	sendToAll(channel: string, payload?: any, windowIdsToIgnore?: number[]): void;

	getWindows(): IDevWindow[];
	getWindowCount(): number;

	getFocusedWindow(): IDevWindow | undefined;
	getLastActiveWindow(): IDevWindow | undefined;

	getWindowById(windowId: number): IDevWindow | undefined;
	getWindowByWebContents(webContents: WebContents): IDevWindow | undefined;
}

export interface IWindowsCountChangedEvent {
	readonly oldCount: number;
	readonly newCount: number;
}

export const enum OpenContext {

	// opening when running from the command line
	CLI,

	// macOS only: opening from the dock (also when opening files to a running instance from desktop)
	DOCK,

	// opening from the main application window
	MENU,

	// opening from a file or folder dialog
	DIALOG,

	// opening from the OS's UI
	DESKTOP,

	// opening through the API
	API
}

export interface IBaseOpenConfiguration {
	readonly context: OpenContext;
	readonly contextWindowId?: number;
}

export interface IOpenConfiguration extends IBaseOpenConfiguration {
	readonly cli: NativeParsedArgs;
	readonly userEnv?: IProcessEnvironment;
	readonly urisToOpen?: IWindowOpenable[];
	readonly waitMarkerFileURI?: URI;
	readonly preferNewWindow?: boolean;
	readonly forceNewWindow?: boolean;
	readonly forceNewTabbedWindow?: boolean;
	readonly forceReuseWindow?: boolean;
	readonly forceEmpty?: boolean;
	readonly diffMode?: boolean;
	readonly mergeMode?: boolean;
	addMode?: boolean;
	readonly gotoLineMode?: boolean;
	readonly initialStartup?: boolean;
	readonly noRecentEntry?: boolean;
	/**
	 * The remote authority to use when windows are opened with either
	 * - no workspace (empty window)
	 * - a workspace that is neither `file://` nor `vscode-remote://`
	 */
	readonly remoteAuthority?: string;
	readonly forceProfile?: string;
	readonly forceTempProfile?: boolean;
}

export interface IOpenEmptyConfiguration extends IBaseOpenConfiguration { }

export function defaultBrowserWindowOptions(accessor: ServicesAccessor, windowState?: IWindowState, overrides?: BrowserWindowConstructorOptions): BrowserWindowConstructorOptions & { experimentalDarkMode: boolean } {
	const themeMainService = accessor.get(IThemeMainService);
	const productService = accessor.get(IProductService);
	const configurationService = accessor.get(IConfigurationService);
	const environmentMainService = accessor.get(IEnvironmentMainService);

	const windowSettings = configurationService.getValue<IWindowSettings | undefined>('window');

	const options: BrowserWindowConstructorOptions & { experimentalDarkMode: boolean } = {
		backgroundColor: themeMainService.getBackgroundColor(),
		minWidth: WindowMinimumSize.WIDTH,
		minHeight: WindowMinimumSize.HEIGHT,
		title: productService.nameLong,
		...overrides,
		webPreferences: {
			enableWebSQL: false,
			spellcheck: false,
			zoomFactor: zoomLevelToZoomFactor(windowState?.zoomLevel ?? windowSettings?.zoomLevel),
			autoplayPolicy: 'user-gesture-required',
			// Enable experimental css highlight api https://chromestatus.com/feature/5436441440026624
			// Refs https://github.com/microsoft/vscode/issues/140098
			enableBlinkFeatures: 'HighlightAPI',
			...overrides?.webPreferences,
			sandbox: true
		},
		experimentalDarkMode: true
	};

	if (windowState) {
		options.x = windowState.x;
		options.y = windowState.y;
		options.width = windowState.width;
		options.height = windowState.height;
	}

	if (isLinux) {
		options.icon = join(environmentMainService.appRoot, 'resources/linux/code.png'); // always on Linux
	} else if (isWindows && !environmentMainService.isBuilt) {
		options.icon = join(environmentMainService.appRoot, 'resources/win32/code_150x150.png'); // only when running out of sources on Windows
	}

	if (isMacintosh) {
		options.acceptFirstMouse = true; // enabled by default

		if (windowSettings?.clickThroughInactive === false) {
			options.acceptFirstMouse = false;
		}
	}

	if (isMacintosh && !useNativeFullScreen(configurationService)) {
		options.fullscreenable = false; // enables simple fullscreen mode
	}

	const useNativeTabs = isMacintosh && windowSettings?.nativeTabs === true;
	if (useNativeTabs) {
		options.tabbingIdentifier = productService.nameShort; // this opts in to sierra tabs
	}

	const hideNativeTitleBar = !hasNativeTitlebar(configurationService);
	if (hideNativeTitleBar) {
		options.titleBarStyle = 'hidden';
		if (!isMacintosh) {
			options.frame = false;
		}

		if (useWindowControlsOverlay(configurationService)) {

			// This logic will not perfectly guess the right colors
			// to use on initialization, but prefer to keep things
			// simple as it is temporary and not noticeable

			const titleBarColor = themeMainService.getWindowSplash()?.colorInfo.titleBarBackground ?? themeMainService.getBackgroundColor();
			const symbolColor = Color.fromHex(titleBarColor).isDarker() ? '#FFFFFF' : '#000000';

			options.titleBarOverlay = {
				height: 29, // the smallest size of the title bar on windows accounting for the border on windows 11
				color: titleBarColor,
				symbolColor
			};
		}
	}

	return options;
}

export function getFocusedOrLastActiveWindow(accessor: ServicesAccessor): IDevWindow | IAuxiliaryWindow | undefined {
	const windowsMainService = accessor.get(IWindowsMainService);
	const auxiliaryWindowsMainService = accessor.get(IAuxiliaryWindowsMainService);

	// By: Electron focused window
	const focusedWindow = windowsMainService.getFocusedWindow() ?? auxiliaryWindowsMainService.getFocusedWindow();
	if (focusedWindow) {
		return focusedWindow;
	}

	// By: Last active window
	const mainLastActiveWindow = windowsMainService.getLastActiveWindow();
	const auxiliaryLastActiveWindow = auxiliaryWindowsMainService.getLastActiveWindow();

	if (mainLastActiveWindow && auxiliaryLastActiveWindow) {
		return mainLastActiveWindow.lastFocusTime < auxiliaryLastActiveWindow.lastFocusTime ? auxiliaryLastActiveWindow : mainLastActiveWindow;
	}

	return mainLastActiveWindow ?? auxiliaryLastActiveWindow;
}

export function getLastFocused(windows: IDevWindow[]): IDevWindow | undefined;
export function getLastFocused(windows: IAuxiliaryWindow[]): IAuxiliaryWindow | undefined;
export function getLastFocused(windows: IDevWindow[] | IAuxiliaryWindow[]): IDevWindow | IAuxiliaryWindow | undefined {
	let lastFocusedWindow: IDevWindow | IAuxiliaryWindow | undefined = undefined;
	let maxLastFocusTime = Number.MIN_VALUE;

	for (const window of windows) {
		if (window.lastFocusTime > maxLastFocusTime) {
			maxLastFocusTime = window.lastFocusTime;
			lastFocusedWindow = window;
		}
	}

	return lastFocusedWindow;
}

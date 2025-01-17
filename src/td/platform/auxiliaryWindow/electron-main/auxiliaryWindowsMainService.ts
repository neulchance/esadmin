/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {BrowserWindow, BrowserWindowConstructorOptions, HandlerDetails, WebContents, app} from 'electron';
import {Emitter, Event} from 'td/base/common/event';
import {Disposable, DisposableStore, toDisposable} from 'td/base/common/lifecycle';
import {FileAccess} from 'td/base/common/network';
import {validatedIpcMain} from 'td/base/parts/ipc/electron-main/ipcMain';
import {AuxiliaryWindow, IAuxiliaryWindow} from 'td/platform/auxiliaryWindow/electron-main/auxiliaryWindow';
import {IAuxiliaryWindowsMainService} from 'td/platform/auxiliaryWindow/electron-main/auxiliaryWindows';
import {IInstantiationService} from 'td/platform/instantiation/common/instantiation';
import {ILogService} from 'td/platform/log/common/log';
import {IWindowState} from 'td/platform/window/electron-main/window';
import {WindowStateValidator, defaultBrowserWindowOptions, getLastFocused} from 'td/platform/windows/electron-main/windows';

export class AuxiliaryWindowsMainService extends Disposable implements IAuxiliaryWindowsMainService {

	declare readonly _serviceBrand: undefined;

	private readonly _onDidMaximizeWindow = this._register(new Emitter<IAuxiliaryWindow>());
	readonly onDidMaximizeWindow = this._onDidMaximizeWindow.event;

	private readonly _onDidUnmaximizeWindow = this._register(new Emitter<IAuxiliaryWindow>());
	readonly onDidUnmaximizeWindow = this._onDidUnmaximizeWindow.event;

	private readonly _onDidChangeFullScreen = this._register(new Emitter<{ window: IAuxiliaryWindow; fullscreen: boolean }>());
	readonly onDidChangeFullScreen = this._onDidChangeFullScreen.event;

	private readonly _onDidTriggerSystemContextMenu = this._register(new Emitter<{ window: IAuxiliaryWindow; x: number; y: number }>());
	readonly onDidTriggerSystemContextMenu = this._onDidTriggerSystemContextMenu.event;

	private readonly windows = new Map<number, AuxiliaryWindow>();

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@ILogService private readonly logService: ILogService
	) {
		super();

		this.registerListeners();
	}

	private registerListeners(): void {

		// We have to ensure that an auxiliary window gets to know its
		// containing `BrowserWindow` so that it can apply listeners to it
		// Unfortunately we cannot rely on static `BrowserWindow` methods
		// because we might call the methods too early before the window
		// is created.

		app.on('browser-window-created', (_event, browserWindow) => {
			const auxiliaryWindow = this.getWindowById(browserWindow.id);
			if (auxiliaryWindow) {
				this.logService.trace('[aux window] app.on("browser-window-created"): Trying to claim auxiliary window');

				auxiliaryWindow.tryClaimWindow();
			}
		});

		validatedIpcMain.handle('vscode:registerAuxiliaryWindow', async (event, mainWindowId: number) => {
			const auxiliaryWindow = this.getWindowById(event.sender.id);
			if (auxiliaryWindow) {
				this.logService.trace('[aux window] vscode:registerAuxiliaryWindow: Registering auxiliary window to main window');

				auxiliaryWindow.parentId = mainWindowId;
			}

			return event.sender.id;
		});
	}

	createWindow(details: HandlerDetails): BrowserWindowConstructorOptions {
		return this.instantiationService.invokeFunction(defaultBrowserWindowOptions, this.validateWindowState(details), {
			webPreferences: {
				preload: FileAccess.asFileUri('td/base/parts/sandbox/electron-sandbox/preload-aux.js').fsPath
			}
		});
	}

	private validateWindowState(details: HandlerDetails): IWindowState | undefined {
		const windowState: IWindowState = {};

		const features = details.features.split(','); // for example: popup=yes,left=270,top=14.5,width=800,height=600
		for (const feature of features) {
			const [key, value] = feature.split('=');
			switch (key) {
				case 'width':
					windowState.width = parseInt(value, 10);
					break;
				case 'height':
					windowState.height = parseInt(value, 10);
					break;
				case 'left':
					windowState.x = parseInt(value, 10);
					break;
				case 'top':
					windowState.y = parseInt(value, 10);
					break;
			}
		}

		return WindowStateValidator.validateWindowState(this.logService, windowState);
	}

	registerWindow(webContents: WebContents): void {
		const disposables = new DisposableStore();

		const auxiliaryWindow = this.instantiationService.createInstance(AuxiliaryWindow, webContents);

		this.windows.set(auxiliaryWindow.id, auxiliaryWindow);
		disposables.add(toDisposable(() => this.windows.delete(auxiliaryWindow.id)));

		disposables.add(auxiliaryWindow.onDidMaximize(() => this._onDidMaximizeWindow.fire(auxiliaryWindow)));
		disposables.add(auxiliaryWindow.onDidUnmaximize(() => this._onDidUnmaximizeWindow.fire(auxiliaryWindow)));
		disposables.add(auxiliaryWindow.onDidEnterFullScreen(() => this._onDidChangeFullScreen.fire({window: auxiliaryWindow, fullscreen: true})));
		disposables.add(auxiliaryWindow.onDidLeaveFullScreen(() => this._onDidChangeFullScreen.fire({window: auxiliaryWindow, fullscreen: false})));
		disposables.add(auxiliaryWindow.onDidTriggerSystemContextMenu(({x, y}) => this._onDidTriggerSystemContextMenu.fire({window: auxiliaryWindow, x, y})));

		Event.once(auxiliaryWindow.onDidClose)(() => disposables.dispose());
	}

	getWindowById(windowId: number): AuxiliaryWindow | undefined {
		return this.windows.get(windowId);
	}

	getFocusedWindow(): IAuxiliaryWindow | undefined {
		const window = BrowserWindow.getFocusedWindow();
		if (window) {
			return this.getWindowById(window.id);
		}

		return undefined;
	}

	getLastActiveWindow(): IAuxiliaryWindow | undefined {
		return getLastFocused(Array.from(this.windows.values()));
	}

	getWindows(): readonly IAuxiliaryWindow[] {
		return Array.from(this.windows.values());
	}
}

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {BrowserWindow, WebContents} from 'electron';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {IEnvironmentMainService} from 'td/platform/environment/electron-main/environmentMainService';
import {ILogService} from 'td/platform/log/common/log';
import {IStateService} from 'td/platform/state/node/state';
import {IBaseWindow} from 'td/platform/window/electron-main/window';
import {BaseWindow} from 'td/platform/windows/electron-main/windowImpl';

export interface IAuxiliaryWindow extends IBaseWindow {
	readonly parentId: number;
}

export class AuxiliaryWindow extends BaseWindow implements IAuxiliaryWindow {

	readonly id = this.contents.id;
	parentId = -1;

	override get win() {
		if (!super.win) {
			this.tryClaimWindow();
		}

		return super.win;
	}

	constructor(
		private readonly contents: WebContents,
		@IEnvironmentMainService environmentMainService: IEnvironmentMainService,
		@ILogService private readonly logService: ILogService,
		@IConfigurationService configurationService: IConfigurationService,
		@IStateService stateService: IStateService
	) {
		super(configurationService, stateService, environmentMainService);

		contents.removeAllListeners('devtools-reload-page'); // remove built in listener as aux windows have no reload

		// Try to claim window
		this.tryClaimWindow();
	}

	tryClaimWindow(): void {
		if (this._win) {
			return; // already claimed
		}

		if (this._store.isDisposed || this.contents.isDestroyed()) {
			return; // already disposed
		}

		const window = BrowserWindow.fromWebContents(this.contents);
		if (window) {
			this.logService.trace('[aux window] Claimed browser window instance');

			// Remember
			this.setWin(window);

			// Disable Menu
			window.setMenu(null);
		}
	}
}

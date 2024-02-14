/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {isMacintosh} from 'td/base/common/platform';
import {ProxyChannel} from 'td/base/parts/ipc/common/ipc';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {IMainProcessService} from 'td/platform/ipc/common/mainProcessService';
import {INativeHostService} from 'td/platform/native/common/native';
import {IWebviewManagerService} from 'td/platform/webview/common/webviewManagerService';
import {hasNativeTitlebar} from 'td/platform/window/common/window';

export class WindowIgnoreMenuShortcutsManager {

	private readonly _isUsingNativeTitleBars: boolean;

	private readonly _webviewMainService: IWebviewManagerService;

	constructor(
		configurationService: IConfigurationService,
		mainProcessService: IMainProcessService,
		private readonly _nativeHostService: INativeHostService
	) {
		this._isUsingNativeTitleBars = hasNativeTitlebar(configurationService);

		this._webviewMainService = ProxyChannel.toService<IWebviewManagerService>(mainProcessService.getChannel('webview'));
	}

	public didFocus(): void {
		this.setIgnoreMenuShortcuts(true);
	}

	public didBlur(): void {
		this.setIgnoreMenuShortcuts(false);
	}

	private get _shouldToggleMenuShortcutsEnablement() {
		return isMacintosh || this._isUsingNativeTitleBars;
	}

	protected setIgnoreMenuShortcuts(value: boolean) {
		if (this._shouldToggleMenuShortcutsEnablement) {
			this._webviewMainService.setIgnoreMenuShortcuts({windowId: this._nativeHostService.windowId}, value);
		}
	}
}

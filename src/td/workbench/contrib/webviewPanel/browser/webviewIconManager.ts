/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from 'td/base/browser/dom';
import {DisposableStore, IDisposable} from 'td/base/common/lifecycle';
import {URI} from 'td/base/common/uri';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {ILifecycleService, LifecyclePhase} from 'td/workbench/services/lifecycle/common/lifecycle';

export interface WebviewIcons {
	readonly light: URI;
	readonly dark: URI;
}

export class WebviewIconManager implements IDisposable {

	private readonly _icons = new Map<string, WebviewIcons>();

	private _styleElement: HTMLStyleElement | undefined;
	private _styleElementDisposable: DisposableStore | undefined;

	constructor(
		@ILifecycleService private readonly _lifecycleService: ILifecycleService,
		@IConfigurationService private readonly _configService: IConfigurationService,
	) {
		this._configService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('workbench.iconTheme')) {
				this.updateStyleSheet();
			}
		});
	}

	dispose() {
		this._styleElementDisposable?.dispose();
		this._styleElementDisposable = undefined;
		this._styleElement = undefined;
	}

	private get styleElement(): HTMLStyleElement {
		if (!this._styleElement) {
			this._styleElementDisposable = new DisposableStore();
			this._styleElement = dom.createStyleSheet(undefined, undefined, this._styleElementDisposable);
			this._styleElement.className = 'webview-icons';
		}
		return this._styleElement;
	}

	public setIcons(
		webviewId: string,
		iconPath: WebviewIcons | undefined,
	) {
		if (iconPath) {
			this._icons.set(webviewId, iconPath);
		} else {
			this._icons.delete(webviewId);
		}

		this.updateStyleSheet();
	}

	private async updateStyleSheet() {
		await this._lifecycleService.when(LifecyclePhase.Starting);

		const cssRules: string[] = [];
		if (this._configService.getValue('workbench.iconTheme') !== null) {
			for (const [key, value] of this._icons) {
				const webviewSelector = `.show-file-icons .webview-${key}-name-file-icon::before`;
				try {
					cssRules.push(
						`.monaco-workbench.vs ${webviewSelector}, .monaco-workbench.hc-light ${webviewSelector} { content: ""; background-image: ${dom.asCSSUrl(value.light)}; }`,
						`.monaco-workbench.vs-dark ${webviewSelector}, .monaco-workbench.hc-black ${webviewSelector} { content: ""; background-image: ${dom.asCSSUrl(value.dark)}; }`
					);
				} catch {
					// noop
				}
			}
		}
		this.styleElement.textContent = cssRules.join('\n');
	}
}

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type {Terminal as RawXtermTerminal} from '@xterm/xterm';
import {Event} from 'td/base/common/event';
import {Disposable, MutableDisposable} from 'td/base/common/lifecycle';
import 'td/css!./media/stickyScroll';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {IContextKeyService} from 'td/platform/contextkey/common/contextkey';
import {IInstantiationService} from 'td/platform/instantiation/common/instantiation';
import {IKeybindingService} from 'td/platform/keybinding/common/keybinding';
import {TerminalCapability} from 'td/platform/terminal/common/capabilities/capabilities';
import {TerminalSettingId} from 'td/platform/terminal/common/terminal';
import {ITerminalContribution, ITerminalInstance, IXtermTerminal} from 'td/workbench/contrib/terminal/browser/terminal';
import {TerminalInstance, TerminalInstanceColorProvider} from 'td/workbench/contrib/terminal/browser/terminalInstance';
import {TerminalWidgetManager} from 'td/workbench/contrib/terminal/browser/widgets/widgetManager';
import {ITerminalProcessInfo, ITerminalProcessManager} from 'td/workbench/contrib/terminal/common/terminal';
import {TerminalStickyScrollOverlay} from 'td/workbench/contrib/terminalContrib/stickyScroll/browser/terminalStickyScrollOverlay';

export class TerminalStickyScrollContribution extends Disposable implements ITerminalContribution {
	static readonly ID = 'terminal.stickyScroll';

	static get(instance: ITerminalInstance): TerminalStickyScrollContribution | null {
		return instance.getContribution<TerminalStickyScrollContribution>(TerminalStickyScrollContribution.ID);
	}

	private _xterm?: IXtermTerminal & { raw: RawXtermTerminal };

	private _overlay = this._register(new MutableDisposable<TerminalStickyScrollOverlay>());

	private _enableListeners = this._register(new MutableDisposable());
	private _disableListeners = this._register(new MutableDisposable());

	constructor(
		private readonly _instance: ITerminalInstance,
		processManager: ITerminalProcessManager | ITerminalProcessInfo,
		widgetManager: TerminalWidgetManager,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
		@IContextKeyService private readonly _contextKeyService: IContextKeyService,
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@IKeybindingService private readonly _keybindingService: IKeybindingService,
	) {
		super();

		this._register(Event.runAndSubscribe(this._configurationService.onDidChangeConfiguration, e => {
			if (!e || e.affectsConfiguration(TerminalSettingId.StickyScrollEnabled)) {
				this._refreshState();
			}
		}));
	}

	xtermReady(xterm: IXtermTerminal & { raw: RawXtermTerminal }): void {
		this._xterm = xterm;
		this._refreshState();
	}

	xtermOpen(xterm: IXtermTerminal & { raw: RawXtermTerminal }): void {
		this._refreshState();
	}

	private _refreshState(): void {
		if (this._overlay.value) {
			this._tryDisable();
		} else {
			this._tryEnable();
		}

		if (this._overlay.value) {
			this._enableListeners.clear();
			if (!this._disableListeners.value) {
				this._disableListeners.value = this._instance.capabilities.onDidRemoveCapability(e => {
					if (e.id === TerminalCapability.CommandDetection) {
						this._refreshState();
					}
				});
			}
		} else {
			this._disableListeners.clear();
			if (!this._enableListeners.value) {
				this._enableListeners.value = this._instance.capabilities.onDidAddCapability(e => {
					if (e.id === TerminalCapability.CommandDetection) {
						this._refreshState();
					}
				});
			}
		}
	}

	private _tryEnable(): void {
		if (this._shouldBeEnabled()) {
			const xtermCtorEventually = TerminalInstance.getXtermConstructor(this._keybindingService, this._contextKeyService);
			this._overlay.value = this._instantiationService.createInstance(
				TerminalStickyScrollOverlay,
				this._instance,
				this._xterm!,
				this._instantiationService.createInstance(TerminalInstanceColorProvider, this._instance),
				this._instance.capabilities.get(TerminalCapability.CommandDetection)!,
				xtermCtorEventually
			);
		}
	}

	private _tryDisable(): void {
		if (!this._shouldBeEnabled()) {
			this._overlay.clear();
		}
	}

	private _shouldBeEnabled(): boolean {
		const capability = this._instance.capabilities.get(TerminalCapability.CommandDetection);
		return !!(this._configurationService.getValue(TerminalSettingId.StickyScrollEnabled) && capability && this._xterm?.raw?.element);
	}
}

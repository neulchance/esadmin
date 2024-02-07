/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {DisposableStore, toDisposable} from 'td/base/common/lifecycle';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {IInstantiationService} from 'td/platform/instantiation/common/instantiation';
import {TerminalSettingId} from 'td/platform/terminal/common/terminal';
import {ITerminalContribution, ITerminalInstance, IXtermTerminal} from 'td/workbench/contrib/terminal/browser/terminal';
import {registerTerminalContribution} from 'td/workbench/contrib/terminal/browser/terminalExtensions';
import {TerminalWidgetManager} from 'td/workbench/contrib/terminal/browser/widgets/widgetManager';
import {TypeAheadAddon} from 'td/workbench/contrib/terminalContrib/typeAhead/browser/terminalTypeAheadAddon';
import {ITerminalConfiguration, ITerminalProcessManager, TERMINAL_CONFIG_SECTION} from 'td/workbench/contrib/terminal/common/terminal';
import type {Terminal as RawXtermTerminal} from '@xterm/xterm';

class TerminalTypeAheadContribution extends DisposableStore implements ITerminalContribution {
	static readonly ID = 'terminal.typeAhead';

	static get(instance: ITerminalInstance): TerminalTypeAheadContribution | null {
		return instance.getContribution<TerminalTypeAheadContribution>(TerminalTypeAheadContribution.ID);
	}

	private _addon: TypeAheadAddon | undefined;

	constructor(
		instance: ITerminalInstance,
		private readonly _processManager: ITerminalProcessManager,
		widgetManager: TerminalWidgetManager,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
		@IInstantiationService private readonly _instantiationService: IInstantiationService
	) {
		super();
		this.add(toDisposable(() => this._addon?.dispose()));
	}

	xtermReady(xterm: IXtermTerminal & { raw: RawXtermTerminal }): void {
		this._loadTypeAheadAddon(xterm.raw);
		this.add(this._configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration(TerminalSettingId.LocalEchoEnabled)) {
				this._loadTypeAheadAddon(xterm.raw);
			}
		}));

		// Reset the addon when the terminal launches or relaunches
		this.add(this._processManager.onProcessReady(() => {
			this._addon?.reset();
		}));
	}

	private _loadTypeAheadAddon(xterm: RawXtermTerminal): void {
		const enabled = this._configurationService.getValue<ITerminalConfiguration>(TERMINAL_CONFIG_SECTION).localEchoEnabled;
		const isRemote = !!this._processManager.remoteAuthority;
		if (enabled === 'off' || enabled === 'auto' && !isRemote) {
			this._addon?.dispose();
			this._addon = undefined;
			return;
		}
		if (this._addon) {
			return;
		}
		if (enabled === 'on' || (enabled === 'auto' && isRemote)) {
			this._addon = this._instantiationService.createInstance(TypeAheadAddon, this._processManager);
			xterm.loadAddon(this._addon);
		}
	}
}

registerTerminalContribution(TerminalTypeAheadContribution.ID, TerminalTypeAheadContribution);

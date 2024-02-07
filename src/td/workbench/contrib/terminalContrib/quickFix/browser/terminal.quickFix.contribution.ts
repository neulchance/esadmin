/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'td/css!./media/terminalQuickFix';
import {KeyCode, KeyMod} from 'td/base/common/keyCodes';
import {DisposableStore} from 'td/base/common/lifecycle';
import {localize2} from 'td/nls';
import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {IInstantiationService} from 'td/platform/instantiation/common/instantiation';
import {KeybindingWeight} from 'td/platform/keybinding/common/keybindingsRegistry';
import {ITerminalContribution, ITerminalInstance, IXtermTerminal} from 'td/workbench/contrib/terminal/browser/terminal';
import {registerActiveInstanceAction} from 'td/workbench/contrib/terminal/browser/terminalActions';
import {registerTerminalContribution} from 'td/workbench/contrib/terminal/browser/terminalExtensions';
import {TerminalWidgetManager} from 'td/workbench/contrib/terminal/browser/widgets/widgetManager';
import {ITerminalProcessManager, TerminalCommandId} from 'td/workbench/contrib/terminal/common/terminal';
import {TerminalContextKeys} from 'td/workbench/contrib/terminal/common/terminalContextKey';
import {ITerminalQuickFixService} from 'td/workbench/contrib/terminalContrib/quickFix/browser/quickFix';
import {TerminalQuickFixAddon} from 'td/workbench/contrib/terminalContrib/quickFix/browser/quickFixAddon';
import {freePort, gitCreatePr, gitPull, gitPushSetUpstream, gitSimilar, gitTwoDashes, pwshGeneralError, pwshUnixCommandNotFoundError} from 'td/workbench/contrib/terminalContrib/quickFix/browser/terminalQuickFixBuiltinActions';
import {TerminalQuickFixService} from 'td/workbench/contrib/terminalContrib/quickFix/browser/terminalQuickFixService';
import type {Terminal as RawXtermTerminal} from '@xterm/xterm';

// Services
registerSingleton(ITerminalQuickFixService, TerminalQuickFixService, InstantiationType.Delayed);

// Contributions
class TerminalQuickFixContribution extends DisposableStore implements ITerminalContribution {
	static readonly ID = 'quickFix';

	static get(instance: ITerminalInstance): TerminalQuickFixContribution | null {
		return instance.getContribution<TerminalQuickFixContribution>(TerminalQuickFixContribution.ID);
	}

	private _addon?: TerminalQuickFixAddon;
	get addon(): TerminalQuickFixAddon | undefined { return this._addon; }

	constructor(
		private readonly _instance: ITerminalInstance,
		processManager: ITerminalProcessManager,
		widgetManager: TerminalWidgetManager,
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
	) {
		super();
	}

	xtermReady(xterm: IXtermTerminal & { raw: RawXtermTerminal }): void {
		// Create addon
		this._addon = this._instantiationService.createInstance(TerminalQuickFixAddon, undefined, this._instance.capabilities);
		xterm.raw.loadAddon(this._addon);

		// Hook up listeners
		this.add(this._addon.onDidRequestRerunCommand((e) => this._instance.runCommand(e.command, e.shouldExecute || false)));

		// Register quick fixes
		for (const actionOption of [
			gitTwoDashes(),
			gitPull(),
			freePort((port: string, command: string) => this._instance.freePortKillProcess(port, command)),
			gitSimilar(),
			gitPushSetUpstream(),
			gitCreatePr(),
			pwshUnixCommandNotFoundError(),
			pwshGeneralError()
		]) {
			this._addon.registerCommandFinishedListener(actionOption);
		}
	}
}
registerTerminalContribution(TerminalQuickFixContribution.ID, TerminalQuickFixContribution);

// Actions
registerActiveInstanceAction({
	id: TerminalCommandId.ShowQuickFixes,
	title: localize2('workbench.action.terminal.showQuickFixes', 'Show Terminal Quick Fixes'),
	precondition: TerminalContextKeys.focus,
	keybinding: {
		primary: KeyMod.CtrlCmd | KeyCode.Period,
		weight: KeybindingWeight.WorkbenchContrib
	},
	run: (activeInstance) => TerminalQuickFixContribution.get(activeInstance)?.addon?.showMenu()
});

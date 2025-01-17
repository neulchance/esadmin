/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {KeyCode, KeyMod} from 'td/base/common/keyCodes';
import {DisposableStore} from 'td/base/common/lifecycle';
import {localize2} from 'td/nls';
import {ContextKeyExpr} from 'td/platform/contextkey/common/contextkey';
import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {IInstantiationService} from 'td/platform/instantiation/common/instantiation';
import {KeybindingWeight} from 'td/platform/keybinding/common/keybindingsRegistry';
import {AccessibleViewProviderId, accessibleViewCurrentProviderId, accessibleViewIsShown} from 'td/workbench/contrib/accessibility/browser/accessibilityConfiguration';
import {IDetachedTerminalInstance, ITerminalContribution, ITerminalInstance, IXtermTerminal, isDetachedTerminalInstance} from 'td/workbench/contrib/terminal/browser/terminal';
import {registerActiveInstanceAction} from 'td/workbench/contrib/terminal/browser/terminalActions';
import {registerTerminalContribution} from 'td/workbench/contrib/terminal/browser/terminalExtensions';
import {TerminalWidgetManager} from 'td/workbench/contrib/terminal/browser/widgets/widgetManager';
import {ITerminalProcessInfo, ITerminalProcessManager, TerminalCommandId, isTerminalProcessManager} from 'td/workbench/contrib/terminal/common/terminal';
import {TerminalContextKeys} from 'td/workbench/contrib/terminal/common/terminalContextKey';
import {terminalStrings} from 'td/workbench/contrib/terminal/common/terminalStrings';
import {ITerminalLinkProviderService} from 'td/workbench/contrib/terminalContrib/links/browser/links';
import {IDetectedLinks, TerminalLinkManager} from 'td/workbench/contrib/terminalContrib/links/browser/terminalLinkManager';
import {TerminalLinkProviderService} from 'td/workbench/contrib/terminalContrib/links/browser/terminalLinkProviderService';
import {TerminalLinkQuickpick} from 'td/workbench/contrib/terminalContrib/links/browser/terminalLinkQuickpick';
import {TerminalLinkResolver} from 'td/workbench/contrib/terminalContrib/links/browser/terminalLinkResolver';
import type {Terminal as RawXtermTerminal} from '@xterm/xterm';

registerSingleton(ITerminalLinkProviderService, TerminalLinkProviderService, InstantiationType.Delayed);

class TerminalLinkContribution extends DisposableStore implements ITerminalContribution {
	static readonly ID = 'terminal.link';

	static get(instance: ITerminalInstance): TerminalLinkContribution | null {
		return instance.getContribution<TerminalLinkContribution>(TerminalLinkContribution.ID);
	}

	private _linkManager: TerminalLinkManager | undefined;
	private _terminalLinkQuickpick: TerminalLinkQuickpick | undefined;
	private _linkResolver: TerminalLinkResolver;

	constructor(
		private readonly _instance: ITerminalInstance | IDetachedTerminalInstance,
		private readonly _processManager: ITerminalProcessManager | ITerminalProcessInfo,
		private readonly _widgetManager: TerminalWidgetManager,
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@ITerminalLinkProviderService private readonly _terminalLinkProviderService: ITerminalLinkProviderService
	) {
		super();
		this._linkResolver = this._instantiationService.createInstance(TerminalLinkResolver);
	}

	xtermReady(xterm: IXtermTerminal & { raw: RawXtermTerminal }): void {
		const linkManager = this._instantiationService.createInstance(TerminalLinkManager, xterm.raw, this._processManager, this._instance.capabilities, this._linkResolver);
		if (isTerminalProcessManager(this._processManager)) {
			this._processManager.onProcessReady(() => {
				linkManager.setWidgetManager(this._widgetManager);
			});
		} else {
			linkManager.setWidgetManager(this._widgetManager);
		}
		this._linkManager = this.add(linkManager);

		// Attach the link provider(s) to the instance and listen for changes
		if (!isDetachedTerminalInstance(this._instance)) {
			for (const linkProvider of this._terminalLinkProviderService.linkProviders) {
				this._linkManager.registerExternalLinkProvider(linkProvider.provideLinks.bind(linkProvider, this._instance));
			}
			this.add(this._terminalLinkProviderService.onDidAddLinkProvider(e => {
				linkManager.registerExternalLinkProvider(e.provideLinks.bind(e, this._instance as ITerminalInstance));
			}));
		}
		// TODO: Currently only a single link provider is supported; the one registered by the ext host
		this.add(this._terminalLinkProviderService.onDidRemoveLinkProvider(e => {
			linkManager.dispose();
			this.xtermReady(xterm);
		}));
	}

	async showLinkQuickpick(extended?: boolean): Promise<void> {
		if (!this._terminalLinkQuickpick) {
			this._terminalLinkQuickpick = this.add(this._instantiationService.createInstance(TerminalLinkQuickpick));
			this._terminalLinkQuickpick.onDidRequestMoreLinks(() => {
				this.showLinkQuickpick(true);
			});
		}
		const links = await this._getLinks();
		return await this._terminalLinkQuickpick.show(links);
	}

	private async _getLinks(): Promise<{ viewport: IDetectedLinks; all: Promise<IDetectedLinks> }> {
		if (!this._linkManager) {
			throw new Error('terminal links are not ready, cannot generate link quick pick');
		}
		return this._linkManager.getLinks();
	}

	async openRecentLink(type: 'localFile' | 'url'): Promise<void> {
		if (!this._linkManager) {
			throw new Error('terminal links are not ready, cannot open a link');
		}
		this._linkManager.openRecentLink(type);
	}
}

registerTerminalContribution(TerminalLinkContribution.ID, TerminalLinkContribution, true);

const category = terminalStrings.actionCategory;

registerActiveInstanceAction({
	id: TerminalCommandId.OpenDetectedLink,
	title: localize2('workbench.action.terminal.openDetectedLink', 'Open Detected Link...'),
	f1: true,
	category,
	precondition: TerminalContextKeys.terminalHasBeenCreated,
	keybinding: [{
		primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyO,
		weight: KeybindingWeight.WorkbenchContrib + 1,
		when: TerminalContextKeys.focus
	}, {
		primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyG,
		weight: KeybindingWeight.WorkbenchContrib + 1,
		when: ContextKeyExpr.and(accessibleViewIsShown, ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, AccessibleViewProviderId.Terminal))
	},
	],
	run: (activeInstance) => TerminalLinkContribution.get(activeInstance)?.showLinkQuickpick()
});
registerActiveInstanceAction({
	id: TerminalCommandId.OpenWebLink,
	title: localize2('workbench.action.terminal.openLastUrlLink', 'Open Last URL Link'),
	f1: true,
	category,
	precondition: TerminalContextKeys.terminalHasBeenCreated,
	run: (activeInstance) => TerminalLinkContribution.get(activeInstance)?.openRecentLink('url')
});
registerActiveInstanceAction({
	id: TerminalCommandId.OpenFileLink,
	title: localize2('workbench.action.terminal.openLastLocalFileLink', 'Open Last Local File Link'),
	f1: true,
	category,
	precondition: TerminalContextKeys.terminalHasBeenCreated,
	run: (activeInstance) => TerminalLinkContribution.get(activeInstance)?.openRecentLink('localFile')
});

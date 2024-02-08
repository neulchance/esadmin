/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {isFirefox} from 'td/base/browser/browser';
import {raceTimeout, timeout} from 'td/base/common/async';
import {CancellationToken} from 'td/base/common/cancellation';
import {Codicon} from 'td/base/common/codicons';
import {stripIcons} from 'td/base/common/iconLabels';
import {KeyCode, KeyMod} from 'td/base/common/keyCodes';
import {Language} from 'td/base/common/platform';
import {ThemeIcon} from 'td/base/common/themables';
import {IEditor} from 'td/editor/common/editorCommon';
import {AbstractEditorCommandsQuickAccessProvider} from 'td/editor/contrib/quickAccess/browser/commandsQuickAccess';
import {localize, localize2} from 'td/nls';
import {isLocalizedString} from 'td/platform/action/common/action';
import {Action2, IMenuService, MenuId, MenuItemAction, SubmenuItemAction} from 'td/platform/actions/common/actions';
import {ICommandService} from 'td/platform/commands/common/commands';
import {IConfigurationChangeEvent, IConfigurationService} from 'td/platform/configuration/common/configuration';
import {IDialogService} from 'td/platform/dialogs/common/dialogs';
import {IInstantiationService, ServicesAccessor} from 'td/platform/instantiation/common/instantiation';
import {IKeybindingService} from 'td/platform/keybinding/common/keybinding';
import {KeybindingWeight} from 'td/platform/keybinding/common/keybindingsRegistry';
import {IProductService} from 'td/platform/product/common/productService';
import {CommandsHistory, ICommandQuickPick} from 'td/platform/quickinput/browser/commandsQuickAccess';
import {TriggerAction} from 'td/platform/quickinput/browser/pickerQuickAccess';
import {DefaultQuickAccessFilterValue} from 'td/platform/quickinput/common/quickAccess';
import {IQuickInputService, IQuickPickSeparator} from 'td/platform/quickinput/common/quickInput';
import {IStorageService} from 'td/platform/storage/common/storage';
import {ITelemetryService} from 'td/platform/telemetry/common/telemetry';
import {IWorkbenchQuickAccessConfiguration} from 'td/workbench/browser/quickaccess';
import {CHAT_OPEN_ACTION_ID} from 'td/workbench/contrib/chat/browser/actions/chatActions';
import {ASK_QUICK_QUESTION_ACTION_ID} from 'td/workbench/contrib/chat/browser/actions/chatQuickInputActions';
import {IChatAgentService} from 'td/workbench/contrib/chat/common/chatAgents';
import {CommandInformationResult, IAiRelatedInformationService, RelatedInformationType} from 'td/workbench/services/aiRelatedInformation/common/aiRelatedInformation';
import {IEditorGroupsService} from 'td/workbench/services/editor/common/editorGroupsService';
import {IEditorService} from 'td/workbench/services/editor/common/editorService';
import {IExtensionService} from 'td/workbench/services/extensions/common/extensions';
import {IPreferencesService} from 'td/workbench/services/preferences/common/preferences';

export class CommandsQuickAccessProvider extends AbstractEditorCommandsQuickAccessProvider {

	private static AI_RELATED_INFORMATION_MAX_PICKS = 5;
	private static AI_RELATED_INFORMATION_THRESHOLD = 0.8;
	private static AI_RELATED_INFORMATION_DEBOUNCE = 200;

	// If extensions are not yet registered, we wait for a little moment to give them
	// a chance to register so that the complete set of commands shows up as result
	// We do not want to delay functionality beyond that time though to keep the commands
	// functional.
	private readonly extensionRegistrationRace = raceTimeout(this.extensionService.whenInstalledExtensionsRegistered(), 800);

	private useAiRelatedInfo = false;

	protected get activeTextEditorControl(): IEditor | undefined { return this.editorService.activeTextEditorControl; }

	get defaultFilterValue(): DefaultQuickAccessFilterValue | undefined {
		if (this.configuration.preserveInput) {
			return DefaultQuickAccessFilterValue.LAST;
		}

		return undefined;
	}

	constructor(
		@IEditorService private readonly editorService: IEditorService,
		@IMenuService private readonly menuService: IMenuService,
		@IExtensionService private readonly extensionService: IExtensionService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IKeybindingService keybindingService: IKeybindingService,
		@ICommandService commandService: ICommandService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IDialogService dialogService: IDialogService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IEditorGroupsService private readonly editorGroupService: IEditorGroupsService,
		@IPreferencesService private readonly preferencesService: IPreferencesService,
		@IProductService private readonly productService: IProductService,
		@IAiRelatedInformationService private readonly aiRelatedInformationService: IAiRelatedInformationService,
		@IChatAgentService private readonly chatAgentService: IChatAgentService,
	) {
		super({
			showAlias: !Language.isDefaultVariant(),
			noResultsPick: () => ({
				label: localize('noCommandResults', "No matching commands"),
				commandId: ''
			}),
		}, instantiationService, keybindingService, commandService, telemetryService, dialogService);

		this._register(configurationService.onDidChangeConfiguration((e) => this.updateOptions(e)));
		this.updateOptions();
	}

	private get configuration() {
		const commandPaletteConfig = this.configurationService.getValue<IWorkbenchQuickAccessConfiguration>().workbench.commandPalette;

		return {
			preserveInput: commandPaletteConfig.preserveInput,
			experimental: commandPaletteConfig.experimental
		};
	}

	private updateOptions(e?: IConfigurationChangeEvent): void {
		if (e && !e.affectsConfiguration('workbench.commandPalette.experimental')) {
			return;
		}

		const config = this.configuration;
		const suggestedCommandIds = config.experimental.suggestCommands && this.productService.commandPaletteSuggestedCommandIds?.length
			? new Set(this.productService.commandPaletteSuggestedCommandIds)
			: undefined;
		this.options.suggestedCommandIds = suggestedCommandIds;
		this.useAiRelatedInfo = config.experimental.enableNaturalLanguageSearch;
	}

	protected async getCommandPicks(token: CancellationToken): Promise<Array<ICommandQuickPick>> {

		// wait for extensions registration or 800ms once
		await this.extensionRegistrationRace;

		if (token.isCancellationRequested) {
			return [];
		}

		return [
			...this.getCodeEditorCommandPicks(),
			...this.getGlobalCommandPicks()
		].map(picks => ({
			...picks,
			buttons: [{
				iconClass: ThemeIcon.asClassName(Codicon.gear),
				tooltip: localize('configure keybinding', "Configure Keybinding"),
			}],
			trigger: (): TriggerAction => {
				this.preferencesService.openGlobalKeybindingSettings(false, {query: `@command:${picks.commandId}`});
				return TriggerAction.CLOSE_PICKER;
			},
		}));
	}

	protected hasAdditionalCommandPicks(filter: string, token: CancellationToken): boolean {
		if (
			!this.useAiRelatedInfo
			|| token.isCancellationRequested
			|| filter === ''
			|| !this.aiRelatedInformationService.isEnabled()
		) {
			return false;
		}

		return true;
	}

	protected async getAdditionalCommandPicks(allPicks: ICommandQuickPick[], picksSoFar: ICommandQuickPick[], filter: string, token: CancellationToken): Promise<Array<ICommandQuickPick | IQuickPickSeparator>> {
		if (!this.hasAdditionalCommandPicks(filter, token)) {
			return [];
		}

		let additionalPicks;

		try {
			// Wait a bit to see if the user is still typing
			await timeout(CommandsQuickAccessProvider.AI_RELATED_INFORMATION_DEBOUNCE, token);
			additionalPicks = await this.getRelatedInformationPicks(allPicks, picksSoFar, filter, token);
		} catch (e) {
			return [];
		}

		if (picksSoFar.length || additionalPicks.length) {
			additionalPicks.push({
				type: 'separator'
			});
		}

		const defaultAgent = this.chatAgentService.getDefaultAgent();
		if (defaultAgent) {
			additionalPicks.push({
				label: localize('askXInChat', "Ask {0}: {1}", defaultAgent.metadata.fullName, filter),
				commandId: this.configuration.experimental.askChatLocation === 'quickChat' ? ASK_QUICK_QUESTION_ACTION_ID : CHAT_OPEN_ACTION_ID,
				args: [filter]
			});
		}

		return additionalPicks;
	}

	private async getRelatedInformationPicks(allPicks: ICommandQuickPick[], picksSoFar: ICommandQuickPick[], filter: string, token: CancellationToken) {
		const relatedInformation = await this.aiRelatedInformationService.getRelatedInformation(
			filter,
			[RelatedInformationType.CommandInformation],
			token
		) as CommandInformationResult[];

		// Sort by weight descending to get the most relevant results first
		relatedInformation.sort((a, b) => b.weight - a.weight);

		const setOfPicksSoFar = new Set(picksSoFar.map(p => p.commandId));
		const additionalPicks = new Array<ICommandQuickPick | IQuickPickSeparator>();

		for (const info of relatedInformation) {
			if (info.weight < CommandsQuickAccessProvider.AI_RELATED_INFORMATION_THRESHOLD || additionalPicks.length === CommandsQuickAccessProvider.AI_RELATED_INFORMATION_MAX_PICKS) {
				break;
			}
			const pick = allPicks.find(p => p.commandId === info.command && !setOfPicksSoFar.has(p.commandId));
			if (pick) {
				additionalPicks.push(pick);
			}
		}

		return additionalPicks;
	}

	private getGlobalCommandPicks(): ICommandQuickPick[] {
		const globalCommandPicks: ICommandQuickPick[] = [];
		const scopedContextKeyService = this.editorService.activeEditorPane?.scopedContextKeyService || this.editorGroupService.activeGroup.scopedContextKeyService;
		const globalCommandsMenu = this.menuService.createMenu(MenuId.CommandPalette, scopedContextKeyService);
		const globalCommandsMenuActions = globalCommandsMenu.getActions()
			.reduce((r, [, actions]) => [...r, ...actions], <Array<MenuItemAction | SubmenuItemAction | string>>[])
			.filter(action => action instanceof MenuItemAction && action.enabled) as MenuItemAction[];

		for (const action of globalCommandsMenuActions) {

			// Label
			let label = (typeof action.item.title === 'string' ? action.item.title : action.item.title.value) || action.item.id;

			// Category
			const category = typeof action.item.category === 'string' ? action.item.category : action.item.category?.value;
			if (category) {
				label = localize('commandWithCategory', "{0}: {1}", category, label);
			}

			// Alias
			const aliasLabel = typeof action.item.title !== 'string' ? action.item.title.original : undefined;
			const aliasCategory = (category && action.item.category && typeof action.item.category !== 'string') ? action.item.category.original : undefined;
			const commandAlias = (aliasLabel && category) ?
				aliasCategory ? `${aliasCategory}: ${aliasLabel}` : `${category}: ${aliasLabel}` :
				aliasLabel;

			const metadataDescription = action.item.metadata?.description;
			const commandDescription = metadataDescription === undefined || isLocalizedString(metadataDescription)
				? metadataDescription
				// TODO: this type will eventually not be a string and when that happens, this should simplified.
				: {value: metadataDescription, original: metadataDescription};
			globalCommandPicks.push({
				commandId: action.item.id,
				commandAlias,
				label: stripIcons(label),
				commandDescription,
			});
		}

		// Cleanup
		globalCommandsMenu.dispose();

		return globalCommandPicks;
	}
}

//#region Actions

export class ShowAllCommandsAction extends Action2 {

	static readonly ID = 'workbench.action.showCommands';

	constructor() {
		super({
			id: ShowAllCommandsAction.ID,
			title: localize2('showTriggerActions', 'Show All Commands'),
			keybinding: {
				weight: KeybindingWeight.WorkbenchContrib,
				when: undefined,
				primary: !isFirefox ? (KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyP) : undefined,
				secondary: [KeyCode.F1]
			},
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		accessor.get(IQuickInputService).quickAccess.show(CommandsQuickAccessProvider.PREFIX);
	}
}

export class ClearCommandHistoryAction extends Action2 {

	constructor() {
		super({
			id: 'workbench.action.clearCommandHistory',
			title: localize2('clearCommandHistory', 'Clear Command History'),
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const configurationService = accessor.get(IConfigurationService);
		const storageService = accessor.get(IStorageService);
		const dialogService = accessor.get(IDialogService);

		const commandHistoryLength = CommandsHistory.getConfiguredCommandHistoryLength(configurationService);
		if (commandHistoryLength > 0) {

			// Ask for confirmation
			const {confirmed} = await dialogService.confirm({
				type: 'warning',
				message: localize('confirmClearMessage', "Do you want to clear the history of recently used commands?"),
				detail: localize('confirmClearDetail', "This action is irreversible!"),
				primaryButton: localize({key: 'clearButtonLabel', comment: ['&& denotes a mnemonic']}, "&&Clear")
			});

			if (!confirmed) {
				return;
			}

			CommandsHistory.clearHistory(configurationService, storageService);
		}
	}
}

//#endregion

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {localize} from 'td/nls';
import {IQuickAccessRegistry, Extensions} from 'td/platform/quickinput/common/quickAccess';
import {Registry} from 'td/platform/registry/common/platform';
import {HelpQuickAccessProvider} from 'td/platform/quickinput/browser/helpQuickAccess';
import {ViewQuickAccessProvider, OpenViewPickerAction, QuickAccessViewPickerAction} from 'td/workbench/contrib/quickaccess/browser/viewQuickAccess';
import {CommandsQuickAccessProvider, ShowAllCommandsAction, ClearCommandHistoryAction} from 'td/workbench/contrib/quickaccess/browser/commandsQuickAccess';
import {MenuRegistry, MenuId, registerAction2} from 'td/platform/actions/common/actions';
import {KeyMod} from 'td/base/common/keyCodes';
import {ContextKeyExpr} from 'td/platform/contextkey/common/contextkey';
import {inQuickPickContext, getQuickNavigateHandler} from 'td/workbench/browser/quickaccess';
import {KeybindingsRegistry, KeybindingWeight} from 'td/platform/keybinding/common/keybindingsRegistry';
import {EditorContextKeys} from 'td/editor/common/editorContextKeys';

//#region Quick Access Proviers

const quickAccessRegistry = Registry.as<IQuickAccessRegistry>(Extensions.Quickaccess);

quickAccessRegistry.registerQuickAccessProvider({
	ctor: HelpQuickAccessProvider,
	prefix: HelpQuickAccessProvider.PREFIX,
	placeholder: localize('helpQuickAccessPlaceholder', "Type '{0}' to get help on the actions you can take from here.", HelpQuickAccessProvider.PREFIX),
	helpEntries: [{
		description: localize('helpQuickAccess', "Show all Quick Access Providers"),
		commandCenterOrder: 70,
		commandCenterLabel: localize('more', 'More')
	}]
});

quickAccessRegistry.registerQuickAccessProvider({
	ctor: ViewQuickAccessProvider,
	prefix: ViewQuickAccessProvider.PREFIX,
	contextKey: 'inViewsPicker',
	placeholder: localize('viewQuickAccessPlaceholder', "Type the name of a view, output channel or terminal to open."),
	helpEntries: [{description: localize('viewQuickAccess', "Open View"), commandId: OpenViewPickerAction.ID}]
});

quickAccessRegistry.registerQuickAccessProvider({
	ctor: CommandsQuickAccessProvider,
	prefix: CommandsQuickAccessProvider.PREFIX,
	contextKey: 'inCommandsPicker',
	placeholder: localize('commandsQuickAccessPlaceholder', "Type the name of a command to run."),
	helpEntries: [{description: localize('commandsQuickAccess', "Show and Run Commands"), commandId: ShowAllCommandsAction.ID, commandCenterOrder: 20}]
});

//#endregion


//#region Menu contributions

MenuRegistry.appendMenuItem(MenuId.MenubarViewMenu, {
	group: '1_open',
	command: {
		id: ShowAllCommandsAction.ID,
		title: localize({key: 'miCommandPalette', comment: ['&& denotes a mnemonic']}, "&&Command Palette...")
	},
	order: 1
});

MenuRegistry.appendMenuItem(MenuId.MenubarHelpMenu, {
	group: '1_welcome',
	command: {
		id: ShowAllCommandsAction.ID,
		title: localize({key: 'miShowAllCommands', comment: ['&& denotes a mnemonic']}, "Show All Commands")
	},
	order: 2
});

MenuRegistry.appendMenuItem(MenuId.MenubarViewMenu, {
	group: '1_open',
	command: {
		id: OpenViewPickerAction.ID,
		title: localize({key: 'miOpenView', comment: ['&& denotes a mnemonic']}, "&&Open View...")
	},
	order: 2
});

MenuRegistry.appendMenuItem(MenuId.MenubarGoMenu, {
	group: '5_infile_nav',
	command: {
		id: 'workbench.action.gotoLine',
		title: localize({key: 'miGotoLine', comment: ['&& denotes a mnemonic']}, "Go to &&Line/Column...")
	},
	order: 1
});

MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
	group: '1_command',
	command: {
		id: ShowAllCommandsAction.ID,
		title: localize('commandPalette', "Command Palette...")
	},
	order: 1
});

MenuRegistry.appendMenuItem(MenuId.EditorContext, {
	group: 'z_commands',
	when: EditorContextKeys.editorSimpleInput.toNegated(),
	command: {
		id: ShowAllCommandsAction.ID,
		title: localize('commandPalette', "Command Palette..."),
	},
	order: 1
});

//#endregion


//#region Workbench actions and commands

registerAction2(ClearCommandHistoryAction);
registerAction2(ShowAllCommandsAction);
registerAction2(OpenViewPickerAction);
registerAction2(QuickAccessViewPickerAction);

const inViewsPickerContextKey = 'inViewsPicker';
const inViewsPickerContext = ContextKeyExpr.and(inQuickPickContext, ContextKeyExpr.has(inViewsPickerContextKey));
const viewPickerKeybinding = QuickAccessViewPickerAction.KEYBINDING;

const quickAccessNavigateNextInViewPickerId = 'workbench.action.quickOpenNavigateNextInViewPicker';
KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: quickAccessNavigateNextInViewPickerId,
	weight: KeybindingWeight.WorkbenchContrib + 50,
	handler: getQuickNavigateHandler(quickAccessNavigateNextInViewPickerId, true),
	when: inViewsPickerContext,
	primary: viewPickerKeybinding.primary,
	linux: viewPickerKeybinding.linux,
	mac: viewPickerKeybinding.mac
});

const quickAccessNavigatePreviousInViewPickerId = 'workbench.action.quickOpenNavigatePreviousInViewPicker';
KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: quickAccessNavigatePreviousInViewPickerId,
	weight: KeybindingWeight.WorkbenchContrib + 50,
	handler: getQuickNavigateHandler(quickAccessNavigatePreviousInViewPickerId, false),
	when: inViewsPickerContext,
	primary: viewPickerKeybinding.primary | KeyMod.Shift,
	linux: viewPickerKeybinding.linux,
	mac: {
		primary: viewPickerKeybinding.mac.primary | KeyMod.Shift
	}
});

//#endregion
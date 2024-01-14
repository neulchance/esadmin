/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from 'td/platform/registry/common/platform';
import { IQuickAccessRegistry, Extensions } from 'td/platform/quickinput/common/quickAccess';
import { QuickCommandNLS } from 'td/editor/common/standaloneStrings';
import { ICommandQuickPick } from 'td/platform/quickinput/browser/commandsQuickAccess';
import { ICodeEditorService } from 'td/editor/browser/services/codeEditorService';
import { AbstractEditorCommandsQuickAccessProvider } from 'td/editor/contrib/quickAccess/browser/commandsQuickAccess';
import { IEditor } from 'td/editor/common/editorCommon';
import { IInstantiationService, ServicesAccessor } from 'td/platform/instantiation/common/instantiation';
import { IKeybindingService } from 'td/platform/keybinding/common/keybinding';
import { ICommandService } from 'td/platform/commands/common/commands';
import { ITelemetryService } from 'td/platform/telemetry/common/telemetry';
import { IDialogService } from 'td/platform/dialogs/common/dialogs';
import { EditorAction, registerEditorAction } from 'td/editor/browser/editorExtensions';
import { EditorContextKeys } from 'td/editor/common/editorContextKeys';
import { KeyCode } from 'td/base/common/keyCodes';
import { KeybindingWeight } from 'td/platform/keybinding/common/keybindingsRegistry';
import { IQuickInputService } from 'td/platform/quickinput/common/quickInput';

export class StandaloneCommandsQuickAccessProvider extends AbstractEditorCommandsQuickAccessProvider {

	protected get activeTextEditorControl(): IEditor | undefined { return this.codeEditorService.getFocusedCodeEditor() ?? undefined; }

	constructor(
		@IInstantiationService instantiationService: IInstantiationService,
		@ICodeEditorService private readonly codeEditorService: ICodeEditorService,
		@IKeybindingService keybindingService: IKeybindingService,
		@ICommandService commandService: ICommandService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IDialogService dialogService: IDialogService
	) {
		super({ showAlias: false }, instantiationService, keybindingService, commandService, telemetryService, dialogService);
	}

	protected async getCommandPicks(): Promise<Array<ICommandQuickPick>> {
		return this.getCodeEditorCommandPicks();
	}

	protected hasAdditionalCommandPicks(): boolean {
		return false;
	}

	protected async getAdditionalCommandPicks(): Promise<ICommandQuickPick[]> {
		return [];
	}
}

export class GotoLineAction extends EditorAction {

	static readonly ID = 'editor.action.quickCommand';

	constructor() {
		super({
			id: GotoLineAction.ID,
			label: QuickCommandNLS.quickCommandActionLabel,
			alias: 'Command Palette',
			precondition: undefined,
			kbOpts: {
				kbExpr: EditorContextKeys.focus,
				primary: KeyCode.F1,
				weight: KeybindingWeight.EditorContrib
			},
			contextMenuOpts: {
				group: 'z_commands',
				order: 1
			}
		});
	}

	run(accessor: ServicesAccessor): void {
		accessor.get(IQuickInputService).quickAccess.show(StandaloneCommandsQuickAccessProvider.PREFIX);
	}
}

registerEditorAction(GotoLineAction);

Registry.as<IQuickAccessRegistry>(Extensions.Quickaccess).registerQuickAccessProvider({
	ctor: StandaloneCommandsQuickAccessProvider,
	prefix: StandaloneCommandsQuickAccessProvider.PREFIX,
	helpEntries: [{ description: QuickCommandNLS.quickCommandHelp, commandId: GotoLineAction.ID }]
});

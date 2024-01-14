/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {stripIcons} from 'td/base/common/iconLabels';
import {IEditor} from 'td/editor/common/editorCommon';
import {ICommandService} from 'td/platform/commands/common/commands';
import {IDialogService} from 'td/platform/dialogs/common/dialogs';
import {IInstantiationService} from 'td/platform/instantiation/common/instantiation';
import {IKeybindingService} from 'td/platform/keybinding/common/keybinding';
import {AbstractCommandsQuickAccessProvider, ICommandQuickPick, ICommandsQuickAccessOptions} from 'td/platform/quickinput/browser/commandsQuickAccess';
import {ITelemetryService} from 'td/platform/telemetry/common/telemetry';

export abstract class AbstractEditorCommandsQuickAccessProvider extends AbstractCommandsQuickAccessProvider {

	constructor(
		options: ICommandsQuickAccessOptions,
		instantiationService: IInstantiationService,
		keybindingService: IKeybindingService,
		commandService: ICommandService,
		telemetryService: ITelemetryService,
		dialogService: IDialogService
	) {
		super(options, instantiationService, keybindingService, commandService, telemetryService, dialogService);
	}

	/**
	 * Subclasses to provide the current active editor control.
	 */
	protected abstract activeTextEditorControl: IEditor | undefined;

	protected getCodeEditorCommandPicks(): ICommandQuickPick[] {
		const activeTextEditorControl = this.activeTextEditorControl;
		if (!activeTextEditorControl) {
			return [];
		}

		const editorCommandPicks: ICommandQuickPick[] = [];
		for (const editorAction of activeTextEditorControl.getSupportedActions()) {
			editorCommandPicks.push({
				commandId: editorAction.id,
				commandAlias: editorAction.alias,
				label: stripIcons(editorAction.label) || editorAction.id,
			});
		}

		return editorCommandPicks;
	}
}

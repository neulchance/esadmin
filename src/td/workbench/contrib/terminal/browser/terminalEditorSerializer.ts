/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IInstantiationService} from 'td/platform/instantiation/common/instantiation';
import {IEditorSerializer} from 'td/workbench/common/editor';
import {EditorInput} from 'td/workbench/common/editor/editorInput';
import {ISerializedTerminalEditorInput, ITerminalEditorService, ITerminalInstance} from 'td/workbench/contrib/terminal/browser/terminal';
import {TerminalEditorInput} from 'td/workbench/contrib/terminal/browser/terminalEditorInput';

export class TerminalInputSerializer implements IEditorSerializer {
	constructor(
		@ITerminalEditorService private readonly _terminalEditorService: ITerminalEditorService
	) { }

	public canSerialize(editorInput: TerminalEditorInput): boolean {
		return !!editorInput.terminalInstance?.persistentProcessId;
	}

	public serialize(editorInput: TerminalEditorInput): string | undefined {
		if (!editorInput.terminalInstance?.persistentProcessId || !editorInput.terminalInstance.shouldPersist) {
			return;
		}
		const term = JSON.stringify(this._toJson(editorInput.terminalInstance));
		return term;
	}

	public deserialize(instantiationService: IInstantiationService, serializedEditorInput: string): EditorInput | undefined {
		const terminalInstance = JSON.parse(serializedEditorInput);
		return this._terminalEditorService.reviveInput(terminalInstance);
	}

	private _toJson(instance: ITerminalInstance): ISerializedTerminalEditorInput {
		return {
			id: instance.persistentProcessId!,
			pid: instance.processId || 0,
			title: instance.title,
			titleSource: instance.titleSource,
			cwd: '',
			icon: instance.icon,
			color: instance.color,
			hasChildProcesses: instance.hasChildProcesses,
			isFeatureTerminal: instance.shellLaunchConfig.isFeatureTerminal,
			hideFromUser: instance.shellLaunchConfig.hideFromUser,
			reconnectionProperties: instance.shellLaunchConfig.reconnectionProperties,
			shellIntegrationNonce: instance.shellIntegrationNonce
		};
	}
}

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {Codicon} from 'td/base/common/codicons';
import {OS} from 'td/base/common/platform';
import {ThemeIcon} from 'td/base/common/themables';
import * as nls from 'td/nls';
import {IInstantiationService} from 'td/platform/instantiation/common/instantiation';
import {registerIcon} from 'td/platform/theme/common/iconRegistry';
import {IUntypedEditorInput} from 'td/workbench/common/editor';
import {EditorInput} from 'td/workbench/common/editor/editorInput';
import {KeybindingsEditorModel} from 'td/workbench/services/preferences/browser/keybindingsEditorModel';

export interface IKeybindingsEditorSearchOptions {
	searchValue: string;
	recordKeybindings: boolean;
	sortByPrecedence: boolean;
}

const KeybindingsEditorIcon = registerIcon('keybindings-editor-label-icon', Codicon.keyboard, nls.localize('keybindingsEditorLabelIcon', 'Icon of the keybindings editor label.'));

export class KeybindingsEditorInput extends EditorInput {

	static readonly ID: string = 'workbench.input.keybindings';
	readonly keybindingsModel: KeybindingsEditorModel;

	searchOptions: IKeybindingsEditorSearchOptions | null = null;

	readonly resource = undefined;

	constructor(@IInstantiationService instantiationService: IInstantiationService) {
		super();

		this.keybindingsModel = instantiationService.createInstance(KeybindingsEditorModel, OS);
	}

	override get typeId(): string {
		return KeybindingsEditorInput.ID;
	}

	override getName(): string {
		return nls.localize('keybindingsInputName', "Keyboard Shortcuts");
	}

	override getIcon(): ThemeIcon {
		return KeybindingsEditorIcon;
	}

	override async resolve(): Promise<KeybindingsEditorModel> {
		return this.keybindingsModel;
	}

	override matches(otherInput: EditorInput | IUntypedEditorInput): boolean {
		return otherInput instanceof KeybindingsEditorInput;
	}

	override dispose(): void {
		this.keybindingsModel.dispose();

		super.dispose();
	}
}

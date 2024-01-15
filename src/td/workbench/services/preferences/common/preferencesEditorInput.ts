/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {Codicon} from 'td/base/common/codicons';
import {Schemas} from 'td/base/common/network';
import {ThemeIcon} from 'td/base/common/themables';
import {URI} from 'td/base/common/uri';
import * as nls from 'td/nls';
import {registerIcon} from 'td/platform/theme/common/iconRegistry';
import {IUntypedEditorInput} from 'td/workbench/common/editor';
import {EditorInput} from 'td/workbench/common/editor/editorInput';
import {IPreferencesService} from 'td/workbench/services/preferences/common/preferences';
import {Settings2EditorModel} from 'td/workbench/services/preferences/common/preferencesModels';

const SettingsEditorIcon = registerIcon('settings-editor-label-icon', Codicon.settings, nls.localize('settingsEditorLabelIcon', 'Icon of the settings editor label.'));

export class SettingsEditor2Input extends EditorInput {

	static readonly ID: string = 'workbench.input.settings2';
	private readonly _settingsModel: Settings2EditorModel;

	readonly resource: URI = URI.from({
		scheme: Schemas.vscodeSettings,
		path: `settingseditor`
	});

	constructor(
		@IPreferencesService _preferencesService: IPreferencesService,
	) {
		super();

		this._settingsModel = _preferencesService.createSettings2EditorModel();
	}

	override matches(otherInput: EditorInput | IUntypedEditorInput): boolean {
		return super.matches(otherInput) || otherInput instanceof SettingsEditor2Input;
	}

	override get typeId(): string {
		return SettingsEditor2Input.ID;
	}

	override getName(): string {
		return nls.localize('settingsEditor2InputName', "Settings");
	}

	override getIcon(): ThemeIcon {
		return SettingsEditorIcon;
	}

	override async resolve(): Promise<Settings2EditorModel> {
		return this._settingsModel;
	}

	override dispose(): void {
		this._settingsModel.dispose();

		super.dispose();
	}
}

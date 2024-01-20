/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {Event} from 'td/base/common/event';
import {Disposable} from 'td/base/common/lifecycle';
import {isWeb} from 'td/base/common/platform';
import {isEqual} from 'td/base/common/resources';
import {IUserDataProfilesService} from 'td/platform/userDataProfile/common/userDataProfile';
import {IUserDataAutoSyncService} from 'td/platform/userDataSync/common/userDataSync';
import {IWorkbenchContribution} from 'td/workbench/common/contributions';
import {EditorInput} from 'td/workbench/common/editor/editorInput';
import {IViewsService} from 'td/workbench/services/views/common/viewsService';
import {VIEWLET_ID} from 'td/workbench/contrib/extensions/common/extensions';
import {IEditorService} from 'td/workbench/services/editor/common/editorService';
import {IHostService} from 'td/workbench/services/host/browser/host';
import {KeybindingsEditorInput} from 'td/workbench/services/preferences/browser/keybindingsEditorInput';
import {SettingsEditor2Input} from 'td/workbench/services/preferences/common/preferencesEditorInput';

export class UserDataSyncTrigger extends Disposable implements IWorkbenchContribution {

	constructor(
		@IEditorService editorService: IEditorService,
		@IUserDataProfilesService private readonly userDataProfilesService: IUserDataProfilesService,
		@IViewsService viewsService: IViewsService,
		@IUserDataAutoSyncService userDataAutoSyncService: IUserDataAutoSyncService,
		@IHostService hostService: IHostService,
	) {
		super();
		const event = Event.filter(
			Event.any<string | undefined>(
				Event.map(editorService.onDidActiveEditorChange, () => this.getUserDataEditorInputSource(editorService.activeEditor)),
				Event.map(Event.filter(viewsService.onDidChangeViewContainerVisibility, e => e.id === VIEWLET_ID && e.visible), e => e.id)
			), source => source !== undefined);
		if (isWeb) {
			this._register(Event.debounce<string, string[]>(
				Event.any<string>(
					Event.map(hostService.onDidChangeFocus, () => 'windowFocus'),
					Event.map(event, source => source!),
				), (last, source) => last ? [...last, source] : [source], 1000)
				(sources => userDataAutoSyncService.triggerSync(sources, true, false)));
		} else {
			this._register(event(source => userDataAutoSyncService.triggerSync([source!], true, false)));
		}
	}

	private getUserDataEditorInputSource(editorInput: EditorInput | undefined): string | undefined {
		if (!editorInput) {
			return undefined;
		}
		if (editorInput instanceof SettingsEditor2Input) {
			return 'settingsEditor';
		}
		if (editorInput instanceof KeybindingsEditorInput) {
			return 'keybindingsEditor';
		}
		const resource = editorInput.resource;
		if (isEqual(resource, this.userDataProfilesService.defaultProfile.settingsResource)) {
			return 'settingsEditor';
		}
		if (isEqual(resource, this.userDataProfilesService.defaultProfile.keybindingsResource)) {
			return 'keybindingsEditor';
		}
		return undefined;
	}
}

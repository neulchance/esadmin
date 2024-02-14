/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {Disposable} from 'td/base/common/lifecycle';
import {localize} from 'td/nls';
import {registerAction2} from 'td/platform/actions/common/actions';
import {SyncDescriptor} from 'td/platform/instantiation/common/descriptors';
import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {Registry} from 'td/platform/registry/common/platform';
import {EditorPaneDescriptor, IEditorPaneRegistry} from 'td/workbench/browser/editor';
import {IWorkbenchContribution, WorkbenchPhase, registerWorkbenchContribution2} from 'td/workbench/common/contributions';
import {EditorExtensions, IEditorFactoryRegistry} from 'td/workbench/common/editor';
import {EditorInput} from 'td/workbench/common/editor/editorInput';
import {IEditorGroup, IEditorGroupsService} from 'td/workbench/services/editor/common/editorGroupsService';
import {HideWebViewEditorFindCommand, ReloadWebviewAction, ShowWebViewEditorFindWidgetAction, WebViewEditorFindNextCommand, WebViewEditorFindPreviousCommand} from './webviewCommands';
import {WebviewEditor} from './webviewEditor';
import {WebviewInput} from './webviewEditorInput';
import {WebviewEditorInputSerializer} from './webviewEditorInputSerializer';
import {IWebviewWorkbenchService, WebviewEditorService} from './webviewWorkbenchService';
import {IEditorService} from 'td/workbench/services/editor/common/editorService';

(Registry.as<IEditorPaneRegistry>(EditorExtensions.EditorPane)).registerEditorPane(EditorPaneDescriptor.create(
	WebviewEditor,
	WebviewEditor.ID,
	localize('webview.editor.label', "webview editor")),
	[new SyncDescriptor(WebviewInput)]);

class WebviewPanelContribution extends Disposable implements IWorkbenchContribution {

	static readonly ID = 'workbench.contrib.webviewPanel';

	constructor(
		@IEditorService editorService: IEditorService,
		@IEditorGroupsService private readonly editorGroupService: IEditorGroupsService
	) {
		super();

		this._register(editorService.onWillOpenEditor(e => {
			const group = editorGroupService.getGroup(e.groupId);
			if (group) {
				this.onEditorOpening(e.editor, group);
			}
		}));
	}

	private onEditorOpening(
		editor: EditorInput,
		group: IEditorGroup
	): void {
		if (!(editor instanceof WebviewInput) || editor.typeId !== WebviewInput.typeId) {
			return;
		}

		if (group.contains(editor)) {
			return;
		}

		let previousGroup: IEditorGroup | undefined;
		const groups = this.editorGroupService.groups;
		for (const group of groups) {
			if (group.contains(editor)) {
				previousGroup = group;
				break;
			}
		}

		if (!previousGroup) {
			return;
		}

		previousGroup.closeEditor(editor);
	}
}

registerWorkbenchContribution2(WebviewPanelContribution.ID, WebviewPanelContribution, WorkbenchPhase.BlockStartup);

Registry.as<IEditorFactoryRegistry>(EditorExtensions.EditorFactory).registerEditorSerializer(
	WebviewEditorInputSerializer.ID,
	WebviewEditorInputSerializer);

registerSingleton(IWebviewWorkbenchService, WebviewEditorService, InstantiationType.Delayed);

registerAction2(ShowWebViewEditorFindWidgetAction);
registerAction2(HideWebViewEditorFindCommand);
registerAction2(WebViewEditorFindNextCommand);
registerAction2(WebViewEditorFindPreviousCommand);
registerAction2(ReloadWebviewAction);

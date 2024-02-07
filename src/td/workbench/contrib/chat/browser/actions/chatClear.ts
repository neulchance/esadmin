/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {ServicesAccessor} from 'td/platform/instantiation/common/instantiation';
import {IChatEditorOptions} from 'td/workbench/contrib/chat/browser/chatEditor';
import {ChatEditorInput} from 'td/workbench/contrib/chat/browser/chatEditorInput';
import {IEditorGroupsService} from 'td/workbench/services/editor/common/editorGroupsService';
import {IEditorService} from 'td/workbench/services/editor/common/editorService';

export async function clearChatEditor(accessor: ServicesAccessor): Promise<void> {
	const editorService = accessor.get(IEditorService);
	const editorGroupsService = accessor.get(IEditorGroupsService);

	const chatEditorInput = editorService.activeEditor;
	if (chatEditorInput instanceof ChatEditorInput && chatEditorInput.providerId) {
		await editorService.replaceEditors([{
			editor: chatEditorInput,
			replacement: {resource: ChatEditorInput.getNewEditorUri(), options: <IChatEditorOptions>{target: {providerId: chatEditorInput.providerId, pinned: true}}}
		}], editorGroupsService.activeGroup);
	}
}

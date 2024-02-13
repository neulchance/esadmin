/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IEditorPaneService} from 'td/workbench/services/editor/common/editorPaneService';
import {EditorPaneDescriptor} from 'td/workbench/browser/editor';
import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';

export class EditorPaneService implements IEditorPaneService {

	declare readonly _serviceBrand: undefined;

	readonly onWillInstantiateEditorPane = EditorPaneDescriptor.onWillInstantiateEditorPane;

	didInstantiateEditorPane(typeId: string): boolean {
		return EditorPaneDescriptor.didInstantiateEditorPane(typeId);
	}
}

registerSingleton(IEditorPaneService, EditorPaneService, InstantiationType.Delayed);

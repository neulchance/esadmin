/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {createDecorator} from 'td/platform/instantiation/common/instantiation';
import {IWillInstantiateEditorPaneEvent} from 'td/workbench/common/editor';
import {Event} from 'td/base/common/event';

export const IEditorPaneService = createDecorator<IEditorPaneService>('editorPaneService');

export interface IEditorPaneService {

	readonly _serviceBrand: undefined;

	/**
	 * Emitted when an editor pane is about to be instantiated.
	 */
	readonly onWillInstantiateEditorPane: Event<IWillInstantiateEditorPaneEvent>;

	/**
	 * Returns whether a editor pane with the given type id has been instantiated.
	 */
	didInstantiateEditorPane(typeId: string): boolean;
}

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IBaseCellEditorOptions} from 'td/workbench/contrib/notebook/browser/notebookBrowser';
import {NotebookEventDispatcher} from 'td/workbench/contrib/notebook/browser/viewModel/eventDispatcher';
import {NotebookOptions} from 'td/workbench/contrib/notebook/browser/notebookOptions';

export class ViewContext {
	constructor(
		readonly notebookOptions: NotebookOptions,
		readonly eventDispatcher: NotebookEventDispatcher,
		readonly getBaseCellEditorOptions: (language: string) => IBaseCellEditorOptions
	) {
	}
}

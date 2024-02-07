/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {DevWindow} from 'td/base/browser/window';
import {IEditorGroup} from 'td/workbench/services/editor/common/editorGroupsService';
import {createDecorator, ServicesAccessor} from 'td/platform/instantiation/common/instantiation';
import {NotebookEditorInput} from 'td/workbench/contrib/notebook/common/notebookEditorInput';
import {INotebookEditor, INotebookEditorCreationOptions} from 'td/workbench/contrib/notebook/browser/notebookBrowser';
import {Event} from 'td/base/common/event';
import {Dimension} from 'td/base/browser/dom';
import {NotebookEditorWidget} from 'td/workbench/contrib/notebook/browser/notebookEditorWidget';
import {URI} from 'td/base/common/uri';

export const INotebookEditorService = createDecorator<INotebookEditorService>('INotebookEditorWidgetService');

export interface IBorrowValue<T> {
	readonly value: T | undefined;
}

export interface INotebookEditorService {
	_serviceBrand: undefined;

	retrieveWidget(accessor: ServicesAccessor, group: IEditorGroup, input: NotebookEditorInput, creationOptions?: INotebookEditorCreationOptions, dimension?: Dimension, DevWindow?: DevWindow): IBorrowValue<INotebookEditor>;

	retrieveExistingWidgetFromURI(resource: URI): IBorrowValue<NotebookEditorWidget> | undefined;
	retrieveAllExistingWidgets(): IBorrowValue<NotebookEditorWidget>[];
	onDidAddNotebookEditor: Event<INotebookEditor>;
	onDidRemoveNotebookEditor: Event<INotebookEditor>;
	addNotebookEditor(editor: INotebookEditor): void;
	removeNotebookEditor(editor: INotebookEditor): void;
	getNotebookEditor(editorId: string): INotebookEditor | undefined;
	listNotebookEditors(): readonly INotebookEditor[];
}

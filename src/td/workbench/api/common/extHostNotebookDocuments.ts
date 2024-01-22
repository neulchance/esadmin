/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter } from 'td/base/common/event';
import { URI, UriComponents } from 'td/base/common/uri';
import * as extHostProtocol from 'td/workbench/api/common/extHost.protocol';
import { ExtHostNotebookController } from 'td/workbench/api/common/extHostNotebook';
import { NotebookDocumentMetadata } from 'td/workbench/contrib/notebook/common/notebookCommon';
import { SerializableObjectWithBuffers } from 'td/workbench/services/extensions/common/proxyIdentifier';
import type * as vscode from 'vscode';

export class ExtHostNotebookDocuments implements extHostProtocol.ExtHostNotebookDocumentsShape {

	private readonly _onDidSaveNotebookDocument = new Emitter<vscode.NotebookDocument>();
	readonly onDidSaveNotebookDocument = this._onDidSaveNotebookDocument.event;

	private readonly _onDidChangeNotebookDocument = new Emitter<vscode.NotebookDocumentChangeEvent>();
	readonly onDidChangeNotebookDocument = this._onDidChangeNotebookDocument.event;

	constructor(
		private readonly _notebooksAndEditors: ExtHostNotebookController,
	) { }

	$acceptModelChanged(uri: UriComponents, event: SerializableObjectWithBuffers<extHostProtocol.NotebookCellsChangedEventDto>, isDirty: boolean, newMetadata?: NotebookDocumentMetadata): void {
		const document = this._notebooksAndEditors.getNotebookDocument(URI.revive(uri));
		const e = document.acceptModelChanged(event.value, isDirty, newMetadata);
		this._onDidChangeNotebookDocument.fire(e);
	}

	$acceptDirtyStateChanged(uri: UriComponents, isDirty: boolean): void {
		const document = this._notebooksAndEditors.getNotebookDocument(URI.revive(uri));
		document.acceptDirty(isDirty);
	}

	$acceptModelSaved(uri: UriComponents): void {
		const document = this._notebooksAndEditors.getNotebookDocument(URI.revive(uri));
		this._onDidSaveNotebookDocument.fire(document.apiNotebook);
	}
}

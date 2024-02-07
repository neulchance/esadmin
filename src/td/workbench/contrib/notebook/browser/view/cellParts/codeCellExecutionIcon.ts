/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as DOM from 'td/base/browser/dom';
import {renderLabelWithIcons} from 'td/base/browser/ui/iconLabel/iconLabels';
import {Disposable} from 'td/base/common/lifecycle';
import {localize} from 'td/nls';
import {ThemeIcon} from 'td/base/common/themables';
import {ICellViewModel, INotebookEditorDelegate} from 'td/workbench/contrib/notebook/browser/notebookBrowser';
import {errorStateIcon, executingStateIcon, pendingStateIcon, successStateIcon} from 'td/workbench/contrib/notebook/browser/notebookIcons';
import {NotebookCellExecutionState, NotebookCellInternalMetadata} from 'td/workbench/contrib/notebook/common/notebookCommon';
import {INotebookCellExecution, INotebookExecutionStateService, NotebookExecutionType} from 'td/workbench/contrib/notebook/common/notebookExecutionStateService';

interface IExecutionItem {
	text: string;
	tooltip?: string;
}

export class CollapsedCodeCellExecutionIcon extends Disposable {
	private _visible = false;

	constructor(
		_notebookEditor: INotebookEditorDelegate,
		private readonly _cell: ICellViewModel,
		private readonly _element: HTMLElement,
		@INotebookExecutionStateService private _executionStateService: INotebookExecutionStateService,
	) {
		super();

		this._update();
		this._register(this._executionStateService.onDidChangeExecution(e => {
			if (e.type === NotebookExecutionType.cell && e.affectsCell(this._cell.uri)) {
				this._update();
			}
		}));
		this._register(this._cell.model.onDidChangeInternalMetadata(() => this._update()));
	}

	setVisibility(visible: boolean): void {
		this._visible = visible;
		this._update();
	}

	private _update() {
		if (!this._visible) {
			return;
		}

		const runState = this._executionStateService.getCellExecution(this._cell.uri);
		const item = this._getItemForState(runState, this._cell.model.internalMetadata);
		if (item) {
			this._element.style.display = '';
			DOM.reset(this._element, ...renderLabelWithIcons(item.text));
			this._element.title = item.tooltip ?? '';
		} else {
			this._element.style.display = 'none';
			DOM.reset(this._element);
		}
	}

	private _getItemForState(runState: INotebookCellExecution | undefined, internalMetadata: NotebookCellInternalMetadata): IExecutionItem | undefined {
		const state = runState?.state;
		const {lastRunSuccess} = internalMetadata;
		if (!state && lastRunSuccess) {
			return <IExecutionItem>{
				text: `$(${successStateIcon.id})`,
				tooltip: localize('notebook.cell.status.success', "Success"),
			};
		} else if (!state && lastRunSuccess === false) {
			return <IExecutionItem>{
				text: `$(${errorStateIcon.id})`,
				tooltip: localize('notebook.cell.status.failure', "Failure"),
			};
		} else if (state === NotebookCellExecutionState.Pending || state === NotebookCellExecutionState.Unconfirmed) {
			return <IExecutionItem>{
				text: `$(${pendingStateIcon.id})`,
				tooltip: localize('notebook.cell.status.pending', "Pending"),
			};
		} else if (state === NotebookCellExecutionState.Executing) {
			const icon = ThemeIcon.modify(executingStateIcon, 'spin');
			return <IExecutionItem>{
				text: `$(${icon.id})`,
				tooltip: localize('notebook.cell.status.executing', "Executing"),
			};
		}

		return;
	}
}

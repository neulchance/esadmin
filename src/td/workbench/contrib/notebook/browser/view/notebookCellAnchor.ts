/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IDisposable} from 'td/base/common/lifecycle';
import {CellFocusMode, ICellViewModel} from 'td/workbench/contrib/notebook/browser/notebookBrowser';
import {CodeCellViewModel} from 'td/workbench/contrib/notebook/browser/viewModel/codeCellViewModel';
import {CellKind, NotebookCellExecutionState, NotebookSetting} from 'td/workbench/contrib/notebook/common/notebookCommon';
import {INotebookExecutionStateService} from 'td/workbench/contrib/notebook/common/notebookExecutionStateService';
import {Event} from 'td/base/common/event';
import {ScrollEvent} from 'td/base/common/scrollable';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {IListView} from 'td/base/browser/ui/list/listView';
import {CellViewModel} from 'td/workbench/contrib/notebook/browser/viewModel/notebookViewModelImpl';


export class NotebookCellAnchor implements IDisposable {

	private stopAnchoring = false;
	private executionWatcher: IDisposable | undefined;
	private scrollWatcher: IDisposable | undefined;

	constructor(
		private readonly notebookExecutionStateService: INotebookExecutionStateService,
		private readonly configurationService: IConfigurationService,
		private readonly scrollEvent: Event<ScrollEvent>) {
	}

	public shouldAnchor(cellListView: IListView<CellViewModel>, focusedIndex: number, heightDelta: number, executingCellUri: ICellViewModel) {
		if (cellListView.element(focusedIndex).focusMode === CellFocusMode.Editor) {
			return true;
		}
		if (this.stopAnchoring) {
			return false;
		}

		const newFocusBottom = cellListView.elementTop(focusedIndex) + cellListView.elementHeight(focusedIndex) + heightDelta;
		const viewBottom = cellListView.renderHeight + cellListView.getScrollTop();
		const focusStillVisible = viewBottom > newFocusBottom;
		const anchorFocusedSetting = this.configurationService.getValue(NotebookSetting.anchorToFocusedCell);
		const allowScrolling = this.configurationService.getValue(NotebookSetting.scrollToRevealCell) !== 'none';
		const growing = heightDelta > 0;
		const autoAnchor = allowScrolling && growing && !focusStillVisible && anchorFocusedSetting !== 'off';

		if (autoAnchor || anchorFocusedSetting === 'on') {
			this.watchAchorDuringExecution(executingCellUri);
			return true;
		}

		return false;
	}

	public watchAchorDuringExecution(executingCell: ICellViewModel) {
		// anchor while the cell is executing unless the user scrolls up.
		if (!this.executionWatcher && executingCell.cellKind === CellKind.Code) {
			const executionState = this.notebookExecutionStateService.getCellExecution(executingCell.uri);
			if (executionState && executionState.state === NotebookCellExecutionState.Executing) {
				this.executionWatcher = (executingCell as CodeCellViewModel).onDidStopExecution(() => {
					this.executionWatcher?.dispose();
					this.executionWatcher = undefined;
					this.scrollWatcher?.dispose();
					this.stopAnchoring = false;
				});
				this.scrollWatcher = this.scrollEvent((scrollEvent) => {
					if (scrollEvent.scrollTop < scrollEvent.oldScrollTop) {
						this.stopAnchoring = true;
						this.scrollWatcher?.dispose();
					}
				});
			}
		}
	}

	dispose(): void {
		this.executionWatcher?.dispose();
		this.scrollWatcher?.dispose();
	}
}

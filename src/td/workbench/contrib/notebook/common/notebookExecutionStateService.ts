/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {Event} from 'td/base/common/event';
import {IDisposable} from 'td/base/common/lifecycle';
import {URI} from 'td/base/common/uri';
import {createDecorator} from 'td/platform/instantiation/common/instantiation';
import {NotebookCellExecutionState, NotebookExecutionState} from 'td/workbench/contrib/notebook/common/notebookCommon';
import {CellExecutionUpdateType, ICellExecuteOutputEdit, ICellExecuteOutputItemEdit} from 'td/workbench/contrib/notebook/common/notebookExecutionService';

export type ICellExecuteUpdate = ICellExecuteOutputEdit | ICellExecuteOutputItemEdit | ICellExecutionStateUpdate;

export interface ICellExecutionStateUpdate {
	editType: CellExecutionUpdateType.ExecutionState;
	executionOrder?: number;
	runStartTime?: number;
	didPause?: boolean;
	isPaused?: boolean;
}

export interface ICellExecutionComplete {
	runEndTime?: number;
	lastRunSuccess?: boolean;
}
export enum NotebookExecutionType {
	cell,
	notebook
}
export interface ICellExecutionStateChangedEvent {
	type: NotebookExecutionType.cell;
	notebook: URI;
	cellHandle: number;
	changed?: INotebookCellExecution; // undefined -> execution was completed
	affectsCell(cell: URI): boolean;
	affectsNotebook(notebook: URI): boolean;
}
export interface IExecutionStateChangedEvent {
	type: NotebookExecutionType.notebook;
	notebook: URI;
	changed?: INotebookExecution; // undefined -> execution was completed
	affectsNotebook(notebook: URI): boolean;
}
export interface INotebookFailStateChangedEvent {
	visible: boolean;
	notebook: URI;
}

export interface IFailedCellInfo {
	cellHandle: number;
	disposable: IDisposable;
	visible: boolean;
}

export const INotebookExecutionStateService = createDecorator<INotebookExecutionStateService>('INotebookExecutionStateService');

export interface INotebookExecutionStateService {
	_serviceBrand: undefined;

	onDidChangeExecution: Event<ICellExecutionStateChangedEvent | IExecutionStateChangedEvent>;
	onDidChangeLastRunFailState: Event<INotebookFailStateChangedEvent>;

	forceCancelNotebookExecutions(notebookUri: URI): void;
	getCellExecutionsForNotebook(notebook: URI): INotebookCellExecution[];
	getCellExecutionsByHandleForNotebook(notebook: URI): Map<number, INotebookCellExecution> | undefined;
	getCellExecution(cellUri: URI): INotebookCellExecution | undefined;
	createCellExecution(notebook: URI, cellHandle: number): INotebookCellExecution;
	getExecution(notebook: URI): INotebookExecution | undefined;
	createExecution(notebook: URI): INotebookExecution;
	getLastFailedCellForNotebook(notebook: URI): number | undefined;
}

export interface INotebookCellExecution {
	readonly notebook: URI;
	readonly cellHandle: number;
	readonly state: NotebookCellExecutionState;
	readonly didPause: boolean;
	readonly isPaused: boolean;

	confirm(): void;
	update(updates: ICellExecuteUpdate[]): void;
	complete(complete: ICellExecutionComplete): void;
}
export interface INotebookExecution {
	readonly notebook: URI;
	readonly state: NotebookExecutionState;

	confirm(): void;
	begin(): void;
	complete(): void;
}

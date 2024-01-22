/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IDisposable} from 'td/base/common/lifecycle';
import {IContextKeyService} from 'td/platform/contextkey/common/contextkey';
import {createDecorator} from 'td/platform/instantiation/common/instantiation';
import {NotebookCellTextModel} from 'td/workbench/contrib/notebook/common/model/notebookCellTextModel';
import {INotebookTextModel, IOutputDto, IOutputItemDto} from 'td/workbench/contrib/notebook/common/notebookCommon';
import {INotebookCellExecution} from 'td/workbench/contrib/notebook/common/notebookExecutionStateService';

export enum CellExecutionUpdateType {
	Output = 1,
	OutputItems = 2,
	ExecutionState = 3,
}

export interface ICellExecuteOutputEdit {
	editType: CellExecutionUpdateType.Output;
	cellHandle: number;
	append?: boolean;
	outputs: IOutputDto[];
}

export interface ICellExecuteOutputItemEdit {
	editType: CellExecutionUpdateType.OutputItems;
	append?: boolean;
	outputId: string;
	items: IOutputItemDto[];
}

export const INotebookExecutionService = createDecorator<INotebookExecutionService>('INotebookExecutionService');

export interface INotebookExecutionService {
	_serviceBrand: undefined;

	executeNotebookCells(notebook: INotebookTextModel, cells: Iterable<NotebookCellTextModel>, contextKeyService: IContextKeyService): Promise<void>;
	cancelNotebookCells(notebook: INotebookTextModel, cells: Iterable<NotebookCellTextModel>): Promise<void>;
	cancelNotebookCellHandles(notebook: INotebookTextModel, cells: Iterable<number>): Promise<void>;
	registerExecutionParticipant(participant: ICellExecutionParticipant): IDisposable;
}

export interface ICellExecutionParticipant {
	onWillExecuteCell(executions: INotebookCellExecution[]): Promise<void>;
}

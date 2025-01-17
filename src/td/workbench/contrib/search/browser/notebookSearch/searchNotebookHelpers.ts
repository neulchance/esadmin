/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {FindMatch} from 'td/editor/common/model';
import {IFileMatch, ITextSearchMatch, TextSearchMatch} from 'td/workbench/services/search/common/search';
import {Range} from 'td/editor/common/core/range';
import {INotebookCellMatchNoModel, INotebookFileMatchNoModel, genericCellMatchesToTextSearchMatches, rawCellPrefix} from 'td/workbench/contrib/search/common/searchNotebookHelpers';
import {CellWebviewFindMatch, ICellViewModel} from 'td/workbench/contrib/notebook/browser/notebookBrowser';
import {URI} from 'td/base/common/uri';

export type INotebookCellMatch = INotebookCellMatchWithModel | INotebookCellMatchNoModel;
export type INotebookFileMatch = INotebookFileMatchWithModel | INotebookFileMatchNoModel;

export function getIDFromINotebookCellMatch(match: INotebookCellMatch): string {
	if (isINotebookCellMatchWithModel(match)) {
		return match.cell.id;
	} else {
		return `${rawCellPrefix}${match.index}`;
	}
}
export interface INotebookFileMatchWithModel extends IFileMatch {
	cellResults: INotebookCellMatchWithModel[];
}

export interface INotebookCellMatchWithModel extends INotebookCellMatchNoModel<URI> {
	cell: ICellViewModel;
}

export function isINotebookFileMatchWithModel(object: any): object is INotebookFileMatchWithModel {
	return 'cellResults' in object && object.cellResults instanceof Array && object.cellResults.every(isINotebookCellMatchWithModel);
}

export function isINotebookCellMatchWithModel(object: any): object is INotebookCellMatchWithModel {
	return 'cell' in object;
}

export function contentMatchesToTextSearchMatches(contentMatches: FindMatch[], cell: ICellViewModel): ITextSearchMatch[] {
	return genericCellMatchesToTextSearchMatches(
		contentMatches,
		cell.textBuffer
	);
}

export function webviewMatchesToTextSearchMatches(webviewMatches: CellWebviewFindMatch[]): ITextSearchMatch[] {
	return webviewMatches
		.map(rawMatch =>
			(rawMatch.searchPreviewInfo) ?
				new TextSearchMatch(
					rawMatch.searchPreviewInfo.line,
					new Range(0, rawMatch.searchPreviewInfo.range.start, 0, rawMatch.searchPreviewInfo.range.end),
					undefined,
					rawMatch.index) : undefined
		).filter((e): e is ITextSearchMatch => !!e);
}

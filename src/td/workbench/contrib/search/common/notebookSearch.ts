/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {createDecorator} from 'td/platform/instantiation/common/instantiation';
import {CancellationToken} from 'td/base/common/cancellation';
import {ResourceSet} from 'td/base/common/map';
import {ITextQuery, ISearchProgressItem, ISearchComplete} from 'td/workbench/services/search/common/search';

export const INotebookSearchService = createDecorator<INotebookSearchService>('notebookSearchService');

export interface INotebookSearchService {

	readonly _serviceBrand: undefined;

	notebookSearch(query: ITextQuery, token: CancellationToken | undefined, searchInstanceID: string, onProgress?: (result: ISearchProgressItem) => void): {
		openFilesToScan: ResourceSet;
		completeData: Promise<ISearchComplete>;
		allScannedFiles: Promise<ResourceSet>;
	};
}

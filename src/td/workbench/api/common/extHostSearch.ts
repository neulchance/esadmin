/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IDisposable, toDisposable} from 'td/base/common/lifecycle';
import type * as vscode from 'vscode';
import {ExtHostSearchShape, MainThreadSearchShape, MainContext} from '../common/extHost.protocol';
import {createDecorator} from 'td/platform/instantiation/common/instantiation';
import {FileSearchManager} from 'td/workbench/services/search/common/fileSearchManager';
import {IExtHostRpcService} from 'td/workbench/api/common/extHostRpcService';
import {IURITransformerService} from 'td/workbench/api/common/extHostUriTransformerService';
import {ILogService} from 'td/platform/log/common/log';
import {IRawFileQuery, ISearchCompleteStats, IFileQuery, IRawTextQuery, IRawQuery, ITextQuery, IFolderQuery} from 'td/workbench/services/search/common/search';
import {URI, UriComponents} from 'td/base/common/uri';
import {TextSearchManager} from 'td/workbench/services/search/common/textSearchManager';
import {CancellationToken} from 'td/base/common/cancellation';

export interface IExtHostSearch extends ExtHostSearchShape {
	registerTextSearchProvider(scheme: string, provider: vscode.TextSearchProvider): IDisposable;
	registerFileSearchProvider(scheme: string, provider: vscode.FileSearchProvider): IDisposable;
	doInternalFileSearchWithCustomCallback(query: IFileQuery, token: CancellationToken, handleFileMatch: (data: URI[]) => void): Promise<ISearchCompleteStats>;
}

export const IExtHostSearch = createDecorator<IExtHostSearch>('IExtHostSearch');

export class ExtHostSearch implements ExtHostSearchShape {

	protected readonly _proxy: MainThreadSearchShape = this.extHostRpc.getProxy(MainContext.MainThreadSearch);
	protected _handlePool: number = 0;

	private readonly _textSearchProvider = new Map<number, vscode.TextSearchProvider>();
	private readonly _textSearchUsedSchemes = new Set<string>();
	private readonly _fileSearchProvider = new Map<number, vscode.FileSearchProvider>();
	private readonly _fileSearchUsedSchemes = new Set<string>();

	private readonly _fileSearchManager = new FileSearchManager();

	constructor(
		@IExtHostRpcService private extHostRpc: IExtHostRpcService,
		@IURITransformerService protected _uriTransformer: IURITransformerService,
		@ILogService protected _logService: ILogService
	) { }

	protected _transformScheme(scheme: string): string {
		return this._uriTransformer.transformOutgoingScheme(scheme);
	}

	registerTextSearchProvider(scheme: string, provider: vscode.TextSearchProvider): IDisposable {
		if (this._textSearchUsedSchemes.has(scheme)) {
			throw new Error(`a text search provider for the scheme '${scheme}' is already registered`);
		}

		this._textSearchUsedSchemes.add(scheme);
		const handle = this._handlePool++;
		this._textSearchProvider.set(handle, provider);
		this._proxy.$registerTextSearchProvider(handle, this._transformScheme(scheme));
		return toDisposable(() => {
			this._textSearchUsedSchemes.delete(scheme);
			this._textSearchProvider.delete(handle);
			this._proxy.$unregisterProvider(handle);
		});
	}

	registerFileSearchProvider(scheme: string, provider: vscode.FileSearchProvider): IDisposable {
		if (this._fileSearchUsedSchemes.has(scheme)) {
			throw new Error(`a file search provider for the scheme '${scheme}' is already registered`);
		}

		this._fileSearchUsedSchemes.add(scheme);
		const handle = this._handlePool++;
		this._fileSearchProvider.set(handle, provider);
		this._proxy.$registerFileSearchProvider(handle, this._transformScheme(scheme));
		return toDisposable(() => {
			this._fileSearchUsedSchemes.delete(scheme);
			this._fileSearchProvider.delete(handle);
			this._proxy.$unregisterProvider(handle);
		});
	}

	$provideFileSearchResults(handle: number, session: number, rawQuery: IRawFileQuery, token: vscode.CancellationToken): Promise<ISearchCompleteStats> {
		const query = reviveQuery(rawQuery);
		const provider = this._fileSearchProvider.get(handle);
		if (provider) {
			return this._fileSearchManager.fileSearch(query, provider, batch => {
				this._proxy.$handleFileMatch(handle, session, batch.map(p => p.resource));
			}, token);
		} else {
			throw new Error('unknown provider: ' + handle);
		}
	}

	async doInternalFileSearchWithCustomCallback(query: IFileQuery, token: CancellationToken, handleFileMatch: (data: URI[]) => void): Promise<ISearchCompleteStats> {
		return {messages: []};
	}

	$clearCache(cacheKey: string): Promise<void> {
		this._fileSearchManager.clearCache(cacheKey);

		return Promise.resolve(undefined);
	}

	$provideTextSearchResults(handle: number, session: number, rawQuery: IRawTextQuery, token: vscode.CancellationToken): Promise<ISearchCompleteStats> {
		const provider = this._textSearchProvider.get(handle);
		if (!provider || !provider.provideTextSearchResults) {
			throw new Error(`Unknown provider ${handle}`);
		}

		const query = reviveQuery(rawQuery);
		const engine = this.createTextSearchManager(query, provider);
		return engine.search(progress => this._proxy.$handleTextMatch(handle, session, progress), token);
	}

	$enableExtensionHostSearch(): void { }

	protected createTextSearchManager(query: ITextQuery, provider: vscode.TextSearchProvider): TextSearchManager {
		return new TextSearchManager(query, provider, {
			readdir: resource => Promise.resolve([]), // TODO@rob implement
			toCanonicalName: encoding => encoding
		}, 'textSearchProvider');
	}
}

export function reviveQuery<U extends IRawQuery>(rawQuery: U): U extends IRawTextQuery ? ITextQuery : IFileQuery {
	return {
		...<any>rawQuery, // TODO@rob ???
		...{
			folderQueries: rawQuery.folderQueries && rawQuery.folderQueries.map(reviveFolderQuery),
			extraFileResources: rawQuery.extraFileResources && rawQuery.extraFileResources.map(components => URI.revive(components))
		}
	};
}

function reviveFolderQuery(rawFolderQuery: IFolderQuery<UriComponents>): IFolderQuery<URI> {
	return {
		...rawFolderQuery,
		folder: URI.revive(rawFolderQuery.folder)
	};
}

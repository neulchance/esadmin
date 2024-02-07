/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {onUnexpectedError} from 'td/base/common/errors';
import {dispose, DisposableMap} from 'td/base/common/lifecycle';
import {URI, UriComponents} from 'td/base/common/uri';
import {EditOperation} from 'td/editor/common/core/editOperation';
import {Range} from 'td/editor/common/core/range';
import {ITextModel} from 'td/editor/common/model';
import {IEditorWorkerService} from 'td/editor/common/services/editorWorker';
import {IModelService} from 'td/editor/common/services/model';
import {ILanguageService} from 'td/editor/common/languages/language';
import {ITextModelService} from 'td/editor/common/services/resolverService';
import {extHostNamedCustomer, IExtHostContext} from 'td/workbench/services/extensions/common/extHostCustomers';
import {ExtHostContext, ExtHostDocumentContentProvidersShape, MainContext, MainThreadDocumentContentProvidersShape} from '../common/extHost.protocol';
import {CancellationTokenSource} from 'td/base/common/cancellation';

@extHostNamedCustomer(MainContext.MainThreadDocumentContentProviders)
export class MainThreadDocumentContentProviders implements MainThreadDocumentContentProvidersShape {

	private readonly _resourceContentProvider = new DisposableMap<number>();
	private readonly _pendingUpdate = new Map<string, CancellationTokenSource>();
	private readonly _proxy: ExtHostDocumentContentProvidersShape;

	constructor(
		extHostContext: IExtHostContext,
		@ITextModelService private readonly _textModelResolverService: ITextModelService,
		@ILanguageService private readonly _languageService: ILanguageService,
		@IModelService private readonly _modelService: IModelService,
		@IEditorWorkerService private readonly _editorWorkerService: IEditorWorkerService
	) {
		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostDocumentContentProviders);
	}

	dispose(): void {
		this._resourceContentProvider.dispose();
		dispose(this._pendingUpdate.values());
	}

	$registerTextContentProvider(handle: number, scheme: string): void {
		const registration = this._textModelResolverService.registerTextModelContentProvider(scheme, {
			provideTextContent: (uri: URI): Promise<ITextModel | null> => {
				return this._proxy.$provideTextDocumentContent(handle, uri).then(value => {
					if (typeof value === 'string') {
						const firstLineText = value.substr(0, 1 + value.search(/\r?\n/));
						const languageSelection = this._languageService.createByFilepathOrFirstLine(uri, firstLineText);
						return this._modelService.createModel(value, languageSelection, uri);
					}
					return null;
				});
			}
		});
		this._resourceContentProvider.set(handle, registration);
	}

	$unregisterTextContentProvider(handle: number): void {
		this._resourceContentProvider.deleteAndDispose(handle);
	}

	async $onVirtualDocumentChange(uri: UriComponents, value: string): Promise<void> {
		const model = this._modelService.getModel(URI.revive(uri));
		if (!model) {
			return;
		}

		// cancel and dispose an existing update
		const pending = this._pendingUpdate.get(model.id);
		pending?.cancel();

		// create and keep update token
		const myToken = new CancellationTokenSource();
		this._pendingUpdate.set(model.id, myToken);

		try {
			const edits = await this._editorWorkerService.computeMoreMinimalEdits(model.uri, [{text: value, range: model.getFullModelRange()}]);

			// remove token
			this._pendingUpdate.delete(model.id);

			if (myToken.token.isCancellationRequested) {
				// ignore this
				return;
			}
			if (edits && edits.length > 0) {
				// use the evil-edit as these models show in readonly-editor only
				model.applyEdits(edits.map(edit => EditOperation.replace(Range.lift(edit.range), edit.text)));
			}
		} catch (error) {
			onUnexpectedError(error);
		}
	}
}

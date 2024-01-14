/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {reverseOrder, compareBy, numberComparator} from 'td/base/common/arrays';
import {observableValue, observableSignalFromEvent, autorunWithStore, IReader} from 'td/base/common/observable';
import {HideUnchangedRegionsFeature, IDiffEditorBreadcrumbsSource} from 'td/editor/browser/widget/diffEditor/features/hideUnchangedRegionsFeature';
import {DisposableCancellationTokenSource} from 'td/editor/browser/widget/diffEditor/utils';
import {LineRange} from 'td/editor/common/core/lineRange';
import {ITextModel} from 'td/editor/common/model';
import {ILanguageFeaturesService} from 'td/editor/common/services/languageFeatures';
import {IOutlineModelService, OutlineModel} from 'td/editor/contrib/documentSymbols/browser/outlineModel';
import {Disposable} from 'td/base/common/lifecycle';
import {Event} from 'td/base/common/event';
import {SymbolKind} from 'td/editor/common/languages';

class DiffEditorBreadcrumbsSource extends Disposable implements IDiffEditorBreadcrumbsSource {
	private readonly _currentModel = observableValue<OutlineModel | undefined>(this, undefined);

	constructor(
		private readonly _textModel: ITextModel,
		@ILanguageFeaturesService private readonly _languageFeaturesService: ILanguageFeaturesService,
		@IOutlineModelService private readonly _outlineModelService: IOutlineModelService,
	) {
		super();

		const documentSymbolProviderChanged = observableSignalFromEvent(
			'documentSymbolProvider.onDidChange',
			this._languageFeaturesService.documentSymbolProvider.onDidChange
		);

		const textModelChanged = observableSignalFromEvent(
			'_textModel.onDidChangeContent',
			Event.debounce<any>(e => this._textModel.onDidChangeContent(e), () => undefined, 100)
		);

		this._register(autorunWithStore(async (reader, store) => {
			documentSymbolProviderChanged.read(reader);
			textModelChanged.read(reader);

			const src = store.add(new DisposableCancellationTokenSource());
			const model = await this._outlineModelService.getOrCreate(this._textModel, src.token);
			if (store.isDisposed) { return; }

			this._currentModel.set(model, undefined);
		}));
	}

	public getBreadcrumbItems(startRange: LineRange, reader: IReader): { name: string; kind: SymbolKind; startLineNumber: number }[] {
		const m = this._currentModel.read(reader);
		if (!m) { return []; }
		const symbols = m.asListOfDocumentSymbols()
			.filter(s => startRange.contains(s.range.startLineNumber) && !startRange.contains(s.range.endLineNumber));
		symbols.sort(reverseOrder(compareBy(s => s.range.endLineNumber - s.range.startLineNumber, numberComparator)));
		return symbols.map(s => ({name: s.name, kind: s.kind, startLineNumber: s.range.startLineNumber}));
	}
}

HideUnchangedRegionsFeature.setBreadcrumbsSourceFactory((textModel, instantiationService) => {
	return instantiationService.createInstance(DiffEditorBreadcrumbsSource, textModel);
});

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {USUAL_WORD_SEPARATORS} from 'td/editor/common/core/wordHelper';
import {ILanguageFeaturesService} from 'td/editor/common/services/languageFeatures';
import {DocumentHighlight, DocumentHighlightKind, MultiDocumentHighlightProvider, ProviderResult} from 'td/editor/common/languages';
import {ITextModel} from 'td/editor/common/model';
import {Position} from 'td/editor/common/core/position';
import {CancellationToken} from 'td/base/common/cancellation';
import {Disposable} from 'td/base/common/lifecycle';
import {ResourceMap} from 'td/base/common/map';
import {LanguageFilter} from 'td/editor/common/languageSelector';


class TextualDocumentHighlightProvider implements MultiDocumentHighlightProvider {

	selector: LanguageFilter = {language: '*'};

	provideMultiDocumentHighlights(primaryModel: ITextModel, position: Position, otherModels: ITextModel[], token: CancellationToken): ProviderResult<ResourceMap<DocumentHighlight[]>> {

		const result = new ResourceMap<DocumentHighlight[]>();

		const word = primaryModel.getWordAtPosition({
			lineNumber: position.lineNumber,
			column: position.column
		});
		if (!word) {
			return Promise.resolve(result);
		}


		for (const model of [primaryModel, ...otherModels]) {
			if (model.isDisposed()) {
				continue;
			}

			const matches = model.findMatches(word.word, true, false, true, USUAL_WORD_SEPARATORS, false);
			const highlights = matches.map(m => ({
				range: m.range,
				kind: DocumentHighlightKind.Text
			}));

			if (highlights) {
				result.set(model.uri, highlights);
			}
		}

		return result;
	}

}

export class TextualMultiDocumentHighlightFeature extends Disposable {
	constructor(
		@ILanguageFeaturesService languageFeaturesService: ILanguageFeaturesService,
	) {
		super();

		this._register(languageFeaturesService.multiDocumentHighlightProvider.register('*', new TextualDocumentHighlightProvider()));
	}
}

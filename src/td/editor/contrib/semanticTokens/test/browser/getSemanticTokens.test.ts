/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import {CancellationToken} from 'td/base/common/cancellation';
import {canceled} from 'td/base/common/errors';
import {DisposableStore} from 'td/base/common/lifecycle';
import {ensureNoDisposablesAreLeakedInTestSuite} from 'td/base/test/common/utils';
import {LanguageFeatureRegistry} from 'td/editor/common/languageFeatureRegistry';
import {DocumentSemanticTokensProvider, ProviderResult, SemanticTokens, SemanticTokensEdits, SemanticTokensLegend} from 'td/editor/common/languages';
import {ITextModel} from 'td/editor/common/model';
import {getDocumentSemanticTokens} from 'td/editor/contrib/semanticTokens/common/getSemanticTokens';
import {createTextModel} from 'td/editor/test/common/testTextModel';

suite('getSemanticTokens', () => {

	ensureNoDisposablesAreLeakedInTestSuite();

	test('issue #136540: semantic highlighting flickers', async () => {
		const disposables = new DisposableStore();
		const registry = new LanguageFeatureRegistry<DocumentSemanticTokensProvider>();
		const provider = new class implements DocumentSemanticTokensProvider {
			getLegend(): SemanticTokensLegend {
				return {tokenTypes: ['test'], tokenModifiers: []};
			}
			provideDocumentSemanticTokens(model: ITextModel, lastResultId: string | null, token: CancellationToken): ProviderResult<SemanticTokens | SemanticTokensEdits> {
				throw canceled();
			}
			releaseDocumentSemanticTokens(resultId: string | undefined): void {
			}
		};

		disposables.add(registry.register('testLang', provider));

		const textModel = disposables.add(createTextModel('example', 'testLang'));

		await getDocumentSemanticTokens(registry, textModel, null, null, CancellationToken.None).then((res) => {
			assert.fail();
		}, (err) => {
			assert.ok(!!err);
		});

		disposables.dispose();
	});

});

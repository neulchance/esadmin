/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from 'td/base/common/cancellation';
import { toDisposable } from 'td/base/common/lifecycle';
import { IDocumentDiff, IDocumentDiffProvider, IDocumentDiffProviderOptions } from 'td/editor/common/diff/documentDiffProvider';
import { linesDiffComputers } from 'td/editor/common/diff/linesDiffComputers';
import { ITextModel } from 'td/editor/common/model';
import { Event } from 'td/base/common/event';
import { IDiffProviderFactoryService } from 'td/editor/browser/widget/diffEditor/diffProviderFactoryService';

export class TestDiffProviderFactoryService implements IDiffProviderFactoryService {
	declare readonly _serviceBrand: undefined;
	createDiffProvider(): IDocumentDiffProvider {
		return new SyncDocumentDiffProvider();
	}
}

export class SyncDocumentDiffProvider implements IDocumentDiffProvider {
	computeDiff(original: ITextModel, modified: ITextModel, options: IDocumentDiffProviderOptions, cancellationToken: CancellationToken): Promise<IDocumentDiff> {
		const result = linesDiffComputers.getDefault().computeDiff(original.getLinesContent(), modified.getLinesContent(), options);
		return Promise.resolve({
			changes: result.changes,
			quitEarly: result.hitTimeout,
			identical: original.getValue() === modified.getValue(),
			moves: result.moves,
		});
	}

	onDidChange: Event<void> = () => toDisposable(() => { });
}

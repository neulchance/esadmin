/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {AsyncIterableObject} from 'td/base/common/async';
import {CancellationToken} from 'td/base/common/cancellation';
import {onUnexpectedExternalError} from 'td/base/common/errors';
import {registerModelAndPositionCommand} from 'td/editor/browser/editorExtensions';
import {Position} from 'td/editor/common/core/position';
import {ITextModel} from 'td/editor/common/model';
import {Hover, HoverProvider} from 'td/editor/common/languages';
import {LanguageFeatureRegistry} from 'td/editor/common/languageFeatureRegistry';
import {ILanguageFeaturesService} from 'td/editor/common/services/languageFeatures';

export class HoverProviderResult {
	constructor(
		public readonly provider: HoverProvider,
		public readonly hover: Hover,
		public readonly ordinal: number
	) { }
}

async function executeProvider(provider: HoverProvider, ordinal: number, model: ITextModel, position: Position, token: CancellationToken): Promise<HoverProviderResult | undefined> {
	try {
		const result = await Promise.resolve(provider.provideHover(model, position, token));
		if (result && isValid(result)) {
			return new HoverProviderResult(provider, result, ordinal);
		}
	} catch (err) {
		onUnexpectedExternalError(err);
	}
	return undefined;
}

export function getHover(registry: LanguageFeatureRegistry<HoverProvider>, model: ITextModel, position: Position, token: CancellationToken): AsyncIterableObject<HoverProviderResult> {
	const providers = registry.ordered(model);
	const promises = providers.map((provider, index) => executeProvider(provider, index, model, position, token));
	return AsyncIterableObject.fromPromises(promises).coalesce();
}

export function getHoverPromise(registry: LanguageFeatureRegistry<HoverProvider>, model: ITextModel, position: Position, token: CancellationToken): Promise<Hover[]> {
	return getHover(registry, model, position, token).map(item => item.hover).toPromise();
}

registerModelAndPositionCommand('_executeHoverProvider', (accessor, model, position) => {
	const languageFeaturesService = accessor.get(ILanguageFeaturesService);
	return getHoverPromise(languageFeaturesService.hoverProvider, model, position, CancellationToken.None);
});

function isValid(result: Hover) {
	const hasRange = (typeof result.range !== 'undefined');
	const hasHtmlContent = typeof result.contents !== 'undefined' && result.contents && result.contents.length > 0;
	return hasRange && hasHtmlContent;
}

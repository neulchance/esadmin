/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {URI} from 'td/base/common/uri';
import {createDecorator} from 'td/platform/instantiation/common/instantiation';
import {IDisposable} from 'td/base/common/lifecycle';
import {LanguageSelector} from 'td/editor/common/languageSelector';
import {Event} from 'td/base/common/event';

export const IQuickDiffService = createDecorator<IQuickDiffService>('quickDiff');

export interface QuickDiffProvider {
	label: string;
	rootUri: URI | undefined;
	selector?: LanguageSelector;
	isSCM: boolean;
	getOriginalResource(uri: URI): Promise<URI | null>;
}

export interface QuickDiff {
	label: string;
	originalResource: URI;
	isSCM: boolean;
}

export interface IQuickDiffService {
	readonly _serviceBrand: undefined;

	readonly onDidChangeQuickDiffProviders: Event<void>;
	addQuickDiffProvider(quickDiff: QuickDiffProvider): IDisposable;
	getQuickDiffs(uri: URI, language?: string, isSynchronized?: boolean): Promise<QuickDiff[]>;
}

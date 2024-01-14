/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {Event} from 'td/base/common/event';
import {URI} from 'td/base/common/uri';
import {ITextBufferFactory, ITextModel, ITextModelCreationOptions} from 'td/editor/common/model';
import {ILanguageSelection} from 'td/editor/common/languages/language';
import {createDecorator} from 'td/platform/instantiation/common/instantiation';
import {DocumentSemanticTokensProvider, DocumentRangeSemanticTokensProvider} from 'td/editor/common/languages';

export const IModelService = createDecorator<IModelService>('modelService');

export type DocumentTokensProvider = DocumentSemanticTokensProvider | DocumentRangeSemanticTokensProvider;

export interface IModelService {
	readonly _serviceBrand: undefined;

	createModel(value: string | ITextBufferFactory, languageSelection: ILanguageSelection | null, resource?: URI, isForSimpleWidget?: boolean): ITextModel;

	updateModel(model: ITextModel, value: string | ITextBufferFactory): void;

	destroyModel(resource: URI): void;

	getModels(): ITextModel[];

	getCreationOptions(language: string, resource: URI, isForSimpleWidget: boolean): ITextModelCreationOptions;

	getModel(resource: URI): ITextModel | null;

	onModelAdded: Event<ITextModel>;

	onModelRemoved: Event<ITextModel>;

	onModelLanguageChanged: Event<{ model: ITextModel; oldLanguageId: string }>;
}

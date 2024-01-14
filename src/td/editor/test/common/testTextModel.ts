/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposableStore, IDisposable } from 'td/base/common/lifecycle';
import { URI } from 'td/base/common/uri';
import { BracketPairColorizationOptions, DefaultEndOfLine, ITextBufferFactory, ITextModelCreationOptions } from 'td/editor/common/model';
import { TextModel } from 'td/editor/common/model/textModel';
import { ILanguageConfigurationService } from 'td/editor/common/languages/languageConfigurationRegistry';
import { ILanguageService } from 'td/editor/common/languages/language';
import { LanguageService } from 'td/editor/common/services/languageService';
import { ITextResourcePropertiesService } from 'td/editor/common/services/textResourceConfiguration';
import { TestLanguageConfigurationService } from 'td/editor/test/common/modes/testLanguageConfigurationService';
import { IConfigurationService } from 'td/platform/configuration/common/configuration';
import { TestConfigurationService } from 'td/platform/configuration/test/common/testConfigurationService';
import { IDialogService } from 'td/platform/dialogs/common/dialogs';
import { TestDialogService } from 'td/platform/dialogs/test/common/testDialogService';
import { IInstantiationService } from 'td/platform/instantiation/common/instantiation';
import { ILogService, NullLogService } from 'td/platform/log/common/log';
import { INotificationService } from 'td/platform/notification/common/notification';
import { TestNotificationService } from 'td/platform/notification/test/common/testNotificationService';
import { IThemeService } from 'td/platform/theme/common/themeService';
import { TestThemeService } from 'td/platform/theme/test/common/testThemeService';
import { IUndoRedoService } from 'td/platform/undoRedo/common/undoRedo';
import { UndoRedoService } from 'td/platform/undoRedo/common/undoRedoService';
import { TestTextResourcePropertiesService } from 'td/editor/test/common/services/testTextResourcePropertiesService';
import { IModelService } from 'td/editor/common/services/model';
import { ModelService } from 'td/editor/common/services/modelService';
import { createServices, ServiceIdCtorPair, TestInstantiationService } from 'td/platform/instantiation/test/common/instantiationServiceMock';
import { PLAINTEXT_LANGUAGE_ID } from 'td/editor/common/languages/modesRegistry';
import { ILanguageFeatureDebounceService, LanguageFeatureDebounceService } from 'td/editor/common/services/languageFeatureDebounce';
import { ILanguageFeaturesService } from 'td/editor/common/services/languageFeatures';
import { LanguageFeaturesService } from 'td/editor/common/services/languageFeaturesService';
import { IEnvironmentService } from 'td/platform/environment/common/environment';
import { mock } from 'td/base/test/common/mock';

class TestTextModel extends TextModel {
	public registerDisposable(disposable: IDisposable): void {
		this._register(disposable);
	}
}

export function withEditorModel(text: string[], callback: (model: TextModel) => void): void {
	const model = createTextModel(text.join('\n'));
	callback(model);
	model.dispose();
}

export interface IRelaxedTextModelCreationOptions {
	tabSize?: number;
	indentSize?: number | 'tabSize';
	insertSpaces?: boolean;
	detectIndentation?: boolean;
	trimAutoWhitespace?: boolean;
	defaultEOL?: DefaultEndOfLine;
	isForSimpleWidget?: boolean;
	largeFileOptimizations?: boolean;
	bracketColorizationOptions?: BracketPairColorizationOptions;
}

function resolveOptions(_options: IRelaxedTextModelCreationOptions): ITextModelCreationOptions {
	const defaultOptions = TextModel.DEFAULT_CREATION_OPTIONS;
	return {
		tabSize: (typeof _options.tabSize === 'undefined' ? defaultOptions.tabSize : _options.tabSize),
		indentSize: (typeof _options.indentSize === 'undefined' ? defaultOptions.indentSize : _options.indentSize),
		insertSpaces: (typeof _options.insertSpaces === 'undefined' ? defaultOptions.insertSpaces : _options.insertSpaces),
		detectIndentation: (typeof _options.detectIndentation === 'undefined' ? defaultOptions.detectIndentation : _options.detectIndentation),
		trimAutoWhitespace: (typeof _options.trimAutoWhitespace === 'undefined' ? defaultOptions.trimAutoWhitespace : _options.trimAutoWhitespace),
		defaultEOL: (typeof _options.defaultEOL === 'undefined' ? defaultOptions.defaultEOL : _options.defaultEOL),
		isForSimpleWidget: (typeof _options.isForSimpleWidget === 'undefined' ? defaultOptions.isForSimpleWidget : _options.isForSimpleWidget),
		largeFileOptimizations: (typeof _options.largeFileOptimizations === 'undefined' ? defaultOptions.largeFileOptimizations : _options.largeFileOptimizations),
		bracketPairColorizationOptions: (typeof _options.bracketColorizationOptions === 'undefined' ? defaultOptions.bracketPairColorizationOptions : _options.bracketColorizationOptions),
	};
}

export function createTextModel(text: string | ITextBufferFactory, languageId: string | null = null, options: IRelaxedTextModelCreationOptions = TextModel.DEFAULT_CREATION_OPTIONS, uri: URI | null = null): TextModel {
	const disposables = new DisposableStore();
	const instantiationService = createModelServices(disposables);
	const model = instantiateTextModel(instantiationService, text, languageId, options, uri);
	model.registerDisposable(disposables);
	return model;
}

export function instantiateTextModel(instantiationService: IInstantiationService, text: string | ITextBufferFactory, languageId: string | null = null, _options: IRelaxedTextModelCreationOptions = TextModel.DEFAULT_CREATION_OPTIONS, uri: URI | null = null): TestTextModel {
	const options = resolveOptions(_options);
	return instantiationService.createInstance(TestTextModel, text, languageId || PLAINTEXT_LANGUAGE_ID, options, uri);
}

export function createModelServices(disposables: DisposableStore, services: ServiceIdCtorPair<any>[] = []): TestInstantiationService {
	return createServices(disposables, services.concat([
		[INotificationService, TestNotificationService],
		[IDialogService, TestDialogService],
		[IUndoRedoService, UndoRedoService],
		[ILanguageService, LanguageService],
		[ILanguageConfigurationService, TestLanguageConfigurationService],
		[IConfigurationService, TestConfigurationService],
		[ITextResourcePropertiesService, TestTextResourcePropertiesService],
		[IThemeService, TestThemeService],
		[ILogService, NullLogService],
		[IEnvironmentService, new class extends mock<IEnvironmentService>() {
			override isBuilt: boolean = true;
			override isExtensionDevelopment: boolean = false;
		}],
		[ILanguageFeatureDebounceService, LanguageFeatureDebounceService],
		[ILanguageFeaturesService, LanguageFeaturesService],
		[IModelService, ModelService],
	]));
}

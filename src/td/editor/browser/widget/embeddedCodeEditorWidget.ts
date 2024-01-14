/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as objects from 'td/base/common/objects';
import { ICodeEditor, IDiffEditorConstructionOptions } from 'td/editor/browser/editorBrowser';
import { ICodeEditorService } from 'td/editor/browser/services/codeEditorService';
import { CodeEditorWidget, ICodeEditorWidgetOptions } from 'td/editor/browser/widget/codeEditorWidget';
import { DiffEditorWidget, IDiffCodeEditorWidgetOptions } from 'td/editor/browser/widget/diffEditor/diffEditorWidget';
import { ConfigurationChangedEvent, IDiffEditorOptions, IEditorOptions } from 'td/editor/common/config/editorOptions';
import { ILanguageConfigurationService } from 'td/editor/common/languages/languageConfigurationRegistry';
import { ILanguageFeaturesService } from 'td/editor/common/services/languageFeatures';
import { IAccessibilityService } from 'td/platform/accessibility/common/accessibility';
import { IAudioCueService } from 'td/platform/audioCues/browser/audioCueService';
import { ICommandService } from 'td/platform/commands/common/commands';
import { IContextKeyService } from 'td/platform/contextkey/common/contextkey';
import { IInstantiationService } from 'td/platform/instantiation/common/instantiation';
import { INotificationService } from 'td/platform/notification/common/notification';
import { IEditorProgressService } from 'td/platform/progress/common/progress';
import { IThemeService } from 'td/platform/theme/common/themeService';

export class EmbeddedCodeEditorWidget extends CodeEditorWidget {

	private readonly _parentEditor: ICodeEditor;
	private readonly _overwriteOptions: IEditorOptions;

	constructor(
		domElement: HTMLElement,
		options: IEditorOptions,
		codeEditorWidgetOptions: ICodeEditorWidgetOptions,
		parentEditor: ICodeEditor,
		@IInstantiationService instantiationService: IInstantiationService,
		@ICodeEditorService codeEditorService: ICodeEditorService,
		@ICommandService commandService: ICommandService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IThemeService themeService: IThemeService,
		@INotificationService notificationService: INotificationService,
		@IAccessibilityService accessibilityService: IAccessibilityService,
		@ILanguageConfigurationService languageConfigurationService: ILanguageConfigurationService,
		@ILanguageFeaturesService languageFeaturesService: ILanguageFeaturesService,
	) {
		super(domElement, { ...parentEditor.getRawOptions(), overflowWidgetsDomNode: parentEditor.getOverflowWidgetsDomNode() }, codeEditorWidgetOptions, instantiationService, codeEditorService, commandService, contextKeyService, themeService, notificationService, accessibilityService, languageConfigurationService, languageFeaturesService);

		this._parentEditor = parentEditor;
		this._overwriteOptions = options;

		// Overwrite parent's options
		super.updateOptions(this._overwriteOptions);

		this._register(parentEditor.onDidChangeConfiguration((e: ConfigurationChangedEvent) => this._onParentConfigurationChanged(e)));
	}

	getParentEditor(): ICodeEditor {
		return this._parentEditor;
	}

	private _onParentConfigurationChanged(e: ConfigurationChangedEvent): void {
		super.updateOptions(this._parentEditor.getRawOptions());
		super.updateOptions(this._overwriteOptions);
	}

	override updateOptions(newOptions: IEditorOptions): void {
		objects.mixin(this._overwriteOptions, newOptions, true);
		super.updateOptions(this._overwriteOptions);
	}
}

export class EmbeddedDiffEditorWidget extends DiffEditorWidget {

	private readonly _parentEditor: ICodeEditor;
	private readonly _overwriteOptions: IDiffEditorOptions;

	constructor(
		domElement: HTMLElement,
		options: Readonly<IDiffEditorConstructionOptions>,
		codeEditorWidgetOptions: IDiffCodeEditorWidgetOptions,
		parentEditor: ICodeEditor,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IInstantiationService instantiationService: IInstantiationService,
		@ICodeEditorService codeEditorService: ICodeEditorService,
		@IAudioCueService audioCueService: IAudioCueService,
		@IEditorProgressService editorProgressService: IEditorProgressService,
	) {
		super(domElement, parentEditor.getRawOptions(), codeEditorWidgetOptions, contextKeyService, instantiationService, codeEditorService, audioCueService, editorProgressService);

		this._parentEditor = parentEditor;
		this._overwriteOptions = options;

		// Overwrite parent's options
		super.updateOptions(this._overwriteOptions);

		this._register(parentEditor.onDidChangeConfiguration(e => this._onParentConfigurationChanged(e)));
	}

	getParentEditor(): ICodeEditor {
		return this._parentEditor;
	}

	private _onParentConfigurationChanged(e: ConfigurationChangedEvent): void {
		super.updateOptions(this._parentEditor.getRawOptions());
		super.updateOptions(this._overwriteOptions);
	}

	override updateOptions(newOptions: IEditorOptions): void {
		objects.mixin(this._overwriteOptions, newOptions, true);
		super.updateOptions(this._overwriteOptions);
	}
}

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {localize} from 'td/nls';
import {AbstractTextFileService} from 'td/workbench/services/textfile/browser/textFileService';
import {ITextFileService, ITextFileStreamContent, ITextFileContent, IReadTextFileOptions, TextFileEditorModelState, ITextFileEditorModel} from 'td/workbench/services/textfile/common/textfiles';
import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {URI} from 'td/base/common/uri';
import {IFileService, IFileReadLimits} from 'td/platform/files/common/files';
import {ITextResourceConfigurationService} from 'td/editor/common/services/textResourceConfiguration';
import {IUntitledTextEditorService} from 'td/workbench/services/untitled/common/untitledTextEditorService';
import {ILifecycleService} from 'td/workbench/services/lifecycle/common/lifecycle';
import {IInstantiationService} from 'td/platform/instantiation/common/instantiation';
import {IModelService} from 'td/editor/common/services/model';
import {INativeWorkbenchEnvironmentService} from 'td/workbench/services/environment/electron-sandbox/environmentService';
import {IDialogService, IFileDialogService} from 'td/platform/dialogs/common/dialogs';
import {IFilesConfigurationService} from 'td/workbench/services/filesConfiguration/common/filesConfigurationService';
import {ICodeEditorService} from 'td/editor/browser/services/codeEditorService';
import {IPathService} from 'td/workbench/services/path/common/pathService';
import {IWorkingCopyFileService} from 'td/workbench/services/workingCopy/common/workingCopyFileService';
import {IUriIdentityService} from 'td/platform/uriIdentity/common/uriIdentity';
import {ILanguageService} from 'td/editor/common/languages/language';
import {IElevatedFileService} from 'td/workbench/services/files/common/elevatedFileService';
import {ILogService} from 'td/platform/log/common/log';
import {Promises} from 'td/base/common/async';
import {IDecorationsService} from 'td/workbench/services/decorations/common/decorations';

export class NativeTextFileService extends AbstractTextFileService {

	protected override readonly environmentService: INativeWorkbenchEnvironmentService;

	constructor(
		@IFileService fileService: IFileService,
		@IUntitledTextEditorService untitledTextEditorService: IUntitledTextEditorService,
		@ILifecycleService lifecycleService: ILifecycleService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IModelService modelService: IModelService,
		@INativeWorkbenchEnvironmentService environmentService: INativeWorkbenchEnvironmentService,
		@IDialogService dialogService: IDialogService,
		@IFileDialogService fileDialogService: IFileDialogService,
		@ITextResourceConfigurationService textResourceConfigurationService: ITextResourceConfigurationService,
		@IFilesConfigurationService filesConfigurationService: IFilesConfigurationService,
		@ICodeEditorService codeEditorService: ICodeEditorService,
		@IPathService pathService: IPathService,
		@IWorkingCopyFileService workingCopyFileService: IWorkingCopyFileService,
		@IUriIdentityService uriIdentityService: IUriIdentityService,
		@ILanguageService languageService: ILanguageService,
		@IElevatedFileService elevatedFileService: IElevatedFileService,
		@ILogService logService: ILogService,
		@IDecorationsService decorationsService: IDecorationsService
	) {
		super(fileService, untitledTextEditorService, lifecycleService, instantiationService, modelService, environmentService, dialogService, fileDialogService, textResourceConfigurationService, filesConfigurationService, codeEditorService, pathService, workingCopyFileService, uriIdentityService, languageService, logService, elevatedFileService, decorationsService);

		this.environmentService = environmentService;

		this.registerListeners();
	}

	private registerListeners(): void {

		// Lifecycle
		this.lifecycleService.onWillShutdown(event => event.join(this.onWillShutdown(), {id: 'join.textFiles', label: localize('join.textFiles', "Saving text files")}));
	}

	private async onWillShutdown(): Promise<void> {
		let modelsPendingToSave: ITextFileEditorModel[];

		// As long as models are pending to be saved, we prolong the shutdown
		// until that has happened to ensure we are not shutting down in the
		// middle of writing to the file
		// (https://github.com/microsoft/vscode/issues/116600)
		while ((modelsPendingToSave = this.files.models.filter(model => model.hasState(TextFileEditorModelState.PENDING_SAVE))).length > 0) {
			await Promises.settled(modelsPendingToSave.map(model => model.joinState(TextFileEditorModelState.PENDING_SAVE)));
		}
	}

	override async read(resource: URI, options?: IReadTextFileOptions): Promise<ITextFileContent> {

		// ensure platform limits are applied
		options = this.ensureLimits(options);

		return super.read(resource, options);
	}

	override async readStream(resource: URI, options?: IReadTextFileOptions): Promise<ITextFileStreamContent> {

		// ensure platform limits are applied
		options = this.ensureLimits(options);

		return super.readStream(resource, options);
	}

	private ensureLimits(options?: IReadTextFileOptions): IReadTextFileOptions {
		let ensuredOptions: IReadTextFileOptions;
		if (!options) {
			ensuredOptions = Object.create(null);
		} else {
			ensuredOptions = options;
		}

		let ensuredLimits: IFileReadLimits;
		if (!ensuredOptions.limits) {
			ensuredLimits = Object.create(null);
			ensuredOptions = {
				...ensuredOptions,
				limits: ensuredLimits
			};
		} else {
			ensuredLimits = ensuredOptions.limits;
		}

		return ensuredOptions;
	}
}

registerSingleton(ITextFileService, NativeTextFileService, InstantiationType.Eager);

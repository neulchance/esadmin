/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {URI} from 'td/base/common/uri';
import {ITextModel} from 'td/editor/common/model';
import {IModelService} from 'td/editor/common/services/model';
import {ILanguageService} from 'td/editor/common/languages/language';
import {IInstantiationService, ServicesAccessor} from 'td/platform/instantiation/common/instantiation';
import {parseSavedSearchEditor, parseSerializedSearchEditor} from 'td/workbench/contrib/searchEditor/browser/searchEditorSerialization';
import {IWorkingCopyBackupService} from 'td/workbench/services/workingCopy/common/workingCopyBackup';
import {SearchConfiguration} from './searchEditorInput';
import {assertIsDefined} from 'td/base/common/types';
import {createTextBufferFactoryFromStream} from 'td/editor/common/model/textModel';
import {SearchEditorWorkingCopyTypeId} from 'td/workbench/contrib/searchEditor/browser/constants';
import {Emitter} from 'td/base/common/event';
import {ResourceMap} from 'td/base/common/map';
import {SEARCH_RESULT_LANGUAGE_ID} from 'td/workbench/services/search/common/search';

export type SearchEditorData = { resultsModel: ITextModel; configurationModel: SearchConfigurationModel };

export class SearchConfigurationModel {
	private _onConfigDidUpdate = new Emitter<SearchConfiguration>();
	public readonly onConfigDidUpdate = this._onConfigDidUpdate.event;

	constructor(public config: Readonly<SearchConfiguration>) { }
	updateConfig(config: SearchConfiguration) { this.config = config; this._onConfigDidUpdate.fire(config); }
}

export class SearchEditorModel {
	constructor(
		private resource: URI,
	) { }

	async resolve(): Promise<SearchEditorData> {
		return assertIsDefined(searchEditorModelFactory.models.get(this.resource)).resolve();
	}
}

class SearchEditorModelFactory {
	models = new ResourceMap<{ resolve: () => Promise<SearchEditorData> }>();

	constructor() { }

	initializeModelFromExistingModel(accessor: ServicesAccessor, resource: URI, config: SearchConfiguration) {
		if (this.models.has(resource)) {
			throw Error('Unable to contruct model for resource that already exists');
		}

		const languageService = accessor.get(ILanguageService);
		const modelService = accessor.get(IModelService);
		const instantiationService = accessor.get(IInstantiationService);
		const workingCopyBackupService = accessor.get(IWorkingCopyBackupService);

		let ongoingResolve: Promise<SearchEditorData> | undefined;

		this.models.set(resource, {
			resolve: () => {
				if (!ongoingResolve) {
					ongoingResolve = (async () => {

						const backup = await this.tryFetchModelFromBackupService(resource, languageService, modelService, workingCopyBackupService, instantiationService);
						if (backup) {
							return backup;
						}

						return Promise.resolve({
							resultsModel: modelService.getModel(resource) ?? modelService.createModel('', languageService.createById(SEARCH_RESULT_LANGUAGE_ID), resource),
							configurationModel: new SearchConfigurationModel(config)
						});
					})();
				}
				return ongoingResolve;
			}
		});
	}

	initializeModelFromRawData(accessor: ServicesAccessor, resource: URI, config: SearchConfiguration, contents: string | undefined) {
		if (this.models.has(resource)) {
			throw Error('Unable to contruct model for resource that already exists');
		}

		const languageService = accessor.get(ILanguageService);
		const modelService = accessor.get(IModelService);
		const instantiationService = accessor.get(IInstantiationService);
		const workingCopyBackupService = accessor.get(IWorkingCopyBackupService);

		let ongoingResolve: Promise<SearchEditorData> | undefined;

		this.models.set(resource, {
			resolve: () => {
				if (!ongoingResolve) {
					ongoingResolve = (async () => {

						const backup = await this.tryFetchModelFromBackupService(resource, languageService, modelService, workingCopyBackupService, instantiationService);
						if (backup) {
							return backup;
						}

						return Promise.resolve({
							resultsModel: modelService.createModel(contents ?? '', languageService.createById(SEARCH_RESULT_LANGUAGE_ID), resource),
							configurationModel: new SearchConfigurationModel(config)
						});
					})();
				}
				return ongoingResolve;
			}
		});
	}

	initializeModelFromExistingFile(accessor: ServicesAccessor, resource: URI, existingFile: URI) {
		if (this.models.has(resource)) {
			throw Error('Unable to contruct model for resource that already exists');
		}

		const languageService = accessor.get(ILanguageService);
		const modelService = accessor.get(IModelService);
		const instantiationService = accessor.get(IInstantiationService);
		const workingCopyBackupService = accessor.get(IWorkingCopyBackupService);

		let ongoingResolve: Promise<SearchEditorData> | undefined;

		this.models.set(resource, {
			resolve: async () => {
				if (!ongoingResolve) {
					ongoingResolve = (async () => {

						const backup = await this.tryFetchModelFromBackupService(resource, languageService, modelService, workingCopyBackupService, instantiationService);
						if (backup) {
							return backup;
						}

						const {text, config} = await instantiationService.invokeFunction(parseSavedSearchEditor, existingFile);
						return ({
							resultsModel: modelService.createModel(text ?? '', languageService.createById(SEARCH_RESULT_LANGUAGE_ID), resource),
							configurationModel: new SearchConfigurationModel(config)
						});
					})();
				}
				return ongoingResolve;
			}
		});
	}

	private async tryFetchModelFromBackupService(resource: URI, languageService: ILanguageService, modelService: IModelService, workingCopyBackupService: IWorkingCopyBackupService, instantiationService: IInstantiationService): Promise<SearchEditorData | undefined> {
		const backup = await workingCopyBackupService.resolve({resource, typeId: SearchEditorWorkingCopyTypeId});

		let model = modelService.getModel(resource);
		if (!model && backup) {
			const factory = await createTextBufferFactoryFromStream(backup.value);

			model = modelService.createModel(factory, languageService.createById(SEARCH_RESULT_LANGUAGE_ID), resource);
		}

		if (model) {
			const existingFile = model.getValue();
			const {text, config} = parseSerializedSearchEditor(existingFile);
			modelService.destroyModel(resource);
			return ({
				resultsModel: modelService.createModel(text ?? '', languageService.createById(SEARCH_RESULT_LANGUAGE_ID), resource),
				configurationModel: new SearchConfigurationModel(config)
			});
		}
		else {
			return undefined;
		}
	}
}

export const searchEditorModelFactory = new SearchEditorModelFactory();

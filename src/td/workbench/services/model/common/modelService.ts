/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {URI} from 'td/base/common/uri';
import {ILanguageConfigurationService} from 'td/editor/common/languages/languageConfigurationRegistry';
import {IModelService} from 'td/editor/common/services/model';
import {ModelService} from 'td/editor/common/services/modelService';
import {ILanguageService} from 'td/editor/common/languages/language';
import {ITextResourcePropertiesService} from 'td/editor/common/services/textResourceConfiguration';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {IUndoRedoService} from 'td/platform/undoRedo/common/undoRedo';
import {IPathService} from 'td/workbench/services/path/common/pathService';

export class WorkbenchModelService extends ModelService {
	constructor(
		@IConfigurationService configurationService: IConfigurationService,
		@ITextResourcePropertiesService resourcePropertiesService: ITextResourcePropertiesService,
		@IUndoRedoService undoRedoService: IUndoRedoService,
		@ILanguageConfigurationService languageConfigurationService: ILanguageConfigurationService,
		@ILanguageService languageService: ILanguageService,
		@IPathService private readonly _pathService: IPathService,
	) {
		super(configurationService, resourcePropertiesService, undoRedoService, languageService, languageConfigurationService);
	}

	protected override _schemaShouldMaintainUndoRedoElements(resource: URI) {
		return (
			super._schemaShouldMaintainUndoRedoElements(resource)
			|| resource.scheme === this._pathService.defaultUriScheme
		);
	}
}

registerSingleton(IModelService, WorkbenchModelService, InstantiationType.Delayed);

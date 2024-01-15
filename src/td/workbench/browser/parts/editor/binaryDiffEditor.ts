/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {localize} from 'td/nls';
import {BINARY_DIFF_EDITOR_ID} from 'td/workbench/common/editor';
import {ITelemetryService} from 'td/platform/telemetry/common/telemetry';
import {IThemeService} from 'td/platform/theme/common/themeService';
import {SideBySideEditor} from 'td/workbench/browser/parts/editor/sideBySideEditor';
import {IInstantiationService} from 'td/platform/instantiation/common/instantiation';
import {BaseBinaryResourceEditor} from 'td/workbench/browser/parts/editor/binaryEditor';
import {IStorageService} from 'td/platform/storage/common/storage';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {ITextResourceConfigurationService} from 'td/editor/common/services/textResourceConfiguration';
import {IEditorGroupsService} from 'td/workbench/services/editor/common/editorGroupsService';
import {IEditorService} from 'td/workbench/services/editor/common/editorService';

/**
 * An implementation of editor for diffing binary files like images or videos.
 */
export class BinaryResourceDiffEditor extends SideBySideEditor {

	static override readonly ID = BINARY_DIFF_EDITOR_ID;

	constructor(
		@ITelemetryService telemetryService: ITelemetryService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IThemeService themeService: IThemeService,
		@IStorageService storageService: IStorageService,
		@IConfigurationService configurationService: IConfigurationService,
		@ITextResourceConfigurationService textResourceConfigurationService: ITextResourceConfigurationService,
		@IEditorService editorService: IEditorService,
		@IEditorGroupsService editorGroupService: IEditorGroupsService
	) {
		super(telemetryService, instantiationService, themeService, storageService, configurationService, textResourceConfigurationService, editorService, editorGroupService);
	}

	getMetadata(): string | undefined {
		const primary = this.getPrimaryEditorPane();
		const secondary = this.getSecondaryEditorPane();

		if (primary instanceof BaseBinaryResourceEditor && secondary instanceof BaseBinaryResourceEditor) {
			return localize('metadataDiff', "{0} ↔ {1}", secondary.getMetadata(), primary.getMetadata());
		}

		return undefined;
	}
}

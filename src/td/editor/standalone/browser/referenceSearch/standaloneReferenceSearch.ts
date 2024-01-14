/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ICodeEditor } from 'td/editor/browser/editorBrowser';
import { EditorContributionInstantiation, registerEditorContribution } from 'td/editor/browser/editorExtensions';
import { ICodeEditorService } from 'td/editor/browser/services/codeEditorService';
import { ReferencesController } from 'td/editor/contrib/gotoSymbol/browser/peek/referencesController';
import { IConfigurationService } from 'td/platform/configuration/common/configuration';
import { IContextKeyService } from 'td/platform/contextkey/common/contextkey';
import { IInstantiationService } from 'td/platform/instantiation/common/instantiation';
import { INotificationService } from 'td/platform/notification/common/notification';
import { IStorageService } from 'td/platform/storage/common/storage';

export class StandaloneReferencesController extends ReferencesController {

	public constructor(
		editor: ICodeEditor,
		@IContextKeyService contextKeyService: IContextKeyService,
		@ICodeEditorService editorService: ICodeEditorService,
		@INotificationService notificationService: INotificationService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IStorageService storageService: IStorageService,
		@IConfigurationService configurationService: IConfigurationService,
	) {
		super(
			true,
			editor,
			contextKeyService,
			editorService,
			notificationService,
			instantiationService,
			storageService,
			configurationService
		);
	}
}

registerEditorContribution(ReferencesController.ID, StandaloneReferencesController, EditorContributionInstantiation.Lazy);

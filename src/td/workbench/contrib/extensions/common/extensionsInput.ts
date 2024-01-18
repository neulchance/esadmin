/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {Schemas} from 'td/base/common/network';
import {URI} from 'td/base/common/uri';
import {localize} from 'td/nls';
import {EditorInputCapabilities, IUntypedEditorInput} from 'td/workbench/common/editor';
import {EditorInput} from 'td/workbench/common/editor/editorInput';
import {ExtensionEditorTab, IExtension} from 'td/workbench/contrib/extensions/common/extensions';
import {areSameExtensions} from 'td/platform/extensionManagement/common/extensionManagementUtil';
import {join} from 'td/base/common/path';
import {IEditorOptions} from 'td/platform/editor/common/editor';
import {ThemeIcon} from 'td/base/common/themables';
import {Codicon} from 'td/base/common/codicons';
import {registerIcon} from 'td/platform/theme/common/iconRegistry';

const ExtensionEditorIcon = registerIcon('extensions-editor-label-icon', Codicon.extensions, localize('extensionsEditorLabelIcon', 'Icon of the extensions editor label.'));

export interface IExtensionEditorOptions extends IEditorOptions {
	showPreReleaseVersion?: boolean;
	tab?: ExtensionEditorTab;
	sideByside?: boolean;
}

export class ExtensionsInput extends EditorInput {

	static readonly ID = 'workbench.extensions.input2';

	override get typeId(): string {
		return ExtensionsInput.ID;
	}

	override get capabilities(): EditorInputCapabilities {
		return EditorInputCapabilities.Readonly | EditorInputCapabilities.Singleton | EditorInputCapabilities.AuxWindowUnsupported;
	}

	override get resource() {
		return URI.from({
			scheme: Schemas.extension,
			path: join(this._extension.identifier.id, 'extension')
		});
	}

	constructor(private _extension: IExtension) {
		super();
	}

	get extension(): IExtension { return this._extension; }

	override getName(): string {
		return localize('extensionsInputName', "Extension: {0}", this._extension.displayName);
	}

	override getIcon(): ThemeIcon | undefined {
		return ExtensionEditorIcon;
	}

	override matches(other: EditorInput | IUntypedEditorInput): boolean {
		if (super.matches(other)) {
			return true;
		}

		return other instanceof ExtensionsInput && areSameExtensions(this._extension.identifier, other._extension.identifier);
	}
}

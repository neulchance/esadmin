/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'td/workbench/contrib/welcomeWalkthrough/browser/editor/vs_code_editor_walkthrough';
import {localize, localize2} from 'td/nls';
import {IEditorService} from 'td/workbench/services/editor/common/editorService';
import {IInstantiationService, ServicesAccessor} from 'td/platform/instantiation/common/instantiation';
import {WalkThroughInput, WalkThroughInputOptions} from 'td/workbench/contrib/welcomeWalkthrough/browser/walkThroughInput';
import {FileAccess, Schemas} from 'td/base/common/network';
import {IEditorSerializer} from 'td/workbench/common/editor';
import {EditorInput} from 'td/workbench/common/editor/editorInput';
import {Action2} from 'td/platform/actions/common/actions';
import {Categories} from 'td/platform/action/common/actionCommonCategories';

const typeId = 'workbench.editors.walkThroughInput';
const inputOptions: WalkThroughInputOptions = {
	typeId,
	name: localize('editorWalkThrough.title', "Editor Playground"),
	resource: FileAccess.asBrowserUri('td/workbench/contrib/welcomeWalkthrough/browser/editor/vs_code_editor_walkthrough.md')
		.with({
			scheme: Schemas.walkThrough,
			query: JSON.stringify({moduleId: 'td/workbench/contrib/welcomeWalkthrough/browser/editor/vs_code_editor_walkthrough'})
		}),
	telemetryFrom: 'walkThrough'
};

export class EditorWalkThroughAction extends Action2 {

	public static readonly ID = 'workbench.action.showInteractivePlayground';
	public static readonly LABEL = localize2('editorWalkThrough', 'Interactive Editor Playground');

	constructor() {
		super({
			id: EditorWalkThroughAction.ID,
			title: EditorWalkThroughAction.LABEL,
			category: Categories.Help,
			f1: true
		});
	}

	public override run(serviceAccessor: ServicesAccessor): Promise<void> {
		const editorService = serviceAccessor.get(IEditorService);
		const instantiationService = serviceAccessor.get(IInstantiationService);
		const input = instantiationService.createInstance(WalkThroughInput, inputOptions);
		// TODO @lramos15 adopt the resolver here
		return editorService.openEditor(input, {pinned: true})
			.then(() => void (0));
	}
}

export class EditorWalkThroughInputSerializer implements IEditorSerializer {

	static readonly ID = typeId;

	public canSerialize(editorInput: EditorInput): boolean {
		return true;
	}

	public serialize(editorInput: EditorInput): string {
		return '';
	}

	public deserialize(instantiationService: IInstantiationService): WalkThroughInput {
		return instantiationService.createInstance(WalkThroughInput, inputOptions);
	}
}

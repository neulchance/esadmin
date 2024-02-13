/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {localize} from 'td/nls';
import {WalkThroughInput} from 'td/workbench/contrib/welcomeWalkthrough/browser/walkThroughInput';
import {WalkThroughPart} from 'td/workbench/contrib/welcomeWalkthrough/browser/walkThroughPart';
import {WalkThroughArrowUp, WalkThroughArrowDown, WalkThroughPageUp, WalkThroughPageDown} from 'td/workbench/contrib/welcomeWalkthrough/browser/walkThroughActions';
import {WalkThroughSnippetContentProvider} from 'td/workbench/contrib/welcomeWalkthrough/common/walkThroughContentProvider';
import {EditorWalkThroughAction, EditorWalkThroughInputSerializer} from 'td/workbench/contrib/welcomeWalkthrough/browser/editor/editorWalkThrough';
import {Registry} from 'td/platform/registry/common/platform';
import {EditorExtensions, IEditorFactoryRegistry} from 'td/workbench/common/editor';
import {SyncDescriptor} from 'td/platform/instantiation/common/descriptors';
import {MenuRegistry, MenuId, registerAction2} from 'td/platform/actions/common/actions';
import {registerWorkbenchContribution2} from 'td/workbench/common/contributions';
import {IEditorPaneRegistry, EditorPaneDescriptor} from 'td/workbench/browser/editor';
import {KeybindingsRegistry} from 'td/platform/keybinding/common/keybindingsRegistry';

Registry.as<IEditorPaneRegistry>(EditorExtensions.EditorPane)
	.registerEditorPane(EditorPaneDescriptor.create(
		WalkThroughPart,
		WalkThroughPart.ID,
		localize('walkThrough.editor.label', "Playground"),
	),
		[new SyncDescriptor(WalkThroughInput)]);

registerAction2(EditorWalkThroughAction);

Registry.as<IEditorFactoryRegistry>(EditorExtensions.EditorFactory).registerEditorSerializer(EditorWalkThroughInputSerializer.ID, EditorWalkThroughInputSerializer);

registerWorkbenchContribution2(WalkThroughSnippetContentProvider.ID, WalkThroughSnippetContentProvider, {editorTypeId: WalkThroughPart.ID});

KeybindingsRegistry.registerCommandAndKeybindingRule(WalkThroughArrowUp);

KeybindingsRegistry.registerCommandAndKeybindingRule(WalkThroughArrowDown);

KeybindingsRegistry.registerCommandAndKeybindingRule(WalkThroughPageUp);

KeybindingsRegistry.registerCommandAndKeybindingRule(WalkThroughPageDown);

MenuRegistry.appendMenuItem(MenuId.MenubarHelpMenu, {
	group: '1_welcome',
	command: {
		id: 'workbench.action.showInteractivePlayground',
		title: localize({key: 'miPlayground', comment: ['&& denotes a mnemonic']}, "Editor Playgrou&&nd")
	},
	order: 3
});

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {getActiveElement} from 'td/base/browser/dom';
import {Codicon} from 'td/base/common/codicons';
import {KeyCode, KeyMod} from 'td/base/common/keyCodes';
import {ICodeEditor, IDiffEditor} from 'td/editor/browser/editorBrowser';
import {EditorAction2, ServicesAccessor} from 'td/editor/browser/editorExtensions';
import {ICodeEditorService} from 'td/editor/browser/services/codeEditorService';
import {DiffEditorWidget} from 'td/editor/browser/widget/diffEditor/diffEditorWidget';
import {EditorContextKeys} from 'td/editor/common/editorContextKeys';
import {localize, localize2} from 'td/nls';
import {ILocalizedString} from 'td/platform/action/common/action';
import {Action2, MenuId, MenuRegistry, registerAction2} from 'td/platform/actions/common/actions';
import {CommandsRegistry} from 'td/platform/commands/common/commands';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {ContextKeyEqualsExpr, ContextKeyExpr} from 'td/platform/contextkey/common/contextkey';
import {KeybindingWeight} from 'td/platform/keybinding/common/keybindingsRegistry';
import './registrations.contribution';

export class ToggleCollapseUnchangedRegions extends Action2 {
	constructor() {
		super({
			id: 'diffEditor.toggleCollapseUnchangedRegions',
			title: localize2('toggleCollapseUnchangedRegions', 'Toggle Collapse Unchanged Regions'),
			icon: Codicon.map,
			toggled: ContextKeyExpr.has('config.diffEditor.hideUnchangedRegions.enabled'),
			precondition: ContextKeyExpr.has('isInDiffEditor'),
			menu: {
				when: ContextKeyExpr.has('isInDiffEditor'),
				id: MenuId.EditorTitle,
				order: 22,
				group: 'navigation',
			},
		});
	}

	run(accessor: ServicesAccessor, ...args: unknown[]): void {
		const configurationService = accessor.get(IConfigurationService);
		const newValue = !configurationService.getValue<boolean>('diffEditor.hideUnchangedRegions.enabled');
		configurationService.updateValue('diffEditor.hideUnchangedRegions.enabled', newValue);
	}
}

registerAction2(ToggleCollapseUnchangedRegions);

export class ToggleShowMovedCodeBlocks extends Action2 {
	constructor() {
		super({
			id: 'diffEditor.toggleShowMovedCodeBlocks',
			title: localize2('toggleShowMovedCodeBlocks', 'Toggle Show Moved Code Blocks'),
			precondition: ContextKeyExpr.has('isInDiffEditor'),
		});
	}

	run(accessor: ServicesAccessor, ...args: unknown[]): void {
		const configurationService = accessor.get(IConfigurationService);
		const newValue = !configurationService.getValue<boolean>('diffEditor.experimental.showMoves');
		configurationService.updateValue('diffEditor.experimental.showMoves', newValue);
	}
}

registerAction2(ToggleShowMovedCodeBlocks);

export class ToggleUseInlineViewWhenSpaceIsLimited extends Action2 {
	constructor() {
		super({
			id: 'diffEditor.toggleUseInlineViewWhenSpaceIsLimited',
			title: localize2('toggleUseInlineViewWhenSpaceIsLimited', 'Toggle Use Inline View When Space Is Limited'),
			precondition: ContextKeyExpr.has('isInDiffEditor'),
		});
	}

	run(accessor: ServicesAccessor, ...args: unknown[]): void {
		const configurationService = accessor.get(IConfigurationService);
		const newValue = !configurationService.getValue<boolean>('diffEditor.useInlineViewWhenSpaceIsLimited');
		configurationService.updateValue('diffEditor.useInlineViewWhenSpaceIsLimited', newValue);
	}
}

registerAction2(ToggleUseInlineViewWhenSpaceIsLimited);

MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
	command: {
		id: new ToggleUseInlineViewWhenSpaceIsLimited().desc.id,
		title: localize('useInlineViewWhenSpaceIsLimited', "Use Inline View When Space Is Limited"),
		toggled: ContextKeyExpr.has('config.diffEditor.useInlineViewWhenSpaceIsLimited'),
		precondition: ContextKeyExpr.has('isInDiffEditor'),
	},
	order: 11,
	group: '1_diff',
	when: ContextKeyExpr.and(
		EditorContextKeys.diffEditorRenderSideBySideInlineBreakpointReached,
		ContextKeyExpr.has('isInDiffEditor'),
	),
});

MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
	command: {
		id: new ToggleShowMovedCodeBlocks().desc.id,
		title: localize('showMoves', "Show Moved Code Blocks"),
		icon: Codicon.move,
		toggled: ContextKeyEqualsExpr.create('config.diffEditor.experimental.showMoves', true),
		precondition: ContextKeyExpr.has('isInDiffEditor'),
	},
	order: 10,
	group: '1_diff',
	when: ContextKeyExpr.has('isInDiffEditor'),
});

const diffEditorCategory: ILocalizedString = {
	value: localize('diffEditor', 'Diff Editor'),
	original: 'Diff Editor',
};

export class SwitchSide extends EditorAction2 {
	constructor() {
		super({
			id: 'diffEditor.switchSide',
			title: localize2('switchSide', 'Switch Side'),
			icon: Codicon.arrowSwap,
			precondition: ContextKeyExpr.has('isInDiffEditor'),
			f1: true,
			category: diffEditorCategory,
		});
	}

	runEditorCommand(accessor: ServicesAccessor, editor: ICodeEditor, arg?: { dryRun: boolean }): unknown {
		const diffEditor = findFocusedDiffEditor(accessor);
		if (diffEditor instanceof DiffEditorWidget) {
			if (arg && arg.dryRun) {
				return {destinationSelection: diffEditor.mapToOtherSide().destinationSelection};
			} else {
				diffEditor.switchSide();
			}
		}
		return undefined;
	}
}

registerAction2(SwitchSide);

export class ExitCompareMove extends EditorAction2 {
	constructor() {
		super({
			id: 'diffEditor.exitCompareMove',
			title: localize2('exitCompareMove', 'Exit Compare Move'),
			icon: Codicon.close,
			precondition: EditorContextKeys.comparingMovedCode,
			f1: false,
			category: diffEditorCategory,
			keybinding: {
				weight: 10000,
				primary: KeyCode.Escape,
			}
		});
	}

	runEditorCommand(accessor: ServicesAccessor, editor: ICodeEditor, ...args: unknown[]): void {
		const diffEditor = findFocusedDiffEditor(accessor);
		if (diffEditor instanceof DiffEditorWidget) {
			diffEditor.exitCompareMove();
		}
	}
}

registerAction2(ExitCompareMove);

export class CollapseAllUnchangedRegions extends EditorAction2 {
	constructor() {
		super({
			id: 'diffEditor.collapseAllUnchangedRegions',
			title: localize2('collapseAllUnchangedRegions', 'Collapse All Unchanged Regions'),
			icon: Codicon.fold,
			precondition: ContextKeyExpr.has('isInDiffEditor'),
			f1: true,
			category: diffEditorCategory,
		});
	}

	runEditorCommand(accessor: ServicesAccessor, editor: ICodeEditor, ...args: unknown[]): void {
		const diffEditor = findFocusedDiffEditor(accessor);
		if (diffEditor instanceof DiffEditorWidget) {
			diffEditor.collapseAllUnchangedRegions();
		}
	}
}

registerAction2(CollapseAllUnchangedRegions);

export class ShowAllUnchangedRegions extends EditorAction2 {
	constructor() {
		super({
			id: 'diffEditor.showAllUnchangedRegions',
			title: localize2('showAllUnchangedRegions', 'Show All Unchanged Regions'),
			icon: Codicon.unfold,
			precondition: ContextKeyExpr.has('isInDiffEditor'),
			f1: true,
			category: diffEditorCategory,
		});
	}

	runEditorCommand(accessor: ServicesAccessor, editor: ICodeEditor, ...args: unknown[]): void {
		const diffEditor = findFocusedDiffEditor(accessor);
		if (diffEditor instanceof DiffEditorWidget) {
			diffEditor.showAllUnchangedRegions();
		}
	}
}

registerAction2(ShowAllUnchangedRegions);

const accessibleDiffViewerCategory: ILocalizedString = {
	value: localize('accessibleDiffViewer', 'Accessible Diff Viewer'),
	original: 'Accessible Diff Viewer',
};

export class AccessibleDiffViewerNext extends Action2 {
	public static id = 'editor.action.accessibleDiffViewer.next';

	constructor() {
		super({
			id: AccessibleDiffViewerNext.id,
			title: localize2('editor.action.accessibleDiffViewer.next', 'Go to Next Difference'),
			category: accessibleDiffViewerCategory,
			precondition: ContextKeyExpr.has('isInDiffEditor'),
			keybinding: {
				primary: KeyCode.F7,
				weight: KeybindingWeight.EditorContrib
			},
			f1: true,
		});
	}

	public override run(accessor: ServicesAccessor): void {
		const diffEditor = findFocusedDiffEditor(accessor);
		diffEditor?.accessibleDiffViewerNext();
	}
}

MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
	command: {
		id: AccessibleDiffViewerNext.id,
		title: localize('Open Accessible Diff Viewer', "Open Accessible Diff Viewer"),
		precondition: ContextKeyExpr.has('isInDiffEditor'),
	},
	order: 10,
	group: '2_diff',
	when: ContextKeyExpr.and(
		EditorContextKeys.accessibleDiffViewerVisible.negate(),
		ContextKeyExpr.has('isInDiffEditor'),
	),
});

export class AccessibleDiffViewerPrev extends Action2 {
	public static id = 'editor.action.accessibleDiffViewer.prev';

	constructor() {
		super({
			id: AccessibleDiffViewerPrev.id,
			title: localize2('editor.action.accessibleDiffViewer.prev', 'Go to Previous Difference'),
			category: accessibleDiffViewerCategory,
			precondition: ContextKeyExpr.has('isInDiffEditor'),
			keybinding: {
				primary: KeyMod.Shift | KeyCode.F7,
				weight: KeybindingWeight.EditorContrib
			},
			f1: true,
		});
	}

	public override run(accessor: ServicesAccessor): void {
		const diffEditor = findFocusedDiffEditor(accessor);
		diffEditor?.accessibleDiffViewerPrev();
	}
}

export function findFocusedDiffEditor(accessor: ServicesAccessor): IDiffEditor | null {
	const codeEditorService = accessor.get(ICodeEditorService);
	const diffEditors = codeEditorService.listDiffEditors();

	const activeElement = getActiveElement();
	if (activeElement) {
		for (const d of diffEditors) {
			const container = d.getContainerDomNode();
			if (isElementOrParentOf(container, activeElement)) {
				return d;
			}
		}
	}

	return null;
}

function isElementOrParentOf(elementOrParent: Element, element: Element): boolean {
	let e: Element | null = element;
	while (e) {
		if (e === elementOrParent) {
			return true;
		}
		e = e.parentElement;
	}
	return false;
}

CommandsRegistry.registerCommandAlias('editor.action.diffReview.next', AccessibleDiffViewerNext.id);
registerAction2(AccessibleDiffViewerNext);

CommandsRegistry.registerCommandAlias('editor.action.diffReview.prev', AccessibleDiffViewerPrev.id);
registerAction2(AccessibleDiffViewerPrev);

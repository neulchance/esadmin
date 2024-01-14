/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'td/css!./media/panelpart';
import {localize} from 'td/nls';
import {IAction, Separator, SubmenuAction, toAction} from 'td/base/common/actions';
import {ActionsOrientation} from 'td/base/browser/ui/actionbar/actionbar';
import {ActivePanelContext, PanelFocusContext} from 'td/workbench/common/contextkeys';
import {IWorkbenchLayoutService, Parts, Position} from 'td/workbench/services/layout/browser/layoutService';
import {IStorageService} from 'td/platform/storage/common/storage';
import {IContextMenuService} from 'td/platform/contextview/browser/contextView';
import {IKeybindingService} from 'td/platform/keybinding/common/keybinding';
import {IInstantiationService} from 'td/platform/instantiation/common/instantiation';
import {TogglePanelAction} from 'td/workbench/browser/parts/panel/panelActions';
import {IThemeService} from 'td/platform/theme/common/themeService';
import {PANEL_BACKGROUND, PANEL_BORDER, PANEL_ACTIVE_TITLE_FOREGROUND, PANEL_INACTIVE_TITLE_FOREGROUND, PANEL_ACTIVE_TITLE_BORDER, PANEL_DRAG_AND_DROP_BORDER} from 'td/workbench/common/theme';
import {contrastBorder, badgeBackground, badgeForeground} from 'td/platform/theme/common/colorRegistry';
import {INotificationService} from 'td/platform/notification/common/notification';
import {Dimension} from 'td/base/browser/dom';
import {IContextKeyService} from 'td/platform/contextkey/common/contextkey';
import {assertIsDefined} from 'td/base/common/types';
import {IExtensionService} from 'td/workbench/services/extensions/common/extensions';
import {IViewDescriptorService} from 'td/workbench/common/views';
import {HoverPosition} from 'td/base/browser/ui/hover/hoverWidget';
import {IMenuService, MenuId} from 'td/platform/actions/common/actions';
import {AbstractPaneCompositePart} from 'td/workbench/browser/parts/paneCompositePart';
import {ICommandService} from 'td/platform/commands/common/commands';
import {createAndFillInContextMenuActions} from 'td/platform/actions/browser/menuEntryActionViewItem';
import {IPaneCompositeBarOptions} from 'td/workbench/browser/parts/paneCompositeBar';

export class PanelPart extends AbstractPaneCompositePart {

	//#region IView

	readonly minimumWidth: number = 300;
	readonly maximumWidth: number = Number.POSITIVE_INFINITY;
	readonly minimumHeight: number = 77;
	readonly maximumHeight: number = Number.POSITIVE_INFINITY;

	get preferredHeight(): number | undefined {
		// Don't worry about titlebar or statusbar visibility
		// The difference is minimal and keeps this function clean
		return this.layoutService.mainContainerDimension.height * 0.4;
	}

	get preferredWidth(): number | undefined {
		const activeComposite = this.getActivePaneComposite();

		if (!activeComposite) {
			return;
		}

		const width = activeComposite.getOptimalWidth();
		if (typeof width !== 'number') {
			return;
		}

		return Math.max(width, 300);
	}

	//#endregion

	static readonly activePanelSettingsKey = 'workbench.panelpart.activepanelid';

	constructor(
		@INotificationService notificationService: INotificationService,
		@IStorageService storageService: IStorageService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IWorkbenchLayoutService layoutService: IWorkbenchLayoutService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IThemeService themeService: IThemeService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IExtensionService extensionService: IExtensionService,
		@ICommandService private commandService: ICommandService,
		@IMenuService menuService: IMenuService,
	) {
		super(
			Parts.PANEL_PART,
			{hasTitle: true},
			PanelPart.activePanelSettingsKey,
			ActivePanelContext.bindTo(contextKeyService),
			PanelFocusContext.bindTo(contextKeyService),
			'panel',
			'panel',
			undefined,
			notificationService,
			storageService,
			contextMenuService,
			layoutService,
			keybindingService,
			instantiationService,
			themeService,
			viewDescriptorService,
			contextKeyService,
			extensionService,
			menuService,
		);
	}

	override updateStyles(): void {
		super.updateStyles();

		const container = assertIsDefined(this.getContainer());
		container.style.backgroundColor = this.getColor(PANEL_BACKGROUND) || '';
		const borderColor = this.getColor(PANEL_BORDER) || this.getColor(contrastBorder) || '';
		container.style.borderLeftColor = borderColor;
		container.style.borderRightColor = borderColor;

		const title = this.getTitleArea();
		if (title) {
			title.style.borderTopColor = this.getColor(PANEL_BORDER) || this.getColor(contrastBorder) || '';
		}
	}

	protected getCompositeBarOptions(): IPaneCompositeBarOptions {
		return {
			partContainerClass: 'panel',
			pinnedViewContainersKey: 'workbench.panel.pinnedPanels',
			placeholderViewContainersKey: 'workbench.panel.placeholderPanels',
			viewContainersWorkspaceStateKey: 'workbench.panel.viewContainersWorkspaceState',
			icon: false,
			orientation: ActionsOrientation.HORIZONTAL,
			recomputeSizes: true,
			activityHoverOptions: {
				position: () => this.layoutService.getPanelPosition() === Position.BOTTOM && !this.layoutService.isPanelMaximized() ? HoverPosition.ABOVE : HoverPosition.BELOW,
			},
			fillExtraContextMenuActions: actions => this.fillExtraContextMenuActions(actions),
			compositeSize: 0,
			iconSize: 16,
			overflowActionSize: 44,
			colors: theme => ({
				activeBackgroundColor: theme.getColor(PANEL_BACKGROUND), // Background color for overflow action
				inactiveBackgroundColor: theme.getColor(PANEL_BACKGROUND), // Background color for overflow action
				activeBorderBottomColor: theme.getColor(PANEL_ACTIVE_TITLE_BORDER),
				activeForegroundColor: theme.getColor(PANEL_ACTIVE_TITLE_FOREGROUND),
				inactiveForegroundColor: theme.getColor(PANEL_INACTIVE_TITLE_FOREGROUND),
				badgeBackground: theme.getColor(badgeBackground),
				badgeForeground: theme.getColor(badgeForeground),
				dragAndDropBorder: theme.getColor(PANEL_DRAG_AND_DROP_BORDER)
			})
		};
	}

	private fillExtraContextMenuActions(actions: IAction[]): void {
		const panelPositionMenu = this.menuService.createMenu(MenuId.PanelPositionMenu, this.contextKeyService);
		const panelAlignMenu = this.menuService.createMenu(MenuId.PanelAlignmentMenu, this.contextKeyService);
		const positionActions: IAction[] = [];
		const alignActions: IAction[] = [];
		createAndFillInContextMenuActions(panelPositionMenu, {shouldForwardArgs: true}, {primary: [], secondary: positionActions});
		createAndFillInContextMenuActions(panelAlignMenu, {shouldForwardArgs: true}, {primary: [], secondary: alignActions});
		panelAlignMenu.dispose();
		panelPositionMenu.dispose();

		actions.push(...[
			new Separator(),
			new SubmenuAction('workbench.action.panel.position', localize('panel position', "Panel Position"), positionActions),
			new SubmenuAction('workbench.action.panel.align', localize('align panel', "Align Panel"), alignActions),
			toAction({id: TogglePanelAction.ID, label: localize('hidePanel', "Hide Panel"), run: () => this.commandService.executeCommand(TogglePanelAction.ID)})
		]);
	}

	override layout(width: number, height: number, top: number, left: number): void {
		let dimensions: Dimension;
		if (this.layoutService.getPanelPosition() === Position.RIGHT) {
			dimensions = new Dimension(width - 1, height); // Take into account the 1px border when layouting
		} else {
			dimensions = new Dimension(width, height);
		}

		// Layout contents
		super.layout(dimensions.width, dimensions.height, top, left);
	}

	protected shouldShowCompositeBar(): boolean {
		return true;
	}

	toJSON(): object {
		return {
			type: Parts.PANEL_PART
		};
	}
}

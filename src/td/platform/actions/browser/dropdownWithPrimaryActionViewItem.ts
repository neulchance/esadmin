/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as DOM from 'td/base/browser/dom';
import {StandardKeyboardEvent} from 'td/base/browser/keyboardEvent';
import {ActionViewItem, BaseActionViewItem} from 'td/base/browser/ui/actionbar/actionViewItems';
import {DropdownMenuActionViewItem} from 'td/base/browser/ui/dropdown/dropdownActionViewItem';
import {IAction, IActionRunner} from 'td/base/common/actions';
import {Event} from 'td/base/common/event';
import {KeyCode} from 'td/base/common/keyCodes';
import {ResolvedKeybinding} from 'td/base/common/keybindings';
import {MenuEntryActionViewItem} from 'td/platform/actions/browser/menuEntryActionViewItem';
import {MenuItemAction} from 'td/platform/actions/common/actions';
import {IContextKeyService} from 'td/platform/contextkey/common/contextkey';
import {IKeybindingService} from 'td/platform/keybinding/common/keybinding';
import {INotificationService} from 'td/platform/notification/common/notification';
import {IThemeService} from 'td/platform/theme/common/themeService';
import {IContextMenuService} from 'td/platform/contextview/browser/contextView';
import {IAccessibilityService} from 'td/platform/accessibility/common/accessibility';

export interface IDropdownWithPrimaryActionViewItemOptions {
	actionRunner?: IActionRunner;
	getKeyBinding?: (action: IAction) => ResolvedKeybinding | undefined;
}

export class DropdownWithPrimaryActionViewItem extends BaseActionViewItem {
	private _primaryAction: ActionViewItem;
	private _dropdown: DropdownMenuActionViewItem;
	private _container: HTMLElement | null = null;
	private _dropdownContainer: HTMLElement | null = null;

	get onDidChangeDropdownVisibility(): Event<boolean> {
		return this._dropdown.onDidChangeVisibility;
	}

	constructor(
		primaryAction: MenuItemAction,
		dropdownAction: IAction,
		dropdownMenuActions: IAction[],
		className: string,
		private readonly _contextMenuProvider: IContextMenuService,
		private readonly _options: IDropdownWithPrimaryActionViewItemOptions | undefined,
		@IKeybindingService _keybindingService: IKeybindingService,
		@INotificationService _notificationService: INotificationService,
		@IContextKeyService _contextKeyService: IContextKeyService,
		@IThemeService _themeService: IThemeService,
		@IAccessibilityService _accessibilityService: IAccessibilityService
	) {
		super(null, primaryAction);
		this._primaryAction = new MenuEntryActionViewItem(primaryAction, undefined, _keybindingService, _notificationService, _contextKeyService, _themeService, _contextMenuProvider, _accessibilityService);
		if (_options?.actionRunner) {
			this._primaryAction.actionRunner = _options.actionRunner;
		}

		this._dropdown = new DropdownMenuActionViewItem(dropdownAction, dropdownMenuActions, this._contextMenuProvider, {
			menuAsChild: true,
			classNames: className ? ['codicon', 'codicon-chevron-down', className] : ['codicon', 'codicon-chevron-down'],
			actionRunner: this._options?.actionRunner,
			keybindingProvider: this._options?.getKeyBinding
		});
	}

	override setActionContext(newContext: unknown): void {
		super.setActionContext(newContext);
		this._primaryAction.setActionContext(newContext);
		this._dropdown.setActionContext(newContext);
	}

	override render(container: HTMLElement): void {
		this._container = container;
		super.render(this._container);
		this._container.classList.add('monaco-dropdown-with-primary');
		const primaryContainer = DOM.$('.action-container');
		this._primaryAction.render(DOM.append(this._container, primaryContainer));
		this._dropdownContainer = DOM.$('.dropdown-action-container');
		this._dropdown.render(DOM.append(this._container, this._dropdownContainer));
		this._register(DOM.addDisposableListener(primaryContainer, DOM.EventType.KEY_DOWN, (e: KeyboardEvent) => {
			const event = new StandardKeyboardEvent(e);
			if (event.equals(KeyCode.RightArrow)) {
				this._primaryAction.element!.tabIndex = -1;
				this._dropdown.focus();
				event.stopPropagation();
			}
		}));
		this._register(DOM.addDisposableListener(this._dropdownContainer, DOM.EventType.KEY_DOWN, (e: KeyboardEvent) => {
			const event = new StandardKeyboardEvent(e);
			if (event.equals(KeyCode.LeftArrow)) {
				this._primaryAction.element!.tabIndex = 0;
				this._dropdown.setFocusable(false);
				this._primaryAction.element?.focus();
				event.stopPropagation();
			}
		}));

		this.updateEnabled();
	}

	override focus(fromRight?: boolean): void {
		if (fromRight) {
			this._dropdown.focus();
		} else {
			this._primaryAction.element!.tabIndex = 0;
			this._primaryAction.element!.focus();
		}
	}

	override blur(): void {
		this._primaryAction.element!.tabIndex = -1;
		this._dropdown.blur();
		this._container!.blur();
	}

	override setFocusable(focusable: boolean): void {
		if (focusable) {
			this._primaryAction.element!.tabIndex = 0;
		} else {
			this._primaryAction.element!.tabIndex = -1;
			this._dropdown.setFocusable(false);
		}
	}

	protected override updateEnabled(): void {
		const disabled = !this.action.enabled;
		this.element?.classList.toggle('disabled', disabled);
	}

	update(dropdownAction: IAction, dropdownMenuActions: IAction[], dropdownIcon?: string): void {
		this._dropdown.dispose();
		this._dropdown = new DropdownMenuActionViewItem(dropdownAction, dropdownMenuActions, this._contextMenuProvider, {
			menuAsChild: true,
			classNames: ['codicon', dropdownIcon || 'codicon-chevron-down']
		});
		if (this._dropdownContainer) {
			this._dropdown.render(this._dropdownContainer);
		}
	}

	override dispose() {
		this._primaryAction.dispose();
		this._dropdown.dispose();
		super.dispose();
	}
}

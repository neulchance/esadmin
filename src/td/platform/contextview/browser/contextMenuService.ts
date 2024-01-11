/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IContextMenuDelegate} from 'td/base/browser/contextmenu';
import {ModifierKeyEmitter} from 'td/base/browser/dom';
import {IAction, Separator} from 'td/base/common/actions';
import {Emitter} from 'td/base/common/event';
import {Disposable} from 'td/base/common/lifecycle';
import {createAndFillInContextMenuActions} from 'td/platform/actions/browser/menuEntryActionViewItem';
import {IMenuService, MenuId} from 'td/platform/actions/common/actions';
import {IContextKeyService} from 'td/platform/contextkey/common/contextkey';
import {IKeybindingService} from 'td/platform/keybinding/common/keybinding';
import {INotificationService} from 'td/platform/notification/common/notification';
import {ITelemetryService} from 'td/platform/telemetry/common/telemetry';
import {ContextMenuHandler, IContextMenuHandlerOptions} from './contextMenuHandler';
import {IContextMenuMenuDelegate, IContextMenuService, IContextViewService} from './contextView';

export class ContextMenuService extends Disposable implements IContextMenuService {

	declare readonly _serviceBrand: undefined;

	private _contextMenuHandler: ContextMenuHandler | undefined = undefined;
	private get contextMenuHandler(): ContextMenuHandler {
		if (!this._contextMenuHandler) {
			this._contextMenuHandler = new ContextMenuHandler(this.contextViewService, this.telemetryService, this.notificationService/* , this.keybindingService */);
		}

		return this._contextMenuHandler;
	}

	private readonly _onDidShowContextMenu = this._store.add(new Emitter<void>());
	readonly onDidShowContextMenu = this._onDidShowContextMenu.event;

	private readonly _onDidHideContextMenu = this._store.add(new Emitter<void>());
	readonly onDidHideContextMenu = this._onDidHideContextMenu.event;

	constructor(
		@ITelemetryService private readonly telemetryService: ITelemetryService,
		@INotificationService private readonly notificationService: INotificationService,
		@IContextViewService private readonly contextViewService: IContextViewService,
		// @IKeybindingService private readonly keybindingService: IKeybindingService,
		@IMenuService private readonly menuService: IMenuService,
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
	) {
		super();
	}

	configure(options: IContextMenuHandlerOptions): void {
		this.contextMenuHandler.configure(options);
	}

	// ContextMenu

	showContextMenu(delegate: IContextMenuDelegate | IContextMenuMenuDelegate): void {

		delegate = ContextMenuMenuDelegate.transform(delegate, this.menuService, this.contextKeyService);

		this.contextMenuHandler.showContextMenu({
			...delegate,
			onHide: (didCancel) => {
				delegate.onHide?.(didCancel);

				this._onDidHideContextMenu.fire();
			}
		});
		ModifierKeyEmitter.getInstance().resetKeyStatus();
		this._onDidShowContextMenu.fire();
	}
}

export namespace ContextMenuMenuDelegate {

	function is(thing: IContextMenuDelegate | IContextMenuMenuDelegate): thing is IContextMenuMenuDelegate {
		return thing && (<IContextMenuMenuDelegate>thing).menuId instanceof MenuId;
	}

	export function transform(delegate: IContextMenuDelegate | IContextMenuMenuDelegate, menuService: IMenuService, globalContextKeyService: IContextKeyService): IContextMenuDelegate {
		if (!is(delegate)) {
			return delegate;
		}
		const {menuId, menuActionOptions, contextKeyService} = delegate;
		return {
			...delegate,
			getActions: () => {
				const target: IAction[] = [];
				if (menuId) {
					const menu = menuService.createMenu(menuId, contextKeyService ?? globalContextKeyService);
					createAndFillInContextMenuActions(menu, menuActionOptions, target);
					menu.dispose();
				}
				if (!delegate.getActions) {
					return target;
				} else {
					return Separator.join(delegate.getActions(), target);
				}
			}
		};
	}
}

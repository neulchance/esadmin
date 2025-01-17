/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {createDecorator, IInstantiationService} from 'td/platform/instantiation/common/instantiation';
import {ILifecycleMainService, LifecycleMainPhase} from 'td/platform/lifecycle/electron-main/lifecycleMainService';
import {ILogService} from 'td/platform/log/common/log';
import {ICommonMenubarService, IMenubarData} from 'td/platform/menubar/common/menubar';
import {Menubar} from 'td/platform/menubar/electron-main/menubar';

export const IMenubarMainService = createDecorator<IMenubarMainService>('menubarMainService');

export interface IMenubarMainService extends ICommonMenubarService {
	readonly _serviceBrand: undefined;
}

export class MenubarMainService implements IMenubarMainService {

	declare readonly _serviceBrand: undefined;

	private menubar: Promise<Menubar>;

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@ILifecycleMainService private readonly lifecycleMainService: ILifecycleMainService,
		@ILogService private readonly logService: ILogService
	) {
		this.menubar = this.installMenuBarAfterWindowOpen();
	}

	private async installMenuBarAfterWindowOpen(): Promise<Menubar> {
		await this.lifecycleMainService.when(LifecycleMainPhase.AfterWindowOpen);

		return this.instantiationService.createInstance(Menubar);
	}

	async updateMenubar(windowId: number, menus: IMenubarData): Promise<void> {
		this.logService.trace('menubarService#updateMenubar', windowId);

		const menubar = await this.menubar;
		menubar.updateMenu(menus, windowId);
	}
}

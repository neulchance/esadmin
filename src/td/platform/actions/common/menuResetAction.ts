/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {localize2} from 'td/nls';
import {Categories} from 'td/platform/action/common/actionCommonCategories';
import {Action2, IMenuService} from 'td/platform/actions/common/actions';
import {ServicesAccessor} from 'td/platform/instantiation/common/instantiation';
import {ILogService} from 'td/platform/log/common/log';

export class MenuHiddenStatesReset extends Action2 {

	constructor() {
		super({
			id: 'menu.resetHiddenStates',
			title: localize2('title', "Reset All Menus"),
			category: Categories.View,
			f1: true
		});
	}

	run(accessor: ServicesAccessor): void {
		accessor.get(IMenuService).resetHiddenStates();
		accessor.get(ILogService).info('did RESET all menu hidden states');
	}
}

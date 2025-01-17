/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'td/css!./media/sidebarpart';
import {localize2} from 'td/nls';
import {Action2, registerAction2} from 'td/platform/actions/common/actions';
import {IWorkbenchLayoutService, Parts} from 'td/workbench/services/layout/browser/layoutService';
import {KeyMod, KeyCode} from 'td/base/common/keyCodes';
import {ServicesAccessor} from 'td/platform/instantiation/common/instantiation';
import {KeybindingWeight} from 'td/platform/keybinding/common/keybindingsRegistry';
import {Categories} from 'td/platform/action/common/actionCommonCategories';
import {IPaneCompositePartService} from 'td/workbench/services/panecomposite/browser/panecomposite';
import {ViewContainerLocation} from 'td/workbench/common/views';

export class FocusSideBarAction extends Action2 {

	constructor() {
		super({
			id: 'workbench.action.focusSideBar',
			title: localize2('focusSideBar', 'Focus into Primary Side Bar'),
			category: Categories.View,
			f1: true,
			keybinding: {
				weight: KeybindingWeight.WorkbenchContrib,
				when: null,
				primary: KeyMod.CtrlCmd | KeyCode.Digit0
			}
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const layoutService = accessor.get(IWorkbenchLayoutService);
		const paneCompositeService = accessor.get(IPaneCompositePartService);

		// Show side bar
		if (!layoutService.isVisible(Parts.SIDEBAR_PART)) {
			layoutService.setPartHidden(false, Parts.SIDEBAR_PART);
			return;
		}

		// Focus into active viewlet
		const viewlet = paneCompositeService.getActivePaneComposite(ViewContainerLocation.Sidebar);
		viewlet?.focus();
	}
}

registerAction2(FocusSideBarAction);

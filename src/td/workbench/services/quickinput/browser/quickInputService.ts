/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {ILayoutService} from 'td/platform/layout/browser/layoutService';
import {IInstantiationService} from 'td/platform/instantiation/common/instantiation';
import {IThemeService} from 'td/platform/theme/common/themeService';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {IContextKeyService} from 'td/platform/contextkey/common/contextkey';
import {IKeybindingService} from 'td/platform/keybinding/common/keybinding';
import {QuickInputController} from 'td/platform/quickinput/browser/quickInputController';
import {QuickInputService as BaseQuickInputService} from 'td/platform/quickinput/browser/quickInputService';
import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {IQuickInputService} from 'td/platform/quickinput/common/quickInput';
import {InQuickPickContextKey} from 'td/workbench/browser/quickaccess';
import {IHoverService} from 'td/platform/hover/browser/hover';

export class QuickInputService extends BaseQuickInputService {

	private readonly inQuickInputContext = InQuickPickContextKey.bindTo(this.contextKeyService);

	constructor(
		@IConfigurationService configurationService: IConfigurationService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IKeybindingService private readonly keybindingService: IKeybindingService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IThemeService themeService: IThemeService,
		@ILayoutService layoutService: ILayoutService,
		@IHoverService hoverService: IHoverService
	) {
		super(instantiationService, contextKeyService, themeService, layoutService, configurationService, hoverService);

		this.registerListeners();
	}

	private registerListeners(): void {
		this._register(this.onShow(() => this.inQuickInputContext.set(true)));
		this._register(this.onHide(() => this.inQuickInputContext.set(false)));
	}

	protected override createController(): QuickInputController {
		return super.createController(this.layoutService, {
			ignoreFocusOut: () => !this.configurationService.getValue('workbench.quickOpen.closeOnFocusLost'),
			backKeybindingLabel: () => this.keybindingService.lookupKeybinding('workbench.action.quickInputBack')?.getLabel() || undefined,
		});
	}
}

registerSingleton(IQuickInputService, QuickInputService, InstantiationType.Delayed);

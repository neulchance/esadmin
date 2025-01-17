/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IListRenderer, IListVirtualDelegate} from 'td/base/browser/ui/list/list';
import {List} from 'td/base/browser/ui/list/listWidget';
import {CancellationToken} from 'td/base/common/cancellation';
import {Emitter} from 'td/base/common/event';
import {IContextKey, IContextKeyService, RawContextKey} from 'td/platform/contextkey/common/contextkey';
import {IInstantiationService} from 'td/platform/instantiation/common/instantiation';
import {ILayoutService} from 'td/platform/layout/browser/layoutService';
import {IWorkbenchListOptions, WorkbenchList} from 'td/platform/list/browser/listService';
import {IOpenerService} from 'td/platform/opener/common/opener';
import {QuickAccessController} from 'td/platform/quickinput/browser/quickAccess';
import {IQuickAccessController} from 'td/platform/quickinput/common/quickAccess';
import {IInputBox, IInputOptions, IKeyMods, IPickOptions, IQuickInputButton, IQuickInputService, IQuickNavigateConfiguration, IQuickPick, IQuickPickItem, IQuickWidget, QuickPickInput} from 'td/platform/quickinput/common/quickInput';
import {defaultButtonStyles, defaultCountBadgeStyles, defaultInputBoxStyles, defaultKeybindingLabelStyles, defaultProgressBarStyles, defaultToggleStyles, getListStyles} from 'td/platform/theme/browser/defaultStyles';
import {activeContrastBorder, asCssVariable, pickerGroupBorder, pickerGroupForeground, quickInputBackground, quickInputForeground, quickInputListFocusBackground, quickInputListFocusForeground, quickInputListFocusIconForeground, quickInputTitleBackground, widgetBorder, widgetShadow} from 'td/platform/theme/common/colorRegistry';
import {IThemeService, Themable} from 'td/platform/theme/common/themeService';
import {IQuickInputOptions, IQuickInputStyles, QuickInputHoverDelegate} from './quickInput';
import {QuickInputController, IQuickInputControllerHost} from 'td/platform/quickinput/browser/quickInputController';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {IHoverService} from 'td/platform/hover/browser/hover';

export class QuickInputService extends Themable implements IQuickInputService {

	declare readonly _serviceBrand: undefined;

	get backButton(): IQuickInputButton { return this.controller.backButton; }

	private readonly _onShow = this._register(new Emitter<void>());
	readonly onShow = this._onShow.event;

	private readonly _onHide = this._register(new Emitter<void>());
	readonly onHide = this._onHide.event;

	private _controller: QuickInputController | undefined;
	private get controller(): QuickInputController {
		if (!this._controller) {
			this._controller = this._register(this.createController());
		}

		return this._controller;
	}

	private get hasController() { return !!this._controller; }

	private _quickAccess: IQuickAccessController | undefined;
	get quickAccess(): IQuickAccessController {
		if (!this._quickAccess) {
			this._quickAccess = this._register(this.instantiationService.createInstance(QuickAccessController));
		}

		return this._quickAccess;
	}

	private readonly contexts = new Map<string, IContextKey<boolean>>();

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IContextKeyService protected readonly contextKeyService: IContextKeyService,
		@IThemeService themeService: IThemeService,
		@ILayoutService protected readonly layoutService: ILayoutService,
		@IConfigurationService protected readonly configurationService: IConfigurationService,
		@IHoverService private readonly hoverService: IHoverService
	) {
		super(themeService);
	}

	protected createController(host: IQuickInputControllerHost = this.layoutService, options?: Partial<IQuickInputOptions>): QuickInputController {
		const defaultOptions: IQuickInputOptions = {
			idPrefix: 'quickInput_',
			container: host.activeContainer,
			ignoreFocusOut: () => false,
			backKeybindingLabel: () => undefined,
			setContextKey: (id?: string) => this.setContextKey(id),
			linkOpenerDelegate: (content) => {
				// HACK: https://github.com/microsoft/vscode/issues/173691
				this.instantiationService.invokeFunction(accessor => {
					const openerService = accessor.get(IOpenerService);
					openerService.open(content, {allowCommands: true, fromUserGesture: true});
				});
			},
			returnFocus: () => host.focus(),
			createList: <T>(
				user: string,
				container: HTMLElement,
				delegate: IListVirtualDelegate<T>,
				renderers: IListRenderer<T, any>[],
				options: IWorkbenchListOptions<T>
			) => this.instantiationService.createInstance(WorkbenchList, user, container, delegate, renderers, options) as List<T>,
			styles: this.computeStyles(),
			hoverDelegate: new QuickInputHoverDelegate(this.configurationService, this.hoverService)
		};

		const controller = this._register(new QuickInputController({
			...defaultOptions,
			...options
		},
			this.themeService,
			this.layoutService
		));

		controller.layout(host.activeContainerDimension, host.activeContainerOffset.quickPickTop);

		// Layout changes
		this._register(host.onDidLayoutActiveContainer(dimension => controller.layout(dimension, host.activeContainerOffset.quickPickTop)));
		this._register(host.onDidChangeActiveContainer(() => {
			if (controller.isVisible()) {
				return;
			}

			controller.layout(host.activeContainerDimension, host.activeContainerOffset.quickPickTop);
		}));

		// Context keys
		this._register(controller.onShow(() => {
			this.resetContextKeys();
			this._onShow.fire();
		}));
		this._register(controller.onHide(() => {
			this.resetContextKeys();
			this._onHide.fire();
		}));

		return controller;
	}

	private setContextKey(id?: string) {
		let key: IContextKey<boolean> | undefined;
		if (id) {
			key = this.contexts.get(id);
			if (!key) {
				key = new RawContextKey<boolean>(id, false)
					.bindTo(this.contextKeyService);
				this.contexts.set(id, key);
			}
		}

		if (key && key.get()) {
			return; // already active context
		}

		this.resetContextKeys();

		key?.set(true);
	}

	private resetContextKeys() {
		this.contexts.forEach(context => {
			if (context.get()) {
				context.reset();
			}
		});
	}

	pick<T extends IQuickPickItem, O extends IPickOptions<T>>(picks: Promise<QuickPickInput<T>[]> | QuickPickInput<T>[], options: O = <O>{}, token: CancellationToken = CancellationToken.None): Promise<(O extends { canPickMany: true } ? T[] : T) | undefined> {
		return this.controller.pick(picks, options, token);
	}

	input(options: IInputOptions = {}, token: CancellationToken = CancellationToken.None): Promise<string | undefined> {
		return this.controller.input(options, token);
	}

	createQuickPick<T extends IQuickPickItem>(): IQuickPick<T> {
		return this.controller.createQuickPick();
	}

	createInputBox(): IInputBox {
		return this.controller.createInputBox();
	}

	createQuickWidget(): IQuickWidget {
		return this.controller.createQuickWidget();
	}

	focus() {
		this.controller.focus();
	}

	toggle() {
		this.controller.toggle();
	}

	navigate(next: boolean, quickNavigate?: IQuickNavigateConfiguration) {
		this.controller.navigate(next, quickNavigate);
	}

	accept(keyMods?: IKeyMods) {
		return this.controller.accept(keyMods);
	}

	back() {
		return this.controller.back();
	}

	cancel() {
		return this.controller.cancel();
	}

	override updateStyles() {
		if (this.hasController) {
			this.controller.applyStyles(this.computeStyles());
		}
	}

	private computeStyles(): IQuickInputStyles {
		return {
			widget: {
				quickInputBackground: asCssVariable(quickInputBackground),
				quickInputForeground: asCssVariable(quickInputForeground),
				quickInputTitleBackground: asCssVariable(quickInputTitleBackground),
				widgetBorder: asCssVariable(widgetBorder),
				widgetShadow: asCssVariable(widgetShadow),
			},
			inputBox: defaultInputBoxStyles,
			toggle: defaultToggleStyles,
			countBadge: defaultCountBadgeStyles,
			button: defaultButtonStyles,
			progressBar: defaultProgressBarStyles,
			keybindingLabel: defaultKeybindingLabelStyles,
			list: getListStyles({
				listBackground: quickInputBackground,
				listFocusBackground: quickInputListFocusBackground,
				listFocusForeground: quickInputListFocusForeground,
				// Look like focused when inactive.
				listInactiveFocusForeground: quickInputListFocusForeground,
				listInactiveSelectionIconForeground: quickInputListFocusIconForeground,
				listInactiveFocusBackground: quickInputListFocusBackground,
				listFocusOutline: activeContrastBorder,
				listInactiveFocusOutline: activeContrastBorder,
			}),
			pickerGroup: {
				pickerGroupBorder: asCssVariable(pickerGroupBorder),
				pickerGroupForeground: asCssVariable(pickerGroupForeground),
			}
		};
	}
}

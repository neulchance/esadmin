/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'td/nls';
import {IViewletViewOptions} from 'td/workbench/browser/parts/views/viewsViewlet';
import {IInstantiationService} from 'td/platform/instantiation/common/instantiation';
import {IThemeService} from 'td/platform/theme/common/themeService';
import {IKeybindingService} from 'td/platform/keybinding/common/keybinding';
import {IContextMenuService} from 'td/platform/contextview/browser/contextView';
import {isTemporaryWorkspace, IWorkspaceContextService, WorkbenchState} from 'td/platform/workspace/common/workspace';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {ViewPane} from 'td/workbench/browser/parts/views/viewPane';
import {ResourcesDropHandler} from 'td/workbench/browser/dnd';
import {listDropOverBackground} from 'td/platform/theme/common/colorRegistry';
import {ILabelService} from 'td/platform/label/common/label';
import {IContextKeyService} from 'td/platform/contextkey/common/contextkey';
import {IViewDescriptorService} from 'td/workbench/common/views';
import {IOpenerService} from 'td/platform/opener/common/opener';
import {ITelemetryService} from 'td/platform/telemetry/common/telemetry';
import {isWeb} from 'td/base/common/platform';
import {DragAndDropObserver, getWindow} from 'td/base/browser/dom';
import {ILocalizedString} from 'td/platform/action/common/action';

export class EmptyView extends ViewPane {

	static readonly ID: string = 'workbench.explorer.emptyView';
	static readonly NAME: ILocalizedString = nls.localize2('noWorkspace', "No Folder Opened");
	private _disposed: boolean = false;

	constructor(
		options: IViewletViewOptions,
		@IThemeService themeService: IThemeService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@IConfigurationService configurationService: IConfigurationService,
		@ILabelService private labelService: ILabelService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IOpenerService openerService: IOpenerService,
		@ITelemetryService telemetryService: ITelemetryService,
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, telemetryService);

		this._register(this.contextService.onDidChangeWorkbenchState(() => this.refreshTitle()));
		this._register(this.labelService.onDidChangeFormatters(() => this.refreshTitle()));
	}

	override shouldShowWelcome(): boolean {
		return true;
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);

		this._register(new DragAndDropObserver(container, {
			onDrop: e => {
				container.style.backgroundColor = '';
				const dropHandler = this.instantiationService.createInstance(ResourcesDropHandler, {allowWorkspaceOpen: !isWeb || isTemporaryWorkspace(this.contextService.getWorkspace())});
				dropHandler.handleDrop(e, getWindow(container));
			},
			onDragEnter: () => {
				const color = this.themeService.getColorTheme().getColor(listDropOverBackground);
				container.style.backgroundColor = color ? color.toString() : '';
			},
			onDragEnd: () => {
				container.style.backgroundColor = '';
			},
			onDragLeave: () => {
				container.style.backgroundColor = '';
			},
			onDragOver: e => {
				if (e.dataTransfer) {
					e.dataTransfer.dropEffect = 'copy';
				}
			}
		}));

		this.refreshTitle();
	}

	private refreshTitle(): void {
		if (this._disposed) {
			return;
		}

		if (this.contextService.getWorkbenchState() === WorkbenchState.WORKSPACE) {
			this.updateTitle(EmptyView.NAME.value);
		} else {
			this.updateTitle(this.title);
		}
	}

	override dispose(): void {
		this._disposed = true;
		super.dispose();
	}
}

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {onDidChangeFullscreen, onDidChangeZoomLevel} from 'td/base/browser/browser';
import {detectFullscreen, hide, show} from 'td/base/browser/dom';
import {Emitter, Event} from 'td/base/common/event';
import {DisposableStore} from 'td/base/common/lifecycle';
import {isNative} from 'td/base/common/platform';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {IContextKeyService} from 'td/platform/contextkey/common/contextkey';
import {IInstantiationService} from 'td/platform/instantiation/common/instantiation';
import {ServiceCollection} from 'td/platform/instantiation/common/serviceCollection';
import {IStorageService} from 'td/platform/storage/common/storage';
import {IThemeService} from 'td/platform/theme/common/themeService';
import {getTitleBarStyle} from 'td/platform/window/common/window';
import {IEditorGroupView, IEditorPartsView} from 'td/workbench/browser/parts/editor/editor';
import {EditorPart, IEditorPartUIState} from 'td/workbench/browser/parts/editor/editorPart';
import {IAuxiliaryTitlebarPart} from 'td/workbench/browser/parts/titlebar/titlebarPart';
import {WindowTitle} from 'td/workbench/browser/parts/titlebar/windowTitle';
import {IAuxiliaryWindowOpenOptions, IAuxiliaryWindowService} from 'td/workbench/services/auxiliaryWindow/browser/auxiliaryWindowService';
import {GroupDirection, GroupsOrder, IAuxiliaryEditorPart} from 'td/workbench/services/editor/common/editorGroupsService';
import {IEditorService} from 'td/workbench/services/editor/common/editorService';
import {IHostService} from 'td/workbench/services/host/browser/host';
import {IWorkbenchLayoutService} from 'td/workbench/services/layout/browser/layoutService';
import {ILifecycleService} from 'td/workbench/services/lifecycle/common/lifecycle';
import {IStatusbarService} from 'td/workbench/services/statusbar/browser/statusbar';
import {ITitleService} from 'td/workbench/services/title/browser/titleService';

export interface IAuxiliaryEditorPartOpenOptions extends IAuxiliaryWindowOpenOptions {
	readonly state?: IEditorPartUIState;
}

export interface ICreateAuxiliaryEditorPartResult {
	readonly part: AuxiliaryEditorPartImpl;
	readonly instantiationService: IInstantiationService;
	readonly disposables: DisposableStore;
}

export class AuxiliaryEditorPart {

	private static STATUS_BAR_VISIBILITY = 'workbench.statusBar.visible';

	constructor(
		private readonly editorPartsView: IEditorPartsView,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IAuxiliaryWindowService private readonly auxiliaryWindowService: IAuxiliaryWindowService,
		@ILifecycleService private readonly lifecycleService: ILifecycleService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IStatusbarService private readonly statusbarService: IStatusbarService,
		@ITitleService private readonly titleService: ITitleService,
		@IEditorService private readonly editorService: IEditorService
	) {
	}

	async create(label: string, options?: IAuxiliaryEditorPartOpenOptions): Promise<ICreateAuxiliaryEditorPartResult> {

		function computeEditorPartHeightOffset(): number {
			let editorPartHeightOffset = 0;

			if (statusBarVisible) {
				editorPartHeightOffset += statusbarPart.height;
			}

			if (titlebarPart && titlebarPartVisible) {
				editorPartHeightOffset += titlebarPart.height;
			}

			return editorPartHeightOffset;
		}

		function updateStatusbarVisibility(fromEvent: boolean): void {
			if (statusBarVisible) {
				show(statusbarPart.container);
			} else {
				hide(statusbarPart.container);
			}

			updateEditorPartHeight(fromEvent);
		}

		function updateEditorPartHeight(fromEvent: boolean): void {
			editorPartContainer.style.height = `calc(100% - ${computeEditorPartHeightOffset()}px)`;

			if (fromEvent) {
				auxiliaryWindow.layout();
			}
		}

		const disposables = new DisposableStore();

		// Auxiliary Window
		const auxiliaryWindow = disposables.add(await this.auxiliaryWindowService.open(options));

		// Editor Part
		const editorPartContainer = document.createElement('div');
		editorPartContainer.classList.add('part', 'editor');
		editorPartContainer.setAttribute('role', 'main');
		editorPartContainer.style.position = 'relative';
		auxiliaryWindow.container.appendChild(editorPartContainer);

		const editorPart = disposables.add(this.instantiationService.createInstance(AuxiliaryEditorPartImpl, auxiliaryWindow.window.tddevWindowId, this.editorPartsView, options?.state, label));
		disposables.add(this.editorPartsView.registerPart(editorPart));
		editorPart.create(editorPartContainer);

		// Titlebar
		let titlebarPart: IAuxiliaryTitlebarPart | undefined = undefined;
		let titlebarPartVisible = false;
		const useCustomTitle = isNative && getTitleBarStyle(this.configurationService) === 'custom'; // custom title in aux windows only enabled in native
		if (useCustomTitle) {
			titlebarPart = disposables.add(this.titleService.createAuxiliaryTitlebarPart(auxiliaryWindow.container, editorPart));
			titlebarPartVisible = true;

			disposables.add(titlebarPart.onDidChange(() => updateEditorPartHeight(true)));
			disposables.add(onDidChangeZoomLevel(targetWindowId => {
				if (auxiliaryWindow.window.tddevWindowId === targetWindowId && titlebarPartVisible) {

					// This is a workaround for https://github.com/microsoft/vscode/issues/202377
					// The title bar part prevents zooming in certain cases and when doing so,
					// adjusts its size accordingly. This is however not reported from the
					// `onDidchange` event that we listen to above, so we manually update the
					// editor part height here.

					updateEditorPartHeight(true);
				}
			}));

			disposables.add(onDidChangeFullscreen(windowId => {
				if (windowId !== auxiliaryWindow.window.tddevWindowId) {
					return; // ignore all but our window
				}

				// Make sure to hide the custom title when we enter
				// fullscren mode and show it when we lave it.

				const fullscreen = detectFullscreen(auxiliaryWindow.window);
				const oldTitlebarPartVisible = titlebarPartVisible;
				titlebarPartVisible = !fullscreen;
				if (titlebarPart && oldTitlebarPartVisible !== titlebarPartVisible) {
					titlebarPart.container.style.display = titlebarPartVisible ? '' : 'none';

					updateEditorPartHeight(true);
				}
			}));
		} else {
			disposables.add(this.instantiationService.createInstance(WindowTitle, auxiliaryWindow.window, editorPart));
		}

		// Statusbar
		const statusbarPart = disposables.add(this.statusbarService.createAuxiliaryStatusbarPart(auxiliaryWindow.container));
		let statusBarVisible = this.configurationService.getValue<boolean>(AuxiliaryEditorPart.STATUS_BAR_VISIBILITY) !== false;
		disposables.add(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration(AuxiliaryEditorPart.STATUS_BAR_VISIBILITY)) {
				statusBarVisible = this.configurationService.getValue<boolean>(AuxiliaryEditorPart.STATUS_BAR_VISIBILITY) !== false;

				updateStatusbarVisibility(true);
			}
		}));

		updateStatusbarVisibility(false);

		// Lifecycle
		const editorCloseListener = disposables.add(Event.once(editorPart.onWillClose)(() => auxiliaryWindow.window.close()));
		disposables.add(Event.once(auxiliaryWindow.onUnload)(() => {
			if (disposables.isDisposed) {
				return; // the close happened as part of an earlier dispose call
			}

			editorCloseListener.dispose();
			editorPart.close();
			disposables.dispose();
		}));
		disposables.add(Event.once(this.lifecycleService.onDidShutdown)(() => disposables.dispose()));

		// Layout
		disposables.add(auxiliaryWindow.onDidLayout(dimension => {
			const titlebarPartHeight = titlebarPart?.height ?? 0;
			titlebarPart?.layout(dimension.width, titlebarPartHeight, 0, 0);

			const editorPartHeight = dimension.height - computeEditorPartHeightOffset();
			editorPart.layout(dimension.width, editorPartHeight, titlebarPartHeight, 0);

			statusbarPart.layout(dimension.width, statusbarPart.height, dimension.height - statusbarPart.height, 0);
		}));
		auxiliaryWindow.layout();

		// Have a InstantiationService that is scoped to the auxiliary window
		const instantiationService = this.instantiationService.createChild(new ServiceCollection(
			[IStatusbarService, this.statusbarService.createScoped(statusbarPart, disposables)],
			[IEditorService, this.editorService.createScoped(editorPart, disposables)]
		));

		return {
			part: editorPart,
			instantiationService,
			disposables
		};
	}
}

class AuxiliaryEditorPartImpl extends EditorPart implements IAuxiliaryEditorPart {

	private static COUNTER = 1;

	private readonly _onWillClose = this._register(new Emitter<void>());
	readonly onWillClose = this._onWillClose.event;

	constructor(
		windowId: number,
		editorPartsView: IEditorPartsView,
		private readonly state: IEditorPartUIState | undefined,
		groupsLabel: string,
		@IInstantiationService instantiationService: IInstantiationService,
		@IThemeService themeService: IThemeService,
		@IConfigurationService configurationService: IConfigurationService,
		@IStorageService storageService: IStorageService,
		@IWorkbenchLayoutService layoutService: IWorkbenchLayoutService,
		@IHostService hostService: IHostService,
		@IContextKeyService contextKeyService: IContextKeyService
	) {
		const id = AuxiliaryEditorPartImpl.COUNTER++;
		super(editorPartsView, `workbench.parts.auxiliaryEditor.${id}`, groupsLabel, windowId, instantiationService, themeService, configurationService, storageService, layoutService, hostService, contextKeyService);
	}

	override removeGroup(group: number | IEditorGroupView, preserveFocus?: boolean): void {

		// Close aux window when last group removed
		const groupView = this.assertGroupView(group);
		if (this.count === 1 && this.activeGroup === groupView) {
			this.doRemoveLastGroup(preserveFocus);
		}

		// Otherwise delegate to parent implementation
		else {
			super.removeGroup(group, preserveFocus);
		}
	}

	private doRemoveLastGroup(preserveFocus?: boolean): void {
		const restoreFocus = !preserveFocus && this.shouldRestoreFocus(this.container);

		// Activate next group
		const mostRecentlyActiveGroups = this.editorPartsView.getGroups(GroupsOrder.MOST_RECENTLY_ACTIVE);
		const nextActiveGroup = mostRecentlyActiveGroups[1]; // [0] will be the current group we are about to dispose
		if (nextActiveGroup) {
			nextActiveGroup.groupsView.activateGroup(nextActiveGroup);

			if (restoreFocus) {
				nextActiveGroup.focus();
			}
		}

		this.doClose(false /* do not merge any groups to main part */);
	}

	protected override loadState(): IEditorPartUIState | undefined {
		return this.state;
	}

	protected override saveState(): void {
		return; // disabled, auxiliary editor part state is tracked outside
	}

	close(): void {
		this.doClose(true /* merge all groups to main part */);
	}

	private doClose(mergeGroupsToMainPart: boolean): void {
		if (mergeGroupsToMainPart) {
			this.mergeGroupsToMainPart();
		}

		this._onWillClose.fire();
	}

	private mergeGroupsToMainPart(): void {
		if (!this.groups.some(group => group.count > 0)) {
			return; // skip if we have no editors opened
		}

		// Find the most recent group that is not locked
		let targetGroup: IEditorGroupView | undefined = undefined;
		for (const group of this.editorPartsView.mainPart.getGroups(GroupsOrder.MOST_RECENTLY_ACTIVE)) {
			if (!group.isLocked) {
				targetGroup = group;
				break;
			}
		}

		if (!targetGroup) {
			targetGroup = this.editorPartsView.mainPart.addGroup(this.editorPartsView.mainPart.activeGroup, this.partOptions.openSideBySideDirection === 'right' ? GroupDirection.RIGHT : GroupDirection.DOWN);
		}

		this.mergeAllGroups(targetGroup);
		targetGroup.focus();
	}
}
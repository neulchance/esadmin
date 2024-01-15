/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'td/css!./media/editorplaceholder';
import {localize} from 'td/nls';
import {truncate, truncateMiddle} from 'td/base/common/strings';
import Severity from 'td/base/common/severity';
import {IEditorOpenContext, isEditorOpenError} from 'td/workbench/common/editor';
import {EditorInput} from 'td/workbench/common/editor/editorInput';
import {EditorPane} from 'td/workbench/browser/parts/editor/editorPane';
import {ITelemetryService} from 'td/platform/telemetry/common/telemetry';
import {DomScrollableElement} from 'td/base/browser/ui/scrollbar/scrollableElement';
import {ScrollbarVisibility} from 'td/base/common/scrollable';
import {IThemeService} from 'td/platform/theme/common/themeService';
import {Dimension, size, clearNode, $, EventHelper} from 'td/base/browser/dom';
import {CancellationToken} from 'td/base/common/cancellation';
import {DisposableStore, IDisposable, MutableDisposable} from 'td/base/common/lifecycle';
import {IStorageService} from 'td/platform/storage/common/storage';
import {assertAllDefined} from 'td/base/common/types';
import {ICommandService} from 'td/platform/commands/common/commands';
import {IWorkspaceContextService, isSingleFolderWorkspaceIdentifier, toWorkspaceIdentifier} from 'td/platform/workspace/common/workspace';
import {EditorOpenSource, IEditorOptions} from 'td/platform/editor/common/editor';
import {computeEditorAriaLabel, EditorPaneDescriptor} from 'td/workbench/browser/editor';
import {ButtonBar} from 'td/base/browser/ui/button/button';
import {defaultButtonStyles} from 'td/platform/theme/browser/defaultStyles';
import {SimpleIconLabel} from 'td/base/browser/ui/iconLabel/simpleIconLabel';
import {FileChangeType, FileOperationError, FileOperationResult, IFileService} from 'td/platform/files/common/files';
import {toErrorMessage} from 'td/base/common/errorMessage';
import {IDialogService} from 'td/platform/dialogs/common/dialogs';

export interface IEditorPlaceholderContents {
	icon: string;
	label: string;
	actions: IEditorPlaceholderContentsAction[];
}

export interface IEditorPlaceholderContentsAction {
	label: string;
	run: () => unknown;
}

export interface IErrorEditorPlaceholderOptions extends IEditorOptions {
	error?: Error;
}

export abstract class EditorPlaceholder extends EditorPane {

	protected static readonly PLACEHOLDER_LABEL_MAX_LENGTH = 1024;

	private container: HTMLElement | undefined;
	private scrollbar: DomScrollableElement | undefined;
	private inputDisposable = this._register(new MutableDisposable());

	constructor(
		id: string,
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IStorageService storageService: IStorageService
	) {
		super(id, telemetryService, themeService, storageService);
	}

	protected createEditor(parent: HTMLElement): void {

		// Container
		this.container = document.createElement('div');
		this.container.className = 'monaco-editor-pane-placeholder';
		this.container.style.outline = 'none';
		this.container.tabIndex = 0; // enable focus support from the editor part (do not remove)

		// Custom Scrollbars
		this.scrollbar = this._register(new DomScrollableElement(this.container, {horizontal: ScrollbarVisibility.Auto, vertical: ScrollbarVisibility.Auto}));
		parent.appendChild(this.scrollbar.getDomNode());
	}

	override async setInput(input: EditorInput, options: IEditorOptions | undefined, context: IEditorOpenContext, token: CancellationToken): Promise<void> {
		await super.setInput(input, options, context, token);

		// Check for cancellation
		if (token.isCancellationRequested) {
			return;
		}

		// Render Input
		this.inputDisposable.value = await this.renderInput(input, options);
	}

	private async renderInput(input: EditorInput, options: IEditorOptions | undefined): Promise<IDisposable> {
		const [container, scrollbar] = assertAllDefined(this.container, this.scrollbar);

		// Reset any previous contents
		clearNode(container);

		// Delegate to implementation for contents
		const disposables = new DisposableStore();
		const {icon, label, actions} = await this.getContents(input, options, disposables);
		const truncatedLabel = truncate(label, EditorPlaceholder.PLACEHOLDER_LABEL_MAX_LENGTH);

		// Icon
		const iconContainer = container.appendChild($('.editor-placeholder-icon-container'));
		const iconWidget = new SimpleIconLabel(iconContainer);
		iconWidget.text = icon;

		// Label
		const labelContainer = container.appendChild($('.editor-placeholder-label-container'));
		const labelWidget = document.createElement('span');
		labelWidget.textContent = truncatedLabel;
		labelContainer.appendChild(labelWidget);

		// ARIA label
		container.setAttribute('aria-label', `${computeEditorAriaLabel(input, undefined, this.group, undefined)}, ${truncatedLabel}`);

		// Buttons
		if (actions.length) {
			const actionsContainer = container.appendChild($('.editor-placeholder-buttons-container'));
			const buttons = disposables.add(new ButtonBar(actionsContainer));

			for (let i = 0; i < actions.length; i++) {
				const button = disposables.add(buttons.addButton({
					...defaultButtonStyles,
					secondary: i !== 0
				}));

				button.label = actions[i].label;
				disposables.add(button.onDidClick(e => {
					if (e) {
						EventHelper.stop(e, true);
					}

					actions[i].run();
				}));
			}
		}

		// Adjust scrollbar
		scrollbar.scanDomNode();

		return disposables;
	}

	protected abstract getContents(input: EditorInput, options: IEditorOptions | undefined, disposables: DisposableStore): Promise<IEditorPlaceholderContents>;

	override clearInput(): void {
		if (this.container) {
			clearNode(this.container);
		}

		this.inputDisposable.clear();

		super.clearInput();
	}

	layout(dimension: Dimension): void {
		const [container, scrollbar] = assertAllDefined(this.container, this.scrollbar);

		// Pass on to Container
		size(container, dimension.width, dimension.height);

		// Adjust scrollbar
		scrollbar.scanDomNode();

		// Toggle responsive class
		container.classList.toggle('max-height-200px', dimension.height <= 200);
	}

	override focus(): void {
		super.focus();

		this.container?.focus();
	}

	override dispose(): void {
		this.container?.remove();

		super.dispose();
	}
}

export class WorkspaceTrustRequiredPlaceholderEditor extends EditorPlaceholder {

	static readonly ID = 'workbench.editors.workspaceTrustRequiredEditor';
	private static readonly LABEL = localize('trustRequiredEditor', "Workspace Trust Required");

	static readonly DESCRIPTOR = EditorPaneDescriptor.create(WorkspaceTrustRequiredPlaceholderEditor, WorkspaceTrustRequiredPlaceholderEditor.ID, WorkspaceTrustRequiredPlaceholderEditor.LABEL);

	constructor(
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@ICommandService private readonly commandService: ICommandService,
		@IWorkspaceContextService private readonly workspaceService: IWorkspaceContextService,
		@IStorageService storageService: IStorageService
	) {
		super(WorkspaceTrustRequiredPlaceholderEditor.ID, telemetryService, themeService, storageService);
	}

	override getTitle(): string {
		return WorkspaceTrustRequiredPlaceholderEditor.LABEL;
	}

	protected async getContents(): Promise<IEditorPlaceholderContents> {
		return {
			icon: '$(workspace-untrusted)',
			label: isSingleFolderWorkspaceIdentifier(toWorkspaceIdentifier(this.workspaceService.getWorkspace())) ?
				localize('requiresFolderTrustText', "The file is not displayed in the editor because trust has not been granted to the folder.") :
				localize('requiresWorkspaceTrustText', "The file is not displayed in the editor because trust has not been granted to the workspace."),
			actions: [
				{
					label: localize('manageTrust', "Manage Workspace Trust"),
					run: () => this.commandService.executeCommand('workbench.trust.manage')
				}
			]
		};
	}
}

export class ErrorPlaceholderEditor extends EditorPlaceholder {

	private static readonly ID = 'workbench.editors.errorEditor';
	private static readonly LABEL = localize('errorEditor', "Error Editor");

	static readonly DESCRIPTOR = EditorPaneDescriptor.create(ErrorPlaceholderEditor, ErrorPlaceholderEditor.ID, ErrorPlaceholderEditor.LABEL);

	constructor(
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IStorageService storageService: IStorageService,
		@IFileService private readonly fileService: IFileService,
		@IDialogService private readonly dialogService: IDialogService
	) {
		super(ErrorPlaceholderEditor.ID, telemetryService, themeService, storageService);
	}

	protected async getContents(input: EditorInput, options: IErrorEditorPlaceholderOptions, disposables: DisposableStore): Promise<IEditorPlaceholderContents> {
		const resource = input.resource;
		const group = this.group;
		const error = options.error;
		const isFileNotFound = (<FileOperationError | undefined>error)?.fileOperationResult === FileOperationResult.FILE_NOT_FOUND;

		// Error Label
		let label: string;
		if (isFileNotFound) {
			label = localize('unavailableResourceErrorEditorText', "The editor could not be opened because the file was not found.");
		} else if (isEditorOpenError(error) && error.forceMessage) {
			label = error.message;
		} else if (error) {
			label = localize('unknownErrorEditorTextWithError', "The editor could not be opened due to an unexpected error: {0}", truncateMiddle(toErrorMessage(error), EditorPlaceholder.PLACEHOLDER_LABEL_MAX_LENGTH / 2));
		} else {
			label = localize('unknownErrorEditorTextWithoutError', "The editor could not be opened due to an unexpected error.");
		}

		// Error Icon
		let icon = '$(error)';
		if (isEditorOpenError(error)) {
			if (error.forceSeverity === Severity.Info) {
				icon = '$(info)';
			} else if (error.forceSeverity === Severity.Warning) {
				icon = '$(warning)';
			}
		}

		// Actions
		let actions: IEditorPlaceholderContentsAction[] | undefined = undefined;
		if (isEditorOpenError(error) && error.actions.length > 0) {
			actions = error.actions.map(action => {
				return {
					label: action.label,
					run: () => {
						const result = action.run();
						if (result instanceof Promise) {
							result.catch(error => this.dialogService.error(toErrorMessage(error)));
						}
					}
				};
			});
		} else if (group) {
			actions = [
				{
					label: localize('retry', "Try Again"),
					run: () => group.openEditor(input, {...options, source: EditorOpenSource.USER /* explicit user gesture */})
				}
			];
		}

		// Auto-reload when file is added
		if (group && isFileNotFound && resource && this.fileService.hasProvider(resource)) {
			disposables.add(this.fileService.onDidFilesChange(e => {
				if (e.contains(resource, FileChangeType.ADDED, FileChangeType.UPDATED)) {
					group.openEditor(input, options);
				}
			}));
		}

		return {icon, label, actions: actions ?? []};
	}
}

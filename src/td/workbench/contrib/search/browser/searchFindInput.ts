/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IContextViewProvider} from 'td/base/browser/ui/contextview/contextview';
import {IFindInputOptions} from 'td/base/browser/ui/findinput/findInput';
import {IContextKeyService} from 'td/platform/contextkey/common/contextkey';
import {IContextMenuService} from 'td/platform/contextview/browser/contextView';
import {ContextScopedFindInput} from 'td/platform/history/browser/contextScopedHistoryWidget';
import {IInstantiationService} from 'td/platform/instantiation/common/instantiation';
import {NotebookFindFilters} from 'td/workbench/contrib/notebook/browser/contrib/find/findFilters';
import {NotebookFindInputFilterButton} from 'td/workbench/contrib/notebook/browser/contrib/find/notebookFindReplaceWidget';
import * as nls from 'td/nls';

export class SearchFindInput extends ContextScopedFindInput {
	private _findFilter: NotebookFindInputFilterButton;
	private _filterChecked: boolean = false;
	private _visible: boolean = false;

	constructor(
		container: HTMLElement | null,
		contextViewProvider: IContextViewProvider,
		options: IFindInputOptions,
		contextKeyService: IContextKeyService,
		readonly contextMenuService: IContextMenuService,
		readonly instantiationService: IInstantiationService,
		readonly filters: NotebookFindFilters,
		filterStartVisiblitity: boolean
	) {
		super(container, contextViewProvider, options, contextKeyService);
		this._findFilter = this._register(
			new NotebookFindInputFilterButton(
				filters,
				contextMenuService,
				instantiationService,
				options,
				nls.localize('searchFindInputNotebookFilter.label', "Notebook Find Filters")
			));
		this.inputBox.paddingRight = (this.caseSensitive?.width() ?? 0) + (this.wholeWords?.width() ?? 0) + (this.regex?.width() ?? 0) + this._findFilter.width;
		this.controls.appendChild(this._findFilter.container);
		this._findFilter.container.classList.add('monaco-custom-toggle');

		this.filterVisible = filterStartVisiblitity;
	}

	set filterVisible(show: boolean) {
		this._findFilter.container.style.display = show ? '' : 'none';
		this._visible = show;
		this.updateStyles();
	}

	override setEnabled(enabled: boolean) {
		super.setEnabled(enabled);
		if (enabled && (!this._filterChecked || !this._visible)) {
			this.regex?.enable();
		} else {
			this.regex?.disable();
		}
	}

	updateStyles() {
		// filter is checked if it's in a non-default state
		this._filterChecked =
			!this.filters.markupInput ||
			!this.filters.markupPreview ||
			!this.filters.codeInput ||
			!this.filters.codeOutput;

		// TODO: find a way to express that searching notebook output and markdown preview don't support regex.

		this._findFilter.applyStyles(this._filterChecked);
	}
}

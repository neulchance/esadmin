/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {localize, localize2} from 'td/nls';
import {Action2} from 'td/platform/actions/common/actions';
import {ILocalizedString} from 'td/platform/action/common/action';
import product from 'td/platform/product/common/product';
import {IDialogService} from 'td/platform/dialogs/common/dialogs';
import {ServicesAccessor} from 'td/platform/instantiation/common/instantiation';
import {INativeHostService} from 'td/platform/native/common/native';
import {toErrorMessage} from 'td/base/common/errorMessage';
import {IProductService} from 'td/platform/product/common/productService';
import {isCancellationError} from 'td/base/common/errors';

const shellCommandCategory: ILocalizedString = localize2('shellCommand', 'Shell Command');

export class InstallShellScriptAction extends Action2 {

	constructor() {
		super({
			id: 'workbench.action.installCommandLine',
			title: localize2('install', "Install '{0}' command in PATH", product.applicationName),
			category: shellCommandCategory,
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const nativeHostService = accessor.get(INativeHostService);
		const dialogService = accessor.get(IDialogService);
		const productService = accessor.get(IProductService);

		try {
			await nativeHostService.installShellCommand();

			dialogService.info(localize('successIn', "Shell command '{0}' successfully installed in PATH.", productService.applicationName));
		} catch (error) {
			if (isCancellationError(error)) {
				return;
			}

			dialogService.error(toErrorMessage(error));
		}
	}
}

export class UninstallShellScriptAction extends Action2 {

	constructor() {
		super({
			id: 'workbench.action.uninstallCommandLine',
			title: localize2('uninstall', "Uninstall '{0}' command from PATH", product.applicationName),
			category: shellCommandCategory,
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const nativeHostService = accessor.get(INativeHostService);
		const dialogService = accessor.get(IDialogService);
		const productService = accessor.get(IProductService);

		try {
			await nativeHostService.uninstallShellCommand();

			dialogService.info(localize('successFrom', "Shell command '{0}' successfully uninstalled from PATH.", productService.applicationName));
		} catch (error) {
			if (isCancellationError(error)) {
				return;
			}

			dialogService.error(toErrorMessage(error));
		}
	}
}

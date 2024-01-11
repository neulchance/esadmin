/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'td/base/common/path';
import * as platform from 'td/base/common/platform';
import {URI} from 'td/base/common/uri';
import {IExtensionDescription, ExtensionType} from 'td/platform/extensions/common/extensions';
import {dedupExtensions} from 'td/workbench/services/extensions/common/extensionsUtil';
import {IExtensionsScannerService, IScannedExtension, toExtensionDescription} from 'td/platform/extensionManagement/common/extensionsScannerService';
import {ILogService} from 'td/platform/log/common/log';
import Severity from 'td/base/common/severity';
import {localize} from 'td/nls';
import {INotificationService} from 'td/platform/notification/common/notification';
import {IHostService} from 'td/workbench/services/host/browser/host';
import {timeout} from 'td/base/common/async';
import {IUserDataProfileService} from 'td/workbench/services/userDataProfile/common/userDataProfile';
import {getErrorMessage} from 'td/base/common/errors';

export class CachedExtensionScanner {

	public readonly scannedExtensions: Promise<IExtensionDescription[]>;
	private _scannedExtensionsResolve!: (result: IExtensionDescription[]) => void;
	private _scannedExtensionsReject!: (err: any) => void;

	constructor(
		@INotificationService private readonly _notificationService: INotificationService,
		@IHostService private readonly _hostService: IHostService,
		@IExtensionsScannerService private readonly _extensionsScannerService: IExtensionsScannerService,
		@IUserDataProfileService private readonly _userDataProfileService: IUserDataProfileService,
		@ILogService private readonly _logService: ILogService,
	) {
		this.scannedExtensions = new Promise<IExtensionDescription[]>((resolve, reject) => {
			this._scannedExtensionsResolve = resolve;
			this._scannedExtensionsReject = reject;
		});
	}

	public async scanSingleExtension(extensionPath: string, isBuiltin: boolean): Promise<IExtensionDescription | null> {
		const scannedExtension = await this._extensionsScannerService.scanExistingExtension(URI.file(path.resolve(extensionPath)), isBuiltin ? ExtensionType.System : ExtensionType.User, {language: platform.language});
		return scannedExtension ? toExtensionDescription(scannedExtension, false) : null;
	}

	public async startScanningExtensions(): Promise<void> {
		try {
			const extensions = await this._scanInstalledExtensions();
			this._scannedExtensionsResolve(extensions);
		} catch (err) {
			this._scannedExtensionsReject(err);
		}
	}

	private async _scanInstalledExtensions(): Promise<IExtensionDescription[]> {
		try {
			const language = platform.language;
			const result = await Promise.allSettled([
				this._extensionsScannerService.scanSystemExtensions({language, useCache: true, checkControlFile: true}),
				this._extensionsScannerService.scanUserExtensions({language, profileLocation: this._userDataProfileService.currentProfile.extensionsResource, useCache: true})]);

			let scannedSystemExtensions: IScannedExtension[] = [],
				scannedUserExtensions: IScannedExtension[] = [],
				scannedDevelopedExtensions: IScannedExtension[] = [],
				hasErrors = false;

			if (result[0].status === 'fulfilled') {
				scannedSystemExtensions = result[0].value;
			} else {
				hasErrors = true;
				this._logService.error(`Error scanning system extensions:`, getErrorMessage(result[0].reason));
			}

			if (result[1].status === 'fulfilled') {
				scannedUserExtensions = result[1].value;
			} else {
				hasErrors = true;
				this._logService.error(`Error scanning user extensions:`, getErrorMessage(result[1].reason));
			}

			try {
				scannedDevelopedExtensions = await this._extensionsScannerService.scanExtensionsUnderDevelopment({language}, [...scannedSystemExtensions, ...scannedUserExtensions]);
			} catch (error) {
				this._logService.error(error);
			}

			const system = scannedSystemExtensions.map(e => toExtensionDescription(e, false));
			const user = scannedUserExtensions.map(e => toExtensionDescription(e, false));
			const development = scannedDevelopedExtensions.map(e => toExtensionDescription(e, true));
			const r = dedupExtensions(system, user, development, this._logService);

			if (!hasErrors) {
				const disposable = this._extensionsScannerService.onDidChangeCache(() => {
					disposable.dispose();
					this._notificationService.prompt(
						Severity.Error,
						localize('extensionCache.invalid', "Extensions have been modified on disk. Please reload the window."),
						[{
							label: localize('reloadWindow', "Reload Window"),
							run: () => this._hostService.reload()
						}]
					);
				});
				timeout(5000).then(() => disposable.dispose());
			}

			return r;
		} catch (err) {
			this._logService.error(`Error scanning installed extensions:`);
			this._logService.error(err);
			return [];
		}
	}

}

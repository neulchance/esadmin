/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {Emitter} from 'td/base/common/event';
import {INativeHostService} from 'td/platform/native/common/native';
import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {Disposable} from 'td/base/common/lifecycle';
import {IHostColorSchemeService} from 'td/workbench/services/themes/common/hostColorSchemeService';
import {INativeWorkbenchEnvironmentService} from 'td/workbench/services/environment/electron-sandbox/environmentService';
import {IStorageService, StorageScope, StorageTarget} from 'td/platform/storage/common/storage';
import {isBoolean, isObject} from 'td/base/common/types';
import {IColorScheme} from 'td/platform/window/common/window';

export class NativeHostColorSchemeService extends Disposable implements IHostColorSchemeService {

	static readonly STORAGE_KEY = 'HostColorSchemeData';

	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeColorScheme = this._register(new Emitter<void>());
	readonly onDidChangeColorScheme = this._onDidChangeColorScheme.event;

	// public dark: boolean;
	// public highContrast: boolean;

	constructor(
		@INativeHostService private readonly nativeHostService: INativeHostService,
		@INativeWorkbenchEnvironmentService environmentService: INativeWorkbenchEnvironmentService,
		@IStorageService private storageService: IStorageService
	) {
		super();

		// register listener with the OS
		this._register(this.nativeHostService.onDidChangeColorScheme(scheme => this.update(scheme)));

		const initial = this.getStoredValue() ?? environmentService.window.colorScheme;
		// this.dark = initial.dark;
		// this.highContrast = initial.highContrast;

		// fetch the actual value from the OS
		this.nativeHostService.getOSColorScheme().then(scheme => this.update(scheme));
	}

	private getStoredValue(): IColorScheme | undefined {
		const stored = this.storageService.get(NativeHostColorSchemeService.STORAGE_KEY, StorageScope.APPLICATION);
		if (stored) {
			try {
				const scheme = JSON.parse(stored);
				if (isObject(scheme) && isBoolean(scheme.highContrast) && isBoolean(scheme.dark)) {
					return scheme as IColorScheme;
				}
			} catch (e) {
				// ignore
			}
		}
		return undefined;
	}

	private update({highContrast, dark}: IColorScheme) {
		if (dark !== this.dark || highContrast !== this.highContrast) {

			this.dark = dark;
			this.highContrast = highContrast;
			this.storageService.store(NativeHostColorSchemeService.STORAGE_KEY, JSON.stringify({highContrast, dark}), StorageScope.APPLICATION, StorageTarget.MACHINE);
			this._onDidChangeColorScheme.fire();
		}
	}

}

registerSingleton(IHostColorSchemeService, NativeHostColorSchemeService, InstantiationType.Delayed);

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {Disposable} from 'td/base/common/lifecycle';
import {IKeyboardLayoutInfo, IKeyboardMapping, IMacLinuxKeyboardMapping, IWindowsKeyboardMapping, macLinuxKeyboardMappingEquals, windowsKeyboardMappingEquals} from 'td/platform/keyboardLayout/common/keyboardLayout';
import {Emitter, Event} from 'td/base/common/event';
import {OperatingSystem, OS} from 'td/base/common/platform';
import {IMainProcessService} from 'td/platform/ipc/common/mainProcessService';
import {INativeKeyboardLayoutService as IBaseNativeKeyboardLayoutService} from 'td/platform/keyboardLayout/common/keyboardLayoutService';
import {ProxyChannel} from 'td/base/parts/ipc/common/ipc';
import {createDecorator} from 'td/platform/instantiation/common/instantiation';

export const INativeKeyboardLayoutService = createDecorator<INativeKeyboardLayoutService>('nativeKeyboardLayoutService');

export interface INativeKeyboardLayoutService {
	readonly _serviceBrand: undefined;
	readonly onDidChangeKeyboardLayout: Event<void>;
	getRawKeyboardMapping(): IKeyboardMapping | null;
	getCurrentKeyboardLayout(): IKeyboardLayoutInfo | null;
}

export class NativeKeyboardLayoutService extends Disposable implements INativeKeyboardLayoutService {

	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeKeyboardLayout = this._register(new Emitter<void>());
	readonly onDidChangeKeyboardLayout = this._onDidChangeKeyboardLayout.event;

	private readonly _keyboardLayoutService: IBaseNativeKeyboardLayoutService;
	private _initPromise: Promise<void> | null;
	private _keyboardMapping: IKeyboardMapping | null;
	private _keyboardLayoutInfo: IKeyboardLayoutInfo | null;

	constructor(
		@IMainProcessService mainProcessService: IMainProcessService
	) {
		super();
		this._keyboardLayoutService = ProxyChannel.toService<IBaseNativeKeyboardLayoutService>(mainProcessService.getChannel('keyboardLayout'));
		this._initPromise = null;
		this._keyboardMapping = null;
		this._keyboardLayoutInfo = null;

		this._register(this._keyboardLayoutService.onDidChangeKeyboardLayout(async ({keyboardLayoutInfo, keyboardMapping}) => {
			await this.initialize();
			if (keyboardMappingEquals(this._keyboardMapping, keyboardMapping)) {
				// the mappings are equal
				return;
			}

			this._keyboardMapping = keyboardMapping;
			this._keyboardLayoutInfo = keyboardLayoutInfo;
			this._onDidChangeKeyboardLayout.fire();
		}));
	}

	public initialize(): Promise<void> {
		if (!this._initPromise) {
			this._initPromise = this._doInitialize();
		}
		return this._initPromise;
	}

	private async _doInitialize(): Promise<void> {
		const keyboardLayoutData = await this._keyboardLayoutService.getKeyboardLayoutData();
		const {keyboardLayoutInfo, keyboardMapping} = keyboardLayoutData;
		this._keyboardMapping = keyboardMapping;
		this._keyboardLayoutInfo = keyboardLayoutInfo;
	}

	public getRawKeyboardMapping(): IKeyboardMapping | null {
		return this._keyboardMapping;
	}

	public getCurrentKeyboardLayout(): IKeyboardLayoutInfo | null {
		return this._keyboardLayoutInfo;
	}
}

function keyboardMappingEquals(a: IKeyboardMapping | null, b: IKeyboardMapping | null): boolean {
	if (OS === OperatingSystem.Windows) {
		return windowsKeyboardMappingEquals(<IWindowsKeyboardMapping | null>a, <IWindowsKeyboardMapping | null>b);
	}

	return macLinuxKeyboardMappingEquals(<IMacLinuxKeyboardMapping | null>a, <IMacLinuxKeyboardMapping | null>b);
}

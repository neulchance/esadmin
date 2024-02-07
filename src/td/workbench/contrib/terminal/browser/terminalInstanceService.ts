/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {ITerminalInstance, ITerminalInstanceService} from 'td/workbench/contrib/terminal/browser/terminal';
import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {Disposable} from 'td/base/common/lifecycle';
import {IShellLaunchConfig, ITerminalBackend, ITerminalBackendRegistry, ITerminalProfile, TerminalExtensions, TerminalLocation} from 'td/platform/terminal/common/terminal';
import {IInstantiationService} from 'td/platform/instantiation/common/instantiation';
import {TerminalInstance} from 'td/workbench/contrib/terminal/browser/terminalInstance';
import {IContextKey, IContextKeyService} from 'td/platform/contextkey/common/contextkey';
import {TerminalConfigHelper} from 'td/workbench/contrib/terminal/browser/terminalConfigHelper';
import {URI} from 'td/base/common/uri';
import {Emitter, Event} from 'td/base/common/event';
import {TerminalContextKeys} from 'td/workbench/contrib/terminal/common/terminalContextKey';
import {Registry} from 'td/platform/registry/common/platform';
import {IWorkbenchEnvironmentService} from 'td/workbench/services/environment/common/environmentService';

export class TerminalInstanceService extends Disposable implements ITerminalInstanceService {
	declare _serviceBrand: undefined;
	private _terminalShellTypeContextKey: IContextKey<string>;
	private _terminalInRunCommandPicker: IContextKey<boolean>;
	private _configHelper: TerminalConfigHelper;
	private _backendRegistration = new Map<string | undefined, { promise: Promise<void>; resolve: () => void }>();

	private readonly _onDidCreateInstance = this._register(new Emitter<ITerminalInstance>());
	get onDidCreateInstance(): Event<ITerminalInstance> { return this._onDidCreateInstance.event; }

	constructor(
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@IContextKeyService private readonly _contextKeyService: IContextKeyService,
		@IWorkbenchEnvironmentService readonly _environmentService: IWorkbenchEnvironmentService,
	) {
		super();
		this._terminalShellTypeContextKey = TerminalContextKeys.shellType.bindTo(this._contextKeyService);
		this._terminalInRunCommandPicker = TerminalContextKeys.inTerminalRunCommandPicker.bindTo(this._contextKeyService);
		this._configHelper = _instantiationService.createInstance(TerminalConfigHelper);


		for (const remoteAuthority of [undefined, _environmentService.remoteAuthority]) {
			let resolve: () => void;
			const p = new Promise<void>(r => resolve = r);
			this._backendRegistration.set(remoteAuthority, {promise: p, resolve: resolve!});
		}
	}

	createInstance(profile: ITerminalProfile, target: TerminalLocation): ITerminalInstance;
	createInstance(shellLaunchConfig: IShellLaunchConfig, target: TerminalLocation): ITerminalInstance;
	createInstance(config: IShellLaunchConfig | ITerminalProfile, target: TerminalLocation): ITerminalInstance {
		const shellLaunchConfig = this.convertProfileToShellLaunchConfig(config);
		const instance = this._instantiationService.createInstance(TerminalInstance,
			this._terminalShellTypeContextKey,
			this._terminalInRunCommandPicker,
			this._configHelper,
			shellLaunchConfig
		);
		instance.target = target;
		this._onDidCreateInstance.fire(instance);
		return instance;
	}

	convertProfileToShellLaunchConfig(shellLaunchConfigOrProfile?: IShellLaunchConfig | ITerminalProfile, cwd?: string | URI): IShellLaunchConfig {
		// Profile was provided
		if (shellLaunchConfigOrProfile && 'profileName' in shellLaunchConfigOrProfile) {
			const profile = shellLaunchConfigOrProfile;
			if (!profile.path) {
				return shellLaunchConfigOrProfile;
			}
			return {
				executable: profile.path,
				args: profile.args,
				env: profile.env,
				icon: profile.icon,
				color: profile.color,
				name: profile.overrideName ? profile.profileName : undefined,
				cwd
			};
		}

		// A shell launch config was provided
		if (shellLaunchConfigOrProfile) {
			if (cwd) {
				shellLaunchConfigOrProfile.cwd = cwd;
			}
			return shellLaunchConfigOrProfile;
		}

		// Return empty shell launch config
		return {};
	}

	async getBackend(remoteAuthority?: string): Promise<ITerminalBackend | undefined> {
		let backend = Registry.as<ITerminalBackendRegistry>(TerminalExtensions.Backend).getTerminalBackend(remoteAuthority);
		if (!backend) {
			// Ensure backend is initialized and try again
			await this._backendRegistration.get(remoteAuthority)?.promise;
			backend = Registry.as<ITerminalBackendRegistry>(TerminalExtensions.Backend).getTerminalBackend(remoteAuthority);
		}
		return backend;
	}

	getRegisteredBackends(): IterableIterator<ITerminalBackend> {
		return Registry.as<ITerminalBackendRegistry>(TerminalExtensions.Backend).backends.values();
	}

	didRegisterBackend(remoteAuthority?: string) {
		this._backendRegistration.get(remoteAuthority)?.resolve();
	}
}

registerSingleton(ITerminalInstanceService, TerminalInstanceService, InstantiationType.Delayed);

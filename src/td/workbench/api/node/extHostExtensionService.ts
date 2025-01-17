/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as performance from 'td/base/common/performance';
import {createApiFactoryAndRegisterActors} from 'td/workbench/api/common/extHost.api.impl';
import {RequireInterceptor} from 'td/workbench/api/common/extHostRequireInterceptor';
import {ExtensionActivationTimesBuilder} from 'td/workbench/api/common/extHostExtensionActivator';
import {connectProxyResolver} from 'td/workbench/api/node/proxyResolver';
import {AbstractExtHostExtensionService} from 'td/workbench/api/common/extHostExtensionService';
import {ExtHostDownloadService} from 'td/workbench/api/node/extHostDownloadService';
import {URI} from 'td/base/common/uri';
import {Schemas} from 'td/base/common/network';
import {IExtensionDescription} from 'td/platform/extensions/common/extensions';
import {ExtensionRuntime} from 'td/workbench/api/common/extHostTypes';
import {CLIServer} from 'td/workbench/api/node/extHostCLIServer';
import {realpathSync} from 'td/base/node/extpath';
import {ExtHostConsoleForwarder} from 'td/workbench/api/node/extHostConsoleForwarder';
import {ExtHostDiskFileSystemProvider} from 'td/workbench/api/node/extHostDiskFileSystemProvider';

class NodeModuleRequireInterceptor extends RequireInterceptor {

	protected _installInterceptor(): void {
		const that = this;
		const node_module = <any>globalThis._VSCODE_NODE_MODULES.module;
		const originalLoad = node_module._load;
		node_module._load = function load(request: string, parent: { filename: string }, isMain: boolean) {
			request = applyAlternatives(request);
			if (!that._factories.has(request)) {
				return originalLoad.apply(this, arguments);
			}
			return that._factories.get(request)!.load(
				request,
				URI.file(realpathSync(parent.filename)),
				request => originalLoad.apply(this, [request, parent, isMain])
			);
		};

		const originalLookup = node_module._resolveLookupPaths;
		node_module._resolveLookupPaths = (request: string, parent: unknown) => {
			return originalLookup.call(this, applyAlternatives(request), parent);
		};

		const applyAlternatives = (request: string) => {
			for (const alternativeModuleName of that._alternatives) {
				const alternative = alternativeModuleName(request);
				if (alternative) {
					request = alternative;
					break;
				}
			}
			return request;
		};
	}
}

// registerSingleton in extHost.node.services.ts
export class ExtHostExtensionService extends AbstractExtHostExtensionService {

	readonly extensionRuntime = ExtensionRuntime.Node;

	protected async _beforeAlmostReadyToRunExtensions(): Promise<void> {
		if (false/* Coloring Flow Check */) console.log(`\x1b[32m createInstance ExtHostConsoleForwarder start \x1b[0m`)
		// make sure console.log calls make it to the render
		this._instaService.createInstance(ExtHostConsoleForwarder);
		if (false/* Coloring Flow Check */) console.log(`\x1b[32m createInstance ExtHostConsoleForwarder done \x1b[0m`)

		// initialize API and register actors
		// explain@neulchance
		if (false/* Coloring Flow Check */) console.log(`\x1b[32m Above line of invokeFunction(createApiFactoryAndRegisterActors) :: This Message When invoked.\x1b[0m`)
		const extensionApiFactory = this._instaService.invokeFunction(createApiFactoryAndRegisterActors);
		if (false/* Coloring Flow Check */) console.log(`\x1b[32m Below line of invokeFunction(createApiFactoryAndRegisterActors) :: This Message When invoked.\x1b[0m`)

		// Register Download command
		this._instaService.createInstance(ExtHostDownloadService);

		// Register CLI Server for ipc
		if (this._initData.remote.isRemote && this._initData.remote.authority) {
			const cliServer = this._instaService.createInstance(CLIServer);
			process.env['VSCODE_IPC_HOOK_CLI'] = cliServer.ipcHandlePath;
		}

		// Register local file system shortcut
		this._instaService.createInstance(ExtHostDiskFileSystemProvider);

		// Module loading tricks
		const interceptor = this._instaService.createInstance(NodeModuleRequireInterceptor, extensionApiFactory, {mine: this._myRegistry, all: this._globalRegistry});
		await interceptor.install();
		performance.mark('code/extHost/didInitAPI');

		// Do this when extension service exists, but extensions are not being activated yet.
		const configProvider = await this._extHostConfiguration.getConfigProvider();
		await connectProxyResolver(this._extHostWorkspace, configProvider, this, this._logService/* , this._mainThreadTelemetryProxy */, this._initData);
		performance.mark('code/extHost/didInitProxyResolver');
	}

	protected _getEntryPoint(extensionDescription: IExtensionDescription): string | undefined {
		return extensionDescription.main;
	}

	protected async _loadCommonJSModule<T>(extension: IExtensionDescription | null, module: URI, activationTimesBuilder: ExtensionActivationTimesBuilder): Promise<T> {
		if (module.scheme !== Schemas.file) {
			throw new Error(`Cannot load URI: '${module}', must be of file-scheme`);
		}
		let r: T | null = null;
		activationTimesBuilder.codeLoadingStart();
		this._logService.trace(`ExtensionService#loadCommonJSModule ${module.toString(true)}`);
		this._logService.flush();
		const extensionId = extension?.identifier.value;
		if (extension) {
			await this._extHostLocalizationService.initializeLocalizedMessages(extension);
		}
		try {
			if (extensionId) {
				performance.mark(`code/extHost/willLoadExtensionCode/${extensionId}`);
			}
			r = require.__$__nodeRequire<T>(module.fsPath);
		} finally {
			if (extensionId) {
				performance.mark(`code/extHost/didLoadExtensionCode/${extensionId}`);
			}
			activationTimesBuilder.codeLoadingStop();
		}
		return r;
	}

	public async $setRemoteEnvironment(env: { [key: string]: string | null }): Promise<void> {
		if (!this._initData.remote.isRemote) {
			return;
		}

		for (const key in env) {
			const value = env[key];
			if (value === null) {
				delete process.env[key];
			} else {
				process.env[key] = value;
			}
		}
	}
}

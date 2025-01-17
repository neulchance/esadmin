/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IntervalTimer} from 'td/base/common/async';
import {VSBuffer} from 'td/base/common/buffer';
import * as errors from 'td/base/common/errors';
import {Emitter, Event} from 'td/base/common/event';
import {Disposable, IDisposable} from 'td/base/common/lifecycle';
import {StopWatch} from 'td/base/common/stopwatch';
import {URI} from 'td/base/common/uri';
import {IMessagePassingProtocol} from 'td/base/parts/ipc/common/ipc';
import {ITextModelService} from 'td/editor/common/services/resolverService';
import * as nls from 'td/nls';
import {Categories} from 'td/platform/action/common/actionCommonCategories';
import {Action2, IMenuService, registerAction2} from 'td/platform/actions/common/actions';
import {ExtensionIdentifier, IExtensionDescription} from 'td/platform/extensions/common/extensions';
import {IInstantiationService, ServicesAccessor} from 'td/platform/instantiation/common/instantiation';
import {ILogService, ILoggerService} from 'td/platform/log/common/log';
import {RemoteAuthorityResolverErrorCode, getRemoteAuthorityPrefix} from 'td/platform/remote/common/remoteAuthorityResolver';
import {ITelemetryService} from 'td/platform/telemetry/common/telemetry';
import {IEditorService} from 'td/workbench/services/editor/common/editorService';
import {IWorkbenchEnvironmentService} from 'td/workbench/services/environment/common/environmentService';
import {ExtHostCustomersRegistry, IInternalExtHostContext} from 'td/workbench/services/extensions/common/extHostCustomers';
import {ExtensionHostKind, extensionHostKindToString} from 'td/workbench/services/extensions/common/extensionHostKind';
import {IExtensionHostManager} from 'td/workbench/services/extensions/common/extensionHostManagers';
import {IExtensionDescriptionDelta} from 'td/workbench/services/extensions/common/extensionHostProtocol';
import {IExtensionHostProxy, IResolveAuthorityResult} from 'td/workbench/services/extensions/common/extensionHostProxy';
import {ExtensionRunningLocation} from 'td/workbench/services/extensions/common/extensionRunningLocation';
import {ActivationKind, ExtensionActivationReason, ExtensionHostStartup, IExtensionHost, IExtensionService, IInternalExtensionService} from 'td/workbench/services/extensions/common/extensions';
import {Proxied, ProxyIdentifier} from 'td/workbench/services/extensions/common/proxyIdentifier';
import {IRPCProtocolLogger, RPCProtocol, RequestInitiator, ResponsiveState} from 'td/workbench/services/extensions/common/rpcProtocol';
import {IWorkingCopyFileService} from '../../workingCopy/common/workingCopyFileService';
import {IPathService} from '../../path/common/pathService';
import {IModelService} from 'td/editor/common/services/model';
import {IWorkbenchIssueService} from '../../issue/common/issue';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {INativeEnvironmentService} from 'td/platform/environment/common/environment';
import {IStorageService} from 'td/platform/storage/common/storage';
import {INotificationService} from 'td/platform/notification/common/notification';
import {IExtensionsWorkbenchService} from 'td/workbench/contrib/extensions/common/extensions';
import {IWorkbenchExtensionEnablementService, IWorkbenchExtensionManagementService} from '../../extensionManagement/common/extensionManagement';
import {IExtensionIgnoredRecommendationsService} from '../../extensionRecommendations/common/extensionRecommendations';
import {IKeybindingService} from 'td/platform/keybinding/common/keybinding';
import {ICommandService} from 'td/platform/commands/common/commands';
import {IDialogService} from 'td/platform/dialogs/common/dialogs';
import {IEditorGroupsService} from '../../editor/common/editorGroupsService';
import {IPreferencesService} from '../../preferences/common/preferences';
import {IProductService} from 'td/platform/product/common/productService';
import {IAiRelatedInformationService} from '../../aiRelatedInformation/common/aiRelatedInformation';
import {IChatAgentService} from 'td/workbench/contrib/chat/common/chatAgents';
import {IContextKeyService} from 'td/platform/contextkey/common/contextkey';
import {IListService} from 'td/platform/list/browser/listService';
import {IQuickInputService} from 'td/platform/quickinput/common/quickInput';
import {IOutputService} from '../../output/common/output';
import {IDefaultLogLevelsService} from 'td/workbench/contrib/logs/common/defaultLogLevels';
import {IWindowsMainService} from 'td/platform/windows/electron-main/windows';

// Enable to see detailed message communication between window and extension host
const LOG_EXTENSION_HOST_COMMUNICATION = false;
const LOG_USE_COLORS = true;

type ExtensionHostStartupClassification = {
	owner: 'alexdima';
	comment: 'The startup state of the extension host';
	time: { classification: 'SystemMetaData'; purpose: 'PerformanceAndHealth'; comment: 'The time reported by Date.now().' };
	action: { classification: 'SystemMetaData'; purpose: 'PerformanceAndHealth'; comment: 'The action: starting, success or error.' };
	kind: { classification: 'SystemMetaData'; purpose: 'PerformanceAndHealth'; comment: 'The extension host kind: LocalProcess, LocalWebWorker or Remote.' };
	errorName?: { classification: 'SystemMetaData'; purpose: 'PerformanceAndHealth'; comment: 'The error name.' };
	errorMessage?: { classification: 'SystemMetaData'; purpose: 'PerformanceAndHealth'; comment: 'The error message.' };
	errorStack?: { classification: 'SystemMetaData'; purpose: 'PerformanceAndHealth'; comment: 'The error stack.' };
};

type ExtensionHostStartupEvent = {
	time: number;
	action: 'starting' | 'success' | 'error';
	kind: string;
	errorName?: string;
	errorMessage?: string;
	errorStack?: string;
};

export class ExtensionHostManager extends Disposable implements IExtensionHostManager {

	public readonly onDidExit: Event<[number, string | null]>;

	private readonly _onDidChangeResponsiveState: Emitter<ResponsiveState> = this._register(new Emitter<ResponsiveState>());
	public readonly onDidChangeResponsiveState: Event<ResponsiveState> = this._onDidChangeResponsiveState.event;

	/**
	 * A map of already requested activation events to speed things up if the same activation event is triggered multiple times.
	 */
	private readonly _cachedActivationEvents: Map<string, Promise<void>>;
	private readonly _resolvedActivationEvents: Set<string>;
	private _rpcProtocol: RPCProtocol | null;
	private readonly _customers: IDisposable[];
	private readonly _extensionHost: IExtensionHost;
	private _proxy: Promise<IExtensionHostProxy | null> | null;
	private _hasStarted = false;

	public get pid(): number | null {
		return this._extensionHost.pid;
	}

	public get kind(): ExtensionHostKind {
		return this._extensionHost.runningLocation.kind;
	}

	public get startup(): ExtensionHostStartup {
		return this._extensionHost.startup;
	}

	public get friendyName(): string {
		return friendlyExtHostName(this.kind, this.pid);
	}

	constructor(
		extensionHost: IExtensionHost,
		initialActivationEvents: string[],
		private readonly _internalExtensionService: IInternalExtensionService,
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@IWorkbenchEnvironmentService private readonly _environmentService: IWorkbenchEnvironmentService,
		@ITelemetryService private readonly _telemetryService: ITelemetryService,
		@ILogService private readonly _logService: ILogService,
	) {
		super();
		this._cachedActivationEvents = new Map<string, Promise<void>>();
		this._resolvedActivationEvents = new Set<string>();
		this._rpcProtocol = null;
		this._customers = [];

		this._extensionHost = extensionHost;
		this.onDidExit = this._extensionHost.onExit;

		// const startingTelemetryEvent: ExtensionHostStartupEvent = {
		// 	time: Date.now(),
		// 	action: 'starting',
		// 	kind: extensionHostKindToString(this.kind)
		// };
		// this._telemetryService.publicLog2<ExtensionHostStartupEvent, ExtensionHostStartupClassification>('extensionHostStartup', startingTelemetryEvent);
		
		// this._extensionHost is NativeLocalProcessExtensionHost(file:localProcessExtensionHost.ts)
		this._proxy = this._extensionHost.start().then(
			(protocol) => {
				this._hasStarted = true;

				// Track healthy extension host startup
				// const successTelemetryEvent: ExtensionHostStartupEvent = {
				// 	time: Date.now(),
				// 	action: 'success',
				// 	kind: extensionHostKindToString(this.kind)
				// };
				// this._telemetryService.publicLog2<ExtensionHostStartupEvent, ExtensionHostStartupClassification>('extensionHostStartup', successTelemetryEvent);

				// explain@neulchance Error: Missing proxy instance
				return this._createExtensionHostCustomers(this.kind, protocol);
			},
			(err) => {
				this._logService.error(`Error received from starting extension host (kind: ${extensionHostKindToString(this.kind)})`);
				this._logService.error(err);

				// Track errors during extension host startup
				const failureTelemetryEvent: ExtensionHostStartupEvent = {
					time: Date.now(),
					action: 'error',
					kind: extensionHostKindToString(this.kind)
				};

				if (err && err.name) {
					failureTelemetryEvent.errorName = err.name;
				}
				if (err && err.message) {
					failureTelemetryEvent.errorMessage = err.message;
				}
				if (err && err.stack) {
					failureTelemetryEvent.errorStack = err.stack;
				}

				// this._telemetryService.publicLog2<ExtensionHostStartupEvent, ExtensionHostStartupClassification>('extensionHostStartup', failureTelemetryEvent);

				return null;
			}
		);
		this._proxy.then(() => {
			initialActivationEvents.forEach((activationEvent) => this.activateByEvent(activationEvent, ActivationKind.Normal));
			this._register(registerLatencyTestProvider({
				measure: () => this.measure()
			}));
		});
	}

	public override dispose(): void {
		if (this._extensionHost) {
			this._extensionHost.dispose();
		}
		if (this._rpcProtocol) {
			this._rpcProtocol.dispose();
		}
		for (let i = 0, len = this._customers.length; i < len; i++) {
			const customer = this._customers[i];
			try {
				customer.dispose();
			} catch (err) {
				errors.onUnexpectedError(err);
			}
		}
		this._proxy = null;

		super.dispose();
	}

	private async measure(): Promise<ExtHostLatencyResult | null> {
		const proxy = await this._proxy;
		if (!proxy) {
			return null;
		}
		const latency = await this._measureLatency(proxy);
		const down = await this._measureDown(proxy);
		const up = await this._measureUp(proxy);
		return {
			remoteAuthority: this._extensionHost.remoteAuthority,
			latency,
			down,
			up
		};
	}

	public async ready(): Promise<void> {
		await this._proxy;
	}

	private async _measureLatency(proxy: IExtensionHostProxy): Promise<number> {
		const COUNT = 10;

		let sum = 0;
		for (let i = 0; i < COUNT; i++) {
			const sw = StopWatch.create();
			await proxy.test_latency(i);
			sw.stop();
			sum += sw.elapsed();
		}
		return (sum / COUNT);
	}

	private static _convert(byteCount: number, elapsedMillis: number): number {
		return (byteCount * 1000 * 8) / elapsedMillis;
	}

	private async _measureUp(proxy: IExtensionHostProxy): Promise<number> {
		const SIZE = 10 * 1024 * 1024; // 10MB

		const buff = VSBuffer.alloc(SIZE);
		const value = Math.ceil(Math.random() * 256);
		for (let i = 0; i < buff.byteLength; i++) {
			buff.writeUInt8(i, value);
		}
		const sw = StopWatch.create();
		await proxy.test_up(buff);
		sw.stop();
		return ExtensionHostManager._convert(SIZE, sw.elapsed());
	}

	private async _measureDown(proxy: IExtensionHostProxy): Promise<number> {
		const SIZE = 10 * 1024 * 1024; // 10MB

		const sw = StopWatch.create();
		await proxy.test_down(SIZE);
		sw.stop();
		return ExtensionHostManager._convert(SIZE, sw.elapsed());
	}

	private _createExtensionHostCustomers(kind: ExtensionHostKind, protocol: IMessagePassingProtocol): IExtensionHostProxy {

		let logger: IRPCProtocolLogger | null = null;
		if (LOG_EXTENSION_HOST_COMMUNICATION || this._environmentService.logExtensionHostCommunication) {
			logger = new RPCLogger(kind);
		} else if (TelemetryRPCLogger.isEnabled()) {
			logger = new TelemetryRPCLogger(this._telemetryService);
		}

		this._rpcProtocol = new RPCProtocol(protocol, logger);
		this._register(this._rpcProtocol.onDidChangeResponsiveState((responsiveState: ResponsiveState) => this._onDidChangeResponsiveState.fire(responsiveState)));
		let extensionHostProxy: IExtensionHostProxy | null = null as IExtensionHostProxy | null;
		let mainProxyIdentifiers: ProxyIdentifier<any>[] = [];
		const extHostContext: IInternalExtHostContext = {
			remoteAuthority: this._extensionHost.remoteAuthority,
			extensionHostKind: this.kind,
			getProxy: <T>(identifier: ProxyIdentifier<T>): Proxied<T> => {
				/* if (identifier) {
					console.log(`\x1b[32mIDENTIFIER exists\x1b[0m \x1b[31m${identifier.sid}\x1b[0m`)
				} else {
					console.log(`\x1b[32mIDENTIFIER does not exist\x1b[0m`)
				} */
				return this._rpcProtocol!.getProxy(identifier)
			},
			set: <T, R extends T>(identifier: ProxyIdentifier<T>, instance: R): R => this._rpcProtocol!.set(identifier, instance),
			dispose: (): void => this._rpcProtocol!.dispose(),
			assertRegistered: (identifiers: ProxyIdentifier<any>[]): void => {
				console.log('identifiersidentifiersidentifiersidentifiersidentifiersidentifiersidentifiers')
				console.log(identifiers)
				return this._rpcProtocol!.assertRegistered(identifiers)
			},
			drain: (): Promise<void> => this._rpcProtocol!.drain(),

			//#region internal
			internalExtensionService: this._internalExtensionService,
			_setExtensionHostProxy: (value: IExtensionHostProxy): void => {
				extensionHostProxy = value;
			},
			_setAllMainProxyIdentifiers: (value: ProxyIdentifier<any>[]): void => {
				mainProxyIdentifiers = value;
			},
			//#endregion
		};

		// Named customers
		// extensionHost.contribution.ts 에서 등록한 
		this._instantiationService.invokeFunction((accessor: ServicesAccessor) => {
			// Check that no named customers are missing
			// accessor.get(IWindowsMainService);
			// console.log('\x1b[31maccessor.get(DI) done\x1b[0m')
		})
		const namedCustomers = ExtHostCustomersRegistry.getNamedCustomers();
		for (let i = 0, len = namedCustomers.length; i < len; i++) {
			const [id, ctor] = namedCustomers[i];
			try {
				// When create ctor:MainThreadExtensionService then its inside call getProxy(ExtHostContext.ExtHostExtensionService)
				// console.log(`\x1b[32m ----------\x1b[0m\x1b[34m GOGO \x1b[0m\x1b[32m---------- \x1b[0m`)
				// console.log(`\x1b[32mExtensionHostManager: \x1b[0m\x1b[34m[ctor.name]:\x1b[0m \x1b[33m${ctor.name} \x1b[0m`)
				const instance = this._instantiationService.createInstance(ctor, extHostContext);
				this._customers.push(instance);
				// explain@neulchance rpcProtocol.set
				this._rpcProtocol.set(id, instance); // this._locals[identifier.nid] = value;
			} catch (err) {
				this._logService.error(`Will print Error message soon.`);
				this._logService.error(`Cannot instantiate named customer: '${id.sid}'`);
				this._logService.error(err);
				errors.onUnexpectedError(err);
			}
		}

		// Customers
		const customers = ExtHostCustomersRegistry.getCustomers();
		for (const ctor of customers) {
			try {
				const instance = this._instantiationService.createInstance(ctor, extHostContext);
				this._customers.push(instance);
			} catch (err) {
				this._logService.error(err);
				errors.onUnexpectedError(err);
			}
		}

		if (!extensionHostProxy) {
			throw new Error(`Missing IExtensionHostProxy!`);
		}

		// Check that no named customers are missing
		// explain@neulchance mainProxyIdentifiers 리스트는 'extHost.protocol.ts'에서 'MainContext' 아이템들이다.
		this._rpcProtocol.assertRegistered(mainProxyIdentifiers);

		return extensionHostProxy;
	}

	public async activate(extension: ExtensionIdentifier, reason: ExtensionActivationReason): Promise<boolean> {
		const proxy = await this._proxy;
		if (!proxy) {
			return false;
		}
		return proxy.activate(extension, reason);
	}

	public activateByEvent(activationEvent: string, activationKind: ActivationKind): Promise<void> {
		if (activationKind === ActivationKind.Immediate && !this._hasStarted) {
			return Promise.resolve();
		}

		if (!this._cachedActivationEvents.has(activationEvent)) {
			this._cachedActivationEvents.set(activationEvent, this._activateByEvent(activationEvent, activationKind));
		}
		return this._cachedActivationEvents.get(activationEvent)!;
	}

	public activationEventIsDone(activationEvent: string): boolean {
		return this._resolvedActivationEvents.has(activationEvent);
	}

	private async _activateByEvent(activationEvent: string, activationKind: ActivationKind): Promise<void> {
		if (!this._proxy) {
			return;
		}
		const proxy = await this._proxy;
		if (!proxy) {
			// this case is already covered above and logged.
			// i.e. the extension host could not be started
			return;
		}

		if (!this._extensionHost.extensions!.containsActivationEvent(activationEvent)) {
			this._resolvedActivationEvents.add(activationEvent);
			return;
		}

		
		await proxy.activateByEvent(activationEvent, activationKind);
		if (false/* Coloring Flow Check */) console.log(`\x1b[35m _activateByEvent \x1b[0m`)
		if (false/* Coloring Flow Check */) console.log(activationEvent, activationKind)
		if (false/* Coloring Flow Check */) console.log(proxy)
		this._resolvedActivationEvents.add(activationEvent);
	}

	public async getInspectPort(tryEnableInspector: boolean): Promise<number> {
		if (this._extensionHost) {
			if (tryEnableInspector) {
				await this._extensionHost.enableInspectPort();
			}
			const port = this._extensionHost.getInspectPort();
			if (port) {
				return port;
			}
		}
		return 0;
	}

	public async resolveAuthority(remoteAuthority: string, resolveAttempt: number): Promise<IResolveAuthorityResult> {
		const sw = StopWatch.create(false);
		const prefix = () => `[${extensionHostKindToString(this._extensionHost.runningLocation.kind)}${this._extensionHost.runningLocation.affinity}][resolveAuthority(${getRemoteAuthorityPrefix(remoteAuthority)},${resolveAttempt})][${sw.elapsed()}ms] `;
		const logInfo = (msg: string) => this._logService.info(`${prefix()}${msg}`);
		const logError = (msg: string, err: any = undefined) => this._logService.error(`${prefix()}${msg}`, err);

		logInfo(`obtaining proxy...`);
		const proxy = await this._proxy;
		if (!proxy) {
			logError(`no proxy`);
			return {
				type: 'error',
				error: {
					message: `Cannot resolve authority`,
					code: RemoteAuthorityResolverErrorCode.Unknown,
					detail: undefined
				}
			};
		}
		logInfo(`invoking...`);
		const intervalLogger = new IntervalTimer();
		try {
			intervalLogger.cancelAndSet(() => logInfo('waiting...'), 1000);
			const resolverResult = await proxy.resolveAuthority(remoteAuthority, resolveAttempt);
			intervalLogger.dispose();
			if (resolverResult.type === 'ok') {
				logInfo(`returned ${resolverResult.value.authority.connectTo}`);
			} else {
				logError(`returned an error`, resolverResult.error);
			}
			return resolverResult;
		} catch (err) {
			intervalLogger.dispose();
			logError(`returned an error`, err);
			return {
				type: 'error',
				error: {
					message: err.message,
					code: RemoteAuthorityResolverErrorCode.Unknown,
					detail: err
				}
			};
		}
	}

	public async getCanonicalURI(remoteAuthority: string, uri: URI): Promise<URI | null> {
		const proxy = await this._proxy;
		if (!proxy) {
			throw new Error(`Cannot resolve canonical URI`);
		}
		return proxy.getCanonicalURI(remoteAuthority, uri);
	}

	public async start(extensionRegistryVersionId: number, allExtensions: IExtensionDescription[], myExtensions: ExtensionIdentifier[]): Promise<void> {
		const proxy = await this._proxy;
		if (!proxy) {
			return;
		}
		const deltaExtensions = this._extensionHost.extensions!.set(extensionRegistryVersionId, allExtensions, myExtensions);
		return proxy.startExtensionHost(deltaExtensions);
	}

	public async extensionTestsExecute(): Promise<number> {
		const proxy = await this._proxy;
		if (!proxy) {
			throw new Error('Could not obtain Extension Host Proxy');
		}
		return proxy.extensionTestsExecute();
	}

	public representsRunningLocation(runningLocation: ExtensionRunningLocation): boolean {
		return this._extensionHost.runningLocation.equals(runningLocation);
	}

	public async deltaExtensions(incomingExtensionsDelta: IExtensionDescriptionDelta): Promise<void> {
		const proxy = await this._proxy;
		if (!proxy) {
			return;
		}
		const outgoingExtensionsDelta = this._extensionHost.extensions!.delta(incomingExtensionsDelta);
		if (!outgoingExtensionsDelta) {
			// The extension host already has this version of the extensions.
			return;
		}
		return proxy.deltaExtensions(outgoingExtensionsDelta);
	}

	public containsExtension(extensionId: ExtensionIdentifier): boolean {
		return this._extensionHost.extensions?.containsExtension(extensionId) ?? false;
	}

	public async setRemoteEnvironment(env: { [key: string]: string | null }): Promise<void> {
		const proxy = await this._proxy;
		if (!proxy) {
			return;
		}

		return proxy.setRemoteEnvironment(env);
	}
}

export function friendlyExtHostName(kind: ExtensionHostKind, pid: number | null) {
	if (pid) {
		return `${extensionHostKindToString(kind)} pid: ${pid}`;
	}
	return `${extensionHostKindToString(kind)}`;
}

const colorTables = [
	['#2977B1', '#FC802D', '#34A13A', '#D3282F', '#9366BA'],
	['#8B564C', '#E177C0', '#7F7F7F', '#BBBE3D', '#2EBECD']
];

function prettyWithoutArrays(data: any): any {
	if (Array.isArray(data)) {
		return data;
	}
	if (data && typeof data === 'object' && typeof data.toString === 'function') {
		const result = data.toString();
		if (result !== '[object Object]') {
			return result;
		}
	}
	return data;
}

function pretty(data: any): any {
	if (Array.isArray(data)) {
		return data.map(prettyWithoutArrays);
	}
	return prettyWithoutArrays(data);
}

class RPCLogger implements IRPCProtocolLogger {

	private _totalIncoming = 0;
	private _totalOutgoing = 0;

	constructor(
		private readonly _kind: ExtensionHostKind
	) { }

	private _log(direction: string, totalLength: number, msgLength: number, req: number, initiator: RequestInitiator, str: string, data: any): void {
		data = pretty(data);

		const colorTable = colorTables[initiator];
		const color = LOG_USE_COLORS ? colorTable[req % colorTable.length] : '#000000';
		let args = [`%c[${extensionHostKindToString(this._kind)}][${direction}]%c[${String(totalLength).padStart(7)}]%c[len: ${String(msgLength).padStart(5)}]%c${String(req).padStart(5)} - ${str}`, 'color: darkgreen', 'color: grey', 'color: grey', `color: ${color}`];
		if (/\($/.test(str)) {
			args = args.concat(data);
			args.push(')');
		} else {
			args.push(data);
		}
		console.log.apply(console, args as [string, ...string[]]);
	}

	logIncoming(msgLength: number, req: number, initiator: RequestInitiator, str: string, data?: any): void {
		this._totalIncoming += msgLength;
		this._log('Ext \u2192 Win', this._totalIncoming, msgLength, req, initiator, str, data);
	}

	logOutgoing(msgLength: number, req: number, initiator: RequestInitiator, str: string, data?: any): void {
		this._totalOutgoing += msgLength;
		this._log('Win \u2192 Ext', this._totalOutgoing, msgLength, req, initiator, str, data);
	}
}

interface RPCTelemetryData {
	type: string;
	length: number;
}

type RPCTelemetryDataClassification = {
	owner: 'jrieken';
	comment: 'Insights about RPC message sizes';
	type: { classification: 'SystemMetaData'; purpose: 'PerformanceAndHealth'; comment: 'The type of the RPC message' };
	length: { classification: 'SystemMetaData'; purpose: 'PerformanceAndHealth'; isMeasurement: true; comment: 'The byte-length of the RPC message' };
};

class TelemetryRPCLogger implements IRPCProtocolLogger {

	static isEnabled(): boolean {
		// this will be a very high frequency event, so we only log a small percentage of them
		return Math.trunc(Math.random() * 1000) < 0.5;
	}

	private readonly _pendingRequests = new Map<number, string>();

	constructor(@ITelemetryService private readonly _telemetryService: ITelemetryService) { }

	logIncoming(msgLength: number, req: number, initiator: RequestInitiator, str: string): void {

		if (initiator === RequestInitiator.LocalSide && /^receiveReply(Err)?:/.test(str)) {
			// log the size of reply messages
			const requestStr = this._pendingRequests.get(req) ?? 'unknown_reply';
			this._pendingRequests.delete(req);
			this._telemetryService.publicLog2<RPCTelemetryData, RPCTelemetryDataClassification>('extensionhost.incoming', {
				type: `${str} ${requestStr}`,
				length: msgLength
			});
		}

		if (initiator === RequestInitiator.OtherSide && /^receiveRequest /.test(str)) {
			// incoming request
			this._telemetryService.publicLog2<RPCTelemetryData, RPCTelemetryDataClassification>('extensionhost.incoming', {
				type: `${str}`,
				length: msgLength
			});
		}
	}

	logOutgoing(msgLength: number, req: number, initiator: RequestInitiator, str: string): void {

		if (initiator === RequestInitiator.LocalSide && str.startsWith('request: ')) {
			this._pendingRequests.set(req, str);
			this._telemetryService.publicLog2<RPCTelemetryData, RPCTelemetryDataClassification>('extensionhost.outgoing', {
				type: str,
				length: msgLength
			});
		}
	}
}

interface ExtHostLatencyResult {
	remoteAuthority: string | null;
	up: number;
	down: number;
	latency: number;
}

interface ExtHostLatencyProvider {
	measure(): Promise<ExtHostLatencyResult | null>;
}

const providers: ExtHostLatencyProvider[] = [];
function registerLatencyTestProvider(provider: ExtHostLatencyProvider): IDisposable {
	providers.push(provider);
	return {
		dispose: () => {
			for (let i = 0; i < providers.length; i++) {
				if (providers[i] === provider) {
					providers.splice(i, 1);
					return;
				}
			}
		}
	};
}

function getLatencyTestProviders(): ExtHostLatencyProvider[] {
	return providers.slice(0);
}

registerAction2(class MeasureExtHostLatencyAction extends Action2 {

	constructor() {
		super({
			id: 'editor.action.measureExtHostLatency',
			title: {
				value: nls.localize('measureExtHostLatency', "Measure Extension Host Latency"),
				original: 'Measure Extension Host Latency'
			},
			category: Categories.Developer,
			f1: true
		});
	}

	async run(accessor: ServicesAccessor) {

		const editorService = accessor.get(IEditorService);

		const measurements = await Promise.all(getLatencyTestProviders().map(provider => provider.measure()));
		editorService.openEditor({resource: undefined, contents: measurements.map(MeasureExtHostLatencyAction._print).join('\n\n'), options: {pinned: true}});
	}

	private static _print(m: ExtHostLatencyResult | null): string {
		if (!m) {
			return '';
		}
		return `${m.remoteAuthority ? `Authority: ${m.remoteAuthority}\n` : ``}Roundtrip latency: ${m.latency.toFixed(3)}ms\nUp: ${MeasureExtHostLatencyAction._printSpeed(m.up)}\nDown: ${MeasureExtHostLatencyAction._printSpeed(m.down)}\n`;
	}

	private static _printSpeed(n: number): string {
		if (n <= 1024) {
			return `${n} bps`;
		}
		if (n < 1024 * 1024) {
			return `${(n / 1024).toFixed(1)} kbps`;
		}
		return `${(n / 1024 / 1024).toFixed(1)} Mbps`;
	}
});

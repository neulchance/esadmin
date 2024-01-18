/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {hostname, release} from 'os';
import {MessagePortMain, MessageEvent} from 'td/base/parts/sandbox/node/electronTypes';
import {toErrorMessage} from 'td/base/common/errorMessage';
import {onUnexpectedError, setUnexpectedErrorHandler} from 'td/base/common/errors';
import {combinedDisposable, Disposable, toDisposable} from 'td/base/common/lifecycle';
import {Schemas} from 'td/base/common/network';
import {URI} from 'td/base/common/uri';
import {firstOrDefault} from 'td/base/common/arrays';
import {Emitter} from 'td/base/common/event';
import {ProxyChannel, StaticRouter} from 'td/base/parts/ipc/common/ipc';
import {IClientConnectionFilter, Server as UtilityProcessMessagePortServer, once} from 'td/base/parts/ipc/node/ipc.mp';
import {CodeCacheCleaner} from 'td/dev/node/sharedProcess/contrib/codeCacheCleaner';
import {LanguagePackCachedDataCleaner} from 'td/dev/node/sharedProcess/contrib/languagePackCachedDataCleaner';
import {LocalizationsUpdater} from 'td/dev/node/sharedProcess/contrib/localizationsUpdater';
import {LogsDataCleaner} from 'td/dev/node/sharedProcess/contrib/logsDataCleaner';
import {UnusedWorkspaceStorageDataCleaner} from 'td/dev/node/sharedProcess/contrib/storageDataCleaner';
import {IChecksumService} from 'td/platform/checksum/common/checksumService';
import {ChecksumService} from 'td/platform/checksum/node/checksumService';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {ConfigurationService} from 'td/platform/configuration/common/configurationService';
import {IDiagnosticsService} from 'td/platform/diagnostics/common/diagnostics';
import {DiagnosticsService} from 'td/platform/diagnostics/node/diagnosticsService';
import {IDownloadService} from 'td/platform/download/common/download';
import {DownloadService} from 'td/platform/download/common/downloadService';
import {INativeEnvironmentService} from 'td/platform/environment/common/environment';
import {GlobalExtensionEnablementService} from 'td/platform/extensionManagement/common/extensionEnablementService';
import {ExtensionGalleryService} from 'td/platform/extensionManagement/common/extensionGalleryService';
import {IExtensionGalleryService, IExtensionManagementService, IExtensionTipsService, IGlobalExtensionEnablementService} from 'td/platform/extensionManagement/common/extensionManagement';
import {ExtensionSignatureVerificationService, IExtensionSignatureVerificationService} from 'td/platform/extensionManagement/node/extensionSignatureVerificationService';
import {ExtensionManagementChannel, ExtensionTipsChannel} from 'td/platform/extensionManagement/common/extensionManagementIpc';
import {ExtensionManagementService, INativeServerExtensionManagementService} from 'td/platform/extensionManagement/node/extensionManagementService';
import {IExtensionRecommendationNotificationService} from 'td/platform/extensionRecommendations/common/extensionRecommendations';
import {IFileService} from 'td/platform/files/common/files';
import {FileService} from 'td/platform/files/common/fileService';
import {DiskFileSystemProvider} from 'td/platform/files/node/diskFileSystemProvider';
import {SyncDescriptor} from 'td/platform/instantiation/common/descriptors';
import {IInstantiationService, ServicesAccessor} from 'td/platform/instantiation/common/instantiation';
import {InstantiationService} from 'td/platform/instantiation/common/instantiationService';
import {ServiceCollection} from 'td/platform/instantiation/common/serviceCollection';
import {ILanguagePackService} from 'td/platform/languagePacks/common/languagePacks';
import {NativeLanguagePackService} from 'td/platform/languagePacks/node/languagePacks';
import {ConsoleLogger, ILoggerService, ILogService} from 'td/platform/log/common/log';
import {LoggerChannelClient} from 'td/platform/log/common/logIpc';
import product from 'td/platform/product/common/product';
import {IProductService} from 'td/platform/product/common/productService';
import {IRequestService} from 'td/platform/request/common/request';
import {ISharedProcessConfiguration} from 'td/platform/sharedProcess/node/sharedProcess';
import {IStorageService} from 'td/platform/storage/common/storage';
import {resolveCommonProperties} from 'td/platform/telemetry/common/commonProperties';
import {ICustomEndpointTelemetryService, ITelemetryService} from 'td/platform/telemetry/common/telemetry';
import {TelemetryAppenderChannel} from 'td/platform/telemetry/common/telemetryIpc';
import {TelemetryLogAppender} from 'td/platform/telemetry/common/telemetryLogAppender';
import {TelemetryService} from 'td/platform/telemetry/common/telemetryService';
import {supportsTelemetry, ITelemetryAppender, NullAppender, NullTelemetryService, getPiiPathsFromEnvironment, isInternalTelemetry, isLoggingOnly} from 'td/platform/telemetry/common/telemetryUtils';
import {CustomEndpointTelemetryService} from 'td/platform/telemetry/node/customEndpointTelemetryService';
import {ExtensionStorageService, IExtensionStorageService} from 'td/platform/extensionManagement/common/extensionStorage';
import {IgnoredExtensionsManagementService, IIgnoredExtensionsManagementService} from 'td/platform/userDataSync/common/ignoredExtensions';
import {IUserDataSyncLocalStoreService, IUserDataSyncLogService, IUserDataSyncEnablementService, IUserDataSyncService, IUserDataSyncStoreManagementService, IUserDataSyncStoreService, IUserDataSyncUtilService, registerConfiguration as registerUserDataSyncConfiguration, IUserDataSyncResourceProviderService} from 'td/platform/userDataSync/common/userDataSync';
import {IUserDataSyncAccountService, UserDataSyncAccountService} from 'td/platform/userDataSync/common/userDataSyncAccount';
import {UserDataSyncLocalStoreService} from 'td/platform/userDataSync/common/userDataSyncLocalStoreService';
import {UserDataSyncAccountServiceChannel, UserDataSyncStoreManagementServiceChannel} from 'td/platform/userDataSync/common/userDataSyncIpc';
import {UserDataSyncLogService} from 'td/platform/userDataSync/common/userDataSyncLog';
import {IUserDataSyncMachinesService, UserDataSyncMachinesService} from 'td/platform/userDataSync/common/userDataSyncMachines';
import {UserDataSyncEnablementService} from 'td/platform/userDataSync/common/userDataSyncEnablementService';
import {UserDataSyncService} from 'td/platform/userDataSync/common/userDataSyncService';
import {UserDataSyncServiceChannel} from 'td/platform/userDataSync/common/userDataSyncServiceIpc';
import {UserDataSyncStoreManagementService, UserDataSyncStoreService} from 'td/platform/userDataSync/common/userDataSyncStoreService';
import {IUserDataProfileStorageService} from 'td/platform/userDataProfile/common/userDataProfileStorageService';
import {NativeUserDataProfileStorageService} from 'td/platform/userDataProfile/node/userDataProfileStorageService';
import {ActiveWindowManager} from 'td/platform/windows/node/windowTracker';
import {ISignService} from 'td/platform/sign/common/sign';
import {SignService} from 'td/platform/sign/node/signService';
import {ISharedTunnelsService} from 'td/platform/tunnel/common/tunnel';
import {SharedTunnelsService} from 'td/platform/tunnel/node/tunnelService';
import {ipcSharedProcessTunnelChannelName, ISharedProcessTunnelService} from 'td/platform/remote/common/sharedProcessTunnelService';
import {SharedProcessTunnelService} from 'td/platform/tunnel/node/sharedProcessTunnelService';
import {IUriIdentityService} from 'td/platform/uriIdentity/common/uriIdentity';
import {UriIdentityService} from 'td/platform/uriIdentity/common/uriIdentityService';
import {isLinux} from 'td/base/common/platform';
import {FileUserDataProvider} from 'td/platform/userData/common/fileUserDataProvider';
import {DiskFileSystemProviderClient, LOCAL_FILE_SYSTEM_CHANNEL_NAME} from 'td/platform/files/common/diskFileSystemProviderClient';
import {InspectProfilingService as V8InspectProfilingService} from 'td/platform/profiling/node/profilingService';
import {IV8InspectProfilingService} from 'td/platform/profiling/common/profiling';
import {IExtensionsScannerService} from 'td/platform/extensionManagement/common/extensionsScannerService';
import {ExtensionsScannerService} from 'td/platform/extensionManagement/node/extensionsScannerService';
import {IUserDataProfilesService} from 'td/platform/userDataProfile/common/userDataProfile';
import {IExtensionsProfileScannerService} from 'td/platform/extensionManagement/common/extensionsProfileScannerService';
import {PolicyChannelClient} from 'td/platform/policy/common/policyIpc';
import {IPolicyService, NullPolicyService} from 'td/platform/policy/common/policy';
import {UserDataProfilesService} from 'td/platform/userDataProfile/common/userDataProfileIpc';
// import {OneDataSystemAppender} from 'td/platform/telemetry/node/1dsAppender';
import {UserDataProfilesCleaner} from 'td/dev/node/sharedProcess/contrib/userDataProfilesCleaner';
import {IRemoteTunnelService} from 'td/platform/remoteTunnel/common/remoteTunnel';
import {UserDataSyncResourceProviderService} from 'td/platform/userDataSync/common/userDataSyncResourceProvider';
import {ExtensionsContributions} from 'td/dev/node/sharedProcess/contrib/extensions';
import {localize} from 'td/nls';
import {LogService} from 'td/platform/log/common/logService';
import {ISharedProcessLifecycleService, SharedProcessLifecycleService} from 'td/platform/lifecycle/node/sharedProcessLifecycleService';
import {RemoteTunnelService} from 'td/platform/remoteTunnel/node/remoteTunnelService';
import {ExtensionsProfileScannerService} from 'td/platform/extensionManagement/node/extensionsProfileScannerService';
import {RequestChannelClient} from 'td/platform/request/common/requestIpc';
import {ExtensionRecommendationNotificationServiceChannelClient} from 'td/platform/extensionRecommendations/common/extensionRecommendationsIpc';
import {INativeHostService} from 'td/platform/native/common/native';
import {NativeHostService} from 'td/platform/native/common/nativeHostService';
import {UserDataAutoSyncService} from 'td/platform/userDataSync/node/userDataAutoSyncService';
import {ExtensionTipsService} from 'td/platform/extensionManagement/node/extensionTipsService';
import {IMainProcessService, MainProcessService} from 'td/platform/ipc/common/mainProcessService';
import {RemoteStorageService} from 'td/platform/storage/common/storageService';
import {IRemoteSocketFactoryService, RemoteSocketFactoryService} from 'td/platform/remote/common/remoteSocketFactoryService';
import {RemoteConnectionType} from 'td/platform/remote/common/remoteAuthorityResolver';
import {nodeSocketFactory} from 'td/platform/remote/node/nodeSocketFactory';
import {NativeEnvironmentService} from 'td/platform/environment/node/environmentService';
import {SharedProcessRawConnection, SharedProcessLifecycle} from 'td/platform/sharedProcess/common/sharedProcess';

class SharedProcessMain extends Disposable implements IClientConnectionFilter {

	private readonly server = this._register(new UtilityProcessMessagePortServer(this));

	private lifecycleService: SharedProcessLifecycleService | undefined = undefined;

	private readonly onDidWindowConnectRaw = this._register(new Emitter<MessagePortMain>());

	constructor(private configuration: ISharedProcessConfiguration) {
		super();

		this.registerListeners();
	}

	private registerListeners(): void {

		// Shared process lifecycle
		let didExit = false;
		const onExit = () => {
			if (!didExit) {
				didExit = true;

				this.lifecycleService?.fireOnWillShutdown();
				this.dispose();
			}
		};
		process.once('exit', onExit);
		once(process.parentPort, SharedProcessLifecycle.exit, onExit);
	}

	async init(): Promise<void> {

		// Services
		const instantiationService = await this.initServices();

		// Config
		registerUserDataSyncConfiguration();

		instantiationService.invokeFunction(accessor => {
			const logService = accessor.get(ILogService);
			const telemetryService = accessor.get(ITelemetryService);
			const userDataProfilesService = accessor.get(IUserDataProfilesService);

			// Log info
			logService.trace('sharedProcess configuration', JSON.stringify(this.configuration));

			// Channels
			this.initChannels(accessor);

			// Error handler
			this.registerErrorHandler(logService);

			// Report Profiles Info
			this.reportProfilesInfo(telemetryService, userDataProfilesService);
			this._register(userDataProfilesService.onDidChangeProfiles(() => this.reportProfilesInfo(telemetryService, userDataProfilesService)));
		});

		// Instantiate Contributions
		this._register(combinedDisposable(
			instantiationService.createInstance(CodeCacheCleaner, this.configuration.codeCachePath),
			instantiationService.createInstance(LanguagePackCachedDataCleaner),
			instantiationService.createInstance(UnusedWorkspaceStorageDataCleaner),
			instantiationService.createInstance(LogsDataCleaner),
			instantiationService.createInstance(LocalizationsUpdater),
			instantiationService.createInstance(ExtensionsContributions),
			instantiationService.createInstance(UserDataProfilesCleaner)
		));
	}

	private async initServices(): Promise<IInstantiationService> {
		const services = new ServiceCollection();

		// Product
		const productService = {_serviceBrand: undefined, ...product};
		services.set(IProductService, productService);

		// Main Process
		const mainRouter = new StaticRouter(ctx => ctx === 'main');
		const mainProcessService = new MainProcessService(this.server, mainRouter);
		services.set(IMainProcessService, mainProcessService);

		// Policies
		const policyService = this.configuration.policiesData ? new PolicyChannelClient(this.configuration.policiesData, mainProcessService.getChannel('policy')) : new NullPolicyService();
		services.set(IPolicyService, policyService);

		// Environment
		const environmentService = new NativeEnvironmentService(this.configuration.args, productService);
		services.set(INativeEnvironmentService, environmentService);

		// Logger
		const loggerService = new LoggerChannelClient(undefined, this.configuration.logLevel, environmentService.logsHome, this.configuration.loggers.map(loggerResource => ({...loggerResource, resource: URI.revive(loggerResource.resource)})), mainProcessService.getChannel('logger'));
		services.set(ILoggerService, loggerService);

		// Log
		const logger = this._register(loggerService.createLogger('sharedprocess', {name: localize('sharedLog', "Shared")}));
		const consoleLogger = this._register(new ConsoleLogger(logger.getLevel()));
		const logService = this._register(new LogService(logger, [consoleLogger]));
		services.set(ILogService, logService);

		// Lifecycle
		this.lifecycleService = this._register(new SharedProcessLifecycleService(logService));
		services.set(ISharedProcessLifecycleService, this.lifecycleService);

		// Files
		const fileService = this._register(new FileService(logService));
		services.set(IFileService, fileService);

		const diskFileSystemProvider = this._register(new DiskFileSystemProvider(logService));
		fileService.registerProvider(Schemas.file, diskFileSystemProvider);

		// URI Identity
		const uriIdentityService = new UriIdentityService(fileService);
		services.set(IUriIdentityService, uriIdentityService);

		// User Data Profiles
		const userDataProfilesService = this._register(new UserDataProfilesService(this.configuration.profiles.all, URI.revive(this.configuration.profiles.home).with({scheme: environmentService.userRoamingDataHome.scheme}), mainProcessService.getChannel('userDataProfiles')));
		services.set(IUserDataProfilesService, userDataProfilesService);

		const userDataFileSystemProvider = this._register(new FileUserDataProvider(
			Schemas.file,
			// Specifically for user data, use the disk file system provider
			// from the main process to enable atomic read/write operations.
			// Since user data can change very frequently across multiple
			// processes, we want a single process handling these operations.
			this._register(new DiskFileSystemProviderClient(mainProcessService.getChannel(LOCAL_FILE_SYSTEM_CHANNEL_NAME), {pathCaseSensitive: isLinux})),
			Schemas.vscodeUserData,
			userDataProfilesService,
			uriIdentityService,
			logService
		));
		fileService.registerProvider(Schemas.vscodeUserData, userDataFileSystemProvider);

		// Configuration
		const configurationService = this._register(new ConfigurationService(userDataProfilesService.defaultProfile.settingsResource, fileService, policyService, logService));
		services.set(IConfigurationService, configurationService);

		// Storage (global access only)
		const storageService = new RemoteStorageService(undefined, {defaultProfile: userDataProfilesService.defaultProfile, currentProfile: userDataProfilesService.defaultProfile}, mainProcessService, environmentService);
		services.set(IStorageService, storageService);
		this._register(toDisposable(() => storageService.flush()));

		// Initialize config & storage in parallel
		await Promise.all([
			configurationService.initialize(),
			storageService.initialize()
		]);

		// Request
		const requestService = new RequestChannelClient(mainProcessService.getChannel('request'));
		services.set(IRequestService, requestService);

		// Checksum
		services.set(IChecksumService, new SyncDescriptor(ChecksumService, undefined, false /* proxied to other processes */));

		// V8 Inspect profiler
		services.set(IV8InspectProfilingService, new SyncDescriptor(V8InspectProfilingService, undefined, false /* proxied to other processes */));

		// Native Host
		const nativeHostService = new NativeHostService(-1 /* we are not running in a browser window context */, mainProcessService) as INativeHostService;
		services.set(INativeHostService, nativeHostService);

		// Download
		services.set(IDownloadService, new SyncDescriptor(DownloadService, undefined, true));

		// Extension recommendations
		const activeWindowManager = this._register(new ActiveWindowManager(nativeHostService));
		const activeWindowRouter = new StaticRouter(ctx => activeWindowManager.getActiveClientId().then(id => ctx === id));
		services.set(IExtensionRecommendationNotificationService, new ExtensionRecommendationNotificationServiceChannelClient(this.server.getChannel('extensionRecommendationNotification', activeWindowRouter)));

		// Telemetry
		let telemetryService: ITelemetryService;
		const appenders: ITelemetryAppender[] = [];
		const internalTelemetry = isInternalTelemetry(productService, configurationService);
		if (supportsTelemetry(productService, environmentService)) {
			const logAppender = new TelemetryLogAppender(logService, loggerService, environmentService, productService);
			appenders.push(logAppender);
			if (!isLoggingOnly(productService, environmentService) && productService.aiConfig?.ariaKey) {
				// const collectorAppender = new OneDataSystemAppender(requestService, internalTelemetry, 'monacoworkbench', null, productService.aiConfig.ariaKey);
				// this._register(toDisposable(() => collectorAppender.flush())); // Ensure the 1DS appender is disposed so that it flushes remaining data
				// appenders.push(collectorAppender);
			}

			telemetryService = new TelemetryService({
				appenders,
				commonProperties: resolveCommonProperties(release(), hostname(), process.arch, productService.commit, productService.version, this.configuration.machineId, this.configuration.sqmId, internalTelemetry),
				sendErrorTelemetry: true,
				piiPaths: getPiiPathsFromEnvironment(environmentService),
			}, configurationService, productService);
		} else {
			telemetryService = NullTelemetryService;
			const nullAppender = NullAppender;
			appenders.push(nullAppender);
		}

		this.server.registerChannel('telemetryAppender', new TelemetryAppenderChannel(appenders));
		services.set(ITelemetryService, telemetryService);

		// Custom Endpoint Telemetry
		const customEndpointTelemetryService = new CustomEndpointTelemetryService(configurationService, telemetryService, logService, loggerService, environmentService, productService);
		services.set(ICustomEndpointTelemetryService, customEndpointTelemetryService);

		// Extension Management
		services.set(IExtensionsProfileScannerService, new SyncDescriptor(ExtensionsProfileScannerService, undefined, true));
		services.set(IExtensionsScannerService, new SyncDescriptor(ExtensionsScannerService, undefined, true));
		services.set(IExtensionSignatureVerificationService, new SyncDescriptor(ExtensionSignatureVerificationService, undefined, true));
		services.set(INativeServerExtensionManagementService, new SyncDescriptor(ExtensionManagementService, undefined, true));

		// Extension Gallery
		services.set(IExtensionGalleryService, new SyncDescriptor(ExtensionGalleryService, undefined, true));

		// Extension Tips
		services.set(IExtensionTipsService, new SyncDescriptor(ExtensionTipsService, undefined, false /* Eagerly scans and computes exe based recommendations */));

		// Localizations
		services.set(ILanguagePackService, new SyncDescriptor(NativeLanguagePackService, undefined, false /* proxied to other processes */));

		// Diagnostics
		services.set(IDiagnosticsService, new SyncDescriptor(DiagnosticsService, undefined, false /* proxied to other processes */));

		// Settings Sync
		services.set(IUserDataSyncAccountService, new SyncDescriptor(UserDataSyncAccountService, undefined, true));
		services.set(IUserDataSyncLogService, new SyncDescriptor(UserDataSyncLogService, undefined, true));
		services.set(IUserDataSyncUtilService, ProxyChannel.toService(this.server.getChannel('userDataSyncUtil', client => client.ctx !== 'main')));
		services.set(IGlobalExtensionEnablementService, new SyncDescriptor(GlobalExtensionEnablementService, undefined, false /* Eagerly resets installed extensions */));
		services.set(IIgnoredExtensionsManagementService, new SyncDescriptor(IgnoredExtensionsManagementService, undefined, true));
		services.set(IExtensionStorageService, new SyncDescriptor(ExtensionStorageService));
		services.set(IUserDataSyncStoreManagementService, new SyncDescriptor(UserDataSyncStoreManagementService, undefined, true));
		services.set(IUserDataSyncStoreService, new SyncDescriptor(UserDataSyncStoreService, undefined, true));
		services.set(IUserDataSyncMachinesService, new SyncDescriptor(UserDataSyncMachinesService, undefined, true));
		services.set(IUserDataSyncLocalStoreService, new SyncDescriptor(UserDataSyncLocalStoreService, undefined, false /* Eagerly cleans up old backups */));
		services.set(IUserDataSyncEnablementService, new SyncDescriptor(UserDataSyncEnablementService, undefined, true));
		services.set(IUserDataSyncService, new SyncDescriptor(UserDataSyncService, undefined, false /* Initializes the Sync State */));
		services.set(IUserDataProfileStorageService, new SyncDescriptor(NativeUserDataProfileStorageService, undefined, true));
		services.set(IUserDataSyncResourceProviderService, new SyncDescriptor(UserDataSyncResourceProviderService, undefined, true));

		// Signing
		services.set(ISignService, new SyncDescriptor(SignService, undefined, false /* proxied to other processes */));

		// Tunnel
		const remoteSocketFactoryService = new RemoteSocketFactoryService();
		services.set(IRemoteSocketFactoryService, remoteSocketFactoryService);
		remoteSocketFactoryService.register(RemoteConnectionType.WebSocket, nodeSocketFactory);
		services.set(ISharedTunnelsService, new SyncDescriptor(SharedTunnelsService));
		services.set(ISharedProcessTunnelService, new SyncDescriptor(SharedProcessTunnelService));

		// Remote Tunnel
		services.set(IRemoteTunnelService, new SyncDescriptor(RemoteTunnelService));

		return new InstantiationService(services);
	}

	private initChannels(accessor: ServicesAccessor): void {

		// const disposables = this._register(new DisposableStore());

		// Extensions Management
		const channel = new ExtensionManagementChannel(accessor.get(IExtensionManagementService), () => null);
		this.server.registerChannel('extensions', channel);

		// Language Packs
		const languagePacksChannel = ProxyChannel.fromService(accessor.get(ILanguagePackService), this._store);
		this.server.registerChannel('languagePacks', languagePacksChannel);

		// Diagnostics
		const diagnosticsChannel = ProxyChannel.fromService(accessor.get(IDiagnosticsService), this._store);
		this.server.registerChannel('diagnostics', diagnosticsChannel);

		// Extension Tips
		const extensionTipsChannel = new ExtensionTipsChannel(accessor.get(IExtensionTipsService));
		this.server.registerChannel('extensionTipsService', extensionTipsChannel);

		// Checksum
		const checksumChannel = ProxyChannel.fromService(accessor.get(IChecksumService), this._store);
		this.server.registerChannel('checksum', checksumChannel);

		// Profiling
		const profilingChannel = ProxyChannel.fromService(accessor.get(IV8InspectProfilingService), this._store);
		this.server.registerChannel('v8InspectProfiling', profilingChannel);

		// Settings Sync
		const userDataSyncMachineChannel = ProxyChannel.fromService(accessor.get(IUserDataSyncMachinesService), this._store);
		this.server.registerChannel('userDataSyncMachines', userDataSyncMachineChannel);

		// Custom Endpoint Telemetry
		const customEndpointTelemetryChannel = ProxyChannel.fromService(accessor.get(ICustomEndpointTelemetryService), this._store);
		this.server.registerChannel('customEndpointTelemetry', customEndpointTelemetryChannel);

		const userDataSyncAccountChannel = new UserDataSyncAccountServiceChannel(accessor.get(IUserDataSyncAccountService));
		this.server.registerChannel('userDataSyncAccount', userDataSyncAccountChannel);

		const userDataSyncStoreManagementChannel = new UserDataSyncStoreManagementServiceChannel(accessor.get(IUserDataSyncStoreManagementService));
		this.server.registerChannel('userDataSyncStoreManagement', userDataSyncStoreManagementChannel);

		const userDataSyncChannel = new UserDataSyncServiceChannel(accessor.get(IUserDataSyncService), accessor.get(IUserDataProfilesService), accessor.get(ILogService));
		this.server.registerChannel('userDataSync', userDataSyncChannel);

		const userDataAutoSync = this._register(accessor.get(IInstantiationService).createInstance(UserDataAutoSyncService));
		this.server.registerChannel('userDataAutoSync', ProxyChannel.fromService(userDataAutoSync, this._store));

		this.server.registerChannel('IUserDataSyncResourceProviderService', ProxyChannel.fromService(accessor.get(IUserDataSyncResourceProviderService), this._store));

		// Tunnel
		const sharedProcessTunnelChannel = ProxyChannel.fromService(accessor.get(ISharedProcessTunnelService), this._store);
		this.server.registerChannel(ipcSharedProcessTunnelChannelName, sharedProcessTunnelChannel);

		// Remote Tunnel
		const remoteTunnelChannel = ProxyChannel.fromService(accessor.get(IRemoteTunnelService), this._store);
		this.server.registerChannel('remoteTunnel', remoteTunnelChannel);
	}

	private registerErrorHandler(logService: ILogService): void {

		// Listen on global error events
		process.on('uncaughtException', error => onUnexpectedError(error));
		process.on('unhandledRejection', (reason: unknown) => onUnexpectedError(reason));

		// Install handler for unexpected errors
		setUnexpectedErrorHandler(error => {
			const message = toErrorMessage(error, true);
			if (!message) {
				return;
			}

			logService.error(`[uncaught exception in sharedProcess]: ${message}`);
		});
	}

	private reportProfilesInfo(telemetryService: ITelemetryService, userDataProfilesService: IUserDataProfilesService): void {
		type ProfilesInfoClassification = {
			owner: 'sandy081';
			comment: 'Report profiles information';
			count: { classification: 'SystemMetaData'; purpose: 'FeatureInsight'; comment: 'Number of profiles' };
		};
		type ProfilesInfoEvent = {
			count: number;
		};
		telemetryService.publicLog2<ProfilesInfoEvent, ProfilesInfoClassification>('profilesInfo', {
			count: userDataProfilesService.profiles.length
		});
	}

	handledClientConnection(e: MessageEvent): boolean {

		// This filter on message port messages will look for
		// attempts of a window to connect raw to the shared
		// process to handle these connections separate from
		// our IPC based protocol.

		if (e.data !== SharedProcessRawConnection.response) {
			return false;
		}

		const port = firstOrDefault(e.ports);
		if (port) {
			this.onDidWindowConnectRaw.fire(port);

			return true;
		}

		return false;
	}
}

export async function main(configuration: ISharedProcessConfiguration): Promise<void> {

	// create shared process and signal back to main that we are
	// ready to accept message ports as client connections

	const sharedProcess = new SharedProcessMain(configuration);
	process.parentPort.postMessage(SharedProcessLifecycle.ipcReady);

	// await initialization and signal this back to electron-main
	await sharedProcess.init();

	process.parentPort.postMessage(SharedProcessLifecycle.initDone);
}

process.parentPort.once('message', (e: Electron.MessageEvent) => {
	main(e.data as ISharedProcessConfiguration);
});

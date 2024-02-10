/*----------------------------------------------------------------------------------------------------
 *  Copyright (c) TinyDeskDev. All rights reserved.
 *  Licensed under the UNLICENSED License. See License.txt in the project root for license information.
 *---------------------------------------------------------------------------------------------------*/

import {app, BrowserWindow, protocol, session, Session, systemPreferences, WebFrameMain} from 'electron';
import {addUNCHostToAllowlist, disableUNCAccessRestrictions} from 'td/base/node/unc';
import {validatedIpcMain} from 'td/base/parts/ipc/electron-main/ipcMain';
import {hostname, release} from 'os';
import {VSBuffer} from 'td/base/common/buffer';
import {toErrorMessage} from 'td/base/common/errorMessage';
import {isSigPipeError, onUnexpectedError, setUnexpectedErrorHandler} from 'td/base/common/errors';
import {isEqualOrParent} from 'td/base/common/extpath';
import {Event} from 'td/base/common/event';
import {stripComments} from 'td/base/common/json';
import {getPathLabel} from 'td/base/common/labels';
import {Disposable, DisposableStore} from 'td/base/common/lifecycle';
import {Schemas} from 'td/base/common/network';
import {isAbsolute, join, posix} from 'td/base/common/path';
import {IProcessEnvironment, isLinux, isLinuxSnap, isMacintosh, isWindows, OS} from 'td/base/common/platform';
import {assertType} from 'td/base/common/types';
import {URI} from 'td/base/common/uri';
import {generateUuid} from 'td/base/common/uuid';
// import {registerContextMenuListener} from 'td/base/parts/contextmenu/electron-main/contextmenu';
import {getDelayedChannel, ProxyChannel, StaticRouter} from 'td/base/parts/ipc/common/ipc';
import {Server as ElectronIPCServer} from 'td/base/parts/ipc/electron-main/ipc.electron';
import {Client as MessagePortClient} from 'td/base/parts/ipc/electron-main/ipc.mp';
import {Server as NodeIPCServer} from 'td/base/parts/ipc/node/ipc.net';
// import {ProxyAuthHandler} from 'td/code/electron-main/auth';
import {localize} from 'td/nls';
import {IBackupMainService} from 'td/platform/backup/electron-main/backup';
import {BackupMainService} from 'td/platform/backup/electron-main/backupMainService';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {ElectronExtensionHostDebugBroadcastChannel} from 'td/platform/debug/electron-main/extensionHostDebugIpc';
import {IDiagnosticsService} from 'td/platform/diagnostics/common/diagnostics';
import {DiagnosticsMainService, IDiagnosticsMainService} from 'td/platform/diagnostics/electron-main/diagnosticsMainService';
import {DialogMainService, IDialogMainService} from 'td/platform/dialogs/electron-main/dialogMainService';
import {IEncryptionMainService} from 'td/platform/encryption/common/encryptionService';
// import {EncryptionMainService} from 'td/platform/encryption/electron-main/encryptionMainService';
import {NativeParsedArgs} from 'td/platform/environment/common/argv';
import {IEnvironmentMainService} from 'td/platform/environment/electron-main/environmentMainService';
import {isLaunchedFromCli} from 'td/platform/environment/node/argvHelper';
import {getResolvedShellEnv} from 'td/platform/shell/node/shellEnv';
import {IExtensionHostStarter, ipcExtensionHostStarterChannelName} from 'td/platform/extensions/common/extensionHostStarter';
import {ExtensionHostStarter} from 'td/platform/extensions/electron-main/extensionHostStarter';
import {IExternalTerminalMainService} from 'td/platform/externalTerminal/electron-main/externalTerminal';
import {LinuxExternalTerminalService, MacExternalTerminalService, WindowsExternalTerminalService} from 'td/platform/externalTerminal/node/externalTerminalService';
import {LOCAL_FILE_SYSTEM_CHANNEL_NAME} from 'td/platform/files/common/diskFileSystemProviderClient';
import {IFileService} from 'td/platform/files/common/files';
import {DiskFileSystemProviderChannel} from 'td/platform/files/electron-main/diskFileSystemProviderServer';
import {DiskFileSystemProvider} from 'td/platform/files/node/diskFileSystemProvider';
import {SyncDescriptor} from 'td/platform/instantiation/common/descriptors';
import {IInstantiationService, ServicesAccessor} from 'td/platform/instantiation/common/instantiation';
import {ServiceCollection} from 'td/platform/instantiation/common/serviceCollection';
import {IIssueMainService} from 'td/platform/issue/common/issue';
// import {IssueMainService} from 'td/platform/issue/electron-main/issueMainService';
import {IKeyboardLayoutMainService, KeyboardLayoutMainService} from 'td/platform/keyboardLayout/electron-main/keyboardLayoutMainService';
import {ILaunchMainService, LaunchMainService} from 'td/platform/launch/electron-main/launchMainService';
import {ILifecycleMainService, LifecycleMainPhase, ShutdownReason} from 'td/platform/lifecycle/electron-main/lifecycleMainService';
import {ILoggerService, ILogService} from 'td/platform/log/common/log';
import {IMenubarMainService, MenubarMainService} from 'td/platform/menubar/electron-main/menubarMainService';
import {INativeHostMainService, NativeHostMainService} from 'td/platform/native/electron-main/nativeHostMainService';
import {IProductService} from 'td/platform/product/common/productService';
import {getRemoteAuthority} from 'td/platform/remote/common/remoteHosts';
import {SharedProcess} from 'td/platform/sharedProcess/electron-main/sharedProcess';
import {ISignService} from 'td/platform/sign/common/sign';
import {IStateService} from 'td/platform/state/node/state';
import {StorageDatabaseChannel} from 'td/platform/storage/electron-main/storageIpc';
import {ApplicationStorageMainService, IApplicationStorageMainService, IStorageMainService, StorageMainService} from 'td/platform/storage/electron-main/storageMainService';
import {resolveCommonProperties} from 'td/platform/telemetry/common/commonProperties';
import {ITelemetryService, TelemetryLevel} from 'td/platform/telemetry/common/telemetry';
import {TelemetryAppenderClient} from 'td/platform/telemetry/common/telemetryIpc';
import {ITelemetryServiceConfig, TelemetryService} from 'td/platform/telemetry/common/telemetryService';
import {getPiiPathsFromEnvironment, getTelemetryLevel, isInternalTelemetry, NullTelemetryService, supportsTelemetry} from 'td/platform/telemetry/common/telemetryUtils';
// import {IUpdateService} from 'td/platform/update/common/update';
// import {UpdateChannel} from 'td/platform/update/common/updateIpc';
// import {DarwinUpdateService} from 'td/platform/update/electron-main/updateService.darwin';
// import {LinuxUpdateService} from 'td/platform/update/electron-main/updateService.linux';
// import {SnapUpdateService} from 'td/platform/update/electron-main/updateService.snap';
// import {Win32UpdateService} from 'td/platform/update/electron-main/updateService.win32';
import {IOpenURLOptions, IURLService} from 'td/platform/url/common/url';
import {URLHandlerChannelClient, URLHandlerRouter} from 'td/platform/url/common/urlIpc';
import {NativeURLService} from 'td/platform/url/common/urlService';
import {ElectronURLListener} from 'td/platform/url/electron-main/electronUrlListener';
// import {IWebviewManagerService} from 'td/platform/webview/common/webviewManagerService';
// import {WebviewMainService} from 'td/platform/webview/electron-main/webviewMainService';
import {isFolderToOpen, isWorkspaceToOpen, IWindowOpenable} from 'td/platform/window/common/window';
import {IWindowsMainService, OpenContext} from 'td/platform/windows/electron-main/windows';
import {IDevWindow} from 'td/platform/window/electron-main/window';
import {WindowsMainService} from 'td/platform/windows/electron-main/windowsMainService';
import {ActiveWindowManager} from 'td/platform/windows/node/windowTracker';
import {hasWorkspaceFileExtension} from 'td/platform/workspace/common/workspace';
import {IWorkspacesService} from 'td/platform/workspaces/common/workspaces';
import {IWorkspacesHistoryMainService, WorkspacesHistoryMainService} from 'td/platform/workspaces/electron-main/workspacesHistoryMainService';
import {WorkspacesMainService} from 'td/platform/workspaces/electron-main/workspacesMainService';
import {IWorkspacesManagementMainService, WorkspacesManagementMainService} from 'td/platform/workspaces/electron-main/workspacesManagementMainService';
import {IPolicyService} from 'td/platform/policy/common/policy';
import {PolicyChannel} from 'td/platform/policy/common/policyIpc';
import {IUserDataProfilesMainService} from 'td/platform/userDataProfile/electron-main/userDataProfile';
import {RequestChannel} from 'td/platform/request/common/requestIpc';
import {IRequestService} from 'td/platform/request/common/request';
import {IExtensionsProfileScannerService} from 'td/platform/extensionManagement/common/extensionsProfileScannerService';
import {IExtensionsScannerService} from 'td/platform/extensionManagement/common/extensionsScannerService';
import {ExtensionsScannerService} from 'td/platform/extensionManagement/node/extensionsScannerService';
import {UserDataProfilesHandler} from 'td/platform/userDataProfile/electron-main/userDataProfilesHandler';
import {ProfileStorageChangesListenerChannel} from 'td/platform/userDataProfile/electron-main/userDataProfileStorageIpc';
import {Promises, RunOnceScheduler, runWhenGlobalIdle} from 'td/base/common/async';
import {resolveMachineId, resolveSqmId} from 'td/platform/telemetry/electron-main/telemetryUtils';
import {ExtensionsProfileScannerService} from 'td/platform/extensionManagement/node/extensionsProfileScannerService';
import {LoggerChannel} from 'td/platform/log/electron-main/logIpc';
import {ILoggerMainService} from 'td/platform/log/electron-main/loggerService';
import {IInitialProtocolUrls, IProtocolUrl} from 'td/platform/url/electron-main/url';
import {IUtilityProcessWorkerMainService, UtilityProcessWorkerMainService} from 'td/platform/utilityProcess/electron-main/utilityProcessWorkerMainService';
import {ipcUtilityProcessWorkerChannelName} from 'td/platform/utilityProcess/common/utilityProcessWorkerService';
import {firstOrDefault} from 'td/base/common/arrays';
import {ILocalPtyService, LocalReconnectConstants, TerminalIpcChannels, TerminalSettingId} from 'td/platform/terminal/common/terminal';
import {ElectronPtyHostStarter} from 'td/platform/terminal/electron-main/electronPtyHostStarter';
import {PtyHostService} from 'td/platform/terminal/node/ptyHostService';
import {NODE_REMOTE_RESOURCE_CHANNEL_NAME, NODE_REMOTE_RESOURCE_IPC_METHOD_NAME, NodeRemoteResourceResponse, NodeRemoteResourceRouter} from 'td/platform/remote/common/electronRemoteResources';
import {Lazy} from 'td/base/common/lazy';
import {IAuxiliaryWindowsMainService, isAuxiliaryWindow} from 'td/platform/auxiliaryWindow/electron-main/auxiliaryWindows';
import {AuxiliaryWindowsMainService} from 'td/platform/auxiliaryWindow/electron-main/auxiliaryWindowsMainService';

/**
 * The main TD Dev application. There will only ever be one instance,
 * even if the user starts many instances (e.g. from the command line).
 */
export class DevApplication extends Disposable {

	private static readonly SECURITY_PROTOCOL_HANDLING_CONFIRMATION_SETTING_KEY = {
		[Schemas.file]: 'security.promptForLocalFileProtocolHandling' as const,
		[Schemas.vscodeRemote]: 'security.promptForRemoteFileProtocolHandling' as const
	};

	private windowsMainService: IWindowsMainService | undefined;
	private auxiliaryWindowsMainService: IAuxiliaryWindowsMainService | undefined;
	private nativeHostMainService: INativeHostMainService | undefined;

	constructor(
		private readonly mainProcessNodeIpcServer: NodeIPCServer,
		private readonly userEnv: IProcessEnvironment,
		@IInstantiationService private readonly mainInstantiationService: IInstantiationService,
		@ILogService private readonly logService: ILogService,
		@ILoggerService private readonly loggerService: ILoggerService,
		@IEnvironmentMainService private readonly environmentMainService: IEnvironmentMainService,
		@ILifecycleMainService private readonly lifecycleMainService: ILifecycleMainService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IStateService private readonly stateService: IStateService,
		@IFileService private readonly fileService: IFileService,
		@IProductService private readonly productService: IProductService,
		@IUserDataProfilesMainService private readonly userDataProfilesMainService: IUserDataProfilesMainService
	) {
		super();

		this.configureSession();
		this.registerListeners();
	}

	private configureSession(): void {

		//#region Security related measures (https://electronjs.org/docs/tutorial/security)
		//
		// !!! DO NOT CHANGE without consulting the documentation !!!
		//

		const isUrlFromWebview = (requestingUrl: string | undefined) => requestingUrl?.startsWith(`${Schemas.vscodeWebview}://`);

		const allowedPermissionsInWebview = new Set([
			'clipboard-read',
			'clipboard-sanitized-write',
		]);

		session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback, details) => {
			if (isUrlFromWebview(details.requestingUrl)) {
				return callback(allowedPermissionsInWebview.has(permission));
			}

			return callback(false);
		});

		session.defaultSession.setPermissionCheckHandler((_webContents, permission, _origin, details) => {
			if (isUrlFromWebview(details.requestingUrl)) {
				return allowedPermissionsInWebview.has(permission);
			}

			return false;
		});

		//#endregion

		//#region Request filtering

		// Block all SVG requests from unsupported origins
		const supportedSvgSchemes = new Set([Schemas.file, Schemas.vscodeFileResource, Schemas.vscodeRemoteResource, Schemas.vscodeManagedRemoteResource, 'devtools']);

		// But allow them if the are made from inside an webview
		const isSafeFrame = (requestFrame: WebFrameMain | undefined): boolean => {
			for (let frame: WebFrameMain | null | undefined = requestFrame; frame; frame = frame.parent) {
				if (frame.url.startsWith(`${Schemas.vscodeWebview}://`)) {
					return true;
				}
			}
			return false;
		};

		const isSvgRequestFromSafeContext = (details: Electron.OnBeforeRequestListenerDetails | Electron.OnHeadersReceivedListenerDetails): boolean => {
			return details.resourceType === 'xhr' || isSafeFrame(details.frame);
		};

		const isAllowedVsCodeFileRequest = (details: Electron.OnBeforeRequestListenerDetails) => {
			const frame = details.frame;
			if (!frame || !this.windowsMainService) {
				return false;
			}

			// Check to see if the request comes from one of the main windows (or shared process) and not from embedded content
			const windows = BrowserWindow.getAllWindows();
			for (const window of windows) {
				if (frame.processId === window.webContents.mainFrame.processId) {
					return true;
				}
			}

			return false;
		};

		const isAllowedWebviewRequest = (uri: URI, details: Electron.OnBeforeRequestListenerDetails): boolean => {
			if (uri.path !== '/index.html') {
				return true; // Only restrict top level page of webviews: index.html
			}

			const frame = details.frame;
			if (!frame || !this.windowsMainService) {
				return false;
			}

			// Check to see if the request comes from one of the main editor windows.
			for (const window of this.windowsMainService.getWindows()) {
				if (window.win) {
					if (frame.processId === window.win.webContents.mainFrame.processId) {
						return true;
					}
				}
			}

			return false;
		};

		session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
			const uri = URI.parse(details.url);
			if (uri.scheme === Schemas.vscodeWebview) {
				if (!isAllowedWebviewRequest(uri, details)) {
					this.logService.error('Blocked vscode-webview request', details.url);
					return callback({cancel: true});
				}
			}

			if (uri.scheme === Schemas.vscodeFileResource) {
				if (!isAllowedVsCodeFileRequest(details)) {
					this.logService.error('Blocked vscode-file request', details.url);
					return callback({cancel: true});
				}
			}

			// Block most svgs
			if (uri.path.endsWith('.svg')) {
				const isSafeResourceUrl = supportedSvgSchemes.has(uri.scheme);
				if (!isSafeResourceUrl) {
					return callback({cancel: !isSvgRequestFromSafeContext(details)});
				}
			}

			return callback({cancel: false});
		});

		// Configure SVG header content type properly
		// https://github.com/microsoft/vscode/issues/97564
		session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
			const responseHeaders = details.responseHeaders as Record<string, (string) | (string[])>;
			const contentTypes = (responseHeaders['content-type'] || responseHeaders['Content-Type']);

			if (contentTypes && Array.isArray(contentTypes)) {
				const uri = URI.parse(details.url);
				if (uri.path.endsWith('.svg')) {
					if (supportedSvgSchemes.has(uri.scheme)) {
						responseHeaders['Content-Type'] = ['image/svg+xml'];

						return callback({cancel: false, responseHeaders});
					}
				}

				// remote extension schemes have the following format
				// http://127.0.0.1:<port>/vscode-remote-resource?path=
				if (!uri.path.endsWith(Schemas.vscodeRemoteResource) && contentTypes.some(contentType => contentType.toLowerCase().includes('image/svg'))) {
					return callback({cancel: !isSvgRequestFromSafeContext(details)});
				}
			}

			return callback({cancel: false});
		});

		//#endregion

		//#region Allow CORS for the PRSS CDN

		// https://github.com/microsoft/vscode-remote-release/issues/9246
		session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
			if (details.url.startsWith('https://vscode.download.prss.microsoft.com/')) {
				const responseHeaders = details.responseHeaders ?? Object.create(null);

				if (responseHeaders['Access-Control-Allow-Origin'] === undefined) {
					responseHeaders['Access-Control-Allow-Origin'] = ['*'];
					return callback({cancel: false, responseHeaders});
				}
			}

			return callback({cancel: false});
		});

		//#endregion

		//#region Code Cache

		type SessionWithCodeCachePathSupport = Session & {
			/**
			 * Sets code cache directory. By default, the directory will be `Code Cache` under
			 * the respective user data folder.
			 */
			setCodeCachePath?(path: string): void;
		};

		const defaultSession = session.defaultSession as unknown as SessionWithCodeCachePathSupport;
		if (typeof defaultSession.setCodeCachePath === 'function' && this.environmentMainService.codeCachePath) {
			// Make sure to partition Chrome's code cache folder
			// in the same way as our code cache path to help
			// invalidate caches that we know are invalid
			// (https://github.com/microsoft/vscode/issues/120655)
			defaultSession.setCodeCachePath(join(this.environmentMainService.codeCachePath, 'chrome'));
		}

		//#endregion

		//#region UNC Host Allowlist (Windows)

		if (isWindows) {
			if (this.configurationService.getValue('security.restrictUNCAccess') === false) {
				disableUNCAccessRestrictions();
			} else {
				addUNCHostToAllowlist(this.configurationService.getValue('security.allowedUNCHosts'));
			}
		}

		//#endregion
	}

	private registerListeners(): void {

		// We handle uncaught exceptions here to prevent electron from opening a dialog to the user
		setUnexpectedErrorHandler(error => this.onUnexpectedError(error));
		process.on('uncaughtException', error => {
			if (!isSigPipeError(error)) {
				onUnexpectedError(error);
			}
		});
		process.on('unhandledRejection', (reason: unknown) => onUnexpectedError(reason));

		// Dispose on shutdown
		this.lifecycleMainService.onWillShutdown(() => this.dispose());

		// Contextmenu via IPC support
		// registerContextMenuListener();

		// Accessibility change event
		app.on('accessibility-support-changed', (event, accessibilitySupportEnabled) => {
			this.windowsMainService?.sendToAll('vscode:accessibilitySupportChanged', accessibilitySupportEnabled);
		});

		// macOS dock activate
		app.on('activate', async (event, hasVisibleWindows) => {
			this.logService.trace('app#activate');

			// Mac only event: open new window when we get activated
			if (!hasVisibleWindows) {
				await this.windowsMainService?.openEmptyWindow({context: OpenContext.DOCK});
			}
		});

		//#region Security related measures (https://electronjs.org/docs/tutorial/security)
		//
		// !!! DO NOT CHANGE without consulting the documentation !!!
		//
		app.on('web-contents-created', (event, contents) => {

			// Auxiliary Window: delegate to `AuxiliaryWindow` class
			if (isAuxiliaryWindow(contents)) {
				this.logService.trace('[aux window]  app.on("web-contents-created"): Registering auxiliary window');

				this.auxiliaryWindowsMainService?.registerWindow(contents);
			}

			// Block any in-page navigation
			contents.on('will-navigate', event => {
				this.logService.error('webContents#will-navigate: Prevented webcontent navigation');

				event.preventDefault();
			});

			// All Windows: only allow about:blank auxiliary windows to open
			// For all other URLs, delegate to the OS.
			// contents.setWindowOpenHandler(details => {

			// 	// about:blank windows can open as window witho our default options
			// 	if (details.url === 'about:blank') {
			// 		this.logService.trace('[aux window] webContents#setWindowOpenHandler: Allowing auxiliary window to open on about:blank');

			// 		return {
			// 			action: 'allow',
			// 			overrideBrowserWindowOptions: this.auxiliaryWindowsMainService?.createWindow(details)
			// 		};
			// 	}

			// 	// Any other URL: delegate to OS
			// 	else {
			// 		this.logService.trace(`webContents#setWindowOpenHandler: Prevented opening window with URL ${details.url}}`);

			// 		this.nativeHostMainService?.openExternal(undefined, details.url);

			// 		return {action: 'deny'};
			// 	}
			// });
		});

		//#endregion

		let macOpenFileURIs: IWindowOpenable[] = [];
		let runningTimeout: NodeJS.Timeout | undefined = undefined;
		app.on('open-file', (event, path) => {
			this.logService.trace('app#open-file: ', path);
			event.preventDefault();

			// Keep in array because more might come!
			macOpenFileURIs.push(hasWorkspaceFileExtension(path) ? {workspaceUri: URI.file(path)} : {fileUri: URI.file(path)});

			// Clear previous handler if any
			if (runningTimeout !== undefined) {
				clearTimeout(runningTimeout);
				runningTimeout = undefined;
			}

			// Handle paths delayed in case more are coming!
			runningTimeout = setTimeout(async () => {
				await this.windowsMainService?.open({
					context: OpenContext.DOCK /* can also be opening from finder while app is running */,
					cli: this.environmentMainService.args,
					urisToOpen: macOpenFileURIs,
					gotoLineMode: false,
					preferNewWindow: true /* dropping on the dock or opening from finder prefers to open in a new window */
				});

				macOpenFileURIs = [];
				runningTimeout = undefined;
			}, 100);
		});

		app.on('new-window-for-tab', async () => {
			await this.windowsMainService?.openEmptyWindow({context: OpenContext.DESKTOP}); //macOS native tab "+" button
		});

		//#region Bootstrap IPC Handlers

		validatedIpcMain.handle('vscode:fetchShellEnv', event => {

			// Prefer to use the args and env from the target window
			// when resolving the shell env. It is possible that
			// a first window was opened from the UI but a second
			// from the CLI and that has implications for whether to
			// resolve the shell environment or not.
			//
			// Window can be undefined for e.g. the shared process
			// that is not part of our windows registry!
			const window = this.windowsMainService?.getWindowByWebContents(event.sender); // Note: this can be `undefined` for the shared process
			let args: NativeParsedArgs;
			let env: IProcessEnvironment;
			if (window?.config) {
				args = window.config;
				env = {...process.env, ...window.config.userEnv};
			} else {
				args = this.environmentMainService.args;
				env = process.env;
			}

			// Resolve shell env
			return this.resolveShellEnvironment(args, env, false);
		});

		validatedIpcMain.handle('vscode:writeNlsFile', (event, path: unknown, data: unknown) => {
			const uri = this.validateNlsPath([path]);
			if (!uri || typeof data !== 'string') {
				throw new Error('Invalid operation (vscode:writeNlsFile)');
			}

			return this.fileService.writeFile(uri, VSBuffer.fromString(data));
		});

		validatedIpcMain.handle('vscode:readNlsFile', async (event, ...paths: unknown[]) => {
			const uri = this.validateNlsPath(paths);
			if (!uri) {
				throw new Error('Invalid operation (vscode:readNlsFile)');
			}

			return (await this.fileService.readFile(uri)).value.toString();
		});

		validatedIpcMain.on('vscode:toggleDevTools', event => event.sender.toggleDevTools());
		validatedIpcMain.on('vscode:openDevTools', event => event.sender.openDevTools());

		validatedIpcMain.on('vscode:reloadWindow', event => event.sender.reload());

		validatedIpcMain.handle('vscode:notifyZoomLevel', async (event, zoomLevel: number | undefined) => {
			const window = this.windowsMainService?.getWindowById(event.sender.id);
			if (window) {
				window.notifyZoomLevel(zoomLevel);
			}
		});

		//#endregion
	}

	private validateNlsPath(pathSegments: unknown[]): URI | undefined {
		let path: string | undefined = undefined;

		for (const pathSegment of pathSegments) {
			if (typeof pathSegment === 'string') {
				if (typeof path !== 'string') {
					path = pathSegment;
				} else {
					path = join(path, pathSegment);
				}
			}
		}

		if (typeof path !== 'string' || !isAbsolute(path) || !isEqualOrParent(path, this.environmentMainService.cachedLanguagesPath, !isLinux)) {
			return undefined;
		}

		return URI.file(path);
	}

	private onUnexpectedError(error: Error): void {
		if (error) {

			// take only the message and stack property
			const friendlyError = {
				message: `[uncaught exception in main]: ${error.message}`,
				stack: error.stack
			};

			// handle on client side
			// this.windowsMainService?.sendToFocused('vscode:reportError', JSON.stringify(friendlyError));
		}

		this.logService.error(`[uncaught exception in main]: ${error}`);
		if (error.stack) {
			this.logService.error(error.stack);
		}
	}

	async startup(): Promise<void> {
		// this.logService.setLevel(1)
		this.logService.debug('Starting VS Code');
		this.logService.debug(`from: ${this.environmentMainService.appRoot}`);
		this.logService.debug('args:', this.environmentMainService.args);

		// Make sure we associate the program with the app user model id
		// This will help Windows to associate the running program with
		// any shortcut that is pinned to the taskbar and prevent showing
		// two icons in the taskbar for the same app.
		const win32AppUserModelId = this.productService.win32AppUserModelId;
		if (isWindows && win32AppUserModelId) {
			app.setAppUserModelId(win32AppUserModelId);
		}

		// Fix native tabs on macOS 10.13
		// macOS enables a compatibility patch for any bundle ID beginning with
		// "com.microsoft.", which breaks native tabs for VS Code when using this
		// identifier (from the official build).
		// Explicitly opt out of the patch here before creating any windows.
		// See: https://github.com/microsoft/vscode/issues/35361#issuecomment-399794085
		try {
			if (isMacintosh && this.configurationService.getValue('window.nativeTabs') === true && !systemPreferences.getUserDefault('NSUseImprovedLayoutPass', 'boolean')) {
				systemPreferences.setUserDefault('NSUseImprovedLayoutPass', 'boolean', true as any);
			}
		} catch (error) {
			this.logService.error(error);
		}

		// Main process server (electron IPC based)
		const mainProcessElectronServer = new ElectronIPCServer();
		this.lifecycleMainService.onWillShutdown(e => {
			if (e.reason === ShutdownReason.KILL) {
				// When we go down abnormally, make sure to free up
				// any IPC we accept from other windows to reduce
				// the chance of doing work after we go down. Kill
				// is special in that it does not orderly shutdown
				// windows.
				mainProcessElectronServer.dispose();
			}
		});

		// Resolve unique machine ID
		this.logService.trace('Resolving machine identifier...');
		const [machineId, sqmId] = await Promise.all([
			resolveMachineId(this.stateService, this.logService),
			resolveSqmId(this.stateService, this.logService)
		]);
		this.logService.trace(`Resolved machine identifier: ${machineId}`);

		// Shared process
		const {sharedProcessReady, sharedProcessClient} = this.setupSharedProcess(machineId, sqmId);

		// Services
		const appInstantiationService = await this.initServices(machineId, sqmId, sharedProcessReady);

		// Auth Handler
		// this._register(appInstantiationService.createInstance(ProxyAuthHandler));

		// Transient profiles handler
		this._register(appInstantiationService.createInstance(UserDataProfilesHandler));

		// Init Channels
		appInstantiationService.invokeFunction(accessor => this.initChannels(accessor, mainProcessElectronServer, sharedProcessClient));

		// Setup Protocol URL Handlers
		const initialProtocolUrls = await appInstantiationService.invokeFunction(accessor => this.setupProtocolUrlHandlers(accessor, mainProcessElectronServer));

		// Setup vscode-remote-resource protocol handler.
		this.setupManagedRemoteResourceUrlHandler(mainProcessElectronServer);

		// Signal phase: ready - before opening first window
		this.lifecycleMainService.phase = LifecycleMainPhase.Ready;

		// Open Windows
		await appInstantiationService.invokeFunction(accessor => this.openFirstWindow(accessor, initialProtocolUrls));

		// Signal phase: after window open
		this.lifecycleMainService.phase = LifecycleMainPhase.AfterWindowOpen;

		// Post Open Windows Tasks
		this.afterWindowOpen();

		// Set lifecycle phase to `Eventually` after a short delay and when idle (min 2.5sec, max 5sec)
		const eventuallyPhaseScheduler = this._register(new RunOnceScheduler(() => {
			this._register(runWhenGlobalIdle(() => this.lifecycleMainService.phase = LifecycleMainPhase.Eventually, 2500));
		}, 2500));
		eventuallyPhaseScheduler.schedule();
	}

	private async setupProtocolUrlHandlers(accessor: ServicesAccessor, mainProcessElectronServer: ElectronIPCServer): Promise<IInitialProtocolUrls | undefined> {
		const windowsMainService = this.windowsMainService = accessor.get(IWindowsMainService);
		const urlService = accessor.get(IURLService);
		const nativeHostMainService = this.nativeHostMainService = accessor.get(INativeHostMainService);
		const dialogMainService = accessor.get(IDialogMainService);

		// Install URL handlers that deal with protocl URLs either
		// from this process by opening windows and/or by forwarding
		// the URLs into a window process to be handled there.

		const app = this;
		urlService.registerHandler({
			async handleURL(uri: URI, options?: IOpenURLOptions): Promise<boolean> {
				return app.handleProtocolUrl(windowsMainService, dialogMainService, urlService, uri, options);
			}
		});

		const activeWindowManager = this._register(new ActiveWindowManager({
			onDidOpenMainWindow: nativeHostMainService.onDidOpenMainWindow,
			onDidFocusMainWindow: nativeHostMainService.onDidFocusMainWindow,
			getActiveWindowId: () => nativeHostMainService.getActiveWindowId(-1)
		}));
		const activeWindowRouter = new StaticRouter(ctx => activeWindowManager.getActiveClientId().then(id => ctx === id));
		const urlHandlerRouter = new URLHandlerRouter(activeWindowRouter, this.logService);
		const urlHandlerChannel = mainProcessElectronServer.getChannel('urlHandler', urlHandlerRouter);
		urlService.registerHandler(new URLHandlerChannelClient(urlHandlerChannel));

		const initialProtocolUrls = await this.resolveInitialProtocolUrls(windowsMainService, dialogMainService);
		this._register(new ElectronURLListener(initialProtocolUrls?.urls, urlService, windowsMainService, this.environmentMainService, this.productService, this.logService));

		return initialProtocolUrls;
	}

	private setupManagedRemoteResourceUrlHandler(mainProcessElectronServer: ElectronIPCServer) {
		const notFound = (): Electron.ProtocolResponse => ({statusCode: 404, data: 'Not found'});
		const remoteResourceChannel = new Lazy(() => mainProcessElectronServer.getChannel(
			NODE_REMOTE_RESOURCE_CHANNEL_NAME,
			new NodeRemoteResourceRouter(),
		));

		protocol.registerBufferProtocol(Schemas.vscodeManagedRemoteResource, (request, callback) => {
			const url = URI.parse(request.url);
			if (!url.authority.startsWith('window:')) {
				return callback(notFound());
			}

			remoteResourceChannel.value.call<NodeRemoteResourceResponse>(NODE_REMOTE_RESOURCE_IPC_METHOD_NAME, [url]).then(
				r => callback({...r, data: Buffer.from(r.body, 'base64')}),
				err => {
					this.logService.warn('error dispatching remote resource call', err);
					callback({statusCode: 500, data: String(err)});
				});
		});
	}

	private async resolveInitialProtocolUrls(windowsMainService: IWindowsMainService, dialogMainService: IDialogMainService): Promise<IInitialProtocolUrls | undefined> {

		/**
		 * Protocol URL handling on startup is complex, refer to
		 * {@link IInitialProtocolUrls} for an explainer.
		 */

		// Windows/Linux: protocol handler invokes CLI with --open-url
		const protocolUrlsFromCommandLine = this.environmentMainService.args['open-url'] ? this.environmentMainService.args._urls || [] : [];
		if (protocolUrlsFromCommandLine.length > 0) {
			this.logService.trace('app#resolveInitialProtocolUrls() protocol urls from command line:', protocolUrlsFromCommandLine);
		}

		// macOS: open-url events that were received before the app is ready
		const protocolUrlsFromEvent = ((<any>global).getOpenUrls() || []) as string[];
		if (protocolUrlsFromEvent.length > 0) {
			this.logService.trace(`app#resolveInitialProtocolUrls() protocol urls from macOS 'open-url' event:`, protocolUrlsFromEvent);
		}

		if (protocolUrlsFromCommandLine.length + protocolUrlsFromEvent.length === 0) {
			return undefined;
		}

		const protocolUrls = [
			...protocolUrlsFromCommandLine,
			...protocolUrlsFromEvent
		].map(url => {
			try {
				return {uri: URI.parse(url), originalUrl: url};
			} catch {
				this.logService.trace('app#resolveInitialProtocolUrls() protocol url failed to parse:', url);

				return undefined;
			}
		});

		const openables: IWindowOpenable[] = [];
		const urls: IProtocolUrl[] = [];
		for (const protocolUrl of protocolUrls) {
			if (!protocolUrl) {
				continue; // invalid
			}

			const windowOpenable = this.getWindowOpenableFromProtocolUrl(protocolUrl.uri);
			if (windowOpenable) {
				if (await this.shouldBlockOpenable(windowOpenable, windowsMainService, dialogMainService)) {
					this.logService.trace('app#resolveInitialProtocolUrls() protocol url was blocked:', protocolUrl.uri.toString(true));

					continue; // blocked
				} else {
					this.logService.trace('app#resolveInitialProtocolUrls() protocol url will be handled as window to open:', protocolUrl.uri.toString(true), windowOpenable);

					openables.push(windowOpenable); // handled as window to open
				}
			} else {
				this.logService.trace('app#resolveInitialProtocolUrls() protocol url will be passed to active window for handling:', protocolUrl.uri.toString(true));

				urls.push(protocolUrl); // handled within active window
			}
		}

		return {urls, openables};
	}

	private async shouldBlockOpenable(openable: IWindowOpenable, windowsMainService: IWindowsMainService, dialogMainService: IDialogMainService): Promise<boolean> {
		let openableUri: URI;
		let message: string;
		if (isWorkspaceToOpen(openable)) {
			openableUri = openable.workspaceUri;
			message = localize('confirmOpenMessageWorkspace', "An external application wants to open '{0}' in {1}. Do you want to open this workspace file?", openableUri.scheme === Schemas.file ? getPathLabel(openableUri, {os: OS, tildify: this.environmentMainService}) : openableUri.toString(true), this.productService.nameShort);
		} else if (isFolderToOpen(openable)) {
			openableUri = openable.folderUri;
			message = localize('confirmOpenMessageFolder', "An external application wants to open '{0}' in {1}. Do you want to open this folder?", openableUri.scheme === Schemas.file ? getPathLabel(openableUri, {os: OS, tildify: this.environmentMainService}) : openableUri.toString(true), this.productService.nameShort);
		} else {
			openableUri = openable.fileUri;
			message = localize('confirmOpenMessageFileOrFolder', "An external application wants to open '{0}' in {1}. Do you want to open this file or folder?", openableUri.scheme === Schemas.file ? getPathLabel(openableUri, {os: OS, tildify: this.environmentMainService}) : openableUri.toString(true), this.productService.nameShort);
		}

		if (openableUri.scheme !== Schemas.file && openableUri.scheme !== Schemas.vscodeRemote) {

			// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
			//
			// NOTE: we currently only ask for confirmation for `file` and `vscode-remote`
			// authorities here. There is an additional confirmation for `extension.id`
			// authorities from within the window.
			//
			// IF YOU ARE PLANNING ON ADDING ANOTHER AUTHORITY HERE, MAKE SURE TO ALSO
			// ADD IT TO THE CONFIRMATION CODE BELOW OR INSIDE THE WINDOW!
			//
			// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

			return false;
		}

		const askForConfirmation = this.configurationService.getValue<unknown>(DevApplication.SECURITY_PROTOCOL_HANDLING_CONFIRMATION_SETTING_KEY[openableUri.scheme]);
		if (askForConfirmation === false) {
			return false; // not blocked via settings
		}

		const {response, checkboxChecked} = await dialogMainService.showMessageBox({
			type: 'warning',
			buttons: [
				localize({key: 'open', comment: ['&& denotes a mnemonic']}, "&&Yes"),
				localize({key: 'cancel', comment: ['&& denotes a mnemonic']}, "&&No")
			],
			message,
			detail: localize('confirmOpenDetail', "If you did not initiate this request, it may represent an attempted attack on your system. Unless you took an explicit action to initiate this request, you should press 'No'"),
			checkboxLabel: openableUri.scheme === Schemas.file ? localize('doNotAskAgainLocal', "Allow opening local paths without asking") : localize('doNotAskAgainRemote', "Allow opening remote paths without asking"),
			cancelId: 1
		});

		if (response !== 0) {
			return true; // blocked by user choice
		}

		if (checkboxChecked) {
			// Due to https://github.com/microsoft/vscode/issues/195436, we can only
			// update settings from within a window. But we do not know if a window
			// is about to open or can already handle the request, so we have to send
			// to any current window and any newly opening window.
			const request = {channel: 'vscode:disablePromptForProtocolHandling', args: openableUri.scheme === Schemas.file ? 'local' : 'remote'};
			windowsMainService.sendToFocused(request.channel, request.args);
			windowsMainService.sendToOpeningWindow(request.channel, request.args);
		}

		return false; // not blocked by user choice
	}

	private getWindowOpenableFromProtocolUrl(uri: URI): IWindowOpenable | undefined {
		if (!uri.path) {
			return undefined;
		}

		// File path
		if (uri.authority === Schemas.file) {
			const fileUri = URI.file(uri.fsPath);

			if (hasWorkspaceFileExtension(fileUri)) {
				return {workspaceUri: fileUri};
			}

			return {fileUri};
		}

		// Remote path
		else if (uri.authority === Schemas.vscodeRemote) {

			// Example conversion:
			// From: vscode://vscode-remote/wsl+ubuntu/mnt/c/GitDevelopment/monaco
			//   To: vscode-remote://wsl+ubuntu/mnt/c/GitDevelopment/monaco

			const secondSlash = uri.path.indexOf(posix.sep, 1 /* skip over the leading slash */);
			if (secondSlash !== -1) {
				const authority = uri.path.substring(1, secondSlash);
				const path = uri.path.substring(secondSlash);

				let query = uri.query;
				const params = new URLSearchParams(uri.query);
				if (params.get('windowId') === '_blank') {
					// Make sure to unset any `windowId=_blank` here
					// https://github.com/microsoft/vscode/issues/191902
					params.delete('windowId');
					query = params.toString();
				}

				const remoteUri = URI.from({scheme: Schemas.vscodeRemote, authority, path, query, fragment: uri.fragment});

				if (hasWorkspaceFileExtension(path)) {
					return {workspaceUri: remoteUri};
				}

				if (/:[\d]+$/.test(path)) {
					// path with :line:column syntax
					return {fileUri: remoteUri};
				}

				return {folderUri: remoteUri};
			}
		}

		return undefined;
	}

	private async handleProtocolUrl(windowsMainService: IWindowsMainService, dialogMainService: IDialogMainService, urlService: IURLService, uri: URI, options?: IOpenURLOptions): Promise<boolean> {
		this.logService.trace('app#handleProtocolUrl():', uri.toString(true), options);

		// Support 'workspace' URLs (https://github.com/microsoft/vscode/issues/124263)
		if (uri.scheme === this.productService.urlProtocol && uri.path === 'workspace') {
			uri = uri.with({
				authority: 'file',
				path: URI.parse(uri.query).path,
				query: ''
			});
		}

		let shouldOpenInNewWindow = false;

		// We should handle the URI in a new window if the URL contains `windowId=_blank`
		const params = new URLSearchParams(uri.query);
		if (params.get('windowId') === '_blank') {
			this.logService.trace(`app#handleProtocolUrl() found 'windowId=_blank' as parameter, setting shouldOpenInNewWindow=true:`, uri.toString(true));

			params.delete('windowId');
			uri = uri.with({query: params.toString()});

			shouldOpenInNewWindow = true;
		}

		// or if no window is open (macOS only)
		else if (isMacintosh && windowsMainService.getWindowCount() === 0) {
			this.logService.trace(`app#handleProtocolUrl() running on macOS with no window open, setting shouldOpenInNewWindow=true:`, uri.toString(true));

			shouldOpenInNewWindow = true;
		}

		// Pass along whether the application is being opened via a Continue On flow
		const continueOn = params.get('continueOn');
		if (continueOn !== null) {
			this.logService.trace(`app#handleProtocolUrl() found 'continueOn' as parameter:`, uri.toString(true));

			params.delete('continueOn');
			uri = uri.with({query: params.toString()});

			this.environmentMainService.continueOn = continueOn ?? undefined;
		}

		// Check if the protocol URL is a window openable to open...
		const windowOpenableFromProtocolUrl = this.getWindowOpenableFromProtocolUrl(uri);
		if (windowOpenableFromProtocolUrl) {
			if (await this.shouldBlockOpenable(windowOpenableFromProtocolUrl, windowsMainService, dialogMainService)) {
				this.logService.trace('app#handleProtocolUrl() protocol url was blocked:', uri.toString(true));

				return true; // If openable should be blocked, behave as if it's handled
			} else {
				this.logService.trace('app#handleProtocolUrl() opening protocol url as window:', windowOpenableFromProtocolUrl, uri.toString(true));

				const window = firstOrDefault(await windowsMainService.open({
					context: OpenContext.API,
					cli: {...this.environmentMainService.args},
					urisToOpen: [windowOpenableFromProtocolUrl],
					forceNewWindow: shouldOpenInNewWindow,
					gotoLineMode: true
					// remoteAuthority: will be determined based on windowOpenableFromProtocolUrl
				}));

				window?.focus(); // this should help ensuring that the right window gets focus when multiple are opened

				return true;
			}
		}

		// ...or if we should open in a new window and then handle it within that window
		if (shouldOpenInNewWindow) {
			this.logService.trace('app#handleProtocolUrl() opening empty window and passing in protocol url:', uri.toString(true));

			const window = firstOrDefault(await windowsMainService.open({
				context: OpenContext.API,
				cli: {...this.environmentMainService.args},
				forceNewWindow: true,
				forceEmpty: true,
				gotoLineMode: true,
				remoteAuthority: getRemoteAuthority(uri)
			}));

			await window?.ready();

			return urlService.open(uri, options);
		}

		this.logService.trace('app#handleProtocolUrl(): not handled', uri.toString(true), options);

		return false;
	}

	private setupSharedProcess(machineId: string, sqmId: string): { sharedProcessReady: Promise<MessagePortClient>; sharedProcessClient: Promise<MessagePortClient> } {
		const sharedProcess = this._register(this.mainInstantiationService.createInstance(SharedProcess, machineId, sqmId));

		const sharedProcessClient = (async () => {
			this.logService.trace('Main->SharedProcess#connect');

			const port = await sharedProcess.connect();

			this.logService.trace('Main->SharedProcess#connect: connection established');

			return new MessagePortClient(port, 'main');
		})();

		const sharedProcessReady = (async () => {
			await sharedProcess.whenReady();

			return sharedProcessClient;
		})();

		return {sharedProcessReady, sharedProcessClient};
	}

	private async initServices(machineId: string, sqmId: string, sharedProcessReady: Promise<MessagePortClient>): Promise<IInstantiationService> {
		const services = new ServiceCollection();

		// Windows
		services.set(IWindowsMainService, new SyncDescriptor(WindowsMainService, [machineId, sqmId, this.userEnv], false));
		services.set(IAuxiliaryWindowsMainService, new SyncDescriptor(AuxiliaryWindowsMainService, undefined, false));

		// Dialogs
		const dialogMainService = new DialogMainService(this.logService, this.productService);
		services.set(IDialogMainService, dialogMainService);

		// Launch
		services.set(ILaunchMainService, new SyncDescriptor(LaunchMainService, undefined, false /* proxied to other processes */));

		// Diagnostics
		services.set(IDiagnosticsMainService, new SyncDescriptor(DiagnosticsMainService, undefined, false /* proxied to other processes */));
		services.set(IDiagnosticsService, ProxyChannel.toService(getDelayedChannel(sharedProcessReady.then(client => client.getChannel('diagnostics')))));

		// Issues
		// services.set(IIssueMainService, new SyncDescriptor(IssueMainService, [this.userEnv]));

		// Encryption
		// services.set(IEncryptionMainService, new SyncDescriptor(EncryptionMainService));

		// Keyboard Layout
		services.set(IKeyboardLayoutMainService, new SyncDescriptor(KeyboardLayoutMainService));

		// Native Host
		services.set(INativeHostMainService, new SyncDescriptor(NativeHostMainService, undefined, false /* proxied to other processes */));

		// Webview Manager
		// services.set(IWebviewManagerService, new SyncDescriptor(WebviewMainService));

		// Menubar
		services.set(IMenubarMainService, new SyncDescriptor(MenubarMainService));

		// Extension Host Starter
		services.set(IExtensionHostStarter, new SyncDescriptor(ExtensionHostStarter));

		// Storage
		services.set(IStorageMainService, new SyncDescriptor(StorageMainService));
		services.set(IApplicationStorageMainService, new SyncDescriptor(ApplicationStorageMainService));

		// Terminal
		const ptyHostStarter = new ElectronPtyHostStarter({
			graceTime: LocalReconnectConstants.GraceTime,
			shortGraceTime: LocalReconnectConstants.ShortGraceTime,
			scrollback: this.configurationService.getValue<number>(TerminalSettingId.PersistentSessionScrollback) ?? 100
		}, this.configurationService, this.environmentMainService, this.lifecycleMainService, this.logService);
		const ptyHostService = new PtyHostService(
			ptyHostStarter,
			this.configurationService,
			this.logService,
			this.loggerService
		);
		services.set(ILocalPtyService, ptyHostService);

		// External terminal
		if (isWindows) {
			services.set(IExternalTerminalMainService, new SyncDescriptor(WindowsExternalTerminalService));
		} else if (isMacintosh) {
			services.set(IExternalTerminalMainService, new SyncDescriptor(MacExternalTerminalService));
		} else if (isLinux) {
			services.set(IExternalTerminalMainService, new SyncDescriptor(LinuxExternalTerminalService));
		}

		// Backups
		const backupMainService = new BackupMainService(this.environmentMainService, this.configurationService, this.logService, this.stateService);
		services.set(IBackupMainService, backupMainService);

		// Workspaces
		const workspacesManagementMainService = new WorkspacesManagementMainService(this.environmentMainService, this.logService, this.userDataProfilesMainService, backupMainService, dialogMainService);
		services.set(IWorkspacesManagementMainService, workspacesManagementMainService);
		services.set(IWorkspacesService, new SyncDescriptor(WorkspacesMainService, undefined, false /* proxied to other processes */));
		services.set(IWorkspacesHistoryMainService, new SyncDescriptor(WorkspacesHistoryMainService, undefined, false));

		// URL handling
		services.set(IURLService, new SyncDescriptor(NativeURLService, undefined, false /* proxied to other processes */));

		// Telemetry
		if (supportsTelemetry(this.productService, this.environmentMainService)) {
			const isInternal = isInternalTelemetry(this.productService, this.configurationService);
			const channel = getDelayedChannel(sharedProcessReady.then(client => client.getChannel('telemetryAppender')));
			const appender = new TelemetryAppenderClient(channel);
			const commonProperties = resolveCommonProperties(release(), hostname(), process.arch, this.productService.commit, this.productService.version, machineId, sqmId, isInternal);
			const piiPaths = getPiiPathsFromEnvironment(this.environmentMainService);
			const config: ITelemetryServiceConfig = {appenders: [appender], commonProperties, piiPaths, sendErrorTelemetry: true};

			services.set(ITelemetryService, new SyncDescriptor(TelemetryService, [config], false));
		} else {
			services.set(ITelemetryService, NullTelemetryService);
		}

		// Default Extensions Profile Init
		services.set(IExtensionsProfileScannerService, new SyncDescriptor(ExtensionsProfileScannerService, undefined, true));
		services.set(IExtensionsScannerService, new SyncDescriptor(ExtensionsScannerService, undefined, true));

		// Utility Process Worker
		services.set(IUtilityProcessWorkerMainService, new SyncDescriptor(UtilityProcessWorkerMainService, undefined, true));

		// Init services that require it
		await Promises.settled([
			backupMainService.initialize(),
			workspacesManagementMainService.initialize()
		]);

		return this.mainInstantiationService.createChild(services);
	}

	private initChannels(accessor: ServicesAccessor, mainProcessElectronServer: ElectronIPCServer, sharedProcessClient: Promise<MessagePortClient>): void {

		// Channels registered to node.js are exposed to second instances
		// launching because that is the only way the second instance
		// can talk to the first instance. Electron IPC does not work
		// across apps until `requestSingleInstance` APIs are adopted.

		const disposables = this._register(new DisposableStore());

		const launchChannel = ProxyChannel.fromService(accessor.get(ILaunchMainService), disposables, {disableMarshalling: true});
		this.mainProcessNodeIpcServer.registerChannel('launch', launchChannel);

		const diagnosticsChannel = ProxyChannel.fromService(accessor.get(IDiagnosticsMainService), disposables, {disableMarshalling: true});
		this.mainProcessNodeIpcServer.registerChannel('diagnostics', diagnosticsChannel);

		// Policies (main & shared process)
		const policyChannel = new PolicyChannel(accessor.get(IPolicyService));
		mainProcessElectronServer.registerChannel('policy', policyChannel);
		sharedProcessClient.then(client => client.registerChannel('policy', policyChannel));

		// Local Files
		const diskFileSystemProvider = this.fileService.getProvider(Schemas.file);
		assertType(diskFileSystemProvider instanceof DiskFileSystemProvider);
		const fileSystemProviderChannel = new DiskFileSystemProviderChannel(diskFileSystemProvider, this.logService, this.environmentMainService);
		mainProcessElectronServer.registerChannel(LOCAL_FILE_SYSTEM_CHANNEL_NAME, fileSystemProviderChannel);
		sharedProcessClient.then(client => client.registerChannel(LOCAL_FILE_SYSTEM_CHANNEL_NAME, fileSystemProviderChannel));

		// User Data Profiles
		const userDataProfilesService = ProxyChannel.fromService(accessor.get(IUserDataProfilesMainService), disposables);
		mainProcessElectronServer.registerChannel('userDataProfiles', userDataProfilesService);
		sharedProcessClient.then(client => client.registerChannel('userDataProfiles', userDataProfilesService));

		// Request
		const requestService = new RequestChannel(accessor.get(IRequestService));
		sharedProcessClient.then(client => client.registerChannel('request', requestService));

		// Update
		// const updateChannel = new UpdateChannel(accessor.get(IUpdateService));
		// mainProcessElectronServer.registerChannel('update', updateChannel);

		// Issues
		// const issueChannel = ProxyChannel.fromService(accessor.get(IIssueMainService), disposables);
		// mainProcessElectronServer.registerChannel('issue', issueChannel);

		// Encryption
		// const encryptionChannel = ProxyChannel.fromService(accessor.get(IEncryptionMainService), disposables);
		// mainProcessElectronServer.registerChannel('encryption', encryptionChannel);

		// Signing
		// const signChannel = ProxyChannel.fromService(accessor.get(ISignService), disposables);
		// mainProcessElectronServer.registerChannel('sign', signChannel);

		// Keyboard Layout
		const keyboardLayoutChannel = ProxyChannel.fromService(accessor.get(IKeyboardLayoutMainService), disposables);
		mainProcessElectronServer.registerChannel('keyboardLayout', keyboardLayoutChannel);

		// Native host (main & shared process)
		this.nativeHostMainService = accessor.get(INativeHostMainService);
		const nativeHostChannel = ProxyChannel.fromService(this.nativeHostMainService, disposables);
		mainProcessElectronServer.registerChannel('nativeHost', nativeHostChannel);
		sharedProcessClient.then(client => client.registerChannel('nativeHost', nativeHostChannel));

		// Workspaces
		const workspacesChannel = ProxyChannel.fromService(accessor.get(IWorkspacesService), disposables);
		mainProcessElectronServer.registerChannel('workspaces', workspacesChannel);

		// Menubar
		const menubarChannel = ProxyChannel.fromService(accessor.get(IMenubarMainService), disposables);
		mainProcessElectronServer.registerChannel('menubar', menubarChannel);

		// URL handling
		const urlChannel = ProxyChannel.fromService(accessor.get(IURLService), disposables);
		mainProcessElectronServer.registerChannel('url', urlChannel);

		// Webview Manager
		// const webviewChannel = ProxyChannel.fromService(accessor.get(IWebviewManagerService), disposables);
		// mainProcessElectronServer.registerChannel('webview', webviewChannel);

		// Storage (main & shared process)
		const storageChannel = this._register(new StorageDatabaseChannel(this.logService, accessor.get(IStorageMainService)));
		mainProcessElectronServer.registerChannel('storage', storageChannel);
		sharedProcessClient.then(client => client.registerChannel('storage', storageChannel));

		// Profile Storage Changes Listener (shared process)
		const profileStorageListener = this._register(new ProfileStorageChangesListenerChannel(accessor.get(IStorageMainService), accessor.get(IUserDataProfilesMainService), this.logService));
		sharedProcessClient.then(client => client.registerChannel('profileStorageListener', profileStorageListener));

		// Terminal
		const ptyHostChannel = ProxyChannel.fromService(accessor.get(ILocalPtyService), disposables);
		mainProcessElectronServer.registerChannel(TerminalIpcChannels.LocalPty, ptyHostChannel);

		// External Terminal
		const externalTerminalChannel = ProxyChannel.fromService(accessor.get(IExternalTerminalMainService), disposables);
		mainProcessElectronServer.registerChannel('externalTerminal', externalTerminalChannel);

		// Logger
		const loggerChannel = new LoggerChannel(accessor.get(ILoggerMainService),);
		mainProcessElectronServer.registerChannel('logger', loggerChannel);
		sharedProcessClient.then(client => client.registerChannel('logger', loggerChannel));

		// Extension Host Debug Broadcasting
		const electronExtensionHostDebugBroadcastChannel = new ElectronExtensionHostDebugBroadcastChannel(accessor.get(IWindowsMainService));
		mainProcessElectronServer.registerChannel('extensionhostdebugservice', electronExtensionHostDebugBroadcastChannel);

		// Extension Host Starter
		const extensionHostStarterChannel = ProxyChannel.fromService(accessor.get(IExtensionHostStarter), disposables);
		mainProcessElectronServer.registerChannel(ipcExtensionHostStarterChannelName, extensionHostStarterChannel);

		// Utility Process Worker
		const utilityProcessWorkerChannel = ProxyChannel.fromService(accessor.get(IUtilityProcessWorkerMainService), disposables);
		mainProcessElectronServer.registerChannel(ipcUtilityProcessWorkerChannelName, utilityProcessWorkerChannel);
	}

	private async openFirstWindow(accessor: ServicesAccessor, initialProtocolUrls: IInitialProtocolUrls | undefined): Promise<IDevWindow[]> {
		const windowsMainService = this.windowsMainService = accessor.get(IWindowsMainService);
		this.auxiliaryWindowsMainService = accessor.get(IAuxiliaryWindowsMainService);

		const context = isLaunchedFromCli(process.env) ? OpenContext.CLI : OpenContext.DESKTOP;
		const args = this.environmentMainService.args;

		// First check for windows from protocol links to open
		if (initialProtocolUrls) {

			// Openables can open as windows directly
			if (initialProtocolUrls.openables.length > 0) {
				return windowsMainService.open({
					context,
					cli: args,
					urisToOpen: initialProtocolUrls.openables,
					gotoLineMode: true,
					initialStartup: true
					// remoteAuthority: will be determined based on openables
				});
			}

			// Protocol links with `windowId=_blank` on startup
			// should be handled in a special way:
			// We take the first one of these and open an empty
			// window for it. This ensures we are not restoring
			// all windows of the previous session.
			// If there are any more URLs like these, they will
			// be handled from the URL listeners installed later.

			if (initialProtocolUrls.urls.length > 0) {
				for (const protocolUrl of initialProtocolUrls.urls) {
					const params = new URLSearchParams(protocolUrl.uri.query);
					if (params.get('windowId') === '_blank') {

						// It is important here that we remove `windowId=_blank` from
						// this URL because here we open an empty window for it.

						params.delete('windowId');
						protocolUrl.originalUrl = protocolUrl.uri.toString(true);
						protocolUrl.uri = protocolUrl.uri.with({query: params.toString()});

						return windowsMainService.open({
							context,
							cli: args,
							forceNewWindow: true,
							forceEmpty: true,
							gotoLineMode: true,
							initialStartup: true
							// remoteAuthority: will be determined based on openables
						});
					}
				}
			}
		}

		const macOpenFiles: string[] = (<any>global).macOpenFiles;
		const hasCliArgs = args._.length;
		const hasFolderURIs = !!args['folder-uri'];
		const hasFileURIs = !!args['file-uri'];
		const noRecentEntry = args['skip-add-to-recently-opened'] === true;
		const waitMarkerFileURI = args.wait && args.waitMarkerFilePath ? URI.file(args.waitMarkerFilePath) : undefined;
		const remoteAuthority = args.remote || undefined;
		const forceProfile = args.profile;
		const forceTempProfile = args['profile-temp'];

		// Started without file/folder arguments
		if (!hasCliArgs && !hasFolderURIs && !hasFileURIs) {

			// Force new window
			if (args['new-window'] || forceProfile || forceTempProfile) {
				return windowsMainService.open({
					context,
					cli: args,
					forceNewWindow: true,
					forceEmpty: true,
					noRecentEntry,
					waitMarkerFileURI,
					initialStartup: true,
					remoteAuthority,
					forceProfile,
					forceTempProfile
				});
			}

			// mac: open-file event received on startup
			if (macOpenFiles.length) {
				return windowsMainService.open({
					context: OpenContext.DOCK,
					cli: args,
					urisToOpen: macOpenFiles.map(path => (hasWorkspaceFileExtension(path) ? {workspaceUri: URI.file(path)} : {fileUri: URI.file(path)})),
					noRecentEntry,
					waitMarkerFileURI,
					initialStartup: true,
					// remoteAuthority: will be determined based on macOpenFiles
				});
			}
		}

		// default: read paths from cli
		return windowsMainService.open({
			context,
			cli: args,
			forceNewWindow: args['new-window'] || (!hasCliArgs && args['unity-launch']),
			diffMode: args.diff,
			mergeMode: args.merge,
			noRecentEntry,
			waitMarkerFileURI,
			gotoLineMode: args.goto,
			initialStartup: true,
			remoteAuthority,
			forceProfile,
			forceTempProfile
		});
	}

	private afterWindowOpen(): void {

		// Windows: mutex
		this.installMutex();

		// Remote Authorities
		protocol.registerHttpProtocol(Schemas.vscodeRemoteResource, (request, callback) => {
			callback({
				url: request.url.replace(/^vscode-remote-resource:/, 'http:'),
				method: request.method
			});
		});

		// Start to fetch shell environment (if needed) after window has opened
		// Since this operation can take a long time, we want to warm it up while
		// the window is opening.
		// We also show an error to the user in case this fails.
		this.resolveShellEnvironment(this.environmentMainService.args, process.env, true);

		// Crash reporter
		this.updateCrashReporterEnablement();

		// if (isMacintosh && app.runningUnderARM64Translation) {
		// 	this.windowsMainService?.sendToFocused('vscode:showTranslatedBuildWarning');
		// }

	}

	private async installMutex(): Promise<void> {
		const win32MutexName = this.productService.win32MutexName;
		if (isWindows && win32MutexName) {
			try {
				// const WindowsMutex = await import('@vscode/windows-mutex');
				// const mutex = new WindowsMutex.Mutex(win32MutexName);
				// Event.once(this.lifecycleMainService.onWillShutdown)(() => mutex.release());
			} catch (error) {
				this.logService.error(error);
			}
		}
	}

	private async resolveShellEnvironment(args: NativeParsedArgs, env: IProcessEnvironment, notifyOnError: boolean): Promise<typeof process.env> {
		try {
			return await getResolvedShellEnv(this.configurationService, this.logService, args, env);
		} catch (error) {
			const errorMessage = toErrorMessage(error);
			if (notifyOnError) {
				this.windowsMainService?.sendToFocused('vscode:showResolveShellEnvError', errorMessage);
			} else {
				this.logService.error(errorMessage);
			}
		}

		return {};
	}

	private async updateCrashReporterEnablement(): Promise<void> {

		// If enable-crash-reporter argv is undefined then this is a fresh start,
		// based on `telemetry.enableCrashreporter` settings, generate a UUID which
		// will be used as crash reporter id and also update the json file.

		try {
			const argvContent = await this.fileService.readFile(this.environmentMainService.argvResource);
			const argvString = argvContent.value.toString();
			const argvJSON = JSON.parse(stripComments(argvString));
			const telemetryLevel = getTelemetryLevel(this.configurationService);
			const enableCrashReporter = telemetryLevel >= TelemetryLevel.CRASH;

			// Initial startup
			if (argvJSON['enable-crash-reporter'] === undefined) {
				const additionalArgvContent = [
					'',
					'	// Allows to disable crash reporting.',
					'	// Should restart the app if the value is changed.',
					`	"enable-crash-reporter": ${enableCrashReporter},`,
					'',
					'	// Unique id used for correlating crash reports sent from this instance.',
					'	// Do not edit this value.',
					`	"crash-reporter-id": "${generateUuid()}"`,
					'}'
				];
				const newArgvString = argvString.substring(0, argvString.length - 2).concat(',\n', additionalArgvContent.join('\n'));

				await this.fileService.writeFile(this.environmentMainService.argvResource, VSBuffer.fromString(newArgvString));
			}

			// Subsequent startup: update crash reporter value if changed
			else {
				const newArgvString = argvString.replace(/"enable-crash-reporter": .*,/, `"enable-crash-reporter": ${enableCrashReporter},`);
				if (newArgvString !== argvString) {
					await this.fileService.writeFile(this.environmentMainService.argvResource, VSBuffer.fromString(newArgvString));
				}
			}
		} catch (error) {
			this.logService.error(error);
		}
	}
}

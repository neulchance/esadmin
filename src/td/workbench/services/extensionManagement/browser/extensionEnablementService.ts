/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {localize} from 'td/nls';
import {Event, Emitter} from 'td/base/common/event';
import {Disposable, toDisposable} from 'td/base/common/lifecycle';
import {IExtensionManagementService, IExtensionIdentifier, IGlobalExtensionEnablementService, ENABLED_EXTENSIONS_STORAGE_PATH, DISABLED_EXTENSIONS_STORAGE_PATH, InstallOperation} from 'td/platform/extensionManagement/common/extensionManagement';
import {IWorkbenchExtensionEnablementService, EnablementState, IExtensionManagementServerService, IWorkbenchExtensionManagementService, IExtensionManagementServer, ExtensionInstallLocation} from 'td/workbench/services/extensionManagement/common/extensionManagement';
import {areSameExtensions, BetterMergeId, getExtensionDependencies} from 'td/platform/extensionManagement/common/extensionManagementUtil';
import {IWorkspaceContextService, WorkbenchState} from 'td/platform/workspace/common/workspace';
import {IStorageService, StorageScope} from 'td/platform/storage/common/storage';
import {IWorkbenchEnvironmentService} from 'td/workbench/services/environment/common/environmentService';
import {IExtension, isAuthenticationProviderExtension, isLanguagePackExtension, isResolverExtension} from 'td/platform/extensions/common/extensions';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {StorageManager} from 'td/platform/extensionManagement/common/extensionEnablementService';
import {webWorkerExtHostConfig, WebWorkerExtHostConfigValue} from 'td/workbench/services/extensions/common/extensions';
// import {IUserDataSyncAccountService} from 'td/platform/userDataSync/common/userDataSyncAccount';
// import {IUserDataSyncEnablementService} from 'td/platform/userDataSync/common/userDataSync';
import {ILifecycleService, LifecyclePhase} from 'td/workbench/services/lifecycle/common/lifecycle';
import {INotificationService, NotificationPriority, Severity} from 'td/platform/notification/common/notification';
import {IHostService} from 'td/workbench/services/host/browser/host';
import {IExtensionBisectService} from 'td/workbench/services/extensionManagement/browser/extensionBisect';
// import {IWorkspaceTrustManagementService, IWorkspaceTrustRequestService} from 'td/platform/workspace/common/workspaceTrust';
import {IExtensionManifestPropertiesService} from 'td/workbench/services/extensions/common/extensionManifestPropertiesService';
import {isVirtualWorkspace} from 'td/platform/workspace/common/virtualWorkspace';
import {ILogService} from 'td/platform/log/common/log';
import {IInstantiationService} from 'td/platform/instantiation/common/instantiation';

const SOURCE = 'IWorkbenchExtensionEnablementService';

type WorkspaceType = { readonly virtual: boolean; readonly trusted: boolean };

export class ExtensionEnablementService extends Disposable implements IWorkbenchExtensionEnablementService {

	declare readonly _serviceBrand: undefined;

	private readonly _onEnablementChanged = new Emitter<readonly IExtension[]>();
	public readonly onEnablementChanged: Event<readonly IExtension[]> = this._onEnablementChanged.event;

	protected readonly extensionsManager: ExtensionsManager;
	private readonly storageManger: StorageManager;

	constructor(
		@IStorageService storageService: IStorageService,
		// @IGlobalExtensionEnablementService protected readonly globalExtensionEnablementService: IGlobalExtensionEnablementService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@IWorkbenchEnvironmentService private readonly environmentService: IWorkbenchEnvironmentService,
		@IExtensionManagementService extensionManagementService: IExtensionManagementService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		// @IExtensionManagementServerService private readonly extensionManagementServerService: IExtensionManagementServerService,
		// @IUserDataSyncEnablementService private readonly userDataSyncEnablementService: IUserDataSyncEnablementService,
		// @IUserDataSyncAccountService private readonly userDataSyncAccountService: IUserDataSyncAccountService,
		@ILifecycleService private readonly lifecycleService: ILifecycleService,
		@INotificationService private readonly notificationService: INotificationService,
		@IHostService hostService: IHostService,
		@IExtensionBisectService private readonly extensionBisectService: IExtensionBisectService,
		// @IWorkspaceTrustManagementService private readonly workspaceTrustManagementService: IWorkspaceTrustManagementService,
		// @IWorkspaceTrustRequestService private readonly workspaceTrustRequestService: IWorkspaceTrustRequestService,
		@IExtensionManifestPropertiesService private readonly extensionManifestPropertiesService: IExtensionManifestPropertiesService,
		@IInstantiationService instantiationService: IInstantiationService,
	) {
		super();
		this.storageManger = this._register(new StorageManager(storageService));
		let isDisposed = false;
		this._register(toDisposable(() => isDisposed = true));
		this.extensionsManager = this._register(instantiationService.createInstance(ExtensionsManager));

		// this._register(this.globalExtensionEnablementService.onDidChangeEnablement(({extensions, source}) => this._onDidChangeGloballyDisabledExtensions(extensions, source)));

		// delay notification for extensions disabled until workbench restored
		if (this.allUserExtensionsDisabled) {
			this.lifecycleService.when(LifecyclePhase.Eventually).then(() => {
				this.notificationService.prompt(Severity.Info, localize('extensionsDisabled', "All installed extensions are temporarily disabled."), [{
					label: localize('Reload', "Reload and Enable Extensions"),
					run: () => hostService.reload({disableExtensions: false})
				}], {
					sticky: true,
					priority: NotificationPriority.URGENT
				});
			});
		}
	}
	isDisabledGlobally(extension: IExtension): boolean {
		throw new Error('Method not implemented.');
	}
	updateExtensionsEnablementsWhenWorkspaceTrustChanges(): Promise<void> {
		throw new Error('Method not implemented.');
	}
	getEnablementState(extension: IExtension): EnablementState {
		throw new Error('Method not implemented.');
	}
	getEnablementStates(extensions: IExtension[], workspaceTypeOverrides?: { trusted?: boolean | undefined; } | undefined): EnablementState[] {
		throw new Error('Method not implemented.');
	}

	private get hasWorkspace(): boolean {
		return this.contextService.getWorkbenchState() !== WorkbenchState.EMPTY;
	}

	private get allUserExtensionsDisabled(): boolean {
		return this.environmentService.disableExtensions === true;
	}

	// getEnablementState(extension: IExtension): EnablementState {
	// 	return this._computeEnablementState(extension, this.extensionsManager.extensions, this.getWorkspaceType());
	// }

	// getEnablementStates(extensions: IExtension[], workspaceTypeOverrides: Partial<WorkspaceType> = {}): EnablementState[] {
		// const extensionsEnablements = new Map<IExtension, EnablementState>();
		// const workspaceType = {...this.getWorkspaceType(), ...workspaceTypeOverrides};
		// return extensions.map(extension => this._computeEnablementState(extension, extensions, workspaceType, extensionsEnablements));
	// }

	getDependenciesEnablementStates(extension: IExtension): [IExtension, EnablementState][] {
		return getExtensionDependencies(this.extensionsManager.extensions, extension).map(e => [e, this.getEnablementState(e)]);
	}

	canChangeEnablement(extension: IExtension): boolean {
		try {
			this.throwErrorIfCannotChangeEnablement(extension);
			return true;
		} catch (error) {
			return false;
		}
	}

	canChangeWorkspaceEnablement(extension: IExtension): boolean {
		if (!this.canChangeEnablement(extension)) {
			return false;
		}

		try {
			this.throwErrorIfCannotChangeWorkspaceEnablement(extension);
			return true;
		} catch (error) {
			return false;
		}
	}

	private throwErrorIfCannotChangeEnablement(extension: IExtension, donotCheckDependencies?: boolean): void {
		if (isLanguagePackExtension(extension.manifest)) {
			throw new Error(localize('cannot disable language pack extension', "Cannot change enablement of {0} extension because it contributes language packs.", extension.manifest.displayName || extension.identifier.id));
		}

		// if (this.userDataSyncEnablementService.isEnabled() && this.userDataSyncAccountService.account &&
		// 	isAuthenticationProviderExtension(extension.manifest) && extension.manifest.contributes!.authentication!.some(a => a.id === this.userDataSyncAccountService.account!.authenticationProviderId)) {
		// 	throw new Error(localize('cannot disable auth extension', "Cannot change enablement {0} extension because Settings Sync depends on it.", extension.manifest.displayName || extension.identifier.id));
		// }

		if (this._isEnabledInEnv(extension)) {
			throw new Error(localize('cannot change enablement environment', "Cannot change enablement of {0} extension because it is enabled in environment", extension.manifest.displayName || extension.identifier.id));
		}

		this.throwErrorIfEnablementStateCannotBeChanged(extension, this.getEnablementState(extension), donotCheckDependencies);
	}

	private throwErrorIfEnablementStateCannotBeChanged(extension: IExtension, enablementStateOfExtension: EnablementState, donotCheckDependencies?: boolean): void {
		switch (enablementStateOfExtension) {
			case EnablementState.DisabledByEnvironment:
				throw new Error(localize('cannot change disablement environment', "Cannot change enablement of {0} extension because it is disabled in environment", extension.manifest.displayName || extension.identifier.id));
			case EnablementState.DisabledByVirtualWorkspace:
				throw new Error(localize('cannot change enablement virtual workspace', "Cannot change enablement of {0} extension because it does not support virtual workspaces", extension.manifest.displayName || extension.identifier.id));
			case EnablementState.DisabledByExtensionKind:
				throw new Error(localize('cannot change enablement extension kind', "Cannot change enablement of {0} extension because of its extension kind", extension.manifest.displayName || extension.identifier.id));
			case EnablementState.DisabledByExtensionDependency:
				if (donotCheckDependencies) {
					break;
				}
				// Can be changed only when all its dependencies enablements can be changed
				for (const dependency of getExtensionDependencies(this.extensionsManager.extensions, extension)) {
					if (this.isEnabled(dependency)) {
						continue;
					}
					try {
						this.throwErrorIfCannotChangeEnablement(dependency, true);
					} catch (error) {
						throw new Error(localize('cannot change enablement dependency', "Cannot enable '{0}' extension because it depends on '{1}' extension that cannot be enabled", extension.manifest.displayName || extension.identifier.id, dependency.manifest.displayName || dependency.identifier.id));
					}
				}
		}
	}

	private throwErrorIfCannotChangeWorkspaceEnablement(extension: IExtension): void {
		if (!this.hasWorkspace) {
			throw new Error(localize('noWorkspace', "No workspace."));
		}
		if (isAuthenticationProviderExtension(extension.manifest)) {
			throw new Error(localize('cannot disable auth extension in workspace', "Cannot change enablement of {0} extension in workspace because it contributes authentication providers", extension.manifest.displayName || extension.identifier.id));
		}
	}

	async setEnablement(extensions: IExtension[], newState: EnablementState): Promise<boolean[]> {
		// await this.extensionsManager.whenInitialized();

		if (newState === EnablementState.EnabledGlobally || newState === EnablementState.EnabledWorkspace) {
			extensions.push(...this.getExtensionsToEnableRecursively(extensions, this.extensionsManager.extensions, newState, {dependencies: true, pack: true}));
		}

		const workspace = newState === EnablementState.DisabledWorkspace || newState === EnablementState.EnabledWorkspace;
		for (const extension of extensions) {
			if (workspace) {
				this.throwErrorIfCannotChangeWorkspaceEnablement(extension);
			} else {
				this.throwErrorIfCannotChangeEnablement(extension);
			}
		}

		const result: boolean[] = [];
		for (const extension of extensions) {
			const enablementState = this.getEnablementState(extension);
			if (enablementState === EnablementState.DisabledByTrustRequirement
				/* All its disabled dependencies are disabled by Trust Requirement */
				|| (enablementState === EnablementState.DisabledByExtensionDependency && this.getDependenciesEnablementStates(extension).every(([, e]) => this.isEnabledEnablementState(e) || e === EnablementState.DisabledByTrustRequirement))
			) {
				// const trustState = await this.workspaceTrustRequestService.requestWorkspaceTrust();
				// result.push(trustState ?? false);
			} else {
				result.push(await this._setUserEnablementState(extension, newState));
			}
		}

		const changedExtensions = extensions.filter((e, index) => result[index]);
		if (changedExtensions.length) {
			this._onEnablementChanged.fire(changedExtensions);
		}
		return result;
	}

	private getExtensionsToEnableRecursively(extensions: IExtension[], allExtensions: ReadonlyArray<IExtension>, enablementState: EnablementState, options: { dependencies: boolean; pack: boolean }, checked: IExtension[] = []): IExtension[] {
		if (!options.dependencies && !options.pack) {
			return [];
		}

		const toCheck = extensions.filter(e => checked.indexOf(e) === -1);
		if (!toCheck.length) {
			return [];
		}

		for (const extension of toCheck) {
			checked.push(extension);
		}

		const extensionsToEnable: IExtension[] = [];
		for (const extension of allExtensions) {
			// Extension is already checked
			if (checked.some(e => areSameExtensions(e.identifier, extension.identifier))) {
				continue;
			}

			const enablementStateOfExtension = this.getEnablementState(extension);
			// Extension is enabled
			if (this.isEnabledEnablementState(enablementStateOfExtension)) {
				continue;
			}

			// Skip if dependency extension is disabled by extension kind
			if (enablementStateOfExtension === EnablementState.DisabledByExtensionKind) {
				continue;
			}

			// Check if the extension is a dependency or in extension pack
			if (extensions.some(e =>
				(options.dependencies && e.manifest.extensionDependencies?.some(id => areSameExtensions({id}, extension.identifier)))
				|| (options.pack && e.manifest.extensionPack?.some(id => areSameExtensions({id}, extension.identifier))))) {

				const index = extensionsToEnable.findIndex(e => areSameExtensions(e.identifier, extension.identifier));

				// Extension is not added to the disablement list so add it
				if (index === -1) {
					extensionsToEnable.push(extension);
				}

				// Extension is there already in the disablement list.
				else {
					try {
						// Replace only if the enablement state can be changed
						this.throwErrorIfEnablementStateCannotBeChanged(extension, enablementStateOfExtension, true);
						extensionsToEnable.splice(index, 1, extension);
					} catch (error) { /*Do not add*/ }
				}
			}
		}

		if (extensionsToEnable.length) {
			extensionsToEnable.push(...this.getExtensionsToEnableRecursively(extensionsToEnable, allExtensions, enablementState, options, checked));
		}

		return extensionsToEnable;
	}

	private _setUserEnablementState(extension: IExtension, newState: EnablementState): Promise<boolean> {

		// const currentState = this._getUserEnablementState(extension.identifier);

		// if (currentState === newState) {
		// 	return Promise.resolve(false);
		// }

		switch (newState) {
			case EnablementState.EnabledWorkspace:
				this._enableExtensionInWorkspace(extension.identifier);
				break;
			case EnablementState.DisabledWorkspace:
				this._disableExtensionInWorkspace(extension.identifier);
				break;
		}

		return Promise.resolve(true);
	}

	isEnabled(extension: IExtension): boolean {
		const enablementState = this.getEnablementState(extension);
		return this.isEnabledEnablementState(enablementState);
	}

	isEnabledEnablementState(enablementState: EnablementState): boolean {
		return enablementState === EnablementState.EnabledByEnvironment || enablementState === EnablementState.EnabledWorkspace || enablementState === EnablementState.EnabledGlobally;
	}

	private _isDisabledInEnv(extension: IExtension): boolean {
		if (this.allUserExtensionsDisabled) {
			return !extension.isBuiltin && !isResolverExtension(extension.manifest, this.environmentService.remoteAuthority);
		}

		const disabledExtensions = this.environmentService.disableExtensions;
		if (Array.isArray(disabledExtensions)) {
			return disabledExtensions.some(id => areSameExtensions({id}, extension.identifier));
		}

		// Check if this is the better merge extension which was migrated to a built-in extension
		if (areSameExtensions({id: BetterMergeId.value}, extension.identifier)) {
			return true;
		}

		return false;
	}

	private _isEnabledInEnv(extension: IExtension): boolean {
		const enabledExtensions = this.environmentService.enableExtensions;
		if (Array.isArray(enabledExtensions)) {
			return enabledExtensions.some(id => areSameExtensions({id}, extension.identifier));
		}
		return false;
	}

	private _isDisabledByVirtualWorkspace(extension: IExtension, workspaceType: WorkspaceType): boolean {
		// Not a virtual workspace
		if (!workspaceType.virtual) {
			return false;
		}

		// Supports virtual workspace
		if (this.extensionManifestPropertiesService.getExtensionVirtualWorkspaceSupportType(extension.manifest) !== false) {
			return false;
		}

		// Web extension from web extension management server
		// if (this.extensionManagementServerService.getExtensionManagementServer(extension) === this.extensionManagementServerService.webExtensionManagementServer && this.extensionManifestPropertiesService.canExecuteOnWeb(extension.manifest)) {
		// 	return false;
		// }

		return true;
	}

	private _isDisabledByWorkspaceTrust(extension: IExtension, workspaceType: WorkspaceType): boolean {
		if (workspaceType.trusted) {
			return false;
		}

		return this.extensionManifestPropertiesService.getExtensionUntrustedWorkspaceSupportType(extension.manifest) === false;
	}	

	private _enableExtensionInWorkspace(identifier: IExtensionIdentifier): void {
		this._removeFromWorkspaceDisabledExtensions(identifier);
		this._addToWorkspaceEnabledExtensions(identifier);
	}

	private _disableExtensionInWorkspace(identifier: IExtensionIdentifier): void {
		this._addToWorkspaceDisabledExtensions(identifier);
		this._removeFromWorkspaceEnabledExtensions(identifier);
	}

	private _addToWorkspaceDisabledExtensions(identifier: IExtensionIdentifier): Promise<boolean> {
		if (!this.hasWorkspace) {
			return Promise.resolve(false);
		}
		const disabledExtensions = this._getWorkspaceDisabledExtensions();
		if (disabledExtensions.every(e => !areSameExtensions(e, identifier))) {
			disabledExtensions.push(identifier);
			this._setDisabledExtensions(disabledExtensions);
			return Promise.resolve(true);
		}
		return Promise.resolve(false);
	}

	private async _removeFromWorkspaceDisabledExtensions(identifier: IExtensionIdentifier): Promise<boolean> {
		if (!this.hasWorkspace) {
			return false;
		}
		const disabledExtensions = this._getWorkspaceDisabledExtensions();
		for (let index = 0; index < disabledExtensions.length; index++) {
			const disabledExtension = disabledExtensions[index];
			if (areSameExtensions(disabledExtension, identifier)) {
				disabledExtensions.splice(index, 1);
				this._setDisabledExtensions(disabledExtensions);
				return true;
			}
		}
		return false;
	}

	private _addToWorkspaceEnabledExtensions(identifier: IExtensionIdentifier): boolean {
		if (!this.hasWorkspace) {
			return false;
		}
		const enabledExtensions = this._getWorkspaceEnabledExtensions();
		if (enabledExtensions.every(e => !areSameExtensions(e, identifier))) {
			enabledExtensions.push(identifier);
			this._setEnabledExtensions(enabledExtensions);
			return true;
		}
		return false;
	}

	private _removeFromWorkspaceEnabledExtensions(identifier: IExtensionIdentifier): boolean {
		if (!this.hasWorkspace) {
			return false;
		}
		const enabledExtensions = this._getWorkspaceEnabledExtensions();
		for (let index = 0; index < enabledExtensions.length; index++) {
			const disabledExtension = enabledExtensions[index];
			if (areSameExtensions(disabledExtension, identifier)) {
				enabledExtensions.splice(index, 1);
				this._setEnabledExtensions(enabledExtensions);
				return true;
			}
		}
		return false;
	}

	protected _getWorkspaceEnabledExtensions(): IExtensionIdentifier[] {
		return this._getExtensions(ENABLED_EXTENSIONS_STORAGE_PATH);
	}

	private _setEnabledExtensions(enabledExtensions: IExtensionIdentifier[]): void {
		this._setExtensions(ENABLED_EXTENSIONS_STORAGE_PATH, enabledExtensions);
	}

	protected _getWorkspaceDisabledExtensions(): IExtensionIdentifier[] {
		return this._getExtensions(DISABLED_EXTENSIONS_STORAGE_PATH);
	}

	private _setDisabledExtensions(disabledExtensions: IExtensionIdentifier[]): void {
		this._setExtensions(DISABLED_EXTENSIONS_STORAGE_PATH, disabledExtensions);
	}

	private _getExtensions(storageId: string): IExtensionIdentifier[] {
		if (!this.hasWorkspace) {
			return [];
		}
		return this.storageManger.get(storageId, StorageScope.WORKSPACE);
	}

	private _setExtensions(storageId: string, extensions: IExtensionIdentifier[]): void {
		this.storageManger.set(storageId, extensions, StorageScope.WORKSPACE);
	}
}

class ExtensionsManager extends Disposable {

	private _extensions: IExtension[] = [];
	get extensions(): readonly IExtension[] { return this._extensions; }

	private _onDidChangeExtensions = this._register(new Emitter<{ added: readonly IExtension[]; removed: readonly IExtension[]; readonly isProfileSwitch: boolean }>());
	readonly onDidChangeExtensions = this._onDidChangeExtensions.event;

	private disposed: boolean = false;

	constructor(
		@IWorkbenchExtensionManagementService private readonly extensionManagementService: IWorkbenchExtensionManagementService,
		// @IExtensionManagementServerService private readonly extensionManagementServerService: IExtensionManagementServerService,
		@ILogService private readonly logService: ILogService
	) {
		super();
		this._register(toDisposable(() => this.disposed = true))
	}
}

registerSingleton(IWorkbenchExtensionEnablementService, ExtensionEnablementService, InstantiationType.Delayed);
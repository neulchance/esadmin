/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {Event, EventMultiplexer} from 'td/base/common/event';
import {
	ILocalExtension, IGalleryExtension, IExtensionIdentifier, IExtensionsControlManifest, IExtensionGalleryService, InstallOptions, UninstallOptions, InstallVSIXOptions, InstallExtensionResult, ExtensionManagementError, ExtensionManagementErrorCode, Metadata, InstallOperation, EXTENSION_INSTALL_SYNC_CONTEXT, InstallExtensionInfo,
	IExtensionManagementParticipant,
	IGalleryMetadata
} from 'td/platform/extensionManagement/common/extensionManagement';
import {DidChangeProfileForServerEvent, DidUninstallExtensionOnServerEvent, IExtensionManagementServer, IExtensionManagementServerService, InstallExtensionOnServerEvent, IWorkbenchExtensionManagementService, UninstallExtensionOnServerEvent} from 'td/workbench/services/extensionManagement/common/extensionManagement';
import {ExtensionType, isLanguagePackExtension, IExtensionManifest, getWorkspaceSupportTypeMessage, TargetPlatform, IRelaxedExtensionManifest} from 'td/platform/extensions/common/extensions';
import {URI} from 'td/base/common/uri';
import {Disposable} from 'td/base/common/lifecycle';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {CancellationToken} from 'td/base/common/cancellation';
import {areSameExtensions, computeTargetPlatform} from 'td/platform/extensionManagement/common/extensionManagementUtil';
import {localize} from 'td/nls';
import {IProductService} from 'td/platform/product/common/productService';
import {Schemas} from 'td/base/common/network';
import {IDownloadService} from 'td/platform/download/common/download';
import {flatten} from 'td/base/common/arrays';
import {IDialogService, IPromptButton} from 'td/platform/dialogs/common/dialogs';
import Severity from 'td/base/common/severity';
import {IUserDataSyncEnablementService, SyncResource} from 'td/platform/userDataSync/common/userDataSync';
import {Promises} from 'td/base/common/async';
import {IWorkspaceTrustRequestService} from 'td/platform/workspace/common/workspaceTrust';
import {IExtensionManifestPropertiesService} from 'td/workbench/services/extensions/common/extensionManifestPropertiesService';
import {IInstantiationService} from 'td/platform/instantiation/common/instantiation';
import {ICommandService} from 'td/platform/commands/common/commands';
import {isUndefined} from 'td/base/common/types';
import {IFileService} from 'td/platform/files/common/files';
import {ILogService} from 'td/platform/log/common/log';
import {CancellationError} from 'td/base/common/errors';
import {IUserDataProfileService} from 'td/workbench/services/userDataProfile/common/userDataProfile';

export class ExtensionManagementService extends Disposable implements IWorkbenchExtensionManagementService {

	declare readonly _serviceBrand: undefined;

	readonly onInstallExtension: Event<InstallExtensionOnServerEvent>;
	readonly onDidInstallExtensions: Event<readonly InstallExtensionResult[]>;
	readonly onUninstallExtension: Event<UninstallExtensionOnServerEvent>;
	readonly onDidUninstallExtension: Event<DidUninstallExtensionOnServerEvent>;
	readonly onDidUpdateExtensionMetadata: Event<ILocalExtension>;
	readonly onDidChangeProfile: Event<DidChangeProfileForServerEvent>;

	protected readonly servers: IExtensionManagementServer[] = [];

	constructor(
		// @IExtensionManagementServerService protected readonly extensionManagementServerService: IExtensionManagementServerService,
		// @IExtensionGalleryService private readonly extensionGalleryService: IExtensionGalleryService,
		@IUserDataProfileService private readonly userDataProfileService: IUserDataProfileService,
		@IConfigurationService protected readonly configurationService: IConfigurationService,
		@IProductService protected readonly productService: IProductService,
		// @IDownloadService protected readonly downloadService: IDownloadService,
		// @IUserDataSyncEnablementService private readonly userDataSyncEnablementService: IUserDataSyncEnablementService,
		@IDialogService private readonly dialogService: IDialogService,
		@IWorkspaceTrustRequestService private readonly workspaceTrustRequestService: IWorkspaceTrustRequestService,
		@IExtensionManifestPropertiesService private readonly extensionManifestPropertiesService: IExtensionManifestPropertiesService,
		@IFileService private readonly fileService: IFileService,
		@ILogService private readonly logService: ILogService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
	) {
		super();

		this.onInstallExtension = this._register(this.servers.reduce((emitter: EventMultiplexer<InstallExtensionOnServerEvent>, server) => { this._register(emitter.add(Event.map(server.extensionManagementService.onInstallExtension, e => ({...e, server})))); return emitter; }, this._register(new EventMultiplexer<InstallExtensionOnServerEvent>()))).event;
		this.onDidInstallExtensions = this._register(this.servers.reduce((emitter: EventMultiplexer<readonly InstallExtensionResult[]>, server) => { this._register(emitter.add(server.extensionManagementService.onDidInstallExtensions)); return emitter; }, this._register(new EventMultiplexer<readonly InstallExtensionResult[]>()))).event;
		this.onUninstallExtension = this._register(this.servers.reduce((emitter: EventMultiplexer<UninstallExtensionOnServerEvent>, server) => { this._register(emitter.add(Event.map(server.extensionManagementService.onUninstallExtension, e => ({...e, server})))); return emitter; }, this._register(new EventMultiplexer<UninstallExtensionOnServerEvent>()))).event;
		this.onDidUninstallExtension = this._register(this.servers.reduce((emitter: EventMultiplexer<DidUninstallExtensionOnServerEvent>, server) => { this._register(emitter.add(Event.map(server.extensionManagementService.onDidUninstallExtension, e => ({...e, server})))); return emitter; }, this._register(new EventMultiplexer<DidUninstallExtensionOnServerEvent>()))).event;
		this.onDidUpdateExtensionMetadata = this._register(this.servers.reduce((emitter: EventMultiplexer<ILocalExtension>, server) => { this._register(emitter.add(server.extensionManagementService.onDidUpdateExtensionMetadata)); return emitter; }, this._register(new EventMultiplexer<ILocalExtension>()))).event;
		this.onDidChangeProfile = this._register(this.servers.reduce((emitter: EventMultiplexer<DidChangeProfileForServerEvent>, server) => { this._register(emitter.add(Event.map(server.extensionManagementService.onDidChangeProfile, e => ({...e, server})))); return emitter; }, this._register(new EventMultiplexer<DidChangeProfileForServerEvent>()))).event;
	}
	installVSIX(location: URI, manifest: Readonly<IRelaxedExtensionManifest>, installOptions?: InstallVSIXOptions | undefined): Promise<ILocalExtension> {
		throw new Error('Method not implemented.');
	}
	installFromLocation(location: URI): Promise<ILocalExtension> {
		throw new Error('Method not implemented.');
	}
	updateFromGallery(gallery: IGalleryExtension, extension: ILocalExtension, installOptions?: InstallOptions | undefined): Promise<ILocalExtension> {
		throw new Error('Method not implemented.');
	}
	zip(extension: ILocalExtension): Promise<URI> {
		throw new Error('Method not implemented.');
	}
	unzip(zipLocation: URI): Promise<IExtensionIdentifier> {
		throw new Error('Method not implemented.');
	}
	getManifest(vsix: URI): Promise<Readonly<IRelaxedExtensionManifest>> {
		throw new Error('Method not implemented.');
	}
	install(vsix: URI, options?: InstallVSIXOptions | undefined): Promise<ILocalExtension> {
		throw new Error('Method not implemented.');
	}
	canInstall(extension: IGalleryExtension): Promise<boolean> {
		throw new Error('Method not implemented.');
	}
	installFromGallery(extension: IGalleryExtension, options?: InstallOptions | undefined): Promise<ILocalExtension> {
		throw new Error('Method not implemented.');
	}
	installGalleryExtensions(extensions: InstallExtensionInfo[]): Promise<InstallExtensionResult[]> {
		throw new Error('Method not implemented.');
	}
	installExtensionsFromProfile(extensions: IExtensionIdentifier[], fromProfileLocation: URI, toProfileLocation: URI): Promise<ILocalExtension[]> {
		throw new Error('Method not implemented.');
	}
	uninstall(extension: ILocalExtension, options?: UninstallOptions | undefined): Promise<void> {
		throw new Error('Method not implemented.');
	}
	toggleAppliationScope(extension: ILocalExtension, fromProfileLocation: URI): Promise<ILocalExtension> {
		throw new Error('Method not implemented.');
	}
	reinstallFromGallery(extension: ILocalExtension): Promise<ILocalExtension> {
		throw new Error('Method not implemented.');
	}
	getInstalled(type?: ExtensionType | undefined, profileLocation?: URI | undefined): Promise<ILocalExtension[]> {
		throw new Error('Method not implemented.');
	}
	getExtensionsControlManifest(): Promise<IExtensionsControlManifest> {
		throw new Error('Method not implemented.');
	}
	copyExtensions(fromProfileLocation: URI, toProfileLocation: URI): Promise<void> {
		throw new Error('Method not implemented.');
	}
	updateMetadata(local: ILocalExtension, metadata: Partial<Partial<IGalleryMetadata & { isApplicationScoped: boolean; isMachineScoped: boolean; isBuiltin: boolean; isSystem: boolean; updated: boolean; preRelease: boolean; installedTimestamp: number; pinned: boolean; }>>, profileLocation?: URI | undefined): Promise<ILocalExtension> {
		throw new Error('Method not implemented.');
	}
	download(extension: IGalleryExtension, operation: InstallOperation, donotVerifySignature: boolean): Promise<URI> {
		throw new Error('Method not implemented.');
	}
	registerParticipant(pariticipant: IExtensionManagementParticipant): void {
		throw new Error('Method not implemented.');
	}
	getTargetPlatform(): Promise<TargetPlatform> {
		throw new Error('Method not implemented.');
	}
	cleanUp(): Promise<void> {
		throw new Error('Method not implemented.');
	}
}

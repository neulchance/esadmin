/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {Event} from 'td/base/common/event';
import {URI} from 'td/base/common/uri';
import {ExtensionIdentifier, IExtensionDescription} from 'td/platform/extensions/common/extensions';
import {ExtensionHostKind} from 'td/workbench/services/extensions/common/extensionHostKind';
import {IExtensionDescriptionDelta} from 'td/workbench/services/extensions/common/extensionHostProtocol';
import {IResolveAuthorityResult} from 'td/workbench/services/extensions/common/extensionHostProxy';
import {ExtensionRunningLocation} from 'td/workbench/services/extensions/common/extensionRunningLocation';
import {ActivationKind, ExtensionActivationReason, ExtensionHostStartup} from 'td/workbench/services/extensions/common/extensions';
import {ResponsiveState} from 'td/workbench/services/extensions/common/rpcProtocol';

export interface IExtensionHostManager {
	readonly pid: number | null;
	readonly kind: ExtensionHostKind;
	readonly startup: ExtensionHostStartup;
	readonly friendyName: string;
	readonly onDidExit: Event<[number, string | null]>;
	readonly onDidChangeResponsiveState: Event<ResponsiveState>;
	dispose(): void;
	ready(): Promise<void>;
	representsRunningLocation(runningLocation: ExtensionRunningLocation): boolean;
	deltaExtensions(extensionsDelta: IExtensionDescriptionDelta): Promise<void>;
	containsExtension(extensionId: ExtensionIdentifier): boolean;
	activate(extension: ExtensionIdentifier, reason: ExtensionActivationReason): Promise<boolean>;
	activateByEvent(activationEvent: string, activationKind: ActivationKind): Promise<void>;
	activationEventIsDone(activationEvent: string): boolean;
	getInspectPort(tryEnableInspector: boolean): Promise<number>;
	resolveAuthority(remoteAuthority: string, resolveAttempt: number): Promise<IResolveAuthorityResult>;
	/**
	 * Returns `null` if no resolver for `remoteAuthority` is found.
	 */
	getCanonicalURI(remoteAuthority: string, uri: URI): Promise<URI | null>;
	start(extensionRegistryVersionId: number, allExtensions: readonly IExtensionDescription[], myExtensions: ExtensionIdentifier[]): Promise<void>;
	extensionTestsExecute(): Promise<number>;
	setRemoteEnvironment(env: { [key: string]: string | null }): Promise<void>;
}

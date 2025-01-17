/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {Schemas} from 'td/base/common/network';
import {URI} from 'td/base/common/uri';
import {IWorkspace} from 'td/platform/workspace/common/workspace';

export function isVirtualResource(resource: URI) {
	return resource.scheme !== Schemas.file && resource.scheme !== Schemas.vscodeRemote;
}

export function getVirtualWorkspaceLocation(workspace: IWorkspace): { scheme: string; authority: string } | undefined {
	if (workspace.folders.length) {
		return workspace.folders.every(f => isVirtualResource(f.uri)) ? workspace.folders[0].uri : undefined;
	} else if (workspace.configuration && isVirtualResource(workspace.configuration)) {
		return workspace.configuration;
	}
	return undefined;
}

export function getVirtualWorkspaceScheme(workspace: IWorkspace): string | undefined {
	return getVirtualWorkspaceLocation(workspace)?.scheme;
}

export function getVirtualWorkspaceAuthority(workspace: IWorkspace): string | undefined {
	return getVirtualWorkspaceLocation(workspace)?.authority;
}

export function isVirtualWorkspace(workspace: IWorkspace): boolean {
	return getVirtualWorkspaceLocation(workspace) !== undefined;
}

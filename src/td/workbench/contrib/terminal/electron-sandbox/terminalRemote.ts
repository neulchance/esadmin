/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {Schemas} from 'td/base/common/network';
import {URI} from 'td/base/common/uri';
import {localize2} from 'td/nls';
import {INativeEnvironmentService} from 'td/platform/environment/common/environment';
import {IRemoteAuthorityResolverService} from 'td/platform/remote/common/remoteAuthorityResolver';
import {registerTerminalAction} from 'td/workbench/contrib/terminal/browser/terminalActions';
import {TerminalCommandId} from 'td/workbench/contrib/terminal/common/terminal';
import {IHistoryService} from 'td/workbench/services/history/common/history';

export function registerRemoteContributions() {
	registerTerminalAction({
		id: TerminalCommandId.NewLocal,
		title: localize2('workbench.action.terminal.newLocal', 'Create New Integrated Terminal (Local)'),
		run: async (c, accessor) => {
			const historyService = accessor.get(IHistoryService);
			const remoteAuthorityResolverService = accessor.get(IRemoteAuthorityResolverService);
			const nativeEnvironmentService = accessor.get(INativeEnvironmentService);
			let cwd: URI | undefined;
			try {
				const activeWorkspaceRootUri = historyService.getLastActiveWorkspaceRoot(Schemas.vscodeRemote);
				if (activeWorkspaceRootUri) {
					const canonicalUri = await remoteAuthorityResolverService.getCanonicalURI(activeWorkspaceRootUri);
					if (canonicalUri.scheme === Schemas.file) {
						cwd = canonicalUri;
					}
				}
			} catch { }
			if (!cwd) {
				cwd = nativeEnvironmentService.userHome;
			}
			const instance = await c.service.createTerminal({cwd});
			if (!instance) {
				return Promise.resolve(undefined);
			}

			c.service.setActiveInstance(instance);
			return c.groupService.showPanel(true);
		}
	});
}

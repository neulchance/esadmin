/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {VSBuffer} from 'td/base/common/buffer';
import {Event} from 'td/base/common/event';
import {IDisposable} from 'td/base/common/lifecycle';
import {IPCClient} from 'td/base/parts/ipc/common/ipc';
import {Protocol as ElectronProtocol} from 'td/base/parts/ipc/common/ipc.electron';
import {ipcRenderer} from 'td/base/parts/sandbox/electron-sandbox/globals';

/**
 * An implementation of `IPCClient` on top of Electron `ipcRenderer` IPC communication
 * provided from sandbox globals (via preload script).
 */
export class Client extends IPCClient implements IDisposable {

	private protocol: ElectronProtocol;

	private static createProtocol(): ElectronProtocol {
		const onMessage = Event.fromNodeEventEmitter<VSBuffer>(ipcRenderer, 'vscode:message', (_, message) => VSBuffer.wrap(message));
		ipcRenderer.send('vscode:hello');

		return new ElectronProtocol(ipcRenderer, onMessage);
	}

	constructor(id: string) {
		const protocol = Client.createProtocol();
		super(protocol, id);

		this.protocol = protocol;
	}

	override dispose(): void {
		this.protocol.disconnect();
		super.dispose();
	}
}

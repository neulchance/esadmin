/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {WebContents} from 'electron';
import {validatedIpcMain} from 'td/base/parts/ipc/electron-main/ipcMain';
import {VSBuffer} from 'td/base/common/buffer';
import {Emitter, Event} from 'td/base/common/event';
import {IDisposable, toDisposable} from 'td/base/common/lifecycle';
import {ClientConnectionEvent, IPCServer} from 'td/base/parts/ipc/common/ipc';
import {Protocol as ElectronProtocol} from 'td/base/parts/ipc/common/ipc.electron';

interface IIPCEvent {
	event: { sender: WebContents };
	message: Buffer | null;
}

function createScopedOnMessageEvent(senderId: number, eventName: string): Event<VSBuffer | null> {
	const onMessage = Event.fromNodeEventEmitter<IIPCEvent>(validatedIpcMain, eventName, (event, message) => ({event, message}));
	const onMessageFromSender = Event.filter(onMessage, ({event}) => event.sender.id === senderId);

	return Event.map(onMessageFromSender, ({message}) => message ? VSBuffer.wrap(message) : message);
}

/**
 * An implementation of `IPCServer` on top of Electron `ipcMain` API.
 */
export class Server extends IPCServer {

	private static readonly Clients = new Map<number, IDisposable>();

	private static getOnDidClientConnect(): Event<ClientConnectionEvent> {
		const onHello = Event.fromNodeEventEmitter<WebContents>(validatedIpcMain, 'vscode:hello', ({sender}) => sender);

		return Event.map(onHello, webContents => {
			const id = webContents.id;
			const client = Server.Clients.get(id);

			client?.dispose();

			const onDidClientReconnect = new Emitter<void>();
			Server.Clients.set(id, toDisposable(() => onDidClientReconnect.fire()));

			const onMessage = createScopedOnMessageEvent(id, 'vscode:message') as Event<VSBuffer>;
			const onDidClientDisconnect = Event.any(Event.signal(createScopedOnMessageEvent(id, 'vscode:disconnect')), onDidClientReconnect.event);
			const protocol = new ElectronProtocol(webContents, onMessage);

			return {protocol, onDidClientDisconnect};
		});
	}

	constructor() {
		super(Server.getOnDidClientConnect());
	}
}

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {mainWindow} from 'td/base/browser/window';
import {Event} from 'td/base/common/event';
import {generateUuid} from 'td/base/common/uuid';
import {ipcMessagePort, ipcRenderer} from 'td/base/parts/sandbox/electron-sandbox/globals';

interface IMessageChannelResult {
	nonce: string;
	port: MessagePort;
	source: unknown;
}

export async function acquirePort(requestChannel: string | undefined, responseChannel: string, nonce = generateUuid()): Promise<MessagePort> {

	// Get ready to acquire the message port from the
	// provided `responseChannel` via preload helper.
	ipcMessagePort.acquire(responseChannel, nonce);

	// If a `requestChannel` is provided, we are in charge
	// to trigger acquisition of the message port from main
	if (typeof requestChannel === 'string') {
		ipcRenderer.send(requestChannel, nonce);
	}

	// Wait until the main side has returned the `MessagePort`
	// We need to filter by the `nonce` to ensure we listen
	// to the right response.
	// 🦑: [3-2] window.onmessage 
	const onMessageChannelResult = Event.fromDOMEventEmitter<IMessageChannelResult>(mainWindow, 'message', (e: MessageEvent) => ({nonce: e.data, port: e.ports[0], source: e.source}));
	const {port} = await Event.toPromise(Event.once(Event.filter(onMessageChannelResult, e => e.nonce === nonce && e.source === mainWindow)));
	
	// 🦑: [3-3] return to [3-0]
	return port;
}

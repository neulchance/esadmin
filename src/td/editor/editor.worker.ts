/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {SimpleWorkerServer} from 'td/base/common/worker/simpleWorker';
import {EditorSimpleWorker} from 'td/editor/common/services/editorSimpleWorker';
import {IEditorWorkerHost} from 'td/editor/common/services/editorWorkerHost';

let initialized = false;

export function initialize(foreignModule: any) {
	if (initialized) {
		return;
	}
	initialized = true;

	const simpleWorker = new SimpleWorkerServer((msg) => {
		globalThis.postMessage(msg);
	}, (host: IEditorWorkerHost) => new EditorSimpleWorker(host, foreignModule));

	globalThis.onmessage = (e: MessageEvent) => {
		simpleWorker.onmessage(e.data);
	};
}

globalThis.onmessage = (e: MessageEvent) => {
	// Ignore first message in this case and initialize if not yet initialized
	if (!initialized) {
		initialize(null);
	}
};

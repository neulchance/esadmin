/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {DisposableStore} from 'td/base/common/lifecycle';
import {IFileChange} from 'td/platform/files/common/files';
import {ILogMessage, AbstractNonRecursiveWatcherClient, INonRecursiveWatcher} from 'td/platform/files/common/watcher';
import {NodeJSWatcher} from 'td/platform/files/node/watcher/nodejs/nodejsWatcher';

export class NodeJSWatcherClient extends AbstractNonRecursiveWatcherClient {

	constructor(
		onFileChanges: (changes: IFileChange[]) => void,
		onLogMessage: (msg: ILogMessage) => void,
		verboseLogging: boolean
	) {
		super(onFileChanges, onLogMessage, verboseLogging);

		this.init();
	}

	protected override createWatcher(disposables: DisposableStore): INonRecursiveWatcher {
		return disposables.add(new NodeJSWatcher());
	}
}

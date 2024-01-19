/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {DisposableStore, toDisposable} from 'td/base/common/lifecycle';
import {getDelayedChannel, ProxyChannel} from 'td/base/parts/ipc/common/ipc';
import {IFileChange} from 'td/platform/files/common/files';
import {AbstractUniversalWatcherClient, ILogMessage, IRecursiveWatcher} from 'td/platform/files/common/watcher';
import {IUtilityProcessWorkerWorkbenchService} from 'td/workbench/services/utilityProcess/electron-sandbox/utilityProcessWorkerWorkbenchService';

export class UniversalWatcherClient extends AbstractUniversalWatcherClient {

	constructor(
		onFileChanges: (changes: IFileChange[]) => void,
		onLogMessage: (msg: ILogMessage) => void,
		verboseLogging: boolean,
		private readonly utilityProcessWorkerWorkbenchService: IUtilityProcessWorkerWorkbenchService
	) {
		super(onFileChanges, onLogMessage, verboseLogging);

		this.init();
	}

	protected override createWatcher(disposables: DisposableStore): IRecursiveWatcher {
		const watcher = ProxyChannel.toService<IRecursiveWatcher>(getDelayedChannel((async () => {

			// Acquire universal watcher via utility process worker
			//
			// We explicitly do not add the worker as a disposable
			// because we need to call `stop` on disposal to prevent
			// a crash on shutdown (see below).
			//
			// The utility process worker services ensures to terminate
			// the process automatically when the window closes or reloads.
			const {client, onDidTerminate} = await this.utilityProcessWorkerWorkbenchService.createWorker({
				moduleId: 'td/platform/files/node/watcher/watcherMain',
				type: 'fileWatcher'
			});

			// React on unexpected termination of the watcher process
			// by listening to the `onDidTerminate` event. We do not
			// consider an exit code of `0` as abnormal termination.

			onDidTerminate.then(({reason}) => {
				if (reason?.code === 0) {
					this.trace(`terminated by itself with code ${reason.code}, signal: ${reason.signal}`);
				} else {
					this.onError(`terminated by itself unexpectedly with code ${reason?.code}, signal: ${reason?.signal}`);
				}
			});

			return client.getChannel('watcher');
		})()));

		// Looks like universal watcher needs an explicit stop
		// to prevent access on data structures after process
		// exit. This only seem to be happening when used from
		// Electron, not pure node.js.
		// https://github.com/microsoft/vscode/issues/136264
		disposables.add(toDisposable(() => watcher.stop()));

		return watcher;
	}
}

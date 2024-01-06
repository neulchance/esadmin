/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {ConsoleLogger, ILogger} from 'td/platform/log/common/log';
import {INativeWorkbenchEnvironmentService} from 'td/workbench/services/environment/electron-sandbox/environmentService';
import {LoggerChannelClient} from 'td/platform/log/common/logIpc';
import {DisposableStore} from 'td/base/common/lifecycle';
import {localize} from 'td/nls';
import {windowLogId} from 'td/workbench/services/log/common/logConstants';
import {LogService} from 'td/platform/log/common/logService';

export class NativeLogService extends LogService {

	constructor(loggerService: LoggerChannelClient, environmentService: INativeWorkbenchEnvironmentService) {

		const disposables = new DisposableStore();

		const fileLogger = disposables.add(loggerService.createLogger(environmentService.logFile, {id: windowLogId, name: localize('rendererLog', "Window")}));

		let consoleLogger: ILogger;
		if (environmentService.isExtensionDevelopment && !!environmentService.extensionTestsLocationURI) {
			// Extension development test CLI: forward everything to main side
			consoleLogger = loggerService.createConsoleMainLogger();
		} else {
			// Normal mode: Log to console
			consoleLogger = new ConsoleLogger(fileLogger.getLevel());
		}

		super(fileLogger, [consoleLogger]);

		this._register(disposables);
	}
}

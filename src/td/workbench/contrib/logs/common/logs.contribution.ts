/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'td/nls';
import {Registry} from 'td/platform/registry/common/platform';
import {Categories} from 'td/platform/action/common/actionCommonCategories';
import {Action2, registerAction2} from 'td/platform/actions/common/actions';
import {SetLogLevelAction} from 'td/workbench/contrib/logs/common/logsActions';
import {IWorkbenchContribution, IWorkbenchContributionsRegistry, Extensions as WorkbenchExtensions} from 'td/workbench/common/contributions';
import {IFileService, whenProviderRegistered} from 'td/platform/files/common/files';
import {IOutputChannelRegistry, IOutputService, Extensions} from 'td/workbench/services/output/common/output';
import {Disposable, DisposableMap, DisposableStore, toDisposable} from 'td/base/common/lifecycle';
import {CONTEXT_LOG_LEVEL, ILogService, ILoggerResource, ILoggerService, LogLevel, LogLevelToString, isLogLevel} from 'td/platform/log/common/log';
import {LifecyclePhase} from 'td/workbench/services/lifecycle/common/lifecycle';
import {IInstantiationService, ServicesAccessor} from 'td/platform/instantiation/common/instantiation';
import {URI} from 'td/base/common/uri';
import {Event} from 'td/base/common/event';
import {windowLogId, showWindowLogActionId} from 'td/workbench/services/log/common/logConstants';
import {createCancelablePromise, timeout} from 'td/base/common/async';
import {CancellationError, getErrorMessage, isCancellationError} from 'td/base/common/errors';
import {CancellationToken} from 'td/base/common/cancellation';
import {IDefaultLogLevelsService} from 'td/workbench/contrib/logs/common/defaultLogLevels';
import {ContextKeyExpr, IContextKeyService} from 'td/platform/contextkey/common/contextkey';
import {CounterSet} from 'td/base/common/map';
import {IUriIdentityService} from 'td/platform/uriIdentity/common/uriIdentity';
import {Schemas} from 'td/base/common/network';

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: SetLogLevelAction.ID,
			title: SetLogLevelAction.TITLE,
			category: Categories.Developer,
			f1: true
		});
	}
	run(servicesAccessor: ServicesAccessor): Promise<void> {
		console.log(`\x1b[31m[TD] SetLogLevelAction.run\x1b[0m]`)
		return servicesAccessor.get(IInstantiationService).createInstance(SetLogLevelAction, SetLogLevelAction.ID, SetLogLevelAction.TITLE.value).run();
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: 'workbench.action.setDefaultLogLevel',
			title: nls.localize2('setDefaultLogLevel', "Set Default Log Level"),
			category: Categories.Developer,
		});
	}
	run(servicesAccessor: ServicesAccessor, logLevel: LogLevel, extensionId?: string): Promise<void> {
		return servicesAccessor.get(IDefaultLogLevelsService).setDefaultLogLevel(logLevel, extensionId);
	}
});

class LogOutputChannels extends Disposable implements IWorkbenchContribution {

	private readonly contextKeys = new CounterSet<string>();
	private readonly outputChannelRegistry = Registry.as<IOutputChannelRegistry>(Extensions.OutputChannels);
	private readonly loggerDisposables = this._register(new DisposableMap());

	constructor(
		@ILogService private readonly logService: ILogService,
		@ILoggerService private readonly loggerService: ILoggerService,
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
		@IFileService private readonly fileService: IFileService,
		@IUriIdentityService private readonly uriIdentityService: IUriIdentityService,
	) {
		super();
		const contextKey = CONTEXT_LOG_LEVEL.bindTo(contextKeyService);
		// loggerService.getLogLevel()
		contextKey.set(LogLevelToString(loggerService.getLogLevel()));
		loggerService.onDidChangeLogLevel(e => {
			if (isLogLevel(e)) {
				contextKey.set(LogLevelToString(loggerService.getLogLevel()));
			}
		});

		this.onDidAddLoggers(loggerService.getRegisteredLoggers());
		this._register(loggerService.onDidChangeLoggers(({added, removed}) => {
			this.onDidAddLoggers(added);
			this.onDidRemoveLoggers(removed);
		}));
		this._register(loggerService.onDidChangeVisibility(([resource, visibility]) => {
			const logger = loggerService.getRegisteredLogger(resource);
			if (logger) {
				if (visibility) {
					this.registerLogChannel(logger);
				} else {
					this.deregisterLogChannel(logger);
				}
			}
		}));
		this.registerShowWindowLogAction();
		this._register(Event.filter(contextKeyService.onDidChangeContext, e => e.affectsSome(this.contextKeys))(() => this.onDidChangeContext()));
	}

	private onDidAddLoggers(loggers: Iterable<ILoggerResource>): void {
		for (const logger of loggers) {
			if (logger.when) {
				const contextKeyExpr = ContextKeyExpr.deserialize(logger.when);
				if (contextKeyExpr) {
					for (const key of contextKeyExpr.keys()) {
						this.contextKeys.add(key);
					}
					if (!this.contextKeyService.contextMatchesRules(contextKeyExpr)) {
						continue;
					}
				}
			}
			if (logger.hidden) {
				continue;
			}
			this.registerLogChannel(logger);
		}
	}

	private onDidChangeContext(): void {
		for (const logger of this.loggerService.getRegisteredLoggers()) {
			if (logger.when) {
				if (this.contextKeyService.contextMatchesRules(ContextKeyExpr.deserialize(logger.when))) {
					this.registerLogChannel(logger);
				} else {
					this.deregisterLogChannel(logger);
				}
			}
		}
	}

	private onDidRemoveLoggers(loggers: Iterable<ILoggerResource>): void {
		for (const logger of loggers) {
			if (logger.when) {
				const contextKeyExpr = ContextKeyExpr.deserialize(logger.when);
				if (contextKeyExpr) {
					for (const key of contextKeyExpr.keys()) {
						this.contextKeys.delete(key);
					}
				}
			}
			this.deregisterLogChannel(logger);
		}
	}

	private registerLogChannel(logger: ILoggerResource): void {
		const channel = this.outputChannelRegistry.getChannel(logger.id);
		if (channel && this.uriIdentityService.extUri.isEqual(channel.file, logger.resource)) {
			return;
		}
		const disposables = new DisposableStore();
		const promise = createCancelablePromise(async token => {
			await whenProviderRegistered(logger.resource, this.fileService);
			try {
				await this.whenFileExists(logger.resource, 1, token);
				const existingChannel = this.outputChannelRegistry.getChannel(logger.id);
				const remoteLogger = existingChannel?.file?.scheme === Schemas.vscodeRemote ? this.loggerService.getRegisteredLogger(existingChannel.file) : undefined;
				if (remoteLogger) {
					this.deregisterLogChannel(remoteLogger);
				}
				const hasToAppendRemote = existingChannel && logger.resource.scheme === Schemas.vscodeRemote;
				const id = hasToAppendRemote ? `${logger.id}.remote` : logger.id;
				const label = hasToAppendRemote ? nls.localize('remote name', "{0} (Remote)", logger.name ?? logger.id) : logger.name ?? logger.id;
				this.outputChannelRegistry.registerChannel({id, label, file: logger.resource, log: true, extensionId: logger.extensionId});
				disposables.add(toDisposable(() => this.outputChannelRegistry.removeChannel(id)));
				if (remoteLogger) {
					this.registerLogChannel(remoteLogger);
				}
			} catch (error) {
				if (!isCancellationError(error)) {
					this.logService.error('Error while registering log channel', logger.resource.toString(), getErrorMessage(error));
				}
			}
		});
		disposables.add(toDisposable(() => promise.cancel()));
		this.loggerDisposables.set(logger.resource.toString(), disposables);
	}

	private deregisterLogChannel(logger: ILoggerResource): void {
		this.loggerDisposables.deleteAndDispose(logger.resource.toString());
	}

	private async whenFileExists(file: URI, trial: number, token: CancellationToken): Promise<void> {
		const exists = await this.fileService.exists(file);
		if (exists) {
			return;
		}
		if (token.isCancellationRequested) {
			throw new CancellationError();
		}
		if (trial > 10) {
			throw new Error(`Timed out while waiting for file to be created`);
		}
		this.logService.debug(`[Registering Log Channel] File does not exist. Waiting for 1s to retry.`, file.toString());
		await timeout(1000, token);
		await this.whenFileExists(file, trial + 1, token);
	}

	private registerShowWindowLogAction(): void {
		registerAction2(class ShowWindowLogAction extends Action2 {
			constructor() {
				super({
					id: showWindowLogActionId,
					title: nls.localize2('show window log', "Show Window Log"),
					category: Categories.Developer,
					f1: true
				});
			}
			async run(servicesAccessor: ServicesAccessor): Promise<void> {
				const outputService = servicesAccessor.get(IOutputService);
				outputService.showChannel(windowLogId);
			}
		});
	}

}

class LogLevelMigration implements IWorkbenchContribution {
	constructor(
		@IDefaultLogLevelsService defaultLogLevelsService: IDefaultLogLevelsService
	) {
		defaultLogLevelsService.migrateLogLevels();
	}
}

Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(LogOutputChannels, LifecyclePhase.Restored);
Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(LogLevelMigration, LifecyclePhase.Eventually);

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* eslint-disable local/code-no-native-private */

import {RunOnceScheduler} from 'td/base/common/async';
import {VSBuffer} from 'td/base/common/buffer';
import {CancellationToken, CancellationTokenSource} from 'td/base/common/cancellation';
import {Emitter, Event} from 'td/base/common/event';
import {createSingleCallFunction} from 'td/base/common/functional';
import {hash} from 'td/base/common/hash';
import {Disposable, DisposableStore, toDisposable} from 'td/base/common/lifecycle';
import {MarshalledId} from 'td/base/common/marshallingIds';
import {deepFreeze} from 'td/base/common/objects';
import {isDefined} from 'td/base/common/types';
import {generateUuid} from 'td/base/common/uuid';
import {IExtensionDescription, IRelaxedExtensionDescription} from 'td/platform/extensions/common/extensions';
import {ILogService} from 'td/platform/log/common/log';
import {ExtHostTestingShape, ILocationDto, MainContext, MainThreadTestingShape} from 'td/workbench/api/common/extHost.protocol';
import {ExtHostCommands} from 'td/workbench/api/common/extHostCommands';
import {ExtHostDocumentsAndEditors} from 'td/workbench/api/common/extHostDocumentsAndEditors';
import {IExtHostRpcService} from 'td/workbench/api/common/extHostRpcService';
import {ExtHostTestItemCollection, TestItemImpl, TestItemRootImpl, toItemFromContext} from 'td/workbench/api/common/extHostTestItem';
import * as Convert from 'td/workbench/api/common/extHostTypeConverters';
import {TestRunProfileKind, TestRunRequest} from 'td/workbench/api/common/extHostTypes';
import {TestCommandId} from 'td/workbench/contrib/testing/common/constants';
import {TestId, TestIdPathParts, TestPosition} from 'td/workbench/contrib/testing/common/testId';
import {InvalidTestItemError} from 'td/workbench/contrib/testing/common/testItemCollection';
import {AbstractIncrementalTestCollection, CoverageDetails, ICallProfileRunHandler, IFileCoverage, ISerializedTestResults, IStartControllerTests, IStartControllerTestsResult, ITestErrorMessage, ITestItem, ITestItemContext, ITestMessageMenuArgs, ITestRunProfile, IncrementalChangeCollector, IncrementalTestCollectionItem, InternalTestItem, KEEP_N_LAST_COVERAGE_REPORTS, TestResultState, TestRunProfileBitset, TestsDiff, TestsDiffOp, isStartControllerTests} from 'td/workbench/contrib/testing/common/testTypes';
import {checkProposedApiEnabled} from 'td/workbench/services/extensions/common/extensions';
import type * as vscode from 'vscode';

interface ControllerInfo {
	controller: vscode.TestController;
	profiles: Map<number, vscode.TestRunProfile>;
	collection: ExtHostTestItemCollection;
	extension: Readonly<IRelaxedExtensionDescription>;
	activeProfiles: Set<number>;
}

type DefaultProfileChangeEvent = Map</* controllerId */ string, Map< /* profileId */number, boolean>>;

export class ExtHostTesting extends Disposable implements ExtHostTestingShape {
	private readonly resultsChangedEmitter = this._register(new Emitter<void>());
	protected readonly controllers = new Map</* controller ID */ string, ControllerInfo>();
	private readonly proxy: MainThreadTestingShape;
	private readonly runTracker: TestRunCoordinator;
	private readonly observer: TestObservers;
	private readonly defaultProfilesChangedEmitter = this._register(new Emitter<DefaultProfileChangeEvent>());

	public onResultsChanged = this.resultsChangedEmitter.event;
	public results: ReadonlyArray<vscode.TestRunResult> = [];

	constructor(
		@IExtHostRpcService rpc: IExtHostRpcService,
		@ILogService logService: ILogService,
		commands: ExtHostCommands,
		private readonly editors: ExtHostDocumentsAndEditors,
	) {
		super();
		this.proxy = rpc.getProxy(MainContext.MainThreadTesting);
		this.observer = new TestObservers(this.proxy);
		this.runTracker = new TestRunCoordinator(this.proxy, logService);

		commands.registerArgumentProcessor({
			processArgument: arg => {
				switch (arg?.$mid) {
					case MarshalledId.TestItemContext: {
						const cast = arg as ITestItemContext;
						const targetTest = cast.tests[cast.tests.length - 1].item.extId;
						const controller = this.controllers.get(TestId.root(targetTest));
						return controller?.collection.tree.get(targetTest)?.actual ?? toItemFromContext(arg);
					}
					case MarshalledId.TestMessageMenuArgs: {
						const {extId, message} = arg as ITestMessageMenuArgs;
						return {
							test: this.controllers.get(TestId.root(extId))?.collection.tree.get(extId)?.actual,
							message: Convert.TestMessage.to(message as ITestErrorMessage.Serialized),
						};
					}
					default: return arg;
				}
			}
		});

		commands.registerCommand(false, 'testing.getExplorerSelection', async (): Promise<any> => {
			const inner = await commands.executeCommand<{
				include: string[];
				exclude: string[];
			}>(TestCommandId.GetExplorerSelection);

			const lookup = (i: string) => {
				const controller = this.controllers.get(TestId.root(i));
				if (!controller) { return undefined; }
				return TestId.isRoot(i) ? controller.controller : controller.collection.tree.get(i)?.actual;
			};

			return {
				include: inner?.include.map(lookup).filter(isDefined) || [],
				exclude: inner?.exclude.map(lookup).filter(isDefined) || [],
			};
		});
	}

	/**
	 * Implements vscode.test.registerTestProvider
	 */
	public createTestController(extension: IExtensionDescription, controllerId: string, label: string, refreshHandler?: (token: CancellationToken) => Thenable<void> | void): vscode.TestController {
		if (this.controllers.has(controllerId)) {
			throw new Error(`Attempt to insert a duplicate controller with ID "${controllerId}"`);
		}

		const disposable = new DisposableStore();
		const collection = disposable.add(new ExtHostTestItemCollection(controllerId, label, this.editors));
		collection.root.label = label;

		const profiles = new Map<number, vscode.TestRunProfile>();
		const activeProfiles = new Set<number>();
		const proxy = this.proxy;

		const controller: vscode.TestController = {
			items: collection.root.children,
			get label() {
				return label;
			},
			set label(value: string) {
				label = value;
				collection.root.label = value;
				proxy.$updateController(controllerId, {label});
			},
			get refreshHandler() {
				return refreshHandler;
			},
			set refreshHandler(value: ((token: CancellationToken) => Thenable<void> | void) | undefined) {
				refreshHandler = value;
				proxy.$updateController(controllerId, {canRefresh: !!value});
			},
			get id() {
				return controllerId;
			},
			createRunProfile: (label, group, runHandler, isDefault, tag?: vscode.TestTag | undefined, supportsContinuousRun?: boolean) => {
				// Derive the profile ID from a hash so that the same profile will tend
				// to have the same hashes, allowing re-run requests to work across reloads.
				let profileId = hash(label);
				while (profiles.has(profileId)) {
					profileId++;
				}

				return new TestRunProfileImpl(this.proxy, profiles, activeProfiles, this.defaultProfilesChangedEmitter.event, controllerId, profileId, label, group, runHandler, isDefault, tag, supportsContinuousRun);
			},
			createTestItem(id, label, uri) {
				return new TestItemImpl(controllerId, id, label, uri);
			},
			createTestRun: (request, name, persist = true) => {
				return this.runTracker.createTestRun(extension, controllerId, collection, request, name, persist);
			},
			invalidateTestResults: items => {
				if (items === undefined) {
					this.proxy.$markTestRetired(undefined);
				} else {
					const itemsArr = items instanceof Array ? items : [items];
					this.proxy.$markTestRetired(itemsArr.map(i => TestId.fromExtHostTestItem(i!, controllerId).toString()));
				}
			},
			set resolveHandler(fn) {
				collection.resolveHandler = fn;
			},
			get resolveHandler() {
				return collection.resolveHandler as undefined | ((item?: vscode.TestItem) => void);
			},
			dispose: () => {
				disposable.dispose();
			},
		};

		proxy.$registerTestController(controllerId, label, !!refreshHandler);
		disposable.add(toDisposable(() => proxy.$unregisterTestController(controllerId)));

		const info: ControllerInfo = {controller, collection, profiles, extension, activeProfiles};
		this.controllers.set(controllerId, info);
		disposable.add(toDisposable(() => this.controllers.delete(controllerId)));

		disposable.add(collection.onDidGenerateDiff(diff => proxy.$publishDiff(controllerId, diff.map(TestsDiffOp.serialize))));

		return controller;
	}

	/**
	 * Implements vscode.test.createTestObserver
	 */
	public createTestObserver() {
		return this.observer.checkout();
	}


	/**
	 * Implements vscode.test.runTests
	 */
	public async runTests(req: vscode.TestRunRequest, token = CancellationToken.None) {
		const profile = tryGetProfileFromTestRunReq(req);
		if (!profile) {
			throw new Error('The request passed to `vscode.test.runTests` must include a profile');
		}

		const controller = this.controllers.get(profile.controllerId);
		if (!controller) {
			throw new Error('Controller not found');
		}

		await this.proxy.$runTests({
			isUiTriggered: false,
			targets: [{
				testIds: req.include?.map(t => TestId.fromExtHostTestItem(t, controller.collection.root.id).toString()) ?? [controller.collection.root.id],
				profileGroup: profileGroupToBitset[profile.kind],
				profileId: profile.profileId,
				controllerId: profile.controllerId,
			}],
			exclude: req.exclude?.map(t => t.id),
		}, token);
	}

	/**
	 * @inheritdoc
	 */
	$syncTests(): Promise<void> {
		for (const {collection} of this.controllers.values()) {
			collection.flushDiff();
		}

		return Promise.resolve();
	}

	/**
	 * @inheritdoc
	 */
	async $provideFileCoverage(runId: string, taskId: string, token: CancellationToken): Promise<IFileCoverage.Serialized[]> {
		const coverage = this.runTracker.getCoverageReport(runId, taskId);
		const fileCoverage = await coverage?.provideFileCoverage(token);
		return fileCoverage ?? [];
	}

	/**
	 * @inheritdoc
	 */
	async $resolveFileCoverage(runId: string, taskId: string, fileIndex: number, token: CancellationToken): Promise<CoverageDetails.Serialized[]> {
		const coverage = this.runTracker.getCoverageReport(runId, taskId);
		const details = await coverage?.resolveFileCoverage(fileIndex, token);
		return details ?? [];
	}

	/** @inheritdoc */
	$configureRunProfile(controllerId: string, profileId: number) {
		this.controllers.get(controllerId)?.profiles.get(profileId)?.configureHandler?.();
	}

	/** @inheritdoc */
	$setDefaultRunProfiles(profiles: Record</* controller id */string, /* profile id */ number[]>): void {
		const evt: DefaultProfileChangeEvent = new Map();
		for (const [controllerId, profileIds] of Object.entries(profiles)) {
			const ctrl = this.controllers.get(controllerId);
			if (!ctrl) {
				continue;
			}
			const changes = new Map<number, boolean>();
			const added = profileIds.filter(id => !ctrl.activeProfiles.has(id));
			const removed = [...ctrl.activeProfiles].filter(id => !profileIds.includes(id));
			for (const id of added) {
				changes.set(id, true);
				ctrl.activeProfiles.add(id);
			}
			for (const id of removed) {
				changes.set(id, false);
				ctrl.activeProfiles.delete(id);
			}
			if (changes.size) {
				evt.set(controllerId, changes);
			}
		}

		this.defaultProfilesChangedEmitter.fire(evt);
	}

	/** @inheritdoc */
	async $refreshTests(controllerId: string, token: CancellationToken) {
		await this.controllers.get(controllerId)?.controller.refreshHandler?.(token);
	}

	/**
	 * Updates test results shown to extensions.
	 * @override
	 */
	public $publishTestResults(results: ISerializedTestResults[]): void {
		this.results = Object.freeze(
			results
				.map(r => deepFreeze(Convert.TestResults.to(r)))
				.concat(this.results)
				.sort((a, b) => b.completedAt - a.completedAt)
				.slice(0, 32),
		);

		this.resultsChangedEmitter.fire();
	}

	/**
	 * Expands the nodes in the test tree. If levels is less than zero, it will
	 * be treated as infinite.
	 */
	public async $expandTest(testId: string, levels: number) {
		const collection = this.controllers.get(TestId.fromString(testId).controllerId)?.collection;
		if (collection) {
			await collection.expand(testId, levels < 0 ? Infinity : levels);
			collection.flushDiff();
		}
	}

	/**
	 * Receives a test update from the main thread. Called (eventually) whenever
	 * tests change.
	 */
	public $acceptDiff(diff: TestsDiffOp.Serialized[]): void {
		this.observer.applyDiff(diff.map(d => TestsDiffOp.deserialize({asCanonicalUri: u => u}, d)));
	}

	/**
	 * Runs tests with the given set of IDs. Allows for test from multiple
	 * providers to be run.
	 * @inheritdoc
	 */
	public async $runControllerTests(reqs: IStartControllerTests[], token: CancellationToken): Promise<IStartControllerTestsResult[]> {
		return Promise.all(reqs.map(req => this.runControllerTestRequest(req, false, token)));
	}

	/**
	 * Starts continuous test runs with the given set of IDs. Allows for test from
	 * multiple providers to be run.
	 * @inheritdoc
	 */
	public async $startContinuousRun(reqs: IStartControllerTests[], token: CancellationToken): Promise<IStartControllerTestsResult[]> {
		const cts = new CancellationTokenSource(token);
		const res = await Promise.all(reqs.map(req => this.runControllerTestRequest(req, true, cts.token)));

		// avoid returning until cancellation is requested, otherwise ipc disposes of the token
		if (!token.isCancellationRequested && !res.some(r => r.error)) {
			await new Promise(r => token.onCancellationRequested(r));
		}

		cts.dispose(true);
		return res;
	}

	private async runControllerTestRequest(req: ICallProfileRunHandler | ICallProfileRunHandler, isContinuous: boolean, token: CancellationToken): Promise<IStartControllerTestsResult> {
		const lookup = this.controllers.get(req.controllerId);
		if (!lookup) {
			return {};
		}

		const {collection, profiles, extension} = lookup;
		const profile = profiles.get(req.profileId);
		if (!profile) {
			return {};
		}

		const includeTests = req.testIds
			.map((testId) => collection.tree.get(testId))
			.filter(isDefined);

		const excludeTests = req.excludeExtIds
			.map(id => lookup.collection.tree.get(id))
			.filter(isDefined)
			.filter(exclude => includeTests.some(
				include => include.fullId.compare(exclude.fullId) === TestPosition.IsChild,
			));

		if (!includeTests.length) {
			return {};
		}

		const publicReq = new TestRunRequest(
			includeTests.some(i => i.actual instanceof TestItemRootImpl) ? undefined : includeTests.map(t => t.actual),
			excludeTests.map(t => t.actual),
			profile,
			isContinuous,
		);

		const tracker = isStartControllerTests(req) && this.runTracker.prepareForMainThreadTestRun(
			publicReq,
			TestRunDto.fromInternal(req, lookup.collection),
			extension,
			token,
		);

		try {
			await profile.runHandler(publicReq, token);
			return {};
		} catch (e) {
			return {error: String(e)};
		} finally {
			if (tracker) {
				if (tracker.hasRunningTasks && !token.isCancellationRequested) {
					await Event.toPromise(tracker.onEnd);
				}

				tracker.dispose();
			}
		}
	}

	/**
	 * Cancels an ongoing test run.
	 */
	public $cancelExtensionTestRun(runId: string | undefined) {
		if (runId === undefined) {
			this.runTracker.cancelAllRuns();
		} else {
			this.runTracker.cancelRunById(runId);
		}
	}
}

// Deadline after being requested by a user that a test run is forcibly cancelled.
const RUN_CANCEL_DEADLINE = 10_000;

const enum TestRunTrackerState {
	// Default state
	Running,
	// Cancellation is requested, but the run is still going.
	Cancelling,
	// All tasks have ended
	Ended,
}

class TestRunTracker extends Disposable {
	private state = TestRunTrackerState.Running;
	private readonly tasks = new Map</* task ID */string, { run: vscode.TestRun }>();
	private readonly sharedTestIds = new Set<string>();
	private readonly cts: CancellationTokenSource;
	private readonly endEmitter = this._register(new Emitter<void>());
	private readonly coverageEmitter = this._register(new Emitter<{ runId: string; taskId: string; coverage: TestRunCoverageBearer | undefined }>());

	/**
	 * Fired when a coverage provider is added or removed from a task.
	 */
	public readonly onDidCoverage = this.coverageEmitter.event;

	/**
	 * Fires when a test ends, and no more tests are left running.
	 */
	public readonly onEnd = this.endEmitter.event;

	/**
	 * Gets whether there are any tests running.
	 */
	public get hasRunningTasks() {
		return this.tasks.size > 0;
	}

	/**
	 * Gets the run ID.
	 */
	public get id() {
		return this.dto.id;
	}

	constructor(
		private readonly dto: TestRunDto,
		private readonly proxy: MainThreadTestingShape,
		private readonly extension: IRelaxedExtensionDescription,
		private readonly logService: ILogService,
		parentToken?: CancellationToken,
	) {
		super();
		this.cts = this._register(new CancellationTokenSource(parentToken));

		const forciblyEnd = this._register(new RunOnceScheduler(() => this.forciblyEndTasks(), RUN_CANCEL_DEADLINE));
		this._register(this.cts.token.onCancellationRequested(() => forciblyEnd.schedule()));
	}

	/** Requests cancellation of the run. On the second call, forces cancellation. */
	public cancel() {
		if (this.state === TestRunTrackerState.Running) {
			this.cts.cancel();
			this.state = TestRunTrackerState.Cancelling;
		} else if (this.state === TestRunTrackerState.Cancelling) {
			this.forciblyEndTasks();
		}
	}

	/** Creates the public test run interface to give to extensions. */
	public createRun(name: string | undefined): vscode.TestRun {
		const runId = this.dto.id;
		const ctrlId = this.dto.controllerId;
		const taskId = generateUuid();
		const extension = this.extension;
		const coverageEmitter = this.coverageEmitter;
		let coverage: TestRunCoverageBearer | undefined;

		const guardTestMutation = <Args extends unknown[]>(fn: (test: vscode.TestItem, ...args: Args) => void) =>
			(test: vscode.TestItem, ...args: Args) => {
				if (ended) {
					this.logService.warn(`Setting the state of test "${test.id}" is a no-op after the run ends.`);
					return;
				}

				if (!this.dto.isIncluded(test)) {
					return;
				}

				this.ensureTestIsKnown(test);
				fn(test, ...args);
			};

		const appendMessages = (test: vscode.TestItem, messages: vscode.TestMessage | readonly vscode.TestMessage[]) => {
			const converted = messages instanceof Array
				? messages.map(Convert.TestMessage.from)
				: [Convert.TestMessage.from(messages)];

			if (test.uri && test.range) {
				const defaultLocation: ILocationDto = {range: Convert.Range.from(test.range), uri: test.uri};
				for (const message of converted) {
					message.location = message.location || defaultLocation;
				}
			}

			this.proxy.$appendTestMessagesInRun(runId, taskId, TestId.fromExtHostTestItem(test, ctrlId).toString(), converted);
		};

		let ended = false;
		const run: vscode.TestRun = {
			isPersisted: this.dto.isPersisted,
			token: this.cts.token,
			name,
			get coverageProvider() {
				return coverage?.provider;
			},
			set coverageProvider(provider) {
				checkProposedApiEnabled(extension, 'testCoverage');
				coverage = provider && new TestRunCoverageBearer(provider);
				coverageEmitter.fire({taskId, runId, coverage});
			},
			//#region state mutation
			enqueued: guardTestMutation(test => {
				this.proxy.$updateTestStateInRun(runId, taskId, TestId.fromExtHostTestItem(test, ctrlId).toString(), TestResultState.Queued);
			}),
			skipped: guardTestMutation(test => {
				this.proxy.$updateTestStateInRun(runId, taskId, TestId.fromExtHostTestItem(test, ctrlId).toString(), TestResultState.Skipped);
			}),
			started: guardTestMutation(test => {
				this.proxy.$updateTestStateInRun(runId, taskId, TestId.fromExtHostTestItem(test, ctrlId).toString(), TestResultState.Running);
			}),
			errored: guardTestMutation((test, messages, duration) => {
				appendMessages(test, messages);
				this.proxy.$updateTestStateInRun(runId, taskId, TestId.fromExtHostTestItem(test, ctrlId).toString(), TestResultState.Errored, duration);
			}),
			failed: guardTestMutation((test, messages, duration) => {
				appendMessages(test, messages);
				this.proxy.$updateTestStateInRun(runId, taskId, TestId.fromExtHostTestItem(test, ctrlId).toString(), TestResultState.Failed, duration);
			}),
			passed: guardTestMutation((test, duration) => {
				this.proxy.$updateTestStateInRun(runId, taskId, TestId.fromExtHostTestItem(test, this.dto.controllerId).toString(), TestResultState.Passed, duration);
			}),
			//#endregion
			appendOutput: (output, location?: vscode.Location, test?: vscode.TestItem) => {
				if (ended) {
					return;
				}

				if (test) {
					if (this.dto.isIncluded(test)) {
						this.ensureTestIsKnown(test);
					} else {
						test = undefined;
					}
				}

				this.proxy.$appendOutputToRun(
					runId,
					taskId,
					VSBuffer.fromString(output),
					location && Convert.location.from(location),
					test && TestId.fromExtHostTestItem(test, ctrlId).toString(),
				);
			},
			end: () => {
				if (ended) {
					return;
				}

				ended = true;
				this.proxy.$finishedTestRunTask(runId, taskId);
				this.tasks.delete(taskId);
				if (!this.tasks.size) {
					this.markEnded();
				}
			}
		};

		this.tasks.set(taskId, {run});
		this.proxy.$startedTestRunTask(runId, {id: taskId, name, running: true});

		return run;
	}

	private forciblyEndTasks() {
		for (const {run} of this.tasks.values()) {
			run.end();
		}
	}

	private markEnded() {
		if (this.state !== TestRunTrackerState.Ended) {
			this.state = TestRunTrackerState.Ended;
			this.endEmitter.fire();
		}
	}

	private ensureTestIsKnown(test: vscode.TestItem) {
		if (!(test instanceof TestItemImpl)) {
			throw new InvalidTestItemError(test.id);
		}

		if (this.sharedTestIds.has(TestId.fromExtHostTestItem(test, this.dto.controllerId).toString())) {
			return;
		}

		const chain: ITestItem.Serialized[] = [];
		const root = this.dto.colllection.root;
		while (true) {
			const converted = Convert.TestItem.from(test as TestItemImpl);
			chain.unshift(converted);

			if (this.sharedTestIds.has(converted.extId)) {
				break;
			}

			this.sharedTestIds.add(converted.extId);
			if (test === root) {
				break;
			}

			test = test.parent || root;
		}

		this.proxy.$addTestsToRun(this.dto.controllerId, this.dto.id, chain);
	}

	public override dispose(): void {
		this.markEnded();
		super.dispose();
	}
}

interface CoverageReportRecord {
	runId: string;
	coverage: Map<string, TestRunCoverageBearer | undefined>;
}

/**
 * Queues runs for a single extension and provides the currently-executing
 * run so that `createTestRun` can be properly correlated.
 */
export class TestRunCoordinator {
	private readonly tracked = new Map<vscode.TestRunRequest, TestRunTracker>();
	private readonly coverageReports: CoverageReportRecord[] = [];

	public get trackers() {
		return this.tracked.values();
	}

	constructor(
		private readonly proxy: MainThreadTestingShape,
		private readonly logService: ILogService,
	) { }

	/**
	 * Gets a coverage report for a given run and task ID.
	 */
	public getCoverageReport(runId: string, taskId: string) {
		return this.coverageReports
			.find(r => r.runId === runId)
			?.coverage.get(taskId);
	}

	/**
	 * Registers a request as being invoked by the main thread, so
	 * `$startedExtensionTestRun` is not invoked. The run must eventually
	 * be cancelled manually.
	 */
	public prepareForMainThreadTestRun(req: vscode.TestRunRequest, dto: TestRunDto, extension: Readonly<IRelaxedExtensionDescription>, token: CancellationToken) {
		return this.getTracker(req, dto, extension, token);
	}

	/**
	 * Cancels an existing test run via its cancellation token.
	 */
	public cancelRunById(runId: string) {
		for (const tracker of this.tracked.values()) {
			if (tracker.id === runId) {
				tracker.cancel();
				return;
			}
		}
	}

	/**
	 * Cancels an existing test run via its cancellation token.
	 */
	public cancelAllRuns() {
		for (const tracker of this.tracked.values()) {
			tracker.cancel();
		}
	}


	/**
	 * Implements the public `createTestRun` API.
	 */
	public createTestRun(extension: IRelaxedExtensionDescription, controllerId: string, collection: ExtHostTestItemCollection, request: vscode.TestRunRequest, name: string | undefined, persist: boolean): vscode.TestRun {
		const existing = this.tracked.get(request);
		if (existing) {
			return existing.createRun(name);
		}

		// If there is not an existing tracked extension for the request, start
		// a new, detached session.
		const dto = TestRunDto.fromPublic(controllerId, collection, request, persist);
		const profile = tryGetProfileFromTestRunReq(request);
		this.proxy.$startedExtensionTestRun({
			controllerId,
			continuous: !!request.continuous,
			profile: profile && {group: profileGroupToBitset[profile.kind], id: profile.profileId},
			exclude: request.exclude?.map(t => TestId.fromExtHostTestItem(t, collection.root.id).toString()) ?? [],
			id: dto.id,
			include: request.include?.map(t => TestId.fromExtHostTestItem(t, collection.root.id).toString()) ?? [collection.root.id],
			persist
		});

		const tracker = this.getTracker(request, dto, extension);
		Event.once(tracker.onEnd)(() => {
			this.proxy.$finishedExtensionTestRun(dto.id);
			tracker.dispose();
		});

		return tracker.createRun(name);
	}

	private getTracker(req: vscode.TestRunRequest, dto: TestRunDto, extension: IRelaxedExtensionDescription, token?: CancellationToken) {
		const tracker = new TestRunTracker(dto, this.proxy, extension, this.logService, token);
		this.tracked.set(req, tracker);

		let coverageReports: CoverageReportRecord | undefined;
		const coverageListener = tracker.onDidCoverage(({runId, taskId, coverage}) => {
			if (!coverageReports) {
				coverageReports = {runId, coverage: new Map()};
				this.coverageReports.unshift(coverageReports);
				if (this.coverageReports.length > KEEP_N_LAST_COVERAGE_REPORTS) {
					this.coverageReports.pop();
				}
			}

			coverageReports.coverage.set(taskId, coverage);
			this.proxy.$signalCoverageAvailable(runId, taskId, !!coverage);
		});

		Event.once(tracker.onEnd)(() => {
			this.tracked.delete(req);
			coverageListener.dispose();
		});
		return tracker;
	}
}

const tryGetProfileFromTestRunReq = (request: vscode.TestRunRequest) => {
	if (!request.profile) {
		return undefined;
	}

	if (!(request.profile instanceof TestRunProfileImpl)) {
		throw new Error(`TestRunRequest.profile is not an instance created from TestController.createRunProfile`);
	}

	return request.profile;
};

export class TestRunDto {
	private readonly includePrefix: string[];
	private readonly excludePrefix: string[];

	public static fromPublic(controllerId: string, collection: ExtHostTestItemCollection, request: vscode.TestRunRequest, persist: boolean) {
		return new TestRunDto(
			controllerId,
			generateUuid(),
			request.include?.map(t => TestId.fromExtHostTestItem(t, controllerId).toString()) ?? [controllerId],
			request.exclude?.map(t => TestId.fromExtHostTestItem(t, controllerId).toString()) ?? [],
			persist,
			collection,
		);
	}

	public static fromInternal(request: IStartControllerTests, collection: ExtHostTestItemCollection) {
		return new TestRunDto(
			request.controllerId,
			request.runId,
			request.testIds,
			request.excludeExtIds,
			true,
			collection,
		);
	}

	constructor(
		public readonly controllerId: string,
		public readonly id: string,
		include: string[],
		exclude: string[],
		public readonly isPersisted: boolean,
		public readonly colllection: ExtHostTestItemCollection,
	) {
		this.includePrefix = include.map(id => id + TestIdPathParts.Delimiter);
		this.excludePrefix = exclude.map(id => id + TestIdPathParts.Delimiter);
	}

	public isIncluded(test: vscode.TestItem) {
		const id = TestId.fromExtHostTestItem(test, this.controllerId).toString() + TestIdPathParts.Delimiter;
		for (const prefix of this.excludePrefix) {
			if (id === prefix || id.startsWith(prefix)) {
				return false;
			}
		}

		for (const prefix of this.includePrefix) {
			if (id === prefix || id.startsWith(prefix)) {
				return true;
			}
		}

		return false;
	}
}

class TestRunCoverageBearer {
	private fileCoverage?: Promise<vscode.FileCoverage[] | null | undefined>;

	constructor(public readonly provider: vscode.TestCoverageProvider) { }

	public async provideFileCoverage(token: CancellationToken): Promise<IFileCoverage.Serialized[]> {
		if (!this.fileCoverage) {
			this.fileCoverage = (async () => this.provider.provideFileCoverage(token))();
		}

		try {
			const coverage = await this.fileCoverage;
			return coverage?.map(Convert.TestCoverage.fromFile) ?? [];
		} catch (e) {
			this.fileCoverage = undefined;
			throw e;
		}
	}

	public async resolveFileCoverage(index: number, token: CancellationToken): Promise<CoverageDetails.Serialized[]> {
		const fileCoverage = await this.fileCoverage;
		let file = fileCoverage?.[index];
		if (!this.provider || !fileCoverage || !file) {
			return [];
		}

		if (!file.detailedCoverage) {
			file = fileCoverage[index] = await this.provider.resolveFileCoverage?.(file, token) ?? file;
		}

		return file.detailedCoverage?.map(Convert.TestCoverage.fromDetailed) ?? [];
	}
}

/**
 * @private
 */
interface MirroredCollectionTestItem extends IncrementalTestCollectionItem {
	revived: vscode.TestItem;
	depth: number;
}

class MirroredChangeCollector implements IncrementalChangeCollector<MirroredCollectionTestItem> {
	private readonly added = new Set<MirroredCollectionTestItem>();
	private readonly updated = new Set<MirroredCollectionTestItem>();
	private readonly removed = new Set<MirroredCollectionTestItem>();

	private readonly alreadyRemoved = new Set<string>();

	public get isEmpty() {
		return this.added.size === 0 && this.removed.size === 0 && this.updated.size === 0;
	}

	constructor(private readonly emitter: Emitter<vscode.TestsChangeEvent>) {
	}

	/**
	 * @inheritdoc
	 */
	public add(node: MirroredCollectionTestItem): void {
		this.added.add(node);
	}

	/**
	 * @inheritdoc
	 */
	public update(node: MirroredCollectionTestItem): void {
		Object.assign(node.revived, Convert.TestItem.toPlain(node.item));
		if (!this.added.has(node)) {
			this.updated.add(node);
		}
	}

	/**
	 * @inheritdoc
	 */
	public remove(node: MirroredCollectionTestItem): void {
		if (this.added.has(node)) {
			this.added.delete(node);
			return;
		}

		this.updated.delete(node);

		const parentId = TestId.parentId(node.item.extId);
		if (parentId && this.alreadyRemoved.has(parentId.toString())) {
			this.alreadyRemoved.add(node.item.extId);
			return;
		}

		this.removed.add(node);
	}

	/**
	 * @inheritdoc
	 */
	public getChangeEvent(): vscode.TestsChangeEvent {
		const {added, updated, removed} = this;
		return {
			get added() { return [...added].map(n => n.revived); },
			get updated() { return [...updated].map(n => n.revived); },
			get removed() { return [...removed].map(n => n.revived); },
		};
	}

	public complete() {
		if (!this.isEmpty) {
			this.emitter.fire(this.getChangeEvent());
		}
	}
}

/**
 * Maintains tests in this extension host sent from the main thread.
 * @private
 */
class MirroredTestCollection extends AbstractIncrementalTestCollection<MirroredCollectionTestItem> {
	private changeEmitter = new Emitter<vscode.TestsChangeEvent>();

	/**
	 * Change emitter that fires with the same semantics as `TestObserver.onDidChangeTests`.
	 */
	public readonly onDidChangeTests = this.changeEmitter.event;

	/**
	 * Gets a list of root test items.
	 */
	public get rootTests() {
		return this.roots;
	}

	/**
	 *
	 * If the test ID exists, returns its underlying ID.
	 */
	public getMirroredTestDataById(itemId: string) {
		return this.items.get(itemId);
	}

	/**
	 * If the test item is a mirrored test item, returns its underlying ID.
	 */
	public getMirroredTestDataByReference(item: vscode.TestItem) {
		return this.items.get(item.id);
	}

	/**
	 * @override
	 */
	protected createItem(item: InternalTestItem, parent?: MirroredCollectionTestItem): MirroredCollectionTestItem {
		return {
			...item,
			// todo@connor4312: make this work well again with children
			revived: Convert.TestItem.toPlain(item.item) as vscode.TestItem,
			depth: parent ? parent.depth + 1 : 0,
			children: new Set(),
		};
	}

	/**
	 * @override
	 */
	protected override createChangeCollector() {
		return new MirroredChangeCollector(this.changeEmitter);
	}
}

class TestObservers {
	private current?: {
		observers: number;
		tests: MirroredTestCollection;
	};

	constructor(
		private readonly proxy: MainThreadTestingShape,
	) {
	}

	public checkout(): vscode.TestObserver {
		if (!this.current) {
			this.current = this.createObserverData();
		}

		const current = this.current;
		current.observers++;

		return {
			onDidChangeTest: current.tests.onDidChangeTests,
			get tests() { return [...current.tests.rootTests].map(t => t.revived); },
			dispose: createSingleCallFunction(() => {
				if (--current.observers === 0) {
					this.proxy.$unsubscribeFromDiffs();
					this.current = undefined;
				}
			}),
		};
	}

	/**
	 * Gets the internal test data by its reference.
	 */
	public getMirroredTestDataByReference(ref: vscode.TestItem) {
		return this.current?.tests.getMirroredTestDataByReference(ref);
	}

	/**
	 * Applies test diffs to the current set of observed tests.
	 */
	public applyDiff(diff: TestsDiff) {
		this.current?.tests.apply(diff);
	}

	private createObserverData() {
		const tests = new MirroredTestCollection({asCanonicalUri: u => u});
		this.proxy.$subscribeToDiffs();
		return {observers: 0, tests,};
	}
}

const updateProfile = (impl: TestRunProfileImpl, proxy: MainThreadTestingShape, initial: ITestRunProfile | undefined, update: Partial<ITestRunProfile>) => {
	if (initial) {
		Object.assign(initial, update);
	} else {
		proxy.$updateTestRunConfig(impl.controllerId, impl.profileId, update);
	}
};

export class TestRunProfileImpl implements vscode.TestRunProfile {
	readonly #proxy: MainThreadTestingShape;
	readonly #activeProfiles: Set<number>;
	readonly #onDidChangeDefaultProfiles: Event<DefaultProfileChangeEvent>;
	#initialPublish?: ITestRunProfile;
	#profiles?: Map<number, vscode.TestRunProfile>;
	private _configureHandler?: (() => void);

	public get label() {
		return this._label;
	}

	public set label(label: string) {
		if (label !== this._label) {
			this._label = label;
			updateProfile(this, this.#proxy, this.#initialPublish, {label});
		}
	}

	public get supportsContinuousRun() {
		return this._supportsContinuousRun;
	}

	public set supportsContinuousRun(supports: boolean) {
		if (supports !== this._supportsContinuousRun) {
			this._supportsContinuousRun = supports;
			updateProfile(this, this.#proxy, this.#initialPublish, {supportsContinuousRun: supports});
		}
	}

	public get isDefault() {
		return this.#activeProfiles.has(this.profileId);
	}

	public set isDefault(isDefault: boolean) {
		if (isDefault !== this.isDefault) {
			// #activeProfiles is synced from the main thread, so we can make
			// provisional changes here that will get confirmed momentarily
			if (isDefault) {
				this.#activeProfiles.add(this.profileId);
			} else {
				this.#activeProfiles.delete(this.profileId);
			}

			updateProfile(this, this.#proxy, this.#initialPublish, {isDefault});
		}
	}

	public get tag() {
		return this._tag;
	}

	public set tag(tag: vscode.TestTag | undefined) {
		if (tag?.id !== this._tag?.id) {
			this._tag = tag;
			updateProfile(this, this.#proxy, this.#initialPublish, {
				tag: tag ? Convert.TestTag.namespace(this.controllerId, tag.id) : null,
			});
		}
	}

	public get configureHandler() {
		return this._configureHandler;
	}

	public set configureHandler(handler: undefined | (() => void)) {
		if (handler !== this._configureHandler) {
			this._configureHandler = handler;
			updateProfile(this, this.#proxy, this.#initialPublish, {hasConfigurationHandler: !!handler});
		}
	}

	public get onDidChangeDefault() {
		return Event.chain(this.#onDidChangeDefaultProfiles, $ => $
			.map(ev => ev.get(this.controllerId)?.get(this.profileId))
			.filter(isDefined)
		);
	}

	constructor(
		proxy: MainThreadTestingShape,
		profiles: Map<number, vscode.TestRunProfile>,
		activeProfiles: Set<number>,
		onDidChangeActiveProfiles: Event<DefaultProfileChangeEvent>,
		public readonly controllerId: string,
		public readonly profileId: number,
		private _label: string,
		public readonly kind: vscode.TestRunProfileKind,
		public runHandler: (request: vscode.TestRunRequest, token: vscode.CancellationToken) => Thenable<void> | void,
		_isDefault = false,
		public _tag: vscode.TestTag | undefined = undefined,
		private _supportsContinuousRun = false,
	) {
		this.#proxy = proxy;
		this.#profiles = profiles;
		this.#activeProfiles = activeProfiles;
		this.#onDidChangeDefaultProfiles = onDidChangeActiveProfiles;
		profiles.set(profileId, this);

		const groupBitset = profileGroupToBitset[kind];
		if (typeof groupBitset !== 'number') {
			throw new Error(`Unknown TestRunProfile.group ${kind}`);
		}

		if (_isDefault) {
			activeProfiles.add(profileId);
		}

		this.#initialPublish = {
			profileId: profileId,
			controllerId,
			tag: _tag ? Convert.TestTag.namespace(this.controllerId, _tag.id) : null,
			label: _label,
			group: groupBitset,
			isDefault: _isDefault,
			hasConfigurationHandler: false,
			supportsContinuousRun: _supportsContinuousRun,
		};

		// we send the initial profile publish out on the next microtask so that
		// initially setting the isDefault value doesn't overwrite a user-configured value
		queueMicrotask(() => {
			if (this.#initialPublish) {
				this.#proxy.$publishTestRunProfile(this.#initialPublish);
				this.#initialPublish = undefined;
			}
		});
	}

	dispose(): void {
		if (this.#profiles?.delete(this.profileId)) {
			this.#profiles = undefined;
			this.#proxy.$removeTestProfile(this.controllerId, this.profileId);
		}
		this.#initialPublish = undefined;
	}
}

const profileGroupToBitset: { [K in TestRunProfileKind]: TestRunProfileBitset } = {
	[TestRunProfileKind.Coverage]: TestRunProfileBitset.Coverage,
	[TestRunProfileKind.Debug]: TestRunProfileBitset.Debug,
	[TestRunProfileKind.Run]: TestRunProfileBitset.Run,
};

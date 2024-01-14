/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as arrays from 'td/base/common/arrays';
import {Delayer, first} from 'td/base/common/async';
import {CancellationToken, CancellationTokenSource} from 'td/base/common/cancellation';
import {Color} from 'td/base/common/color';
import {isCancellationError, onUnexpectedError, onUnexpectedExternalError} from 'td/base/common/errors';
import {Event} from 'td/base/common/event';
import {KeyCode, KeyMod} from 'td/base/common/keyCodes';
import {Disposable, DisposableStore} from 'td/base/common/lifecycle';
import * as strings from 'td/base/common/strings';
import {URI} from 'td/base/common/uri';
import {ICodeEditor} from 'td/editor/browser/editorBrowser';
import {EditorAction, EditorCommand, EditorContributionInstantiation, registerEditorAction, registerEditorCommand, registerEditorContribution, registerModelAndPositionCommand, ServicesAccessor} from 'td/editor/browser/editorExtensions';
import {ICodeEditorService} from 'td/editor/browser/services/codeEditorService';
import {EditorOption} from 'td/editor/common/config/editorOptions';
import {IPosition, Position} from 'td/editor/common/core/position';
import {IRange, Range} from 'td/editor/common/core/range';
import {IEditorContribution, IEditorDecorationsCollection} from 'td/editor/common/editorCommon';
import {EditorContextKeys} from 'td/editor/common/editorContextKeys';
import {IModelDeltaDecoration, ITextModel, TrackedRangeStickiness} from 'td/editor/common/model';
import {ModelDecorationOptions} from 'td/editor/common/model/textModel';
import {LinkedEditingRangeProvider, LinkedEditingRanges} from 'td/editor/common/languages';
import {ILanguageConfigurationService} from 'td/editor/common/languages/languageConfigurationRegistry';
import * as nls from 'td/nls';
import {ContextKeyExpr, IContextKey, IContextKeyService, RawContextKey} from 'td/platform/contextkey/common/contextkey';
import {KeybindingWeight} from 'td/platform/keybinding/common/keybindingsRegistry';
import {ILanguageFeaturesService} from 'td/editor/common/services/languageFeatures';
import {registerColor} from 'td/platform/theme/common/colorRegistry';
import {LanguageFeatureRegistry} from 'td/editor/common/languageFeatureRegistry';
import {ISingleEditOperation} from 'td/editor/common/core/editOperation';
import {IFeatureDebounceInformation, ILanguageFeatureDebounceService} from 'td/editor/common/services/languageFeatureDebounce';
import {StopWatch} from 'td/base/common/stopwatch';
import 'td/css!./linkedEditing';

export const CONTEXT_ONTYPE_RENAME_INPUT_VISIBLE = new RawContextKey<boolean>('LinkedEditingInputVisible', false);

const DECORATION_CLASS_NAME = 'linked-editing-decoration';

export class LinkedEditingContribution extends Disposable implements IEditorContribution {

	public static readonly ID = 'editor.contrib.linkedEditing';

	private static readonly DECORATION = ModelDecorationOptions.register({
		description: 'linked-editing',
		stickiness: TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges,
		className: DECORATION_CLASS_NAME
	});

	static get(editor: ICodeEditor): LinkedEditingContribution | null {
		return editor.getContribution<LinkedEditingContribution>(LinkedEditingContribution.ID);
	}

	private _debounceDuration: number | undefined;

	private readonly _editor: ICodeEditor;
	private readonly _providers: LanguageFeatureRegistry<LinkedEditingRangeProvider>;
	private _enabled: boolean;

	private readonly _visibleContextKey: IContextKey<boolean>;
	private readonly _debounceInformation: IFeatureDebounceInformation;

	private _rangeUpdateTriggerPromise: Promise<any> | null;
	private _rangeSyncTriggerPromise: Promise<any> | null;

	private _currentRequestCts: CancellationTokenSource | null;
	private _currentRequestPosition: Position | null;
	private _currentRequestModelVersion: number | null;

	private _currentDecorations: IEditorDecorationsCollection; // The one at index 0 is the reference one
	private _syncRangesToken: number = 0;

	private _languageWordPattern: RegExp | null;
	private _currentWordPattern: RegExp | null;
	private _ignoreChangeEvent: boolean;

	private readonly _localToDispose = this._register(new DisposableStore());

	constructor(
		editor: ICodeEditor,
		@IContextKeyService contextKeyService: IContextKeyService,
		@ILanguageFeaturesService languageFeaturesService: ILanguageFeaturesService,
		@ILanguageConfigurationService private readonly languageConfigurationService: ILanguageConfigurationService,
		@ILanguageFeatureDebounceService languageFeatureDebounceService: ILanguageFeatureDebounceService
	) {
		super();
		this._editor = editor;
		this._providers = languageFeaturesService.linkedEditingRangeProvider;
		this._enabled = false;
		this._visibleContextKey = CONTEXT_ONTYPE_RENAME_INPUT_VISIBLE.bindTo(contextKeyService);
		this._debounceInformation = languageFeatureDebounceService.for(this._providers, 'Linked Editing', {max: 200});

		this._currentDecorations = this._editor.createDecorationsCollection();
		this._languageWordPattern = null;
		this._currentWordPattern = null;
		this._ignoreChangeEvent = false;
		this._localToDispose = this._register(new DisposableStore());

		this._rangeUpdateTriggerPromise = null;
		this._rangeSyncTriggerPromise = null;

		this._currentRequestCts = null;
		this._currentRequestPosition = null;
		this._currentRequestModelVersion = null;

		this._register(this._editor.onDidChangeModel(() => this.reinitialize(true)));

		this._register(this._editor.onDidChangeConfiguration(e => {
			if (e.hasChanged(EditorOption.linkedEditing) || e.hasChanged(EditorOption.renameOnType)) {
				this.reinitialize(false);
			}
		}));
		this._register(this._providers.onDidChange(() => this.reinitialize(false)));
		this._register(this._editor.onDidChangeModelLanguage(() => this.reinitialize(true)));

		this.reinitialize(true);
	}

	private reinitialize(forceRefresh: boolean) {
		const model = this._editor.getModel();
		const isEnabled = model !== null && (this._editor.getOption(EditorOption.linkedEditing) || this._editor.getOption(EditorOption.renameOnType)) && this._providers.has(model);
		if (isEnabled === this._enabled && !forceRefresh) {
			return;
		}

		this._enabled = isEnabled;

		this.clearRanges();
		this._localToDispose.clear();

		if (!isEnabled || model === null) {
			return;
		}

		this._localToDispose.add(
			Event.runAndSubscribe(
				model.onDidChangeLanguageConfiguration,
				() => {
					this._languageWordPattern = this.languageConfigurationService.getLanguageConfiguration(model.getLanguageId()).getWordDefinition();
				}
			)
		);

		const rangeUpdateScheduler = new Delayer(this._debounceInformation.get(model));
		const triggerRangeUpdate = () => {
			this._rangeUpdateTriggerPromise = rangeUpdateScheduler.trigger(() => this.updateRanges(), this._debounceDuration ?? this._debounceInformation.get(model));
		};
		const rangeSyncScheduler = new Delayer(0);
		const triggerRangeSync = (token: number) => {
			this._rangeSyncTriggerPromise = rangeSyncScheduler.trigger(() => this._syncRanges(token));
		};
		this._localToDispose.add(this._editor.onDidChangeCursorPosition(() => {
			triggerRangeUpdate();
		}));
		this._localToDispose.add(this._editor.onDidChangeModelContent((e) => {
			if (!this._ignoreChangeEvent) {
				if (this._currentDecorations.length > 0) {
					const referenceRange = this._currentDecorations.getRange(0);
					if (referenceRange && e.changes.every(c => referenceRange.intersectRanges(c.range))) {
						triggerRangeSync(this._syncRangesToken);
						return;
					}
				}
			}
			triggerRangeUpdate();
		}));
		this._localToDispose.add({
			dispose: () => {
				rangeUpdateScheduler.dispose();
				rangeSyncScheduler.dispose();
			}
		});
		this.updateRanges();
	}

	private _syncRanges(token: number): void {
		// delayed invocation, make sure we're still on
		if (!this._editor.hasModel() || token !== this._syncRangesToken || this._currentDecorations.length === 0) {
			// nothing to do
			return;
		}

		const model = this._editor.getModel();
		const referenceRange = this._currentDecorations.getRange(0);

		if (!referenceRange || referenceRange.startLineNumber !== referenceRange.endLineNumber) {
			return this.clearRanges();
		}

		const referenceValue = model.getValueInRange(referenceRange);
		if (this._currentWordPattern) {
			const match = referenceValue.match(this._currentWordPattern);
			const matchLength = match ? match[0].length : 0;
			if (matchLength !== referenceValue.length) {
				return this.clearRanges();
			}
		}

		const edits: ISingleEditOperation[] = [];
		for (let i = 1, len = this._currentDecorations.length; i < len; i++) {
			const mirrorRange = this._currentDecorations.getRange(i);
			if (!mirrorRange) {
				continue;
			}
			if (mirrorRange.startLineNumber !== mirrorRange.endLineNumber) {
				edits.push({
					range: mirrorRange,
					text: referenceValue
				});
			} else {
				let oldValue = model.getValueInRange(mirrorRange);
				let newValue = referenceValue;
				let rangeStartColumn = mirrorRange.startColumn;
				let rangeEndColumn = mirrorRange.endColumn;

				const commonPrefixLength = strings.commonPrefixLength(oldValue, newValue);
				rangeStartColumn += commonPrefixLength;
				oldValue = oldValue.substr(commonPrefixLength);
				newValue = newValue.substr(commonPrefixLength);

				const commonSuffixLength = strings.commonSuffixLength(oldValue, newValue);
				rangeEndColumn -= commonSuffixLength;
				oldValue = oldValue.substr(0, oldValue.length - commonSuffixLength);
				newValue = newValue.substr(0, newValue.length - commonSuffixLength);

				if (rangeStartColumn !== rangeEndColumn || newValue.length !== 0) {
					edits.push({
						range: new Range(mirrorRange.startLineNumber, rangeStartColumn, mirrorRange.endLineNumber, rangeEndColumn),
						text: newValue
					});
				}
			}
		}

		if (edits.length === 0) {
			return;
		}

		try {
			this._editor.popUndoStop();
			this._ignoreChangeEvent = true;
			const prevEditOperationType = this._editor._getViewModel().getPrevEditOperationType();
			this._editor.executeEdits('linkedEditing', edits);
			this._editor._getViewModel().setPrevEditOperationType(prevEditOperationType);
		} finally {
			this._ignoreChangeEvent = false;
		}
	}

	public override dispose(): void {
		this.clearRanges();
		super.dispose();
	}

	public clearRanges(): void {
		this._visibleContextKey.set(false);
		this._currentDecorations.clear();
		if (this._currentRequestCts) {
			this._currentRequestCts.cancel();
			this._currentRequestCts = null;
			this._currentRequestPosition = null;
		}
	}

	public get currentUpdateTriggerPromise(): Promise<any> {
		return this._rangeUpdateTriggerPromise || Promise.resolve();
	}

	public get currentSyncTriggerPromise(): Promise<any> {
		return this._rangeSyncTriggerPromise || Promise.resolve();
	}

	public async updateRanges(force = false): Promise<void> {
		if (!this._editor.hasModel()) {
			this.clearRanges();
			return;
		}

		const position = this._editor.getPosition();
		if (!this._enabled && !force || this._editor.getSelections().length > 1) {
			// disabled or multicursor
			this.clearRanges();
			return;
		}

		const model = this._editor.getModel();
		const modelVersionId = model.getVersionId();
		if (this._currentRequestPosition && this._currentRequestModelVersion === modelVersionId) {
			if (position.equals(this._currentRequestPosition)) {
				return; // same position
			}
			if (this._currentDecorations.length > 0) {
				const range = this._currentDecorations.getRange(0);
				if (range && range.containsPosition(position)) {
					return; // just moving inside the existing primary range
				}
			}
		}

		// Clear existing decorations while we compute new ones
		this.clearRanges();

		this._currentRequestPosition = position;
		this._currentRequestModelVersion = modelVersionId;

		const currentRequestCts = this._currentRequestCts = new CancellationTokenSource();
		try {
			const sw = new StopWatch(false);
			const response = await getLinkedEditingRanges(this._providers, model, position, currentRequestCts.token);
			this._debounceInformation.update(model, sw.elapsed());
			if (currentRequestCts !== this._currentRequestCts) {
				return;
			}
			this._currentRequestCts = null;
			if (modelVersionId !== model.getVersionId()) {
				return;
			}

			let ranges: IRange[] = [];
			if (response?.ranges) {
				ranges = response.ranges;
			}

			this._currentWordPattern = response?.wordPattern || this._languageWordPattern;

			let foundReferenceRange = false;
			for (let i = 0, len = ranges.length; i < len; i++) {
				if (Range.containsPosition(ranges[i], position)) {
					foundReferenceRange = true;
					if (i !== 0) {
						const referenceRange = ranges[i];
						ranges.splice(i, 1);
						ranges.unshift(referenceRange);
					}
					break;
				}
			}

			if (!foundReferenceRange) {
				// Cannot do linked editing if the ranges are not where the cursor is...
				this.clearRanges();
				return;
			}

			const decorations: IModelDeltaDecoration[] = ranges.map(range => ({range: range, options: LinkedEditingContribution.DECORATION}));
			this._visibleContextKey.set(true);
			this._currentDecorations.set(decorations);
			this._syncRangesToken++; // cancel any pending syncRanges call
		} catch (err) {
			if (!isCancellationError(err)) {
				onUnexpectedError(err);
			}
			if (this._currentRequestCts === currentRequestCts || !this._currentRequestCts) {
				// stop if we are still the latest request
				this.clearRanges();
			}
		}

	}

	// for testing
	public setDebounceDuration(timeInMS: number) {
		this._debounceDuration = timeInMS;
	}

	// private printDecorators(model: ITextModel) {
	// 	return this._currentDecorations.map(d => {
	// 		const range = model.getDecorationRange(d);
	// 		if (range) {
	// 			return this.printRange(range);
	// 		}
	// 		return 'invalid';
	// 	}).join(',');
	// }

	// private printChanges(changes: IModelContentChange[]) {
	// 	return changes.map(c => {
	// 		return `${this.printRange(c.range)} - ${c.text}`;
	// 	}
	// 	).join(',');
	// }

	// private printRange(range: IRange) {
	// 	return `${range.startLineNumber},${range.startColumn}/${range.endLineNumber},${range.endColumn}`;
	// }
}

export class LinkedEditingAction extends EditorAction {
	constructor() {
		super({
			id: 'editor.action.linkedEditing',
			label: nls.localize('linkedEditing.label', "Start Linked Editing"),
			alias: 'Start Linked Editing',
			precondition: ContextKeyExpr.and(EditorContextKeys.writable, EditorContextKeys.hasRenameProvider),
			kbOpts: {
				kbExpr: EditorContextKeys.editorTextFocus,
				primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.F2,
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	override runCommand(accessor: ServicesAccessor, args: [URI, IPosition]): void | Promise<void> {
		const editorService = accessor.get(ICodeEditorService);
		const [uri, pos] = Array.isArray(args) && args || [undefined, undefined];

		if (URI.isUri(uri) && Position.isIPosition(pos)) {
			return editorService.openCodeEditor({resource: uri}, editorService.getActiveCodeEditor()).then(editor => {
				if (!editor) {
					return;
				}
				editor.setPosition(pos);
				editor.invokeWithinContext(accessor => {
					this.reportTelemetry(accessor, editor);
					return this.run(accessor, editor);
				});
			}, onUnexpectedError);
		}

		return super.runCommand(accessor, args);
	}

	run(_accessor: ServicesAccessor, editor: ICodeEditor): Promise<void> {
		const controller = LinkedEditingContribution.get(editor);
		if (controller) {
			return Promise.resolve(controller.updateRanges(true));
		}
		return Promise.resolve();
	}
}

const LinkedEditingCommand = EditorCommand.bindToContribution<LinkedEditingContribution>(LinkedEditingContribution.get);
registerEditorCommand(new LinkedEditingCommand({
	id: 'cancelLinkedEditingInput',
	precondition: CONTEXT_ONTYPE_RENAME_INPUT_VISIBLE,
	handler: x => x.clearRanges(),
	kbOpts: {
		kbExpr: EditorContextKeys.editorTextFocus,
		weight: KeybindingWeight.EditorContrib + 99,
		primary: KeyCode.Escape,
		secondary: [KeyMod.Shift | KeyCode.Escape]
	}
}));


function getLinkedEditingRanges(providers: LanguageFeatureRegistry<LinkedEditingRangeProvider>, model: ITextModel, position: Position, token: CancellationToken): Promise<LinkedEditingRanges | undefined | null> {
	const orderedByScore = providers.ordered(model);

	// in order of score ask the linked editing range provider
	// until someone response with a good result
	// (good = not null)
	return first<LinkedEditingRanges | undefined | null>(orderedByScore.map(provider => async () => {
		try {
			return await provider.provideLinkedEditingRanges(model, position, token);
		} catch (e) {
			onUnexpectedExternalError(e);
			return undefined;
		}
	}), result => !!result && arrays.isNonEmptyArray(result?.ranges));
}

export const editorLinkedEditingBackground = registerColor('editor.linkedEditingBackground', {dark: Color.fromHex('#f00').transparent(0.3), light: Color.fromHex('#f00').transparent(0.3), hcDark: Color.fromHex('#f00').transparent(0.3), hcLight: Color.white}, nls.localize('editorLinkedEditingBackground', 'Background color when the editor auto renames on type.'));

registerModelAndPositionCommand('_executeLinkedEditingProvider', (_accessor, model, position) => {
	const {linkedEditingRangeProvider} = _accessor.get(ILanguageFeaturesService);
	return getLinkedEditingRanges(linkedEditingRangeProvider, model, position, CancellationToken.None);
});

registerEditorContribution(LinkedEditingContribution.ID, LinkedEditingContribution, EditorContributionInstantiation.AfterFirstRender);
registerEditorAction(LinkedEditingAction);

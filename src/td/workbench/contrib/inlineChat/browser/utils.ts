/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {EditOperation} from 'td/editor/common/core/editOperation';
import {LineRange} from 'td/editor/common/core/lineRange';
import {IRange, Range} from 'td/editor/common/core/range';
import {IIdentifiedSingleEditOperation, ITextModel, IValidEditOperation, TrackedRangeStickiness} from 'td/editor/common/model';
import {IEditObserver} from './inlineChatStrategies';
import {IProgress} from 'td/platform/progress/common/progress';
import {IntervalTimer, AsyncIterableSource} from 'td/base/common/async';
import {CancellationToken} from 'td/base/common/cancellation';
import {getNWords} from 'td/workbench/contrib/chat/common/chatWordCounter';

export function invertLineRange(range: LineRange, model: ITextModel): LineRange[] {
	if (range.isEmpty) {
		return [];
	}
	const result: LineRange[] = [];
	if (range.startLineNumber > 1) {
		result.push(new LineRange(1, range.startLineNumber));
	}
	if (range.endLineNumberExclusive < model.getLineCount() + 1) {
		result.push(new LineRange(range.endLineNumberExclusive, model.getLineCount() + 1));
	}
	return result.filter(r => !r.isEmpty);
}

export function asRange(lineRange: LineRange, model: ITextModel): Range {
	return lineRange.isEmpty
		? new Range(lineRange.startLineNumber, 1, lineRange.startLineNumber, model.getLineLength(lineRange.startLineNumber))
		: new Range(lineRange.startLineNumber, 1, lineRange.endLineNumberExclusive - 1, model.getLineLength(lineRange.endLineNumberExclusive - 1));
}

// --- async edit

export interface AsyncTextEdit {
	readonly range: IRange;
	readonly newText: AsyncIterable<string>;
}

export async function performAsyncTextEdit(model: ITextModel, edit: AsyncTextEdit, progress?: IProgress<IValidEditOperation[]>, obs?: IEditObserver) {

	const [id] = model.deltaDecorations([], [{
		range: edit.range,
		options: {
			description: 'asyncTextEdit',
			stickiness: TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges
		}
	}]);

	let first = true;
	for await (const part of edit.newText) {

		if (model.isDisposed()) {
			break;
		}

		const range = model.getDecorationRange(id);
		if (!range) {
			throw new Error('FAILED to perform async replace edit because the anchor decoration was removed');
		}

		const edit = first
			? EditOperation.replace(range, part) // first edit needs to override the "anchor"
			: EditOperation.insert(range.getEndPosition(), part);
		obs?.start();
		model.pushEditOperations(null, [edit], (undoEdits) => {
			progress?.report(undoEdits);
			return null;
		});
		obs?.stop();
		first = false;
	}
}

export function asProgressiveEdit(interval: IntervalTimer, edit: IIdentifiedSingleEditOperation, wordsPerSec: number, token: CancellationToken): AsyncTextEdit {

	wordsPerSec = Math.max(10, wordsPerSec);

	const stream = new AsyncIterableSource<string>();
	let newText = edit.text ?? '';

	interval.cancelAndSet(() => {
		const r = getNWords(newText, 1);
		stream.emitOne(r.value);
		newText = newText.substring(r.value.length);
		if (r.isFullString) {
			interval.cancel();
			stream.resolve();
			d.dispose();
		}

	}, 1000 / wordsPerSec);

	// cancel ASAP
	const d = token.onCancellationRequested(() => {
		interval.cancel();
		stream.resolve();
		d.dispose();
	});

	return {
		range: edit.range,
		newText: stream.asyncIterable
	};
}

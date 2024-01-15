/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as arrays from 'td/base/common/arrays';
import { IdleDeadline, runWhenIdle } from 'td/base/common/async';
import { BugIndicatingError, onUnexpectedError } from 'td/base/common/errors';
import { Disposable, MutableDisposable } from 'td/base/common/lifecycle';
import { setTimeout0 } from 'td/base/common/platform';
import { StopWatch } from 'td/base/common/stopwatch';
import { countEOL } from 'td/editor/common/core/eolCounter';
import { Position } from 'td/editor/common/core/position';
import { IRange } from 'td/editor/common/core/range';
import { StandardTokenType } from 'td/editor/common/encodedTokenAttributes';
import { EncodedTokenizationResult, IBackgroundTokenizationStore, IBackgroundTokenizer, ILanguageIdCodec, IState, ITokenizationSupport, TokenizationRegistry } from 'td/editor/common/languages';
import { nullTokenizeEncoded } from 'td/editor/common/languages/nullTokenize';
import { ITextModel } from 'td/editor/common/model';
import { TextModel } from 'td/editor/common/model/textModel';
import { TokenizationTextModelPart } from 'td/editor/common/model/tokenizationTextModelPart';
import { IModelContentChangedEvent, IModelLanguageChangedEvent } from 'td/editor/common/textModelEvents';
import { ContiguousMultilineTokensBuilder } from 'td/editor/common/tokens/contiguousMultilineTokensBuilder';
import { LineTokens } from 'td/editor/common/tokens/lineTokens';

const enum Constants {
	CHEAP_TOKENIZATION_LENGTH_LIMIT = 2048
}

export class TokenizationStateStore2 {
	public invalidateEndState(lineNumber: number): void;

	public getEndState(lineNumber: number): IState;

	public setEndState(lineNumber: number, state: IState): boolean { }

	public getFirstInvalidEndStateLineNumber(): number | undefined {
	}

	public applyEdits(range: IRange, eolCount: number): void {
	}
}

/**
 * Stores the states at the start of each line and keeps track of which lines
 * must be re-tokenized. Also uses state equality to quickly validate lines
 * that don't need to be re-tokenized.
 *
 * For example, when typing on a line, the line gets marked as needing to be tokenized.
 * Once the line is tokenized, the end state is checked for equality against the begin
 * state of the next line. If the states are equal, tokenization doesn't need to run
 * again over the rest of the file. If the states are not equal, the next line gets marked
 * as needing to be tokenized.
 */
export class TokenizationStateStore {
	requestTokens(startLineNumber: number, endLineNumberExclusive: number): void {
		for (let lineNumber = startLineNumber; lineNumber < endLineNumberExclusive; lineNumber++) {
			this._stateStore.markMustBeTokenized(lineNumber - 1);
		}
	}
}
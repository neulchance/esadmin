/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {Event} from 'td/base/common/event';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import type {IObservable} from 'td/base/common/observable';

/**
 * @deprecated Use {@link IObservable} instead.
 */
export interface IObservableValue<T> {
	onDidChange: Event<T>;
	readonly value: T;
}


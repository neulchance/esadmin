/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {ITextModel, IModelDecoration} from 'td/editor/common/model';
import {createDecorator} from 'td/platform/instantiation/common/instantiation';
import {IMarker} from 'td/platform/markers/common/markers';
import {Event} from 'td/base/common/event';
import {Range} from 'td/editor/common/core/range';
import {URI} from 'td/base/common/uri';

export const IMarkerDecorationsService = createDecorator<IMarkerDecorationsService>('markerDecorationsService');

export interface IMarkerDecorationsService {
	readonly _serviceBrand: undefined;

	onDidChangeMarker: Event<ITextModel>;

	getMarker(uri: URI, decoration: IModelDecoration): IMarker | null;

	getLiveMarkers(uri: URI): [Range, IMarker][];
}

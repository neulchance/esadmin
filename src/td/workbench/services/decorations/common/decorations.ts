/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {createDecorator} from 'td/platform/instantiation/common/instantiation';
import {URI} from 'td/base/common/uri';
import {Event} from 'td/base/common/event';
import {ColorIdentifier} from 'td/platform/theme/common/colorRegistry';
import {IDisposable} from 'td/base/common/lifecycle';
import {CancellationToken} from 'td/base/common/cancellation';
import {ThemeIcon} from 'td/base/common/themables';

export const IDecorationsService = createDecorator<IDecorationsService>('IFileDecorationsService');

export interface IDecorationData {
	readonly weight?: number;
	readonly color?: ColorIdentifier;
	readonly letter?: string | ThemeIcon;
	readonly tooltip?: string;
	readonly strikethrough?: boolean;
	readonly bubble?: boolean;
}

export interface IDecoration extends IDisposable {
	readonly tooltip: string;
	readonly strikethrough: boolean;
	readonly labelClassName: string;
	readonly badgeClassName: string;
	readonly iconClassName: string;
}

export interface IDecorationsProvider {
	readonly label: string;
	readonly onDidChange: Event<readonly URI[]>;
	provideDecorations(uri: URI, token: CancellationToken): IDecorationData | Promise<IDecorationData | undefined> | undefined;
}

export interface IResourceDecorationChangeEvent {
	affectsResource(uri: URI): boolean;
}

export interface IDecorationsService {

	readonly _serviceBrand: undefined;

	readonly onDidChangeDecorations: Event<IResourceDecorationChangeEvent>;

	registerDecorationsProvider(provider: IDecorationsProvider): IDisposable;

	getDecoration(uri: URI, includeChildren: boolean): IDecoration | undefined;
}

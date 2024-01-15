/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {MarkdownString} from 'td/base/common/htmlContent';
import {URI} from 'td/base/common/uri';
import {createDecorator} from 'td/platform/instantiation/common/instantiation';
import {ILinkDescriptor} from 'td/platform/opener/browser/link';
import {ThemeIcon} from 'td/base/common/themables';

export interface IBannerItem {
	readonly id: string;
	readonly icon: ThemeIcon | URI | undefined;
	readonly message: string | MarkdownString;
	readonly actions?: ILinkDescriptor[];
	readonly ariaLabel?: string;
	readonly onClose?: () => void;
}

export const IBannerService = createDecorator<IBannerService>('bannerService');

export interface IBannerService {
	readonly _serviceBrand: undefined;

	focus(): void;
	focusNextAction(): void;
	focusPreviousAction(): void;
	hide(id: string): void;
	show(item: IBannerItem): void;
}

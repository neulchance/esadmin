/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IView, IViewPaneContainer} from 'td/workbench/common/views';
import {IComposite} from 'td/workbench/common/composite';

export interface IPaneComposite extends IComposite {

	/**
	 * Returns the minimal width needed to avoid any content horizontal truncation
	 */
	getOptimalWidth(): number | undefined;

	openView<T extends IView>(id: string, focus?: boolean): T | undefined;
	getViewPaneContainer(): IViewPaneContainer | undefined;
}

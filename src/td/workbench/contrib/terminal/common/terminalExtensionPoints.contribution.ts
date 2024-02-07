/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {ITerminalContributionService, TerminalContributionService} from 'td/workbench/contrib/terminal/common/terminalExtensionPoints';

registerSingleton(ITerminalContributionService, TerminalContributionService, InstantiationType.Delayed);

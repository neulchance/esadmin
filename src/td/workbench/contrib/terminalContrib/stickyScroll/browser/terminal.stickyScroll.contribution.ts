/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {registerTerminalContribution} from 'td/workbench/contrib/terminal/browser/terminalExtensions';
import {TerminalStickyScrollContribution} from 'td/workbench/contrib/terminalContrib/stickyScroll/browser/terminalStickyScrollContribution';

import 'td/css!./media/stickyScroll';
import './terminalStickyScrollColorRegistry';

registerTerminalContribution(TerminalStickyScrollContribution.ID, TerminalStickyScrollContribution, true);

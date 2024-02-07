/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Primary workbench contribution
import 'td/workbench/contrib/terminal/browser/terminal.contribution';

// Misc extensions to the workbench contribution
import 'td/workbench/contrib/terminal/common/environmentVariable.contribution';
import 'td/workbench/contrib/terminal/common/terminalExtensionPoints.contribution';
import 'td/workbench/contrib/terminal/browser/terminalView';

// Terminal contributions - Standalone extensions to the terminal, these cannot be imported from the
// primary workbench contribution)
import 'td/workbench/contrib/terminalContrib/accessibility/browser/terminal.accessibility.contribution';
import 'td/workbench/contrib/terminalContrib/developer/browser/terminal.developer.contribution';
import 'td/workbench/contrib/terminalContrib/environmentChanges/browser/terminal.environmentChanges.contribution';
import 'td/workbench/contrib/terminalContrib/find/browser/terminal.find.contribution';
import 'td/workbench/contrib/terminalContrib/highlight/browser/terminal.highlight.contribution';
import 'td/workbench/contrib/terminalContrib/links/browser/terminal.links.contribution';
import 'td/workbench/contrib/terminalContrib/mouseWheelZoom/browser/terminal.mouseWheelZoom.contribution';
import 'td/workbench/contrib/terminalContrib/stickyScroll/browser/terminal.stickyScroll.contribution';
import 'td/workbench/contrib/terminalContrib/quickFix/browser/terminal.quickFix.contribution';
import 'td/workbench/contrib/terminalContrib/typeAhead/browser/terminal.typeAhead.contribution';
import 'td/workbench/contrib/terminalContrib/suggest/browser/terminal.suggest.contribution';

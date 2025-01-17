/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {registerColor} from 'td/platform/theme/common/colorRegistry';
import {localize} from 'td/nls';
import {Color, RGBA} from 'td/base/common/color';

export const embeddedEditorBackground = registerColor('walkThrough.embeddedEditorBackground', {dark: new Color(new RGBA(0, 0, 0, .4)), light: '#f4f4f4', hcDark: null, hcLight: null}, localize('walkThrough.embeddedEditorBackground', 'Background color for the embedded editors on the Interactive Playground.'));

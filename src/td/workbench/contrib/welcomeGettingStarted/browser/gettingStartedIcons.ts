/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {localize} from 'td/nls';
import {Codicon} from 'td/base/common/codicons';
import {registerIcon} from 'td/platform/theme/common/iconRegistry';

export const gettingStartedUncheckedCodicon = registerIcon('getting-started-step-unchecked', Codicon.circleLargeOutline, localize('gettingStartedUnchecked', "Used to represent walkthrough steps which have not been completed"));
export const gettingStartedCheckedCodicon = registerIcon('getting-started-step-checked', Codicon.passFilled, localize('gettingStartedChecked', "Used to represent walkthrough steps which have been completed"));

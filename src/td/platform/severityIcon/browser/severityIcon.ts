/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'td/css!./media/severityIcon';
import {Codicon} from 'td/base/common/codicons';
import {ThemeIcon} from 'td/base/common/themables';
import Severity from 'td/base/common/severity';

export namespace SeverityIcon {

	export function className(severity: Severity): string {
		switch (severity) {
			case Severity.Ignore:
				return 'severity-ignore ' + ThemeIcon.asClassName(Codicon.info);
			case Severity.Info:
				return ThemeIcon.asClassName(Codicon.info);
			case Severity.Warning:
				return ThemeIcon.asClassName(Codicon.warning);
			case Severity.Error:
				return ThemeIcon.asClassName(Codicon.error);
			default:
				return '';
		}
	}
}

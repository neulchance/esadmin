/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'td/nls';
import {Action} from 'td/base/common/actions';
import {IExtensionDescription} from 'td/platform/extensions/common/extensions';
import {IWorkbenchIssueService} from 'td/workbench/services/issue/common/issue';

export class ReportExtensionIssueAction extends Action {

	private static readonly _id = 'workbench.extensions.action.reportExtensionIssue';
	private static readonly _label = nls.localize('reportExtensionIssue', "Report Issue");

	// TODO: Consider passing in IExtensionStatus or IExtensionHostProfile for additional data
	constructor(
		private extension: IExtensionDescription,
		@IWorkbenchIssueService private readonly issueService: IWorkbenchIssueService
	) {
		super(ReportExtensionIssueAction._id, ReportExtensionIssueAction._label, 'extension-action report-issue');

		this.enabled = extension.isBuiltin || (!!extension.repository && !!extension.repository.url);
	}

	override async run(): Promise<void> {
		await this.issueService.openReporter({
			extensionId: this.extension.identifier.value,
		});
	}
}

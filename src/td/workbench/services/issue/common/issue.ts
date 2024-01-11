/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {CancellationToken} from 'td/base/common/cancellation';
import {IDisposable} from 'td/base/common/lifecycle';
import {URI} from 'td/base/common/uri';
import {createDecorator} from 'td/platform/instantiation/common/instantiation';
import {IssueReporterData} from 'td/platform/issue/common/issue';

export interface IIssueUriRequestHandler {
	provideIssueUrl(token: CancellationToken): Promise<URI>;
}

export interface IIssueDataProvider {
	provideIssueExtensionData(token: CancellationToken): Promise<string>;
	provideIssueExtensionTemplate(token: CancellationToken): Promise<string>;
}

export const IWorkbenchIssueService = createDecorator<IWorkbenchIssueService>('workbenchIssueService');

export interface IWorkbenchIssueService {
	readonly _serviceBrand: undefined;
	openReporter(dataOverrides?: Partial<IssueReporterData>): Promise<void>;
	openProcessExplorer(): Promise<void>;
	registerIssueUriRequestHandler(extensionId: string, handler: IIssueUriRequestHandler): IDisposable;
	registerIssueDataProvider(extensionId: string, handler: IIssueDataProvider): IDisposable;
}

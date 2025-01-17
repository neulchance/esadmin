/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {CancellationToken} from 'td/base/common/cancellation';
import {toDisposable} from 'td/base/common/lifecycle';
import {isString} from 'td/base/common/types';
import {URI, UriComponents} from 'td/base/common/uri';
import {IExtensionDescription} from 'td/platform/extensions/common/extensions';
import {checkProposedApiEnabled} from 'td/workbench/services/extensions/common/extensions';
import {ISaveProfileResult} from 'td/workbench/services/userDataProfile/common/userDataProfile';
import type * as vscode from 'vscode';
import {ExtHostProfileContentHandlersShape, IMainContext, MainContext, MainThreadProfileContentHandlersShape} from './extHost.protocol';


export class ExtHostProfileContentHandlers implements ExtHostProfileContentHandlersShape {

	private readonly proxy: MainThreadProfileContentHandlersShape;

	private readonly handlers = new Map<string, vscode.ProfileContentHandler>();

	constructor(
		mainContext: IMainContext,
	) {
		this.proxy = mainContext.getProxy(MainContext.MainThreadProfileContentHandlers);
	}

	registerProfileContentHandler(
		extension: IExtensionDescription,
		id: string,
		handler: vscode.ProfileContentHandler,
	): vscode.Disposable {
		checkProposedApiEnabled(extension, 'profileContentHandlers');
		if (this.handlers.has(id)) {
			throw new Error(`Handler with id '${id}' already registered`);
		}

		this.handlers.set(id, handler);
		this.proxy.$registerProfileContentHandler(id, handler.name, handler.description, extension.identifier.value);

		return toDisposable(() => {
			this.handlers.delete(id);
			this.proxy.$unregisterProfileContentHandler(id);
		});
	}

	async $saveProfile(id: string, name: string, content: string, token: CancellationToken): Promise<ISaveProfileResult | null> {
		const handler = this.handlers.get(id);
		if (!handler) {
			throw new Error(`Unknown handler with id: ${id}`);
		}

		return handler.saveProfile(name, content, token);
	}

	async $readProfile(id: string, idOrUri: string | UriComponents, token: CancellationToken): Promise<string | null> {
		const handler = this.handlers.get(id);
		if (!handler) {
			throw new Error(`Unknown handler with id: ${id}`);
		}

		return handler.readProfile(isString(idOrUri) ? idOrUri : URI.revive(idOrUri), token);
	}
}

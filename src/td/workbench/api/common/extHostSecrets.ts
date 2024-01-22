/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* eslint-disable local/code-no-native-private */

import type * as vscode from 'vscode';

import {ExtHostSecretState} from 'td/workbench/api/common/extHostSecretState';
import {ExtensionIdentifier, IExtensionDescription} from 'td/platform/extensions/common/extensions';
import {Emitter, Event} from 'td/base/common/event';

export class ExtensionSecrets implements vscode.SecretStorage {

	protected readonly _id: string;
	readonly #secretState: ExtHostSecretState;

	private _onDidChange = new Emitter<vscode.SecretStorageChangeEvent>();
	readonly onDidChange: Event<vscode.SecretStorageChangeEvent> = this._onDidChange.event;


	constructor(extensionDescription: IExtensionDescription, secretState: ExtHostSecretState) {
		this._id = ExtensionIdentifier.toKey(extensionDescription.identifier);
		this.#secretState = secretState;

		this.#secretState.onDidChangePassword(e => {
			if (e.extensionId === this._id) {
				this._onDidChange.fire({key: e.key});
			}
		});
	}

	get(key: string): Promise<string | undefined> {
		return this.#secretState.get(this._id, key);
	}

	store(key: string, value: string): Promise<void> {
		return this.#secretState.store(this._id, key, value);
	}

	delete(key: string): Promise<void> {
		return this.#secretState.delete(this._id, key);
	}
}

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {CancellationToken} from 'td/base/common/cancellation';
import {IDisposable, toDisposable} from 'td/base/common/lifecycle';
import {ExtensionIdentifier} from 'td/platform/extensions/common/extensions';
import {createDecorator} from 'td/platform/instantiation/common/instantiation';
import {IProgress} from 'td/platform/progress/common/progress';

export const enum ChatMessageRole {
	System,
	User,
	Assistant,
	Function,
}

export interface IChatMessage {
	readonly role: ChatMessageRole;
	readonly content: string;
	readonly name?: string;
}

export interface IChatResponseFragment {
	index: number;
	part: string;
}

export interface IChatResponseProviderMetadata {
	readonly extension: ExtensionIdentifier;
	readonly model: string;
	readonly description?: string;
}

export interface IChatResponseProvider {
	metadata: IChatResponseProviderMetadata;
	provideChatResponse(messages: IChatMessage[], options: { [name: string]: any }, progress: IProgress<IChatResponseFragment>, token: CancellationToken): Promise<any>;
}

export const IChatProviderService = createDecorator<IChatProviderService>('chatProviderService');

export interface IChatProviderService {

	readonly _serviceBrand: undefined;

	lookupChatResponseProvider(identifier: string): IChatResponseProviderMetadata | undefined;

	registerChatResponseProvider(identifier: string, provider: IChatResponseProvider): IDisposable;

	fetchChatResponse(identifier: string, messages: IChatMessage[], options: { [name: string]: any }, progress: IProgress<IChatResponseFragment>, token: CancellationToken): Promise<any>;
}

export class ChatProviderService implements IChatProviderService {
	readonly _serviceBrand: undefined;

	private readonly _providers: Map<string, IChatResponseProvider> = new Map();

	lookupChatResponseProvider(identifier: string): IChatResponseProviderMetadata | undefined {
		return this._providers.get(identifier)?.metadata;
	}

	registerChatResponseProvider(identifier: string, provider: IChatResponseProvider): IDisposable {
		if (this._providers.has(identifier)) {
			throw new Error(`Chat response provider with identifier ${identifier} is already registered.`);
		}
		this._providers.set(identifier, provider);
		return toDisposable(() => this._providers.delete(identifier));
	}

	fetchChatResponse(identifier: string, messages: IChatMessage[], options: { [name: string]: any }, progress: IProgress<IChatResponseFragment>, token: CancellationToken): Promise<any> {
		const provider = this._providers.get(identifier);
		if (!provider) {
			throw new Error(`Chat response provider with identifier ${identifier} is not registered.`);
		}
		return provider.provideChatResponse(messages, options, progress, token);
	}
}

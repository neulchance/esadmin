/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {Emitter, Event} from 'td/base/common/event';
import {Disposable} from 'td/base/common/lifecycle';
import {URI} from 'td/base/common/uri';
import {IChannel, IServerChannel} from 'td/base/parts/ipc/common/ipc';
import {IConfigurationService} from 'td/platform/configuration/common/configuration';
import {IProductService} from 'td/platform/product/common/productService';
import {IStorageService} from 'td/platform/storage/common/storage';
import {IUserDataSyncStore, IUserDataSyncStoreManagementService, UserDataSyncStoreType} from 'td/platform/userDataSync/common/userDataSync';
import {IUserDataSyncAccount, IUserDataSyncAccountService} from 'td/platform/userDataSync/common/userDataSyncAccount';
import {AbstractUserDataSyncStoreManagementService} from 'td/platform/userDataSync/common/userDataSyncStoreService';

export class UserDataSyncAccountServiceChannel implements IServerChannel {
	constructor(private readonly service: IUserDataSyncAccountService) { }

	listen(_: unknown, event: string): Event<any> {
		switch (event) {
			case 'onDidChangeAccount': return this.service.onDidChangeAccount;
			case 'onTokenFailed': return this.service.onTokenFailed;
		}
		throw new Error(`Event not found: ${event}`);
	}

	call(context: any, command: string, args?: any): Promise<any> {
		switch (command) {
			case '_getInitialData': return Promise.resolve(this.service.account);
			case 'updateAccount': return this.service.updateAccount(args);
		}
		throw new Error('Invalid call');
	}
}

export class UserDataSyncAccountServiceChannelClient extends Disposable implements IUserDataSyncAccountService {

	declare readonly _serviceBrand: undefined;

	private _account: IUserDataSyncAccount | undefined;
	get account(): IUserDataSyncAccount | undefined { return this._account; }

	get onTokenFailed(): Event<boolean> { return this.channel.listen<boolean>('onTokenFailed'); }

	private _onDidChangeAccount = this._register(new Emitter<IUserDataSyncAccount | undefined>());
	readonly onDidChangeAccount = this._onDidChangeAccount.event;

	constructor(private readonly channel: IChannel) {
		super();
		this.channel.call<IUserDataSyncAccount | undefined>('_getInitialData').then(account => {
			this._account = account;
			this._register(this.channel.listen<IUserDataSyncAccount | undefined>('onDidChangeAccount')(account => {
				this._account = account;
				this._onDidChangeAccount.fire(account);
			}));
		});
	}

	updateAccount(account: IUserDataSyncAccount | undefined): Promise<undefined> {
		return this.channel.call('updateAccount', account);
	}

}

export class UserDataSyncStoreManagementServiceChannel implements IServerChannel {
	constructor(private readonly service: IUserDataSyncStoreManagementService) { }

	listen(_: unknown, event: string): Event<any> {
		switch (event) {
			case 'onDidChangeUserDataSyncStore': return this.service.onDidChangeUserDataSyncStore;
		}
		throw new Error(`Event not found: ${event}`);
	}

	call(context: any, command: string, args?: any): Promise<any> {
		switch (command) {
			case 'switch': return this.service.switch(args[0]);
			case 'getPreviousUserDataSyncStore': return this.service.getPreviousUserDataSyncStore();
		}
		throw new Error('Invalid call');
	}
}

export class UserDataSyncStoreManagementServiceChannelClient extends AbstractUserDataSyncStoreManagementService implements IUserDataSyncStoreManagementService {

	constructor(
		private readonly channel: IChannel,
		@IProductService productService: IProductService,
		@IConfigurationService configurationService: IConfigurationService,
		@IStorageService storageService: IStorageService,
	) {
		super(productService, configurationService, storageService);
		this._register(this.channel.listen<void>('onDidChangeUserDataSyncStore')(() => this.updateUserDataSyncStore()));
	}

	async switch(type: UserDataSyncStoreType): Promise<void> {
		return this.channel.call('switch', [type]);
	}

	async getPreviousUserDataSyncStore(): Promise<IUserDataSyncStore> {
		const userDataSyncStore = await this.channel.call<IUserDataSyncStore>('getPreviousUserDataSyncStore');
		return this.revive(userDataSyncStore);
	}

	private revive(userDataSyncStore: IUserDataSyncStore): IUserDataSyncStore {
		return {
			url: URI.revive(userDataSyncStore.url),
			type: userDataSyncStore.type,
			defaultUrl: URI.revive(userDataSyncStore.defaultUrl),
			insidersUrl: URI.revive(userDataSyncStore.insidersUrl),
			stableUrl: URI.revive(userDataSyncStore.stableUrl),
			canSwitch: userDataSyncStore.canSwitch,
			authenticationProviders: userDataSyncStore.authenticationProviders,
		};
	}
}

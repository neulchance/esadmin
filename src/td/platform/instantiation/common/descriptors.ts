/*----------------------------------------------------------------------------------------------------
 *  Copyright (c) TinyDeskDev. All rights reserved.
 *  Licensed under the UNLICENSED License. See License.txt in the project root for license information.
 *---------------------------------------------------------------------------------------------------*/

export class SyncDescriptor<T> {

	readonly ctor: any;
	readonly staticArguments: any[];
	readonly supportsDelayedInstantiation: boolean;

	constructor(ctor: new (...args: any[]) => T, staticArguments: any[] = [], supportsDelayedInstantiation = false) {
		this.ctor = ctor;
		this.staticArguments = staticArguments;
		this.supportsDelayedInstantiation = supportsDelayedInstantiation;
	}
}

export interface SyncDescriptor0<T> {
	readonly ctor: new () => T;
}

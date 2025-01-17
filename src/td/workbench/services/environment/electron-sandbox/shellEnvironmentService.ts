/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {createDecorator} from 'td/platform/instantiation/common/instantiation';
import {IProcessEnvironment} from 'td/base/common/platform';
import {process} from 'td/base/parts/sandbox/electron-sandbox/globals';
import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';

export const IShellEnvironmentService = createDecorator<IShellEnvironmentService>('shellEnvironmentService');

export interface IShellEnvironmentService {

	readonly _serviceBrand: undefined;

	getShellEnv(): Promise<IProcessEnvironment>;
}

export class ShellEnvironmentService implements IShellEnvironmentService {

	declare readonly _serviceBrand: undefined;

	getShellEnv(): Promise<IProcessEnvironment> {
		return process.shellEnv();
	}
}

registerSingleton(IShellEnvironmentService, ShellEnvironmentService, InstantiationType.Delayed);

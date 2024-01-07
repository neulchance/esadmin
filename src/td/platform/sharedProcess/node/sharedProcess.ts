/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {IStringDictionary} from 'td/base/common/collections';
import {NativeParsedArgs} from 'td/platform/environment/common/argv';
import {ILoggerResource, LogLevel} from 'td/platform/log/common/log';
import {IUserDataProfile} from 'td/platform/userDataProfile/common/userDataProfile';
import {PolicyDefinition, PolicyValue} from 'td/platform/policy/common/policy';
import {UriComponents, UriDto} from 'td/base/common/uri';

export interface ISharedProcessConfiguration {
	readonly machineId: string;

	readonly sqmId: string;

	readonly codeCachePath: string | undefined;

	readonly args: NativeParsedArgs;

	readonly logLevel: LogLevel;

	readonly loggers: UriDto<ILoggerResource>[];

	readonly profiles: {
		readonly home: UriComponents;
		readonly all: readonly UriDto<IUserDataProfile>[];
	};

	readonly policiesData?: IStringDictionary<{ definition: PolicyDefinition; value: PolicyValue }>;
}

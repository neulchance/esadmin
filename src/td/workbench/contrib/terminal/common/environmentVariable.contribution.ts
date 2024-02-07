/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {EnvironmentVariableService} from 'td/workbench/contrib/terminal/common/environmentVariableService';
import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {IEnvironmentVariableService} from 'td/workbench/contrib/terminal/common/environmentVariable';

registerSingleton(IEnvironmentVariableService, EnvironmentVariableService, InstantiationType.Delayed);

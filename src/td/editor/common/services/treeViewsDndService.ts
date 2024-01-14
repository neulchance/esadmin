/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {InstantiationType, registerSingleton} from 'td/platform/instantiation/common/extensions';
import {createDecorator} from 'td/platform/instantiation/common/instantiation';
import {VSDataTransfer} from 'td/base/common/dataTransfer';
import {ITreeViewsDnDService as ITreeViewsDnDServiceCommon, TreeViewsDnDService} from 'td/editor/common/services/treeViewsDnd';

export interface ITreeViewsDnDService extends ITreeViewsDnDServiceCommon<VSDataTransfer> { }
export const ITreeViewsDnDService = createDecorator<ITreeViewsDnDService>('treeViewsDndService');
registerSingleton(ITreeViewsDnDService, TreeViewsDnDService, InstantiationType.Delayed);

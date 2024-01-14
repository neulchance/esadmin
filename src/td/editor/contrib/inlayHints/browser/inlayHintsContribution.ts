/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {EditorContributionInstantiation, registerEditorContribution} from 'td/editor/browser/editorExtensions';
import {HoverParticipantRegistry} from 'td/editor/contrib/hover/browser/hoverTypes';
import {InlayHintsController} from 'td/editor/contrib/inlayHints/browser/inlayHintsController';
import {InlayHintsHover} from 'td/editor/contrib/inlayHints/browser/inlayHintsHover';

registerEditorContribution(InlayHintsController.ID, InlayHintsController, EditorContributionInstantiation.AfterFirstRender);
HoverParticipantRegistry.register(InlayHintsHover);

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {EditorContributionInstantiation, registerEditorAction, registerEditorContribution} from 'td/editor/browser/editorExtensions';
import {HoverParticipantRegistry} from 'td/editor/contrib/hover/browser/hoverTypes';
import {TriggerInlineSuggestionAction, ShowNextInlineSuggestionAction, ShowPreviousInlineSuggestionAction, AcceptNextWordOfInlineCompletion, AcceptInlineCompletion, HideInlineCompletion, ToggleAlwaysShowInlineSuggestionToolbar, AcceptNextLineOfInlineCompletion} from 'td/editor/contrib/inlineCompletions/browser/commands';
import {InlineCompletionsHoverParticipant} from 'td/editor/contrib/inlineCompletions/browser/hoverParticipant';
import {InlineCompletionsController} from 'td/editor/contrib/inlineCompletions/browser/inlineCompletionsController';
import {registerAction2} from 'td/platform/actions/common/actions';

registerEditorContribution(InlineCompletionsController.ID, InlineCompletionsController, EditorContributionInstantiation.Eventually);

registerEditorAction(TriggerInlineSuggestionAction);
registerEditorAction(ShowNextInlineSuggestionAction);
registerEditorAction(ShowPreviousInlineSuggestionAction);
registerEditorAction(AcceptNextWordOfInlineCompletion);
registerEditorAction(AcceptNextLineOfInlineCompletion);
registerEditorAction(AcceptInlineCompletion);
registerEditorAction(HideInlineCompletion);
registerAction2(ToggleAlwaysShowInlineSuggestionToolbar);

HoverParticipantRegistry.register(InlineCompletionsHoverParticipant);

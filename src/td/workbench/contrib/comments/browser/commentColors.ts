/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {Color} from 'td/base/common/color';
import * as languages from 'td/editor/common/languages';
import {peekViewTitleBackground} from 'td/editor/contrib/peekView/browser/peekView';
import * as nls from 'td/nls';
import {contrastBorder, disabledForeground, listFocusOutline, registerColor, transparent} from 'td/platform/theme/common/colorRegistry';
import {IColorTheme} from 'td/platform/theme/common/themeService';

const resolvedCommentViewIcon = registerColor('commentsView.resolvedIcon', {dark: disabledForeground, light: disabledForeground, hcDark: contrastBorder, hcLight: contrastBorder}, nls.localize('resolvedCommentIcon', 'Icon color for resolved comments.'));
const unresolvedCommentViewIcon = registerColor('commentsView.unresolvedIcon', {dark: listFocusOutline, light: listFocusOutline, hcDark: contrastBorder, hcLight: contrastBorder}, nls.localize('unresolvedCommentIcon', 'Icon color for unresolved comments.'));

registerColor('editorCommentsWidget.replyInputBackground', {dark: peekViewTitleBackground, light: peekViewTitleBackground, hcDark: peekViewTitleBackground, hcLight: peekViewTitleBackground}, nls.localize('commentReplyInputBackground', 'Background color for comment reply input box.'));
const resolvedCommentBorder = registerColor('editorCommentsWidget.resolvedBorder', {dark: resolvedCommentViewIcon, light: resolvedCommentViewIcon, hcDark: contrastBorder, hcLight: contrastBorder}, nls.localize('resolvedCommentBorder', 'Color of borders and arrow for resolved comments.'));
const unresolvedCommentBorder = registerColor('editorCommentsWidget.unresolvedBorder', {dark: unresolvedCommentViewIcon, light: unresolvedCommentViewIcon, hcDark: contrastBorder, hcLight: contrastBorder}, nls.localize('unresolvedCommentBorder', 'Color of borders and arrow for unresolved comments.'));
export const commentThreadRangeBackground = registerColor('editorCommentsWidget.rangeBackground', {dark: transparent(unresolvedCommentBorder, .1), light: transparent(unresolvedCommentBorder, .1), hcDark: transparent(unresolvedCommentBorder, .1), hcLight: transparent(unresolvedCommentBorder, .1)}, nls.localize('commentThreadRangeBackground', 'Color of background for comment ranges.'));
export const commentThreadRangeActiveBackground = registerColor('editorCommentsWidget.rangeActiveBackground', {dark: transparent(unresolvedCommentBorder, .1), light: transparent(unresolvedCommentBorder, .1), hcDark: transparent(unresolvedCommentBorder, .1), hcLight: transparent(unresolvedCommentBorder, .1)}, nls.localize('commentThreadActiveRangeBackground', 'Color of background for currently selected or hovered comment range.'));

const commentThreadStateBorderColors = new Map([
	[languages.CommentThreadState.Unresolved, unresolvedCommentBorder],
	[languages.CommentThreadState.Resolved, resolvedCommentBorder],
]);

const commentThreadStateIconColors = new Map([
	[languages.CommentThreadState.Unresolved, unresolvedCommentViewIcon],
	[languages.CommentThreadState.Resolved, resolvedCommentViewIcon],
]);

export const commentThreadStateColorVar = '--comment-thread-state-color';
export const commentViewThreadStateColorVar = '--comment-view-thread-state-color';
export const commentThreadStateBackgroundColorVar = '--comment-thread-state-background-color';

function getCommentThreadStateColor(state: languages.CommentThreadState | undefined, theme: IColorTheme, map: Map<languages.CommentThreadState, string>): Color | undefined {
	const colorId = (state !== undefined) ? map.get(state) : undefined;
	return (colorId !== undefined) ? theme.getColor(colorId) : undefined;
}

export function getCommentThreadStateBorderColor(state: languages.CommentThreadState | undefined, theme: IColorTheme): Color | undefined {
	return getCommentThreadStateColor(state, theme, commentThreadStateBorderColors);
}

export function getCommentThreadStateIconColor(state: languages.CommentThreadState | undefined, theme: IColorTheme): Color | undefined {
	return getCommentThreadStateColor(state, theme, commentThreadStateIconColors);
}

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from 'td/base/browser/dom';
import {Button, IButtonStyles} from 'td/base/browser/ui/button/button';
import {MarkdownString} from 'td/base/common/htmlContent';
import {Disposable} from 'td/base/common/lifecycle';
import {localize} from 'td/nls';
import {ContextKeyExpr, IContextKeyService} from 'td/platform/contextkey/common/contextkey';
import {IChatFollowup} from 'td/workbench/contrib/chat/common/chatService';

const $ = dom.$;

export class ChatFollowups<T extends IChatFollowup> extends Disposable {
	constructor(
		container: HTMLElement,
		followups: T[],
		private readonly options: IButtonStyles | undefined,
		private readonly clickHandler: (followup: T) => void,
		private readonly contextService: IContextKeyService,
	) {
		super();

		const followupsContainer = dom.append(container, $('.interactive-session-followups'));
		followups.forEach(followup => this.renderFollowup(followupsContainer, followup));
	}

	private renderFollowup(container: HTMLElement, followup: T): void {

		if (followup.kind === 'command' && followup.when && !this.contextService.contextMatchesRules(ContextKeyExpr.deserialize(followup.when))) {
			return;
		}

		const tooltip = 'tooltip' in followup ? followup.tooltip : undefined;
		const button = this._register(new Button(container, {...this.options, supportIcons: true, title: tooltip}));
		if (followup.kind === 'reply') {
			button.element.classList.add('interactive-followup-reply');
		} else if (followup.kind === 'command') {
			button.element.classList.add('interactive-followup-command');
		}
		button.element.ariaLabel = localize('followUpAriaLabel', "Follow up question: {0}", followup.title);
		const label = followup.kind === 'reply' ?
			'$(sparkle) ' + (followup.title || followup.message) :
			followup.title;
		button.label = new MarkdownString(label, {supportThemeIcons: true});

		this._register(button.onDidClick(() => this.clickHandler(followup)));
	}
}

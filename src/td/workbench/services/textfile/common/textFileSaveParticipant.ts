/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {localize} from 'td/nls';
import {raceCancellation} from 'td/base/common/async';
import {CancellationTokenSource, CancellationToken} from 'td/base/common/cancellation';
import {ILogService} from 'td/platform/log/common/log';
import {IProgressService, ProgressLocation} from 'td/platform/progress/common/progress';
import {ITextFileSaveParticipant, ITextFileEditorModel} from 'td/workbench/services/textfile/common/textfiles';
import {SaveReason} from 'td/workbench/common/editor';
import {IDisposable, Disposable, toDisposable} from 'td/base/common/lifecycle';
import {insert} from 'td/base/common/arrays';

export class TextFileSaveParticipant extends Disposable {

	private readonly saveParticipants: ITextFileSaveParticipant[] = [];

	constructor(
		@IProgressService private readonly progressService: IProgressService,
		@ILogService private readonly logService: ILogService
	) {
		super();
	}

	addSaveParticipant(participant: ITextFileSaveParticipant): IDisposable {
		const remove = insert(this.saveParticipants, participant);

		return toDisposable(() => remove());
	}

	participate(model: ITextFileEditorModel, context: { reason: SaveReason }, token: CancellationToken): Promise<void> {
		const cts = new CancellationTokenSource(token);

		return this.progressService.withProgress({
			title: localize('saveParticipants', "Saving '{0}'", model.name),
			location: ProgressLocation.Notification,
			cancellable: true,
			delay: model.isDirty() ? 3000 : 5000
		}, async progress => {

			// undoStop before participation
			model.textEditorModel?.pushStackElement();

			for (const saveParticipant of this.saveParticipants) {
				if (cts.token.isCancellationRequested || !model.textEditorModel /* disposed */) {
					break;
				}

				try {
					const promise = saveParticipant.participate(model, context, progress, cts.token);
					await raceCancellation(promise, cts.token);
				} catch (err) {
					this.logService.error(err);
				}
			}

			// undoStop after participation
			model.textEditorModel?.pushStackElement();
		}, () => {
			// user cancel
			cts.cancel();
		}).finally(() => {
			cts.dispose();
		});
	}

	override dispose(): void {
		this.saveParticipants.splice(0, this.saveParticipants.length);

		super.dispose();
	}
}

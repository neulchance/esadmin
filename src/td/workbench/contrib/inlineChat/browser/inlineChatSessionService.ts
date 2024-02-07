/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {URI} from 'td/base/common/uri';
import {Event} from 'td/base/common/event';
import {EditMode, IInlineChatSession, IInlineChatResponse} from 'td/workbench/contrib/inlineChat/common/inlineChat';
import {IRange} from 'td/editor/common/core/range';
import {IActiveCodeEditor, ICodeEditor} from 'td/editor/browser/editorBrowser';
import {createDecorator} from 'td/platform/instantiation/common/instantiation';
import {IDisposable} from 'td/base/common/lifecycle';
import {CancellationToken} from 'td/base/common/cancellation';
import {Session, StashedSession} from './inlineChatSession';
import {IValidEditOperation} from 'td/editor/common/model';


export type Recording = {
	when: Date;
	session: IInlineChatSession;
	exchanges: { prompt: string; res: IInlineChatResponse }[];
};

export interface ISessionKeyComputer {
	getComparisonKey(editor: ICodeEditor, uri: URI): string;
}

export const IInlineChatSessionService = createDecorator<IInlineChatSessionService>('IInlineChatSessionService');

export interface IInlineChatSessionEvent {
	readonly editor: ICodeEditor;
	readonly session: Session;
}

export interface IInlineChatSessionService {
	_serviceBrand: undefined;

	onWillStartSession: Event<IActiveCodeEditor>;
	onDidMoveSession: Event<IInlineChatSessionEvent>;
	onDidStashSession: Event<IInlineChatSessionEvent>;
	onDidEndSession: Event<IInlineChatSessionEvent>;

	createSession(editor: IActiveCodeEditor, options: { editMode: EditMode; wholeRange?: IRange }, token: CancellationToken): Promise<Session | undefined>;

	moveSession(session: Session, newEditor: ICodeEditor): void;

	getCodeEditor(session: Session): ICodeEditor;

	getSession(editor: ICodeEditor, uri: URI): Session | undefined;

	releaseSession(session: Session): void;

	stashSession(session: Session, editor: ICodeEditor, undoCancelEdits: IValidEditOperation[]): StashedSession;

	registerSessionKeyComputer(scheme: string, value: ISessionKeyComputer): IDisposable;

	//
	recordings(): readonly Recording[];

	dispose(): void;
}

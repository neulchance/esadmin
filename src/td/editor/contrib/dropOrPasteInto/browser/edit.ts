/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {URI} from 'td/base/common/uri';
import {ResourceTextEdit} from 'td/editor/browser/services/bulkEditService';
import {DropYieldTo, WorkspaceEdit} from 'td/editor/common/languages';
import {Range} from 'td/editor/common/core/range';
import {SnippetParser} from 'td/editor/contrib/snippet/browser/snippetParser';

export interface DropOrPasteEdit {
	readonly label: string;
	readonly insertText: string | { readonly snippet: string };
	readonly additionalEdit?: WorkspaceEdit;
}

/**
 * Given a {@link DropOrPasteEdit} and set of ranges, creates a {@link WorkspaceEdit} that applies the insert text from
 * the {@link DropOrPasteEdit} at each range plus any additional edits.
 */
export function createCombinedWorkspaceEdit(uri: URI, ranges: readonly Range[], edit: DropOrPasteEdit): WorkspaceEdit {
	// If the edit insert text is empty, skip applying at each range
	if (typeof edit.insertText === 'string' ? edit.insertText === '' : edit.insertText.snippet === '') {
		return {
			edits: edit.additionalEdit?.edits ?? []
		};
	}

	return {
		edits: [
			...ranges.map(range =>
				new ResourceTextEdit(uri,
					{range, text: typeof edit.insertText === 'string' ? SnippetParser.escape(edit.insertText) + '$0' : edit.insertText.snippet, insertAsSnippet: true}
				)),
			...(edit.additionalEdit?.edits ?? [])
		]
	};
}

export function sortEditsByYieldTo<T extends {
	readonly providerId: string | undefined;
	readonly handledMimeType?: string;
	readonly yieldTo?: readonly DropYieldTo[];
}>(edits: readonly T[]): T[] {
	function yieldsTo(yTo: DropYieldTo, other: T): boolean {
		return ('providerId' in yTo && yTo.providerId === other.providerId)
			|| ('mimeType' in yTo && yTo.mimeType === other.handledMimeType);
	}

	// Build list of nodes each node yields to
	const yieldsToMap = new Map<T, T[]>();
	for (const edit of edits) {
		for (const yTo of edit.yieldTo ?? []) {
			for (const other of edits) {
				if (other === edit) {
					continue;
				}

				if (yieldsTo(yTo, other)) {
					let arr = yieldsToMap.get(edit);
					if (!arr) {
						arr = [];
						yieldsToMap.set(edit, arr);
					}
					arr.push(other);
				}
			}
		}
	}

	if (!yieldsToMap.size) {
		return Array.from(edits);
	}

	// Topological sort
	const visited = new Set<T>();
	const tempStack: T[] = [];

	function visit(nodes: T[]): T[] {
		if (!nodes.length) {
			return [];
		}

		const node = nodes[0];
		if (tempStack.includes(node)) {
			console.warn(`Yield to cycle detected for ${node.providerId}`);
			return nodes;
		}

		if (visited.has(node)) {
			return visit(nodes.slice(1));
		}

		let pre: T[] = [];
		const yTo = yieldsToMap.get(node);
		if (yTo) {
			tempStack.push(node);
			pre = visit(yTo);
			tempStack.pop();
		}

		visited.add(node);

		return [...pre, node, ...visit(nodes.slice(1))];
	}

	return visit(Array.from(edits));
}

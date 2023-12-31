/*----------------------------------------------------------------------------------------------------
 *  Copyright (c) TinyDeskDev. All rights reserved.
 *  Licensed under the UNLICENSED License. See License.txt in the project root for license information.
 *---------------------------------------------------------------------------------------------------*/

/**
 * Removes duplicates from the given array. The optional keyFn allows to specify
 * how elements are checked for equality by returning an alternate value for each.
 */
export function distinct<T>(array: ReadonlyArray<T>, keyFn: (value: T) => any = value => value): T[] {
	const seen = new Set<any>();

	return array.filter(element => {
		const key = keyFn!(element);
		if (seen.has(key)) {
			return false;
		}
		seen.add(key);
		return true;
	});
}
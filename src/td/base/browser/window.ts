/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export type DevWindow = Window & typeof globalThis & {
	readonly tddevWindowId: number;
};

export function ensureDevWindow(targetWindow: Window, fallbackWindowId: number): asserts targetWindow is DevWindow {
	const devWindow = targetWindow as Partial<DevWindow>;

	if (typeof devWindow.tddevWindowId !== 'number') {
		Object.defineProperty(devWindow, 'tddevWindowId', {
			get: () => fallbackWindowId
		});
	}
}

// eslint-disable-next-line no-restricted-globals
export const mainWindow = window as DevWindow;

/**
 * @deprecated to support multi-window scenarios, use `DOM.mainWindow`
 * if you target the main global window or use helpers such as `DOM.getWindow()`
 * or `DOM.getActiveWindow()` to obtain the correct window for the context you are in.
 */
export const $window = mainWindow;

export function isAuxiliaryWindow(obj: Window): obj is DevWindow {
	if (obj === mainWindow) {
		return false;
	}

	const candidate = obj as DevWindow | undefined;

	return typeof candidate?.tddevWindowId === 'number';
}

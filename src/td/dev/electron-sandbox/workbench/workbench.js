/*----------------------------------------------------------------------------------------------------
 *  Copyright (c) TinyDeskDev. All rights reserved.
 *  Licensed under the UNLICENSED License. See License.txt in the project root for license information.
 *---------------------------------------------------------------------------------------------------*/

// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../../../typings/require.d.ts" />

const information = document.getElementById('info')
information.innerText = `This app is using Chrome (v${window.versions.chrome()}), Node.js (v${versions.node()}), and Electron (v${versions.electron()})`

const func = async () => {
  const response = await globalThis.versions.ping()
  console.log(response) // prints out 'pong'
}

func();

(function () {
	'use strict';

  const bootstrapWindow = bootstrapWindowLib();

  // Load workbench main JS, CSS and NLS all in parallel. This is an
	// optimization to prevent a waterfall of loading to happen, because
	// we know for a fact that workbench.desktop.main will depend on
	// the related CSS and NLS counterparts.
	bootstrapWindow.load([
		'td/workbench/workbench.desktop.main',
		// 'td/nls!td/workbench/workbench.desktop.main',
		'td/css!td/workbench/workbench.desktop.main'
	],
		function (desktopMain, configuration) {

      // Mark start of workbench
			performance.mark('code/didLoadWorkbenchMain');

      return desktopMain.main(configuration)
    },
    {
			beforeRequire: function (windowConfig) {
				performance.mark('code/willLoadWorkbenchMain');

				// Code windows have a `vscodeWindowId` property to identify them
				Object.defineProperty(window, 'tddevWindowId', {
					get: () => windowConfig.windowId
				});

				// It looks like browsers only lazily enable
				// the <canvas> element when needed. Since we
				// leverage canvas elements in our code in many
				// locations, we try to help the browser to
				// initialize canvas when it is idle, right
				// before we wait for the scripts to be loaded.
				window.requestIdleCallback(() => {
					const canvas = document.createElement('canvas');
					const context = canvas.getContext('2d');
					context?.clearRect(0, 0, canvas.width, canvas.height);
					canvas.remove();
				}, { timeout: 50 });
			}
		}
  );

  function bootstrapWindowLib() {
		// @ts-ignore (defined in bootstrap-window.js)
		return window.MonacoBootstrapWindow;
	}
}());
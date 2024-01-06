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
		// 'vs/nls!vs/workbench/workbench.desktop.main',
		// 'vs/css!vs/workbench/workbench.desktop.main'
	],
		function (desktopMain, configuration) {

      // Mark start of workbench
			performance.mark('code/didLoadWorkbenchMain');

      return desktopMain.main()
    },
    {}
  );

  function bootstrapWindowLib() {
		// @ts-ignore (defined in bootstrap-window.js)
		return window.MonacoBootstrapWindow;
	}
}());
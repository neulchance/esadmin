/*----------------------------------------------------------------------------------------------------
 *  Copyright (c) TinyDeskDev. All rights reserved.
 *  Licensed under the UNLICENSED License. See License.txt in the project root for license information.
 *---------------------------------------------------------------------------------------------------*/

//@ts-check
'use strict';
console.log('Hello Electron 👋')
/**
 * @typedef {import('./td/base/common/product').IProductConfiguration} IProductConfiguration
 * @typedef {import('./td/platform/environment/common/argv').NativeParsedArgs} NativeParsedArgs
 */

const path = require('node:path')
const fs = require('fs')
const os = require('os')
const bootstrap = require('./bootstrap')
const bootstrapNode = require('./bootstrap-node');
const { getUserDataPath } = require('./td/platform/environment/node/userDataPath')
const { stripComments } = require('./td/base/common/stripComments')
const product = require('../product.json')
const { app, protocol, crashReporter, Menu, ipcMain } = require('electron')

const perf = require('./td/base/common/performance')

// Enable portable support
const portable = bootstrapNode.configurePortable(product);

// Enable ASAR support
bootstrap.enableASARSupport();

const args = parseCLIArgs();

// Set userData path before app 'ready' event
const userDataPath = getUserDataPath(args, product.nameShort ?? 'dev-oss-dev');
app.setPath('userData', userDataPath);

// Register custom schemes with privileges
protocol.registerSchemesAsPrivileged([
	{
		scheme: 'vscode-webview',
		privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, allowServiceWorkers: true, }
	},
	{
		scheme: 'vscode-file',
		privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true }
	}
]);

app.once('ready', function () {
  ipcMain.handle('ping', () => 'pong')

  onReady();
})

/**
 * Main startup routine
 */
function startup() {
	// Load main in AMD
	// perf.mark('code/willLoadMainBundle');
	require('./bootstrap-amd').load('td/dev/electron-main/main', () => {
		// perf.mark('code/didLoadMainBundle');
	});
}

async function onReady() {
	perf.mark('code/mainAppReady');

	try {
		startup();
	} catch (error) {
		console.error(error);
	}
}

/**
 * @returns {NativeParsedArgs}
 */
function parseCLIArgs() {
	const minimist = require('minimist');

	return minimist(process.argv, {
		string: [
			'user-data-dir',
			'locale',
			'js-flags',
			'crash-reporter-directory'
		],
		boolean: [
			'disable-chromium-sandbox',
		],
		default: {
			'sandbox': true
		},
		alias: {
			'no-sandbox': 'sandbox'
		}
	});
}

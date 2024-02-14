/*----------------------------------------------------------------------------------------------------
 *  Copyright (c) TinyDeskDev. All rights reserved.
 *  Licensed under the UNLICENSED License. See License.txt in the project root for license information.
 *---------------------------------------------------------------------------------------------------*/

//@ts-check
'use strict';

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
/** @type {Partial<IProductConfiguration>} */
const product = require('../product.json')
const { app, protocol, crashReporter, Menu, ipcMain } = require('electron')

const perf = require('./td/base/common/performance')

// Enable portable support
const portable = bootstrapNode.configurePortable(product);

// Enable ASAR support
bootstrap.enableASARSupport();

const args = parseCLIArgs();
// Configure static command line arguments
const argvConfig = configureCommandlineSwitchesSync(args);

// Set userData path before app 'ready' event
const userDataPath = getUserDataPath(args, product.nameShort ?? 'dev-oss-dev');
app.setPath('userData', userDataPath);

// Disable default menu (https://github.com/electron/electron/issues/35512)
// Menu.setApplicationMenu(null);

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

// Global app listeners
registerListeners();

app.once('ready', function () {
	if (args['trace']) {
		const contentTracing = require('electron').contentTracing;

		const traceOptions = {
			categoryFilter: args['trace-category-filter'] || '*',
			traceOptions: args['trace-options'] || 'record-until-full,enable-sampling'
		};

		contentTracing.startRecording(traceOptions).finally(() => onReady());
	} else {
		ipcMain.handle('ping', () => 'pong');
		onReady();
	}
})

/**
 * Main startup routine
 */
function startup() {
	// Load main in AMD
	perf.mark('code/willLoadMainBundle');
	require('./bootstrap-amd').load('td/dev/electron-main/main', () => {
		perf.mark('code/didLoadMainBundle');
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

/**
 * @param {NativeParsedArgs} cliArgs
 */
function configureCommandlineSwitchesSync(cliArgs) {

	// Read argv config
	const argvConfig = readArgvConfigSync();

	// TODO: upstream 에서는 'app.commandLine.appendSwitch'와 관련된 작업을 하지만
	// 일단은 패스.

	return argvConfig;
}

function readArgvConfigSync() {

	// Read or create the argv.json config file sync before app('ready')
	const argvConfigPath = getArgvConfigPath();
	let argvConfig;
	try {
		argvConfig = JSON.parse(stripComments(fs.readFileSync(argvConfigPath).toString()));
	} catch (error) {
		if (error && error.code === 'ENOENT') {
			createDefaultArgvConfigSync(argvConfigPath);
		} else {
			console.warn(`Unable to read argv.json configuration file in ${argvConfigPath}, falling back to defaults (${error})`);
		}
	}

	// Fallback to default
	if (!argvConfig) {
		argvConfig = {};
	}

	return argvConfig;
}

/**
 * @param {string} argvConfigPath
 */
function createDefaultArgvConfigSync(argvConfigPath) {
	try {

		// Ensure argv config parent exists
		const argvConfigPathDirname = path.dirname(argvConfigPath);
		if (!fs.existsSync(argvConfigPathDirname)) {
			fs.mkdirSync(argvConfigPathDirname);
		}

		// Default argv content
		const defaultArgvConfigContent = [
			'// This configuration file allows you to pass permanent command line arguments to VS Code.',
			'// Only a subset of arguments is currently supported to reduce the likelihood of breaking',
			'// the installation.',
			'//',
			'// PLEASE DO NOT CHANGE WITHOUT UNDERSTANDING THE IMPACT',
			'//',
			'// NOTE: Changing this file requires a restart of VS Code.',
			'{',
			'	// Use software rendering instead of hardware accelerated rendering.',
			'	// This can help in cases where you see rendering issues in VS Code.',
			'	// "disable-hardware-acceleration": true',
			'}'
		];

		// Create initial argv.json with default content
		fs.writeFileSync(argvConfigPath, defaultArgvConfigContent.join('\n'));
	} catch (error) {
		console.error(`Unable to create argv.json configuration file in ${argvConfigPath}, falling back to defaults (${error})`);
	}
}

function getArgvConfigPath() {
	const vscodePortable = process.env['VSCODE_PORTABLE'];
	if (vscodePortable) {
		return path.join(vscodePortable, 'argv.json');
	}

	let dataFolderName = product.dataFolderName;
	if (process.env['VSCODE_DEV']) {
		dataFolderName = `${dataFolderName}-dev`;
	}

	// @ts-ignore
	return path.join(os.homedir(), dataFolderName, 'argv.json');
}

function registerListeners() {

	/**
	 * macOS: when someone drops a file to the not-yet running VSCode, the open-file event fires even before
	 * the app-ready event. We listen very early for open-file and remember this upon startup as path to open.
	 *
	 * @type {string[]}
	 */
	const macOpenFiles = [];
	// @ts-ignore
	global['macOpenFiles'] = macOpenFiles;
	app.on('open-file', function (event, path) {
		macOpenFiles.push(path);
	});

	/**
	 * macOS: react to open-url requests.
	 *
	 * @type {string[]}
	 */
	const openUrls = [];
	const onOpenUrl =
		/**
		 * @param {{ preventDefault: () => void; }} event
		 * @param {string} url
		 */
		function (event, url) {
			event.preventDefault();

			openUrls.push(url);
		};

	app.on('will-finish-launching', function () {
		app.on('open-url', onOpenUrl);
	});

	// @ts-ignore
	global['getOpenUrls'] = function () {
		app.removeListener('open-url', onOpenUrl);

		return openUrls;
	};
}
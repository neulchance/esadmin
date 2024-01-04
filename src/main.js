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
const { getUserDataPath } = require('./td/platform/environment/node/userDataPath')
const { stripComments } = require('./td/base/common/stripComments')
const product = require('../product.json')
const { app, protocol, crashReporter, Menu, ipcMain } = require('electron')

const perf = require('./td/base/common/performance')
perf.mark('code/didStartMain')

const bootstrap = require('./bootstrap')
 
console.log('Hello Electron 👋')

const args = parseCLIArgs();
// Configure static command line arguments
const argvConfig = configureCommandlineSwitchesSync(args);
// Enable sandbox globally unless
// 1) disabled via command line using either
//    `--no-sandbox` or `--disable-chromium-sandbox` argument.
// 2) argv.json contains `disable-chromium-sandbox: true`.
if (args['sandbox'] &&
	!args['disable-chromium-sandbox'] &&
	!argvConfig['disable-chromium-sandbox']) {
	app.enableSandbox();
} else if (app.commandLine.hasSwitch('no-sandbox') &&
	!app.commandLine.hasSwitch('disable-gpu-sandbox')) {
	// Disable GPU sandbox whenever --no-sandbox is used.
	app.commandLine.appendSwitch('disable-gpu-sandbox');
} else {
	app.commandLine.appendSwitch('no-sandbox');
	app.commandLine.appendSwitch('disable-gpu-sandbox');
}

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
  // app.on('activate', () => {
  //   if (BrowserWindow.getAllWindows().length === 0) {
  //     createWindow()
  //   }
  // })
})

/**
 * Main startup routine
 */
function startup() {
	// nlsConfig._languagePackSupport = true;

	// process.env['VSCODE_NLS_CONFIG'] = JSON.stringify(nlsConfig);
	// process.env['VSCODE_CODE_CACHE_PATH'] = codeCachePath || '';

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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

/**
 * @param {NativeParsedArgs} cliArgs
 */
function configureCommandlineSwitchesSync(cliArgs) {
	const SUPPORTED_ELECTRON_SWITCHES = [

		// alias from us for --disable-gpu
		'disable-hardware-acceleration',

		// override for the color profile to use
		'force-color-profile'
	];

	if (process.platform === 'linux') {
		// Force enable screen readers on Linux via this flag
		SUPPORTED_ELECTRON_SWITCHES.push('force-renderer-accessibility');

		// override which password-store is used on Linux
		SUPPORTED_ELECTRON_SWITCHES.push('password-store');
	}

	const SUPPORTED_MAIN_PROCESS_SWITCHES = [

		// Persistently enable proposed api via argv.json: https://github.com/microsoft/vscode/issues/99775
		'enable-proposed-api',

		// Log level to use. Default is 'info'. Allowed values are 'error', 'warn', 'info', 'debug', 'trace', 'off'.
		'log-level',

		// Use an in-memory storage for secrets
		'use-inmemory-secretstorage'
	];

	// Read argv config
	const argvConfig = readArgvConfigSync();

	Object.keys(argvConfig).forEach(argvKey => {
		const argvValue = argvConfig[argvKey];

		// Append Electron flags to Electron
		if (SUPPORTED_ELECTRON_SWITCHES.indexOf(argvKey) !== -1) {

			if (
				// Color profile
				argvKey === 'force-color-profile' ||
				// Password store
				argvKey === 'password-store'
			) {
				if (argvValue) {
					app.commandLine.appendSwitch(argvKey, argvValue);
				}
			}

			// Others
			else if (argvValue === true || argvValue === 'true') {
				if (argvKey === 'disable-hardware-acceleration') {
					app.disableHardwareAcceleration(); // needs to be called explicitly
				} else {
					app.commandLine.appendSwitch(argvKey);
				}
			}
		}

		// Append main process flags to process.argv
		else if (SUPPORTED_MAIN_PROCESS_SWITCHES.indexOf(argvKey) !== -1) {
			switch (argvKey) {
				case 'enable-proposed-api':
					if (Array.isArray(argvValue)) {
						argvValue.forEach(id => id && typeof id === 'string' && process.argv.push('--enable-proposed-api', id));
					} else {
						console.error(`Unexpected value for \`enable-proposed-api\` in argv.json. Expected array of extension ids.`);
					}
					break;

				case 'log-level':
					if (typeof argvValue === 'string') {
						process.argv.push('--log', argvValue);
					} else if (Array.isArray(argvValue)) {
						for (const value of argvValue) {
							process.argv.push('--log', value);
						}
					}
					break;

				case 'use-inmemory-secretstorage':
					if (argvValue) {
						process.argv.push('--use-inmemory-secretstorage');
					}
					break;
			}
		}
	});

	// Following features are disabled from the runtime:
	// `CalculateNativeWinOcclusion` - Disable native window occlusion tracker (https://groups.google.com/a/chromium.org/g/embedder-dev/c/ZF3uHHyWLKw/m/VDN2hDXMAAAJ)
	const featuresToDisable =
		`CalculateNativeWinOcclusion,${app.commandLine.getSwitchValue('disable-features')}`;
	app.commandLine.appendSwitch('disable-features', featuresToDisable);

	// Support JS Flags
	const jsFlags = getJSFlags(cliArgs);
	if (jsFlags) {
		app.commandLine.appendSwitch('js-flags', jsFlags);
	}

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

/**
 * @param {NativeParsedArgs} cliArgs
 * @returns {string | null}
 */
function getJSFlags(cliArgs) {
	const jsFlags = [];

	// Add any existing JS flags we already got from the command line
	if (cliArgs['js-flags']) {
		jsFlags.push(cliArgs['js-flags']);
	}

	return jsFlags.length > 0 ? jsFlags.join(' ') : null;
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

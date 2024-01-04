const path = require('node:path')
const { app, protocol, crashReporter, Menu, ipcMain } = require('electron')

const perf = require('./td/base/common/performance')
perf.mark('code/didStartMain')

const bootstrap = require('./bootstrap')
 
console.log('Hello from Electron 👋👋👋')

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
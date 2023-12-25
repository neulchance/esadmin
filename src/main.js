const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')

const perf = require('./td/base/common/performance')
perf.mark('code/didStartMain')
 
console.log('Hello from Electron 👋')


const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })
  // win.loadURL('file://./index.html')
  win.loadURL('file:///Users/home/workspace/organizations/org-neulchance/with-electron/neulchan-tddev/index.html')
}

app.once('ready', function () {
  ipcMain.handle('ping', () => 'pong')
  createWindow()


  onReady();

  console.log('opoen?')
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
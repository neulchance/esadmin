const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')

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

app.whenReady().then(async () => {
  ipcMain.handle('ping', () => 'pong')
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
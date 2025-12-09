
const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')

// 1. 创建浏览器窗口的函数
function createWindow () {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      nodeIntegration: true, 
      contextIsolation: false, 
    }
  })

  win.loadFile(path.join(__dirname, 'dist/index.html'))
}

// 3. 应用程序准备就绪时创建窗口
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 4. 关闭所有窗口时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

Menu.setApplicationMenu(null); 
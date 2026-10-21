const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron')
const path = require('node:path')

let mainWindow = null

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
const devUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173'

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 980,
    minHeight: 640,
    title: 'Annapurna — Every household, accounted for.',
    backgroundColor: '#fbfdf7',
    show: false,
    icon: path.join(__dirname, '../public/icon-512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  })

  // Prevent flash of white during initial layout
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Open any target="_blank" or external URLs in user's OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isLocal = url.startsWith('file:') || (isDev && url.startsWith('http://localhost:5173'))
    if (!isLocal) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  if (isDev && process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(devUrl)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  setupApplicationMenu()
}

function setupApplicationMenu() {
  const isMac = process.platform === 'darwin'

  const template = [
    ...(isMac
      ? [
          {
            label: 'Annapurna',
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Ration Card',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.send('menu:new-card')
          },
        },
        {
          label: 'Print Household Sheet',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            mainWindow?.webContents.print()
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Find / Search',
          accelerator: 'CmdOrCtrl+K',
          click: () => {
            mainWindow?.webContents.send('menu:search')
          },
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Annapurna',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Annapurna',
              message: 'Annapurna — Every household, accounted for.',
              detail:
                'Version: 1.0.0\nDeveloped by: Aditya Chaudhari (https://aditya.teamparadox.in)\nOrganization: Team Paradox (https://teamparadox.in)\n\nA responsive, cross-platform, local-first ration card and household management application with optional Firebase synchronization.',
            })
          },
        },
        {
          label: 'Check for Updates...',
          click: () => {
            mainWindow?.webContents.send('menu:check-updates')
          },
        },
        { type: 'separator' },
        {
          label: 'Team Paradox Website',
          click: () => shell.openExternal('https://teamparadox.in'),
        },
        {
          label: 'Aditya Chaudhari Portfolio',
          click: () => shell.openExternal('https://aditya.teamparadox.in'),
        },
        {
          label: 'GitHub Repository',
          click: () => shell.openExternal('https://github.com/Byte-Craftsman-Alpha/Annapurna'),
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// IPC handlers for safe desktop interactions
ipcMain.handle('app:open-external', (_event, url) => {
  if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
    shell.openExternal(url)
    return true
  }
  return false
})

// Ensure single instance lock so multiple windows don't conflict
const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    createMainWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})


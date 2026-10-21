const { contextBridge, ipcRenderer } = require('electron')

// Expose safe desktop integration APIs to the renderer window
contextBridge.exposeInMainWorld('annapurnaDesktop', {
  isDesktop: true,
  platform: process.platform,
  version: process.env.npm_package_version || '1.0.0',
  send: (channel, data) => {
    const validChannels = ['toMain']
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },
  receive: (channel, func) => {
    const validChannels = ['fromMain', 'menu:new-card', 'menu:search', 'menu:check-updates']
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => func(...args))
    }
  },
  openExternal: (url) => {
    if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
      ipcRenderer.invoke('app:open-external', url)
    }
  },
})


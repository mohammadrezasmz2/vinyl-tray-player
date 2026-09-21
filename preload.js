'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vinyl', {
  getState: () => ipcRenderer.invoke('get-state'),
  listTracks: () => ipcRenderer.invoke('list-tracks'),
  trackMeta: (file) => ipcRenderer.invoke('track-meta', file),
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
  openCurrentFolder: () => ipcRenderer.invoke('open-current-folder'),
  hideWindow: () => ipcRenderer.send('hide-window'),
  onFolderChanged: (cb) => ipcRenderer.on('folder-changed', (_e, folder) => cb(folder)),
  getPendingFile: () => ipcRenderer.invoke('get-pending-file'),
  onPlayFile: (cb) => ipcRenderer.on('play-file', (_e, data) => cb(data)),
  pickBackground: () => ipcRenderer.invoke('pick-background'),
  clearBackground: () => ipcRenderer.invoke('clear-background'),
  pickTracks: () => ipcRenderer.invoke('pick-tracks'),
  setPinned: (v) => ipcRenderer.invoke('set-pinned', v),
  mediaUrl: (filePath) => 'media://local/' + encodeURIComponent(filePath)
});

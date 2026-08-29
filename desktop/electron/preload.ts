import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('photoSyncDesktop', {
  platform: process.platform,
  version: process.versions.electron,
  connectGoogle: () => ipcRenderer.invoke('photosync:connect-google'),
  syncNow: () => ipcRenderer.invoke('photosync:sync-now'),
  getStatus: () => ipcRenderer.invoke('photosync:status'),
  openDownloads: () => ipcRenderer.invoke('photosync:open-downloads'),
  onDownloaded: (callback: (event: {name: string; path: string}) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: {name: string; path: string}) => callback(payload);
    ipcRenderer.on('photosync:file-downloaded', handler);
    return () => ipcRenderer.removeListener('photosync:file-downloaded', handler);
  },
});

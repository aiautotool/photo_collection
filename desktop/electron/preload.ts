import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('photoSyncDesktop', {
  platform: process.platform,
  version: process.versions.electron,
  getStatus: () => ipcRenderer.invoke('photosync:status'),
  getTunnelStatus: () => ipcRenderer.invoke('photosync:tunnel-status'),
  listLocalMedia: () => ipcRenderer.invoke('photosync:list-local'),
  openLibrary: () => ipcRenderer.invoke('photosync:open-library'),
  addGoogleAccount: () => ipcRenderer.invoke('photosync:add-google'),
  retryCloud: () => ipcRenderer.invoke('photosync:retry-cloud'),
  onFileReceived: (callback: (event: { name: string; path: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: { name: string; path: string }) => callback(payload);
    ipcRenderer.on('photosync:file-received', handler);
    return () => ipcRenderer.removeListener('photosync:file-received', handler);
  },
  onStorageUpdated: (callback: (event: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: unknown) => callback(payload);
    ipcRenderer.on('photosync:storage-updated', handler);
    return () => ipcRenderer.removeListener('photosync:storage-updated', handler);
  },
  onTunnelState: (callback: (event: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: unknown) => callback(payload);
    ipcRenderer.on('photosync:tunnel-state', handler);
    return () => ipcRenderer.removeListener('photosync:tunnel-state', handler);
  },
});

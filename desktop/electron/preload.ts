import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('photoSyncDesktop', {
  platform: process.platform,
  version: process.versions.electron,
});

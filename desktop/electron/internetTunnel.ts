import 'dotenv/config';
import { app, BrowserWindow, ipcMain } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PhotoSyncTunnelClient, type TunnelIdentity } from './tunnelClient.js';

const RECEIVER_PORT = 43117;
const relayUrl = process.env.PHOTOSYNC_RELAY_URL || 'http://127.0.0.1:8787';
let client: PhotoSyncTunnelClient | null = null;

function stateDir(){ return path.join(app.getPath('userData'),'photosync-state'); }
function pairFile(){ return path.join(stateDir(),'pair-code.txt'); }

async function localPairCode(){
  return (await fs.readFile(pairFile(),'utf8')).trim();
}

async function ackRelay(relay: string, uploadId: string, identity: TunnelIdentity, skipped: boolean) {
  const response = await fetch(new URL(`/api/v1/ack/${encodeURIComponent(uploadId)}`, relay), {
    method: 'POST',
    headers: {
      'x-photosync-desktop-id': identity.desktopId,
      'x-photosync-host-secret': identity.hostSecret,
      'x-photosync-skipped': skipped ? '1' : '0',
    },
  });
  if (!response.ok) throw new Error(`Relay ACK ${response.status}`);
}

async function handleRelayUpload(uploadId: string, identity: TunnelIdentity, relay: string) {
  const response = await fetch(new URL(`/api/v1/pending/${encodeURIComponent(uploadId)}`, relay), {
    headers: {
      'x-photosync-desktop-id': identity.desktopId,
      'x-photosync-host-secret': identity.hostSecret,
    },
  });
  if (!response.ok || !response.body) throw new Error(`Relay download ${response.status}`);

  const pairToken = decodeURIComponent(response.headers.get('x-photosync-pair-token') || '');
  if (pairToken !== identity.pairToken) throw new Error('Rejected upload with invalid pairing token');

  const local = await fetch(`http://127.0.0.1:${RECEIVER_PORT}/api/v1/media`, {
    method: 'POST',
    headers: {
      'content-type': response.headers.get('content-type') || 'application/octet-stream',
      'content-length': response.headers.get('content-length') || '',
      'x-photosync-pair-code': await localPairCode(),
      'x-photosync-device-id': decodeURIComponent(response.headers.get('x-photosync-device-id') || 'unknown'),
      'x-photosync-asset-id': decodeURIComponent(response.headers.get('x-photosync-asset-id') || uploadId),
      'x-photosync-filename': response.headers.get('x-photosync-filename') || encodeURIComponent(`media-${Date.now()}`),
      'x-photosync-created-at': response.headers.get('x-photosync-created-at') || String(Date.now()),
    },
    body: response.body as any,
    duplex: 'half',
  } as any);

  if (local.status !== 208 && (local.status < 200 || local.status >= 300)) {
    throw new Error(`Desktop storage pipeline ${local.status}: ${await local.text()}`);
  }
  await ackRelay(relay, uploadId, identity, local.status === 208);
}

async function startInternetTunnel() {
  client = new PhotoSyncTunnelClient({
    stateDir: stateDir(),
    relayUrl,
    onUploadReady: async (uploadId, identity, relay) => {
      try {
        await handleRelayUpload(uploadId, identity, relay);
      } catch (error) {
        console.error('PhotoSync Internet tunnel upload failed', uploadId, error);
      }
    },
    onState: state => {
      for (const win of BrowserWindow.getAllWindows()) win.webContents.send('photosync:tunnel-state', state);
    },
  });
  await client.start();
}

ipcMain.handle('photosync:tunnel-status', async () => {
  if (!client) return { connected:false, relayUrl, desktopId:'', pairingPayload:'', lastError:'Tunnel not started' };
  return client.getState();
});

app.whenReady().then(() => void startInternetTunnel());
app.on('before-quit', () => client?.stop());

import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { OAuth2Client } from 'google-auth-library';
import {
  DRIVE_SCOPE,
  driveDownloadUrl,
  ensurePhotoSyncFolder,
  listPhotoSyncFiles,
} from '@photosync/google-drive';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OAUTH_PORT = 53682;
const REDIRECT_URI = `http://127.0.0.1:${OAUTH_PORT}/oauth2callback`;
let mainWindow: BrowserWindow | null = null;
let oauth: OAuth2Client | null = null;
let syncTimer: NodeJS.Timeout | null = null;
let lastSync: SyncStatus = { state: 'idle', downloaded: 0, skipped: 0 };

type SyncStatus = {
  state: 'idle' | 'connecting' | 'syncing' | 'error';
  email?: string;
  downloaded: number;
  skipped: number;
  message?: string;
  downloadDir?: string;
  lastRunAt?: string;
};

function tokenFile() {
  return path.join(app.getPath('userData'), 'google-token.json');
}

function downloadDir() {
  return path.join(app.getPath('pictures'), 'PhotoSync');
}

function oauthClient() {
  if (oauth) return oauth;
  const clientId = process.env.PHOTOSYNC_GOOGLE_DESKTOP_CLIENT_ID;
  const clientSecret = process.env.PHOTOSYNC_GOOGLE_DESKTOP_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Thiếu PHOTOSYNC_GOOGLE_DESKTOP_CLIENT_ID/CLIENT_SECRET');
  }
  oauth = new OAuth2Client(clientId, clientSecret, REDIRECT_URI);
  return oauth;
}

async function loadSavedToken() {
  try {
    const raw = await fs.readFile(tokenFile(), 'utf8');
    oauthClient().setCredentials(JSON.parse(raw));
    return true;
  } catch {
    return false;
  }
}

async function saveToken() {
  await fs.mkdir(path.dirname(tokenFile()), { recursive: true });
  await fs.writeFile(tokenFile(), JSON.stringify(oauthClient().credentials, null, 2), 'utf8');
}

async function accessToken(): Promise<string> {
  const token = await oauthClient().getAccessToken();
  if (!token.token) throw new Error('Không lấy được Google access token');
  return token.token;
}

async function connectGoogle(): Promise<SyncStatus> {
  lastSync = { ...lastSync, state: 'connecting', message: 'Đang mở Google...' };
  const client = oauthClient();
  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent select_account',
    scope: [DRIVE_SCOPE, 'openid', 'email', 'profile'],
  });

  await shell.openExternal(url);

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const incoming = new URL(req.url || '/', REDIRECT_URI);
        if (incoming.pathname !== '/oauth2callback') return;
        const code = incoming.searchParams.get('code');
        if (!code) throw new Error('Google không trả authorization code');
        const { tokens } = await client.getToken(code);
        client.setCredentials(tokens);
        await saveToken();
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h2>PhotoSync đã kết nối Google Drive.</h2><p>Bạn có thể đóng tab này.</p>');
        server.close();
        lastSync = { state: 'idle', downloaded: 0, skipped: 0, message: 'Đã kết nối Google Drive', downloadDir: downloadDir() };
        startAutoSync();
        resolve(lastSync);
      } catch (error) {
        server.close();
        lastSync = { state: 'error', downloaded: 0, skipped: 0, message: error instanceof Error ? error.message : String(error) };
        reject(error);
      }
    });
    server.listen(OAUTH_PORT, '127.0.0.1');
    server.on('error', reject);
  });
}

async function downloadDriveFile(token: string, fileId: string, destination: string) {
  const response = await fetch(driveDownloadUrl(fileId), { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok || !response.body) throw new Error(`Download Drive ${response.status}: ${await response.text()}`);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await pipeline(Readable.fromWeb(response.body as any), createWriteStream(destination));
}

async function runSync(): Promise<SyncStatus> {
  const hasToken = await loadSavedToken();
  if (!hasToken && !oauthClient().credentials.access_token) {
    return { state: 'idle', downloaded: 0, skipped: 0, message: 'Chưa kết nối Google Drive', downloadDir: downloadDir() };
  }

  lastSync = { ...lastSync, state: 'syncing', downloaded: 0, skipped: 0, message: 'Đang kiểm tra ảnh mới...', downloadDir: downloadDir() };
  try {
    const token = await accessToken();
    const folderId = await ensurePhotoSyncFolder(token);
    const files = await listPhotoSyncFiles(token, folderId);
    await fs.mkdir(downloadDir(), { recursive: true });
    const localNames = new Set(await fs.readdir(downloadDir()));
    let downloaded = 0;
    let skipped = 0;

    for (const file of files) {
      if (file.mimeType === 'application/vnd.google-apps.folder') continue;
      if (localNames.has(file.name)) {
        skipped += 1;
        continue;
      }
      const target = path.join(downloadDir(), file.name.replace(/[\\/:*?"<>|]/g, '_'));
      await downloadDriveFile(token, file.id, target);
      downloaded += 1;
      localNames.add(path.basename(target));
      mainWindow?.webContents.send('photosync:file-downloaded', { name: file.name, path: target });
    }

    lastSync = {
      state: 'idle',
      downloaded,
      skipped,
      message: downloaded ? `Đã tải ${downloaded} ảnh/video mới` : 'Đã đồng bộ',
      downloadDir: downloadDir(),
      lastRunAt: new Date().toISOString(),
    };
    return lastSync;
  } catch (error) {
    lastSync = { ...lastSync, state: 'error', message: error instanceof Error ? error.message : String(error) };
    return lastSync;
  }
}

function startAutoSync() {
  if (syncTimer) clearInterval(syncTimer);
  void runSync();
  syncTimer = setInterval(() => void runSync(), 30_000);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1500,
    height: 940,
    minWidth: 1040,
    minHeight: 700,
    backgroundColor: '#070a0f',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow = win;
  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  if (!app.isPackaged) win.loadURL(devUrl);
  else win.loadFile(path.join(__dirname, '../dist/index.html'));
}

ipcMain.handle('photosync:connect-google', () => connectGoogle());
ipcMain.handle('photosync:sync-now', () => runSync());
ipcMain.handle('photosync:status', async () => {
  const hasToken = await loadSavedToken();
  return { ...lastSync, connected: hasToken || Boolean(oauthClient().credentials.access_token), downloadDir: downloadDir() };
});
ipcMain.handle('photosync:open-downloads', () => shell.openPath(downloadDir()));

app.whenReady().then(async () => {
  createWindow();
  if (await loadSavedToken()) startAutoSync();
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow());
});
app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit());

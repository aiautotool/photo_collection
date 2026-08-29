import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { WebSocketServer, type WebSocket } from 'ws';

const PORT = Number(process.env.PORT || 8787);
const UPLOAD_TTL_MS = 30 * 60_000;
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 20 * 1024 ** 3);
const tempRoot = path.join(os.tmpdir(), 'photosync-relay');
await fsp.mkdir(tempRoot, { recursive: true });

type Host = { socket: WebSocket; hostSecret: string; connectedAt: number };
type Pending = {
  id: string;
  desktopId: string;
  pairToken: string;
  deviceId: string;
  assetId: string;
  filename: string;
  contentType: string;
  createdAt: string;
  size: number;
  tempPath: string;
  expiresAt: number;
  resolve?: (value: { status: number; body: unknown }) => void;
};

const hosts = new Map<string, Host>();
const pending = new Map<string, Pending>();

function json(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' });
  res.end(JSON.stringify(body));
}

function clean(value: string | undefined, fallback = '') {
  return (value || fallback).replace(/[\r\n]/g, '').slice(0, 2048);
}

async function deletePending(id: string) {
  const item = pending.get(id);
  if (!item) return;
  pending.delete(id);
  await fsp.rm(item.tempPath, { force: true }).catch(() => undefined);
}

setInterval(() => {
  const now = Date.now();
  for (const [id, item] of pending) {
    if (item.expiresAt < now) {
      item.resolve?.({ status: 504, body: { ok: false, error: 'Laptop did not receive upload before timeout' } });
      void deletePending(id);
    }
  }
}, 30_000).unref();

const server = http.createServer(async (req, res) => {
  try {
    if (!req.url) return json(res, 404, { ok: false });
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
        'access-control-allow-headers': '*',
      });
      return res.end();
    }
    if (req.method === 'GET' && url.pathname === '/health') {
      return json(res, 200, { ok: true, onlineDesktops: hosts.size, pendingUploads: pending.size });
    }
    if (req.method === 'GET' && url.pathname.startsWith('/api/v1/desktop/') && url.pathname.endsWith('/status')) {
      const desktopId = decodeURIComponent(url.pathname.split('/')[4] || '');
      return json(res, 200, { online: hosts.has(desktopId) });
    }
    if (req.method === 'POST' && url.pathname.startsWith('/api/v1/upload/')) {
      const desktopId = decodeURIComponent(url.pathname.split('/')[4] || '');
      const host = hosts.get(desktopId);
      if (!host || host.socket.readyState !== host.socket.OPEN) return json(res, 503, { ok: false, error: 'Laptop offline' });

      const size = Number(req.headers['content-length'] || 0);
      if (!Number.isFinite(size) || size <= 0 || size > MAX_UPLOAD_BYTES) return json(res, 413, { ok: false, error: 'Invalid or too large upload' });

      const id = crypto.randomUUID();
      const tempPath = path.join(tempRoot, `${id}.bin`);
      const file = fs.createWriteStream(tempPath, { flags: 'wx' });
      let written = 0;
      await new Promise<void>((resolve, reject) => {
        req.on('data', chunk => {
          written += chunk.length;
          if (written > MAX_UPLOAD_BYTES) {
            req.destroy(new Error('Upload too large'));
            return;
          }
        });
        req.pipe(file);
        file.on('finish', resolve);
        file.on('error', reject);
        req.on('error', reject);
      });

      const item: Pending = {
        id,
        desktopId,
        pairToken: clean(String(req.headers['x-photosync-pair-token'] || '')),
        deviceId: clean(String(req.headers['x-photosync-device-id'] || '')),
        assetId: clean(String(req.headers['x-photosync-asset-id'] || '')),
        filename: decodeURIComponent(clean(String(req.headers['x-photosync-filename'] || 'file.bin'))),
        contentType: clean(String(req.headers['content-type'] || 'application/octet-stream')),
        createdAt: clean(String(req.headers['x-photosync-created-at'] || Date.now())),
        size: written,
        tempPath,
        expiresAt: Date.now() + UPLOAD_TTL_MS,
      };
      pending.set(id, item);

      const result = await new Promise<{ status: number; body: unknown }>(resolve => {
        item.resolve = resolve;
        host.socket.send(JSON.stringify({
          type: 'upload.ready',
          upload: { id, deviceId: item.deviceId, assetId: item.assetId, filename: item.filename, contentType: item.contentType, createdAt: item.createdAt, size: item.size },
        }));
        setTimeout(() => resolve({ status: 504, body: { ok: false, error: 'Laptop receive timeout' } }), UPLOAD_TTL_MS).unref();
      });
      return json(res, result.status, result.body);
    }
    if (req.method === 'GET' && url.pathname.startsWith('/api/v1/pending/')) {
      const id = decodeURIComponent(url.pathname.split('/')[4] || '');
      const item = pending.get(id);
      if (!item) return json(res, 404, { ok: false });
      const desktopId = clean(String(req.headers['x-photosync-desktop-id'] || ''));
      const hostSecret = clean(String(req.headers['x-photosync-host-secret'] || ''));
      const host = hosts.get(desktopId);
      if (!host || host.hostSecret !== hostSecret || item.desktopId !== desktopId) return json(res, 401, { ok: false });
      const stat = await fsp.stat(item.tempPath);
      res.writeHead(200, {
        'content-type': item.contentType,
        'content-length': String(stat.size),
        'x-photosync-pair-token': encodeURIComponent(item.pairToken),
        'x-photosync-device-id': encodeURIComponent(item.deviceId),
        'x-photosync-asset-id': encodeURIComponent(item.assetId),
        'x-photosync-filename': encodeURIComponent(item.filename),
        'x-photosync-created-at': item.createdAt,
      });
      return fs.createReadStream(item.tempPath).pipe(res);
    }
    if (req.method === 'POST' && url.pathname.startsWith('/api/v1/ack/')) {
      const id = decodeURIComponent(url.pathname.split('/')[4] || '');
      const item = pending.get(id);
      if (!item) return json(res, 404, { ok: false });
      const desktopId = clean(String(req.headers['x-photosync-desktop-id'] || ''));
      const hostSecret = clean(String(req.headers['x-photosync-host-secret'] || ''));
      const host = hosts.get(desktopId);
      if (!host || host.hostSecret !== hostSecret || item.desktopId !== desktopId) return json(res, 401, { ok: false });
      const skipped = req.headers['x-photosync-skipped'] === '1';
      item.resolve?.({ status: skipped ? 208 : 201, body: { ok: true, skipped, uploadId: id } });
      await deletePending(id);
      return json(res, 200, { ok: true });
    }
    return json(res, 404, { ok: false, error: 'Not found' });
  } catch (error) {
    console.error(error);
    if (!res.headersSent) json(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
    else res.destroy();
  }
});

const wss = new WebSocketServer({ noServer: true });
server.on('upgrade', (req, socket, head) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (url.pathname !== '/api/v1/tunnel') return socket.destroy();
    const desktopId = clean(url.searchParams.get('desktopId') || '');
    const hostSecret = clean(url.searchParams.get('hostSecret') || '');
    if (!desktopId || !hostSecret) return socket.destroy();
    wss.handleUpgrade(req, socket, head, ws => {
      const old = hosts.get(desktopId);
      if (old && old.hostSecret !== hostSecret && old.socket.readyState === old.socket.OPEN) return ws.close(4001, 'desktop id already online');
      hosts.set(desktopId, { socket: ws, hostSecret, connectedAt: Date.now() });
      ws.send(JSON.stringify({ type: 'tunnel.ready', desktopId }));
      ws.on('close', () => {
        const current = hosts.get(desktopId);
        if (current?.socket === ws) hosts.delete(desktopId);
      });
    });
  } catch {
    socket.destroy();
  }
});

server.listen(PORT, '0.0.0.0', () => console.log(`PhotoSync relay listening on :${PORT}`));

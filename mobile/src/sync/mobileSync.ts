import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import type { PairedDesktop } from './pairing';

export type SyncProgress = {
  total: number;
  completed: number;
  skipped: number;
  failed: number;
  current?: string;
};

export async function requestPhotoLibrary() {
  const permission = await MediaLibrary.requestPermissionsAsync(false, ['photo', 'video']);
  if (!permission.granted) throw new Error('Bạn chưa cấp quyền truy cập thư viện ảnh.');
  return permission;
}

export async function loadDevicePhotos(limit = 300): Promise<MediaLibrary.Asset[]> {
  await requestPhotoLibrary();
  const result = await MediaLibrary.getAssetsAsync({
    first: limit,
    mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
    sortBy: [[MediaLibrary.SortBy.creationTime, false]],
  });
  return result.assets;
}

function mimeFor(asset: MediaLibrary.Asset): string {
  if (asset.mediaType === MediaLibrary.MediaType.video) return 'video/mp4';
  const ext = asset.filename.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

async function materializeAsset(asset: MediaLibrary.Asset): Promise<{ uri: string; size: number; temporary: boolean }> {
  const info = await MediaLibrary.getAssetInfoAsync(asset);
  const originalUri = info.localUri || info.uri || asset.uri;
  let uri = originalUri;
  let temporary = false;

  if (!uri.startsWith('file://')) {
    const cacheDir = `${FileSystem.cacheDirectory}photosync-send/`;
    await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
    uri = `${cacheDir}${asset.id.replace(/[^a-zA-Z0-9_-]/g, '_')}-${asset.filename}`;
    await FileSystem.copyAsync({ from: originalUri, to: uri });
    temporary = true;
  }

  const fsInfo = await FileSystem.getInfoAsync(uri);
  if (!fsInfo.exists || typeof fsInfo.size !== 'number') throw new Error(`Không đọc được ${asset.filename}`);
  return { uri, size: fsInfo.size, temporary };
}

function relayEndpoint(target: PairedDesktop, path: string) {
  return `${target.relayUrl.replace(/\/$/, '')}${path}`;
}

export async function pingLaptop(target: PairedDesktop) {
  const response = await fetch(relayEndpoint(target, `/api/v1/desktop/${encodeURIComponent(target.desktopId)}/status`));
  if (!response.ok) throw new Error(`Relay trả lỗi ${response.status}`);
  const data = await response.json() as { online: boolean };
  if (!data.online) throw new Error('Laptop đang offline');
  return data;
}

export async function syncAssetsToLaptop(
  target: PairedDesktop,
  assets: MediaLibrary.Asset[],
  onProgress?: (progress: SyncProgress) => void,
): Promise<SyncProgress> {
  await pingLaptop(target);
  const progress: SyncProgress = { total: assets.length, completed: 0, skipped: 0, failed: 0 };

  for (const asset of [...assets].reverse()) {
    progress.current = asset.filename;
    onProgress?.({ ...progress });
    let local: Awaited<ReturnType<typeof materializeAsset>> | null = null;
    try {
      local = await materializeAsset(asset);
      const result = await FileSystem.uploadAsync(
        relayEndpoint(target, `/api/v1/upload/${encodeURIComponent(target.desktopId)}`),
        local.uri,
        {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: {
            'content-type': mimeFor(asset),
            'content-length': String(local.size),
            'x-photosync-pair-token': target.pairToken,
            'x-photosync-device-id': target.deviceId,
            'x-photosync-asset-id': asset.id,
            'x-photosync-filename': encodeURIComponent(asset.filename),
            'x-photosync-created-at': String(asset.creationTime),
            'x-photosync-media-type': asset.mediaType,
          },
        },
      );
      if (result.status === 208) progress.skipped += 1;
      else if (result.status >= 200 && result.status < 300) progress.completed += 1;
      else if (result.status === 503) throw new Error('Laptop đang offline');
      else throw new Error(`Tunnel ${result.status}: ${result.body}`);
    } catch (error) {
      console.error('PhotoSync mobile -> Internet tunnel -> laptop failed', asset.filename, error);
      progress.failed += 1;
    } finally {
      if (local?.temporary) await FileSystem.deleteAsync(local.uri, { idempotent: true }).catch(() => undefined);
      onProgress?.({ ...progress });
    }
  }

  progress.current = undefined;
  onProgress?.({ ...progress });
  return progress;
}

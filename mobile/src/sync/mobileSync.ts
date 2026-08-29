import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import {
  DRIVE_SCOPE,
  createResumableUploadSession,
  ensurePhotoSyncFolder,
  listPhotoSyncFiles,
} from '@photosync/google-drive';

export type BackupProgress = {
  total: number;
  completed: number;
  skipped: number;
  failed: number;
  current?: string;
};

let configured = false;

export function configureGoogleSignIn() {
  if (configured) return;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) {
    throw new Error('Thiếu EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
  }
  GoogleSignin.configure({
    webClientId,
    scopes: [DRIVE_SCOPE],
    offlineAccess: true,
    forceCodeForRefreshToken: true,
  });
  configured = true;
}

export async function signInGoogle() {
  configureGoogleSignIn();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true }).catch(() => undefined);
  const result = await GoogleSignin.signIn();
  const tokens = await GoogleSignin.getTokens();
  return {
    accessToken: tokens.accessToken,
    user: result.data?.user ?? null,
  };
}

export async function currentGoogleAccessToken(): Promise<string | null> {
  configureGoogleSignIn();
  try {
    const signed = await GoogleSignin.signInSilently();
    if (!signed.data) return null;
    return (await GoogleSignin.getTokens()).accessToken;
  } catch {
    return null;
  }
}

export async function requestPhotoLibrary() {
  const permission = await MediaLibrary.requestPermissionsAsync(false, ['photo', 'video']);
  if (!permission.granted) throw new Error('Bạn chưa cấp quyền truy cập thư viện ảnh.');
  return permission;
}

export async function loadDevicePhotos(limit = 120): Promise<MediaLibrary.Asset[]> {
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
  return 'image/jpeg';
}

async function materializeAsset(asset: MediaLibrary.Asset): Promise<{ uri: string; size: number; temporary: boolean }> {
  const info = await MediaLibrary.getAssetInfoAsync(asset);
  const originalUri = info.localUri || info.uri || asset.uri;
  let uri = originalUri;
  let temporary = false;

  // Drive upload requires a file:// URI. iOS media library can return ph://.
  if (!uri.startsWith('file://')) {
    const cacheDir = `${FileSystem.cacheDirectory}photosync-upload/`;
    await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
    uri = `${cacheDir}${asset.id.replace(/[^a-zA-Z0-9_-]/g, '_')}-${asset.filename}`;
    await FileSystem.copyAsync({ from: originalUri, to: uri });
    temporary = true;
  }

  const fsInfo = await FileSystem.getInfoAsync(uri);
  if (!fsInfo.exists || typeof fsInfo.size !== 'number') throw new Error(`Không đọc được file ${asset.filename}`);
  return { uri, size: fsInfo.size, temporary };
}

export async function backupAssetsToDrive(
  accessToken: string,
  assets: MediaLibrary.Asset[],
  onProgress?: (progress: BackupProgress) => void,
): Promise<BackupProgress> {
  const folderId = await ensurePhotoSyncFolder(accessToken);
  const remote = await listPhotoSyncFiles(accessToken, folderId);
  const remoteNames = new Set(remote.map(file => file.name));
  const progress: BackupProgress = { total: assets.length, completed: 0, skipped: 0, failed: 0 };

  for (const asset of assets) {
    progress.current = asset.filename;
    onProgress?.({ ...progress });

    if (remoteNames.has(asset.filename)) {
      progress.skipped += 1;
      onProgress?.({ ...progress });
      continue;
    }

    let materialized: Awaited<ReturnType<typeof materializeAsset>> | null = null;
    try {
      materialized = await materializeAsset(asset);
      const mimeType = mimeFor(asset);
      const sessionUri = await createResumableUploadSession(accessToken, {
        name: asset.filename,
        mimeType,
        sizeBytes: materialized.size,
        folderId,
        appProperties: {
          photosyncAssetId: asset.id,
          photosyncCreatedAt: String(asset.creationTime),
        },
      });

      const uploaded = await FileSystem.uploadAsync(sessionUri, materialized.uri, {
        httpMethod: 'PUT',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: { 'Content-Type': mimeType },
      });
      if (uploaded.status < 200 || uploaded.status >= 300) {
        throw new Error(`Upload ${uploaded.status}: ${uploaded.body}`);
      }
      remoteNames.add(asset.filename);
      progress.completed += 1;
    } catch (error) {
      console.error('PhotoSync upload failed', asset.filename, error);
      progress.failed += 1;
    } finally {
      if (materialized?.temporary) {
        await FileSystem.deleteAsync(materialized.uri, { idempotent: true }).catch(() => undefined);
      }
      onProgress?.({ ...progress });
    }
  }

  progress.current = undefined;
  onProgress?.({ ...progress });
  return progress;
}

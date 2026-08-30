import * as FileSystem from 'expo-file-system/legacy';

const LEDGER = `${FileSystem.documentDirectory}photosync-synced-assets.json`;
const FAILED_LEDGER = `${FileSystem.documentDirectory}photosync-failed-assets.json`;
let cache: Set<string> | null = null;
let failedCache: Record<string, string> | null = null;

export async function loadSyncedAssetIds() {
  if (cache) return new Set(cache);
  try {
    const values = JSON.parse(await FileSystem.readAsStringAsync(LEDGER));
    cache = new Set(Array.isArray(values) ? values.filter(x => typeof x === 'string') : []);
  } catch { cache = new Set(); }
  return new Set(cache);
}

export async function markAssetSynced(assetId:string) {
  const values = await loadSyncedAssetIds();
  values.add(assetId);
  cache = values;
  await FileSystem.writeAsStringAsync(LEDGER, JSON.stringify([...values]));
}

export async function loadFailedAssets() {
  if (failedCache) return { ...failedCache };
  try {
    const values = JSON.parse(await FileSystem.readAsStringAsync(FAILED_LEDGER));
    failedCache = values && typeof values === 'object' && !Array.isArray(values) ? values : {};
  } catch { failedCache = {}; }
  return { ...failedCache };
}

export async function markAssetFailed(assetId:string, message:string) {
  const values = await loadFailedAssets();
  values[assetId] = message;
  failedCache = values;
  await FileSystem.writeAsStringAsync(FAILED_LEDGER, JSON.stringify(values));
}

export async function clearAssetFailed(assetId:string) {
  const values = await loadFailedAssets();
  if (!(assetId in values)) return;
  delete values[assetId];
  failedCache = values;
  await FileSystem.writeAsStringAsync(FAILED_LEDGER, JSON.stringify(values));
}

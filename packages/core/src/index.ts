export const GIB = 1024 ** 3;
export const APP_CAP_BYTES = 10 * GIB;
export const RESERVE_BYTES = 100 * 1024 ** 2;

export type StorageAccount = {
  id: string;
  email: string;
  appUsedBytes: number;
  providerFreeBytes: number;
  status?: 'READY' | 'NEAR_LIMIT' | 'FULL_FOR_BACKUP' | 'INSUFFICIENT_RESERVE';
};

export type MediaAsset = {
  id: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
  localUri?: string;
  remoteFileId?: string;
  accountId?: string;
};

export function safeAvailable(account: StorageAccount): number {
  return Math.max(
    0,
    Math.min(
      APP_CAP_BYTES - account.appUsedBytes,
      account.providerFreeBytes - RESERVE_BYTES,
    ),
  );
}

export function chooseAccount(accounts: StorageAccount[], fileSize: number): StorageAccount | null {
  return accounts
    .map(account => ({ account, available: safeAvailable(account) }))
    .filter(item => item.available >= fileSize)
    .sort((a, b) => b.available - a.available)[0]?.account ?? null;
}

export function formatGiB(bytes: number): string {
  return `${(bytes / GIB).toFixed(1)} GB`;
}

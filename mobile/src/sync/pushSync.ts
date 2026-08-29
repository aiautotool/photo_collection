import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import type { PairedDesktop } from './pairing';
import { loadPairedDesktop } from './pairing';
import { runPairedSync } from './backgroundSync';

const TASK = 'photosync-push-sync-v1';

TaskManager.defineTask(TASK, async ({ data }) => {
  try {
    const payload = data as any;
    const type = payload?.data?.type || payload?.type;
    if (type === 'photosync.desktop-online') await runPairedSync();
  } catch {}
});

export async function registerPushSyncTask() {
  await Notifications.registerTaskAsync(TASK).catch(() => undefined);
}

export async function registerPairingForPush(target?: PairedDesktop | null) {
  const paired = target ?? await loadPairedDesktop();
  if (!paired) return false;
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId) return false;

  let permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') return false;

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  const response = await fetch(`${paired.relayUrl.replace(/\/$/, '')}/api/v1/pair/${encodeURIComponent(paired.desktopId)}/push`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      expoPushToken: token.data,
      pairToken: paired.pairToken,
      deviceId: paired.deviceId,
    }),
  });
  return response.ok;
}

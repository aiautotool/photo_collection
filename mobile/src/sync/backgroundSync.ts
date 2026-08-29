import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { loadPairedDesktop } from './pairing';
import { loadDevicePhotos, pingLaptop, syncAssetsToLaptop } from './mobileSync';

const TASK = 'photosync-background-sync-v1';

export async function runPairedSync() {
  const target = await loadPairedDesktop();
  if (!target) return false;
  await pingLaptop(target);
  const assets = await loadDevicePhotos(300);
  await syncAssetsToLaptop(target, assets);
  return true;
}

TaskManager.defineTask(TASK, async () => {
  try { await runPairedSync(); } catch {}
  return BackgroundTask.BackgroundTaskResult.Success;
});

export async function registerBackgroundSync() {
  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) return false;
  await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 15 });
  return true;
}

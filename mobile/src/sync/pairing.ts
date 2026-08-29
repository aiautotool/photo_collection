import * as SecureStore from 'expo-secure-store';

export type PairedDesktop = {
  v: 1;
  relayUrl: string;
  desktopId: string;
  pairToken: string;
  deviceId: string;
};

const KEY = 'photosync.paired-desktop.v1';

function normalizeRelayUrl(value: string) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Relay URL không hợp lệ');
  return url.toString().replace(/\/$/, '');
}

function newDeviceId() {
  return `phone_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export function parsePairingQr(raw: string): Omit<PairedDesktop, 'deviceId'> {
  let parsed: any;
  try { parsed = JSON.parse(raw); } catch { throw new Error('QR không phải PhotoSync pairing QR'); }
  if (parsed?.v !== 1 || !parsed?.relayUrl || !parsed?.desktopId || !parsed?.pairToken) throw new Error('QR PhotoSync không hợp lệ');
  return {
    v: 1,
    relayUrl: normalizeRelayUrl(String(parsed.relayUrl)),
    desktopId: String(parsed.desktopId),
    pairToken: String(parsed.pairToken),
  };
}

export async function savePairedDesktop(rawQr: string): Promise<PairedDesktop> {
  const parsed = parsePairingQr(rawQr);
  const existing = await loadPairedDesktop();
  const target: PairedDesktop = {
    ...parsed,
    deviceId: existing?.deviceId || newDeviceId(),
  };
  await SecureStore.setItemAsync(KEY, JSON.stringify(target), { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });
  return target;
}

export async function loadPairedDesktop(): Promise<PairedDesktop | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as PairedDesktop; } catch { return null; }
}

export async function forgetPairedDesktop() {
  await SecureStore.deleteItemAsync(KEY);
}

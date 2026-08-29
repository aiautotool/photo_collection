# PhotoSync Suite

Photo/video backup and management for **iOS + Android + Windows + macOS** with Google Drive as the cloud storage layer.

## Stack: TypeScript only
- `mobile/` — React Native + Expo (iOS/Android)
- `desktop/` — React + Electron (Windows/macOS)
- `packages/core/` — shared quota/media logic
- `packages/google-drive/` — shared Google Drive API client
- `docs/` — BRD, FRS, architecture, security, setup and test plan
- `testcases/` — QA cases

## Real sync path implemented

```text
Phone Photos / MediaStore
        ↓
PhotoSync Mobile
        ↓ Google Drive resumable upload
Google Drive / PhotoSync
        ↓ automatic poll every 30 seconds
PhotoSync Desktop
        ↓
Pictures / PhotoSync
        ↓
Desktop gallery
```

Mobile now reads the real device media library instead of demo image URLs. Desktop renders media actually downloaded into `Pictures/PhotoSync` instead of demo image URLs.

## Storage safety rule
Every Google account has a **10 GiB PhotoSync hard cap** and must keep a **5 GiB reserve**. Before each real upload PhotoSync reads Drive quota and the size already used by files in the PhotoSync folder.

```ts
safeAvailable = min(
  10 GiB - appUsed,
  providerFree - 5 GiB,
)
```

If the next file is larger than `safeAvailable`, that upload is blocked.

## Install
Requires Node.js 22+.

```bash
npm install
```

## Configure real Google login
Follow:

```text
docs/RUN_REAL_SYNC.md
```

Templates:

```text
mobile/.env.example
desktop/.env.example
```

## Mobile
Google Sign-In is a native module, so use an Expo development build rather than Expo Go.

```bash
cp mobile/.env.example mobile/.env
cd mobile
npx expo prebuild --clean
npm run android
# or on macOS
npm run ios
```

User flow: allow Photos permission → connect Google → tap **Sao lưu ngay**.

## Desktop

```bash
cp desktop/.env.example desktop/.env
npm run desktop
```

User flow: click **Kết nối Google Drive** → sign into the same Gmail → PhotoSync automatically checks Drive every 30 seconds and downloads new media to `Pictures/PhotoSync`.

## Test

```bash
npm test
npm run typecheck
npm run build
```

## UI direction
- Mobile: Google Photos-inspired real device gallery/search/library.
- Desktop: Synology Photos-inspired sidebar/gallery/sync-control layout.
- Storage backend: Google Drive instead of NAS disks.

## Current v0.3 limitation
The working real sync path currently uses **one connected Gmail at a time**. The multi-account quota allocator exists in `@photosync/core`; persisting and refreshing several Google OAuth identities simultaneously is the next implementation step for the full multi-Gmail pool.

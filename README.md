# PhotoSync Suite

Photo/video backup and management for **iOS + Android + Windows + macOS**, using multiple Google Drive accounts as the storage pool.

## Stack: one language only
Everything is written in **TypeScript**.

- `mobile/` — React Native + Expo (iOS/Android)
- `desktop/` — React + Electron (Windows/macOS)
- `packages/core/` — shared sync/storage/media logic
- `docs/` — BRD, FRS, architecture, security, API and test plan
- `testcases/` — QA cases

## Non-negotiable storage policy
Every Google account has a **10 GiB PhotoSync hard cap** and must keep a **5 GiB reserve**. A file is never split across accounts.

```ts
safeAvailable = min(
  10 GiB - appUsed,
  providerFree - 5 GiB,
)
```

If a file does not fit safely, PhotoSync automatically selects another Google account.

## Install
Requires Node.js 22+.

```bash
npm install
```

## Run mobile
```bash
npm run mobile
```
Then press `a` for Android or `i` for iOS from Expo CLI, or use an Expo development build.

## Run desktop
```bash
npm run desktop
```
Electron opens the React desktop UI for Windows/macOS.

## Test
```bash
npm test
npm run typecheck
```

## Google login
See `docs/GOOGLE_LOGIN_SETUP.md`.

User flow is intentionally simple:

1. Install PhotoSync.
2. Tap/click **Thêm tài khoản Google**.
3. Select a Google account and approve Drive access.
4. PhotoSync stores the token in the platform secure store and starts backup.

Do not commit OAuth secrets or refresh tokens to Git.

## UI direction
- Mobile: Google Photos-inspired photo timeline/search/library experience.
- Desktop: Synology Photos-inspired gallery and storage management experience.
- Storage backend: Google Drive accounts instead of a NAS hard disk.

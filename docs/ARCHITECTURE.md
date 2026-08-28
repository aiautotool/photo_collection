# Architecture

Mobile is Flutter for iOS/Android. Desktop is Tauri 2 + React/TypeScript for Windows/macOS, with Rust sync/domain logic. Google Drive is accessed through a provider abstraction so OneDrive/S3/NAS can be added later.

## Domain entities
- MediaAsset: immutable logical media item.
- SyncJob: durable upload/download state machine.
- StorageAccount: provider account plus quota snapshot and PhotoSync app usage.
- StorageObject: media -> provider/account/remote file mapping.
- Device: random application device identity.

## Capacity formula
`APP_CAP = 10 GiB`
`RESERVE = 5 GiB`
`appHeadroom = max(0, APP_CAP - appUsed)`
`reserveHeadroom = max(0, providerFree - RESERVE)`
`safeAvailable = min(appHeadroom, reserveHeadroom)`
`eligible(file) = safeAvailable >= file.size`

A file is never split across accounts. Quota math uses bytes/GiB (1024^3).

## Sync design
1. Discover media.
2. Read metadata and compute SHA-256.
3. Deduplicate by SHA-256 + size.
4. Persist queue job.
5. Refresh account quota if stale.
6. Allocate one safe account.
7. Start/resume provider upload.
8. Verify provider result/checksum.
9. Persist StorageObject and mark media protected.
10. Desktop reads changes and mirrors to local disk with hash verification.

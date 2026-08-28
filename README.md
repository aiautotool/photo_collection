# PhotoSync Suite

Cross-platform photo/video backup for **iOS + Android + Windows + macOS** with multi-account Google Drive pooling.

## Non-negotiable storage policy
Every Google account has a **10 GiB PhotoSync hard cap** and must keep a **5 GiB reserve**. A file is never split across accounts. Allocation requires both `appUsed + fileSize <= 10 GiB` and `providerFree - fileSize >= 5 GiB`.

## Layout
- `mobile/` Flutter iOS + Android
- `desktop/` Tauri + React Windows + macOS
- `docs/` BRD, FRS, architecture, security, API and test plan
- `testcases/` QA cases

## Mobile
```bash
cd mobile
flutter pub get
flutter test
flutter run
```

## Desktop
```bash
cd desktop
npm install
npm run tauri dev
cd src-tauri && cargo test
```

## Production notes
Configure Google OAuth/Drive API credentials outside Git. Refresh tokens must be stored in OS secure storage. Real app signing, store entitlements and production provider credentials are intentionally not committed.

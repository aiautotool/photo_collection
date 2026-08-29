# PhotoSync Suite

Photo/video sync and storage management for **iOS + Android + Windows + macOS**.

## Architecture

The laptop is the hub. Mobile never talks to Google Drive directly.

```text
Phone Photos / MediaStore
        ↓ LAN sync
PhotoSync Mobile
        ↓
PhotoSync Laptop Receiver :43117
        ↓
Local Library (Pictures/PhotoSync/YYYY/MM)
        ↓
Storage Manager
   ├── Local copy
   ├── Google Drive account 1
   ├── Google Drive account 2
   └── Google Drive account N
```

## Stack: TypeScript only
- `mobile/` — React Native + Expo
- `desktop/` — React + Electron
- `packages/core/` — shared media/quota/storage allocator logic
- `packages/google-drive/` — Google Drive API client used by desktop only

## Mobile responsibilities
- Read real Photos / MediaStore assets.
- Pair with one PhotoSync laptop using its LAN address + 6-digit pair code.
- Send the original photo/video directly to the laptop.
- Retry and skip media already received by that laptop.
- No Google OAuth, no Google Drive quota, no storage allocation logic.

## Laptop responsibilities
- Run the PhotoSync Receiver on TCP port `43117`.
- Store received originals in `Pictures/PhotoSync/YYYY/MM`.
- Index each item by `deviceId + assetId` and calculate SHA-256 after receipt.
- Show the unified local gallery.
- Manage Google OAuth accounts.
- Distribute local media to eligible Google Drive accounts.

## Drive safety rule
For every Google account:

```text
appUsed + incomingFile <= 10 GiB
providerFreeAfterUpload >= 5 GiB
```

The desktop Storage Manager selects an eligible account using `@photosync/core`. If no account has safe capacity, the file remains safe locally and cloud state becomes `BLOCKED`.

## Run
Requires Node.js 22+.

```bash
npm install
npm run desktop
```

On the laptop, PhotoSync shows:
- receiver LAN address, e.g. `http://192.168.1.20:43117`
- 6-digit pairing code
- local library status
- Google Drive pool status

Then build/run mobile:

```bash
cd mobile
npx expo prebuild --clean
npm run android
# or on macOS
npm run ios
```

In mobile → **Máy tính**:
1. Enter the receiver address shown by laptop.
2. Enter the 6-digit pairing code.
3. Tap **Kết nối laptop**.
4. Tap **Đồng bộ** from the Photos screen.

## Google Drive
Google login is configured only on desktop. Copy `desktop/.env.example` to `desktop/.env`, set the Desktop OAuth client, then use **Thêm tài khoản Google** in the laptop app. More than one token/account can be stored by the desktop app.

## Security note
The current LAN receiver uses HTTP plus a random pairing code and is intended for the user's trusted local network. Production hardening should add per-device keys and TLS/Noise-style encrypted transport before enabling sync over untrusted networks.

## Test

```bash
npm test
npm run typecheck
npm run build
```

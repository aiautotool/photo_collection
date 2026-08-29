# Chạy sync thật: Mobile → Google Drive → Laptop

PhotoSync dùng **cùng một Google Cloud project** cho mobile và desktop. Người dùng cuối chỉ bấm đăng nhập Google; các Client ID chỉ cấu hình một lần khi build.

## 1. Google Cloud (làm một lần)

1. Tạo Google Cloud project.
2. Enable **Google Drive API**.
3. OAuth consent screen: thêm scope `https://www.googleapis.com/auth/drive.file`.
4. Tạo các OAuth Client ID:
   - **Web application**: dùng làm `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
   - **Android**: package `com.aiautotool.photosync`, thêm SHA-1 debug/release.
   - **iOS**: bundle id `com.aiautotool.photosync`.
   - **Desktop app**: dùng cho Windows/macOS Electron.

## 2. Mobile

```bash
cp mobile/.env.example mobile/.env
```

Điền 3 giá trị trong `mobile/.env`:

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_IOS_REVERSED_CLIENT_ID=...
```

Sau đó:

```bash
npm install
cd mobile
npx expo prebuild --clean
npm run android
# hoặc trên macOS
npm run ios
```

> Google Sign-In dùng native module nên không chạy bằng Expo Go. Dùng development build (`expo run:android` / `expo run:ios`).

Trong app:
1. Cho phép truy cập Photos/Media Library.
2. Mở **Thư viện** → **Kết nối Google Drive**.
3. Bấm **Sao lưu ngay**.
4. File được upload vào thư mục `PhotoSync` trên Google Drive.

## 3. Desktop Windows/macOS

```bash
cp desktop/.env.example desktop/.env
```

Điền Client ID/Secret của OAuth client loại **Desktop app**:

```env
PHOTOSYNC_GOOGLE_DESKTOP_CLIENT_ID=...
PHOTOSYNC_GOOGLE_DESKTOP_CLIENT_SECRET=...
```

Chạy:

```bash
npm install
npm run desktop
```

Trong app desktop:
1. Bấm **Kết nối Google Drive**.
2. Đăng nhập **cùng Gmail** đã dùng trên mobile.
3. App tự quét Drive mỗi 30 giây.
4. File mới được tải về:
   - Windows: `Pictures\\PhotoSync`
   - macOS: `~/Pictures/PhotoSync`
5. Gallery desktop đọc trực tiếp các file vừa tải về.

## 4. Luồng sync

```text
Photos / MediaStore
       ↓
PhotoSync Mobile
       ↓ resumable upload
Google Drive / PhotoSync
       ↓ poll 30 giây
PhotoSync Desktop
       ↓
Pictures / PhotoSync
```

## 5. Rule dung lượng

Trước mỗi upload, mobile đọc Google Drive quota và tổng dung lượng file trong thư mục PhotoSync:

```text
appUsed + file <= 10 GB
providerFree - file >= 5 GB
```

Nếu không thỏa một trong hai điều kiện thì file không được upload.

## Hiện trạng v0.3

- Sync thật chạy theo **một Gmail đang kết nối** từ mobile sang desktop.
- Engine quota 10GB/5GB đã chạy trên upload thật.
- Multi-Gmail allocator đã có trong `@photosync/core`, nhưng luồng OAuth lưu đồng thời nhiều Gmail vẫn là bước tiếp theo để hoàn thiện storage pool nhiều tài khoản.

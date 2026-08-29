# PhotoSync real sync: Mobile → Internet Tunnel → Laptop

## Kiến trúc

```text
Phone Photos / MediaStore
        ↓
PhotoSync Mobile
        ↓ HTTPS upload
PhotoSync Relay / Reverse Tunnel
        ↓ WSS notification + streamed download
PhotoSync Desktop
        ↓
Pictures/PhotoSync/YYYY/MM
        ↓
Storage Manager
        ├── Local
        └── Google Drive 1..N
```

Mobile không đăng nhập Google Drive. Laptop là trung tâm quản lý storage.

## 1. Chạy relay

```bash
npm install
npm run relay
```

Mặc định relay nghe `:8787`.

### Expose relay bằng Cloudflare Tunnel

Development nhanh:

```bash
cloudflared tunnel --url http://127.0.0.1:8787
```

Production nên dùng **named Cloudflare Tunnel + hostname cố định**, ví dụ:

```text
https://relay.photosync.example.com
```

Cloudflare Tunnel dùng kết nối outbound-only nên relay server không cần mở inbound port trực tiếp.

## 2. Desktop

```bash
cp desktop/.env.example desktop/.env
```

Đặt relay URL cố định:

```env
PHOTOSYNC_RELAY_URL=https://relay.photosync.example.com
```

Nếu dùng Google Drive pool, thêm OAuth Desktop Client:

```env
PHOTOSYNC_GOOGLE_DESKTOP_CLIENT_ID=...
PHOTOSYNC_GOOGLE_DESKTOP_CLIENT_SECRET=...
```

Chạy:

```bash
npm run desktop
```

Desktop tự tạo và lưu vĩnh viễn:

```text
desktopId
pairToken
hostSecret
```

Sau đó desktop kết nối outbound WSS tới relay và UI hiển thị QR.

## 3. Mobile pairing

Mobile mở tab **Máy tính** → **Quét QR từ laptop**.

QR chứa:

```json
{
  "v": 1,
  "relayUrl": "https://relay.photosync.example.com",
  "desktopId": "desk_...",
  "pairToken": "..."
}
```

Mobile lưu pairing bằng Expo SecureStore/Keychain. QR chỉ cần quét một lần.

## 4. Các lần sau

```text
Laptop bật
  ↓
Desktop tự nối WSS tới relay
  ↓
Relay đánh dấu desktop online

Mobile mở / trở lại foreground / background task được OS chạy
  ↓
Kiểm tra desktop online
  ↓
Tự gửi ảnh chưa có
  ↓
Relay giữ request tới khi laptop ACK
  ↓
Laptop lưu local + SHA-256 + dedup
  ↓
Storage Manager phân phối Drive
```

Không cần cùng Wi‑Fi và không cần quét QR lại.

## 5. Background behavior

- Android/iOS: PhotoSync đăng ký background task với minimum interval 15 phút.
- Khi app quay lại foreground, sync chạy ngay nếu laptop online.
- iOS quyết định thời điểm chạy background task; không đảm bảo chạy đúng ngay lúc laptop vừa bật.
- Muốn wake-up gần realtime khi laptop online trong khi iPhone đang background lâu, bước production tiếp theo là silent push/APNs/FCM từ relay.

## 6. Storage rule phía laptop

```text
appUsed + incomingFile <= 10 GiB
providerFree - incomingFile >= 5 GiB
```

Nếu không Drive nào hợp lệ, file vẫn nằm an toàn trong local library và cloud state = BLOCKED.

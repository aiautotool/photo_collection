# Chạy sync thật: Mobile → Laptop → Local / Google Drive

## 1. Luồng đúng

```text
Photos / MediaStore
       ↓
PhotoSync Mobile
       ↓ LAN direct sync
PhotoSync Laptop Receiver :43117
       ↓
Pictures/PhotoSync/YYYY/MM
       ↓
Storage Manager
       ├── giữ local
       └── phân phối lên Google Drive pool
```

Mobile không đăng nhập Google và không tự upload Drive.

## 2. Chạy desktop

```bash
npm install
cp desktop/.env.example desktop/.env
npm run desktop
```

Desktop sẽ hiển thị:
- Receiver URL, ví dụ `http://192.168.1.20:43117`
- Mã ghép nối 6 số
- Số file local đã nhận
- Số tài khoản Google Drive đã thêm

Windows/macOS có thể cần cho phép PhotoSync/Electron qua firewall mạng Private/LAN.

## 3. Chạy mobile

```bash
cd mobile
npx expo prebuild --clean
npm run android
# hoặc macOS
npm run ios
```

Trong app:
1. Cấp quyền Photos/Media Library.
2. Vào tab **Máy tính**.
3. Nhập Receiver URL của laptop.
4. Nhập mã ghép nối 6 số.
5. Bấm **Kết nối laptop**.
6. Sang tab **Ảnh** → **Đồng bộ**.

Mobile gửi file gốc trực tiếp tới laptop. Laptop trả HTTP `201` khi đã lưu local và `208` nếu asset đó đã được nhận trước đây.

## 4. Local library

Laptop lưu theo thời gian tạo media:

```text
Pictures/
  PhotoSync/
    2026/
      08/
        IMG_0001.HEIC
        VID_0002.MOV
```

Sau khi nhận file, desktop tính SHA-256 và ghi media index trong app user-data.

## 5. Google Drive chỉ ở desktop

Tạo Google Cloud OAuth client loại **Desktop app**, enable Google Drive API, rồi cấu hình:

```env
PHOTOSYNC_GOOGLE_DESKTOP_CLIENT_ID=...
PHOTOSYNC_GOOGLE_DESKTOP_CLIENT_SECRET=...
```

Trong desktop bấm **Thêm tài khoản Google**. Có thể thêm nhiều tài khoản; mỗi OAuth token được desktop lưu riêng.

Khi có file local mới, Storage Manager đọc quota từng Drive và chọn account đủ điều kiện:

```text
appUsed + incomingFile <= 10 GiB
providerFreeAfterUpload >= 5 GiB
```

Nếu không có Drive nào phù hợp, file vẫn an toàn ở local và cloud state là `BLOCKED`.

## 6. Bảo mật mạng

Phiên bản hiện tại dùng LAN HTTP + pair code 6 số để hoàn thiện luồng MVP. Chỉ dùng trên mạng tin cậy. Trước khi hỗ trợ sync qua Internet/public Wi-Fi cần nâng lên khóa riêng từng device + encrypted transport/TLS.

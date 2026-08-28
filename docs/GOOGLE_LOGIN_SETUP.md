# Google Login – cài đặt đơn giản nhất

Mục tiêu: người dùng cuối chỉ cần bấm **Đăng nhập Google**. Toàn bộ cấu hình OAuth chỉ làm một lần khi build app.

## 1. Tạo Google Cloud project
1. Vào Google Cloud Console.
2. Tạo 1 project, ví dụ `PhotoSync`.
3. Enable **Google Drive API**.
4. Cấu hình OAuth consent screen.

## 2. Tạo OAuth Client ID
Google yêu cầu OAuth client phù hợp cho từng nền tảng. Tối thiểu nên tạo:

- Android client
- iOS client
- Desktop client cho Windows
- Desktop client cho macOS

### Android
Cần:
- Package name: `com.kct.photosync`
- SHA-1 của signing certificate

### iOS
Cần:
- Bundle ID: `com.kct.photosync`

### Windows / macOS
Tạo OAuth client loại **Desktop app** cho mỗi nền tảng.

## 3. Scope dùng cho app
Dùng scope chính:

`https://www.googleapis.com/auth/drive.file`

Scope này chỉ cho phép app quản lý các file mà app tạo/chọn, an toàn và dễ review hơn so với toàn quyền Drive.

Thêm:
- `openid`
- `email`
- `profile`

## 4. File cấu hình local
Copy file mẫu:

```bash
cp config/google_oauth.example.json config/google_oauth.json
```

Sau đó điền Client ID tương ứng.

Không commit `config/google_oauth.json` lên GitHub.

## 5. Trải nghiệm người dùng
Trong app chỉ có luồng:

```text
Bấm "Thêm tài khoản Google"
→ mở trình duyệt / Google Sign-In
→ chọn Gmail
→ cấp quyền Drive
→ quay lại app
→ tài khoản xuất hiện trong danh sách Storage
```

Không yêu cầu người dùng nhập Client ID, Client Secret hoặc token.

## 6. Nhiều Gmail
Mỗi lần bấm **Thêm tài khoản Google** sẽ tạo thêm một account riêng.

App lưu refresh token trong secure storage của hệ điều hành:
- iOS/macOS: Keychain
- Android: Keystore-backed secure storage
- Windows: Credential Manager

Không lưu password Gmail.

## 7. Rule dung lượng bắt buộc
Mỗi Gmail:
- App dùng tối đa 10 GiB
- Luôn chừa ít nhất 5 GiB
- File không vừa thì chuyển sang Gmail kế tiếp
- Không chia một file qua nhiều Gmail

Điều kiện:

```text
appUsed + fileSize <= 10 GiB
AND
providerFree - fileSize >= 5 GiB
```

Nếu không có Gmail nào đủ chỗ, app dừng upload và báo thêm tài khoản mới.

## 8. Checklist nhanh
- [ ] Tạo Google Cloud project
- [ ] Enable Drive API
- [ ] Consent screen
- [ ] Android OAuth client
- [ ] iOS OAuth client
- [ ] Windows Desktop OAuth client
- [ ] macOS Desktop OAuth client
- [ ] Copy `google_oauth.example.json`
- [ ] Điền Client ID
- [ ] Build app

Sau bước này, người dùng cuối chỉ việc cài app và bấm **Đăng nhập Google**.

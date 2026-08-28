# Functional Requirements Specification — PhotoSync Suite

FR-001 Mobile requests media permission and handles denied/limited/full states.

FR-002 Mobile discovers image/video assets and persists a durable cursor.

FR-003 Exact duplicate key is SHA-256 + file size.

FR-004 Durable queue states: discovered -> hashing -> queued -> uploading -> verifying -> protected, with failed/blocked recovery.

FR-005 Backup settings: Wi-Fi only, charging only, photos, videos, background backup.

FR-006 Desktop supports multiple Google OAuth accounts. Passwords are never stored.

FR-007 Refresh tokens must use OS secure credential storage and be redacted from logs.

FR-008 Provider quota is refreshed before allocation when stale.

FR-009 An upload is invalid when `appUsed + fileSize > 10 GiB`.

FR-010 An upload is invalid when `providerFree - fileSize < 5 GiB`.

FR-011 A file must be placed entirely in one account.

FR-012 Default allocator chooses eligible account with greatest `safeAvailable=min(10GiB-appUsed, providerFree-5GiB)`.

FR-013 If no account fits, queue enters `BLOCKED_NO_CAPACITY`.

FR-014 Large files use resumable upload with persistent checkpoints.

FR-015 Uploaded media is verified and remote file id is indexed.

FR-016 Desktop can start at login/startup and run sync without foreground UI.

FR-017 Desktop local mirror verifies file size/hash after download.

FR-018 Unified index resolves logical media id to provider/account/file id.

FR-019 Immutable original media is content-addressed; metadata changes are revisioned.

FR-020 MVP never auto-deletes source mobile media.

FR-021 Every job records correlation id, progress, retries and sanitized errors.

FR-022 Queue/account state survives process termination and reboot.

FR-023 Target platforms are iOS, Android, Windows and macOS.

FR-024 Primary controls are accessible by keyboard/screen reader.

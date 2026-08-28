# Security Requirements

- OAuth 2.0 only; never collect Gmail passwords.
- Request least-privilege Drive scopes compatible with selected storage design.
- Store refresh tokens in macOS Keychain / Windows secure credential storage / mobile Keychain-Keystore.
- Encrypt coordination traffic with TLS.
- Never log access tokens, refresh tokens, authorization codes, or EXIF GPS without explicit diagnostic consent.
- Validate hashes after local download and before declaring restore successful.
- Use random per-device identifiers, not hardware serial numbers.
- Sanitize filenames and prevent path traversal on restore.
- Keep secrets outside Git; CI receives secrets through protected variables.
- Re-authentication is required after invalid_grant or user revocation.

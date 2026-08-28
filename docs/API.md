# Coordination API Contract (optional)

## POST /v1/media/register
Request: `{ deviceId, sha256, size, mimeType, createdAt, filename }`
Response: `{ mediaId, duplicate, uploadRequired }`

## POST /v1/storage/allocate
Request: `{ mediaId, size }`
Response: `{ accountId, safeAvailableBytes }` or HTTP 409 `{ code: "NO_SAFE_CAPACITY" }`.

## POST /v1/sync/checkpoint
Request: `{ jobId, state, bytesTransferred, providerSessionId? }`

## GET /v1/sync/changes?cursor=...
Response: `{ nextCursor, changes: [...] }`

Backend must re-validate capacity. Never trust client-only quota reports.

# Business Requirements Document — PhotoSync Suite

## Vision
Build a private Google-Photos-like backup and library experience where iOS/Android devices protect photos/videos automatically and Windows/macOS computers synchronize the library while aggregating multiple Google Drive accounts.

## Business goals
1. Automatic backup of original media.
2. One unified library across many physical Google Drive accounts.
3. Preserve at least 5 GiB free in every connected Google account and never let PhotoSync use more than 10 GiB in one account.
4. Desktop sync starts automatically with the OS.
5. Prevent duplicate uploads and recover interrupted transfers.

## Scope
Mobile iOS/Android; desktop Windows/macOS; Google OAuth; multi-account Drive allocation; discovery, hash, dedupe, queue, retry, upload/download, local library, account health and activity.

## Critical rule
For every Google account: app hard cap = 10 GiB; protected reserve = 5 GiB; whole-file placement only. If no account safely fits a file, queue state becomes BLOCKED_NO_CAPACITY.

## Main journeys
First setup; add Drive account; automatic backup; desktop boot synchronization; capacity rollover; restore.

## Success metrics
0 violations of storage guardrails; no duplicate physical upload for same SHA-256+size; durable restart recovery; automatic desktop sync startup.

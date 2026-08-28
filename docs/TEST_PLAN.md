# Test Plan

## Levels
- Unit: allocator, queue state transitions, dedupe keys, quota math.
- Integration: OAuth token refresh, Drive resumable upload, local index, restart recovery.
- UI: permission states, settings, capacity warnings, sync progress.
- End-to-end: capture/import media -> protected in Drive -> desktop download -> hash match.
- Reliability: network loss, reboot, token revocation, Drive quota changed externally.
- Security: secret redaction, path traversal, invalid OAuth callback, corrupted download.

## Exit criteria
- All P0/P1 functional cases pass.
- 100% pass for storage boundary tests around 10 GiB cap and 5 GiB reserve.
- No critical/high security defect open.
- Restart recovery demonstrated on all four target platforms.

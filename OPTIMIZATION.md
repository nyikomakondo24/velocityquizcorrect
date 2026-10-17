# VelocityQuiz optimization notes

Checked 17 October 2026. These findings come from the uploaded source, a production build, local protocol tests and browser checks. The previous failing deployment's logs and URL were not supplied, so these are verified code issues rather than proof of what happened at that event.

## Loading and joining

| Change | Original | Updated |
| --- | --- | --- |
| Initial JavaScript, uncompressed | 790,590 bytes | 255,645 bytes (67.7% smaller) |
| Homepage hero image | 1,055,943 bytes | 163,188 bytes |
| Player PIN entry | Loaded host/editor/importer code too | Downloads those screens only when needed |
| Join before connection opens | Request silently discarded | Join/create request waits for connection; real pending/error status |
| Refresh or network interruption | New connection lost player identity | Same-tab session recovery restores player, score and host controls |

The original installation had an esbuild/Vite peer-dependency conflict. The comparison uses the supplied frontend source and the same compatible build tools on both sides. The original production command also left local TypeScript imports pointing to missing JavaScript files; the new server bundle includes those imports and starts in production mode by default.

The old hero used a hardcoded `/src/` URL which was not emitted as a production asset. It now uses a Vite asset import and WebP. Uploaded question images are also resized before storage. Fonts no longer block the first render. Mobile header overflow found during QA is fixed.

## Multiplayer traffic and correctness

Previously, each join or answer immediately sent the entire quiz and all accumulated player histories to every connection. Now the server batches room changes for 100 ms, sends partial room state without the quiz, serializes once per audience, and sends private answer confirmations immediately. Current clue images travel on phase changes, not on every answer. Personal histories travel only to their owner when needed.

On a synthetic 100-question fixture with small embedded images, the player question packet was 16,349 bytes versus 175,807 bytes for an equivalent old-style full-room snapshot. This compares packet shapes, not a recorded measurement from the previous deployment.

The server enforces deadlines, rejects late/duplicate/stale submissions, checks that commands belong to the room's host and that answers belong to the connected player. Player snapshots omit future questions and answer keys. The speed-scoring switch now works. Missed questions reset streaks. Heartbeats, jittered reconnects, bounded slow-client queues and room cleanup prevent stale connections from accumulating. The dual simulator uses a separate participant connection so host permissions remain intact.

## Validation

- Clean `npm ci`, TypeScript check and production build passed.
- `npm test`: 12 passing test results, including the parent integration test and 11 subtests.
- Sixty concurrent network clients joined one real server; the 61st was rejected. All 60 simultaneous answers were acknowledged. Full-room player recovery, host refresh, duplicate-score prevention, deadlines without the host, kick/session revocation, podium histories, restart and cleanup passed.
- Latest local join p95: 76 ms. Answer acknowledgement p95: 7 ms. The answer burst caused 1 shared host room update. These are local measurements and are not promises for Render or mobile networks.
- Chromium browser checks passed for PIN entry, no host/editor/hero downloads on a player page, confirmed answers, scores, reconnect and refresh recovery, host restoration, mobile width and absence of JavaScript errors.
- Development-mode HTML and the game WebSocket endpoint passed a smoke check.

Raw local metrics are in `tests/latest-local-results.json`. Run `npm run build` before `npm test` to test your current source.

## Hosting and remaining limits

`README.md` gives the free Render setup and `render.yaml` supplies its configuration. No account, repository or deployment has been created. One Node process must serve both the app and `/ws`.

Rooms and scores remain in memory. Reconnection survives a dropped connection while that process remains running; it cannot recover a restarted process. Custom quizzes remain in the host's browser storage. Persistent sessions across deployments would require a separate storage design. Before a real event, rehearse on the actual host with several phones and then 60 clients; shared Wi-Fi, weak mobile data, external image URLs and free-host CPU can still affect loading and timing. Server receipt time determines speed points, so a slower network can affect speed-based rankings.

# Streaming Architecture

ChilizTV supports two ingest methods: **OBS Studio** (RTMP) and **browser-based** (WebRTC/WHIP). Both feed into mediamtx, which outputs LL-HLS to viewers.

```
OBS (RTMP)  ──┐
               ├──▶ mediamtx ──▶ LL-HLS ──▶ VideoPlayer (hls.js)
Browser (WHIP)─┘
```

---

## Stream Lifecycle

Streams move through three states:

```
CREATED ──▶ LIVE ──▶ ENDED
```

| State     | When                                     |
|-----------|------------------------------------------|
| `created` | `POST /stream` called — stream key ready |
| `live`    | OBS/browser starts pushing frames        |
| `ended`   | Publisher disconnects or cron times out  |

State transitions are **idempotent**: calling `stream.start()` on an already-LIVE stream is a no-op. Same for `stream.end()`.

---

## Domain Layer

### `Stream` entity — `src/domain/streams/entities/Stream.ts`

The aggregate root. Holds all stream state and enforces invariants.

**Key fields:**

| Field              | Type          | Description                                      |
|--------------------|---------------|--------------------------------------------------|
| `id`               | UUID          | Primary key                                      |
| `streamKey`        | UUID (36 chr) | Secret key used by OBS as "Stream Key"           |
| `status`           | `StreamStatus`| `created \| live \| ended`                      |
| `lastHeartbeatAt`  | Date?         | Set on every mediamtx auth call while LIVE       |
| `viewerCount`      | number        | Active viewers (updated by ViewerSessionService) |
| `thumbnailUrl`     | string?       | Last captured JPEG from VideoPlayer              |

**Key methods:**

```typescript
stream.start()     // CREATED → LIVE (no-op if already LIVE)
stream.end()       // LIVE → ENDED (no-op if already ENDED)
stream.heartbeat() // Updates lastHeartbeatAt (guarantees non-null while LIVE)
```

### `IStreamRepository` — `src/domain/streams/repositories/IStreamRepository.ts`

```typescript
findById(id)
findByStreamKey(streamKey)
findByStreamerId(streamerId)        // Returns the current LIVE stream for a streamer
findActiveStreams()                  // All status='live' streams
findActiveByMatchIds(matchIds[])    // LIVE streams for given matches (ordered by viewer_count)
findStaleLiveStreams(olderThan)     // LIVE + lastHeartbeatAt < olderThan
findOldEndedStreams(before)         // ENDED + endedAt < before (for 24h cleanup)
save(stream) / update(stream) / delete(id)
```

---

## Preferred Stream Selection

`GET /stream/preferred?matchId=&userId=` returns the best stream to auto-display when a viewer opens a match page.

**Priority order (use case: `GetPreferredStreamUseCase`):**

1. **Followed streamer** — if `userId` is provided, checks `IFollowRepository.getFollowedStreamers(userId)`. Returns the first active stream from a followed streamer.
2. **Top viewer** — returns the stream with the highest `viewer_count` (already ordered by `findActiveByMatchIds`).
3. **None** — returns `{ stream: null, source: 'none' }` if no active streams exist.

The user's own stream is always excluded from the candidates (cannot auto-select yourself).

**Frontend (`StreamSelector`):** on initial mount, if no stream is pre-selected via URL param, calls this endpoint and calls `onStreamSelect(preferred.stream)` to propagate the selection to the parent (`LiveDetailsPage`).

---

## OBS Integration

### How it works

1. Streamer clicks **Get OBS Stream Key** in `OBSSetupPanel`
2. Frontend calls `POST /stream` → backend creates stream with `status=created`, generates a full UUID stream key
3. Streamer configures OBS:
   - **Server**: `rtmp://HOST:1935/live`
   - **Stream Key**: the UUID from step 2
4. OBS starts streaming → mediamtx calls `POST /mediamtx/auth`
5. Backend validates key format + DB lookup → responds **200 immediately** (non-blocking)
6. Backend fires `StreamLifecycleService.startStreamIfNeeded()` asynchronously → `status=live`
7. mediamtx also calls `POST /mediamtx/connect` (via `runOnReady` hook) — belt-and-suspenders for step 6
8. OBS stops → mediamtx calls `POST /mediamtx/disconnect` (via `runOnNotReady` hook)
9. Backend fires `StreamLifecycleService.endStreamIfNeeded()` asynchronously → `status=ended`

### Auth webhook — `src/presentation/http/controllers/mediamtx-webhook.controller.ts`

```
POST /mediamtx/auth
```

Flow:
1. `read` / `playback` actions → 200 immediately (viewers always allowed)
2. Unknown actions → 200 (forward-compatible)
3. `publish` action:
   - Extract stream key from path (`live/{streamKey}`)
   - Format-validate: `/^[a-zA-Z0-9_-]{16,}$/` — rejects garbage without hitting DB
   - DB lookup: reject with 401 if key unknown
   - Respond 200 **before** any async work
   - Fire-and-forget: `startStreamIfNeeded(streamKey)`

### Connect webhook — `POST /mediamtx/connect`

Called by mediamtx `runOnReady` hook when a publisher becomes active. Provides a reliable second trigger for `CREATED → LIVE` transition, in case the auth hook's fire-and-forget call to `startStreamIfNeeded` was missed (server restart, timing race, etc.).

### Disconnect webhook — `POST /mediamtx/disconnect`

Called by mediamtx `runOnNotReady` hook when the publisher stops (no more publisher AND no more readers).

```yaml
# mediamtx.yml
paths:
  "~^live/":
    runOnReady: >-
      curl -s -X POST
      "${MEDIAMTX_BACKEND_URL:-http://localhost:3001}/mediamtx/connect?path=$MTX_PATH"
    runOnNotReady: >-
      curl -s -X POST
      "${MEDIAMTX_BACKEND_URL:-http://localhost:3001}/mediamtx/disconnect?path=$MTX_PATH"
```

### `StreamLifecycleService` — `src/infrastructure/services/StreamLifecycleService.ts`

Manages the `CREATED → LIVE → ENDED` transitions.

```typescript
startStreamIfNeeded(streamKey)
// - If LIVE: refresh heartbeat only (idempotent)
// - If CREATED: transition to LIVE + set heartbeat

endStreamIfNeeded(streamKey)
// - Only transitions if currently LIVE (no-op otherwise)
```

**`inFlight` Set**: anti-spam debounce within a single process. Prevents duplicate concurrent calls to the same key. Not a distributed lock — entity idempotency (`start()`/`end()` no-ops) is the actual business guarantee.

---

## Browser Streaming (WHIP)

Browser streaming uses WebRTC via the WHIP protocol (`webrtcAddress: :8889`). The same auth webhook is called by mediamtx — the flow is identical to OBS from the backend's perspective. `StreamLifecycleService` handles both.

On the frontend, `StreamManager.tsx` uses `streamClientService` to capture `getUserMedia` / `getDisplayMedia`, create a WebRTC connection, and push to mediamtx.

---

## Stale Stream Safety Net

If OBS crashes (no disconnect webhook fires), the `StaleStreamCleanupJob` catches orphaned LIVE streams.

**`StaleStreamCleanupJob`** — `src/infrastructure/scheduling/jobs/StaleStreamCleanupJob.ts`

- Schedule: every 3 minutes (`*/3 * * * *`)
- Timeout threshold: 5 minutes
- Finds LIVE streams where `lastHeartbeatAt < now - 5min`
- Calls `endStreamIfNeeded()` for each

This 5-minute window tolerates OBS reconnects and brief network cuts.

---

## Real-Time Viewer Count

### DB table — `viewer_sessions`

```sql
CREATE TABLE viewer_sessions (
  id                UUID PRIMARY KEY,
  stream_id         UUID REFERENCES live_streams(id) ON DELETE CASCADE,
  session_token     TEXT UNIQUE,         -- stable per browser (localStorage)
  last_heartbeat_at TIMESTAMPTZ
);
```

### Session token strategy

Generated once per browser with `crypto.randomUUID()`, stored in `localStorage` keyed by `stream_id`. All tabs in the same browser share the same token → the same session → no overcounting.

### Count update strategy (O(1) per heartbeat)

| Operation | DB work                                                          |
|-----------|------------------------------------------------------------------|
| `join` (new session)  | INSERT + `reconcileCount()` |
| `join` (heartbeat)    | UPDATE `last_heartbeat_at` + `reconcileCount()` |
| `leave`               | DELETE + `reconcileCount()` |
| Cron 60s              | `reconcileCount()` on all streams with sessions |

`reconcileCount()`:
1. DELETE stale sessions (`last_heartbeat_at < now - 45s`)
2. `SELECT COUNT(*)` on remaining active sessions
3. `UPDATE live_streams SET viewer_count = count` → triggers **Supabase Realtime**

### Endpoints

```
POST /stream/:id/join   { sessionToken }   → upsert session + reconcile
POST /stream/:id/leave  { sessionToken }   → delete session + reconcile
```

### `ViewerReconcileJob` — `src/infrastructure/scheduling/jobs/ViewerReconcileJob.ts`

- Schedule: every minute (`* * * * *`)
- Reconciles all streams that have active sessions or `viewer_count > 0`
- Corrects any drift caused by crashes or missed `leave` calls

### Frontend (VideoPlayer)

```
MANIFEST_PARSED → joinStream() + setInterval(joinStream, 30s)  // heartbeat
unmount         → leaveStream() + clearIntervals
```

Supabase Realtime subscription on `live_streams:id=eq.{streamId}` keeps the viewer badge in sync across all clients instantly.

---

## Live Thumbnails

### Capture

`VideoPlayer.tsx` captures a 320×180 JPEG frame every 20 seconds:

```typescript
canvas.drawImage(video, 0, 0, 320, 180)
canvas.toBlob(blob => uploadThumbnail(stream.id, blob), 'image/jpeg', 0.7)
```

Capture starts 3 seconds after `MANIFEST_PARSED` to let the stream stabilise.

### Upload endpoint

```
PUT /stream/:id/thumbnail   multipart/form-data  field: file (image/jpeg)
```

Backend guards:
- MIME check: rejects non-`image/jpeg`
- **Throttle**: in-memory `Map<streamId, lastUploadMs>` — only one upload per stream per 15 seconds, regardless of how many viewers are capturing

### Storage

Files are stored in Supabase Storage bucket **`stream-thumbnails`** at path `{streamId}.jpg` (upsert). The public URL is written to `live_streams.thumbnail_url`, which triggers Supabase Realtime to propagate the new thumbnail to all `StreamPreviewCard` subscribers instantly.

### `StreamPreviewCard` Realtime subscription

Each card subscribes to a single channel `stream-{streamId}` and updates both `viewer_count` and `thumbnail_url` from the same Postgres change event.

---

## Database Indexes

```sql
-- Cron query: find stale LIVE streams
CREATE INDEX idx_live_streams_heartbeat ON live_streams (status, last_heartbeat_at);

-- Cron query: find active viewer sessions per stream
CREATE INDEX idx_viewer_sessions_stream ON viewer_sessions (stream_id, last_heartbeat_at);
```

---

## Supabase Realtime

`live_streams` is added to the Supabase Realtime publication (migration 004 / schema). No server-side subscription is needed — clients subscribe directly:

```typescript
supabase
  .channel(`stream-${streamId}`)
  .on('postgres_changes', { event: 'UPDATE', table: 'live_streams', filter: `id=eq.${streamId}` }, handler)
  .subscribe()
```

Any `UPDATE` to `viewer_count` or `thumbnail_url` in the DB automatically fans out to all subscribed clients.

---

## Migrations

| File | Description |
|------|-------------|
| `001` | Initial streams table (`status`, `viewer_count`, HLS URL) |
| `003` | Adds `title` column |
| `006` | OBS lifecycle: `status` constraint → `created\|live\|ended`, `last_heartbeat_at`, composite index |
| `007` | `viewer_sessions` table + `thumbnail_url` column on `live_streams` |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SUPABASE_URL` | — | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Service role key (bypasses RLS) |
| `MEDIAMTX_PUBLISH_SECRET` | — | Optional shared secret for webhook auth |
| `MEDIAMTX_BACKEND_URL` | `http://localhost:3001` | Used in mediamtx.yml for Docker environments |
| `NEXT_PUBLIC_MEDIAMTX_URL` | `http://localhost:8888` | HLS server URL (frontend) |
| `NEXT_PUBLIC_RTMP_URL` | `rtmp://localhost:1935/live` | RTMP server URL shown in OBSSetupPanel |

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/stream` | Create stream (returns streamKey) |
| `GET` | `/stream?matchId=` | List active (`live`) streams for a match |
| `GET` | `/stream/preferred?matchId=&userId=` | Follow-aware preferred stream for a match |
| `DELETE` | `/stream` | End a stream |
| `POST` | `/stream/:id/join` | Register/heartbeat viewer session |
| `POST` | `/stream/:id/leave` | Remove viewer session |
| `PUT` | `/stream/:id/thumbnail` | Upload JPEG thumbnail (multipart) |
| `POST` | `/mediamtx/auth` | mediamtx publish/read auth webhook |
| `POST` | `/mediamtx/connect` | mediamtx `runOnReady` hook — publisher active |
| `POST` | `/mediamtx/disconnect` | mediamtx `runOnNotReady` hook — publisher stopped |

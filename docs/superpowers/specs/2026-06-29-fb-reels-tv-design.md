# FbReels TV — TizenBrew Module Design

## Overview

A TizenBrew site modification module that loads `facebook.com/reels/` on Samsung TV with:
- QR code login via Cloudflare Worker proxy
- TV remote navigation (arrow keys, enter, back)
- Auto-scroll reel detection (same logic as FbReelsLite desktop)
- 10-foot UI overlay for auth and controls

## Architecture

```
TV (TizenBrew)                    Cloudflare Worker            Phone
     │                                  │                       │
     ├─ POST /auth/init ───────────────►│                       │
     │◄─ { sessionId, qrUrl } ─────────┤                       │
     │                                  │                       │
     │  Show QR ────────────────────────────────────────────────►│
     │                                  │     Scan QR            │
     │                                  │◄── GET /auth/flow/id ──┤
     │                                  │─ redirect FB login ──► │
     │                                  │◄─ FB callback ──────── │
     │                                  │  (session cookies)     │
     ├─ GET /auth/status/id ───────────►│                       │
     │◄─ { cookies } ──────────────────┤                       │
     │  Set cookies, reload reels       │                       │
     │                                  │                       │
     │  ─── Auto-scroll reels ──────────│───────────────────────│
     │  Video loop detect → IPC →       │                       │
     │  SendInput(VK_DOWN)              │                       │
```

## Components

### 1. Cloudflare Worker (`worker/`)

Endpoints:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/init` | Create auth session, return `{sessionId, qrUrl}` |
| GET | `/auth/flow/:id` | Redirect user to Facebook Login OAuth |
| GET | `/auth/callback/:id` | Facebook redirect target, capture session |
| GET | `/auth/status/:id` | TV polls here for session cookies |

Data store: KV namespace for temporary session storage (TTL 5 min).

### 2. TizenBrew Module

#### `package.json`
- `packageType: "mods"`
- `websiteURL: "https://www.facebook.com/reels/"`
- `keys: ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "Back", "MediaPlayPause", "ColorF2Yellow"]`
- `serviceFile: "service.js"` (NodeJS service on TV)
- `main: "src/main.js"` (injected into page)

#### `src/main.js` (injected script)
Handles:
- Check auth state (cookie presence)
- If not authed: show QR overlay
- If authed: enable auto-scroll + remote controls

#### `src/auth.js`
- QR code overlay (rendered via canvas/QR码 library)
- Poll worker for auth status
- Set cookies via `document.cookie`
- Persist cookies to localStorage for next session

#### `src/reels.js`
- Video loop detection (same logic as desktop app)
- `lastVideoSrc` tracking, `currentTime` reset detect
- Auto-scroll trigger → evaluates scroll on Facebook container

#### `src/remote.js`
- `TVInputDevice` key registration
- Map Samsung remote keys to actions:
  - `ArrowUp/Down` → prev/next reel
  - `Enter` → play/pause
  - `Back` → toggle QR overlay (if not authed)
  - `ColorF2 (Yellow)` → toggle auto-scroll
  - `MediaPlayPause` → play/pause

#### `service.js` (NodeJS service on TV)
- Handles auth polling in background
- Cookie persistence (save/load to TV filesystem)
- Periodic cookie refresh

### 3. Auth Flow Details

```
1. TV: POST /auth/init → worker creates session
2. Worker: generates UUID, stores in KV, returns sessionId + QR URL
3. TV: renders QR code (QR URL = worker/auth/flow/:sessionId)
4. User: scans QR with phone camera
5. Phone: opens worker/auth/flow/:sessionId
6. Worker: redirects to Facebook Login with redirect_uri = worker/auth/callback/:sessionId
7. User: logs into Facebook on phone
8. Facebook: redirects to worker/auth/callback/:sessionId with auth code
9. Worker: exchanges code for access token, captures session cookies
10. Worker: stores cookies in KV, marks session complete
11. TV: polls GET /auth/status/:sessionId every 2s
12. TV: receives cookies → document.cookie → reload facebook.com/reels/
```

### 4. Auto-Scroll Logic

Same as FbReelsLite desktop:
- Monitor `<video>` elements for `currentTime` resets
- Track `lastVideoSrc` to detect src changes
- When loop detected (currentTime jumps from >2s to <1s):
  - Dispatch custom event that triggers scroll
  - Scroll using targeted container selectors:
    1. `div[role="feed"]`
    2. `div[data-pagelet="Reels"]`
    3. Any scrollable div with overflow-y
    4. Fallback: `window.scrollBy`

### 5. TV Remote Integration

Using Samsung `TVInputDevice` API (registered via `keys` in package.json):
- TizenBrew forwards remote key events to the WebView
- Injected JS listens for `keydown` events
- Map keys to actions

## Project Structure

```
fb-reels-tv/
├── package.json              # npm module, packageType: "mods"
├── index.html                # Bootstrap HTML (error overlay)
├── service.js                # NodeJS service (auth poll, cookie persistence)
├── src/
│   ├── main.js               # Entry point, injected into page
│   ├── auth.js               # QR overlay + worker polling
│   ├── reels.js              # Auto-scroll + video detection
│   ├── remote.js             # TV remote key mapping
│   └── style.css             # TV-friendly overlay styles
├── worker/
│   ├── wrangler.toml
│   └── src/
│       └── index.js          # Cloudflare Worker (auth proxy)
├── .gitignore
└── README.md
```

## Dependencies

### Module (runtime)
- None (vanilla JS, no build step needed)
- QR code generation: inline mini library (~50 lines)

### Worker
- `@cloudflare/workers-types` (dev)
- `itty-router` or raw `Request` handler

## Security

- Session IDs: UUIDv4, stored in KV with 5min TTL
- Facebook cookies: only stored transiently in KV, returned to TV once
- No persistent storage of user credentials
- Worker URL must be configurable (user deploys their own)

## Deployment

1. Deploy Cloudflare Worker:
   ```bash
   cd worker
   wrangler deploy
   ```
2. Configure module with worker URL
3. Publish to npm:
   ```bash
   tizenbrew-kit build
   npm publish --access public
   ```
4. Install via TizenBrew on TV:
   - Open TizenBrew → Install Module → enter package name

## Future Considerations

- Save/restore session cookies for persistent login (no re-auth on app restart)
- Multi-account support
- TikTok/YouTube module variants
- Landscape/portrait toggle for reels aspect ratio

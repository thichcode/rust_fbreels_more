# FbReels TV

Facebook Reels viewer for Samsung TV via TizenBrew.

## Prerequisites

- Samsung TV with TizenBrew installed
- Cloudflare account (for auth worker deployment)

## Quick Start

### 1. Deploy the Auth Worker

```bash
cd worker
npm install -g wrangler
wrangler deploy
```

Note your worker URL (e.g., `https://fb-reels-auth.xxxx.workers.dev`).

### 2. Configure the Module

Replace `__WORKER_URL__` in `src/main.js`, `src/remote.js`, and `service.js` with your worker URL.

### 3. Build and Publish

```bash
npm install -g tizenbrew-kit
tizenbrew-kit build
npm publish --access public
```

### 4. Install on TV

Open TizenBrew → Install Module → enter `@thichcode/fb-reels-tv`

## Usage

### First-time Login

1. Open FbReels TV from TizenBrew
2. A QR code will appear on screen
3. Scan the QR code with your phone
4. Enter your Facebook email and password on the phone
5. Once login is successful, close the phone browser
6. The TV will automatically detect the login and load Reels

### TV Remote Controls

| Key | Action |
|-----|--------|
| ↑ / ↓ | Previous / next reel |
| ← / → | Previous / next reel |
| Enter | Play / pause |
| Back | Show/hide QR login overlay |
| Yellow (ColorF2) | Toggle auto-scroll on/off |

### Auto-Scroll

Automatically advances to the next reel when the current video loops. Toggle with the Yellow button on your remote.

## Architecture

```
Phone (scan QR) → Cloudflare Worker (auth proxy) → Facebook
TV ← polls worker for session cookies ← sets cookies in WebView
TV → loads facebook.com/reels/ → injected JS for remote + auto-scroll
```

## Security

- Your Facebook credentials are sent directly from your phone to Facebook via the Cloudflare Worker proxy
- No credentials are stored by the worker or the TV
- Session cookies are saved locally on the TV for automatic re-login
- The worker source code is open — review it before deploying

## License

MIT

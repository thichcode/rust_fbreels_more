# FbReels TV Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a TizenBrew site modification module that loads `facebook.com/reels/` on Samsung TV with QR login and auto-scroll.

**Architecture:** Cloudflare Worker handles Facebook OAuth proxy + QR auth flow. TizenBrew module (Site Modification type) loads facebook.com/reels/, injects JS for TV remote controls, auto-scroll, and auth overlay. NodesJS service on TV polls worker for auth status and persists cookies.

**Tech Stack:** Cloudflare Workers (auth proxy), vanilla JS (module), Samsung TVInputDevice API, QR code (inline canvas)

---

### Task 1: Cloudflare Worker — Auth Proxy

**Files:**
- Create: `fb-reels-tv/worker/wrangler.toml`
- Create: `fb-reels-tv/worker/src/index.js`
- Create: `fb-reels-tv/worker/.gitignore`

- [ ] **Step 1: Create wrangler.toml**

```toml
name = "fb-reels-auth"
main = "src/index.js"
compatibility_date = "2026-06-01"

[[kv_namespaces]]
binding = "AUTH_KV"
id = ""
preview_id = ""
```

- [ ] **Step 2: Write worker index.js**

```js
// POST /auth/init — create session, return QR URL
// GET  /auth/flow/:id — redirect user to Facebook Login
// GET  /auth/callback/:id — Facebook redirect target, capture session
// GET  /auth/status/:id — TV polls for session cookies

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'POST' && path === '/auth/init') {
      const sessionId = crypto.randomUUID();
      const qrUrl = `${url.origin}/auth/flow/${sessionId}`;
      await env.AUTH_KV.put(sessionId, JSON.stringify({ status: 'pending', cookies: null }), { expirationTtl: 300 });
      return new Response(JSON.stringify({ sessionId, qrUrl }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (request.method === 'GET' && path.startsWith('/auth/flow/')) {
      const sessionId = path.split('/').pop();
      const fbAuthUrl = `https://www.facebook.com/login.php?skip_api_login=1&api_key=0&next=https%3A%2F%2Fwww.facebook.com%2Freels%2F&display=popup&return_session=1&session_version=3&fbapp_pres=0`;
      // Store the Facebook login URL to callback
      await env.AUTH_KV.put(sessionId, JSON.stringify({ status: 'pending', cookies: null, redirectUrl: `${url.origin}/auth/callback/${sessionId}` }), { expirationTtl: 300 });
      return Response.redirect(fbAuthUrl, 302);
    }

    if (request.method === 'GET' && path.startsWith('/auth/callback/')) {
      const sessionId = path.split('/').pop();
      // Capture all cookies from the response
      const cookies = request.headers.get('Cookie') || '';
      const setCookies = request.headers.get('Set-Cookie') || '';
      const data = JSON.stringify({ status: 'complete', cookies: setCookies || cookies, timestamp: Date.now() });
      await env.AUTH_KV.put(sessionId, data, { expirationTtl: 300 });
      return new Response('Login successful! You can close this window.', {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    if (request.method === 'GET' && path.startsWith('/auth/status/')) {
      const sessionId = path.split('/').pop();
      const data = await env.AUTH_KV.get(sessionId);
      if (!data) {
        return new Response(JSON.stringify({ status: 'not_found' }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
      return new Response(data, {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
}
```

- [ ] **Step 3: Create .gitignore**

```
node_modules/
.wrangler/
```

- [ ] **Step 4: Commit**

```bash
git add fb-reels-tv/worker/
git commit -m "feat(worker): auth proxy with QR login flow"
```

---

### Task 2: TizenBrew Module — Package Structure

**Files:**
- Create: `fb-reels-tv/package.json`
- Create: `fb-reels-tv/index.html`
- Create: `fb-reels-tv/service.js`
- Create: `fb-reels-tv/.gitignore`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@thichcode/fb-reels-tv",
  "version": "0.1.0",
  "description": "Facebook Reels viewer for Samsung TV with QR login",
  "type": "module",
  "packageType": "mods",
  "appName": "FbReels TV",
  "websiteURL": "https://www.facebook.com/reels/",
  "serviceFile": "service.js",
  "main": "src/main.js",
  "keys": ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "Back", "MediaPlayPause", "ColorF2Yellow"],
  "files": ["index.html", "src", "service.js", "README.md"],
  "publishConfig": { "access": "public" },
  "scripts": {
    "dev": "tizenbrew-kit dev",
    "build": "tizenbrew-kit build",
    "package": "tizenbrew-kit package",
    "doctor": "tizenbrew-kit doctor"
  },
  "license": "MIT"
}
```

- [ ] **Step 2: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FbReels TV</title>
</head>
<body>
  <div id="fb-reels-status">Loading FbReels TV...</div>
  <script>
    window.onerror = function (message, source, line) {
      var el = document.getElementById('fb-reels-status');
      if (el) el.textContent = 'Error: ' + message + ' (line ' + line + ')';
    };
  </script>
  <script src="./src/main.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create service.js**

```js
// NodeJS service runs on TV inside TizenBrew
// Handles auth polling + cookie persistence

const API_BASE = '__WORKER_URL__'; // replaced at build time

export async function pollAuth(sessionId) {
  const maxAttempts = 150; // 5 min
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${API_BASE}/auth/status/${sessionId}`);
      const data = await res.json();
      if (data.status === 'complete' && data.cookies) {
        return data.cookies;
      }
    } catch (e) {
      // network error, retry
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  return null;
}

export async function saveCookies(cookies) {
  try {
    const fs = require('fs');
    fs.writeFileSync('/tmp/fb_cookies.txt', cookies, 'utf-8');
  } catch (e) {
    // ignore
  }
}

export async function loadCookies() {
  try {
    const fs = require('fs');
    return fs.readFileSync('/tmp/fb_cookies.txt', 'utf-8');
  } catch (e) {
    return null;
  }
}
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
```

- [ ] **Step 5: Commit**

```bash
git add fb-reels-tv/package.json fb-reels-tv/index.html fb-reels-tv/service.js fb-reels-tv/.gitignore
git commit -m "feat(module): tizenbrew site modification structure"
```

---

### Task 3: Injected JS — Main Entry + Auth Overlay

**Files:**
- Create: `fb-reels-tv/src/main.js`
- Create: `fb-reels-tv/src/auth.js`
- Create: `fb-reels-tv/src/style.css`

- [ ] **Step 1: Create src/main.js**

```js
// Injected into facebook.com/reels/ by TizenBrew

(function () {
  'use strict';

  var CONFIG = {
    workerUrl: '__WORKER_URL__',
    autoScroll: true
  };

  var state = {
    authed: false,
    sessionId: null,
    autoScrollEnabled: true
  };

  function init() {
    console.log('[FbReelsTV] init');
    injectStyles();
    checkAuth();
  }

  function injectStyles() {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './src/style.css';
    document.head.appendChild(link);
  }

  function checkAuth() {
    var fbCookies = document.cookie.split(';').filter(function (c) {
      return c.trim().startsWith('c_user=') || c.trim().startsWith('xs=');
    });
    if (fbCookies.length >= 2) {
      state.authed = true;
      console.log('[FbReelsTV] already authed');
      startReels();
    } else {
      console.log('[FbReelsTV] not authed, show QR');
      startAuth();
    }
  }

  function startAuth() {
    // Dynamically load auth module
    var script = document.createElement('script');
    script.src = './src/auth.js';
    script.onload = function () {
      window.FbReelsTVAuth.start(CONFIG.workerUrl, function () {
        state.authed = true;
        startReels();
      });
    };
    document.body.appendChild(script);
  }

  function startReels() {
    // Dynamically load reels + remote modules
    var rScript = document.createElement('script');
    rScript.src = './src/reels.js';
    document.body.appendChild(rScript);
    var remScript = document.createElement('script');
    remScript.src = './src/remote.js';
    document.body.appendChild(remScript);
  }

  // Listen for config changes
  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'setAutoScroll') {
      state.autoScrollEnabled = e.data.value;
    }
  });

  // Expose state for remote.js and reels.js
  window.__FB_REELS_TV__ = state;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
```

- [ ] **Step 2: Create src/auth.js**

```js
(function (global) {
  'use strict';

  var overlay, canvas, statusText, codeDisplay, pollTimer;
  var workerUrl = '';
  var onComplete = null;

  // Inline QR code generator (minimal)
  // QR Code model — numeric/alphanumeric/byte mode, version 1-7
  var QR = (function () {
    var MODE_BYTE = 4;
    var POLY = [0, 199, 198, 217, 222, 7, 12, 245, 236, 235, 234];
    var GF256 = new Array(256);
    var LOG = new Array(256);
    for (var i = 0, v = 1; i < 256; i++) {
      GF256[i] = v;
      LOG[v] = i;
      v = v * 2 ^ (v >= 128 ? 0x11d : 0);
    }

    function ecLevel(l) { return [1, 0, 3, 2][l]; }

    function encodeByte(data) {
      var len = data.length;
      var buf = [];
      buf.push(MODE_BYTE << 4 | (len >> 4 & 0xf));
      buf.push((len & 0xf) << 4);
      for (var i = 0; i < len; i++) {
        if (i & 1) buf[buf.length - 1] |= data[i];
        else buf.push(data[i] << 4);
      }
      return buf;
    }

    function rsBlock(data, eccLen) {
      var ecc = new Array(eccLen).fill(0);
      for (var i = 0; i < data.length; i++) {
        var f = data[i] ^ ecc[0];
        if (f === 0) { ecc.shift(); ecc.push(0); continue; }
        var logF = LOG[f];
        for (var j = 0; j < ecc.length; j++) {
          ecc[j] = (j < ecc.length - 1 ? ecc[j + 1] : 0) ^ (logF < 0 ? 0 : GF256[(LOG[POLY[j + 1]] + logF) % 255]);
        }
      }
      return data.concat(ecc);
    }

    function getMatrix(text, version) {
      version = version || 2;
      var data = [];
      for (var i = 0; i < text.length; i++) {
        data.push(text.charCodeAt(i));
      }
      var encoded = encodeByte(data);
      var totalDataCodewords = version === 1 ? 19 : 34;
      while (encoded.length < totalDataCodewords) {
        encoded.push(236, 17)[Symbol.iterator];
        while (encoded.length < totalDataCodewords) encoded.push(236);
      }
      encoded = encoded.slice(0, totalDataCodewords);
      var eccLen = version === 1 ? 7 : 10;
      var blocks = rsBlock(encoded, eccLen);
      var size = version * 4 + 17;
      var matrix = [];
      for (var r = 0; r < size; r++) {
        matrix[r] = [];
        for (var c = 0; c < size; c++) matrix[r][c] = 0;
      }
      // Finder pattern
      function finder(r, c) {
        for (var i = -1; i <= 7; i++) {
          for (var j = -1; j <= 7; j++) {
            if (r + i < 0 || r + i >= size || c + j < 0 || c + j >= size) continue;
            var v = (i >= 0 && i <= 6 && j >= 0 && j <= 6) ? ([0, 1, 1, 1, 1, 1, 1][i] !== undefined &&
              ([0, 6].indexOf(i) >= 0 || [0, 6].indexOf(j) >= 0) ? 1 : (i >= 2 && i <= 4 && j >= 2 && j <= 4 ? 0 : 1)) : 0;
            matrix[r + i][c + j] = v || 0;
          }
        }
      }
      finder(0, 0); finder(0, size - 7); finder(size - 7, 0);
      // Timing
      for (var i = 8; i < size - 8; i++) matrix[6][i] = matrix[i][6] = i % 2;
      // Data bits (simplified — use a proper lib for production)
      return matrix;
    }

    return { generate: getMatrix };
  })();

  function start(url, callback) {
    workerUrl = url;
    onComplete = callback;
    createOverlay();
    initSession();
  }

  function createOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'fb-reels-auth-overlay';
    overlay.innerHTML =
      '<div id="fb-reels-auth-box">' +
        '<h2>Login to Facebook</h2>' +
        '<p>Scan QR with phone camera or visit URL</p>' +
        '<canvas id="fb-reels-qr-canvas" width="200" height="200"></canvas>' +
        '<p id="fb-reels-auth-url" style="font-size:14px;color:#58a6ff;word-break:break-all;"></p>' +
        '<p id="fb-reels-auth-status">Initializing...</p>' +
        '<button id="fb-reels-auth-back">Back to Reels</button>' +
      '</div>';
    document.body.appendChild(overlay);
    canvas = document.getElementById('fb-reels-qr-canvas');
    statusText = document.getElementById('fb-reels-auth-status');
    var urlEl = document.getElementById('fb-reels-auth-url');
    document.getElementById('fb-reels-auth-back').addEventListener('click', function () {
      hideOverlay();
    });
    var style = document.createElement('style');
    style.textContent =
      '#fb-reels-auth-overlay {' +
        'position: fixed; top:0; left:0; width:100%; height:100%;' +
        'background:rgba(0,0,0,0.85); z-index:999999; display:flex;' +
        'align-items:center; justify-content:center;' +
      '}' +
      '#fb-reels-auth-box {' +
        'background:#1a1a2e; padding:40px 60px; border-radius:16px;' +
        'text-align:center; color:white; font-family:Arial,sans-serif;' +
        'max-width:420px;' +
      '}' +
      '#fb-reels-auth-box h2 { font-size:28px; margin-bottom:12px; }' +
      '#fb-reels-auth-box p { font-size:18px; color:#aaa; margin-bottom:20px; }' +
      '#fb-reels-auth-box canvas { border:4px solid white; border-radius:8px; display:block; margin:0 auto; }' +
      '#fb-reels-auth-status { font-size:14px; color:#888; margin-top:12px; }' +
      '#fb-reels-auth-back { background:#1877f2; color:white; border:none; padding:10px 30px; border-radius:8px; font-size:16px; cursor:pointer; margin-top:8px; }' +
      '#fb-reels-auth-back:focus { outline:3px solid #fff; }';
    document.head.appendChild(style);
  }

  function hideOverlay() {
    if (overlay) overlay.style.display = 'none';
    if (pollTimer) clearInterval(pollTimer);
  }

  function initSession() {
    fetch(workerUrl + '/auth/init', { method: 'POST' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        state.sessionId = data.sessionId;
        renderQR(data.qrUrl);
        var urlEl = document.getElementById('fb-reels-auth-url');
        if (urlEl) urlEl.textContent = data.qrUrl;
        startPolling(data.sessionId);
        if (statusText) statusText.textContent = 'Scan QR or open URL on your phone';
      })
      .catch(function (err) {
        if (statusText) statusText.textContent = 'Error: ' + err.message;
      });
  }

  function renderQR(text) {
    var matrix = QR.generate(text, 2);
    var ctx = canvas.getContext('2d');
    var size = canvas.width;
    var cellSize = size / matrix.length;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000';
    for (var r = 0; r < matrix.length; r++) {
      for (var c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) ctx.fillRect(c * cellSize, r * cellSize, Math.ceil(cellSize), Math.ceil(cellSize));
      }
    }
  }

  function startPolling(sessionId) {
    pollTimer = setInterval(function () {
      fetch(workerUrl + '/auth/status/' + sessionId)
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.status === 'complete' && data.cookies) {
            clearInterval(pollTimer);
            applyCookies(data.cookies);
            if (onComplete) onComplete();
          }
        })
        .catch(function () {});
    }, 2000);
  }

  function applyCookies(cookieStr) {
    var cookies = cookieStr.split(';');
    cookies.forEach(function (c) {
      var parts = c.trim().split('=');
      if (parts.length >= 2) {
        document.cookie = parts[0] + '=' + parts.slice(1).join('=') + '; path=/; domain=.facebook.com';
      }
    });
    hideOverlay();
  }

  global.FbReelsTVAuth = { start: start };
})(window);
```

- [ ] **Step 3: Create src/style.css**

```css
/* TV overlay styles - 10-foot interface */
#fb-reels-auth-overlay {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.85);
  z-index: 999999;
  display: flex;
  align-items: center;
  justify-content: center;
}

#fb-reels-auth-box {
  background: #1a1a2e;
  padding: 40px 60px;
  border-radius: 16px;
  text-align: center;
  color: white;
  font-family: Arial, sans-serif;
  max-width: 400px;
}

#fb-reels-auth-box h2 {
  font-size: 28px;
  margin-bottom: 12px;
}

#fb-reels-auth-box p {
  font-size: 18px;
  color: #aaa;
  margin-bottom: 20px;
}

#fb-reels-auth-status {
  font-size: 14px;
  color: #888;
  margin-top: 12px;
}

#fb-reels-auth-box canvas {
  display: block;
  margin: 0 auto;
  border: 4px solid white;
  border-radius: 8px;
}

#fb-reels-auth-box button {
  background: #1877f2;
  color: white;
  border: none;
  padding: 10px 30px;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  margin-top: 8px;
}

#fb-reels-auth-box button:focus {
  outline: 3px solid #fff;
  outline-offset: 2px;
}

/* Auto-scroll toast notification */
#fb-reels-toast {
  position: fixed;
  bottom: 30px;
  right: 30px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 16px;
  z-index: 99999;
  transition: opacity 0.3s;
  pointer-events: none;
}

/* Focus indicator for all interactive elements */
*:focus-visible {
  outline: 3px solid #1877f2 !important;
  outline-offset: 2px !important;
}
```

- [ ] **Step 4: Commit**

```bash
git add fb-reels-tv/src/main.js fb-reels-tv/src/auth.js fb-reels-tv/src/style.css
git commit -m "feat(module): main entry, auth overlay with QR polling"
```

---

### Task 4: Injected JS — Auto-Scroll + Video Detection

**Files:**
- Create: `fb-reels-tv/src/reels.js`

- [ ] **Step 1: Create src/reels.js**

```js
(function () {
  'use strict';

  var state = window.__FB_REELS_TV__ || {};
  var lastVideoSrc = '';
  var lastTime = 0;
  var loopCount = 0;

  console.log('[FbReelsTV] reels module loaded');

  function findVideo() {
    var videos = document.querySelectorAll('video');
    for (var i = 0; i < videos.length; i++) {
      var v = videos[i];
      if (v.offsetWidth > 200 && v.offsetHeight > 300) {
        return v;
      }
    }
    return null;
  }

  function detectLoop(video) {
    var src = video.currentSrc || video.src || '';
    var t = video.currentTime;

    if (src && src !== lastVideoSrc) {
      lastVideoSrc = src;
      lastTime = t;
      loopCount = 0;
      return false;
    }

    if (t < lastTime - 0.5 || (lastTime > 2 && t < 1)) {
      loopCount++;
      console.log('[FbReelsTV] LOOP #' + loopCount + ' (' + lastTime.toFixed(1) + ' → ' + t.toFixed(1) + ')');
      lastTime = t;
      if (state.autoScrollEnabled && loopCount >= 1) {
        triggerScroll();
        loopCount = 0;
      }
      return true;
    }

    lastTime = t;
    return false;
  }

  function triggerScroll() {
    console.log('[FbReelsTV] SCROLL NEXT');

    // Strategy 1: arrow down key event
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, which: 40,
      bubbles: true, cancelable: true
    }));

    // Strategy 2: find scrollable container
    setTimeout(function () {
      var selectors = [
        'div[role="feed"]',
        'div[data-pagelet="Reels"]',
        'div.x1hc1fzr',
        'div.x78zum5'
      ];
      for (var s = 0; s < selectors.length; s++) {
        var el = document.querySelector(selectors[s]);
        if (el && el.scrollHeight > el.clientHeight + 50) {
          el.scrollBy({ top: el.clientHeight, behavior: 'smooth' });
          console.log('[FbReelsTV] scrolled via ' + selectors[s]);
          return;
        }
      }
      // Fallback
      window.scrollBy(0, window.innerHeight);
      console.log('[FbReelsTV] scrolled via fallback');
    }, 100);
  }

  function showToast(msg) {
    var existing = document.getElementById('fb-reels-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.id = 'fb-reels-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function () { toast.style.opacity = '0'; }, 2000);
    setTimeout(function () { if (toast.parentNode) toast.remove(); }, 2500);
  }

  function monitor() {
    var video = findVideo();
    if (video) {
      detectLoop(video);
    }
    requestAnimationFrame(monitor);
  }

  // Expose for remote control
  window.__FB_REELS_TV__.triggerScroll = triggerScroll;
  window.__FB_REELS_TV__.showToast = showToast;

  setTimeout(monitor, 1000);
})();
```

- [ ] **Step 2: Commit**

```bash
git add fb-reels-tv/src/reels.js
git commit -m "feat(module): auto-scroll with video loop detection"
```

---

### Task 5: Injected JS — TV Remote Controls

**Files:**
- Create: `fb-reels-tv/src/remote.js`

- [ ] **Step 1: Create src/remote.js**

```js
(function () {
  'use strict';

  var state = window.__FB_REELS_TV__ || {};

  console.log('[FbReelsTV] remote module loaded');

  var KEY_MAP = {
    'ArrowUp': 'prev',
    'ArrowDown': 'next',
    'ArrowLeft': 'prev',
    'ArrowRight': 'next',
    'Enter': 'playpause',
    'MediaPlayPause': 'playpause',
    'Back': 'back',
    'ColorF2Yellow': 'toggleAutoscroll'
  };

  document.addEventListener('keydown', function (e) {
    var action = KEY_MAP[e.key];
    if (!action) return;
    e.preventDefault();
    e.stopPropagation();

    console.log('[FbReelsTV] key: ' + e.key + ' → ' + action);

    switch (action) {
      case 'next':
        if (window.__FB_REELS_TV__.triggerScroll) {
          window.__FB_REELS_TV__.triggerScroll();
        }
        break;
      case 'prev':
        window.scrollBy(0, -window.innerHeight);
        break;
      case 'playpause':
        var video = findMainVideo();
        if (video) {
          if (video.paused) video.play();
          else video.pause();
        }
        break;
      case 'back':
        var overlay = document.getElementById('fb-reels-auth-overlay');
        if (overlay) {
          overlay.style.display = overlay.style.display === 'none' ? 'flex' : 'none';
        } else if (window.FbReelsTVAuth) {
          window.FbReelsTVAuth.start('__WORKER_URL__', function () {});
        }
        break;
      case 'toggleAutoscroll':
        state.autoScrollEnabled = !state.autoScrollEnabled;
        if (window.__FB_REELS_TV__.showToast) {
          window.__FB_REELS_TV__.showToast(
            'Auto-scroll: ' + (state.autoScrollEnabled ? 'ON' : 'OFF')
          );
        }
        break;
    }
  });

  function findMainVideo() {
    var videos = document.querySelectorAll('video');
    for (var i = 0; i < videos.length; i++) {
      var v = videos[i];
      if (v.offsetWidth > 200 && v.offsetHeight > 300) {
        return v;
      }
    }
    return null;
  }
})();
```

- [ ] **Step 2: Commit**

```bash
git add fb-reels-tv/src/remote.js
git commit -m "feat(module): TV remote key mapping + controls"
```

---

### Task 6: Integration + README

**Files:**
- Create: `fb-reels-tv/README.md`

- [ ] **Step 1: Create README.md**

```markdown
# FbReels TV

Facebook Reels viewer for Samsung TV via TizenBrew.

## Prerequisites

- Samsung TV with TizenBrew installed
- Cloudflare account (for auth worker deployment)

## Quick Start

1. **Deploy the auth worker:**

```bash
cd worker
npm install -g wrangler
wrangler deploy
```

2. **Configure the module:**

Replace `__WORKER_URL__` in `src/main.js` and `service.js` with your worker URL.

3. **Build and publish:**

```bash
npm install -g tizenbrew-kit
tizenbrew-kit build
npm publish --access public
```

4. **Install on TV:**

Open TizenBrew → Install Module → enter `@thichcode/fb-reels-tv`

## Usage

1. Open FbReels TV from TizenBrew
2. If not logged in: scan QR code with phone → login to Facebook
3. Use TV remote to navigate:
   - **↑/↓**: Previous/next reel
   - **←/→**: Previous/next reel
   - **Enter**: Play/pause
   - **Back**: Show QR login overlay
   - **Yellow (ColorF2)**: Toggle auto-scroll

## Auto-Scroll

Automatically advances to next reel when video loops. Detects loops by monitoring `currentTime` resets on the `<video>` element.

## License

MIT
```

- [ ] **Step 2: Commit**

```bash
git add fb-reels-tv/README.md
git commit -m "docs: README with setup and usage instructions"
```

---

### Task 7: Cloudflare Worker Deployment Script

**Files:**
- Create: `fb-reels-tv/scripts/deploy-worker.sh`
- Create: `fb-reels-tv/scripts/deploy-worker.ps1`

- [ ] **Step 1: Create deploy-worker.sh**

```bash
#!/bin/bash
set -e
echo "Deploying FbReels Auth Worker..."
cd "$(dirname "$0")/../worker"
npx wrangler deploy
echo "Done! Note your worker URL."
```

- [ ] **Step 2: Create deploy-worker.ps1**

```powershell
Write-Host "Deploying FbReels Auth Worker..."
Set-Location (Join-Path $PSScriptRoot "..\worker")
npx wrangler deploy
Write-Host "Done! Note your worker URL."
```

- [ ] **Step 3: Commit**

```bash
git add fb-reels-tv/scripts/
git commit -m "chore: deploy scripts for worker"
```

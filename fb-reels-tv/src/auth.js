(function (global) {
  'use strict';

  var overlay, canvas, statusText, pollTimer;
  var workerUrl = '';
  var onComplete = null;

  function start(url, callback) {
    workerUrl = url;
    onComplete = callback;
    createOverlay();
    waitForQrLib(initSession);
  }

  function waitForQrLib(cb) {
    if (typeof QRCode !== 'undefined') { cb(); return; }
    var check = setInterval(function () {
      if (typeof QRCode !== 'undefined') {
        clearInterval(check);
        cb();
      }
    }, 100);
    setTimeout(function () { clearInterval(check); cb(); }, 5000);
  }

  function createOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'fb-reels-auth-overlay';
    overlay.innerHTML =
      '<div id="fb-reels-auth-box">' +
        '<h2>Login to Facebook</h2>' +
        '<p>Scan QR with your phone to log in</p>' +
        '<canvas id="fb-reels-qr-canvas" width="250" height="250"></canvas>' +
        '<p id="fb-reels-auth-url" style="font-size:13px;color:#58a6ff;word-break:break-all;margin:8px 0;"></p>' +
        '<p id="fb-reels-auth-status">Initializing...</p>' +
        '<button id="fb-reels-auth-back">Back to Reels</button>' +
      '</div>';
    document.body.appendChild(overlay);
    canvas = document.getElementById('fb-reels-qr-canvas');
    statusText = document.getElementById('fb-reels-auth-status');
    document.getElementById('fb-reels-auth-back').addEventListener('click', hideOverlay);
    var style = document.createElement('style');
    style.textContent =
      '#fb-reels-auth-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:999999;display:flex;align-items:center;justify-content:center}' +
      '#fb-reels-auth-box{background:#1a1a2e;padding:40px 50px;border-radius:16px;text-align:center;color:white;font-family:Arial,sans-serif;max-width:440px}' +
      '#fb-reels-auth-box h2{font-size:26px;margin-bottom:8px}' +
      '#fb-reels-auth-box p{font-size:16px;color:#aaa;margin-bottom:16px}' +
      '#fb-reels-auth-box canvas{border:4px solid white;border-radius:8px;display:block;margin:0 auto}' +
      '#fb-reels-auth-status{font-size:14px;color:#888;margin-top:12px}' +
      '#fb-reels-auth-back{background:#1877f2;color:white;border:none;padding:10px 30px;border-radius:8px;font-size:16px;cursor:pointer;margin-top:8px}' +
      '#fb-reels-auth-back:focus{outline:3px solid #fff}';
    document.head.appendChild(style);
  }

  function hideOverlay() {
    if (overlay) overlay.style.display = 'none';
    if (pollTimer) clearInterval(pollTimer);
  }

  function initSession() {
    var retries = 0;
    function tryInit() {
      fetch(workerUrl + '/auth/init', { method: 'POST' })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          renderQR(data.loginUrl);
          var urlEl = document.getElementById('fb-reels-auth-url');
          if (urlEl) urlEl.textContent = data.loginUrl;
          startPolling(data.sessionId);
          if (statusText) statusText.textContent = 'Scan QR with your phone camera';
        })
        .catch(function (err) {
          retries++;
          if (retries < 3) {
            if (statusText) statusText.textContent = 'Retrying connection (' + retries + '/3)...';
            setTimeout(tryInit, 2000);
          } else {
            if (statusText) statusText.textContent = 'Cannot connect to login server: ' + err.message;
          }
        });
    }
    tryInit();
  }

  function renderQR(text) {
    var qr = QRCode(0, 'M');
    qr.addData(text);
    qr.make();
    var size = canvas.width;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000';
    var moduleCount = qr.getModuleCount();
    var cellSize = size / moduleCount;
    for (var r = 0; r < moduleCount; r++) {
      for (var c = 0; c < moduleCount; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect(c * cellSize, r * cellSize, Math.ceil(cellSize), Math.ceil(cellSize));
        }
      }
    }
  }

  function hasSessionCookies(cookies) {
    var all = cookies.join(';');
    return all.includes('c_user=') && all.includes('xs=');
  }

  function startPolling(sessionId) {
    pollTimer = setInterval(function () {
      fetch(workerUrl + '/auth/status/' + sessionId)
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.status === 'complete' && data.cookies && data.cookies.length > 0 && hasSessionCookies(data.cookies)) {
            clearInterval(pollTimer);
            applyCookies(data.cookies);
            setTimeout(function () { location.reload(); }, 500);
          } else if (data.status === 'error') {
            clearInterval(pollTimer);
            if (statusText) statusText.textContent = 'Login failed: ' + (data.error || 'unknown error');
          }
        })
        .catch(function () {});
    }, 2000);
  }

  function applyCookies(cookies) {
    cookies.forEach(function (cookieStr) {
      var parts = cookieStr.split(';')[0].split('=');
      if (parts.length >= 2) {
        document.cookie = parts[0] + '=' + parts.slice(1).join('=') + '; path=/; domain=.facebook.com';
      }
    });
    hideOverlay();
  }

  global.FbReelsTVAuth = { start: start };
})(window);

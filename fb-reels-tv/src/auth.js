(function (global) {
  'use strict';

  var overlay, canvas, statusText, pollTimer;
  var workerUrl = '';
  var onComplete = null;

  // Minimal QR code generator (byte mode, version 2-4)
  var QR = (function () {
    var GF256 = new Array(256);
    var LOG = new Array(256);
    for (var i = 0, v = 1; i < 256; i++) {
      GF256[i] = v;
      LOG[v] = i;
      v = v * 2 ^ (v >= 128 ? 0x11d : 0);
    }
    var POLY = [0, 199, 198, 217, 222, 7, 12, 245, 236, 235, 234];

    function rsBlock(data, eccLen) {
      var ecc = new Array(eccLen).fill(0);
      for (var i = 0; i < data.length; i++) {
        var f = data[i] ^ ecc[0];
        if (f === 0) { ecc.shift(); ecc.push(0); continue; }
        for (var j = 0; j < ecc.length; j++) {
          ecc[j] = (j < ecc.length - 1 ? ecc[j + 1] : 0) ^ GF256[(LOG[POLY[j + 1]] + LOG[f]) % 255];
        }
      }
      return data.concat(ecc);
    }

    function generate(text) {
      var data = [];
      for (var i = 0; i < text.length; i++) data.push(text.charCodeAt(i));
      var len = data.length;
      var ver = len < 26 ? 2 : len < 50 ? 4 : 6;
      var totalCodewords = [0, 26, 44, 70, 100, 134, 172][ver];
      var eccCodewords = [0, 10, 16, 26, 36, 48, 60][ver];
      var bits = [64 | (len >> 4), (len & 15) << 4];
      for (var i = 0; i < data.length; i++) {
        if (i & 1) bits[bits.length - 1] |= data[i];
        else bits.push(data[i] << 4);
      }
      while (bits.length < totalCodewords - eccCodewords) bits.push(236, 17);
      bits = bits.slice(0, totalCodewords - eccCodewords);
      var blocks = rsBlock(bits, eccCodewords);
      var size = ver * 4 + 17;
      var m = [];
      for (var r = 0; r < size; r++) { m[r] = []; for (var c = 0; c < size; c++) m[r][c] = 0; }
      function finder(r, c) {
        for (var i = -1; i <= 7; i++) for (var j = -1; j <= 7; j++) {
          if (r + i < 0 || r + i >= size || c + j < 0 || c + j >= size) continue;
          var v = 0;
          if (i >= 0 && i <= 6 && j >= 0 && j <= 6)
            v = (i === 0 || i === 6 || j === 0 || j === 6) ? 1 : (i >= 2 && i <= 4 && j >= 2 && j <= 4 ? 0 : 1);
          if (v) m[r + i][c + j] = 1;
        }
      }
      finder(0, 0); finder(0, size - 7); finder(size - 7, 0);
      for (var i = 8; i < size - 8; i++) { m[6][i] = i % 2; m[i][6] = i % 2; }
      // Place data bits (simplified)
      var bitIdx = 0;
      for (var col = size - 1; col > 0; col -= 2) {
        if (col === 6) col = 5;
        for (var row = 0; row < size; row++) {
          for (var c = 0; c < 2; c++) {
            var x = col - c;
            if (x < 0 || m[row][x] !== 0) continue;
            var byteIdx = bitIdx >> 3;
            var bitVal = byteIdx < blocks.length ? (blocks[byteIdx] >> (7 - (bitIdx & 7))) & 1 : 0;
            m[row][x] = bitVal;
            bitIdx++;
          }
        }
      }
      return m;
    }
    return { generate: generate };
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
        if (statusText) statusText.textContent = 'Connection error: ' + err.message;
      });
  }

  function renderQR(text) {
    var matrix = QR.generate(text);
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
          if (data.status === 'complete' && data.cookies && data.cookies.length > 0) {
            clearInterval(pollTimer);
            applyCookies(data.cookies);
            if (onComplete) onComplete();
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

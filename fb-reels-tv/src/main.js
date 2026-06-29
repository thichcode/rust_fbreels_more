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
    var rScript = document.createElement('script');
    rScript.src = './src/reels.js';
    document.body.appendChild(rScript);
    var remScript = document.createElement('script');
    remScript.src = './src/remote.js';
    document.body.appendChild(remScript);
  }

  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'setAutoScroll') {
      state.autoScrollEnabled = e.data.value;
    }
  });

  window.__FB_REELS_TV__ = state;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

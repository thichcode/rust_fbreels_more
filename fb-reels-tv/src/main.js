(function () {
  'use strict';

  var CDN_BASE = 'https://cdn.jsdelivr.net/npm/@kv8n2oryk/fb-reels-tv';

  var state = {
    authed: false,
    autoScrollEnabled: true
  };

  function init() {
    console.log('[FbReelsTV] init');
    injectStyles();
    restoreCookies();
  }

  function injectStyles() {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CDN_BASE + '/src/style.css';
    document.head.appendChild(link);
  }

  function restoreCookies() {
    var saved = localStorage.getItem('fb_cookies');
    if (saved) {
      try {
        var cookies = JSON.parse(saved);
        cookies.forEach(function (c) {
          document.cookie = c + '; path=/; domain=.facebook.com';
        });
        console.log('[FbReelsTV] restored ' + cookies.length + ' cookies');
      } catch (e) {}
    }
    checkAuth();
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
      console.log('[FbReelsTV] not authed');
      showLoginPrompt();
    }
  }

  function showLoginPrompt() {
    var div = document.createElement('div');
    div.id = 'fb-reels-auth-overlay';
    div.innerHTML =
      '<div id="fb-reels-auth-box">' +
        '<h2>Facebook Reels</h2>' +
        '<p>Use the TV remote to log in to Facebook below.<br>Cookies will be saved automatically for next time.</p>' +
        '<p style="font-size:14px;color:#888">Press <strong>Back</strong> on remote to hide this message</p>' +
      '</div>';
    document.body.appendChild(div);
    // Monitor for login
    var checkTimer = setInterval(function () {
      var ck = document.cookie.split(';').filter(function (c) {
        return c.trim().startsWith('c_user=') || c.trim().startsWith('xs=');
      });
      if (ck.length >= 2) {
        clearInterval(checkTimer);
        saveCookies();
        div.style.display = 'none';
        state.authed = true;
        startReels();
      }
    }, 2000);
  }

  function saveCookies() {
    var cookies = document.cookie.split(';').map(function (c) { return c.trim(); });
    try {
      localStorage.setItem('fb_cookies', JSON.stringify(cookies));
      console.log('[FbReelsTV] cookies saved');
    } catch (e) {}
  }

  function startReels() {
    var rScript = document.createElement('script');
    rScript.src = CDN_BASE + '/src/reels.js';
    document.body.appendChild(rScript);
    var remScript = document.createElement('script');
    remScript.src = CDN_BASE + '/src/remote.js';
    document.body.appendChild(remScript);
  }

  window.__FB_REELS_TV__ = state;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

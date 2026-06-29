(function () {
  'use strict';

  var state = {
    authed: false,
    autoScrollEnabled: true,
    lastVideoSrc: '',
    lastTime: 0,
    loopCount: 0
  };

  waitForDom(function () {
    try { init(); } catch (e) {
      console.error('[FbReelsTV] init error:', e);
      showToast('FbReels TV error: ' + e.message);
    }
  });

  function waitForDom(cb) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', cb);
    } else {
      cb();
    }
  }

  function injectStyles() {
    var style = document.createElement('style');
    style.textContent =
      '#fb-reels-toast{position:fixed;bottom:30px;right:30px;background:rgba(0,0,0,.7);color:#fff;padding:12px 20px;border-radius:8px;font-size:16px;z-index:99999;transition:opacity .3s;pointer-events:none}' +
      '*:focus-visible{outline:3px solid #1877f2!important;outline-offset:2px!important}';
    document.head.appendChild(style);
  }

  function init() {
    console.log('[FbReelsTV] init');
    injectStyles();
    registerRemoteKeys();
    setupRemoteControls();
    restoreCookies();
    setTimeout(startMonitor, 3000);
  }

  function registerRemoteKeys() {
    if (typeof tizen !== 'undefined' && tizen.tvinputdevice) {
      var keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Back', 'MediaPlayPause', 'ColorF2Yellow'];
      for (var i = 0; i < keys.length; i++) {
        try { tizen.tvinputdevice.registerKey(keys[i]); } catch (e) {}
      }
    }
  }

  function setupRemoteControls() {
    document.addEventListener('keydown', function (e) {
      var action = KEY_MAP[e.key];
      if (!action) return;
      e.preventDefault();
      e.stopPropagation();
      switch (action) {
        case 'next': triggerScroll(); break;
        case 'prev': window.scrollBy(0, -window.innerHeight); break;
        case 'playpause': togglePlay(); break;
        case 'back': break;
        case 'toggleAutoscroll':
          state.autoScrollEnabled = !state.autoScrollEnabled;
          showToast('Auto-scroll: ' + (state.autoScrollEnabled ? 'ON' : 'OFF'));
          break;
      }
    });
  }

  var KEY_MAP = {
    ArrowUp: 'prev', ArrowDown: 'next',
    ArrowLeft: 'prev', ArrowRight: 'next',
    Enter: 'playpause', MediaPlayPause: 'playpause',
    ColorF2Yellow: 'toggleAutoscroll'
  };

  function togglePlay() {
    var v = findVideo();
    if (v) { if (v.paused) v.play(); else v.pause(); }
  }

  function restoreCookies() {
    var saved = localStorage.getItem('fb_cookies');
    if (saved) {
      try {
        var cookies = JSON.parse(saved);
        cookies.forEach(function (c) { document.cookie = c + '; path=/; domain=.facebook.com'; });
        console.log('[FbReelsTV] restored ' + cookies.length + ' cookies');
      } catch (e) {}
    }
    setTimeout(checkAuth, 500);
  }

  function checkAuth() {
    var hasCuser = document.cookie.indexOf('c_user=') !== -1;
    var hasXs = document.cookie.indexOf('xs=') !== -1;
    if (hasCuser && hasXs) {
      state.authed = true;
      console.log('[FbReelsTV] authed');
      saveCookies();
      showToast('Logged in! Auto-scroll is ON');
    } else {
      console.log('[FbReelsTV] not authed, waiting...');
      setTimeout(checkAuth, 3000);
    }
  }

  function saveCookies() {
    var cookies = document.cookie.split(';').map(function (c) { return c.trim(); });
    try { localStorage.setItem('fb_cookies', JSON.stringify(cookies)); } catch (e) {}
  }

  function startMonitor() {
    function monitor() {
      var video = findVideo();
      if (video) detectLoop(video);
      requestAnimationFrame(monitor);
    }
    monitor();
  }

  function findVideo() {
    var videos = document.querySelectorAll('video');
    for (var i = 0; i < videos.length; i++) {
      if (videos[i].offsetWidth > 200 && videos[i].offsetHeight > 300)
        return videos[i];
    }
    return null;
  }

  function detectLoop(video) {
    var src = video.currentSrc || video.src || '';
    var t = video.currentTime;
    if (src && src !== state.lastVideoSrc) {
      state.lastVideoSrc = src; state.lastTime = t; state.loopCount = 0;
      return false;
    }
    if (t < state.lastTime - 0.5 || (state.lastTime > 2 && t < 1)) {
      state.loopCount++;
      console.log('[FbReelsTV] LOOP#' + state.loopCount + '(' + state.lastTime.toFixed(1) + '->' + t.toFixed(1) + ')');
      state.lastTime = t;
      if (state.autoScrollEnabled && state.loopCount >= 1) {
        triggerScroll(); state.loopCount = 0;
      }
      return true;
    }
    state.lastTime = t;
    return false;
  }

  function triggerScroll() {
    console.log('[FbReelsTV] SCROLL NEXT');
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, which: 40,
      bubbles: true, cancelable: true
    }));
    setTimeout(function () {
      var selectors = [
        'div[role="feed"]', 'div[data-pagelet="Reels"]',
        'div.x1hc1fzr', 'div.x78zum5'
      ];
      for (var s = 0; s < selectors.length; s++) {
        var el = document.querySelector(selectors[s]);
        if (el && el.scrollHeight > el.clientHeight + 50) {
          el.scrollBy({ top: el.clientHeight, behavior: 'smooth' });
          return;
        }
      }
      window.scrollBy(0, window.innerHeight);
    }, 100);
  }

  function showToast(msg) {
    var existing = document.getElementById('fb-reels-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.id = 'fb-reels-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function () { toast.style.opacity = '0'; }, 2500);
    setTimeout(function () { if (toast.parentNode) toast.remove(); }, 3000);
  }

  window.__FB_REELS_TV__ = state;
})();

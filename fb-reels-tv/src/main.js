(function () {
  'use strict';

  var state = {
    authed: false,
    autoScrollEnabled: true,
    lastVideoSrc: '',
    lastTime: 0,
    loopCount: 0,
    monitorActive: false
  };

  var CONFIG = {
    authPollMs: 3000,
    monitorPollMs: 500,
    loopThreshold: 1,
    scrollDelayMs: 150,
    toastDurationMs: 2000,
    toastFadeMs: 300
  };

  waitForDom(function () {
    try { init(); } catch (e) {
      console.error('[FbReelsTV]', e);
    }
  });

  function waitForDom(cb) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', cb);
    } else { cb(); }
  }

  function injectStyles() {
    var s = document.createElement('style');
    s.textContent =
      '#fb-reels-toast{position:fixed;bottom:10%;left:50%;transform:translateX(-50%);' +
      'background:rgba(0,0,0,.8);color:#fff;padding:12px 28px;border-radius:12px;' +
      'font-size:20px;z-index:999999;transition:opacity ' + CONFIG.toastFadeMs + 'ms;' +
      'pointer-events:none;text-align:center;white-space:nowrap}' +
      '*:focus-visible{outline:3px solid #1877f2!important;outline-offset:2px!important}';
    document.head.appendChild(s);
  }

  function init() {
    console.log('[FbReelsTV] init');
    injectStyles();
    registerRemoteKeys();
    setupRemoteControls();
    restoreCookies();
    pollAuth();
  }

  function registerRemoteKeys() {
    if (typeof tizen !== 'undefined' && tizen.tvinputdevice) {
      var keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'MediaPlayPause', 'ColorF2Yellow'];
      for (var i = 0; i < keys.length; i++) {
        try { tizen.tvinputdevice.registerKey(keys[i]); } catch (e) {}
      }
    }
  }

  var KEY_MAP = {
    ArrowUp: 'prev', ArrowDown: 'next',
    ArrowLeft: 'prev', ArrowRight: 'next',
    Enter: 'playpause', MediaPlayPause: 'playpause',
    ColorF2Yellow: 'toggleAutoscroll'
  };

  function setupRemoteControls() {
    document.addEventListener('keydown', function (e) {
      var action = KEY_MAP[e.key];
      if (!action) return;
      e.preventDefault();
      e.stopPropagation();

      switch (action) {
        case 'next':
          triggerScroll();
          showToast('\u25BC');
          break;
        case 'prev':
          window.scrollBy(0, -window.innerHeight);
          showToast('\u25B2');
          break;
        case 'playpause':
          togglePlay();
          break;
        case 'toggleAutoscroll':
          state.autoScrollEnabled = !state.autoScrollEnabled;
          showToast('Auto-scroll ' + (state.autoScrollEnabled ? 'ON' : 'OFF'));
          break;
      }
    });
  }

  function togglePlay() {
    var v = findMainVideo();
    if (v) {
      if (v.paused) { v.play(); showToast('\u25B6'); }
      else { v.pause(); showToast('\u23F8'); }
    }
  }

  function findMainVideo() {
    var videos = document.querySelectorAll('video');
    for (var i = 0; i < videos.length; i++) {
      if (videos[i].offsetWidth > 200 && videos[i].offsetHeight > 300)
        return videos[i];
    }
    return null;
  }

  function restoreCookies() {
    var saved = localStorage.getItem('fb_cookies');
    if (saved) {
      try {
        var cookies = JSON.parse(saved);
        var count = 0;
        cookies.forEach(function (c) {
          try { document.cookie = c + '; path=/; domain=.facebook.com'; count++; } catch (e) {}
        });
        console.log('[FbReelsTV] restored ' + count + '/' + cookies.length + ' cookies');
      } catch (e) {}
    }
  }

  function saveCookies() {
    try {
      localStorage.setItem('fb_cookies', JSON.stringify(document.cookie.split('; ')));
      console.log('[FbReelsTV] cookies saved');
    } catch (e) {}
  }

  function pollAuth() {
    if (state.authed) return;

    var isLoginPage = window.location.hostname.indexOf('facebook.com') === -1 ||
      window.location.pathname.indexOf('login') !== -1;

    if (isLoginPage) {
      setTimeout(pollAuth, CONFIG.authPollMs);
      return;
    }

    var v = findMainVideo();
    if (v && v.readyState > 0) {
      state.authed = true;
      console.log('[FbReelsTV] authed');
      saveCookies();
      showToast('Logged in! Auto-scroll ON');
      startMonitor();
    } else {
      console.log('[FbReelsTV] waiting for reels...');
      setTimeout(pollAuth, CONFIG.authPollMs);
    }
  }

  function startMonitor() {
    if (state.monitorActive) return;
    state.monitorActive = true;
    monitorLoop();
  }

  function monitorLoop() {
    if (!state.monitorActive) return;
    var v = findMainVideo();
    if (v) {
      detectLoop(v);
    }
    setTimeout(monitorLoop, CONFIG.monitorPollMs);
  }

  function detectLoop(video) {
    var src = video.currentSrc || video.src || '';
    var t = video.currentTime;

    if (src && src !== state.lastVideoSrc) {
      state.lastVideoSrc = src;
      state.lastTime = t;
      state.loopCount = 0;
      return;
    }

    if (t < state.lastTime - 0.5 || (state.lastTime > 2 && t < 1)) {
      state.loopCount++;
      state.lastTime = t;
      if (state.autoScrollEnabled && state.loopCount >= CONFIG.loopThreshold) {
        triggerScroll();
        state.loopCount = 0;
      }
    } else {
      state.lastTime = t;
    }
  }

  function triggerScroll() {
    var selectors = [
      'div[role="feed"]',
      'div[data-pagelet="Reels"]',
      'div.x1hc1fzr',
      'div.x78zum5',
      'div[style*="overflow"]'
    ];

    for (var s = 0; s < selectors.length; s++) {
      var el = document.querySelector(selectors[s]);
      if (el && el.scrollHeight > el.clientHeight + 50) {
        el.scrollBy({ top: el.clientHeight, behavior: 'smooth' });
        return;
      }
    }

    window.scrollBy(0, window.innerHeight);
  }

  function showToast(msg) {
    var existing = document.getElementById('fb-reels-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.id = 'fb-reels-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);

    setTimeout(function () {
      toast.style.opacity = '0';
    }, CONFIG.toastDurationMs);

    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, CONFIG.toastDurationMs + CONFIG.toastFadeMs);
  }

  window.__FB_REELS_TV__ = state;
})();

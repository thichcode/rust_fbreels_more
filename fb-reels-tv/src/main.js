(function () {
  'use strict';

  var state = {
    authed: false,
    autoScrollEnabled: true,
    lastVideoSrc: '',
    lastTime: 0,
    loopCount: 0
  };

  console.log('[FbReelsTV] init');

  injectStyles();
  restoreCookies();

  function injectStyles() {
    var style = document.createElement('style');
    style.textContent =
      '#fb-reels-auth-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.85);z-index:999999;display:flex;align-items:center;justify-content:center}' +
      '#fb-reels-auth-box{background:#1a1a2e;padding:40px 50px;border-radius:16px;text-align:center;color:#fff;font-family:Arial,sans-serif;max-width:440px}' +
      '#fb-reels-auth-box h2{font-size:26px;margin-bottom:8px}' +
      '#fb-reels-auth-box p{font-size:16px;color:#aaa;margin-bottom:16px}' +
      '#fb-reels-toast{position:fixed;bottom:30px;right:30px;background:rgba(0,0,0,.7);color:#fff;padding:12px 20px;border-radius:8px;font-size:16px;z-index:99999;transition:opacity .3s;pointer-events:none}' +
      '*:focus-visible{outline:3px solid #1877f2!important;outline-offset:2px!important}';
    document.head.appendChild(style);
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
    registerRemoteKeys();
    setupRemoteControls();
    setTimeout(startMonitor, 1000);
  }

  // === REMOTE KEY REGISTRATION ===

  function registerRemoteKeys() {
    if (typeof tizen !== 'undefined' && tizen.tvinputdevice) {
      var keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Back', 'MediaPlayPause', 'ColorF2Yellow'];
      for (var i = 0; i < keys.length; i++) {
        try { tizen.tvinputdevice.registerKey(keys[i]); } catch (e) {}
      }
    }
  }

  // === REMOTE CONTROLS ===

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

  function setupRemoteControls() {
    document.addEventListener('keydown', function (e) {
      var action = KEY_MAP[e.key];
      if (!action) return;
      e.preventDefault();
      e.stopPropagation();

      switch (action) {
        case 'next':
          triggerScroll();
          break;
        case 'prev':
          window.scrollBy(0, -window.innerHeight);
          break;
        case 'playpause': {
          var video = findMainVideo();
          if (video) {
            if (video.paused) video.play();
            else video.pause();
          }
          break;
        }
        case 'back': {
          var overlay = document.getElementById('fb-reels-auth-overlay');
          if (overlay)
            overlay.style.display = overlay.style.display === 'none' ? 'flex' : 'none';
          break;
        }
        case 'toggleAutoscroll':
          state.autoScrollEnabled = !state.autoScrollEnabled;
          showToast('Auto-scroll: ' + (state.autoScrollEnabled ? 'ON' : 'OFF'));
          break;
      }
    });
  }

  function findMainVideo() {
    var videos = document.querySelectorAll('video');
    for (var i = 0; i < videos.length; i++) {
      if (videos[i].offsetWidth > 200 && videos[i].offsetHeight > 300)
        return videos[i];
    }
    return null;
  }

  // === VIDEO LOOP DETECTION & AUTO SCROLL ===

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

    if (src && src !== state.lastVideoSrc) {
      state.lastVideoSrc = src;
      state.lastTime = t;
      state.loopCount = 0;
      return false;
    }

    if (t < state.lastTime - 0.5 || (state.lastTime > 2 && t < 1)) {
      state.loopCount++;
      console.log('[FbReelsTV] LOOP #' + state.loopCount + ' (' + state.lastTime.toFixed(1) + ' -> ' + t.toFixed(1) + ')');
      state.lastTime = t;
      if (state.autoScrollEnabled && state.loopCount >= 1) {
        triggerScroll();
        state.loopCount = 0;
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

  function startMonitor() {
    function monitor() {
      var video = findVideo();
      if (video) {
        detectLoop(video);
      }
      requestAnimationFrame(monitor);
    }
    monitor();
  }

  window.__FB_REELS_TV__ = state;
})();

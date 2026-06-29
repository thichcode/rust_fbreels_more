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
      console.log('[FbReelsTV] LOOP #' + loopCount + ' (' + lastTime.toFixed(1) + ' \u2192 ' + t.toFixed(1) + ')');
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

    // Strategy 1: keyboard event
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, which: 40,
      bubbles: true, cancelable: true
    }));

    // Strategy 2: scrollable container
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

  function monitor() {
    var video = findVideo();
    if (video) {
      detectLoop(video);
    }
    requestAnimationFrame(monitor);
  }

  window.__FB_REELS_TV__.triggerScroll = triggerScroll;
  window.__FB_REELS_TV__.showToast = showToast;

  setTimeout(monitor, 1000);
})();

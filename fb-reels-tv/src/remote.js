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

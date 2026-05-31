(function() {
    'use strict';

    if (window.__FB_REELS_LITE_CONTROLS_LOADED__) return;
    window.__FB_REELS_LITE_CONTROLS_LOADED__ = true;

    window.FbReelsLite = window.FbReelsLite || {};
    window.FbReelsLite.playPause = function() {
        var v = document.querySelector('video');
        if (v) { v.paused ? v.play() : v.pause(); }
    };
    window.FbReelsLite.nextReel = function() { window.scrollBy(0, window.innerHeight); };
    window.FbReelsLite.prevReel = function() { window.scrollBy(0, -window.innerHeight); };
    window.FbReelsLite.toggleFullscreen = function() {
        document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    };

    console.log('[FbReelsLite] Controls ready');
})();

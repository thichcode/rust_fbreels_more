(function() {
    'use strict';

    if (window.__FB_REELS_LITE_LOADED__) return;
    window.__FB_REELS_LITE_LOADED__ = true;

    var lastScroll = 0;
    var lastVideoSrc = '';
    var videoEnded = false;

    function log(msg) { console.log('[FbReelsLite] ' + msg); }

    function scrollNext() {
        var now = Date.now();
        if (now - lastScroll < 1500) return;
        lastScroll = now;
        log('>>> SCROLL NEXT <<<');
        window.scrollBy(0, window.innerHeight + 50);
    }

    function checkVideo() {
        var v = document.querySelector('video');
        if (!v) return;

        var src = v.src || v.currentSrc || '';

        // Video src changed → new video, reset state
        if (src && src !== lastVideoSrc) {
            lastVideoSrc = src;
            videoEnded = false;
            log('NEW VIDEO src=' + src.substring(0, 60));
        }

        if (videoEnded) return;

        // ended
        if (v.ended) {
            videoEnded = true;
            log('ENDED');
            scrollNext();
            return;
        }

        // paused after playing
        if (v.paused && v.currentTime > 2) {
            videoEnded = true;
            log('PAUSED at ' + v.currentTime.toFixed(1));
            scrollNext();
            return;
        }

        // near end
        if (v.duration > 0 && !isNaN(v.duration) && v.duration !== Infinity) {
            var remain = v.duration - v.currentTime;
            if (remain < 1.5) {
                videoEnded = true;
                log('NEAR END remain=' + remain.toFixed(1));
                scrollNext();
            }
        }
    }

    setInterval(checkVideo, 500);
    log('READY');
})();

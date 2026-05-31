(function() {
    'use strict';

    var config = window.__FB_REELS_CONFIG__ || {
        autoScrollEnabled: true,
        autoScrollDelay: 500
    };

    var currentVideo = null;
    var scrollTimeout = null;
    var lastScrollTime = 0;
    var checked = {};

    function log(msg) { console.log('[FbReelsLite] ' + msg); }

    function scrollDown() {
        var now = Date.now();
        if (now - lastScrollTime < 300) return;
        lastScrollTime = now;

        log('Scrolling down...');
        // Press ArrowDown key
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, which: 40, bubbles: true }));
        // Fallback: scroll
        window.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
    }

    function checkTime() {
        if (!currentVideo || currentVideo.paused || currentVideo.ended) return;
        if (!currentVideo.duration || isNaN(currentVideo.duration)) return;

        var remaining = currentVideo.duration - currentVideo.currentTime;

        // Gần hết (còn 1-2s) thì scroll
        if (remaining <= 1.5 && remaining > 0) {
            var vidSrc = currentVideo.src || currentVideo.currentSrc || '';
            if (checked[vidSrc]) return;
            checked[vidSrc] = true;
            log('Near end (' + remaining.toFixed(1) + 's left), scrolling...');
            if (scrollTimeout) clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(scrollDown, config.autoScrollDelay);
        }
    }

    function bindToVideo(video) {
        if (!video || currentVideo === video) return;
        currentVideo = video;
        checked = {};
        log('Bound to video: ' + (video.src || 'no src').substring(0, 80));
    }

    function findVideo() {
        var v = document.querySelector('video');
        if (v) bindToVideo(v);
    }

    function init() {
        log('Init (delay=' + config.autoScrollDelay + 'ms)');
        findVideo();
        setInterval(findVideo, 2000);
        setInterval(checkTime, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 500);
    }

    window.FbReelsLite = { reinit: init };
})();

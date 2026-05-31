(function() {
    'use strict';

    var DELAY = 1500;
    var FALLBACK_INTERVAL = 20000;
    var lastScroll = 0;
    var videoFound = false;
    var videoEnded = false;

    function log(msg) { console.log('[FbReelsLite] ' + msg); }

    function scrollDown() {
        var now = Date.now();
        if (now - lastScroll < 800) return;
        lastScroll = now;
        log('>>> SCROLL DOWN <<<');

        // Method 1: Keyboard
        try {
            var e = new KeyboardEvent('keydown', {
                key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, which: 40,
                bubbles: true, cancelable: true
            });
            document.activeElement.dispatchEvent(e);
            document.dispatchEvent(e);
        } catch(ex) {}

        // Method 2: Scroll
        setTimeout(function() {
            window.scrollBy(0, window.innerHeight);
        }, 100);
    }

    function checkVideo() {
        var v = document.querySelector('video');
        if (!v) {
            if (videoFound) { log('Video disappeared'); }
            videoFound = false;
            videoEnded = false;
            return;
        }

        if (!videoFound) {
            videoFound = true;
            videoEnded = false;
            log('VIDEO FOUND');
            log('  src: ' + (v.src || v.currentSrc || 'none').substring(0, 80));
            log('  duration: ' + v.duration);
            log('  paused: ' + v.paused);
            log('  readyState: ' + v.readyState);
        }

        // Check ended
        if (v.ended) {
            if (!videoEnded) {
                videoEnded = true;
                log('VIDEO ENDED');
                scrollDown();
            }
            return;
        }

        // Check paused after playing
        if (v.paused && v.currentTime > 2 && !videoEnded) {
            videoEnded = true;
            log('VIDEO PAUSED at ' + v.currentTime.toFixed(1) + 's');
            scrollDown();
            return;
        }

        // Check near end
        if (v.duration && v.duration > 0 && !isNaN(v.duration) && v.duration !== Infinity) {
            var remain = v.duration - v.currentTime;
            log('  time: ' + v.currentTime.toFixed(1) + '/' + v.duration.toFixed(1) + ' (remain: ' + remain.toFixed(1) + 's)');
            if (remain < 2 && remain >= 0 && !videoEnded) {
                videoEnded = true;
                log('NEAR END');
                scrollDown();
            }
        }
    }

    // Check every second
    setInterval(checkVideo, 1000);

    // Fallback: scroll every 20s even without video detection
    setInterval(function() {
        if (!videoFound) {
            log('Fallback scroll (no video detected)');
            scrollDown();
        }
    }, FALLBACK_INTERVAL);

    log('INIT - checking every 1s, fallback scroll every 20s');
    log('UA: ' + navigator.userAgent.substring(0, 100));

    window.FbReelsLite = { reinit: function(){} };
})();

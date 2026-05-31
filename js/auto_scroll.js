(function() {
    'use strict';

    if (window.__FB_LOADED__) return;
    window.__FB_LOADED__ = true;

    var lastScroll = 0;
    var wasEnded = false;
    var lastTime = 0;

    function log(m) { console.log('[FB] ' + m); }

    function doScroll() {
        var now = Date.now();
        if (now - lastScroll < 2000) return;
        lastScroll = now;
        log('SCROLL!');

        // Container scroll
        document.querySelectorAll('div').forEach(function(d) {
            var cs = getComputedStyle(d);
            if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') &&
                d.scrollHeight > d.clientHeight + 50 && d.clientHeight > 200) {
                d.scrollBy({ top: d.clientHeight, behavior: 'smooth' });
            }
        });

        // Wheel fallback
        var v = document.querySelector('video');
        if (v) {
            var p = v;
            for (var i = 0; i < 10 && p.parentElement; i++) p = p.parentElement;
            p.dispatchEvent(new WheelEvent('wheel', { deltaY: 800, bubbles: true }));
        }

        // Keyboard fallback
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', keyCode: 40, bubbles: true }));
    }

    function check() {
        var v = document.querySelector('video');
        if (!v || !v.duration || isNaN(v.duration)) return;

        var t = v.currentTime;

        // Video reset về 0 → reel mới → reset flag
        if (wasEnded && t < 1) {
            wasEnded = false;
            log('NEW REEL');
        }

        if (wasEnded) return;

        // Detect: ended, paused at end, or near end
        var done = v.ended ||
                   (v.paused && t > 2 && lastTime > t) ||
                   (v.duration - t < 1.5 && t > 1);

        lastTime = t;

        if (done) {
            wasEnded = true;
            log('DONE ' + t.toFixed(1) + '/' + v.duration.toFixed(1));
            doScroll();
        }
    }

    setInterval(check, 500);
    log('READY');
})();

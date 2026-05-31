(function() {
    'use strict';

    if (window.__FB_LOADED__) return;
    window.__FB_LOADED__ = true;

    var lastScroll = 0;
    var wasEnded = false;
    var lastTime = 0;

    function log(m) { console.log('[FB] ' + m); }

    function post(msg) {
        try {
            if (window.chrome && window.chrome.webview) {
                window.chrome.webview.postMessage(JSON.stringify({ type: msg }));
            }
        } catch(e) {}
    }

    function scrollNext() {
        var now = Date.now();
        if (now - lastScroll < 2000) return;
        lastScroll = now;
        log('SCROLL NEXT → IPC');
        post('scroll_next');
    }

    function check() {
        var v = document.querySelector('video');
        if (!v || !v.duration || isNaN(v.duration)) return;

        var t = v.currentTime;

        // Video reset về 0 → reel mới
        if (wasEnded && t < 1) {
            wasEnded = false;
            log('NEW REEL');
        }

        if (wasEnded) return;

        var done = v.ended ||
                   (v.paused && t > 2 && lastTime > t) ||
                   (v.duration - t < 1.5 && t > 1);

        lastTime = t;

        if (done) {
            wasEnded = true;
            log('DONE ' + t.toFixed(1) + '/' + v.duration.toFixed(1));
            scrollNext();
        }
    }

    setInterval(check, 500);
    log('READY - IPC mode');
})();

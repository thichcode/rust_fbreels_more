(function() {
    'use strict';

    if (window.__FB_LOADED__) return;
    window.__FB_LOADED__ = true;

    var lastScroll = 0;
    var lastTime = 0;
    var lastDuration = 0;

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
        log('SCROLL NEXT');
        post('scroll_next');
    }

    function check() {
        var v = document.querySelector('video');
        if (!v || !v.duration || isNaN(v.duration)) return;

        var t = v.currentTime;
        var d = v.duration;

        // Video mới hoặc duration thay đổi
        if (d !== lastDuration) {
            lastDuration = d;
            lastTime = 0;
            log('NEW VIDEO dur=' + d.toFixed(1));
        }

        // Detect video loop/replay: currentTime nhảy từ cao về thấp
        // Ví dụ: 10.5 → 0.3 = video vừa replay
        if (lastTime > 3 && t < 1) {
            log('VIDEO LOOPED (' + lastTime.toFixed(1) + ' → ' + t.toFixed(1) + ')');
            scrollNext();
            lastTime = t;
            return;
        }

        lastTime = t;
    }

    setInterval(check, 300);
    log('READY - loop detection mode');
})();

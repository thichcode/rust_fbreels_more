(function() {
    'use strict';

    if (window.__FB_LOADED__) return;
    window.__FB_LOADED__ = true;

    var lastScroll = 0;
    var lastTime = 0;
    var loopCount = 0;
    var lastVideoSrc = '';

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
        if (now - lastScroll < 3000) return;
        lastScroll = now;
        loopCount = 0;
        log('SCROLL NEXT');
        post('scroll_next');
    }

    function check() {
        var v = document.querySelector('video');
        if (!v || !v.duration || isNaN(v.duration)) return;

        var t = v.currentTime;
        var src = v.src || v.currentSrc || '';

        // Video mới → reset mọi thứ
        if (src !== lastVideoSrc) {
            lastVideoSrc = src;
            lastTime = 0;
            loopCount = 0;
            log('NEW VIDEO');
            return;
        }

        // Phát hiện loop: currentTime nhảy từ cao về thấp
        if (lastTime > 2 && t < 1) {
            loopCount++;
            log('LOOP #' + loopCount + ' (' + lastTime.toFixed(1) + ' → ' + t.toFixed(1) + ')');

            // Loop lần đầu → scroll ngay
            if (loopCount >= 1) {
                scrollNext();
            }
        }

        lastTime = t;
    }

    setInterval(check, 300);
    log('READY');
})();

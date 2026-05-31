(function() {
    'use strict';

    if (window.__FB_LOADED__) return;
    window.__FB_LOADED__ = true;

    var lastScroll = 0;
    var lastSrc = '';
    var ended = false;

    function log(m) { console.log('[FB] ' + m); }

    function doScroll() {
        var now = Date.now();
        if (now - lastScroll < 2000) return;
        lastScroll = now;
        log('SCROLL!');

        // Try all possible targets
        var targets = [];

        // 1. Find scrollable containers
        document.querySelectorAll('div').forEach(function(d) {
            var cs = getComputedStyle(d);
            if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') {
                if (d.scrollHeight > d.clientHeight + 50 && d.clientHeight > 200) {
                    targets.push({ el: d, type: 'container scrollH=' + d.scrollHeight + ' clientH=' + d.clientHeight });
                }
            }
        });

        // 2. Try scrolling each container
        for (var i = 0; i < targets.length; i++) {
            var t = targets[i];
            log('Try: ' + t.type);
            t.el.scrollBy({ top: t.el.clientHeight, behavior: 'smooth' });

            // Also try wheel event
            t.el.dispatchEvent(new WheelEvent('wheel', { deltaY: 800, bubbles: true }));
        }

        // 3. Try wheel on video parent chain
        var v = document.querySelector('video');
        if (v) {
            var p = v;
            for (var j = 0; j < 10 && p.parentElement; j++) {
                p = p.parentElement;
            }
            p.dispatchEvent(new WheelEvent('wheel', { deltaY: 800, bubbles: true }));
            log('Wheel on: ' + p.tagName + '.' + (p.className || '').substring(0, 40));
        }

        // 4. Keyboard on activeElement
        var ae = document.activeElement || document.body;
        ['keydown', 'keypress', 'keyup'].forEach(function(type) {
            ae.dispatchEvent(new KeyboardEvent(type, { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, which: 40, bubbles: true }));
        });
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, which: 40, bubbles: true }));
        log('Keyboard dispatched on: ' + ae.tagName);
    }

    function check() {
        var v = document.querySelector('video');
        if (!v) return;

        var src = v.src || v.currentSrc || '';
        if (src && src !== lastSrc) {
            lastSrc = src;
            ended = false;
            log('VIDEO ' + v.duration.toFixed(1) + 's');
        }

        if (ended) return;

        if (v.ended || (v.paused && v.currentTime > 2) ||
            (v.duration > 0 && v.duration - v.currentTime < 1.5 && v.currentTime > 1)) {
            ended = true;
            log('DONE (' + v.currentTime.toFixed(1) + '/' + v.duration.toFixed(1) + ')');
            doScroll();
        }
    }

    setInterval(check, 500);
    log('READY');
})();

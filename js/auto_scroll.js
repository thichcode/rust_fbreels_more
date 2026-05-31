(function() {
    'use strict';

    var lastScroll = 0;
    var videoFound = false;
    var videoEnded = false;

    function log(msg) { console.log('[FbReelsLite] ' + msg); }

    function getReelContainer() {
        // Find the scrollable container holding the reels
        var selectors = [
            '[role="main"]',
            '[aria-label*="Reel"]',
            '[aria-label*="reel"]',
            '[data-pagelet*="reel"]',
            '[class*="x1lliihq"]',
            '[class*="x78zum5"]',
            'div[tabindex="0"][style*="overflow"]'
        ];

        for (var i = 0; i < selectors.length; i++) {
            var els = document.querySelectorAll(selectors[i]);
            for (var j = 0; j < els.length; j++) {
                var el = els[j];
                var style = window.getComputedStyle(el);
                if ((style.overflow === 'auto' || style.overflow === 'scroll' ||
                     style.overflowY === 'auto' || style.overflowY === 'scroll') &&
                    el.scrollHeight > el.clientHeight + 50 &&
                    el.clientHeight > 200) {
                    return el;
                }
            }
        }

        // Brute force: find any scrollable div that's tall enough
        var allDivs = document.querySelectorAll('div');
        for (var k = 0; k < allDivs.length; k++) {
            var d = allDivs[k];
            var cs = window.getComputedStyle(d);
            if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') {
                if (d.scrollHeight > d.clientHeight + 100 && d.clientHeight > 300) {
                    return d;
                }
            }
        }

        return null;
    }

    function scrollNext() {
        var now = Date.now();
        if (now - lastScroll < 1000) return;
        lastScroll = now;
        log('>>> SCROLL NEXT <<<');

        // Method 1: Find and scroll the reel container
        var container = getReelContainer();
        if (container) {
            log('Scrolling container: ' + container.tagName + ' h=' + container.scrollHeight + ' ch=' + container.clientHeight);
            container.scrollBy({ top: container.clientHeight, behavior: 'smooth' });
            return;
        }

        // Method 2: Mouse wheel event on video or its parent
        var video = document.querySelector('video');
        if (video) {
            var target = video.parentElement || video;
            for (var i = 0; i < 5; i++) {
                if (target.parentElement) target = target.parentElement;
            }
            log('Dispatching wheel on: ' + target.tagName);
            target.dispatchEvent(new WheelEvent('wheel', { deltaY: 500, bubbles: true }));
            return;
        }

        // Method 3: window.scrollBy
        log('Fallback: window.scrollBy');
        window.scrollBy(0, window.innerHeight);
    }

    function checkVideo() {
        var v = document.querySelector('video');
        if (!v) {
            videoFound = false;
            videoEnded = false;
            return;
        }

        if (!videoFound) {
            videoFound = true;
            videoEnded = false;
            log('VIDEO FOUND duration=' + v.duration);
        }

        // ended
        if (v.ended && !videoEnded) {
            videoEnded = true;
            log('VIDEO ENDED');
            scrollNext();
            return;
        }

        // paused after playing
        if (v.paused && v.currentTime > 2 && !videoEnded) {
            videoEnded = true;
            log('VIDEO PAUSED at ' + v.currentTime.toFixed(1));
            scrollNext();
            return;
        }

        // near end
        if (v.duration && v.duration > 0 && !isNaN(v.duration) && v.duration !== Infinity) {
            var remain = v.duration - v.currentTime;
            if (remain < 1.5 && remain >= 0 && !videoEnded) {
                videoEnded = true;
                log('NEAR END (' + remain.toFixed(1) + 's)');
                scrollNext();
            }
        }
    }

    setInterval(checkVideo, 500);
    log('INIT');
    window.FbReelsLite = { reinit: function(){} };
})();

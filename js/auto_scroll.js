(function() {
    'use strict';

    var config = window.__FB_REELS_CONFIG__ || {
        autoScrollEnabled: true,
        autoScrollDelay: 1500
    };

    var currentVideo = null;
    var scrollTimeout = null;
    var lastScrollTime = 0;

    function log(msg) {
        console.log('[FbReelsLite] ' + msg);
    }

    function notifyRust(type, data) {
        try {
            if (window.chrome && window.chrome.webview) {
                window.chrome.webview.postMessage(JSON.stringify({ type: type, data: data || {} }));
            }
        } catch (e) {}
    }

    function scrollToNextReel() {
        var now = Date.now();
        if (now - lastScrollTime < 500) {
            log('Scroll cooldown, skipping');
            return;
        }
        lastScrollTime = now;

        log('Scrolling to next reel...');
        notifyRust('video_ended');

        var scrollAmount = window.innerHeight || document.documentElement.clientHeight;

        // Method 1: Find Facebook's scrollable container
        var allElements = document.querySelectorAll('*');
        for (var i = 0; i < allElements.length; i++) {
            var el = allElements[i];
            var style = window.getComputedStyle(el);
            if (style.overflow === 'auto' || style.overflow === 'scroll' ||
                style.overflowY === 'auto' || style.overflowY === 'scroll') {
                if (el.scrollHeight > el.clientHeight + 50 &&
                    el.clientHeight > 100 && el.clientHeight < window.innerHeight + 100) {
                    log('Found scrollable: ' + el.tagName + '.' + el.className.substring(0, 50) + ' scrollH=' + el.scrollHeight + ' clientH=' + el.clientHeight);
                    el.scrollBy({ top: scrollAmount, behavior: 'smooth' });
                    return;
                }
            }
        }

        // Method 2: Try specific Facebook selectors
        var selectors = [
            '[role="main"]',
            '[aria-label*="Reel"]',
            '[data-pagelet*="reel"]',
            '[class*="x1lliihq"]',  // Facebook feed container class
            '[class*="x78zum5"]',   // Facebook scroll container
            'div[tabindex="0"][style*="overflow"]'
        ];

        for (var j = 0; j < selectors.length; j++) {
            var containers = document.querySelectorAll(selectors[j]);
            for (var k = 0; k < containers.length; k++) {
                var c = containers[k];
                if (c.scrollHeight > c.clientHeight + 50 && c.clientHeight > 100) {
                    log('Found container: ' + selectors[j]);
                    c.scrollBy({ top: scrollAmount, behavior: 'smooth' });
                    return;
                }
            }
        }

        // Method 3: window.scrollBy
        log('Fallback: window.scrollBy');
        window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
    }

    function handleVideoEnded() {
        if (!config.autoScrollEnabled) {
            log('Auto-scroll disabled');
            return;
        }
        log('Video ended event fired!');
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(scrollToNextReel, config.autoScrollDelay);
    }

    function bindToVideo(video, source) {
        if (!video || currentVideo === video) return;

        if (currentVideo) {
            currentVideo.removeEventListener('ended', handleVideoEnded);
        }

        currentVideo = video;
        video.addEventListener('ended', handleVideoEnded);

        log('Bound to video from: ' + source + ', duration=' + (video.duration || 'unknown'));
        notifyRust('video_found', { duration: video.duration || 0 });
    }

    function findVideosInDoc(doc, source) {
        if (!doc) return false;
        try {
            var videos = doc.querySelectorAll('video');
            if (videos.length > 0) {
                log('Found ' + videos.length + ' video(s) in ' + source);
                for (var i = 0; i < videos.length; i++) {
                    var v = videos[i];
                    if (v.src || v.currentSrc || v.readyState > 0) {
                        bindToVideo(v, source);
                        return true;
                    }
                }
                // Bind to first video even without src (might load later)
                bindToVideo(videos[0], source);
                return true;
            }
        } catch(e) {
            // Cross-origin iframe
            log('Cannot access ' + source + ': ' + e.message);
        }
        return false;
    }

    function findAndBindVideo() {
        // Main document
        if (findVideosInDoc(document, 'main document')) return;

        // Check iframes
        var iframes = document.querySelectorAll('iframe');
        for (var i = 0; i < iframes.length; i++) {
            try {
                if (findVideosInDoc(iframes[i].contentDocument, 'iframe[' + i + ']')) return;
            } catch(e) {
                // Cross-origin
            }
        }

        // Check shadow roots
        var allElements = document.querySelectorAll('*');
        for (var j = 0; j < allElements.length; j++) {
            if (allElements[j].shadowRoot) {
                if (findVideosInDoc(allElements[j].shadowRoot, 'shadowRoot')) return;
            }
        }

        log('No video found');
    }

    function init() {
        log('Initializing auto-scroll (delay: ' + config.autoScrollDelay + 'ms)...');

        findAndBindVideo();

        // MutationObserver for dynamic content
        var observer = new MutationObserver(function(mutations) {
            for (var i = 0; i < mutations.length; i++) {
                if (mutations[i].addedNodes.length > 0) {
                    findAndBindVideo();
                    break;
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Backup polling
        setInterval(findAndBindVideo, 2000);

        log('Auto-scroll ready');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 500);
    }

    // Re-init on navigation
    window.addEventListener('popstate', function() { setTimeout(init, 1000); });

    window.FbReelsLite = window.FbReelsLite || {};
    window.FbReelsLite.autoScroll = scrollToNextReel;
    window.FbReelsLite.reinit = init;
})();

(function() {
    'use strict';

    const config = window.__FB_REELS_CONFIG__ || {
        autoScrollEnabled: true,
        autoScrollDelay: 1500
    };

    let currentVideo = null;
    let scrollTimeout = null;
    let observer = null;

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
        log('Scrolling to next reel...');
        notifyRust('video_ended');

        // Facebook Reels scroll: try multiple methods
        var scrollAmount = window.innerHeight || document.documentElement.clientHeight;

        // Method 1: Scroll the main scrollable container
        var containers = document.querySelectorAll('[role="main"], [data-testid="reels-browser-feed-container"], [class*="scroll"]');
        for (var i = 0; i < containers.length; i++) {
            var el = containers[i];
            if (el.scrollHeight > el.clientHeight + 10) {
                el.scrollBy({ top: scrollAmount, behavior: 'smooth' });
                log('Scrolled container: ' + el.tagName);
                return;
            }
        }

        // Method 2: Find the reels scroll wrapper
        var reelsWrapper = document.querySelector('[aria-label="Reels"]') ||
                          document.querySelector('[data-pagelet="FeedUnit_0"]')?.parentElement;
        if (reelsWrapper && reelsWrapper.scrollHeight > reelsWrapper.clientHeight + 10) {
            reelsWrapper.scrollBy({ top: scrollAmount, behavior: 'smooth' });
            log('Scrolled reels wrapper');
            return;
        }

        // Method 3: window.scrollBy as fallback
        window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
        log('Scrolled window');
    }

    function handleVideoEnded() {
        if (!config.autoScrollEnabled) {
            log('Auto-scroll disabled, skipping');
            return;
        }

        log('Video ended!');

        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }

        scrollTimeout = setTimeout(function() {
            scrollToNextReel();
        }, config.autoScrollDelay);
    }

    function bindToVideo(video) {
        if (!video || currentVideo === video) return;

        if (currentVideo) {
            currentVideo.removeEventListener('ended', handleVideoEnded);
            currentVideo.removeEventListener('pause', handleVideoEnded);
        }

        currentVideo = video;
        video.addEventListener('ended', handleVideoEnded);
        // Also handle pause as fallback for looping videos
        video.addEventListener('pause', function onVideoPause() {
            if (video.currentTime > 0 && !video.paused && !video.ended) {
                return;
            }
            // Only trigger if video ended or is at the end
            if (video.ended || (video.duration > 0 && video.currentTime >= video.duration - 0.5)) {
                handleVideoEnded();
            }
        });

        log('Bound to video, duration: ' + video.duration);
        notifyRust('video_found', {
            duration: video.duration,
            currentTime: video.currentTime
        });
    }

    function findAndBindVideo() {
        // Try multiple selectors for Facebook videos
        var selectors = [
            'video[src]',
            'video',
            '[data-testid="video-player"] video',
            '[role="main"] video',
            'div[style*="background"] video'
        ];

        for (var i = 0; i < selectors.length; i++) {
            var video = document.querySelector(selectors[i]);
            if (video && video.src) {
                bindToVideo(video);
                return;
            }
        }

        // Fallback: find any video element
        var videos = document.querySelectorAll('video');
        for (var j = 0; j < videos.length; j++) {
            if (videos[j].src || videos[j].currentSrc) {
                bindToVideo(videos[j]);
                return;
            }
        }
    }

    function init() {
        log('Initializing auto-scroll...');

        // Initial find
        findAndBindVideo();

        // Watch for DOM changes (Facebook loads reels dynamically)
        if (observer) {
            observer.disconnect();
        }

        observer = new MutationObserver(function(mutations) {
            var shouldCheck = false;
            for (var i = 0; i < mutations.length; i++) {
                if (mutations[i].addedNodes.length > 0) {
                    shouldCheck = true;
                    break;
                }
            }
            if (shouldCheck) {
                findAndBindVideo();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Periodic check as backup
        setInterval(findAndBindVideo, 3000);

        log('Auto-scroll initialized (delay: ' + config.autoScrollDelay + 'ms)');
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Also re-init on page navigation (Facebook is SPA)
    window.addEventListener('popstate', function() {
        setTimeout(init, 1000);
    });

    // Expose for manual control
    window.FbReelsLite = window.FbReelsLite || {};
    window.FbReelsLite.autoScroll = scrollToNextReel;
    window.FbReelsLite.reinit = init;
})();

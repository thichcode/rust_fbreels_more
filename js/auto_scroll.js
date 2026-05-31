(function() {
    'use strict';

    const config = window.__FB_REELS_CONFIG__ || {
        autoScrollEnabled: true,
        autoScrollDelay: 1500
    };

    let currentVideo = null;
    let scrollTimeout = null;

    function notifyRust(type, data = {}) {
        try {
            if (window.chrome && window.chrome.webview) {
                window.chrome.webview.postMessage(JSON.stringify({ type, data }));
            }
        } catch (e) {
            console.warn('Failed to notify Rust:', e);
        }
    }

    function scrollToNextReel() {
        notifyRust('video_ended');
        window.scrollBy(0, window.innerHeight);
    }

    function handleVideoEnded() {
        if (!config.autoScrollEnabled) return;

        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }

        scrollTimeout = setTimeout(() => {
            scrollToNextReel();
        }, config.autoScrollDelay);
    }

    function bindToVideo(video) {
        if (currentVideo === video) return;

        if (currentVideo) {
            currentVideo.removeEventListener('ended', handleVideoEnded);
        }

        currentVideo = video;
        video.addEventListener('ended', handleVideoEnded);

        notifyRust('video_found', {
            duration: video.duration,
            currentTime: video.currentTime
        });
    }

    function findAndBindVideo() {
        const video = document.querySelector('video');
        if (video) {
            bindToVideo(video);
        }
    }

    const observer = new MutationObserver((mutations) => {
        let found = false;
        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                findAndBindVideo();
                found = true;
                break;
            }
        }
    });

    function init() {
        findAndBindVideo();

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setInterval(findAndBindVideo, 2000);

        console.log('FbReelsLite auto-scroll initialized');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

(function() {
    'use strict';

    function notifyRust(type, data = {}) {
        try {
            if (window.chrome && window.chrome.webview) {
                window.chrome.webview.postMessage(JSON.stringify({ type, data }));
            }
        } catch (e) {
            console.warn('Failed to notify Rust:', e);
        }
    }

    window.FbReelsLite = {
        playPause: function() {
            const video = document.querySelector('video');
            if (video) {
                if (video.paused) {
                    video.play();
                } else {
                    video.pause();
                }
                notifyRust('play_pause', { playing: !video.paused });
            }
        },

        nextReel: function() {
            notifyRust('next_reel');
            window.scrollBy(0, window.innerHeight);
        },

        prevReel: function() {
            notifyRust('prev_reel');
            window.scrollBy(0, -window.innerHeight);
        },

        toggleFullscreen: function() {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                document.documentElement.requestFullscreen();
            }
        },

        exitFullscreen: function() {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
        }
    };

    console.log('FbReelsLite controls initialized');
})();

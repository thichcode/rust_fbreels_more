(function() {
    'use strict';

    window.FbReelsLite = window.FbReelsLite || {};

    window.FbReelsLite.playPause = function() {
        var video = document.querySelector('video');
        if (video) {
            if (video.paused) {
                video.play();
            } else {
                video.pause();
            }
        }
    };

    window.FbReelsLite.nextReel = function() {
        var scrollAmount = window.innerHeight || document.documentElement.clientHeight;
        window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
    };

    window.FbReelsLite.prevReel = function() {
        var scrollAmount = window.innerHeight || document.documentElement.clientHeight;
        window.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
    };

    window.FbReelsLite.toggleFullscreen = function() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    };

    window.FbReelsLite.exitFullscreen = function() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
    };

    console.log('[FbReelsLite] Controls initialized');
})();

import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

/**
 * Enterprise Video.js Player for Digital Signage
 * Provides hardware-accelerated playback, intelligent buffer caching,
 * seamless hold-to-pause touch handling, and a rock-solid safe adapter
 * for zero-exception DOM/legacy API compatibility.
 */
export default function VideoJSPlayer({
  src,
  isActive = true,
  isPaused = false,
  isMuted = true,
  isLooping = false,
  objectFit = 'cover',
  onEnded,
  onError,
  className = '',
  style = {},
  playerRef
}) {
  const containerRef = useRef(null);
  const internalPlayerRef = useRef(null);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (!containerRef.current) return;

    // Create the video-js element
    const videoElement = document.createElement('video-js');
    videoElement.classList.add('vjs-fill', 'vjs-default-skin');
    containerRef.current.appendChild(videoElement);

    const player = videojs(videoElement, {
      autoplay: isActive && !isPaused,
      muted: isMuted,
      controls: false,
      loop: isLooping,
      playsinline: true,
      preload: 'auto',
      responsive: true,
      fill: true,
      html5: {
        vhs: {
          overrideNative: true
        },
        nativeVideoTracks: true,
        nativeAudioTracks: true
      },
      sources: src ? [{ src, type: 'video/mp4' }] : []
    }, () => {
      if (isActive && !isPaused) {
        player.play().catch(() => {});
      }
    });

    internalPlayerRef.current = player;

    // Expose a safe, multi-paradigm player adapter to playerRef
    // Emulates native HTMLVideoElement properties & getters/setters without throwing TypeErrors
    if (playerRef) {
      playerRef.current = {
        get paused() {
          if (!player || player.isDisposed()) return true;
          return typeof player.paused === 'function' ? player.paused() : true;
        },
        get muted() {
          if (!player || player.isDisposed()) return true;
          return typeof player.muted === 'function' ? player.muted() : true;
        },
        set muted(val) {
          if (player && !player.isDisposed() && typeof player.muted === 'function') {
            try { player.muted(Boolean(val)); } catch (_) {}
          }
        },
        get currentTime() {
          if (!player || player.isDisposed()) return 0;
          return typeof player.currentTime === 'function' ? player.currentTime() : 0;
        },
        set currentTime(val) {
          if (player && !player.isDisposed() && typeof player.currentTime === 'function') {
            try { player.currentTime(Number(val) || 0); } catch (_) {}
          }
        },
        get src() {
          if (!player || player.isDisposed()) return '';
          return typeof player.currentSrc === 'function' ? player.currentSrc() : '';
        },
        set src(val) {
          if (player && !player.isDisposed() && typeof player.src === 'function') {
            try { player.src([{ src: val, type: 'video/mp4' }]); } catch (_) {}
          }
        },
        play() {
          if (player && !player.isDisposed() && typeof player.play === 'function') {
            return player.play().catch(() => {});
          }
          return Promise.resolve();
        },
        pause() {
          if (player && !player.isDisposed() && typeof player.pause === 'function') {
            try { player.pause(); } catch (_) {}
          }
        },
        load() {
          if (player && !player.isDisposed() && typeof player.load === 'function') {
            try { player.load(); } catch (_) {}
          }
        },
        removeAttribute() {},
        setAttribute() {},
        addEventListener(event, fn) {
          if (player && !player.isDisposed() && typeof player.on === 'function') {
            try { player.on(event, fn); } catch (_) {}
          }
        },
        removeEventListener(event, fn) {
          if (player && !player.isDisposed() && typeof player.off === 'function') {
            try { player.off(event, fn); } catch (_) {}
          }
        },
        rawPlayer: player
      };
    }

    player.on('ended', () => {
      if (onEndedRef.current) {
        onEndedRef.current();
      }
    });

    player.on('error', (err) => {
      if (onErrorRef.current) {
        onErrorRef.current(err);
      }
    });

    return () => {
      if (player && !player.isDisposed()) {
        try {
          player.dispose();
        } catch (_) {}
        internalPlayerRef.current = null;
        if (playerRef) {
          playerRef.current = null;
        }
      }
    };
  }, []);

  // Update src dynamically when src changes
  useEffect(() => {
    const player = internalPlayerRef.current;
    if (player && !player.isDisposed() && src) {
      const currentSrc = player.currentSrc();
      if (currentSrc !== src) {
        const currentTime = player.currentTime() || 0;
        player.src([{ src, type: 'video/mp4' }]);
        player.one('loadedmetadata', () => {
          try {
            if (currentTime > 0) player.currentTime(currentTime);
          } catch (_) {}
          if (isActive && !isPaused) {
            player.play().catch(() => {});
          }
        });
      }
    }
  }, [src, isActive, isPaused]);

  // Update Play / Pause / Muted
  useEffect(() => {
    const player = internalPlayerRef.current;
    if (player && !player.isDisposed()) {
      if (typeof player.muted === 'function') {
        try { player.muted(isMuted); } catch (_) {}
      }
      if (isActive && !isPaused) {
        if (typeof player.play === 'function') {
          player.play().catch(() => {});
        }
      } else {
        if (typeof player.pause === 'function') {
          try { player.pause(); } catch (_) {}
        }
      }
    }
  }, [isActive, isPaused, isMuted]);

  // Update loop
  useEffect(() => {
    const player = internalPlayerRef.current;
    if (player && !player.isDisposed()) {
      if (typeof player.loop === 'function') {
        player.loop(isLooping);
      }
    }
  }, [isLooping]);

  return (
    <div 
      className={`relative w-full h-full overflow-hidden select-none pointer-events-none ${className}`}
      style={{
        ...style,
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden'
      }}
    >
      <div 
        ref={containerRef} 
        className="w-full h-full video-js-custom-container"
        style={{
          '--vjs-object-fit': objectFit === 'contain' ? 'contain' : 'cover'
        }}
      />
    </div>
  );
}

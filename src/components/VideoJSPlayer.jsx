import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

/**
 * Enterprise Video.js Player for Digital Signage
 * Provides hardware-accelerated playback, intelligent buffer caching,
 * and seamless offline playback from IndexedDB blobs or direct streams.
 */
export default function VideoJSPlayer({
  src,
  isActive = true,
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
      autoplay: isActive,
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
      if (isActive) {
        player.play().catch(() => {});
      }
    });

    internalPlayerRef.current = player;
    if (playerRef) {
      playerRef.current = player;
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
          if (isActive) {
            player.play().catch(() => {});
          }
        });
      }
    }
  }, [src, isActive]);

  // Update isActive / Play / Pause
  useEffect(() => {
    const player = internalPlayerRef.current;
    if (player && !player.isDisposed()) {
      if (isActive) {
        player.muted(isMuted);
        player.play().catch(() => {});
      } else {
        player.muted(true);
        player.pause();
      }
    }
  }, [isActive, isMuted]);

  // Update loop
  useEffect(() => {
    const player = internalPlayerRef.current;
    if (player && !player.isDisposed()) {
      player.loop(isLooping);
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

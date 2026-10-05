import React, { useRef, useEffect, useState, useId } from 'react';
import { getYouTubeVideoId } from '../lib/customerDisplayMediaCache';

/**
 * High-Performance Digital Signage YouTube Player
 * Embedded via YouTube IFrame Player API for 60fps adaptive bitrate streaming
 * Completely hides all controls and branding for a seamless kiosk appearance
 */
export default function YouTubePlayer({
  url,
  isActive = true,
  isMuted = true,
  isLooping = true,
  objectFit = 'cover',
  onEnded,
  onError,
  className = ''
}) {
  const iframeRef = useRef(null);
  const containerRef = useRef(null);
  const videoId = getYouTubeVideoId(url);
  const playerId = useId().replace(/[:]/g, '_');
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);

  // Send command to YouTube iframe via postMessage API
  const sendCommand = (func, args = '') => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func,
            args: args || ''
          }),
          '*'
        );
      } catch (e) {
        // Ignore cross-origin error
      }
    }
  };

  // Sync Play / Pause when isActive changes
  useEffect(() => {
    if (!isIframeLoaded) return;
    if (isActive) {
      sendCommand('playVideo');
      sendCommand(isMuted ? 'mute' : 'unMute');
    } else {
      sendCommand('pauseVideo');
      sendCommand('mute');
    }
  }, [isActive, isIframeLoaded, isMuted]);

  // Listen to YouTube postMessage events (onStateChange, onReady, onError)
  useEffect(() => {
    const handleMessage = (event) => {
      if (!event.data) return;
      let data;
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch (e) {
        return;
      }

      // Check if message is from our player
      if (data.event === 'onStateChange' || (data.info && data.info.playerState !== undefined)) {
        const state = data.info?.playerState !== undefined ? data.info.playerState : data.info;
        // 0 = YT.PlayerState.ENDED
        if (state === 0) {
          if (onEnded && isActive) {
            onEnded();
          }
        }
      }

      if (data.event === 'onError' || data.info === 'error') {
        if (onError) onError(data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onEnded, onError, isActive]);

  if (!videoId) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-black text-white/60 text-sm ${className}`}>
        Invalid YouTube URL
      </div>
    );
  }

  // Construct embed URL with maximum signage options
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const embedParams = new URLSearchParams({
    autoplay: '1',
    mute: isMuted ? '1' : '0',
    controls: '0',
    showinfo: '0',
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    enablejsapi: '1',
    origin: origin,
    widgetid: playerId,
    loop: isLooping ? '1' : '0',
    playlist: videoId
  });

  const embedSrc = `https://www.youtube-nocookie.com/embed/${videoId}?${embedParams.toString()}`;

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-black flex items-center justify-center select-none pointer-events-none ${className}`}
      style={{
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden'
      }}
    >
      <iframe
        ref={iframeRef}
        src={embedSrc}
        title="YouTube Signage Player"
        onLoad={() => {
          setIsIframeLoaded(true);
          // YouTube API initialization handshake
          setTimeout(() => {
            sendCommand('listening');
            if (isActive) {
              sendCommand('playVideo');
              sendCommand(isMuted ? 'mute' : 'unMute');
            }
          }, 300);
        }}
        allow="autoplay; encrypted-media; picture-in-picture"
        className={`w-full h-full pointer-events-none border-0 ${
          objectFit === 'contain' ? 'object-contain' : 'object-cover'
        }`}
        style={{
          width: objectFit === 'cover' ? '110%' : '100%',
          height: objectFit === 'cover' ? '110%' : '100%',
          maxWidth: 'none',
          maxHeight: 'none',
          border: 'none',
          pointerEvents: 'none'
        }}
      />
    </div>
  );
}

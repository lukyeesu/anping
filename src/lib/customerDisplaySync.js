/**
 * Customer Display Dual-Transport Synchronization Module
 * Supports:
 * 1. BroadcastChannel API: 0ms latency for wired dual monitors (HDMI / Type-C), 100% offline
 * 2. Supabase Realtime Channel: Cloud WebSockets for wireless iPad / tablets (1 POS to Many Displays)
 */

import { supabase } from './supabase';

/**
 * Format channel names consistently
 */
export function getChannelNames(branchId = 'b1', stationId = 'station_1') {
  const safeBranch = String(branchId || 'b1').trim().toLowerCase();
  const safeStation = String(stationId || 'station_1').trim().toLowerCase();
  return {
    broadcastChannelName: `pos_display_${safeBranch}_${safeStation}`,
    realtimeTopic: `pos_display:${safeBranch}:${safeStation}`
  };
}

/**
 * Play a soothing, crystal-clear 3-note chime for payment success (No external audio file needed)
 */
export function playGentleChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Gentle chord: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz)
    const notes = [523.25, 659.25, 783.99];
    const now = ctx.currentTime;

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + index * 0.12;
      const duration = 0.8;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Smooth attack and natural exponential decay
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.22, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } catch (err) {
    console.warn('[AudioChime] Error playing chime:', err);
  }
}

/**
 * Create a dual-transport publisher for POS System
 */
export function createCustomerDisplayPublisher(branchId = 'b1', stationId = 'station_1') {
  const { broadcastChannelName, realtimeTopic } = getChannelNames(branchId, stationId);

  // 1. BroadcastChannel for local/wired display (0ms latency, 100% offline)
  let localBc = null;
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      localBc = new BroadcastChannel(broadcastChannelName);
    } catch (e) {
      console.warn('[Sync] BroadcastChannel init error:', e);
    }
  }

  // 2. Supabase Realtime Channel for wireless iPad/tablets
  let realtimeChannel = null;
  let isRealtimeReady = false;
  let msgSeq = 0;
  const pendingRealtimeMessages = [];

  if (supabase) {
    try {
      realtimeChannel = supabase.channel(realtimeTopic, {
        config: { broadcast: { self: false } }
      });
      realtimeChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          isRealtimeReady = true;
          // Flush pending messages
          while (pendingRealtimeMessages.length > 0) {
            const nextMsg = pendingRealtimeMessages.shift();
            realtimeChannel.send(nextMsg).catch(() => {});
          }
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          isRealtimeReady = false;
        }
      });
    } catch (e) {
      console.warn('[Sync] Supabase Realtime init error:', e);
    }
  }

  const publisherId = `pos_${Math.random().toString(36).slice(2, 9)}`;

  // Broadcast a message through all active transports
  const publish = (eventType, payload = {}) => {
    msgSeq++;
    const message = {
      id: `${branchId}_${stationId}_${Date.now()}_${msgSeq}`,
      seq: msgSeq,
      publisherId,
      event: eventType,
      payload,
      timestamp: Date.now(),
      branchId,
      stationId
    };

    // Send via BroadcastChannel (0ms immediate)
    if (localBc) {
      try {
        localBc.postMessage(message);
      } catch (e) {
        console.warn('[Sync] BroadcastChannel postMessage error:', e);
      }
    }

    // Send via Supabase Realtime
    if (realtimeChannel) {
      const packet = {
        type: 'broadcast',
        event: eventType,
        payload: message
      };
      if (isRealtimeReady) {
        realtimeChannel.send(packet).catch(e => {
          console.warn('[Sync] Supabase Realtime send error:', e);
        });
      } else {
        pendingRealtimeMessages.push(packet);
        if (pendingRealtimeMessages.length > 10) {
          pendingRealtimeMessages.shift();
        }
      }
    }
  };

  // Listen to messages from display (e.g. GET_CURRENT_STATE)
  const onMessage = (callback) => {
    if (localBc) {
      localBc.onmessage = (e) => {
        if (e.data && typeof callback === 'function') {
          callback(e.data);
        }
      };
    }

    if (realtimeChannel) {
      realtimeChannel.on('broadcast', { event: '*' }, (payload) => {
        if (payload?.payload && typeof callback === 'function') {
          callback(payload.payload);
        }
      });
    }
  };

  // Cleanup
  const close = () => {
    if (localBc) {
      try {
        localBc.close();
      } catch (e) {}
      localBc = null;
    }
    if (realtimeChannel && supabase) {
      try {
        supabase.removeChannel(realtimeChannel);
      } catch (e) {}
      realtimeChannel = null;
    }
  };

  return {
    publish,
    onMessage,
    close,
    branchId,
    stationId
  };
}

/**
 * Create a dual-transport subscriber for Customer Display
 */
export function createCustomerDisplaySubscriber(branchId = 'b1', stationId = 'station_1', onEventReceived) {
  const { broadcastChannelName, realtimeTopic } = getChannelNames(branchId, stationId);

  let localBc = null;
  let realtimeChannel = null;
  const seenMessageIds = new Set();
  const highestSeqPerPublisher = new Map();

  // Deduplicate identical events received from both channels and discard late out-of-order packets
  const handleEvent = (data) => {
    if (!data || !data.event) return;

    // Deduplicate EXACT same message received from both BroadcastChannel and Realtime
    if (data.id) {
      if (seenMessageIds.has(data.id)) {
        return; // Already processed from the faster transport
      }
      seenMessageIds.add(data.id);
      if (seenMessageIds.size > 500) {
        const first = seenMessageIds.values().next().value;
        seenMessageIds.delete(first);
      }
    }

    // Sequence check per publisher (prevents clock skew between different PCs from blocking messages)
    if (data.publisherId && data.seq) {
      const prevSeq = highestSeqPerPublisher.get(data.publisherId) || 0;
      if (data.seq < prevSeq) {
        return; // Stale sequence from the same sender
      }
      highestSeqPerPublisher.set(data.publisherId, data.seq);
      if (highestSeqPerPublisher.size > 50) {
        const firstKey = highestSeqPerPublisher.keys().next().value;
        highestSeqPerPublisher.delete(firstKey);
      }
    }

    if (typeof onEventReceived === 'function') {
      onEventReceived(data.event, data.payload, data);
    }
  };

  // 1. BroadcastChannel (0ms local)
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      localBc = new BroadcastChannel(broadcastChannelName);
      localBc.onmessage = (e) => {
        handleEvent(e.data);
      };
    } catch (e) {
      console.warn('[Sync] Display BroadcastChannel error:', e);
    }
  }

  // 2. Supabase Realtime (Cloud WebSockets)
  if (supabase) {
    try {
      realtimeChannel = supabase.channel(realtimeTopic, {
        config: { broadcast: { self: false } }
      });

      realtimeChannel.on('broadcast', { event: '*' }, (message) => {
        const data = message?.payload;
        if (data) {
          handleEvent(data);
        }
      });

      realtimeChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Request current state from POS upon connecting
          requestCurrentState();
        }
      });
    } catch (e) {
      console.warn('[Sync] Display Realtime subscription error:', e);
    }
  }

  // Send request for current state
  const requestCurrentState = () => {
    const req = {
      id: `req_${branchId}_${stationId}_${Date.now()}`,
      event: 'GET_CURRENT_STATE',
      payload: {},
      timestamp: Date.now(),
      branchId,
      stationId
    };

    if (localBc) {
      try {
        localBc.postMessage(req);
      } catch (e) {}
    }

    if (realtimeChannel) {
      try {
        realtimeChannel.send({
          type: 'broadcast',
          event: 'GET_CURRENT_STATE',
          payload: req
        }).catch(() => {});
      } catch (e) {}
    }
  };

  // Cleanup
  const unsubscribe = () => {
    if (localBc) {
      try {
        localBc.close();
      } catch (e) {}
      localBc = null;
    }
    if (realtimeChannel && supabase) {
      try {
        supabase.removeChannel(realtimeChannel);
      } catch (e) {}
      realtimeChannel = null;
    }
  };

  // Immediately request current state from local channel
  requestCurrentState();

  return {
    requestCurrentState,
    unsubscribe
  };
}

/**
 * Create a dual-transport publisher/subscriber specifically for Ads synchronization across branches & displays
 * Features:
 * 1. BroadcastChannel ('clinic_ads_sync_channel'): 0ms instantaneous cross-tab/cross-monitor sync
 * 2. Supabase Realtime ('clinic_ads_sync'): Cloud WebSockets for wireless iPad / tablets / remote PCs
 * 3. Window Storage Event: native cross-window fallback
 */
export function createAdsSyncHub(onAdsUpdate) {
  const BC_NAME = 'clinic_ads_sync_channel';
  const REALTIME_TOPIC = 'clinic_ads_sync';
  const instanceId = `tab_${Math.random().toString(36).slice(2, 9)}_${Date.now()}`;

  let localBc = null;
  let realtimeChannel = null;

  // 1. BroadcastChannel for local / wired dual-display & multi-tab
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      localBc = new BroadcastChannel(BC_NAME);
      localBc.onmessage = (e) => {
        if (e.data && e.data.type === 'ADS_UPDATE') {
          if (e.data.senderId === instanceId) return; // Prevent self-echo
          if (typeof onAdsUpdate === 'function') {
            onAdsUpdate(e.data);
          }
        }
      };
    } catch (e) {
      console.warn('[AdsSync] BroadcastChannel init error:', e);
    }
  }

  // 2. Supabase Realtime for wireless tablets & remote stations
  if (supabase) {
    try {
      realtimeChannel = supabase.channel(REALTIME_TOPIC, {
        config: { broadcast: { self: false } }
      });
      realtimeChannel.on('broadcast', { event: 'ADS_UPDATE' }, (payload) => {
        const msg = payload?.payload;
        if (msg && msg.senderId !== instanceId) {
          if (typeof onAdsUpdate === 'function') {
            onAdsUpdate(msg);
          }
        }
      });
      realtimeChannel.subscribe();
    } catch (e) {
      console.warn('[AdsSync] Supabase Realtime init error:', e);
    }
  }

  // 3. Storage event fallback for same-origin tabs
  const handleStorage = (e) => {
    if (e.key && e.key.startsWith('clinic_customer_display_ads')) {
      try {
        const parsed = JSON.parse(e.newValue || '{}');
        const bId = e.key.startsWith('clinic_customer_display_ads_')
          ? e.key.replace('clinic_customer_display_ads_', '')
          : 'all';
        if (typeof onAdsUpdate === 'function') {
          onAdsUpdate({
            type: 'ADS_UPDATE',
            source: 'storage_event',
            payload: parsed,
            branchId: bId,
            senderId: 'storage'
          });
        }
      } catch (err) {}
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
  }

  // Broadcast an ads update across all channels
  const broadcastAdsUpdate = (branchId, branchAdsList, allBranchAds) => {
    const packet = {
      type: 'ADS_UPDATE',
      branchId,
      ads: branchAdsList,
      allBranchAds,
      senderId: instanceId,
      timestamp: Date.now()
    };

    if (localBc) {
      try {
        localBc.postMessage(packet);
      } catch (e) {}
    }

    if (realtimeChannel) {
      try {
        realtimeChannel.send({
          type: 'broadcast',
          event: 'ADS_UPDATE',
          payload: packet
        }).catch(() => {});
      } catch (e) {}
    }
  };

  const close = () => {
    if (localBc) {
      try { localBc.close(); } catch (e) {}
      localBc = null;
    }
    if (realtimeChannel && supabase) {
      try { supabase.removeChannel(realtimeChannel); } catch (e) {}
      realtimeChannel = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
    }
  };

  return {
    instanceId,
    broadcastAdsUpdate,
    close
  };
}

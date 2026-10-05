import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  CheckCircle2, ShoppingBag, QrCode, CreditCard, Banknote, Clock, 
  Sparkles, ShieldCheck, Heart, User, ChevronRight, ChevronLeft, 
  Maximize, Minimize, Settings, Volume2, RefreshCw, X, Radio, ArrowRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DEFAULT_CLINIC_ADS } from './DisplayAdsManager';
import { 
  getCachedOrDirectMediaUrl, 
  preloadAllAdsMedia, 
  formatMediaUrl 
} from '../lib/customerDisplayMediaCache';
import { 
  createCustomerDisplaySubscriber, 
  createAdsSyncHub,
  playGentleChime 
} from '../lib/customerDisplaySync';
import { generatePromptPayQrDataUrl } from '../lib/promptpay';
import { formatDirectImageUrl } from '../lib/notificationHub';
import { formatThaiTypography, getTagBadgeStyle } from '../utils/thaiTypography';

import { NO_SLEEP_MP4 } from '../lib/nosleepMedia';

export default function CustomerDisplay({
  branchId: propBranchId,
  stationId: propStationId,
  branchesData = [],
  showToast
}) {
  // 1. Station & Branch Configuration
  const [branchId, setBranchId] = useState(() => {
    if (propBranchId) return propBranchId;
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlBranch = urlParams.get('branch');
      if (urlBranch) return urlBranch;
      const saved = localStorage.getItem('clinic_customer_display_branch');
      if (saved) return saved;
    }
    return 'b1';
  });

  const [stationId, setStationId] = useState(() => {
    if (propStationId) return propStationId;
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlStation = urlParams.get('station');
      if (urlStation) return urlStation;
      const saved = localStorage.getItem('clinic_customer_display_station');
      if (saved) return saved;
    }
    return 'station_1';
  });

  // Display Mode: 'STANDBY_ADS' | 'ACTIVE_CART' | 'PAYMENT_QR' | 'PAYMENT_SUCCESS'
  const [displayMode, setDisplayMode] = useState('STANDBY_ADS');

  // Live POS Data
  const [cartData, setCartData] = useState({
    items: [],
    subtotal: 0,
    discount: 0,
    grandTotal: 0,
    patient: null // { hn, name, nickname, remainingCourses: [] }
  });

  // QR Payment Data
  const [qrPaymentData, setQrPaymentData] = useState({
    qrUrl: '',
    accountName: '',
    accountNumber: '',
    bankName: '',
    bankCode: '',
    amount: 0
  });

  // Payment Success Data
  const [successData, setSuccessData] = useState({
    grandTotal: 0,
    receiptId: '',
    paymentMethod: 'cash'
  });

  // Ads & Signage State
  const [adsList, setAdsList] = useState(DEFAULT_CLINIC_ADS);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPausedByTouch, setIsPausedByTouch] = useState(false);
  const [isChimeEnabled, setIsChimeEnabled] = useState(true);

  // Bufferless Dual Player (Layer A & Layer B)
  const [activeLayer, setActiveLayer] = useState('A'); // 'A' or 'B'
  const [layerAData, setLayerAData] = useState(null);
  const [layerBData, setLayerBData] = useState(null);
  const [textBlockHeight, setTextBlockHeight] = useState(0);
  const textBlockRef = useRef(null);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const videoRefA = useRef(null);
  const videoRefB = useRef(null);
  const keepAliveVideoRef = useRef(null);
  const slideTimerRef = useRef(null);

  // Live Clock Tick (Real-time update)
  const [clockTime, setClockTime] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setClockTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Secret Admin Modal (Opened by 3-Finger Tap x 5 or Ctrl+Alt+S)
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [tempStationId, setTempStationId] = useState(stationId);
  const [tempBranchId, setTempBranchId] = useState(branchId);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [keepAwakeType, setKeepAwakeType] = useState('none'); // 'native' | 'video' | 'audio' | 'none'
  const [keepAwakeNotice, setKeepAwakeNotice] = useState({ show: false, message: '', type: 'info' });
  const wakeLockRef = useRef(null);
  const audioCtxRef = useRef(null);
  const audioSourceRef = useRef(null);
  const keepAwakeUnlockedRef = useRef(false);

  // Secret Touch Gestures tracking
  const touchTapCountRef = useRef(0);
  const lastTouchTapTimeRef = useRef(0);

  // Swipe and touch navigation tracking
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const touchStartTimeRef = useRef(0);
  const touchEndXRef = useRef(0);

  // Success auto-revert timer
  const successTimerRef = useRef(null);

  // Branch Data resolution (Logo, Name, License)
  const [internalBranches, setInternalBranches] = useState(() => {
    if (Array.isArray(branchesData) && branchesData.length > 0) return branchesData;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const cached = localStorage.getItem('clinic_branches_data');
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return [];
  });

  useEffect(() => {
    if (Array.isArray(branchesData) && branchesData.length > 0) {
      setInternalBranches(branchesData);
      try {
        localStorage.setItem('clinic_branches_data', JSON.stringify(branchesData));
      } catch (e) {}
    }
  }, [branchesData]);

  // Current Branch Object
  const currentBranchData = useMemo(() => {
    const list = internalBranches.length > 0 ? internalBranches : (branchesData || []);
    return list.find(b => String(b.id || b.branch_id || '').toLowerCase() === String(branchId || '').toLowerCase()) || list[0] || null;
  }, [internalBranches, branchesData, branchId]);

  const branchLogo = currentBranchData?.logo || '';
  const branchDisplayName = currentBranchData?.clinicRegName || currentBranchData?.clinic_reg_name || currentBranchData?.name || 'อันผิงคลินิกแพทย์แผนจีน';
  const branchSubtitle = currentBranchData?.name || (branchId === 'b1' ? 'สาขาหลัก' : `สาขา ${branchId}`);
  const branchName = branchSubtitle;

  // Helper to extract ads for this specific branch
  const resolveAdsForBranch = useCallback((dataValues, targetBranchId) => {
    if (!dataValues) return null;
    const safeBranch = String(targetBranchId || 'b1').trim().toLowerCase();

    // 1. New Per-Branch format: { branchAds: { b1: [...], b2: [...] } }
    if (dataValues.branchAds && typeof dataValues.branchAds === 'object') {
      const branchList = dataValues.branchAds[safeBranch] || dataValues.branchAds[targetBranchId];
      if (Array.isArray(branchList) && branchList.length > 0) {
        return branchList;
      }
      // If no custom ads configured for this branch, try 'b1' or 'default'
      if (Array.isArray(dataValues.branchAds['b1']) && dataValues.branchAds['b1'].length > 0) {
        return dataValues.branchAds['b1'];
      }
    }

    // 2. Legacy Flat array: { ads: [...] }
    if (Array.isArray(dataValues.ads) && dataValues.ads.length > 0) {
      return dataValues.ads;
    }

    // 3. Raw array
    if (Array.isArray(dataValues) && dataValues.length > 0) {
      return dataValues;
    }

    return null;
  }, []);

  // Active Ads Filtered
  const activeAds = useMemo(() => {
    const list = (adsList || []).filter(ad => ad && ad.isActive !== false && ad.url);
    return list.length > 0 ? list : DEFAULT_CLINIC_ADS;
  }, [adsList]);

  // 1. Fetch Ads from Supabase / LocalStorage & Pre-cache Media & Subscribe to Realtime Sync Hub
  useEffect(() => {
    let isCancelled = false;

    const loadAds = async () => {
      // Check branch-specific localStorage first (0ms instantaneous)
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const branchSpecificCached = localStorage.getItem(`clinic_customer_display_ads_${branchId}`);
          if (branchSpecificCached) {
            const parsed = JSON.parse(branchSpecificCached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setAdsList(parsed);
            }
          } else {
            const generalCached = localStorage.getItem('clinic_customer_display_ads');
            if (generalCached) {
              const parsed = JSON.parse(generalCached);
              const resolved = resolveAdsForBranch(parsed, branchId);
              if (resolved && resolved.length > 0) {
                setAdsList(resolved);
              }
            }
          }
        } catch (e) {}
      }

      // Fetch from Supabase
      if (supabase) {
        try {
          const { data } = await supabase
            .from('settings')
            .select('values')
            .eq('id', 'customer_display_ads')
            .maybeSingle();

          if (!isCancelled && data?.values) {
            const resolved = resolveAdsForBranch(data.values, branchId);
            if (resolved && resolved.length > 0) {
              setAdsList(resolved);
              if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.setItem(`clinic_customer_display_ads_${branchId}`, JSON.stringify(resolved));
                localStorage.setItem('clinic_customer_display_ads', JSON.stringify(data.values));
              }
            }
          }
        } catch (err) {
          console.warn('[Display] Error loading ads:', err);
        }
      }
    };

    loadAds();

    // 2. Real-Time Ads Sync Hub (BroadcastChannel 0ms + Supabase Realtime WebSocket)
    const adsSyncHub = createAdsSyncHub((event) => {
      if (isCancelled || !event) return;

      const eventBranch = String(event.branchId || '').trim().toLowerCase();
      const currentBranch = String(branchId || '').trim().toLowerCase();

      let targetAds = null;
      if (eventBranch === currentBranch || eventBranch === 'all') {
        targetAds = event.ads || resolveAdsForBranch(event.payload, currentBranch);
      } else if (event.allBranchAds && (event.allBranchAds[currentBranch] || event.allBranchAds[branchId])) {
        targetAds = event.allBranchAds[currentBranch] || event.allBranchAds[branchId];
      }

      if (Array.isArray(targetAds) && targetAds.length > 0) {
        setAdsList(targetAds);
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(`clinic_customer_display_ads_${branchId}`, JSON.stringify(targetAds));
        }
      }
    });

    return () => {
      isCancelled = true;
      adsSyncHub.close();
    };
  }, [branchId, resolveAdsForBranch]);

  // Pre-cache all active media into CacheStorage in background
  useEffect(() => {
    if (activeAds.length > 0) {
      preloadAllAdsMedia(activeAds).catch(() => {});
    }
  }, [activeAds]);

  // Measure promotional text block height dynamically to fit bottom gradient overlay precisely (+5% above text)
  useEffect(() => {
    const el = textBlockRef.current;
    if (!el) {
      setTextBlockHeight(0);
      return;
    }

    const measure = () => {
      if (textBlockRef.current) {
        const rect = textBlockRef.current.getBoundingClientRect();
        const h = rect.height || textBlockRef.current.offsetHeight || 0;
        setTextBlockHeight(Math.round(h));
      }
    };

    measure();
    const rafId = requestAnimationFrame(measure);

    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    }

    return () => {
      cancelAnimationFrame(rafId);
      if (ro) ro.disconnect();
    };
  }, [currentSlideIndex, activeLayer, layerAData, layerBData]);

  // Stable references for subscriber callback to prevent unsubscription thrashing
  const isChimeEnabledRef = useRef(isChimeEnabled);
  isChimeEnabledRef.current = isChimeEnabled;
  const cartDataRef = useRef(cartData);
  cartDataRef.current = cartData;

  // 2. Initialize Dual-Transport Pub/Sub Subscriber
  const handleSyncEvent = useCallback((event, payload) => {
    switch (event) {
      case 'CART_UPDATE':
        if (payload && payload.items && payload.items.length > 0) {
          setCartData({
            items: payload.items || [],
            subtotal: payload.subtotal || 0,
            discount: payload.discount || 0,
            grandTotal: payload.grandTotal || 0,
            patient: payload.patient || null
          });
          setDisplayMode('ACTIVE_CART');
        } else if (payload && (!payload.items || payload.items.length === 0)) {
          // Empty cart or cleared
          setDisplayMode('STANDBY_ADS');
        }
        break;

      case 'PAYMENT_QR':
        if (payload) {
          const amt = payload.amount || cartDataRef.current?.grandTotal || 0;
          const qrAccountNo = payload.accountNumber || '';
          let resolvedQr = payload.qrUrl || '';

          // If qrUrl not provided, immediately generate client-side PromptPay QR
          if (!resolvedQr && qrAccountNo && amt > 0) {
            generatePromptPayQrDataUrl(qrAccountNo, amt).then(url => {
              if (url) {
                setQrPaymentData(prev => ({ ...prev, qrUrl: url }));
              }
            }).catch(() => {});
          }

          setQrPaymentData({
            qrUrl: resolvedQr,
            accountName: payload.accountName || 'คลินิกการแพทย์แผนจีนอันผิง',
            accountNumber: qrAccountNo,
            bankName: payload.bankName || '',
            bankCode: payload.bankCode || '',
            amount: amt
          });
          setDisplayMode('PAYMENT_QR');
        }
        break;

      case 'PAYMENT_SUCCESS':
        setSuccessData({
          grandTotal: payload?.grandTotal || cartDataRef.current?.grandTotal || 0,
          receiptId: payload?.receiptId || '',
          paymentMethod: payload?.paymentMethod || 'cash'
        });
        setDisplayMode('PAYMENT_SUCCESS');

        // Play soothing audio chime
        if (isChimeEnabledRef.current) {
          playGentleChime();
        }

        // Auto return to Standby Ads after 4 seconds
        if (successTimerRef.current) clearTimeout(successTimerRef.current);
        successTimerRef.current = setTimeout(() => {
          setDisplayMode('STANDBY_ADS');
          setCartData({ items: [], subtotal: 0, discount: 0, grandTotal: 0, patient: null });
        }, 4200);
        break;

      case 'STANDBY_ADS':
      case 'RESET':
        setDisplayMode('STANDBY_ADS');
        setCartData({ items: [], subtotal: 0, discount: 0, grandTotal: 0, patient: null });
        break;

      case 'CURRENT_STATE':
        if (payload?.mode) {
          setDisplayMode(payload.mode);
          if (payload.cart) setCartData(payload.cart);
          if (payload.qr) setQrPaymentData(payload.qr);
        }
        break;

      default:
        break;
    }
  }, []);

  const handleSyncEventRef = useRef(handleSyncEvent);
  handleSyncEventRef.current = handleSyncEvent;

  // Dual-transport subscriber: bound ONLY to stationId and branchId (permanent lifetime)
  useEffect(() => {
    const subscriber = createCustomerDisplaySubscriber(branchId, stationId, (event, payload, raw) => {
      if (handleSyncEventRef.current) {
        handleSyncEventRef.current(event, payload, raw);
      }
    });

    return () => {
      subscriber.unsubscribe();
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, [branchId, stationId]);

  // Pause all background videos when not in STANDBY_ADS to free GPU/CPU and eliminate jitter
  useEffect(() => {
    if (displayMode === 'STANDBY_ADS') {
      if (activeLayer === 'A' && videoRefA.current && layerAData?.type === 'video') {
        videoRefA.current.play().catch(() => {});
      } else if (activeLayer === 'B' && videoRefB.current && layerBData?.type === 'video') {
        videoRefB.current.play().catch(() => {});
      }
    } else {
      if (videoRefA.current) videoRefA.current.pause();
      if (videoRefB.current) videoRefB.current.pause();
    }
  }, [displayMode, activeLayer, layerAData?.type, layerBData?.type]);

  // 3. Screen Keep-Awake Engine (Triple-Engine: Native Wake Lock + Rendered Video Loop + Silent Web Audio)
  // Guarantees iPad/Android tablets remain in Always-On Display mode without sleeping, even on LAN HTTP.
  const activateKeepAwake = useCallback(async (isUserGesture = false) => {
    let activatedAny = false;

    // A. Native W3C Wake Lock API (Supported in Secure Contexts: HTTPS / localhost)
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        if (!wakeLockRef.current || wakeLockRef.current.released) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          setWakeLockActive(true);
          setKeepAwakeType('native');
          activatedAny = true;
          wakeLockRef.current.addEventListener('release', () => {
            setWakeLockActive(false);
            if (keepAliveVideoRef.current && !keepAliveVideoRef.current.paused) {
              setKeepAwakeType('video');
            } else {
              setKeepAwakeType('none');
            }
          });
        } else {
          setWakeLockActive(true);
          setKeepAwakeType('native');
          activatedAny = true;
        }
      } catch (e) {
        // Expected on insecure LAN HTTP (e.g. http://192.168.x.x) or non-HTTPS tablets
        // Video keep-alive & audio session take over seamlessly below.
      }
    }

    // B. Rendered Silent Video Loop (Tested and proven for iPad Safari & Android tablets over HTTP)
    const vid = keepAliveVideoRef.current;
    if (vid) {
      try {
        if (vid.paused) {
          await vid.play();
        }
        if (!activatedAny) {
          setKeepAwakeType('video');
          activatedAny = true;
        }
      } catch (e) {
        // Video autoplay might require at least one user gesture on strict iOS
      }
    }

    // C. Web Audio API Silent Loop (Keeps iOS Safari media pipeline active)
    try {
      const AudioCtxClass = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
      if (AudioCtxClass) {
        if (!audioCtxRef.current) {
          const ctx = new AudioCtxClass();
          const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.loop = true;
          source.connect(ctx.destination);
          source.start(0);
          audioCtxRef.current = ctx;
          audioSourceRef.current = source;
        } else if (audioCtxRef.current.state === 'suspended' && isUserGesture) {
          await audioCtxRef.current.resume();
        }
        if (!activatedAny && audioCtxRef.current.state === 'running') {
          setKeepAwakeType('audio');
          activatedAny = true;
        }
      }
    } catch (e) {}

    if (activatedAny) {
      keepAwakeUnlockedRef.current = true;
    }

    return activatedAny;
  }, []);

  useEffect(() => {
    let released = false;

    // Initial activation attempt (immediate on mount)
    activateKeepAwake(false);

    // Watchdog and re-activation triggers on user gestures
    const handleReactivate = () => {
      if (!released) {
        activateKeepAwake(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        activateKeepAwake(false);
      }
    };

    window.addEventListener('touchstart', handleReactivate, { passive: true });
    window.addEventListener('pointerdown', handleReactivate, { passive: true });
    window.addEventListener('click', handleReactivate, { passive: true });
    window.addEventListener('keydown', handleReactivate, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    window.addEventListener('pageshow', handleVisibilityChange);
    window.addEventListener('orientationchange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleVisibilityChange);

    // Continuous video loop watchdog
    const vid = keepAliveVideoRef.current;
    const handleVideoEnded = () => {
      if (vid && !released) {
        vid.play().catch(() => {});
      }
    };
    if (vid) {
      vid.addEventListener('ended', handleVideoEnded);
      vid.addEventListener('pause', handleVideoEnded);
    }

    // Periodic safety check every 10 seconds to maintain lock
    const intervalId = setInterval(() => {
      if (!released && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        const isWakeLockLost = 'wakeLock' in navigator && (!wakeLockRef.current || wakeLockRef.current.released);
        const isVideoPaused = keepAliveVideoRef.current && keepAliveVideoRef.current.paused;
        if (isWakeLockLost || isVideoPaused) {
          activateKeepAwake(false);
        }
      }
    }, 10000);

    return () => {
      released = true;
      clearInterval(intervalId);
      window.removeEventListener('touchstart', handleReactivate);
      window.removeEventListener('pointerdown', handleReactivate);
      window.removeEventListener('click', handleReactivate);
      window.removeEventListener('keydown', handleReactivate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      window.removeEventListener('pageshow', handleVisibilityChange);
      window.removeEventListener('orientationchange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleVisibilityChange);
      if (vid) {
        vid.removeEventListener('ended', handleVideoEnded);
        vid.removeEventListener('pause', handleVideoEnded);
      }
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [activateKeepAwake]);

  // 4. Gesture & Swipe Handler for Touch (Single Finger Hold to Pause, Swipe to Navigate, 3-Finger Tap x 5 for Admin)
  const handleTouchStart = (e) => {
    // Single finger interaction
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
      touchStartTimeRef.current = Date.now();
      if (displayMode === 'STANDBY_ADS') {
        setIsPausedByTouch(true);
      }
    }

    // Secret 3-Finger Tap detection
    if (e.touches.length === 3) {
      setIsPausedByTouch(false);
      const now = Date.now();
      if (now - lastTouchTapTimeRef.current < 600) {
        touchTapCountRef.current += 1;
      } else {
        touchTapCountRef.current = 1;
      }
      lastTouchTapTimeRef.current = now;

      if (touchTapCountRef.current >= 5) {
        // 3 fingers tapped 5 times! Open Secret Admin Modal
        touchTapCountRef.current = 0;
        setTempStationId(stationId);
        setTempBranchId(branchId);
        setAdminModalOpen(true);
      }
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && displayMode === 'STANDBY_ADS') {
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const diffX = currentX - touchStartXRef.current;
      const diffY = currentY - touchStartYRef.current;
      // If finger moves more than 15px, user is swiping - cancel hold pause
      if (Math.abs(diffX) > 15 || Math.abs(diffY) > 15) {
        setIsPausedByTouch(false);
      }
    }
  };

  const handleTouchEnd = (e) => {
    setIsPausedByTouch(false);

    // Swipe navigation (single finger swipe)
    if (displayMode === 'STANDBY_ADS' && e.changedTouches && e.changedTouches.length === 1) {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = endX - touchStartXRef.current;
      const diffY = endY - touchStartYRef.current;

      // At least 40px movement and predominantly horizontal
      if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX < 0) {
          goToNextSlide();
        } else {
          goToPrevSlide();
        }
      }
    }
  };

  // Pause active ad video when holding touch to read, and resume when released
  useEffect(() => {
    const activeVideo = activeLayer === 'A' ? videoRefA.current : videoRefB.current;
    if (!activeVideo) return;

    if (isPausedByTouch) {
      activeVideo.pause();
    } else if (displayMode === 'STANDBY_ADS') {
      activeVideo.play().catch(() => {});
    }
  }, [isPausedByTouch, activeLayer, displayMode]);

  // 5. Secret Keyboard Shortcut for PC / HDMI (Ctrl + Alt + S or F2)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey && e.altKey && (e.key === 's' || e.key === 'S')) || e.key === 'F2') {
        e.preventDefault();
        setTempStationId(stationId);
        setTempBranchId(branchId);
        setAdminModalOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stationId, branchId]);

  // Stable refs for crossfade player to prevent race conditions & stale closures
  const activeLayerRef = useRef(activeLayer);
  activeLayerRef.current = activeLayer;
  const currentSlideIndexRef = useRef(currentSlideIndex);
  currentSlideIndexRef.current = currentSlideIndex;
  const activeAdsRef = useRef(activeAds);
  activeAdsRef.current = activeAds;

  // 6. Bufferless Dual-Player Engine (A/B Crossfade)
  const transitionToSlide = useCallback(async (targetIndex) => {
    if (displayMode !== 'STANDBY_ADS') return;
    const ads = activeAdsRef.current;
    if (!ads || ads.length === 0) return;
    const safeIndex = ((targetIndex % ads.length) + ads.length) % ads.length;
    const targetAd = ads[safeIndex];
    if (!targetAd) return;

    // Get cached or direct url
    const cachedUrl = await getCachedOrDirectMediaUrl(targetAd.url, targetAd.type);
    const preparedAd = { ...targetAd, resolvedUrl: cachedUrl };

    const currentLayer = activeLayerRef.current;
    if (currentLayer === 'A') {
      // Prepare Layer B and crossfade
      setLayerBData(preparedAd);
      requestAnimationFrame(() => {
        if (preparedAd.type === 'video' && videoRefB.current) {
          videoRefB.current.currentTime = 0;
          const shouldMute = preparedAd.enableAudio !== true;
          videoRefB.current.muted = shouldMute;
          setIsVideoMuted(shouldMute);
          videoRefB.current.play().catch(() => {
            if (!shouldMute) {
              videoRefB.current.muted = true;
              videoRefB.current.play().catch(() => {});
            }
          });
        }
        setActiveLayer('B');
        activeLayerRef.current = 'B';
        setCurrentSlideIndex(safeIndex);
        currentSlideIndexRef.current = safeIndex;
      });
    } else {
      // Prepare Layer A and crossfade
      setLayerAData(preparedAd);
      requestAnimationFrame(() => {
        if (preparedAd.type === 'video' && videoRefA.current) {
          videoRefA.current.currentTime = 0;
          const shouldMute = preparedAd.enableAudio !== true;
          videoRefA.current.muted = shouldMute;
          setIsVideoMuted(shouldMute);
          videoRefA.current.play().catch(() => {
            if (!shouldMute) {
              videoRefA.current.muted = true;
              videoRefA.current.play().catch(() => {});
            }
          });
        }
        setActiveLayer('A');
        activeLayerRef.current = 'A';
        setCurrentSlideIndex(safeIndex);
        currentSlideIndexRef.current = safeIndex;
      });
    }
  }, [displayMode]);

  const goToNextSlide = useCallback(() => {
    const ads = activeAdsRef.current;
    if (!ads || ads.length === 0) return;
    const nextIndex = (currentSlideIndexRef.current + 1) % ads.length;
    transitionToSlide(nextIndex);
  }, [transitionToSlide]);

  const goToPrevSlide = useCallback(() => {
    const ads = activeAdsRef.current;
    if (!ads || ads.length === 0) return;
    const prevIndex = (currentSlideIndexRef.current - 1 + ads.length) % ads.length;
    transitionToSlide(prevIndex);
  }, [transitionToSlide]);

  // Initial Slide Load & Data Sync
  const isInitialLoadDoneRef = useRef(false);
  useEffect(() => {
    if (activeAds.length > 0 && !isInitialLoadDoneRef.current) {
      isInitialLoadDoneRef.current = true;
      const targetAd = activeAds[0];
      if (targetAd) {
        getCachedOrDirectMediaUrl(targetAd.url, targetAd.type).then(resolvedUrl => {
          setLayerAData({ ...targetAd, resolvedUrl });
          setActiveLayer('A');
        });
      }
    }
  }, [activeAds]);

  // Slide Timer Loop for Standby Mode
  useEffect(() => {
    if (displayMode !== 'STANDBY_ADS' || isPausedByTouch || activeAds.length <= 1) {
      if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
      return;
    }

    const currentAd = activeAds[currentSlideIndex] || activeAds[0];
    const durationMs = (currentAd?.duration || 8) * 1000;

    // If it's a video and autoVideoEnd is true, wait for video 'ended' event instead
    if (currentAd?.type === 'video' && currentAd?.autoVideoEnd) {
      return; // Handled by onEnded event on <video>
    }

    slideTimerRef.current = setTimeout(() => {
      goToNextSlide();
    }, durationMs);

    return () => {
      if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
    };
  }, [displayMode, isPausedByTouch, currentSlideIndex, activeAds, goToNextSlide]);

  // Handle Video Ended (loops seamlessly if single ad/video, or transitions to next slide)
  const handleVideoEnded = (e) => {
    if (displayMode !== 'STANDBY_ADS') return;
    if (activeAds.length <= 1) {
      const vid = e?.target || (activeLayer === 'A' ? videoRefA.current : videoRefB.current);
      if (vid) {
        vid.currentTime = 0;
        vid.play().catch(() => {});
      }
    } else {
      goToNextSlide();
    }
  };

  // Sync video audio mute state with current ad settings
  useEffect(() => {
    const currentAd = (activeLayer === 'A' ? layerAData : layerBData) || activeAds[currentSlideIndex];
    if (currentAd?.type === 'video') {
      const shouldMute = currentAd.enableAudio !== true;
      setIsVideoMuted(shouldMute);
      const vid = activeLayer === 'A' ? videoRefA.current : videoRefB.current;
      if (vid) {
        vid.muted = shouldMute;
        if (!shouldMute) {
          vid.play().catch(() => {
            // Browser autoplay restrictions may require muted playback first
            vid.muted = true;
            vid.play().catch(() => {});
          });
        }
      }
    }
  }, [currentSlideIndex, activeLayer, layerAData, layerBData, activeAds]);

  // Global user interaction listener to unlock unmuted video audio on iOS Safari & Chrome
  useEffect(() => {
    const unlockAudio = () => {
      const currentAd = (activeLayer === 'A' ? layerAData : layerBData) || activeAds[currentSlideIndex];
      if (currentAd?.type === 'video' && currentAd.enableAudio === true) {
        setIsVideoMuted(false);
        if (videoRefA.current) {
          videoRefA.current.muted = false;
          videoRefA.current.play().catch(() => {});
        }
        if (videoRefB.current) {
          videoRefB.current.muted = false;
          videoRefB.current.play().catch(() => {});
        }
      }
    };

    window.addEventListener('click', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, [activeLayer, layerAData, layerBData, activeAds, currentSlideIndex]);

  // Disable context menu (right click / long press image download dialog) on kiosk display
  useEffect(() => {
    const blockContextMenu = (e) => {
      e.preventDefault();
      return false;
    };
    window.addEventListener('contextmenu', blockContextMenu, { capture: true });
    return () => window.removeEventListener('contextmenu', blockContextMenu, { capture: true });
  }, []);

  // Save Station Config
  const handleSaveAdminConfig = () => {
    setStationId(tempStationId);
    setBranchId(tempBranchId);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('clinic_customer_display_station', tempStationId);
      localStorage.setItem('clinic_customer_display_branch', tempBranchId);
    }
    setAdminModalOpen(false);
    showToast?.('ตั้งค่าเคาน์เตอร์และสาขาเรียบร้อย', 'success');
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div 
      className={`fixed inset-0 w-screen h-screen ${displayMode === 'STANDBY_ADS' ? 'bg-slate-950 text-white' : 'bg-[#f8fafc] text-slate-800'} overflow-hidden select-none font-sans`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => { e.preventDefault(); return false; }}
      style={{ 
        touchAction: 'manipulation',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&family=Sarabun:wght@300;400;500;600;700&display=swap');
        * { 
          -webkit-tap-highlight-color: transparent; 
          -webkit-touch-callout: none !important;
          -webkit-user-select: none !important;
          user-select: none !important;
        }
        img, video {
          -webkit-touch-callout: none !important;
          -webkit-user-select: none !important;
          -webkit-user-drag: none !important;
          user-select: none !important;
          pointer-events: none !important;
        }
        .kanit-text { font-family: 'Kanit', sans-serif !important; }
        .sarabun-text { font-family: 'Sarabun', sans-serif !important; }
        .fade-crossfade { transition: opacity 800ms cubic-bezier(0.4, 0, 0.2, 1); }

        /* Eliminate dark border flicker and compositor glitches on customer cart */
        .customer-cart-table {
          border-collapse: separate !important;
          border-spacing: 0 !important;
        }
        .customer-cart-table th,
        .customer-cart-table td {
          border-color: #f1f5f9 !important;
        }
        .customer-cart-row {
          transition: background-color 150ms ease !important;
          border-color: #f1f5f9 !important;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        @supports not selector(::-webkit-scrollbar) {
          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: #e2e8f0 transparent;
          }
        }

        /* Professional Thai Typography Engine */
        .thai-headline {
          font-family: 'Kanit', sans-serif !important;
          text-wrap: balance !important;
          word-break: normal !important;
          overflow-wrap: break-word !important;
          line-break: normal !important;
          font-size: 26px !important;
          line-height: 1.25 !important;
        }
        @media (min-width: 640px) {
          .thai-headline {
            font-size: 38px !important;
            line-height: 1.25 !important;
          }
        }
        @media (min-width: 1024px) {
          .thai-headline {
            font-size: 50px !important;
            line-height: 1.22 !important;
          }
        }

        .thai-subtitle {
          font-family: 'Kanit', sans-serif !important;
          text-wrap: pretty !important;
          word-break: normal !important;
          overflow-wrap: break-word !important;
          line-break: normal !important;
          font-size: 16px !important;
          line-height: 1.55 !important;
        }
        @media (min-width: 640px) {
          .thai-subtitle {
            font-size: 20px !important;
            line-height: 1.55 !important;
          }
        }
        @media (min-width: 1024px) {
          .thai-subtitle {
            font-size: 25px !important;
            line-height: 1.55 !important;
          }
        }

        /* Top-Left Clinic Brand Typography & Sizing */
        .clinic-brand-logo {
          width: 48px !important;
          height: 48px !important;
        }
        @media (min-width: 640px) {
          .clinic-brand-logo {
            width: 62px !important;
            height: 62px !important;
          }
        }
        @media (min-width: 1024px) {
          .clinic-brand-logo {
            width: 76px !important;
            height: 76px !important;
          }
        }

        .clinic-brand-title {
          font-family: 'Kanit', sans-serif !important;
          font-size: 19px !important;
          line-height: 1.25 !important;
          font-weight: 800 !important;
        }
        @media (min-width: 640px) {
          .clinic-brand-title {
            font-size: 25px !important;
            line-height: 1.25 !important;
          }
        }
        @media (min-width: 1024px) {
          .clinic-brand-title {
            font-size: 30px !important;
            line-height: 1.22 !important;
          }
        }

        .clinic-brand-subtitle {
          font-family: 'Kanit', sans-serif !important;
          font-size: 13px !important;
          line-height: 1.3 !important;
          font-weight: 400 !important;
        }
        @media (min-width: 640px) {
          .clinic-brand-subtitle {
            font-size: 15px !important;
          }
        }
        @media (min-width: 1024px) {
          .clinic-brand-subtitle {
            font-size: 17px !important;
          }
        }
      `}</style>

      {/* ============================================================== */}
      {/* 1. STANDBY ADS MODE (Bufferless Dual-Buffer A/B Crossfade)     */}
      {/* ============================================================== */}
      <div 
        className={`absolute inset-0 transition-opacity duration-300 select-none ${
          displayMode === 'STANDBY_ADS' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onContextMenu={(e) => { e.preventDefault(); return false; }}
        onMouseDown={() => setIsPausedByTouch(true)}
        onMouseUp={() => setIsPausedByTouch(false)}
      >
        {/* Layer A */}
        <div 
          className={`absolute inset-0 fade-crossfade pointer-events-none select-none ${
            activeLayer === 'A' ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          {layerAData && (
            layerAData.type === 'video' ? (
              <video
                ref={videoRefA}
                src={layerAData.resolvedUrl || formatMediaUrl(layerAData.url, layerAData.type)}
                className={`w-full h-full pointer-events-none select-none ${layerAData.objectFit === 'contain' ? 'object-contain' : 'object-cover'}`}
                autoPlay
                muted={isVideoMuted}
                loop={activeAds.length <= 1}
                playsInline
                webkit-playsinline="true"
                preload="auto"
                onEnded={handleVideoEnded}
                onContextMenu={(e) => e.preventDefault()}
                onError={(e) => console.warn('[CustomerDisplay] Layer A Video error:', e.target?.error)}
              />
            ) : (
              <img
                src={layerAData.resolvedUrl || formatMediaUrl(layerAData.url, layerAData.type)}
                alt={layerAData.title || 'Slide'}
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                className={`w-full h-full pointer-events-none select-none ${layerAData.objectFit === 'contain' ? 'object-contain' : 'object-cover'}`}
              />
            )
          )}
        </div>

        {/* Layer B */}
        <div 
          className={`absolute inset-0 fade-crossfade pointer-events-none select-none ${
            activeLayer === 'B' ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          {layerBData && (
            layerBData.type === 'video' ? (
              <video
                ref={videoRefB}
                src={layerBData.resolvedUrl || formatMediaUrl(layerBData.url, layerBData.type)}
                className={`w-full h-full pointer-events-none select-none ${layerBData.objectFit === 'contain' ? 'object-contain' : 'object-cover'}`}
                autoPlay
                muted={isVideoMuted}
                loop={activeAds.length <= 1}
                playsInline
                webkit-playsinline="true"
                preload="auto"
                onEnded={handleVideoEnded}
                onContextMenu={(e) => e.preventDefault()}
                onError={(e) => console.warn('[CustomerDisplay] Layer B Video error:', e.target?.error)}
              />
            ) : (
              <img
                src={layerBData.resolvedUrl || formatMediaUrl(layerBData.url, layerBData.type)}
                alt={layerBData.title || 'Slide'}
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                className={`w-full h-full pointer-events-none select-none ${layerBData.objectFit === 'contain' ? 'object-contain' : 'object-cover'}`}
              />
            )
          )}
        </div>

        {/* Subtle Edge Shadows - only at top for clinic badge and bottom for text, center stays 100% crystal clear */}
        <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black/45 via-black/15 to-transparent pointer-events-none z-20" />
        {/* Dynamic Bottom Gradient Overlay (Auto-height strictly covering content + 5% above) */}
        {(() => {
          const currentAd = (activeLayer === 'A' ? layerAData : layerBData) || activeAds[currentSlideIndex];
          const hasText = !!(currentAd?.title || currentAd?.subtitle || currentAd?.tag);
          const isOverlayEnabled = currentAd?.showBottomOverlay !== false;

          if (!hasText || !isOverlayEnabled) return null;

          // Estimate fallback if DOM measurement has not completed on first render frame
          const estimateTextHeight = () => {
            let est = 0;
            if (currentAd?.tag) est += 36;
            if (currentAd?.title) est += (typeof window !== 'undefined' && window.innerWidth >= 1024) ? 70 : 50;
            if (currentAd?.subtitle) est += (typeof window !== 'undefined' && window.innerWidth >= 1024) ? 45 : 35;
            return est;
          };

          const actualContentHeight = textBlockHeight > 0 ? textBlockHeight : estimateTextHeight();
          const bottomOffset = (typeof window !== 'undefined' && window.innerWidth >= 640) ? 32 : 20;
          const totalContentSpan = actualContentHeight + bottomOffset;
          // Overlay strictly covers content and rises only 5% higher than the content
          const totalOverlayHeight = Math.round(totalContentSpan * 1.05);

          return (
            <div 
              className="absolute bottom-0 left-0 right-0 pointer-events-none z-20 transition-all duration-300 ease-out"
              style={{
                height: `${totalOverlayHeight}px`,
                background: 'linear-gradient(to top, rgba(0, 0, 0, 0.88) 0%, rgba(0, 0, 0, 0.72) 40%, rgba(0, 0, 0, 0.35) 75%, rgba(0, 0, 0, 0.10) 92%, rgba(0, 0, 0, 0) 100%)'
              }}
            />
          );
        })()}

        {/* Top Header Bar */}
        {(() => {
          const currentAd = (activeLayer === 'A' ? layerAData : layerBData) || activeAds[currentSlideIndex];
          const isBrandHeaderVisible = currentAd?.showBrandHeader !== false;

          return (
            <div className="absolute top-4 left-4 right-4 sm:top-6 sm:left-6 sm:right-6 md:top-7 md:left-8 md:right-8 flex items-center justify-between gap-3 sm:gap-4 z-30 pointer-events-none">
              {isBrandHeaderVisible ? (
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 mr-2 pointer-events-auto">
                  {branchLogo ? (
                    <img 
                      src={formatDirectImageUrl(branchLogo) || branchLogo}
                      alt={branchDisplayName}
                      draggable={false}
                      onContextMenu={(e) => e.preventDefault()}
                      className="clinic-brand-logo object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.65)] shrink-0 pointer-events-none select-none"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className={`clinic-brand-logo flex items-center justify-center text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.65)] shrink-0 ${branchLogo ? 'hidden' : 'flex'}`}
                  >
                    <Heart className="w-8 h-8 sm:w-10 sm:h-10 text-rose-400 fill-rose-400/30" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="clinic-brand-title text-white tracking-wide drop-shadow-md truncate">
                      {branchDisplayName}
                    </h2>
                    <p className="clinic-brand-subtitle text-white/85 font-light truncate mt-0.5">
                      {branchSubtitle}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex-1" />
              )}

              <div className="flex items-center gap-2 shrink-0">
                <div className="px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl bg-black/50 backdrop-blur-md border border-white/20 text-white shadow-xl flex items-center gap-1.5 sm:gap-2.5 pointer-events-auto whitespace-nowrap">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400 shrink-0" />
                  <span className="text-base sm:text-2xl md:text-3xl font-black font-mono tracking-wider text-white drop-shadow-md">
                    {clockTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Floating Touch Pause Indicator (Centrally placed, never squeezes the header) */}
        {isPausedByTouch && (
          <div className="absolute top-18 sm:top-22 left-1/2 -translate-x-1/2 z-40 px-4 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/25 text-white text-xs font-medium kanit-text shadow-2xl animate-pulse pointer-events-none whitespace-nowrap flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>แตะค้างเพื่อหยุดอ่าน</span>
          </div>
        )}

        {/* Bottom Promos Title & Indicators */}
        {(() => {
          const currentAd = (activeLayer === 'A' ? layerAData : layerBData) || activeAds[currentSlideIndex];
          return (
            <div className="absolute bottom-5 left-4 right-4 sm:bottom-8 sm:left-8 sm:right-8 z-30 flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-4 pointer-events-none">
              <div ref={textBlockRef} className="max-w-4xl min-w-0 flex-1">
                {currentAd?.tag && (() => {
                  const badge = getTagBadgeStyle(currentAd?.tagColor);
                  return (
                    <div className="mb-2 sm:mb-2.5 flex flex-wrap items-center gap-2">
                      <span 
                        className={`text-xs sm:text-sm md:text-base px-3.5 py-1 sm:px-4 sm:py-1.5 rounded-full inline-block transition-all ${badge.className}`}
                        style={badge.style}
                      >
                        {currentAd.tag}
                      </span>
                    </div>
                  );
                })()}
                {currentAd?.title && (
                  <h1 
                    lang="th"
                    className="thai-headline font-black text-white drop-shadow-2xl line-clamp-2"
                  >
                    {formatThaiTypography(currentAd.title)}
                  </h1>
                )}
                {currentAd?.subtitle && (
                  <p 
                    lang="th"
                    className="thai-subtitle font-medium text-white/95 mt-2 sm:mt-2.5 drop-shadow-xl max-w-4xl line-clamp-2"
                  >
                    {formatThaiTypography(currentAd.subtitle)}
                  </p>
                )}
              </div>

              {/* Bottom Right Slide Navigation Dots (Minimal Floating Circles) */}
              {activeAds.length > 1 && (
                <div 
                  className="flex items-center gap-1 sm:gap-1.5 pointer-events-auto shrink-0 self-start md:self-end pb-2 z-40 select-none"
                  onTouchStart={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {activeAds.map((_, idx) => {
                    const isActive = idx === currentSlideIndex;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          transitionToSlide(idx);
                        }}
                        className="p-1 sm:p-1.5 rounded-full flex items-center justify-center cursor-pointer group transition-transform active:scale-75"
                        aria-label={`Go to slide ${idx + 1}`}
                      >
                        <span 
                          className={`block rounded-full transition-all duration-300 ${
                            isActive 
                              ? 'w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white ring-2 ring-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.8)] scale-110' 
                              : 'w-2 h-2 sm:w-2.5 sm:h-2.5 bg-white/40 group-hover:bg-white/75 shadow-[0_1px_4px_rgba(0,0,0,0.6)]'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ============================================================== */}
      {/* 2. ACTIVE CART MODE (Clean Minimal Clinic Aesthetic)           */}
      {/* ============================================================== */}
      <div 
        className={`absolute inset-0 bg-[#f8fafc] text-slate-800 transition-opacity duration-200 ${
          displayMode === 'ACTIVE_CART' ? 'opacity-100 pointer-events-auto z-20' : 'opacity-0 pointer-events-none z-0'
        }`}
      >
        <div className="w-full h-full flex flex-col p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
          {/* Top Info Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
            <div className="flex items-center gap-3.5">
              {branchLogo ? (
                <img 
                  src={formatDirectImageUrl(branchLogo) || branchLogo}
                  alt={branchDisplayName}
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl object-cover border border-slate-200 shadow-sm bg-white shrink-0 pointer-events-none select-none"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`w-13 h-13 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shadow-sm shrink-0 ${branchLogo ? 'hidden' : 'flex'}`}>
                <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 kanit-text tracking-tight">
                  รายการรับบริการ & ชำระเงิน
                </h2>
                <p className="text-xs sm:text-sm md:text-base text-slate-500 kanit-text mt-0.5">
                  <span className="font-semibold text-slate-700">{branchDisplayName}</span> • {branchSubtitle} • เคาน์เตอร์ {stationId.replace('station_', '')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block kanit-text">สถานะ</span>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  กำลังคิดเงิน
                </span>
              </div>
              <div className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-700 flex items-center gap-2 shadow-2xs">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500 shrink-0" />
                <span className="text-base sm:text-xl font-bold font-mono text-slate-800">
                  {clockTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>

          {/* Patient Welcome & Course Balance Card */}
          {cartData.patient && (
            <div className="my-3 sm:my-4 p-4 rounded-2xl bg-white border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-emerald-700 tracking-wide kanit-text">ยินดีต้อนรับ</span>
                    <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                      {cartData.patient.hn || '-'}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 kanit-text">
                    {cartData.patient.name}
                  </h3>
                </div>
              </div>

              {/* Remaining Courses Transparency */}
              {Array.isArray(cartData.patient.remainingCourses) && cartData.patient.remainingCourses.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {cartData.patient.remainingCourses.map((c, i) => (
                    <div 
                      key={c.id || i}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium kanit-text flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{c.name}: คงเหลือ <strong>{c.remaining}</strong> ครั้ง</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Itemized Table */}
          <div className="flex-1 overflow-hidden bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col my-1">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="customer-cart-table w-full text-left sarabun-text">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr className="bg-slate-50 text-slate-600 text-xs sm:text-sm font-semibold kanit-text">
                    <th className="py-3 px-4 sm:px-5 bg-slate-50 border-b border-slate-200">ลำดับ</th>
                    <th className="py-3 px-4 sm:px-5 bg-slate-50 border-b border-slate-200">รายการสินค้า / บริการ</th>
                    <th className="py-3 px-4 sm:px-5 bg-slate-50 border-b border-slate-200 text-center">จำนวน</th>
                    <th className="py-3 px-4 sm:px-5 bg-slate-50 border-b border-slate-200 text-right">ราคา/หน่วย</th>
                    <th className="py-3 px-4 sm:px-5 bg-slate-50 border-b border-slate-200 text-right">รวมเงิน (บาท)</th>
                  </tr>
                </thead>
                <tbody className="text-xs sm:text-sm md:text-base text-slate-700">
                  {cartData.items.map((item, index) => (
                    <tr 
                      key={item.id || item.product?.id || `item_${index}`} 
                      className={`customer-cart-row hover:bg-slate-50/80 ${index > 0 ? 'border-t border-slate-100' : ''}`}
                    >
                      <td className="py-3 px-4 sm:px-5 text-slate-400 font-mono text-xs sm:text-sm">{index + 1}</td>
                      <td className="py-3 px-4 sm:px-5 font-semibold text-slate-800">{item.name || item.product?.name}</td>
                      <td className="py-3 px-4 sm:px-5 text-center font-mono font-bold text-slate-700">{item.quantity}</td>
                      <td className="py-3 px-4 sm:px-5 text-right font-mono text-slate-600">
                        {Number(item.price || item.product?.price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 sm:px-5 text-right font-mono font-bold text-slate-900">
                        {Number(item.total || (item.quantity * (item.price || item.product?.price || 0))).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cart Summary Bottom Bar */}
          <div className="mt-2.5 p-3.5 sm:p-5 border border-slate-200/90 bg-white rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-5 sm:gap-7 text-xs sm:text-sm md:text-base text-slate-600 kanit-text">
              {cartData.discount > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">ส่วนลดพิเศษ:</span>
                  <span className="font-mono text-rose-600 font-bold text-sm sm:text-lg">
                    -{Number(cartData.discount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                  </span>
                </div>
              ) : (
                <div />
              )}
            </div>

            <div className="flex items-center gap-3 sm:gap-3.5">
              <span className="text-sm sm:text-lg md:text-xl font-bold text-slate-700 kanit-text">ยอดชำระสุทธิ:</span>
              <div className="px-5 py-2 sm:px-7 sm:py-2.5 rounded-2xl bg-emerald-600 text-white font-mono font-black text-2xl sm:text-3xl md:text-4xl shadow-md tracking-tight flex items-baseline gap-1.5">
                <span>{Number(cartData.grandTotal).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                <span className="text-sm sm:text-base font-normal opacity-90">บาท</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. PAYMENT QR MODE (Clean Minimal Clinic Aesthetic)           */}
      {/* ============================================================== */}
      <div 
        className={`absolute inset-0 bg-[#f8fafc] text-slate-800 flex items-center justify-center p-4 sm:p-6 transition-opacity duration-200 ${
          displayMode === 'PAYMENT_QR' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-10 max-w-lg w-full flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold tracking-wider text-emerald-700 uppercase kanit-text">
              Thai QR Payment / พร้อมเพย์
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 kanit-text mb-4">
            สแกน QR Code เพื่อชำระเงิน
          </h2>

          {/* Dynamic QR Code Card */}
          <div className="p-5 bg-white rounded-2xl shadow-sm border border-slate-200/90 mb-5 flex flex-col items-center">
            <span className="text-[11px] font-bold tracking-widest text-slate-400 font-mono mb-2 uppercase">
              PROMPTPAY QR
            </span>
            {qrPaymentData.qrUrl ? (
              <img
                src={qrPaymentData.qrUrl}
                alt="Payment QR"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-lg select-none"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
              </div>
            )}
          </div>

          {/* Account Details */}
          <div className="w-full bg-slate-50 rounded-2xl border border-slate-100 p-4 mb-5 text-left kanit-text">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span>ชื่อบัญชี:</span>
              <span className="font-semibold text-slate-800">{qrPaymentData.accountName || 'คลินิกการแพทย์แผนจีนอันผิง'}</span>
            </div>
            {qrPaymentData.accountNumber && (
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                <span>หมายเลขบัญชี / พร้อมเพย์:</span>
                <span className="font-mono font-bold text-emerald-700">{qrPaymentData.accountNumber}</span>
              </div>
            )}
            {qrPaymentData.bankName && (
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>ธนาคาร:</span>
                <span className="text-slate-700 font-medium">{qrPaymentData.bankName}</span>
              </div>
            )}
          </div>

          {/* Total Amount Banner */}
          <div className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl bg-emerald-600 text-white shadow-md">
            <span className="text-sm sm:text-base md:text-lg font-bold kanit-text">ยอดชำระสุทธิ</span>
            <span className="text-2xl sm:text-3xl md:text-4xl font-mono font-black">
              {Number(qrPaymentData.amount || cartData.grandTotal).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. PAYMENT SUCCESS MODE (Clean Minimal Clinic Aesthetic)       */}
      {/* ============================================================== */}
      <div 
        className={`absolute inset-0 bg-[#f8fafc] text-slate-800 flex items-center justify-center p-4 sm:p-6 transition-opacity duration-200 ${
          displayMode === 'PAYMENT_SUCCESS' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-white rounded-3xl border border-emerald-100 shadow-xl p-8 sm:p-12 max-w-lg w-full flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 mb-5 shadow-xs animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 kanit-text mb-2">
            ชำระเงินสำเร็จเรียบร้อย
          </h2>
          <p className="text-sm sm:text-base text-slate-500 kanit-text mb-6 font-light">
            ขอบพระคุณที่ไว้วางใจให้คลินิกการแพทย์แผนจีนอันผิงดูแลสุขภาพของท่าน
          </p>

          <div className="w-full bg-slate-50 rounded-2xl border border-slate-100 p-5 mb-4 text-center">
            <span className="text-xs text-slate-400 block kanit-text mb-1">ยอดเงินที่ชำระ</span>
            <span className="text-3xl sm:text-4xl font-mono font-bold text-emerald-600">
              {Number(successData.grandTotal).toLocaleString('th-TH', { minimumFractionDigits: 2 })} <span className="text-base font-normal">บาท</span>
            </span>
            {successData.receiptId && (
              <span className="text-xs text-slate-400 block font-mono mt-2">
                เลขที่ใบเสร็จ: {successData.receiptId}
              </span>
            )}
          </div>

          <span className="text-xs text-slate-400 kanit-text">
            กำลังกลับสู่หน้าประชาสัมพันธ์...
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. SECRET ADMIN MODAL (Opened via 3-Finger Tap x 5 or Ctrl+Alt+S) */}
      {/* ============================================================== */}
      {adminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6 text-slate-800 kanit-text">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800">ตั้งค่าจอแสดงผล (Admin Mode)</h3>
                  <p className="text-xs text-slate-400 font-normal">กำหนดเคาน์เตอร์และระบบเสียง</p>
                </div>
              </div>
              <button
                onClick={() => setAdminModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Station Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  เลือกจุดเคาน์เตอร์ (Station)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['station_1', 'station_2', 'station_3', 'station_4'].map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setTempStationId(st)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                        tempStationId === st
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>เคาน์เตอร์ {st.replace('station_', '')}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Branch Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  เลือกสาขา (Branch)
                </label>
                <select
                  value={tempBranchId}
                  onChange={(e) => setTempBranchId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                >
                  <option value="b1">สาขา 1 (สำนักงานใหญ่)</option>
                  {(branchesData || []).filter(b => (b.id || b.branch_id) !== 'b1').map(b => (
                    <option key={b.id || b.branch_id} value={b.id || b.branch_id}>
                      {b.name || `สาขา ${b.id}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Toggles */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-700 flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-emerald-600" />
                    <span>เสียงเตือน Chime เมื่อชำระสำเร็จ</span>
                  </span>
                  <button
                    onClick={() => {
                      setIsChimeEnabled(!isChimeEnabled);
                      if (!isChimeEnabled) playGentleChime();
                    }}
                    className={`w-10 h-6 rounded-full transition-colors relative ${
                      isChimeEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <div 
                      className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                        isChimeEnabled ? 'left-5' : 'left-1'
                      }`} 
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-xs text-slate-700 flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-sky-600" />
                    <span>เสียงวิดีโอโฆษณา (Video Audio)</span>
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    ตามที่ตั้งค่าในระบบจัดการโฆษณา
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-xs text-slate-700 flex items-center gap-2">
                    <Maximize className="w-4 h-4 text-slate-500" />
                    <span>โหมดเต็มจอ (Fullscreen)</span>
                  </span>
                  <button
                    onClick={toggleFullscreen}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs text-slate-700 transition-colors shadow-2xs"
                  >
                    {isFullscreen ? 'ออกจากเต็มจอ' : 'เปิดเต็มจอ'}
                  </button>
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-700 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>โหมดจอไม่ดับ (Always-on Display)</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1.5 ${
                        (wakeLockActive || keepAwakeType !== 'none')
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${(wakeLockActive || keepAwakeType !== 'none') ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                        {keepAwakeType === 'native' ? 'Wake Lock API' : keepAwakeType === 'video' ? 'Video Loop (iPad/HTTP)' : keepAwakeType === 'audio' ? 'Audio Session' : 'แตะเพื่อเปิด'}
                      </span>
                      <button
                        type="button"
                        onClick={() => activateKeepAwake(true)}
                        className="px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 text-[11px] font-medium transition-colors flex items-center gap-1 shadow-2xs"
                        title="บังคับเปิดโหมดจอไม่ดับซ้ำ"
                      >
                        <RefreshCw className="w-3 h-3" />
                        เปิดซ้ำ
                      </button>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 font-light pl-6">
                    iPad / แท็บเล็ต: ระบบใช้ Triple-Engine ป้องกันหน้าจอดับอัตโนมัติทั้งบน LAN HTTP และ HTTPS
                  </div>
                </div>
              </div>

              {/* Secret Gesture info and iPad recommendations for staff */}
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-[11px] text-emerald-800 leading-relaxed font-light">
                  💡 <strong>วิธีเปิดหน้าต่างนี้ในอนาคต:</strong> บน iPad ใช้นิ้ว <strong>3 นิ้วแตะพร้อมกัน 5 ครั้ง</strong> ที่ใดก็ได้บนจอ หรือบน PC กดคีย์ลัด <strong>Ctrl + Alt + S</strong>
                </div>
                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 text-[11px] text-amber-800 leading-relaxed font-light">
                  📱 <strong>แนะนำสำหรับการใช้งาน iPad ในคลินิก:</strong> เพื่อความเสถียร 100% ตลอดทั้งวัน ให้ไปที่ <strong>Settings &gt; Display &amp; Brightness &gt; Auto-Lock</strong> และเลือก <strong>Never</strong> เพื่อให้หน้าจอไม่ดับถาวร
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setAdminModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 text-xs transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveAdminConfig}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all"
              >
                บันทึกการตั้งค่า
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invisible silent keep-alive video loop: keeps iPad/tablet screen awake even over LAN HTTP */}
      <video
        ref={keepAliveVideoRef}
        src={NO_SLEEP_MP4}
        loop
        muted
        autoPlay
        playsInline
        webkit-playsinline="true"
        aria-hidden="true"
        style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          width: '4px',
          height: '4px',
          opacity: 0.02,
          pointerEvents: 'none',
          zIndex: 9999
        }}
      />
    </div>
  );
}

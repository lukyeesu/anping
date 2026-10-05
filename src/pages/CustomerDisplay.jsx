import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  CheckCircle2, ShoppingBag, QrCode, CreditCard, Banknote, Clock, 
  Sparkles, ShieldCheck, Heart, User, ChevronRight, ChevronLeft, 
  Maximize, Minimize, Settings, Volume2, RefreshCw, X, Radio, ArrowRight, Megaphone
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DEFAULT_CLINIC_ADS } from './DisplayAdsManager';
import { 
  getCachedOrDirectMediaUrl, 
  preloadAllAdsMedia, 
  formatMediaUrl,
  isMediaVideo,
  addMediaCacheListener
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

// ==============================================================
// Micro-Components for Clock (Isolated 1-second ticks)
// Prevents root CustomerDisplay from re-rendering every 1000ms,
// completely eliminating main-thread stutters / dropped frames during 60fps video playback.
// ==============================================================
const StandbyClock = React.memo(function StandbyClock({ pixelShift }) {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = String(time.getHours()).padStart(2, '0');
  const minutes = String(time.getMinutes()).padStart(2, '0');
  const isColonVisible = time.getSeconds() % 2 === 0;

  return (
    <div 
      className="absolute top-4 right-4 sm:top-6 sm:right-6 md:top-7 md:right-8 z-30 pointer-events-auto shrink-0 select-none"
      style={{
        transform: `translate3d(${pixelShift.x}px, ${pixelShift.y}px, 0)`,
        transition: 'transform 2.5s cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'transform'
      }}
    >
      <div className="px-3.5 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 rounded-2xl sm:rounded-3xl bg-black/60 backdrop-blur-md border border-white/25 text-white shadow-2xl flex items-center gap-2.5 sm:gap-3.5 whitespace-nowrap">
        <Clock className="w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9 text-white shrink-0 stroke-[2.2]" />
        <span className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black font-mono tabular-nums tracking-wide leading-none text-white drop-shadow-lg inline-flex items-center">
          <span>{hours}</span>
          <span className={`inline-block relative -top-[0.05em] transition-opacity duration-150 ${isColonVisible ? 'opacity-100' : 'opacity-20'}`}>
            :
          </span>
          <span>{minutes}</span>
        </span>
      </div>
    </div>
  );
});

const CartClock = React.memo(function CartClock({ pixelShift }) {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = String(time.getHours()).padStart(2, '0');
  const minutes = String(time.getMinutes()).padStart(2, '0');
  const isColonVisible = time.getSeconds() % 2 === 0;

  return (
    <div 
      className="px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-100 border border-slate-200/90 text-slate-800 flex items-center gap-2 sm:gap-2.5 shadow-2xs"
      style={{
        transform: `translate3d(${pixelShift.x}px, ${pixelShift.y}px, 0)`,
        transition: 'transform 2.5s cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'transform'
      }}
    >
      <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 shrink-0" />
      <span className="text-lg sm:text-2xl font-black font-mono text-slate-800 tracking-wide inline-flex items-center">
        <span>{hours}</span>
        <span className={`inline-block relative -top-[0.05em] transition-opacity duration-150 ${isColonVisible ? 'opacity-100' : 'opacity-20'}`}>
          :
        </span>
        <span>{minutes}</span>
      </span>
    </div>
  );
});

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

  // Ads & Signage State (Initialized from cache or empty array, strictly avoiding default fallback)
  const [adsList, setAdsList] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const branchCached = localStorage.getItem(`clinic_customer_display_ads_${branchId}`);
        if (branchCached) {
          const parsed = JSON.parse(branchCached);
          if (Array.isArray(parsed)) return parsed;
        }
        const generalCached = localStorage.getItem('clinic_customer_display_ads');
        if (generalCached) {
          const parsed = JSON.parse(generalCached);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {}
    }
    return [];
  });
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
  const cleanupTimerRef = useRef(null);

  // Minute Tick for Samsung OLED-Style Anti Burn-in Pixel Shift
  // Evaluated every 5 seconds, updating React state strictly once every 60 seconds.
  // This keeps CustomerDisplay from re-rendering every second while video plays smoothly at 60fps.
  const [minuteTick, setMinuteTick] = useState(() => Math.floor(Date.now() / 60000));
  useEffect(() => {
    const timer = setInterval(() => {
      const currentM = Math.floor(Date.now() / 60000);
      setMinuteTick(prev => (prev !== currentM ? currentM : prev));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Detect if an advertisement video is actively playing on screen
  const isAdVideoPlaying = displayMode === 'STANDBY_ADS' && (
    (activeLayer === 'A' && layerAData && isMediaVideo(layerAData.url, layerAData.type)) ||
    (activeLayer === 'B' && layerBData && isMediaVideo(layerBData.url, layerBData.type))
  );
  const isAdVideoPlayingRef = useRef(isAdVideoPlaying);
  isAdVideoPlayingRef.current = isAdVideoPlaying;

  // ==============================================================
  // Samsung OLED-Style Anti Burn-in Pixel Shift (Pixel Orbit)
  // Subtly orbits high-brightness static elements (Logo, Clock, Text)
  // by 1-2 pixels every minute with a 2.5s ease to protect display panels.
  // ==============================================================
  const PIXEL_SHIFT_OFFSETS = useMemo(() => [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 1 },
    { x: 1, y: 2 },
    { x: 0, y: 2 },
    { x: -1, y: 1 },
    { x: -2, y: 0 },
    { x: -2, y: -1 },
    { x: -1, y: -2 },
    { x: 0, y: -2 },
    { x: 1, y: -1 },
    { x: 1, y: 0 },
  ], []);

  const currentMinute = minuteTick % 60;
  const pixelShiftClock = PIXEL_SHIFT_OFFSETS[currentMinute % 12];
  const pixelShiftLogo = PIXEL_SHIFT_OFFSETS[(currentMinute + 3) % 12];
  const pixelShiftCenter = PIXEL_SHIFT_OFFSETS[(currentMinute + 6) % 12];

  // Global Clock Visibility Setting (Persisted in localStorage)
  const [isClockEnabledGlobal, setIsClockEnabledGlobal] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('clinic_customer_display_show_clock');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });

  const toggleClockGlobal = useCallback((val) => {
    setIsClockEnabledGlobal(prev => {
      const nextVal = typeof val === 'boolean' ? val : !prev;
      try {
        localStorage.setItem('clinic_customer_display_show_clock', String(nextVal));
      } catch (e) {}
      return nextVal;
    });
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
    if (!dataValues) return [];
    const safeBranch = String(targetBranchId || 'b1').trim().toLowerCase();

    // 1. New Per-Branch format: { branchAds: { b1: [...], b2: [...] } }
    if (dataValues.branchAds && typeof dataValues.branchAds === 'object') {
      const branchList = dataValues.branchAds[safeBranch] || dataValues.branchAds[targetBranchId];
      if (Array.isArray(branchList)) {
        return branchList;
      }
      // If no custom ads configured for this branch, try 'b1'
      if (Array.isArray(dataValues.branchAds['b1'])) {
        return dataValues.branchAds['b1'];
      }
    }

    // 2. Legacy Flat array: { ads: [...] }
    if (Array.isArray(dataValues.ads)) {
      return dataValues.ads;
    }

    // 3. Raw array
    if (Array.isArray(dataValues)) {
      return dataValues;
    }

    return [];
  }, []);

  // Active Ads Filtered (Strictly user-configured active ads with URL; no resurrecting defaults)
  const activeAds = useMemo(() => {
    return (adsList || []).filter(ad => ad && ad.isActive !== false && ad.url);
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
            if (Array.isArray(parsed)) {
              setAdsList(parsed);
            }
          } else {
            const generalCached = localStorage.getItem('clinic_customer_display_ads');
            if (generalCached) {
              const parsed = JSON.parse(generalCached);
              const resolved = resolveAdsForBranch(parsed, branchId);
              if (Array.isArray(resolved)) {
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
            if (Array.isArray(resolved)) {
              setAdsList(resolved);
              if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.setItem(`clinic_customer_display_ads_${branchId}`, JSON.stringify(resolved));
                localStorage.setItem('clinic_customer_display_ads', JSON.stringify(data.values));
              }
            }
          } else if (!isCancelled) {
            setAdsList([]);
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

      if (Array.isArray(targetAds)) {
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
      if (cleanupTimerRef.current) clearTimeout(cleanupTimerRef.current);
      if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
    };
  }, [branchId, stationId]);

  // Pause all background videos when not in STANDBY_ADS or inactive layer to free GPU/CPU
  useEffect(() => {
    if (displayMode === 'STANDBY_ADS') {
      if (activeLayer === 'A') {
        if (videoRefB.current && !videoRefB.current.paused) { videoRefB.current.muted = true; videoRefB.current.pause(); }
        if (videoRefA.current && layerAData?.type === 'video') {
          if (videoRefA.current.paused) videoRefA.current.play().catch(() => {});
        }
      } else if (activeLayer === 'B') {
        if (videoRefA.current && !videoRefA.current.paused) { videoRefA.current.muted = true; videoRefA.current.pause(); }
        if (videoRefB.current && layerBData?.type === 'video') {
          if (videoRefB.current.paused) videoRefB.current.play().catch(() => {});
        }
      }
    } else {
      if (videoRefA.current && !videoRefA.current.paused) { videoRefA.current.muted = true; videoRefA.current.pause(); }
      if (videoRefB.current && !videoRefB.current.paused) { videoRefB.current.muted = true; videoRefB.current.pause(); }
    }
  }, [displayMode, activeLayer, layerAData?.type, layerBData?.type]);

  // Seamlessly adopt newly cached IndexedDB blob for active playing media
  useEffect(() => {
    const unsub = addMediaCacheListener((cachedUrl, objectUrl) => {
      const currentLayer = activeLayerRef.current;
      const currentAd = (currentLayer === 'A' ? layerAData : layerBData) || activeAds[currentSlideIndexRef.current];
      if (currentAd && currentAd.url === cachedUrl) {
        console.log('[CustomerDisplay] Seamlessly adopting newly cached IndexedDB blob for active media:', cachedUrl);
        if (currentLayer === 'A') {
          setLayerAData(prev => prev ? { ...prev, resolvedUrl: objectUrl } : prev);
          if (videoRefA.current && videoRefA.current.src !== objectUrl) {
            const currentPos = videoRefA.current.currentTime || 0;
            videoRefA.current.src = objectUrl;
            videoRefA.current.currentTime = currentPos;
            videoRefA.current.play().catch(() => {});
          }
        } else {
          setLayerBData(prev => prev ? { ...prev, resolvedUrl: objectUrl } : prev);
          if (videoRefB.current && videoRefB.current.src !== objectUrl) {
            const currentPos = videoRefB.current.currentTime || 0;
            videoRefB.current.src = objectUrl;
            videoRefB.current.currentTime = currentPos;
            videoRefB.current.play().catch(() => {});
          }
        }
      }
    });
    return unsub;
  }, [layerAData, layerBData, activeAds]);

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
    if (vid && !isAdVideoPlayingRef.current) {
      try {
        if (!vid.getAttribute('src')) {
          vid.setAttribute('src', NO_SLEEP_MP4);
          vid.load();
        }
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
    document.addEventListener('webkitfullscreenchange', handleVisibilityChange);

    // Continuous video loop watchdog
    const vid = keepAliveVideoRef.current;
    const handleVideoEnded = () => {
      if (vid && !released && !isAdVideoPlayingRef.current) {
        vid.play().catch(() => {});
      }
    };
    if (vid) {
      vid.addEventListener('ended', handleVideoEnded);
      // NOTE: Removed pause listener to allow keep-alive video to yield without auto-resuming
    }

    // Periodic safety check every 10 seconds to maintain lock
    const intervalId = setInterval(() => {
      if (!released && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        const isWakeLockLost = 'wakeLock' in navigator && (!wakeLockRef.current || wakeLockRef.current.released);
        const isVideoPaused = keepAliveVideoRef.current && keepAliveVideoRef.current.paused;
        if ((isWakeLockLost || isVideoPaused) && !isAdVideoPlayingRef.current) {
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
      document.removeEventListener('webkitfullscreenchange', handleVisibilityChange);
      if (vid) {
        vid.removeEventListener('ended', handleVideoEnded);
      }
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [activateKeepAwake]);

  // Yield hardware video decoder exclusively to the active Ad Video
  // iPad and mobile devices have a single active hardware video decode pipeline.
  // When an Ad Video is playing, we MUST pause and release the keep-alive video loop.
  // The Ad Video natively prevents the screen from sleeping while playing.
  useEffect(() => {
    const keepVid = keepAliveVideoRef.current;
    if (!keepVid) return;

    if (isAdVideoPlaying) {
      try {
        keepVid.pause();
        keepVid.removeAttribute('src');
        keepVid.load();
      } catch (e) {}
    } else {
      try {
        if (!keepVid.getAttribute('src')) {
          keepVid.setAttribute('src', NO_SLEEP_MP4);
          keepVid.load();
        }
        keepVid.play().catch(() => {});
      } catch (e) {}
    }
  }, [isAdVideoPlaying]);

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
      if (!activeVideo.paused) activeVideo.pause();
    } else if (displayMode === 'STANDBY_ADS') {
      if (activeVideo.paused) activeVideo.play().catch(() => {});
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

    // Clear any pending crossfade cleanup timer
    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }

    // Get cached or direct url
    const cachedUrl = await getCachedOrDirectMediaUrl(targetAd.url, targetAd.type);
    const preparedAd = { ...targetAd, resolvedUrl: cachedUrl };

    const currentLayer = activeLayerRef.current;
    if (currentLayer === 'A') {
      // Immediately silence and pause Layer A video so sound stops INSTANTLY (0ms)
      if (videoRefA.current) {
        videoRefA.current.muted = true;
        videoRefA.current.pause();
      }

      // Prepare Layer B and crossfade
      setLayerBData(preparedAd);
      requestAnimationFrame(() => {
        if (preparedAd.type === 'video') {
          const shouldMute = preparedAd.enableAudio !== true;
          setIsVideoMuted(shouldMute);
          if (videoRefB.current) {
            videoRefB.current.currentTime = 0;
            videoRefB.current.muted = shouldMute;
            videoRefB.current.play().catch(() => {
              if (!shouldMute) {
                videoRefB.current.muted = true;
                videoRefB.current.play().catch(() => {});
              }
            });
          }
        } else {
          // If next slide is an image, all video audio must be silent
          setIsVideoMuted(true);
          if (videoRefB.current) { videoRefB.current.muted = true; videoRefB.current.pause(); }
          if (videoRefA.current) { videoRefA.current.muted = true; videoRefA.current.pause(); }
        }
        setActiveLayer('B');
        activeLayerRef.current = 'B';
        setCurrentSlideIndex(safeIndex);
        currentSlideIndexRef.current = safeIndex;

        // Clean up Layer A after crossfade duration (600ms) so no inactive ghost video can ever play in background
        cleanupTimerRef.current = setTimeout(() => {
          setLayerAData(null);
          if (videoRefA.current) {
            videoRefA.current.muted = true;
            videoRefA.current.pause();
            videoRefA.current.removeAttribute('src');
            videoRefA.current.load();
          }
        }, 600);
      });
    } else {
      // Immediately silence and pause Layer B video so sound stops INSTANTLY (0ms)
      if (videoRefB.current) {
        videoRefB.current.muted = true;
        videoRefB.current.pause();
      }

      // Prepare Layer A and crossfade
      setLayerAData(preparedAd);
      requestAnimationFrame(() => {
        if (preparedAd.type === 'video') {
          const shouldMute = preparedAd.enableAudio !== true;
          setIsVideoMuted(shouldMute);
          if (videoRefA.current) {
            videoRefA.current.currentTime = 0;
            videoRefA.current.muted = shouldMute;
            videoRefA.current.play().catch(() => {
              if (!shouldMute) {
                videoRefA.current.muted = true;
                videoRefA.current.play().catch(() => {});
              }
            });
          }
        } else {
          // If next slide is an image, all video audio must be silent
          setIsVideoMuted(true);
          if (videoRefA.current) { videoRefA.current.muted = true; videoRefA.current.pause(); }
          if (videoRefB.current) { videoRefB.current.muted = true; videoRefB.current.pause(); }
        }
        setActiveLayer('A');
        activeLayerRef.current = 'A';
        setCurrentSlideIndex(safeIndex);
        currentSlideIndexRef.current = safeIndex;

        // Clean up Layer B after crossfade duration (600ms) so no inactive ghost video can ever play in background
        cleanupTimerRef.current = setTimeout(() => {
          setLayerBData(null);
          if (videoRefB.current) {
            videoRefB.current.muted = true;
            videoRefB.current.pause();
            videoRefB.current.removeAttribute('src');
            videoRefB.current.load();
          }
        }, 600);
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

  // Data Sync when activeAds changes (Instant refresh, no fallback)
  useEffect(() => {
    if (activeAds.length === 0) {
      setLayerAData(null);
      setLayerBData(null);
      if (videoRefA.current) {
        videoRefA.current.muted = true;
        videoRefA.current.pause();
        videoRefA.current.removeAttribute('src');
        videoRefA.current.load();
      }
      if (videoRefB.current) {
        videoRefB.current.muted = true;
        videoRefB.current.pause();
        videoRefB.current.removeAttribute('src');
        videoRefB.current.load();
      }
      return;
    }

    const safeIndex = currentSlideIndex >= activeAds.length ? 0 : currentSlideIndex;
    if (safeIndex !== currentSlideIndex) {
      setCurrentSlideIndex(safeIndex);
      currentSlideIndexRef.current = safeIndex;
    }

    const targetAd = activeAds[safeIndex];
    if (targetAd) {
      getCachedOrDirectMediaUrl(targetAd.url, targetAd.type).then(resolvedUrl => {
        const prepared = { ...targetAd, resolvedUrl };
        if (activeLayerRef.current === 'A') {
          setLayerAData(prepared);
          setLayerBData(null);
          if (videoRefB.current) {
            videoRefB.current.muted = true;
            videoRefB.current.pause();
            videoRefB.current.removeAttribute('src');
            videoRefB.current.load();
          }
          if (prepared.type === 'video') {
            const shouldMute = prepared.enableAudio !== true;
            setIsVideoMuted(shouldMute);
            if (videoRefA.current) {
              videoRefA.current.currentTime = 0;
              videoRefA.current.muted = shouldMute;
              videoRefA.current.play().catch(() => {});
            }
          } else {
            setIsVideoMuted(true);
            if (videoRefA.current) { videoRefA.current.muted = true; videoRefA.current.pause(); }
          }
        } else {
          setLayerBData(prepared);
          setLayerAData(null);
          if (videoRefA.current) {
            videoRefA.current.muted = true;
            videoRefA.current.pause();
            videoRefA.current.removeAttribute('src');
            videoRefA.current.load();
          }
          if (prepared.type === 'video') {
            const shouldMute = prepared.enableAudio !== true;
            setIsVideoMuted(shouldMute);
            if (videoRefB.current) {
              videoRefB.current.currentTime = 0;
              videoRefB.current.muted = shouldMute;
              videoRefB.current.play().catch(() => {});
            }
          } else {
            setIsVideoMuted(true);
            if (videoRefB.current) { videoRefB.current.muted = true; videoRefB.current.pause(); }
          }
        }
      });
    }
  }, [activeAds]);

  // Slide Timer Loop for Standby Mode (Precise duration execution)
  useEffect(() => {
    if (displayMode !== 'STANDBY_ADS' || isPausedByTouch || activeAds.length <= 1) {
      if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
      return;
    }

    const currentAd = activeAds[currentSlideIndex] || activeAds[0];
    if (!currentAd) return;

    // Clear previous timer
    if (slideTimerRef.current) clearTimeout(slideTimerRef.current);

    // If it's a video and autoVideoEnd is true (or undefined), wait for video 'ended' event
    if (currentAd?.type === 'video' && currentAd?.autoVideoEnd !== false) {
      return; // Handled by onEnded event on the active <video>
    }

    // For all static images, or videos where autoVideoEnd is explicitly false:
    // Strictly respect the duration in seconds (default 8s if not configured)
    const durationSec = Number(currentAd?.duration) > 0 ? Number(currentAd.duration) : 8;
    const durationMs = durationSec * 1000;

    slideTimerRef.current = setTimeout(() => {
      goToNextSlide();
    }, durationMs);

    return () => {
      if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
    };
  }, [displayMode, isPausedByTouch, currentSlideIndex, activeAds, goToNextSlide]);

  // Handle Video Ended (loops seamlessly if single ad/video, or transitions to next slide)
  const handleVideoEnded = useCallback((fromLayer, e) => {
    // CRITICAL: ONLY the currently ACTIVE layer can trigger slide transition!
    // Inactive background video events are strictly discarded.
    if (activeLayerRef.current !== fromLayer) {
      return;
    }
    if (displayMode !== 'STANDBY_ADS') return;

    const ads = activeAdsRef.current;
    if (!ads || ads.length <= 1) {
      const vid = fromLayer === 'A' ? videoRefA.current : videoRefB.current;
      if (vid) {
        const currentAd = ads?.[0];
        if (currentAd) {
          getCachedOrDirectMediaUrl(currentAd.url, currentAd.type).then(cachedUrl => {
            if (cachedUrl && cachedUrl.startsWith('blob:') && vid.src !== cachedUrl) {
              vid.src = cachedUrl;
              vid.load();
            }
            vid.currentTime = 0;
            vid.play().catch(() => {});
          }).catch(() => {
            vid.currentTime = 0;
            vid.play().catch(() => {});
          });
        } else {
          vid.currentTime = 0;
          vid.play().catch(() => {});
        }
      }
      return;
    }

    const currentAd = ads[currentSlideIndexRef.current];
    // If autoVideoEnd is true (or default), advance to next slide when video finishes
    if (currentAd?.autoVideoEnd !== false) {
      goToNextSlide();
    } else {
      // Loop this video seamlessly until the duration timer triggers
      const vid = fromLayer === 'A' ? videoRefA.current : videoRefB.current;
      if (vid) {
        vid.currentTime = 0;
        vid.play().catch(() => {});
      }
    }
  }, [displayMode, goToNextSlide]);

  // Handle Video Playback Error (Auto-advance after 3s so the signage never freezes on broken media)
  const handleVideoError = useCallback((fromLayer, e) => {
    if (activeLayerRef.current !== fromLayer) return;
    console.warn(`[CustomerDisplay] Layer ${fromLayer} Video error:`, e?.target?.error);
    setTimeout(() => {
      if (activeLayerRef.current === fromLayer) {
        goToNextSlide();
      }
    }, 3000);
  }, [goToNextSlide]);

  // Sync video audio mute state strictly with active ad (Guarantees NO sound clashing)
  useEffect(() => {
    if (displayMode !== 'STANDBY_ADS') {
      if (videoRefA.current && !videoRefA.current.paused) { videoRefA.current.muted = true; videoRefA.current.pause(); }
      if (videoRefB.current && !videoRefB.current.paused) { videoRefB.current.muted = true; videoRefB.current.pause(); }
      return;
    }

    const currentAd = (activeLayer === 'A' ? layerAData : layerBData) || activeAds[currentSlideIndex];
    const activeVid = activeLayer === 'A' ? videoRefA.current : videoRefB.current;
    const inactiveVid = activeLayer === 'A' ? videoRefB.current : videoRefA.current;

    // Inactive video MUST ALWAYS be muted and paused
    if (inactiveVid && !inactiveVid.paused) {
      inactiveVid.muted = true;
      inactiveVid.pause();
    }

    if (currentAd?.type === 'video') {
      const shouldMute = currentAd.enableAudio !== true;
      setIsVideoMuted(shouldMute);
      if (activeVid) {
        activeVid.muted = shouldMute;
        if (activeVid.paused) {
          activeVid.play().catch(() => {
            if (!shouldMute) {
              activeVid.muted = true;
              if (activeVid.paused) activeVid.play().catch(() => {});
            }
          });
        }
      }
    } else {
      // If current ad is an image, all video audio must be silent
      setIsVideoMuted(true);
      if (activeVid && !activeVid.paused) {
        activeVid.muted = true;
        activeVid.pause();
      }
    }
  }, [currentSlideIndex, activeLayer, layerAData, layerBData, activeAds, displayMode]);

  // Global user interaction listener to unlock unmuted video audio on iOS Safari & Chrome
  useEffect(() => {
    const unlockAudio = () => {
      const currentAd = (activeLayer === 'A' ? layerAData : layerBData) || activeAds[currentSlideIndex];
      if (currentAd?.type === 'video' && currentAd.enableAudio === true) {
        setIsVideoMuted(false);
        if (activeLayer === 'A' && videoRefA.current) {
          videoRefA.current.muted = false;
          if (videoRefA.current.paused) videoRefA.current.play().catch(() => {});
        } else if (activeLayer === 'B' && videoRefB.current) {
          videoRefB.current.muted = false;
          if (videoRefB.current.paused) videoRefB.current.play().catch(() => {});
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

  // Toggle Fullscreen (Cross-Browser & iOS / iPadOS Safari WebKit Support)
  const toggleFullscreen = () => {
    const doc = document;
    const docEl = document.documentElement;

    const isFull = !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );

    if (!isFull) {
      if (typeof docEl.requestFullscreen === 'function') {
        docEl.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {
          if (typeof docEl.webkitRequestFullscreen === 'function') {
            docEl.webkitRequestFullscreen();
            setIsFullscreen(true);
          }
        });
      } else if (typeof docEl.webkitRequestFullscreen === 'function') {
        docEl.webkitRequestFullscreen();
        setIsFullscreen(true);
      } else if (typeof docEl.webkitRequestFullScreen === 'function') {
        docEl.webkitRequestFullScreen();
        setIsFullscreen(true);
      }
    } else {
      if (typeof doc.exitFullscreen === 'function') {
        doc.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {
          if (typeof doc.webkitExitFullscreen === 'function') {
            doc.webkitExitFullscreen();
            setIsFullscreen(false);
          }
        });
      } else if (typeof doc.webkitExitFullscreen === 'function') {
        doc.webkitExitFullscreen();
        setIsFullscreen(false);
      } else if (typeof doc.webkitCancelFullScreen === 'function') {
        doc.webkitCancelFullScreen();
        setIsFullscreen(false);
      }
    }
  };

  // Sync fullscreen state with native browser events
  useEffect(() => {
    const handleFullscreenSync = () => {
      const isFull = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isFull);
    };
    document.addEventListener('fullscreenchange', handleFullscreenSync);
    document.addEventListener('webkitfullscreenchange', handleFullscreenSync);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenSync);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenSync);
    };
  }, []);

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

        @keyframes welcomeFloat {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes welcomeShimmer {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }

        @keyframes glowPulse {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 0.95;
            transform: scale(1.06);
          }
        }

        .animate-welcome-float {
          animation: welcomeFloat 5s ease-in-out infinite;
        }

        .animate-welcome-shimmer {
          background: linear-gradient(
            90deg, 
            #ffffff 0%, 
            #e4f6e9 25%, 
            #ffffff 50%, 
            #c8ebd0 75%, 
            #ffffff 100%
          );
          background-size: 200% auto;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: welcomeShimmer 6s linear infinite;
        }

        .animate-glow-pulse {
          animation: glowPulse 6s ease-in-out infinite;
        }

        :root {
          --welcome-group-scale: 1.4;
        }

        @media (min-width: 1536px) and (min-height: 850px) {
          :root {
            --welcome-group-scale: 2;
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
        {/* Empty Standby State when activeAds.length === 0 (Anping Clinic TCM Dark Jade Aesthetic) */}
        {activeAds.length === 0 ? (
          <div className="absolute inset-0 bg-[#060e09] flex flex-col items-center justify-center text-center px-6 py-12 select-none z-10 overflow-hidden">
            {/* Ambient Herbal Jade Glows (Matched with Anping Clinic Logo #2D5A3D) */}
            <div className="absolute w-[800px] h-[800px] bg-[#2D5A3D]/18 rounded-full blur-[160px] pointer-events-none -top-28 -left-28 animate-glow-pulse" />
            <div className="absolute w-[750px] h-[750px] bg-[#1b3b28]/30 rounded-full blur-[140px] pointer-events-none -bottom-24 -right-24" />
            <div className="absolute w-[500px] h-[500px] bg-[#3a6b4a]/12 rounded-full blur-[100px] pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

            <div 
              className="relative z-10 flex flex-col items-center max-w-5xl mx-auto px-4"
              style={{
                transform: `translate3d(${pixelShiftCenter.x}px, ${pixelShiftCenter.y}px, 0) scale(var(--welcome-group-scale, 2))`,
                transformOrigin: 'center center',
                transition: 'transform 2.5s cubic-bezier(0.4, 0, 0.2, 1)',
                willChange: 'transform'
              }}
            >
              <div className="flex flex-col items-center w-full animate-welcome-float">
                {/* Prominent Counter Pill: จุดชำระเงิน • เคาน์เตอร์ X */}
                <div className="inline-flex items-center gap-2.5 sm:gap-3.5 px-5 py-2.5 sm:px-7 sm:py-3.5 rounded-2xl sm:rounded-3xl bg-[#14291c]/90 border border-[#2D5A3D]/90 text-[#b5d6bd] shadow-[0_10px_36px_rgba(30,60,40,0.5)] backdrop-blur-md mb-4 sm:mb-5">
                  <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-[#3fa35b] animate-pulse shadow-[0_0_16px_#3fa35b]" />
                  <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black kanit-text tracking-wide text-white">
                    จุดชำระเงิน • เคาน์เตอร์ {stationId.replace('station_', '')}
                  </span>
                </div>

                {/* Prominent "ยินดีต้อนรับ" Headline */}
                <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black kanit-text tracking-tight mb-2 sm:mb-3 drop-shadow-[0_8px_32px_rgba(0,0,0,0.95)] animate-welcome-shimmer">
                  ยินดีต้อนรับ
                </h1>

                {/* Clinic Name (Larger than counter station text, Herbal Sage Tone matching logo) */}
                <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-[#a2d1aa] kanit-text tracking-wide mb-4 sm:mb-5 drop-shadow-lg">
                  {branchDisplayName || 'อันผิงคลินิกแพทย์แผนจีน'}
                </h2>

                {/* Formal Customer Guidance Text */}
                <p className="text-xl sm:text-3xl md:text-4xl lg:text-[42px] font-light text-slate-200/90 kanit-text max-w-5xl leading-snug tracking-normal drop-shadow-md">
                  รายการบริการและยอดชำระเงินจะปรากฏบนหน้าจอนี้<br className="hidden sm:inline" />
                  เมื่อเจ้าหน้าที่ทำรายการ
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
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
                    muted={activeLayer === 'A' ? isVideoMuted : true}
                    playsInline
                    webkit-playsinline="true"
                    disablePictureInPicture
                    disableRemotePlayback
                    preload="metadata"
                    onEnded={(e) => handleVideoEnded('A', e)}
                    onContextMenu={(e) => e.preventDefault()}
                    onError={(e) => handleVideoError('A', e)}
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
                    muted={activeLayer === 'B' ? isVideoMuted : true}
                    playsInline
                    webkit-playsinline="true"
                    disablePictureInPicture
                    disableRemotePlayback
                    preload="metadata"
                    onEnded={(e) => handleVideoEnded('B', e)}
                    onContextMenu={(e) => e.preventDefault()}
                    onError={(e) => handleVideoError('B', e)}
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
                      const badge = getTagBadgeStyle(currentAd);
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

                  {/* Bottom Right Slide Navigation Dots (Minimal Floating Dots & Active Pill) */}
                  {activeAds.length > 1 && (
                    <div 
                      className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto shrink-0 self-start md:self-end pb-2 z-40 select-none"
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
                            className="py-1 px-0.5 sm:py-1.5 sm:px-1 rounded-full flex items-center justify-center cursor-pointer group transition-transform active:scale-90"
                            aria-label={`Go to slide ${idx + 1}`}
                          >
                            <span 
                              className={`block rounded-full transition-all duration-300 ease-out ${
                                isActive 
                                  ? 'w-6 sm:w-8 h-2 sm:h-2.5 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.6)]' 
                                  : 'w-2 sm:w-2.5 h-2 sm:h-2.5 bg-white/40 group-hover:bg-white/70 shadow-[0_1px_4px_rgba(0,0,0,0.4)]'
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
          </>
        )}

        {/* Top-Left Clinic Brand Header (Independent Absolute Container - Never shifts clock) */}
        {(() => {
          const currentAd = (activeLayer === 'A' ? layerAData : layerBData) || activeAds[currentSlideIndex];
          const isBrandHeaderVisible = activeAds.length === 0 || currentAd?.showBrandHeader !== false;
          if (!isBrandHeaderVisible) return null;

          return (
            <div 
              className="absolute top-4 left-4 sm:top-6 sm:left-6 md:top-7 md:left-8 z-30 pointer-events-none max-w-[calc(100%-160px)] sm:max-w-[calc(100%-240px)]"
              style={{
                transform: `translate3d(${pixelShiftLogo.x}px, ${pixelShiftLogo.y}px, 0)`,
                transition: 'transform 2.5s cubic-bezier(0.4, 0, 0.2, 1)',
                willChange: 'transform'
              }}
            >
              <div className="flex items-center gap-3 sm:gap-4 pointer-events-auto">
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
            </div>
          );
        })()}

        {/* Top-Right Fixed Clock (Permanently Fixed Coordinates & High Readability White Icon) */}
        {(() => {
          const currentAd = (activeLayer === 'A' ? layerAData : layerBData) || activeAds[currentSlideIndex];
          const isClockVisible = isClockEnabledGlobal && (activeAds.length === 0 || currentAd?.showClock !== false);
          if (!isClockVisible) return null;

          return <StandbyClock pixelShift={pixelShiftClock} />;
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
            <div 
              className="flex items-center gap-3.5"
              style={{
                transform: `translate3d(${pixelShiftLogo.x}px, ${pixelShiftLogo.y}px, 0)`,
                transition: 'transform 2.5s cubic-bezier(0.4, 0, 0.2, 1)',
                willChange: 'transform'
              }}
            >
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
              <CartClock pixelShift={pixelShiftClock} />
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
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setAdminModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md max-h-[min(88dvh,540px)] flex flex-col text-slate-800 kanit-text overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header (Fixed) */}
            <div className="flex items-center justify-between p-3.5 sm:p-4 pb-3 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-800 leading-tight">ตั้งค่าจอแสดงผล (Admin Mode)</h3>
                  <p className="text-[11px] text-slate-400 font-normal">กำหนดเคาน์เตอร์และระบบเสียง</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdminModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                title="ปิด"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-3.5 sm:p-4 overflow-y-auto flex-1 space-y-3.5 overscroll-contain">
              {/* Prominent Fullscreen Button (โดดเด่นสะดุดตา ใช้งานง่าย) */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className={`w-full py-2.5 sm:py-3 px-4 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-md transition-all active:scale-[0.98] cursor-pointer ${
                  isFullscreen
                    ? 'bg-slate-800 hover:bg-slate-700 text-white shadow-slate-800/20'
                    : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white shadow-emerald-600/30'
                }`}
              >
                <Maximize className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span>{isFullscreen ? 'ออกจากโหมดเต็มจอ (Exit Fullscreen)' : 'เปิดโหมดเต็มจอ (Enter Fullscreen)'}</span>
              </button>

              {/* Station Selection (Compact 4-column row) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  เลือกจุดเคาน์เตอร์ (Station)
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {['station_1', 'station_2', 'station_3', 'station_4'].map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setTempStationId(st)}
                      className={`py-2 px-1 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                        tempStationId === st
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-2xs font-bold'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
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
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                >
                  <option value="b1">สาขา 1 (สำนักงานใหญ่)</option>
                  {(branchesData || []).filter(b => (b.id || b.branch_id) !== 'b1').map(b => (
                    <option key={b.id || b.branch_id} value={b.id || b.branch_id}>
                      {b.name || `สาขา ${b.id}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Toggles & Keep Awake Card */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-700 flex items-center gap-2 font-medium">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span>แสดงนาฬิกามุมขวาบน</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleClockGlobal()}
                    className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                      isClockEnabledGlobal ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <div 
                      className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 ${
                        isClockEnabledGlobal ? 'left-4.5' : 'left-0.5'
                      }`} 
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-700 flex items-center gap-2 font-medium">
                    <Volume2 className="w-4 h-4 text-emerald-600" />
                    <span>เสียงเตือน Chime เมื่อชำระสำเร็จ</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsChimeEnabled(!isChimeEnabled);
                      if (!isChimeEnabled) playGentleChime();
                    }}
                    className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                      isChimeEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <div 
                      className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 ${
                        isChimeEnabled ? 'left-4.5' : 'left-0.5'
                      }`} 
                    />
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-700 flex items-center gap-1.5 font-medium">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>โหมดจอไม่ดับ (Always-On)</span>
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {keepAwakeType === 'native' ? 'Wake Lock API' : keepAwakeType === 'video' ? 'Video Loop (iPad)' : 'ระบบล็อกจอเปิดทำงาน'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      (wakeLockActive || keepAwakeType !== 'none')
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${(wakeLockActive || keepAwakeType !== 'none') ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                      {(wakeLockActive || keepAwakeType !== 'none') ? 'เปิดอยู่' : 'ยังไม่เปิด'}
                    </span>
                    <button
                      type="button"
                      onClick={() => activateKeepAwake(true)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium transition-colors shadow-2xs cursor-pointer"
                      title="บังคับเปิดโหมดจอไม่ดับซ้ำ"
                    >
                      ล็อกจอเปิด
                    </button>
                  </div>
                </div>
              </div>

              {/* Secret Gesture info and iPad recommendations for staff */}
              <div className="space-y-1.5 text-[10.5px]">
                <div className="p-2.5 rounded-xl bg-sky-50/70 border border-sky-100 text-sky-900 leading-relaxed font-light">
                  🚀 <strong>เต็มจอ 100% บน iPad:</strong> กดปุ่มแชร์ Safari &gt; <strong>"เพิ่มไปยังหน้าจอโฮม"</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-emerald-800 leading-relaxed font-light">
                  💡 <strong>เปิดหน้าต่างนี้:</strong> บน iPad ใช้ <strong>3 นิ้วแตะ 5 ครั้ง</strong> หรือบน PC กด <strong>Ctrl + Alt + S</strong>
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="p-3 sm:p-4 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setAdminModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 text-xs transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveAdminConfig}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
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

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { QrCode, Barcode, Camera, Zap, RefreshCw, Ticket, X } from 'lucide-react';
import jsQR from 'jsqr';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';

/**
 * Universal Scanner Modal (QR Code + 1D Barcodes)
 * Hybrid engine: Native BarcodeDetector (GPU/C++) + jsQR (Fast 2D) + ZXing (Universal 1D/2D)
 * Reusable across POSSystem and CouponManager
 */
const QrScannerModal = ({
  isOpen,
  onClose,
  onScan,
  title = 'สแกน QR Code / บาร์โค้ด',
  subtitle = 'ส่องกล้องไปที่ QR Code หรือ Barcode บนสินค้า/คูปอง',
  placeholder = 'เช่น CP-XXXX หรือรหัสบาร์โค้ด',
  inputLabel = 'หรือพิมพ์รหัสด้วยตนเอง',
  actionButtonText = 'ใช้รหัส',
  showToast
}) => {
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [detectedFormat, setDetectedFormat] = useState(null);
  const [focusRing, setFocusRing] = useState({ visible: false, x: 0, y: 0 });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanLoopRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const cameraSessionIdRef = useRef(0);
  const cameraFacingRef = useRef('environment');
  const focusTimerRef = useRef(null);

  const zxingReaderRef = useRef(null);
  const barcodeDetectorRef = useRef(null);

  // Initialize decoding engines
  useEffect(() => {
    // 1. Native BarcodeDetector for hardware-accelerated instant decoding (Chrome, Android, Edge)
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        barcodeDetectorRef.current = new window.BarcodeDetector({
          formats: [
            'qr_code',
            'code_128',
            'code_39',
            'code_93',
            'ean_13',
            'ean_8',
            'upc_a',
            'upc_e',
            'itf',
            'data_matrix',
            'codabar'
          ]
        });
      } catch (e) {
        console.warn('[QrScannerModal] Native BarcodeDetector init:', e);
      }
    }

    // 2. ZXing MultiFormat Reader as universal fallback (Safari iOS, Firefox, etc.)
    try {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.QR_CODE,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.CODE_93,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.ITF,
        BarcodeFormat.CODABAR,
        BarcodeFormat.DATA_MATRIX
      ]);
      hints.set(DecodeHintType.TRY_HARDER, false);
      zxingReaderRef.current = new BrowserMultiFormatReader(hints, 120);
    } catch (e) {
      console.warn('[QrScannerModal] ZXing init warning:', e);
    }

    return () => {
      if (zxingReaderRef.current) {
        try { zxingReaderRef.current.reset(); } catch (_) {}
      }
    };
  }, []);

  const notify = useCallback((msg, type = 'info') => {
    if (typeof showToast === 'function') {
      showToast(msg, type);
    } else {
      console.warn(`[QrScanner] ${type}: ${msg}`);
    }
  }, [showToast]);

  // Audio & haptic feedback on successful detection
  const playScanBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch (_) {}
    if (navigator?.vibrate) {
      try { navigator.vibrate(45); } catch (_) {}
    }
  }, []);

  const stopCamera = useCallback(() => {
    cameraSessionIdRef.current++;
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (zxingReaderRef.current) {
      try { zxingReaderRef.current.reset(); } catch (_) {}
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      } catch (_) {}
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch (_) {}
    }
    setTorchOn(false);
    setScannerActive(false);
    setDetectedFormat(null);
  }, []);

  const parseCode = useCallback((raw) => {
    if (!raw) return '';
    let clean = String(raw).trim();
    const urlMatch = clean.match(/[?&]code=([^&#]+)/i);
    if (urlMatch && urlMatch[1]) {
      try {
        clean = decodeURIComponent(urlMatch[1]).trim();
      } catch (_) {
        clean = urlMatch[1].trim();
      }
    }
    return clean.toUpperCase();
  }, []);

  const handleDetectedCode = useCallback((rawCode, format = null) => {
    const clean = parseCode(rawCode);
    if (!clean) return;
    setDetectedFormat(format);
    playScanBeep();
    stopCamera();
    onClose();
    if (typeof onScan === 'function') {
      onScan(clean);
    }
  }, [onClose, onScan, parseCode, playScanBeep, stopCamera]);

  const startCamera = useCallback(async (facing = cameraFacingRef.current) => {
    const sessionId = ++cameraSessionIdRef.current;
    try {
      setScannerActive(true);
      if (!navigator?.mediaDevices?.getUserMedia) {
        notify('อุปกรณ์หรือเบราว์เซอร์นี้ไม่รองรับการเปิดกล้อง กรุณาพิมพ์รหัสแทน', 'warning');
        setScannerActive(false);
        return;
      }
      if (mediaStreamRef.current) {
        try { mediaStreamRef.current.getTracks().forEach(t => t.stop()); } catch (_) {}
        mediaStreamRef.current = null;
      }
      if (videoRef.current) {
        try { videoRef.current.srcObject = null; } catch (_) {}
      }

      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            focusMode: { ideal: 'continuous' }
          }
        });
      } catch (idealErr) {
        console.warn('[QrScannerModal] 1080p getUserMedia failed, fallback to 720p facingMode:', idealErr);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: { ideal: facing },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          });
        } catch (basicErr) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true
          });
        }
      }

      if (sessionId !== cameraSessionIdRef.current) {
        if (stream) {
          try { stream.getTracks().forEach(t => t.stop()); } catch (_) {}
        }
        return;
      }

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play().catch(() => {});
      }
      const track = stream.getVideoTracks()[0];
      if (track) {
        const cap = typeof track.getCapabilities === 'function' ? track.getCapabilities() : {};
        setHasTorch(Boolean(cap?.torch));

        const advObj = {};
        if (cap.focusMode && Array.isArray(cap.focusMode) && cap.focusMode.includes('continuous')) {
          advObj.focusMode = 'continuous';
        }
        if (cap.exposureMode && Array.isArray(cap.exposureMode) && cap.exposureMode.includes('continuous')) {
          advObj.exposureMode = 'continuous';
        }
        if (Object.keys(advObj).length > 0 && typeof track.applyConstraints === 'function') {
          try {
            await track.applyConstraints({ advanced: [advObj] });
          } catch (_) {}
        }
      }

      // Throttled Hybrid Decode Loop (75ms interval = ~13 scans/sec, zero lag)
      let isProcessingFrame = false;
      let lastProcessTime = 0;

      const tick = async () => {
        if (sessionId !== cameraSessionIdRef.current) return;
        const video = videoRef.current;
        const now = performance.now();

        if (video && video.readyState === video.HAVE_ENOUGH_DATA && !isProcessingFrame && (now - lastProcessTime >= 75)) {
          isProcessingFrame = true;
          lastProcessTime = now;

          try {
            let detectedText = null;
            let formatFound = null;

            // Tier 1: Hardware-Accelerated Native BarcodeDetector (Chrome/Android)
            if (barcodeDetectorRef.current) {
              try {
                const barcodes = await barcodeDetectorRef.current.detect(video);
                if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                  detectedText = barcodes[0].rawValue;
                  formatFound = barcodes[0].format || 'barcode';
                }
              } catch (_) {}
            }

            // Tier 2: jsQR for instant QR code detection
            if (!detectedText) {
              const canvas = canvasRef.current || document.createElement('canvas');
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const qr = jsQR(imgData.data, imgData.width, imgData.height, {
                  inversionAttempts: 'dontInvert'
                });
                if (qr && qr.data) {
                  detectedText = qr.data;
                  formatFound = 'qr_code';
                }
              }
            }

            // Tier 3: ZXing MultiFormat Reader for 1D Barcodes (Code 128, EAN-13, UPC, Code 39)
            if (!detectedText && zxingReaderRef.current) {
              try {
                const result = zxingReaderRef.current.decode(video);
                if (result && result.getText()) {
                  detectedText = result.getText();
                  formatFound = 'barcode';
                }
              } catch (_) {
                // NotFoundException when frame has no readable code
              }
            }

            if (detectedText && sessionId === cameraSessionIdRef.current) {
              handleDetectedCode(detectedText, formatFound);
              return;
            }
          } catch (e) {
            // Ignore temporary frame decoding error
          } finally {
            isProcessingFrame = false;
          }
        }

        scanLoopRef.current = requestAnimationFrame(tick);
      };

      scanLoopRef.current = requestAnimationFrame(tick);
    } catch (err) {
      if (sessionId !== cameraSessionIdRef.current) return;
      console.warn('[QrScannerModal] Camera error:', err);
      notify('ไม่สามารถเปิดกล้องได้ กรุณาพิมพ์รหัสแทน', 'warning');
      setScannerActive(false);
    }
  }, [handleDetectedCode, notify]);

  const toggleTorch = async () => {
    if (!mediaStreamRef.current) return;
    const track = mediaStreamRef.current.getVideoTracks()[0];
    if (track && track.applyConstraints) {
      try {
        await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
        setTorchOn(!torchOn);
      } catch (e) {
        console.warn('[QrScannerModal] Torch failed', e);
      }
    }
  };

  const flipCamera = useCallback(async () => {
    if (isSwitchingCamera) return;
    setIsSwitchingCamera(true);

    try {
      if (navigator?.mediaDevices?.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevs = devices.filter(d => d.kind === 'videoinput');
          if (videoDevs.length === 1) {
            notify('อุปกรณ์นี้มีกล้องเพียงตัวเดียว ไม่สามารถสลับได้', 'info');
            setIsSwitchingCamera(false);
            return;
          }
        } catch (_) {}
      }

      const nextFacing = cameraFacingRef.current === 'environment' ? 'user' : 'environment';
      cameraFacingRef.current = nextFacing;
      setCameraFacing(nextFacing);

      stopCamera();
      await new Promise(r => setTimeout(r, 150));
      await startCamera(nextFacing);
    } catch (err) {
      console.warn('[QrScannerModal] flipCamera failed:', err);
    } finally {
      setIsSwitchingCamera(false);
    }
  }, [isSwitchingCamera, notify, startCamera, stopCamera]);

  const handleTapToFocus = async (e) => {
    if (!videoRef.current || !mediaStreamRef.current) return;
    const rect = videoRef.current.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : rect.left + rect.width / 2);
    const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : rect.top + rect.height / 2);

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    setFocusRing({ visible: true, x, y });
    if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    focusTimerRef.current = setTimeout(() => {
      setFocusRing(prev => ({ ...prev, visible: false }));
    }, 1200);

    const track = mediaStreamRef.current.getVideoTracks()[0];
    if (track && typeof track.applyConstraints === 'function') {
      try {
        const caps = typeof track.getCapabilities === 'function' ? track.getCapabilities() : {};
        const relX = Math.max(0, Math.min(1, x / rect.width));
        const relY = Math.max(0, Math.min(1, y / rect.height));

        if (caps.pointsOfInterest) {
          await track.applyConstraints({
            advanced: [{ pointsOfInterest: [{ x: relX, y: relY }] }]
          });
        } else if (caps.focusMode && Array.isArray(caps.focusMode) && caps.focusMode.includes('continuous')) {
          await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
        }
      } catch (_) {}
    }
  };

  useEffect(() => {
    if (isOpen) {
      setManualInput('');
      setDetectedFormat(null);
      cameraFacingRef.current = 'environment';
      setCameraFacing('environment');
      startCamera('environment');
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    };
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[20000] flex items-center justify-center p-2 md:p-4 bg-black/90 md:bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopCamera();
          onClose();
        }
      }}
    >
      <div className="bg-slate-900 md:bg-white w-full max-w-md [@media(orientation:landscape)_and_(max-height:500px)]:max-w-2xl max-h-[calc(100dvh-1rem)] md:max-h-[92dvh] rounded-2xl md:rounded-3xl shadow-2xl border border-slate-800 md:border-slate-100 overflow-hidden flex flex-col justify-between animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-3.5 py-3 sm:p-5 [@media(max-height:500px)]:py-2.5 [@media(max-height:500px)]:px-4 border-b border-slate-800 md:border-slate-100 flex items-center justify-between gap-2.5 bg-slate-900 md:bg-gradient-to-r md:from-sky-50 md:via-indigo-50/30 md:to-blue-50/50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 [@media(max-height:500px)]:p-1.5 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-xs flex items-center gap-1 shrink-0">
              <QrCode size={16} />
              <Barcode size={16} />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-white md:text-slate-800 text-sm sm:text-base kanit-text leading-tight truncate">{title}</h3>
              <p className="text-[11px] text-slate-400 md:text-slate-500 kanit-text mt-0.5 truncate [@media(max-height:500px)]:hidden">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white md:hover:text-slate-600 rounded-full hover:bg-white/10 md:hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-3.5 sm:p-5 [@media(max-height:500px)]:p-3 min-h-0 overflow-y-auto custom-scrollbar flex-1 flex flex-col">
          <div className="my-auto w-full flex flex-col [@media(orientation:landscape)_and_(max-height:500px)]:flex-row [@media(orientation:landscape)_and_(max-height:500px)]:items-center gap-3.5 sm:gap-4">
            {/* Camera Viewfinder */}
            <div
              className="relative w-full max-w-[min(100%,48dvh)] md:max-w-[340px] [@media(orientation:landscape)_and_(max-height:500px)]:w-[min(45%,44dvh)] [@media(orientation:landscape)_and_(max-height:500px)]:max-w-[210px] [@media(orientation:landscape)_and_(max-height:500px)]:shrink-0 mx-auto [@media(orientation:landscape)_and_(max-height:500px)]:mx-0 aspect-square bg-black rounded-2xl overflow-hidden flex items-center justify-center shadow-inner cursor-crosshair"
              onClick={handleTapToFocus}
            >
              <video ref={videoRef} className={`w-full h-full object-cover ${!scannerActive ? 'hidden' : ''}`} />
              <canvas ref={canvasRef} className="hidden" />

              {/* Tap to Focus Ring */}
              {focusRing.visible && (
                <div
                  className="absolute pointer-events-none z-30 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: focusRing.x, top: focusRing.y }}
                >
                  <div className="w-16 h-16 border-2 border-amber-300 rounded-lg animate-ping opacity-75" />
                  <div className="w-16 h-16 border-2 border-amber-300 rounded-lg absolute inset-0 flex items-center justify-center shadow-[0_0_12px_rgba(252,211,77,0.8)]">
                    <div className="w-1.5 h-1.5 bg-amber-300 rounded-full" />
                  </div>
                </div>
              )}

              {!scannerActive && (
                <div className="text-center p-4 sm:p-6 text-white space-y-2.5">
                  <Camera size={38} className="mx-auto text-slate-500 animate-pulse" />
                  <p className="text-xs text-slate-300 kanit-text">กำลังเริ่มต้นกล้อง...</p>
                </div>
              )}

              {scannerActive && (
                /* Aiming Reticle Overlay */
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-[74%] max-w-[270px] aspect-[4/3] border-2 border-dashed border-sky-400/80 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                    <div className="absolute -top-1 -left-1 w-5 h-5 sm:w-6 sm:h-6 border-t-4 border-l-4 border-sky-400 rounded-tl-lg" />
                    <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 border-t-4 border-r-4 border-sky-400 rounded-tr-lg" />
                    <div className="absolute -bottom-1 -left-1 w-5 h-5 sm:w-6 sm:h-6 border-b-4 border-l-4 border-sky-400 rounded-bl-lg" />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 border-b-4 border-r-4 border-sky-400 rounded-br-lg" />
                    
                    {/* Scanning Laser Animation */}
                    <div className="absolute inset-x-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_10px_#38bdf8] animate-bounce" />

                    {/* Dual Scan Mode Badge */}
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-black/65 backdrop-blur-xs text-white/95 text-[10px] px-2.5 py-0.5 rounded-full border border-white/20 font-medium tracking-wide flex items-center gap-1.5 shadow-sm [@media(max-height:500px)]:hidden">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <span>รองรับ QR Code และ Barcode ทุกชนิด</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Fallback Manual Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualInput.trim()) {
                  handleDetectedCode(manualInput);
                }
              }}
              className="space-y-1.5 flex-1 min-w-0"
            >
              <label className="text-xs font-bold text-slate-300 md:text-slate-600 kanit-text flex items-center gap-1 min-w-0">
                <Ticket size={13} className="text-sky-500 shrink-0" />
                <span className="truncate">{inputLabel}</span>
              </label>
              <div className="flex gap-2 min-w-0">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                  placeholder={placeholder}
                  className="flex-1 min-w-0 px-3 sm:px-3.5 py-2 bg-slate-800 md:bg-white border border-slate-700 md:border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-white md:text-slate-800 uppercase font-data outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
                <button
                  type="submit"
                  disabled={!manualInput.trim()}
                  className="px-3.5 sm:px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold kanit-text transition-all shrink-0 shadow-xs cursor-pointer"
                >
                  {actionButtonText}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer: Camera Action Toolbar */}
        <div className="p-2.5 sm:p-4 [@media(max-height:500px)]:py-2 [@media(max-height:500px)]:px-4 bg-slate-900 md:bg-slate-50 border-t border-slate-800 md:border-slate-100 flex items-center justify-center gap-2.5 sm:gap-3 shrink-0">
          {hasTorch && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`flex-1 min-w-0 max-w-[190px] py-2 sm:py-2.5 [@media(max-height:500px)]:py-1.5 px-3 sm:px-3.5 rounded-xl text-xs sm:text-sm font-bold kanit-text flex items-center justify-center gap-1.5 sm:gap-2 border transition-all shadow-xs cursor-pointer ${
                torchOn
                  ? 'bg-amber-400 border-amber-500 text-slate-900 shadow-amber-200'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              <Zap size={16} className={`shrink-0 ${torchOn ? 'fill-slate-900 text-slate-900' : 'text-amber-500'}`} />
              <span className="truncate">{torchOn ? 'ปิดแฟลช' : 'เปิดแฟลช'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={flipCamera}
            disabled={!scannerActive || isSwitchingCamera}
            className="flex-1 min-w-0 max-w-[190px] py-2 sm:py-2.5 [@media(max-height:500px)]:py-1.5 px-3 sm:px-3.5 rounded-xl text-xs sm:text-sm font-bold kanit-text flex items-center justify-center gap-1.5 sm:gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <RefreshCw size={16} className={`text-sky-500 shrink-0 ${isSwitchingCamera ? 'animate-spin' : ''}`} />
            <span className="truncate">{isSwitchingCamera ? 'กำลังสลับกล้อง...' : 'สลับกล้อง'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default QrScannerModal;

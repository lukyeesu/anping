import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { QrCode, Camera, Zap, RefreshCw, Ticket, X } from 'lucide-react';
import jsQR from 'jsqr';

/**
 * Shared QR Scanner Modal
 * Reusable across POSSystem and CouponManager
 */
const QrScannerModal = ({
  isOpen,
  onClose,
  onScan,
  title = 'สแกน QR Code คูปอง',
  subtitle = 'ส่องกล้องไปที่ QR Code บนคูปองของลูกค้า',
  placeholder = 'เช่น CP-XXXX หรือ URL คูปอง',
  inputLabel = 'หรือพิมพ์รหัสคูปอง',
  actionButtonText = 'ใช้รหัส',
  showToast
}) => {
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [manualInput, setManualInput] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanLoopRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const cameraSessionIdRef = useRef(0);
  const cameraFacingRef = useRef('environment');

  const notify = useCallback((msg, type = 'info') => {
    if (typeof showToast === 'function') {
      showToast(msg, type);
    } else {
      console.warn(`[QrScanner] ${type}: ${msg}`);
    }
  }, [showToast]);

  const stopCamera = useCallback(() => {
    cameraSessionIdRef.current++;
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
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

  const handleDetectedCode = useCallback((rawCode) => {
    const clean = parseCode(rawCode);
    if (!clean) return;
    stopCamera();
    onClose();
    if (typeof onScan === 'function') {
      onScan(clean);
    }
  }, [onClose, onScan, parseCode, stopCamera]);

  const startCamera = useCallback(async (facing = cameraFacingRef.current) => {
    const sessionId = ++cameraSessionIdRef.current;
    try {
      setScannerActive(true);
      if (!navigator?.mediaDevices?.getUserMedia) {
        notify('อุปกรณ์หรือเบราว์เซอร์นี้ไม่รองรับการเปิดกล้อง กรุณาพิมพ์รหัสคูปองแทน', 'warning');
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
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
      } catch (idealErr) {
        console.warn('[QrScannerModal] Ideal facingMode getUserMedia failed, fallback to basic video constraint:', idealErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
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
      const cap = track?.getCapabilities ? track.getCapabilities() : {};
      setHasTorch(Boolean(cap?.torch));

      const tick = () => {
        if (sessionId !== cameraSessionIdRef.current) return;
        const video = videoRef.current;
        if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
          const canvas = canvasRef.current || document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imgData.data, imgData.width, imgData.height, {
              inversionAttempts: 'dontInvert'
            });
            if (code && code.data) {
              handleDetectedCode(code.data);
              return;
            }
          }
        }
        scanLoopRef.current = requestAnimationFrame(tick);
      };
      scanLoopRef.current = requestAnimationFrame(tick);
    } catch (err) {
      if (sessionId !== cameraSessionIdRef.current) return;
      console.warn('[QrScannerModal] Camera error:', err);
      notify('ไม่สามารถเปิดกล้องได้ กรุณาพิมพ์รหัสคูปองแทน', 'warning');
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

  useEffect(() => {
    if (isOpen) {
      setManualInput('');
      cameraFacingRef.current = 'environment';
      setCameraFacing('environment');
      startCamera('environment');
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopCamera();
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[94dvh] shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50 to-blue-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500 text-white shadow-xs">
              <QrCode size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-base kanit-text">{title}</h3>
              <p className="text-[11px] text-slate-500 kanit-text">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Camera Preview */}
          <div className="relative w-full aspect-square bg-black rounded-2xl overflow-hidden flex items-center justify-center shadow-inner">
            <video ref={videoRef} className={`w-full h-full object-cover ${!scannerActive ? 'hidden' : ''}`} />
            <canvas ref={canvasRef} className="hidden" />

            {!scannerActive && (
              <div className="text-center p-6 text-white space-y-3">
                <Camera size={44} className="mx-auto text-slate-500 animate-pulse" />
                <p className="text-xs text-slate-300 kanit-text">กำลังเริ่มต้นกล้อง...</p>
              </div>
            )}

            {scannerActive && (
              /* Aiming Reticle Overlay */
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[70%] max-w-[260px] aspect-square border-2 border-dashed border-sky-400/80 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-sky-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-sky-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-sky-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-sky-400 rounded-br-lg" />
                  {/* Scanning Laser Animation */}
                  <div className="absolute inset-x-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_8px_#38bdf8] animate-bounce" />
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
            className="space-y-1.5"
          >
            <label className="text-xs font-bold text-slate-600 kanit-text flex items-center gap-1">
              <Ticket size={13} className="text-sky-500" /> {inputLabel}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                placeholder={placeholder}
                className="flex-1 px-3.5 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 uppercase font-data outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
              <button
                type="submit"
                disabled={!manualInput.trim()}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold kanit-text transition-all shrink-0 shadow-xs"
              >
                {actionButtonText}
              </button>
            </div>
          </form>
        </div>

        {/* Footer: Camera Action Toolbar */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-3 shrink-0">
          {hasTorch && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`flex-1 max-w-[190px] py-2.5 px-3.5 rounded-xl text-xs sm:text-sm font-bold kanit-text flex items-center justify-center gap-2 border transition-all shadow-xs ${
                torchOn
                  ? 'bg-amber-400 border-amber-500 text-slate-900 shadow-amber-200'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              <Zap size={16} className={torchOn ? 'fill-slate-900 text-slate-900' : 'text-amber-500'} />
              <span>{torchOn ? 'ปิดแฟลช' : 'เปิดแฟลช'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={flipCamera}
            disabled={!scannerActive || isSwitchingCamera}
            className="flex-1 max-w-[190px] py-2.5 px-3.5 rounded-xl text-xs sm:text-sm font-bold kanit-text flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={16} className={`text-sky-500 ${isSwitchingCamera ? 'animate-spin' : ''}`} />
            <span>{isSwitchingCamera ? 'กำลังสลับกล้อง...' : 'สลับกล้อง'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default QrScannerModal;

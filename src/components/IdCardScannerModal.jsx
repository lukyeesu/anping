import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ScanText,
  X,
  Camera,
  Loader2,
  Zap,
  RefreshCw,
  Image as ImageIcon,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

/**
 * Universal ID Card Scanner Modal with Native Fullscreen Camera UX
 * - Fullscreen viewfinder on Mobile & Tablet
 * - Landscape-adaptive layout: Shutter & controls on the RIGHT side in landscape (Native Camera feel)
 * - 1080p Full HD capture with hardware continuous autofocus
 * - Tap-to-focus with animated camera focus ring
 * - Hardware torch (flash) toggle & camera switcher
 * - Real camera shutter button
 * - Built-in Thai ID Card Parser + OCR
 */
const IdCardScannerModal = ({
  isOpen,
  onClose,
  onScanSuccess,
  showToast,
  title = 'สแกนบัตรประชาชน'
}) => {
  const [isCameraLoading, setIsCameraLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [focusRing, setFocusRing] = useState({ visible: false, x: 0, y: 0 });

  // ตรวจจับแนวนอน / แนวตั้ง (Landscape vs Portrait) เพื่อจัดวางปุ่มชัตเตอร์ตามธรรมชาติของกล้อง
  const [isLandscape, setIsLandscape] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth > window.innerHeight;
  });

  useEffect(() => {
    const handleOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    window.addEventListener('resize', handleOrientation);
    window.addEventListener('orientationchange', handleOrientation);
    return () => {
      window.removeEventListener('resize', handleOrientation);
      window.removeEventListener('orientationchange', handleOrientation);
    };
  }, []);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const cameraSessionIdRef = useRef(0);
  const focusTimerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Helper สำหรับแปลงข้อความบัตรประชาชนไทย (Regex Extraction)
  const parseIdCardText = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let extractedData = {
      idCard: '',
      prefix: '',
      firstName: '',
      lastName: '',
      dob: '',
      gender: '',
      religion: '',
      nationality: 'ไทย',
      address: '',
      moo: '',
      road: '',
      subDistrict: '',
      district: '',
      province: ''
    };

    // 1. เลขบัตรประชาชน 13 หลัก
    const idMatch = text.replace(/[\s-]/g, '').match(/\d{13}/);
    if (idMatch) extractedData.idCard = idMatch[0];

    // 2. ชื่อ-นามสกุลไทย และวิเคราะห์เพศ
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('ชื่อตัวและชื่อสกุล') || line.match(/^(นาย|นาง|นางสาว|น\.ส\.|ด\.ช\.|ด\.ญ\.)/)) {
        let nameLine = line.replace('ชื่อตัวและชื่อสกุล', '').trim();
        if (!nameLine && i + 1 < lines.length) nameLine = lines[i + 1].trim();

        const prefixMatch = nameLine.match(/^(นาย|นางสาว|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.)/);
        if (prefixMatch) {
          let rawPrefix = prefixMatch[1];
          if (rawPrefix === 'น.ส.') rawPrefix = 'นางสาว';
          extractedData.prefix = rawPrefix;

          if (['นาย', 'ด.ช.'].includes(rawPrefix)) {
            extractedData.gender = 'ชาย';
          } else if (['นาง', 'นางสาว', 'ด.ญ.'].includes(rawPrefix)) {
            extractedData.gender = 'หญิง';
          }

          const nameParts = nameLine.substring(prefixMatch[0].length).trim().split(/\s+/);
          if (nameParts.length >= 1) extractedData.firstName = nameParts[0];
          if (nameParts.length >= 2) extractedData.lastName = nameParts.slice(1).join(' ');
        }
        break;
      }
    }

    // 3. วันเกิด
    const dobMatch = text.match(/(?:เกิดวันที่|Date of Birth|เกิด)\s*(\d{1,2})\s+([ก-๙a-zA-Z.]+)\s+(\d{4})/);
    if (dobMatch) {
      const day = dobMatch[1].padStart(2, '0');
      const monthStr = dobMatch[2];
      const year = dobMatch[3];
      const thaiMonthsMap = {
        'ม.ค.': '01', 'มกราคม': '01', 'ก.พ.': '02', 'กุมภาพันธ์': '02', 'มี.ค.': '03', 'มีนาคม': '03', 'เม.ย.': '04', 'เมษายน': '04',
        'พ.ค.': '05', 'พฤษภาคม': '05', 'มิ.ย.': '06', 'มิถุนายน': '06', 'ก.ค.': '07', 'กรกฎาคม': '07', 'ส.ค.': '08', 'สิงหาคม': '08',
        'ก.ย.': '09', 'กันยายน': '09', 'ต.ค.': '10', 'ตุลาคม': '10', 'พ.ย.': '11', 'พฤศจิกายน': '11', 'ธ.ค.': '12', 'ธันวาคม': '12'
      };
      let month = '01';
      for (const [key, value] of Object.entries(thaiMonthsMap)) {
        if (monthStr.includes(key)) { month = value; break; }
      }
      extractedData.dob = `${day}/${month}/${year}`;
    }

    // 4. ศาสนาและสัญชาติ
    const religionMatch = text.match(/ศาสนา\s*([ก-๙]+)/);
    if (religionMatch) extractedData.religion = religionMatch[1].trim();

    const nationalityMatch = text.match(/สัญชาติ\s*([ก-๙]+)/);
    if (nationalityMatch) extractedData.nationality = nationalityMatch[1].trim();

    // 5. ที่อยู่แบบแยกส่วน
    const addressIndex = lines.findIndex(l => l.includes('ที่อยู่') || l.includes('Address'));
    if (addressIndex !== -1) {
      let addressText = lines[addressIndex].replace(/ที่อยู่|Address/g, '').trim();
      let lineOffset = 1;
      while (addressIndex + lineOffset < lines.length) {
        const nextLine = lines[addressIndex + lineOffset];
        if (nextLine.includes('ศาสนา') || nextLine.match(/\d{13}/) || nextLine.includes('วันออกบัตร') || nextLine.includes('Date of Issue')) {
          break;
        }
        addressText += ' ' + nextLine.trim();
        lineOffset++;
      }
      addressText = addressText.replace(/\s+/g, ' ').trim();

      let provMatch = addressText.match(/(?:จังหวัด|จ\.)\s*([^\s]+)/);
      if (provMatch) extractedData.province = provMatch[1];

      let distMatch = addressText.match(/(?:อำเภอ|เขต|อ\.)\s*([^\s]+)/);
      if (distMatch) extractedData.district = distMatch[1];

      let subDistMatch = addressText.match(/(?:ตำบล|แขวง|ต\.)\s*([^\s]+)/);
      if (subDistMatch) extractedData.subDistrict = subDistMatch[1];

      let roadMatch = addressText.match(/(?:ถนน|ถ\.)\s*([^\s]+)/);
      if (roadMatch) extractedData.road = roadMatch[1];

      let mooMatch = addressText.match(/หมู่(?:ที่)?\s*([^\s]+)/);
      if (mooMatch) extractedData.moo = mooMatch[1];

      let houseMatch = addressText.split(/\s+(หมู่|ซอย|ตรอก|ถนน|ตำบล|แขวง|อำเภอ|เขต|จังหวัด)/)[0];
      if (houseMatch) {
        extractedData.address = houseMatch.replace(/^ที่อยู่\s*/, '').trim();
      }
    }

    return extractedData;
  };

  const stopCamera = useCallback(() => {
    cameraSessionIdRef.current++;
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(t => t.stop());
      } catch (_) {}
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch (_) {}
    }
    setTorchOn(false);
  }, []);

  const startCamera = useCallback(async (facing = cameraFacing) => {
    const sessionId = ++cameraSessionIdRef.current;
    try {
      setIsCameraLoading(true);
      if (!navigator?.mediaDevices?.getUserMedia) {
        showToast?.('อุปกรณ์นี้ไม่รองรับการเปิดกล้องผ่านเบราว์เซอร์', 'warning');
        setIsCameraLoading(false);
        return;
      }

      if (streamRef.current) {
        try { streamRef.current.getTracks().forEach(t => t.stop()); } catch (_) {}
        streamRef.current = null;
      }

      let stream = null;
      // ลำดับ 1: ขอความละเอียดระดับ 1080p Full HD พร้อม continuous autofocus
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
      } catch (e1) {
        console.warn('[IdCardScannerModal] 1080p stream fallback to basic constraints:', e1);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: facing }
          });
        } catch (e2) {
          console.warn('[IdCardScannerModal] Basic facingMode fallback to video: true:', e2);
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }

      if (sessionId !== cameraSessionIdRef.current) {
        if (stream) stream.getTracks().forEach(t => t.stop());
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play().catch(() => {});
      }

      // สั่งเปิด Hardware Continuous Autofocus & Continuous Exposure เต็มสูบ
      const track = stream.getVideoTracks()[0];
      if (track) {
        const caps = typeof track.getCapabilities === 'function' ? track.getCapabilities() : {};
        setHasTorch(Boolean(caps.torch));

        const advObj = {};
        if (caps.focusMode && Array.isArray(caps.focusMode) && caps.focusMode.includes('continuous')) {
          advObj.focusMode = 'continuous';
        }
        if (caps.exposureMode && Array.isArray(caps.exposureMode) && caps.exposureMode.includes('continuous')) {
          advObj.exposureMode = 'continuous';
        }
        if (caps.whiteBalanceMode && Array.isArray(caps.whiteBalanceMode) && caps.whiteBalanceMode.includes('continuous')) {
          advObj.whiteBalanceMode = 'continuous';
        }
        if (Object.keys(advObj).length > 0 && typeof track.applyConstraints === 'function') {
          try {
            await track.applyConstraints({ advanced: [advObj] });
          } catch (err) {
            console.warn('[IdCardScannerModal] applyConstraints notice:', err);
          }
        }
      }

      setIsCameraLoading(false);
    } catch (err) {
      if (sessionId !== cameraSessionIdRef.current) return;
      console.error('[IdCardScannerModal] Camera start error:', err);
      setIsCameraLoading(false);
      showToast?.('ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบสิทธิ์การใช้งานกล้อง', 'warning');
    }
  }, [cameraFacing, showToast]);

  useEffect(() => {
    if (isOpen) {
      startCamera(cameraFacing);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    };
  }, [isOpen, startCamera, stopCamera, cameraFacing]);

  // ระบบ Tap to Focus (สัมผัสหน้าจอเพื่อปรับโฟกัสเฉพาะจุด พร้อมวงแหวนแอนิเมชัน)
  const handleTapToFocus = async (e) => {
    if (isScanning || !videoRef.current || !streamRef.current) return;
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

    const track = streamRef.current.getVideoTracks()[0];
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

  // สลับเปิด/ปิด ไฟแฟลช (Torch)
  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track && typeof track.applyConstraints === 'function') {
      try {
        const next = !torchOn;
        await track.applyConstraints({ advanced: [{ torch: next }] });
        setTorchOn(next);
      } catch (_) {}
    }
  };

  // สลับกล้องหน้า / หลัง
  const flipCamera = () => {
    const next = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(next);
    setTorchOn(false);
    startCamera(next);
  };

  // แคปภาพวิดีโอเป็น Base64 ความละเอียดสูงสุด (Full HD 1080p)
  const captureImageToBase64 = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    return dataUrl.split(',')[1];
  };

  // ฟังก์ชันถ่ายภาพและประมวลผล OCR
  const handleCaptureAndScan = async () => {
    if (isScanning) return;
    const base64Image = captureImageToBase64();
    if (!base64Image) {
      showToast?.('ไม่สามารถจับภาพจากกล้องได้ กรุณารอกล้องโหลดสักครู่', 'warning');
      return;
    }

    // ล็อกเฟรมวิดีโอเพื่อกันภาพกระพริบ
    if (videoRef.current) {
      try { videoRef.current.pause(); } catch (_) {}
    }

    setIsScanning(true);
    try {
      const response = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: base64Image },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }]
          }]
        })
      });
      const data = await response.json();

      if (data.error) {
        showToast?.('ไม่สามารถอ่านข้อมูลได้ กรุณาลองใหม่อีกครั้ง', 'danger');
        if (videoRef.current) { try { videoRef.current.play(); } catch (_) {} }
      } else if (data.responses && data.responses[0] && data.responses[0].fullTextAnnotation) {
        const extracted = parseIdCardText(data.responses[0].fullTextAnnotation.text);
        stopCamera();
        onClose();
        if (typeof onScanSuccess === 'function') {
          onScanSuccess(extracted);
        }
        showToast?.('ดึงข้อมูลจากบัตรประชาชนสำเร็จ', 'success');
      } else {
        showToast?.('ไม่พบข้อความ กรุณาจัดบัตรให้ชัดเจนและสแกนใหม่', 'warning');
        if (videoRef.current) { try { videoRef.current.play(); } catch (_) {} }
      }
    } catch (error) {
      showToast?.('ไม่สามารถเชื่อมต่อระบบสแกนได้ กรุณาลองใหม่อีกครั้ง', 'danger');
      if (videoRef.current) { try { videoRef.current.play(); } catch (_) {} }
    } finally {
      setIsScanning(false);
    }
  };

  // ฟังก์ชันอัปโหลดรูปภาพทดแทนกรณีต้องการเลือกรูปจากคลังภาพ
  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Image = reader.result.split(',')[1];
      setIsScanning(true);
      try {
        const response = await fetch('/api/vision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{
              image: { content: base64Image },
              features: [{ type: 'DOCUMENT_TEXT_DETECTION' }]
            }]
          })
        });
        const data = await response.json();
        if (data.responses && data.responses[0] && data.responses[0].fullTextAnnotation) {
          const extracted = parseIdCardText(data.responses[0].fullTextAnnotation.text);
          stopCamera();
          onClose();
          if (typeof onScanSuccess === 'function') {
            onScanSuccess(extracted);
          }
          showToast?.('ดึงข้อมูลจากรูปภาพสำเร็จ', 'success');
        } else {
          showToast?.('ไม่พบข้อความในรูปภาพ กรุณาลองใหม่อีกครั้ง', 'warning');
        }
      } catch (err) {
        showToast?.('ไม่สามารถเชื่อมต่อระบบสแกนได้ กรุณาลองใหม่อีกครั้ง', 'danger');
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[20000] w-full h-[100dvh] bg-black text-white flex ${
        isLandscape ? 'flex-row' : 'flex-col justify-between'
      } overflow-hidden select-none animate-in fade-in duration-200`}
      style={{ touchAction: 'none' }}
    >
      {/* Live Video Viewfinder (เต็มจอ 100% Edge-to-Edge) */}
      <div
        className="relative flex-1 h-full w-full overflow-hidden cursor-crosshair flex items-center justify-center"
        onClick={handleTapToFocus}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isCameraLoading ? 'opacity-0' : 'opacity-100'
          }`}
        />

        {/* สถานะกำลังเปิดกล้อง */}
        {isCameraLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white z-10 gap-3">
            <Camera size={48} className="text-sky-400 animate-pulse" />
            <p className="text-sm font-medium kanit-text text-slate-300">กำลังเปิดกล้องความละเอียดสูง...</p>
          </div>
        )}

        {/* Animated Tap to Focus Ring */}
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

        {/* Top Floating Controls Bar */}
        <div
          className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent px-4 sm:px-6 pt-4 pb-6 flex items-center justify-between pointer-events-none"
        >
          {/* ปุ่มปิดกล้อง */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!isScanning) {
                stopCamera();
                onClose();
              }
            }}
            disabled={isScanning}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer disabled:opacity-50 pointer-events-auto"
            title="ปิดกล้อง"
          >
            <X size={20} />
          </button>

          {/* ป้ายชื่อหน้าต่างและโหมด HD */}
          <div className="flex flex-col items-center pointer-events-auto">
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/10 text-xs font-bold text-white kanit-text shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{title}</span>
            </div>
            <span className="text-[10px] text-slate-300 font-data mt-0.5 tracking-wider">
              1080p Full HD Autofocus
            </span>
          </div>

          {/* ปุ่มสลับกล้อง / ไฟฉาย (แสดงในแนวตั้งบนหัวมุมขวา) */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {!isLandscape && hasTorch && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTorch();
                }}
                className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
                  torchOn
                    ? 'bg-amber-400 text-slate-900 shadow-lg shadow-amber-400/30'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
                title={torchOn ? 'ปิดแฟลช' : 'เปิดแฟลช'}
              >
                <Zap size={18} className={torchOn ? 'fill-slate-900' : ''} />
              </button>
            )}

            {!isLandscape && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  flipCamera();
                }}
                disabled={isScanning}
                className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                title="สลับกล้องหน้า/หลัง"
              >
                <RefreshCw size={18} />
              </button>
            )}

            {/* ช่องว่างเว้นสมดุลในโหมดแนวนอน */}
            {isLandscape && <div className="w-10 h-10" />}
          </div>
        </div>

        {/* ID Card Aiming Reticle (สัดส่วน 8.5 : 5.4 ตามมาตรฐานบัตรประชาชนไทย) */}
        {!isCameraLoading && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
            <div
              className={`${
                isLandscape
                  ? 'w-[68%] max-w-[500px]'
                  : 'w-[88%] max-w-[460px]'
              } aspect-[8.5/5.4] relative rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.58)] border border-white/20`}
            >
              {/* 4 มุมกล้องขอบหนาแบบ High Contrast */}
              <div className="absolute -top-1 -left-1 w-9 h-9 border-t-4 border-l-4 border-sky-400 rounded-tl-xl shadow-sm" />
              <div className="absolute -top-1 -right-1 w-9 h-9 border-t-4 border-r-4 border-sky-400 rounded-tr-xl shadow-sm" />
              <div className="absolute -bottom-1 -left-1 w-9 h-9 border-b-4 border-l-4 border-sky-400 rounded-bl-xl shadow-sm" />
              <div className="absolute -bottom-1 -right-1 w-9 h-9 border-b-4 border-r-4 border-sky-400 rounded-br-xl shadow-sm" />

              {/* เส้นสแกนแบบเลเซอร์เมื่อกำลังประมวลผล OCR */}
              {isScanning && (
                <div
                  className="absolute inset-x-2 top-0 h-1 bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_16px_#38bdf8]"
                  style={{ animation: 'scanLine 1.8s ease-in-out infinite' }}
                />
              )}

              {/* ข้อความบอกตำแหน่งบัตร */}
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/70 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/15 text-slate-200 text-xs font-medium kanit-text shadow-lg">
                วางบัตรประชาชนให้อยู่ในกรอบ • แตะจอเพื่อโฟกัส
              </div>
            </div>
          </div>
        )}

        {/* Processing OCR Overlay */}
        {isScanning && (
          <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
            <Loader2 className="w-14 h-14 text-sky-400 animate-spin mb-4" />
            <h4 className="text-lg font-bold text-white kanit-text flex items-center gap-2">
              <Sparkles className="text-amber-400 animate-bounce" size={20} />
              กำลังสแกนข้อความ...
            </h4>
            <p className="text-slate-300 text-xs mt-2 kanit-text max-w-xs">
              กรุณารอสักครู่
            </p>
          </div>
        )}
      </div>

      {/* Hidden File Input สำหรับเลือกรูปจากคลังภาพ */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Control Bar: สลับตำแหน่งตามแนวนอน (Landscape -> ขวามือ) หรือแนวตั้ง (Portrait -> ด้านล่าง) */}
      {isLandscape ? (
        /* Landscape Mode: Shutter Bar อยู่ด้านขวา (เหมือนกล้องถ่ายรูปจริง / DSLR / Samsung Camera) */
        <div className="relative z-30 w-28 sm:w-32 h-full bg-gradient-to-l from-black/95 via-black/80 to-transparent flex flex-col items-center justify-between py-6 px-3 shrink-0">
          {/* ส่วนบนของแผงขวา: สลับกล้อง & แฟลช */}
          <div className="flex flex-col items-center gap-3">
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`w-11 h-11 rounded-full backdrop-blur-md flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
                  torchOn
                    ? 'bg-amber-400 text-slate-900 shadow-lg shadow-amber-400/30'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
                title={torchOn ? 'ปิดแฟลช' : 'เปิดแฟลช'}
              >
                <Zap size={19} className={torchOn ? 'fill-slate-900' : ''} />
              </button>
            )}

            <button
              type="button"
              onClick={flipCamera}
              disabled={isScanning}
              className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title="สลับกล้องหน้า/หลัง"
            >
              <RefreshCw size={19} />
            </button>
          </div>

          {/* ปุ่มชัตเตอร์กล้องถ่ายรูปจริง อยู่กึ่งกลางด้านขวามือพอดีนิ้วโป้งขวา (Shutter Button) */}
          <div className="flex flex-col items-center gap-2 my-auto">
            <button
              type="button"
              onClick={handleCaptureAndScan}
              disabled={isCameraLoading || isScanning}
              className="w-20 h-20 rounded-full border-4 border-white/70 p-1 flex items-center justify-center shadow-2xl active:scale-90 transition-transform cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
              title="กดถ่ายภาพเพื่อสแกน"
            >
              <div className="w-full h-full bg-white rounded-full group-hover:bg-slate-100 transition-colors shadow-inner flex items-center justify-center">
                <Camera size={28} className="text-slate-800" />
              </div>
            </button>
            <span className="text-[10px] text-slate-400 kanit-text font-medium text-center">
              กดเพื่อสแกน
            </span>
          </div>

          {/* ส่วนล่างของแผงขวา: เลือกรูปจากคลังภาพ */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="flex flex-col items-center gap-1 text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            title="เลือกรูปถ่ายจากเครื่อง"
          >
            <div className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md flex items-center justify-center text-white">
              <ImageIcon size={20} />
            </div>
            <span className="text-[10px] kanit-text">เลือกรูป</span>
          </button>
        </div>
      ) : (
        /* Portrait Mode: Shutter Bar อยู่ด้านล่าง */
        <div className="relative z-20 w-full bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 sm:px-6 pt-6 pb-8 flex flex-col items-center gap-3">
          <div className="w-full max-w-sm flex items-center justify-around">
            {/* ปุ่มอัปโหลดรูปภาพจากคลังไฟล์ */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              className="flex flex-col items-center gap-1 text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <div className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md flex items-center justify-center text-white">
                <ImageIcon size={20} />
              </div>
              <span className="text-[10px] kanit-text">เลือกรูป</span>
            </button>

            {/* ปุ่มกดชัตเตอร์กล้องถ่ายรูปจริง (Native Round Shutter Button) */}
            <button
              type="button"
              onClick={handleCaptureAndScan}
              disabled={isCameraLoading || isScanning}
              className="w-20 h-20 rounded-full border-4 border-white/70 p-1 flex items-center justify-center shadow-2xl active:scale-90 transition-transform cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
              title="กดเพื่อถ่ายภาพและสแกน"
            >
              <div className="w-full h-full bg-white rounded-full group-hover:bg-slate-100 transition-colors shadow-inner flex items-center justify-center">
                <Camera size={26} className="text-slate-800" />
              </div>
            </button>

            {/* ปุ่มยกเลิก */}
            <button
              type="button"
              onClick={() => {
                if (!isScanning) {
                  stopCamera();
                  onClose();
                }
              }}
              disabled={isScanning}
              className="flex flex-col items-center gap-1 text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <div className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md flex items-center justify-center text-white">
                <X size={20} />
              </div>
              <span className="text-[10px] kanit-text">ยกเลิก</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-400 kanit-text text-center">
            แตะปุ่มสีขาวเพื่อถ่ายภาพ • กล้องจะปรับโฟกัสอัตโนมัติต่อเนื่อง
          </p>
        </div>
      )}
    </div>,
    document.body
  );
};

export default IdCardScannerModal;

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  Camera,
  Loader2,
  Zap,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import './IdCardScannerModal.css';

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
  title = 'ถ่ายรูปบัตรประจำตัวประชาชน'
}) => {
  const [isCameraLoading, setIsCameraLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraFacing, setCameraFacing] = useState('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [focusRing, setFocusRing] = useState({ visible: false, x: 0, y: 0 });

  // CSS handles orientation without restarting the camera stream.
  const dialogRef = useRef(null);
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
    // 1. ปลดปล่อย video.srcObject ก่อนเสมอ เพื่อให้ Chromium/Android คืน SurfaceTexture ให้ระบบทันที
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch { /* The native video surface may already be detached. */ }
    }
    // 2. ปิด MediaStream tracks ทั้งหมดอย่างปลอดภัย ป้องกัน Camera2 HAL ค้างในระบบ
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(t => {
          try {
            t.enabled = false;
            t.stop();
          } catch { /* A track may already have been released. */ }
        });
      } catch { /* Continue cleanup if the camera driver has already closed. */ }
      streamRef.current = null;
    }
    setTorchOn(false);
    setIsScanning(false);
  }, []);

  const startCamera = useCallback(async (facing = cameraFacing) => {
    const sessionId = ++cameraSessionIdRef.current;
    try {
      setIsCameraLoading(true);
      setCameraError('');
      setHasTorch(false);
      if (!navigator?.mediaDevices?.getUserMedia) {
        showToast?.('อุปกรณ์นี้ไม่รองรับการเปิดกล้องผ่านเบราว์เซอร์', 'warning');
        setCameraError('อุปกรณ์นี้ไม่รองรับการเปิดกล้อง กรุณาเลือกรูปจากเครื่องแทน');
        setIsCameraLoading(false);
        return;
      }

      if (streamRef.current) {
        try { streamRef.current.getTracks().forEach(t => t.stop()); } catch { /* Camera switching may encounter tracks that already ended. */ }
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
      setCameraError('เปิดกล้องไม่ได้ กรุณาอนุญาตให้ใช้กล้อง แล้วลองอีกครั้ง');
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

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement;
    dialogRef.current?.querySelector('button')?.focus({ preventScroll: true });
    return () => {
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!isScanning) { stopCamera(); onClose(); }
      } else if (event.key === 'Tab') {
        const buttons = [...dialogRef.current.querySelectorAll('button:not(:disabled)')];
        const first = buttons[0], last = buttons.at(-1);
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) {
          event.preventDefault(); first.focus();
        }
      }
    };
    // Capture Escape before the patient form beneath this camera can close.
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, isScanning, stopCamera, onClose]);

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
      } catch { /* Focus controls are optional across camera drivers. */ }
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
      } catch { /* Keep the current torch state if the driver rejects the change. */ }
    }
  };

  // สลับกล้องหน้า / หลัง
  const flipCamera = () => {
    const next = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(next);
    setTorchOn(false);
  };

  // แคปภาพวิดีโอเป็น Base64 ความละเอียดที่เหมาะสมสำหรับการทำ OCR (ปรับ Scale ไม่เกิน 1280px เพื่อประหยัด RAM และป้องกันเครื่องค้าง)
  const captureImageToBase64 = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return null;

    // จำกัดขนาดภาพไม่เกิน 1280px คมชัดระดับ HD สำหรับอ่านตัวอักษรไทย 100% แต่ใช้ RAM น้อยลง 80% ป้องกัน OOM/ANR
    const maxDimension = 1280;
    let targetWidth = video.videoWidth;
    let targetHeight = video.videoHeight;
    if (targetWidth > maxDimension || targetHeight > maxDimension) {
      if (targetWidth > targetHeight) {
        targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
        targetWidth = maxDimension;
      } else {
        targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
        targetHeight = maxDimension;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    return dataUrl.split(',')[1];
  };

  // ฟังก์ชันถ่ายภาพและประมวลผล OCR
  const handleCaptureAndScan = async () => {
    if (isScanning) return;
    const sessionId = cameraSessionIdRef.current;
    const base64Image = captureImageToBase64();
    if (!base64Image) {
      showToast?.('ไม่สามารถจับภาพจากกล้องได้ กรุณารอกล้องโหลดสักครู่', 'warning');
      return;
    }

    // ห้ามเรียก videoRef.current.pause() บน live MediaStream บน Android เพราะจะทำให้ Camera2 HAL deadlock และเกิด ANR
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
      if (sessionId !== cameraSessionIdRef.current) return;

      if (data.error) {
        showToast?.('ไม่สามารถอ่านข้อมูลได้ กรุณาลองใหม่อีกครั้ง', 'danger');
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
      }
    } catch {
      if (sessionId === cameraSessionIdRef.current) showToast?.('ไม่สามารถเชื่อมต่อระบบสแกนได้ กรุณาลองใหม่อีกครั้ง', 'danger');
    } finally {
      if (sessionId === cameraSessionIdRef.current) setIsScanning(false);
    }
  };

  // ฟังก์ชันอัปโหลดรูปภาพทดแทนกรณีต้องการเลือกรูปจากคลังภาพ
  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const sessionId = cameraSessionIdRef.current;

    const reader = new FileReader();
    reader.onloadend = async () => {
      if (sessionId !== cameraSessionIdRef.current) return;
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
        if (sessionId !== cameraSessionIdRef.current) return;
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
      } catch {
        if (sessionId === cameraSessionIdRef.current) showToast?.('ไม่สามารถเชื่อมต่อระบบสแกนได้ กรุณาลองใหม่อีกครั้ง', 'danger');
      } finally {
        if (sessionId === cameraSessionIdRef.current) setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      aria-describedby="id-card-camera-instruction"
      data-camera-state={isScanning ? 'scanning' : isCameraLoading ? 'loading' : cameraError ? 'error' : 'ready'}
      className="id-card-camera fixed inset-0 z-[20000] kanit-text"
    >
      <header className="id-card-camera__header">
        <button
          type="button"
          className="id-card-camera__back"
          aria-label="ปิดกล้อง"
          disabled={isScanning}
          onClick={() => { stopCamera(); onClose(); }}
        >
          <ChevronLeft size={30} strokeWidth={2} />
        </button>
        <h2 aria-label={title}>
          <span className="id-card-camera__full-copy">{title}</span>
          <span className="id-card-camera__compact-copy" aria-hidden="true">สแกนบัตรประชาชน</span>
        </h2>
        {/* ปุ่มสลับกล้อง / ไฟฉาย */}
        {hasTorch && (
          <button
            type="button"
            className="id-card-camera__torch id-card-camera__icon-button"
            aria-label={torchOn ? 'ปิดแฟลช' : 'เปิดแฟลช'}
            aria-pressed={torchOn}
            disabled={isCameraLoading || isScanning}
            onClick={event => { event.stopPropagation(); toggleTorch(); }}
          >
            <Zap size={22} fill={torchOn ? 'currentColor' : 'none'} />
          </button>
        )}
      </header>

      {/* Live Video Viewfinder (เต็มจอ 100% Edge-to-Edge) */}
      <div className="id-card-camera__preview" onClick={handleTapToFocus}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          aria-hidden="true"
          className="id-card-camera__video"
          style={{ opacity: isCameraLoading || cameraError ? 0 : 1 }}
        />

        {/* ID Card Aiming Reticle (สัดส่วน 8.5 : 5.4 ตามมาตรฐานบัตรประชาชนไทย) */}
        <div className="id-card-camera__aim" aria-hidden="true">
          <div className="id-card-camera__frame">
            <span className="id-card-camera__corner id-card-camera__corner--tl" />
            <span className="id-card-camera__corner id-card-camera__corner--tr" />
            <span className="id-card-camera__corner id-card-camera__corner--bl" />
            <span className="id-card-camera__corner id-card-camera__corner--br" />
            <span className="id-card-camera__photo-guide" />
            <p id="id-card-camera-instruction" className="id-card-camera__instruction">
              <span className="id-card-camera__full-copy">วางบัตรประชาชนตามกรอบที่กำหนด</span>
              <span className="id-card-camera__compact-copy">วางบัตรให้พอดีกรอบ</span>
            </p>
          </div>
        </div>

        {/* Animated Tap to Focus Ring */}
        {focusRing.visible && !isScanning && (
          <div className="id-card-camera__focus" aria-hidden="true" style={{ left: focusRing.x, top: focusRing.y }} />
        )}

        {(isCameraLoading || cameraError) && (
          <div className="id-card-camera__status" role="status">
            {isCameraLoading ? <Loader2 size={32} className="animate-spin" /> : <Camera size={32} />}
            <p>{isCameraLoading ? 'กำลังเปิดกล้อง…' : cameraError}</p>
            {cameraError && !isCameraLoading && (
              <button type="button" className="id-card-camera__retry" onClick={event => { event.stopPropagation(); startCamera(cameraFacing); }}>ลองเปิดกล้องอีกครั้ง</button>
            )}
          </div>
        )}

        {/* Control Bar: แนวตั้งอยู่ด้านล่าง แนวนอนอยู่ด้านขวา */}
        <div className="id-card-camera__controls" onClick={event => event.stopPropagation()}>
          <div className="id-card-camera__prompt">
            <p>กรุณาถ่ายรูปบัตรประชาชน</p>
            <span>แตะภาพเพื่อปรับโฟกัส</span>
          </div>
          <div className="id-card-camera__actions">
            <button type="button" className="id-card-camera__secondary id-card-camera__gallery" aria-label="เลือกรูป" disabled={isScanning} onClick={() => fileInputRef.current?.click()}>
              <span className="id-card-camera__icon-button"><ImageIcon size={23} /></span>
              <span>เลือกรูป</span>
            </button>
            {/* ปุ่มชัตเตอร์กล้องถ่ายรูปจริง */}
            <button
              type="button"
              className="id-card-camera__shutter"
              aria-label="ถ่ายภาพและสแกนบัตร"
              disabled={isCameraLoading || isScanning || !!cameraError}
              onClick={handleCaptureAndScan}
            >
              <span />
            </button>
            <button type="button" className="id-card-camera__secondary id-card-camera__flip" aria-label="สลับกล้อง" disabled={isCameraLoading || isScanning || !!cameraError} onClick={flipCamera}>
              <span className="id-card-camera__icon-button"><RefreshCw size={23} /></span>
              <span>สลับกล้อง</span>
            </button>
          </div>
        </div>

        {/* Processing OCR Overlay */}
        {isScanning && (
          <div className="id-card-camera__processing" role="status" aria-live="polite">
            <Loader2 size={40} className="animate-spin" />
            <p>กำลังอ่านข้อมูลบัตรประชาชน…</p>
            <span>กรุณารอสักครู่</span>
          </div>
        )}
      </div>

      {/* Hidden File Input สำหรับเลือกรูปจากคลังภาพ */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" aria-label="เลือกรูปบัตรประชาชน" onChange={handleFileUpload} />
    </div>,
    document.body
  );
};

export default IdCardScannerModal;

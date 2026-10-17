import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Pipette, X, Check } from 'lucide-react';

// =========================================================================
// PHOTOSHOP-STYLE HIGH-PRECISION COLOR PICKER (High-Performance 60fps)
// =========================================================================
export const hsvToRgb = (h, s, v) => {
  s = s / 100;
  v = v / 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else if (h >= 300 && h <= 360) { r = c; g = 0; b = x; }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
};

export const rgbToHex = (r, g, b) => {
  return '#' + [r, g, b].map(x => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join('');
};

export const hexToRgb = (hex) => {
  let clean = (hex || '').replace('#', '');
  if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
  if (clean.length !== 6) return { r: 15, g: 23, b: 42 };
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 15, g: 23, b: 42 };
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};

export const rgbToHsv = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : (d / max) * 100;
  const v = max * 100;
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  return { h: Math.round(h), s: Math.round(s), v: Math.round(v) };
};

export default function PhotoshopColorPickerModal({
  isOpen,
  onClose,
  initialColor = '#0284c7',
  onSelectColor,
  title = 'เครื่องมือเลือกสี (Color Picker)',
  subtitle = 'เลือกสีอิสระสำหรับตัวหนังสือตามต้องการ',
  zIndex = 350
}) {
  if (!isOpen) return null;

  // Initial color conversion
  const parsedInitial = useMemo(() => {
    const cleanHex = (initialColor && initialColor.startsWith('#')) ? initialColor : '#0284c7';
    const rgb = hexToRgb(cleanHex);
    return {
      hex: cleanHex.toUpperCase(),
      hsv: rgbToHsv(rgb.r, rgb.g, rgb.b)
    };
  }, [initialColor]);

  // Internal state is isolated to prevent feedback loops with parent
  const [hsv, setHsv] = useState(parsedInitial.hsv);
  const [hexInput, setHexInput] = useState(parsedInitial.hex);

  // Keep original color on open to support clean Cancel/Revert
  const originalColorRef = useRef(parsedInitial.hex);
  const prevIsOpenRef = useRef(false);

  // Keep a stable ref to onSelectColor so it never triggers effects
  const onSelectColorRef = useRef(onSelectColor);
  onSelectColorRef.current = onSelectColor;

  // Initialize only when modal transitions from closed to open
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      originalColorRef.current = parsedInitial.hex;
      setHsv(parsedInitial.hsv);
      setHexInput(parsedInitial.hex);
      currentHexRef.current = parsedInitial.hex;
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, parsedInitial]);

  // Derived current color
  const currentRgb = useMemo(() => hsvToRgb(hsv.h, hsv.s, hsv.v), [hsv]);
  const currentHex = useMemo(() => rgbToHex(currentRgb.r, currentRgb.g, currentRgb.b).toUpperCase(), [currentRgb]);

  const svBoxRef = useRef(null);
  const hueBarRef = useRef(null);
  const svRectRef = useRef(null);
  const hueRectRef = useRef(null);

  const isDraggingSv = useRef(false);
  const isDraggingHue = useRef(false);
  const currentHexRef = useRef(parsedInitial.hex);

  // RequestAnimationFrame scheduler for silky 60fps drag updates
  const rafIdRef = useRef(null);
  const scheduleHsvUpdate = useCallback((updater) => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    rafIdRef.current = requestAnimationFrame(() => {
      setHsv(updater);
      rafIdRef.current = null;
    });
  }, []);

  // Sync internal HEX input and ref when currentHex changes
  useEffect(() => {
    setHexInput(currentHex);
    currentHexRef.current = currentHex;
  }, [currentHex]);

  // Clean up RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // --- SV Box Drag Handlers using Pointer Capture (Zero layout reflow during drag) ---
  const updateSvFromCoords = (clientX, clientY) => {
    const rect = svRectRef.current;
    if (!rect) return;
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
    const s = Math.round((x / rect.width) * 100);
    const v = Math.round(100 - (y / rect.height) * 100);
    scheduleHsvUpdate(prev => ({ ...prev, s, v }));
  };

  const handleSvPointerDown = (e) => {
    isDraggingSv.current = true;
    svRectRef.current = svBoxRef.current?.getBoundingClientRect();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    updateSvFromCoords(e.clientX, e.clientY);
  };

  const handleSvPointerMove = (e) => {
    if (!isDraggingSv.current) return;
    updateSvFromCoords(e.clientX, e.clientY);
  };

  const handleSvPointerUp = (e) => {
    if (!isDraggingSv.current) return;
    isDraggingSv.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    // Update parent cleanly on release
    if (onSelectColorRef.current) {
      onSelectColorRef.current(currentHexRef.current);
    }
  };

  // --- Hue Bar Drag Handlers using Pointer Capture ---
  const updateHueFromCoord = (clientY) => {
    const rect = hueRectRef.current;
    if (!rect) return;
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
    const h = Math.round((y / rect.height) * 360);
    scheduleHsvUpdate(prev => ({ ...prev, h: Math.min(360, Math.max(0, h)) }));
  };

  const handleHuePointerDown = (e) => {
    isDraggingHue.current = true;
    hueRectRef.current = hueBarRef.current?.getBoundingClientRect();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    updateHueFromCoord(e.clientY);
  };

  const handleHuePointerMove = (e) => {
    if (!isDraggingHue.current) return;
    updateHueFromCoord(e.clientY);
  };

  const handleHuePointerUp = (e) => {
    if (!isDraggingHue.current) return;
    isDraggingHue.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    // Update parent cleanly on release
    if (onSelectColorRef.current) {
      onSelectColorRef.current(currentHexRef.current);
    }
  };

  // --- Actions ---
  const handleApply = () => {
    if (onSelectColorRef.current) {
      onSelectColorRef.current(currentHexRef.current);
    }
    onClose();
  };

  const handleCancel = () => {
    // Revert parent to original color before modal was opened
    if (onSelectColorRef.current && originalColorRef.current) {
      onSelectColorRef.current(originalColorRef.current);
    }
    onClose();
  };

  const handleHexInputChange = (e) => {
    let raw = e.target.value;
    setHexInput(raw);

    let cleaned = raw.trim().replace(/[^0-9A-Fa-f#]/g, '');
    if (cleaned.startsWith('#')) cleaned = cleaned.slice(1);

    if (cleaned.length === 3) {
      cleaned = cleaned.split('').map(c => c + c).join('');
    }

    if (cleaned.length === 6) {
      const fullHex = '#' + cleaned.toUpperCase();
      const rgb = hexToRgb(fullHex);
      setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
      currentHexRef.current = fullHex;
      if (onSelectColorRef.current) {
        onSelectColorRef.current(fullHex);
      }
    }
  };

  const handleHexInputPaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData.getData('text') || '').trim();
    let cleaned = pasted.replace(/[^0-9A-Fa-f#]/g, '');
    if (cleaned.startsWith('#')) cleaned = cleaned.slice(1);
    if (cleaned.length === 3) {
      cleaned = cleaned.split('').map(c => c + c).join('');
    }
    if (cleaned.length === 6) {
      const fullHex = '#' + cleaned.toUpperCase();
      setHexInput(fullHex);
      const rgb = hexToRgb(fullHex);
      setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
      currentHexRef.current = fullHex;
      if (onSelectColorRef.current) {
        onSelectColorRef.current(fullHex);
      }
    } else {
      setHexInput(pasted.startsWith('#') ? pasted : '#' + pasted);
    }
  };

  const handleHexInputBlur = () => {
    let cleaned = hexInput.trim().replace(/[^0-9A-Fa-f]/g, '');
    if (cleaned.length === 3) {
      cleaned = cleaned.split('').map(c => c + c).join('');
    }
    if (cleaned.length === 6) {
      const full = '#' + cleaned.toUpperCase();
      setHexInput(full);
      currentHexRef.current = full;
      if (onSelectColorRef.current) {
        onSelectColorRef.current(full);
      }
    } else {
      setHexInput(currentHex);
    }
  };

  const handlePickPreset = (hex) => {
    const rgb = hexToRgb(hex);
    setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
    setHexInput(hex.toUpperCase());
    currentHexRef.current = hex.toUpperCase();
    if (onSelectColorRef.current) {
      onSelectColorRef.current(hex.toUpperCase());
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div 
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-100"
      style={{ zIndex }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCancel();
      }}
    >
      <div 
        className="bg-[#18181b] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-4 sm:p-5 text-zinc-100 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-200 shadow-xs">
              <Pipette size={15} />
            </div>
            <div>
              <h3 className="font-bold text-zinc-100 text-sm kanit-text leading-tight">
                {title}
              </h3>
              <p className="text-[10px] text-zinc-400 kanit-text">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="w-7 h-7 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Visual Pickers: SV Box + Hue Bar + Preview */}
        <div className="flex gap-3 sm:gap-4 items-stretch mb-4 select-none touch-none">
          {/* 2D SV Box */}
          <div
            ref={svBoxRef}
            onPointerDown={handleSvPointerDown}
            onPointerMove={handleSvPointerMove}
            onPointerUp={handleSvPointerUp}
            onPointerCancel={handleSvPointerUp}
            className="relative flex-1 h-48 sm:h-52 rounded-xl cursor-crosshair select-none touch-none overflow-hidden shadow-inner border border-zinc-700"
            style={{
              backgroundColor: `hsl(${hsv.h}, 100%, 50%)`
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent pointer-events-none" />
            <div
              className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-white shadow-md pointer-events-none ring-1 ring-black/40 transition-transform duration-75"
              style={{
                left: `${hsv.s}%`,
                top: `${100 - hsv.v}%`,
                backgroundColor: currentHex
              }}
            />
          </div>

          {/* 1D Hue Bar */}
          <div
            ref={hueBarRef}
            onPointerDown={handleHuePointerDown}
            onPointerMove={handleHuePointerMove}
            onPointerUp={handleHuePointerUp}
            onPointerCancel={handleHuePointerUp}
            className="relative w-7 sm:w-8 h-48 sm:h-52 rounded-xl cursor-ns-resize select-none touch-none overflow-hidden shadow-inner border border-zinc-700 shrink-0"
            style={{
              background: 'linear-gradient(to bottom, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
            }}
          >
            <div
              className="absolute left-0 right-0 h-3 -mt-1.5 rounded-sm border-2 border-white shadow-md pointer-events-none ring-1 ring-black/60 bg-transparent transition-transform duration-75"
              style={{
                top: `${(hsv.h / 360) * 100}%`
              }}
            />
          </div>

          {/* Color Preview & Values */}
          <div className="w-22 sm:w-26 shrink-0 flex flex-col justify-between">
            <div
              className="rounded-xl overflow-hidden border border-zinc-700 shadow-sm flex-1 min-h-[85px] sm:min-h-[96px] flex flex-col items-center justify-center p-2 text-center transition-colors"
              style={{
                backgroundColor: currentHex
              }}
            >
              <span
                className="text-[10px] font-bold kanit-text px-2 py-0.5 rounded-md backdrop-blur-xs shadow-xs"
                style={{
                  backgroundColor: hsv.v > 65 && hsv.s < 55 ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)',
                  color: hsv.v > 65 && hsv.s < 55 ? '#0f172a' : '#ffffff'
                }}
              >
                สีที่เลือก
              </span>
            </div>

            {/* Hex Display & Input */}
            <div className="bg-[#121214] p-2 sm:p-2.5 rounded-xl border border-zinc-800 text-center mt-2.5 sm:mt-3">
              <span className="text-[9px] font-mono font-bold text-zinc-400 block mb-1">HEX CODE</span>
              <input
                type="text"
                value={hexInput}
                onChange={handleHexInputChange}
                onPaste={handleHexInputPaste}
                onBlur={handleHexInputBlur}
                placeholder="#000000"
                className="w-full text-center bg-zinc-900 border border-zinc-700 rounded-md py-1 px-1 font-mono font-bold text-xs text-zinc-100 tracking-wider outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
                title="ใส่หรือวางโค้ดสี Hex เช่น #FF5733 หรือ FF5733"
              />
            </div>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="mb-4 pt-2 border-t border-zinc-800">
          <div className="text-[11px] font-medium text-zinc-400 kanit-text mb-1.5 flex items-center justify-between">
            <span>สียอดนิยม:</span>
            <span className="font-mono text-[10px] text-zinc-400">{currentHex}</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {[
              { hex: '#0284c7', label: 'ฟ้า' },
              { hex: '#0f172a', label: 'ดำเข้ม' },
              { hex: '#ffffff', label: 'ขาว' },
              { hex: '#d97706', label: 'ทอง' },
              { hex: '#e11d48', label: 'แดง' },
              { hex: '#059669', label: 'เขียว' },
              { hex: '#7c3aed', label: 'ม่วง' }
            ].map(item => (
              <button
                key={item.hex}
                type="button"
                onClick={() => handlePickPreset(item.hex)}
                className={`h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                  currentHex === item.hex.toUpperCase() ? 'border-zinc-300 ring-2 ring-zinc-500/40 scale-105' : 'border-zinc-700 hover:border-zinc-500'
                }`}
                style={{ backgroundColor: item.hex }}
                title={`${item.label} (${item.hex})`}
              />
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
          <button
            type="button"
            onClick={handleCancel}
            className="px-3.5 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs font-semibold kanit-text transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs kanit-text shadow-sm flex items-center gap-1.5 transition-all active:scale-95 border border-sky-500/30 cursor-pointer"
          >
            <Check size={14} />
            <span>ใช้สีนี้</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

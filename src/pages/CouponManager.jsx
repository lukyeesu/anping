import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import JsBarcode from 'jsbarcode';
import CustomSelect from './CustomSelect';
import { 
  Ticket, Plus, Search, Filter, Printer, QrCode, Camera, 
  CheckCircle2, AlertCircle, Calendar, User, Trash2, Layers, 
  RefreshCw, X, ChevronRight, ChevronLeft, ArrowUpDown, Eye, Sparkles, 
  Tag, ShieldCheck, Clock, Scissors, FileText, Check, 
  AlertTriangle, Crown, Hash, Copy, Download, Sliders,
  RotateCcw, Image as ImageIcon, Bookmark, ArrowRight, ExternalLink,
  FileSpreadsheet, MessageSquare, Move, Maximize2, Barcode, Pipette, Type, LayoutGrid, Palette, Upload, Loader2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatDate, formatDateTime, resolveBranchInfo, rAFThrottle } from '../global/helpers';
import { 
  generateCouponCode, 
  isCouponUsable, 
  calculateCouponDiscount,
  isPatientVipActive
} from '../utils/couponHelpers';
import { supabase } from '../lib/supabase';
import { formatDirectImageUrl } from '../lib/notificationHub';

const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

// ชุดสีและสไตล์การดีไซน์ระดับพรีเมียม (Luxury Sheen & Aesthetics)
const THEME_STYLES = {
  emerald: {
    id: 'emerald',
    name: 'เขียวเอเมอรัลด์ (สุขภาพ & สมดุล)',
    bg: 'from-emerald-600 via-teal-600 to-emerald-800',
    headerBg: '#059669',
    accentText: '#047857',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    primaryColor: '#059669',
    lightBg: '#ecfdf5',
    sheen: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.2) 100%)',
    tagColor: '#10b981'
  },
  sky: {
    id: 'sky',
    name: 'ฟ้าครามการแพทย์ (ความน่าเชื่อถือ)',
    bg: 'from-sky-600 via-blue-600 to-indigo-800',
    headerBg: '#0284c7',
    accentText: '#0369a1',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    primaryColor: '#0284c7',
    lightBg: '#f0f9ff',
    sheen: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.2) 100%)',
    tagColor: '#0ea5e9'
  },
  gold: {
    id: 'gold',
    name: 'ทองคำหรูหรา (VIP & คอร์สพรีเมียม)',
    bg: 'from-amber-500 via-yellow-500 to-amber-700',
    headerBg: '#d97706',
    accentText: '#b45309',
    badge: 'bg-amber-50 text-amber-800 border-amber-300',
    primaryColor: '#d97706',
    lightBg: '#fffbeb',
    sheen: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.3) 100%)',
    tagColor: '#f59e0b'
  },
  rose: {
    id: 'rose',
    name: 'กุหลาบชมพู (ความงาม & ผิวพรรณ)',
    bg: 'from-rose-500 via-pink-600 to-rose-800',
    headerBg: '#e11d48',
    accentText: '#be123c',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    primaryColor: '#e11d48',
    lightBg: '#fff1f2',
    sheen: 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.25) 100%)',
    tagColor: '#f43f5e'
  },
  purple: {
    id: 'purple',
    name: 'ม่วงพรีเมียม (ศาสตร์ความงามชั้นสูง)',
    bg: 'from-purple-600 via-indigo-600 to-purple-900',
    headerBg: '#7c3aed',
    accentText: '#6d28d9',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    primaryColor: '#7c3aed',
    lightBg: '#faf5ff',
    sheen: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.2) 100%)',
    tagColor: '#8b5cf6'
  },
  slate: {
    id: 'slate',
    name: 'คลาสสิกขาว-เทา (เรียบหรู มินิมอล)',
    bg: 'from-slate-700 via-slate-800 to-slate-950',
    headerBg: '#334155',
    accentText: '#1e293b',
    badge: 'bg-slate-100 text-slate-700 border-slate-300',
    primaryColor: '#334155',
    lightBg: '#f8fafc',
    sheen: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.2) 100%)',
    tagColor: '#64748b'
  }
};

const PRINT_THEMES = {
  emerald: {
    primary: '#059669',
    primaryDark: '#064e3b',
    primaryLight: '#ecfdf5',
    cardBgGradient: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #065f46 100%)',
    stubGradient: 'linear-gradient(145deg, #063828 0%, #065f46 55%, #059669 100%)',
    badgeGradient: 'linear-gradient(135deg, #064e3b 0%, #047857 60%, #059669 100%)',
    cardStubGradient: 'radial-gradient(circle at 75% 30%, #34d399 0%, #059669 55%, #064e3b 100%)',
    starColor: '#fde047',
    tagBg: 'rgba(255, 255, 255, 0.22)',
    tagText: '#ffffff'
  },
  sky: {
    primary: '#0284c7',
    primaryDark: '#082f49',
    primaryLight: '#f0f9ff',
    cardBgGradient: 'linear-gradient(135deg, #082f49 0%, #0284c7 50%, #0369a1 100%)',
    stubGradient: 'linear-gradient(145deg, #0a2540 0%, #003366 55%, #0284c7 100%)',
    badgeGradient: 'linear-gradient(135deg, #082f49 0%, #0369a1 60%, #0284c7 100%)',
    cardStubGradient: 'radial-gradient(circle at 75% 30%, #38bdf8 0%, #0284c7 55%, #082f49 100%)',
    starColor: '#fde047',
    tagBg: 'rgba(255, 255, 255, 0.22)',
    tagText: '#ffffff'
  },
  gold: {
    primary: '#d97706',
    primaryDark: '#78350f',
    primaryLight: '#fffbeb',
    cardBgGradient: 'linear-gradient(135deg, #78350f 0%, #d97706 50%, #b45309 100%)',
    stubGradient: 'linear-gradient(145deg, #451a03 0%, #78350f 55%, #d97706 100%)',
    badgeGradient: 'linear-gradient(135deg, #78350f 0%, #b45309 60%, #d97706 100%)',
    cardStubGradient: 'radial-gradient(circle at 75% 30%, #fbbf24 0%, #d97706 55%, #78350f 100%)',
    starColor: '#fef08a',
    tagBg: 'rgba(255, 255, 255, 0.25)',
    tagText: '#ffffff'
  },
  rose: {
    primary: '#e11d48',
    primaryDark: '#881337',
    primaryLight: '#fff1f2',
    cardBgGradient: 'linear-gradient(135deg, #881337 0%, #e11d48 50%, #be123c 100%)',
    stubGradient: 'linear-gradient(145deg, #4c0519 0%, #881337 55%, #be123c 100%)',
    badgeGradient: 'linear-gradient(135deg, #881337 0%, #be123c 60%, #e11d48 100%)',
    cardStubGradient: 'radial-gradient(circle at 75% 30%, #fb7185 0%, #e11d48 55%, #881337 100%)',
    starColor: '#fde047',
    tagBg: 'rgba(255, 255, 255, 0.22)',
    tagText: '#ffffff'
  },
  purple: {
    primary: '#7c3aed',
    primaryDark: '#4c1d95',
    primaryLight: '#faf5ff',
    cardBgGradient: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #581c87 100%)',
    stubGradient: 'linear-gradient(145deg, #2e1065 0%, #581c87 55%, #7c3aed 100%)',
    badgeGradient: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 60%, #7c3aed 100%)',
    cardStubGradient: 'radial-gradient(circle at 75% 30%, #c084fc 0%, #7c3aed 55%, #4c1d95 100%)',
    starColor: '#fde047',
    tagBg: 'rgba(255, 255, 255, 0.22)',
    tagText: '#ffffff'
  },
  slate: {
    primary: '#334155',
    primaryDark: '#0f172a',
    primaryLight: '#f8fafc',
    cardBgGradient: 'linear-gradient(135deg, #0f172a 0%, #334155 50%, #1e293b 100%)',
    stubGradient: 'linear-gradient(145deg, #090d16 0%, #0f172a 55%, #1e293b 100%)',
    badgeGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #334155 100%)',
    cardStubGradient: 'radial-gradient(circle at 75% 30%, #94a3b8 0%, #334155 55%, #0f172a 100%)',
    starColor: '#fde047',
    tagBg: 'rgba(255, 255, 255, 0.22)',
    tagText: '#ffffff'
  }
};

// ชุดสีกราเดียนต์สำหรับออกแบบคูปองในสตูดิโอ (Preset Gradients)
const STUDIO_GRADIENT_PRESETS = [
  { id: 'emerald', name: 'เขียวเอเมอรัลด์', c1: '#064e3b', c2: '#047857', c3: '#065f46' },
  { id: 'sky', name: 'ฟ้าครามการแพทย์', c1: '#082f49', c2: '#0284c7', c3: '#1e3a8a' },
  { id: 'gold', name: 'ทองคำหรูหรา', c1: '#78350f', c2: '#d97706', c3: '#b45309' },
  { id: 'rose', name: 'กุหลาบชมพู', c1: '#881337', c2: '#e11d48', c3: '#be123c' },
  { id: 'purple', name: 'ม่วงพรีเมียม', c1: '#4c1d95', c2: '#7c3aed', c3: '#581c87' },
  { id: 'slate', name: 'ดาร์กสเลตมินิมอล', c1: '#0f172a', c2: '#334155', c3: '#1e293b' },
  { id: 'sunset', name: 'ซันเซ็ทพาสเทล', c1: '#c2410c', c2: '#ea580c', c3: '#e11d48' },
  { id: 'ocean', name: 'ดีพโอเชียน', c1: '#0c4a6e', c2: '#0284c7', c3: '#0369a1' }
];

// แม่แบบเริ่มต้นของคลินิก (Preset Templates)
const DEFAULT_PRESET_TEMPLATES = [
  {
    id: 'preset_welcome_10',
    name: 'คูปองต้อนรับคนไข้ใหม่ (New Patient Welcome 10%)',
    details: {
      title: 'คูปองต้อนรับคนไข้ใหม่',
      description: 'รับส่วนลด 10% สำหรับการรักษาหรือซื้อสินค้าครั้งแรก',
      discountType: 'percent',
      discountValue: 10,
      minSpend: 500,
      isLifetime: false,
      templateType: 'card',
      themeColor: 'sky'
    }
  },
  {
    id: 'preset_grand_open_300',
    name: 'คูปองเปิดสาขาใหม่ (Grand Opening ฿300)',
    details: {
      title: 'คูปองฉลองเปิดสาขาใหม่',
      description: 'ส่วนลดเงินสด 300 บาท เมื่อมียอดใช้จ่ายตั้งแต่ 1,500 บาทขึ้นไป',
      discountType: 'amount',
      discountValue: 300,
      minSpend: 1500,
      isLifetime: false,
      templateType: 'strip',
      themeColor: 'emerald'
    }
  },
  {
    id: 'preset_vip_15',
    name: 'สิทธิพิเศษสมาชิก VIP ประจำเดือน (VIP Exclusive 15%)',
    details: {
      title: 'สิทธิพิเศษสมาชิก VIP คลินิกอันผิง',
      description: 'รับส่วนลดพิเศษ 15% ทุกหัตถการและคอร์สดูแลสุขภาพ',
      discountType: 'percent',
      discountValue: 15,
      minSpend: 2000,
      isLifetime: false,
      templateType: 'card',
      themeColor: 'gold'
    }
  },
  {
    id: 'preset_birthday_500',
    name: 'บัตรกำนัลวันเกิดคนไข้ (Birthday Voucher ฿500)',
    details: {
      title: 'สุขสันต์วันเกิด บัตรกำนัลแทนใจ',
      description: 'ส่วนลด 500 บาท สำหรับคนไข้ในเดือนเกิด',
      discountType: 'amount',
      discountValue: 500,
      minSpend: 2500,
      isLifetime: false,
      templateType: 'strip',
      themeColor: 'rose'
    }
  }
];

// รูปแบบคูปองตัวอย่างเริ่มต้น (สำหรับทดสอบจัดตำแหน่ง QR Code ทันที)
const DEFAULT_SAMPLE_VOUCHER_ART = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="856" height="540" viewBox="0 0 856 540"><defs><linearGradient id="vbg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2318181b"/><stop offset="50%" stop-color="%23222226"/><stop offset="100%" stop-color="%232a2a30"/></linearGradient><pattern id="pdots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="%23ffffff" fill-opacity="0.08"/></pattern></defs><rect width="856" height="540" rx="32" fill="url(%23vbg)"/><rect width="856" height="540" rx="32" fill="url(%23pdots)"/><rect x="28" y="28" width="800" height="484" rx="22" fill="none" stroke="%23f59e0b" stroke-width="2.5" stroke-dasharray="10 6" stroke-opacity="0.7"/><circle cx="110" cy="110" r="42" fill="%23f59e0b" fill-opacity="0.15"/><polygon points="110,80 120,105 145,108 126,125 132,150 110,136 88,150 94,125 75,108 100,105" fill="%23fbbf24"/><text x="175" y="108" font-family="sans-serif" font-weight="900" font-size="32" fill="%23ffffff" letter-spacing="2">ANPING CLINIC</text><text x="175" y="138" font-family="sans-serif" font-weight="600" font-size="16" fill="%23cbd5e1" letter-spacing="1">SPECIAL PRIVILEGE VOUCHER</text><text x="60" y="260" font-family="sans-serif" font-weight="900" font-size="52" fill="%23fbbf24">DISCOUNT ฿500</text><text x="60" y="310" font-family="sans-serif" font-weight="500" font-size="22" fill="%23f8fafc">บัตรกำนัลส่วนลดแทนเงินสดสำหรับโปรแกรมการรักษา</text><text x="60" y="440" font-family="sans-serif" font-weight="400" font-size="16" fill="%2394a3b8">เงื่อนไข: ใช้ได้ที่อันผิงคลินิกทุกสาขา | โปรดแสดง QR Code แก่เจ้าหน้าที่</text></svg>';

// ฟังก์ชันจัดรูปแบบวันหมดอายุสำหรับดีไซน์คูปองแบบกำหนดเอง (Story Artwork)
const formatCustomExpiryDate = (dateStr, format = 'eng', isLifetime = false, prefix = 'EXP: ') => {
  if (isLifetime) return '✨ ตลอดชีพ';
  const cleanPrefix = prefix !== undefined ? prefix : 'EXP: ';
  const engMonthsUpper = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  if (!dateStr) {
    if (format === 'numeric') return `${cleanPrefix}31/10/2026`;
    if (format === 'numeric_th') return `${cleanPrefix}31/10/2569`;
    if (format === 'thai_short') return `${cleanPrefix}31 ต.ค. 2569`;
    if (format === 'thai_full') return `${cleanPrefix}31 ตุลาคม 2569`;
    return `${cleanPrefix}31 OCT 2026`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return `${cleanPrefix}${dateStr}`;

  const day = String(d.getDate()).padStart(2, '0');
  const monthIdx = d.getMonth();
  const yearBE = d.getFullYear() + 543;
  const yearAD = d.getFullYear();

  if (format === 'numeric') {
    return `${cleanPrefix}${day}/${String(monthIdx + 1).padStart(2, '0')}/${yearAD}`;
  }
  if (format === 'numeric_th') {
    return `${cleanPrefix}${day}/${String(monthIdx + 1).padStart(2, '0')}/${yearBE}`;
  }
  if (format === 'thai_short') {
    return `${cleanPrefix}${d.getDate()} ${THAI_MONTHS_SHORT[monthIdx]} ${yearBE}`;
  }
  if (format === 'thai_full') {
    return `${cleanPrefix}${d.getDate()} ${THAI_MONTHS[monthIdx]} ${yearBE}`;
  }
  // Default: eng (International Standard Product Format: e.g. EXP: 31 OCT 2026)
  return `${cleanPrefix}${day} ${engMonthsUpper[monthIdx]} ${yearAD}`;
};

// ฟังก์ชันแปลงชื่อฟอนต์วันหมดอายุให้ได้มาตรฐานสากลและตัวบาง
const getExpiryFontFamily = (font) => {
  if (font === 'Inter') return "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  if (font === 'Mono') return "'JetBrains Mono', 'Roboto Mono', Menlo, Consolas, monospace";
  if (font === 'Prompt') return "'Prompt', -apple-system, BlinkMacSystemFont, sans-serif";
  if (font === 'Kanit') return "'Kanit', -apple-system, BlinkMacSystemFont, sans-serif";
  if (font === 'Sarabun') return "'Sarabun', 'TH Sarabun New', -apple-system, BlinkMacSystemFont, sans-serif";
  // Default: Inter (International Standard Clean Sans)
  return "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
};

// =========================================================================
// PHOTOSHOP-STYLE COLOR PICKER (Custom built for Anping Clinic)
// =========================================================================
const hsvToRgb = (h, s, v) => {
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

const rgbToHex = (r, g, b) => {
  return '#' + [r, g, b].map(x => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join('');
};

const hexToRgb = (hex) => {
  let clean = (hex || '').replace('#', '');
  if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
  if (clean.length !== 6) return { r: 15, g: 23, b: 42 };
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 15, g: 23, b: 42 };
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};

const rgbToHsv = (r, g, b) => {
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

const PhotoshopColorPickerModal = ({
  isOpen,
  onClose,
  initialColor = '#0f172a',
  onSelectColor
}) => {
  if (!isOpen) return null;

  const [hsv, setHsv] = useState(() => {
    const { r, g, b } = hexToRgb(initialColor);
    return rgbToHsv(r, g, b);
  });
  const [hexInput, setHexInput] = useState(() => initialColor.toUpperCase());

  const currentRgb = useMemo(() => hsvToRgb(hsv.h, hsv.s, hsv.v), [hsv]);
  const currentHex = useMemo(() => rgbToHex(currentRgb.r, currentRgb.g, currentRgb.b).toUpperCase(), [currentRgb]);

  const svBoxRef = useRef(null);
  const hueBarRef = useRef(null);
  const isDraggingSv = useRef(false);
  const isDraggingHue = useRef(false);

  const currentHexRef = useRef(initialColor.toUpperCase());

  useEffect(() => {
    setHexInput(currentHex);
    currentHexRef.current = currentHex;
    onSelectColor(currentHex);
  }, [currentHex, onSelectColor]);

  const updateSvFromPointer = (e) => {
    if (!svBoxRef.current) return;
    const rect = svBoxRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const s = Math.round((x / rect.width) * 100);
    const v = Math.round(100 - (y / rect.height) * 100);
    setHsv(prev => ({ ...prev, s, v }));
  };

  const updateHueFromPointer = (e) => {
    if (!hueBarRef.current) return;
    const rect = hueBarRef.current.getBoundingClientRect();
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const h = Math.round((y / rect.height) * 360);
    setHsv(prev => ({ ...prev, h: Math.min(360, Math.max(0, h)) }));
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (isDraggingSv.current) {
        updateSvFromPointer(e);
      } else if (isDraggingHue.current) {
        updateHueFromPointer(e);
      }
    };
    const handlePointerUp = () => {
      isDraggingSv.current = false;
      isDraggingHue.current = false;
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  const handleApply = () => {
    onSelectColor(currentHexRef.current);
    onClose();
  };

  const handleHexInputChange = (e) => {
    let raw = e.target.value;
    setHexInput(raw);

    // Clean up value: remove extra non-hex characters
    let cleaned = raw.trim().replace(/[^0-9A-Fa-f#]/g, '');
    if (cleaned.startsWith('#')) cleaned = cleaned.slice(1);

    // Support 3-digit shorthand hex (e.g. F00 -> FF0000)
    if (cleaned.length === 3) {
      cleaned = cleaned.split('').map(c => c + c).join('');
    }

    if (cleaned.length === 6) {
      const fullHex = '#' + cleaned.toUpperCase();
      const rgb = hexToRgb(fullHex);
      setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
      currentHexRef.current = fullHex;
      onSelectColor(fullHex);
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
      onSelectColor(fullHex);
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
      setHexInput('#' + cleaned.toUpperCase());
    } else {
      setHexInput(currentHex);
    }
  };

  const handlePickPreset = (hex) => {
    const rgb = hexToRgb(hex);
    setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
    setHexInput(hex.toUpperCase());
    currentHexRef.current = hex.toUpperCase();
    onSelectColor(hex.toUpperCase());
  };

  return createPortal(
    <div className="fixed inset-0 z-[350] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-100">
      <div className="bg-[#18181b] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-5 text-zinc-100 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-200 shadow-xs">
              <Pipette size={15} />
            </div>
            <div>
              <h3 className="font-bold text-zinc-100 text-sm kanit-text leading-tight">
                เครื่องมือเลือกสี (Color Picker)
              </h3>
              <p className="text-[10px] text-zinc-400 kanit-text">เลือกสีอิสระสำหรับตัวหนังสือและสติกเกอร์</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Visual Pickers: SV Box + Hue Bar */}
        <div className="flex gap-4 items-stretch mb-4 select-none touch-none">
          {/* 2D SV Box */}
          <div
            ref={svBoxRef}
            onPointerDown={(e) => {
              isDraggingSv.current = true;
              updateSvFromPointer(e);
            }}
            className="relative flex-1 h-52 rounded-xl cursor-crosshair select-none touch-none overflow-hidden shadow-inner border border-zinc-700"
            style={{
              backgroundColor: `hsl(${hsv.h}, 100%, 50%)`
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent pointer-events-none" />
            <div
              className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-white shadow-md pointer-events-none ring-1 ring-black/40"
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
            onPointerDown={(e) => {
              isDraggingHue.current = true;
              updateHueFromPointer(e);
            }}
            className="relative w-8 h-52 rounded-xl cursor-ns-resize select-none touch-none overflow-hidden shadow-inner border border-zinc-700 shrink-0"
            style={{
              background: 'linear-gradient(to bottom, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
            }}
          >
            <div
              className="absolute left-0 right-0 h-3 -mt-1.5 rounded-sm border-2 border-white shadow-md pointer-events-none ring-1 ring-black/60 bg-transparent"
              style={{
                top: `${(hsv.h / 360) * 100}%`
              }}
            />
          </div>

          {/* Color Preview & Values */}
          <div className="w-26 shrink-0 flex flex-col justify-between">
            {/* Single Clean Color Preview Swatch (สีเดิมถูกลบออกตามคำสั่ง) */}
            <div
              className="rounded-xl overflow-hidden border border-zinc-700 shadow-sm flex-1 min-h-[96px] flex flex-col items-center justify-center p-2 text-center transition-colors"
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
            <div className="bg-[#121214] p-2.5 rounded-xl border border-zinc-800 text-center mt-3">
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

        {/* Quick Clinic Presets */}
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
                className={`h-7 rounded-lg border flex items-center justify-center transition-all ${
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
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs font-semibold kanit-text transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs kanit-text shadow-sm flex items-center gap-1.5 transition-all active:scale-95 border border-emerald-500/30"
          >
            <Check size={14} />
            <span>ใช้สีนี้</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// =========================================================================
// HIGH-PERFORMANCE STORY ARTWORK & COUPON DESIGN STUDIO (CANVA / PHOTOSHOP STYLE)
// =========================================================================
const StoryArtworkEditorModal = ({
  isOpen,
  onClose,
  onSave,
  initialQrConfig,
  initialExpiryConfig,
  initialDesignConfig,
  uploadedArtworkUrl,
  expireDate,
  isLifetime,
  clinicInfo,
  initialCouponTitle,
  initialDiscountLabel,
  initialTerms,
  themeColor
}) => {
  if (!isOpen) return null;

  // Local state for QR & Barcode
  const [localQrConfig, setLocalQrConfig] = useState(() => ({
    codeType: 'qr',
    xPercent: 78,
    yPercent: 32,
    sizePercent: 26,
    whiteBg: true,
    showCode: true,
    codeColor: '#0f172a',
    codeBgStyle: 'none',
    codeFontSize: 10,
    codeDistance: 3.5,
    ...(initialQrConfig || {})
  }));

  // Local state for Expiry Date
  const [localExpiryConfig, setLocalExpiryConfig] = useState(() => ({
    enabled: true,
    xPercent: 25,
    yPercent: 82,
    sizePercent: 18,
    color: '#ffffff',
    bgStyle: 'none',
    format: 'eng',
    prefix: 'EXP: ',
    fontFamily: 'Inter',
    fontWeight: 'light',
    ...(initialExpiryConfig || {})
  }));

  // Editable Layer State: restored from initialDesignConfig if previously edited!
  const [designConfig, setDesignConfig] = useState(() => {
    if (initialDesignConfig) {
      return {
        ...initialDesignConfig,
        // Ensure bgType doesn't default to image unless user explicitly has an uploaded image
        bgType: (initialDesignConfig.bgType === 'image' && !uploadedArtworkUrl) ? 'gradient' : (initialDesignConfig.bgType || 'gradient')
      };
    }
    return {
      bgType: uploadedArtworkUrl ? 'image' : 'gradient', // 'gradient' | 'solid' | 'image'
      gradientKey: themeColor || 'emerald',
      gradientColor1: '#064e3b',
      gradientColor2: '#047857',
      solidColor: '#064e3b',
      sheenEnabled: true,
      borderEnabled: true,

      // Clinic Logo Layer
      logoEnabled: true,
      logoX: 6,
      logoY: 12,
      logoSize: 11,

      // Header / Title Text Layer (starts empty - user adds text when desired)
      headerText: initialDesignConfig?.headerText || '',
      headerColor: initialDesignConfig?.headerColor || '#ffffff',
      headerFontSize: initialDesignConfig?.headerFontSize || 13,
      headerX: initialDesignConfig?.headerX || 20,
      headerY: initialDesignConfig?.headerY || 13,

      // Discount Callout Layer (starts empty - user adds text when desired)
      discountText: initialDesignConfig?.discountText || '',
      discountColor: initialDesignConfig?.discountColor || '#ffffff',
      discountFontSize: initialDesignConfig?.discountFontSize || 28,
      discountX: initialDesignConfig?.discountX || 20,
      discountY: initialDesignConfig?.discountY || 42,

      // Subtext / Terms Layer (starts empty - user adds text when desired)
      termsText: initialDesignConfig?.termsText || '',
      termsColor: initialDesignConfig?.termsColor || 'rgba(255,255,255,0.85)',
      termsFontSize: initialDesignConfig?.termsFontSize || 11,
      termsX: initialDesignConfig?.termsX || 20,
      termsY: initialDesignConfig?.termsY || 76
    };
  });

  // Navigation & Active Layers: 'text' | 'bg' | 'logo' | 'qr' | 'expiry'
  const [activeTab, setActiveTab] = useState('text');
  // Currently focused sticker on canvas: 'discount' | 'header' | 'terms' | 'qr' | 'expiry' | 'logo'
  const [activeSticker, setActiveSticker] = useState('qr');
  const [activeTextLayer, setActiveTextLayer] = useState('discount'); // 'discount' | 'header' | 'terms'
  const [viewMode, setViewMode] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'canvas' : 'split'));

  // Direct Inline Text Editing on Canvas
  const [inlineEditingLayer, setInlineEditingLayer] = useState(null); // 'discount' | 'header' | 'terms' | null

  const [sampleQrDataUrl, setSampleQrDataUrl] = useState('');
  const [sampleBarcodeDataUrl, setSampleBarcodeDataUrl] = useState('');
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [colorPickerTarget, setColorPickerTarget] = useState('discount');

  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const rafIdRef = useRef(null);
  const latestPointerRef = useRef({ x: 0, y: 0 });

  // Preview measurement (proportional card aspect ratio 85.6 x 54)
  const [previewDims, setPreviewDims] = useState({ width: 856, height: 540 });

  useEffect(() => {
    if (!canvasRef.current) return;
    const updateSize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setPreviewDims({ width: rect.width, height: rect.height });
        }
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, []);

  // Keyboard Nudge Handlers (Arrow keys with 0.1% precision)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't nudge if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 1.0 : 0.1;
        const updateVal = (val, delta) => Math.round(Math.max(0, Math.min(100, (val || 0) + delta)) * 10) / 10;

        if (activeSticker === 'qr') {
          setLocalQrConfig(prev => {
            let nextX = prev.xPercent;
            let nextY = prev.yPercent;
            if (e.key === 'ArrowUp') nextY = updateVal(prev.yPercent, -step);
            if (e.key === 'ArrowDown') nextY = updateVal(prev.yPercent, step);
            if (e.key === 'ArrowLeft') nextX = updateVal(prev.xPercent, -step);
            if (e.key === 'ArrowRight') nextX = updateVal(prev.xPercent, step);
            return { ...prev, xPercent: nextX, yPercent: nextY };
          });
        } else if (activeSticker === 'expiry') {
          setLocalExpiryConfig(prev => {
            let nextX = prev.xPercent;
            let nextY = prev.yPercent;
            if (e.key === 'ArrowUp') nextY = updateVal(prev.yPercent, -step);
            if (e.key === 'ArrowDown') nextY = updateVal(prev.yPercent, step);
            if (e.key === 'ArrowLeft') nextX = updateVal(prev.xPercent, -step);
            if (e.key === 'ArrowRight') nextX = updateVal(prev.xPercent, step);
            return { ...prev, xPercent: nextX, yPercent: nextY };
          });
        } else if (activeSticker === 'logo') {
          setDesignConfig(prev => {
            let nextX = prev.logoX;
            let nextY = prev.logoY;
            if (e.key === 'ArrowUp') nextY = updateVal(prev.logoY, -step);
            if (e.key === 'ArrowDown') nextY = updateVal(prev.logoY, step);
            if (e.key === 'ArrowLeft') nextX = updateVal(prev.logoX, -step);
            if (e.key === 'ArrowRight') nextX = updateVal(prev.logoX, step);
            return { ...prev, logoX: nextX, logoY: nextY };
          });
        } else if (activeSticker === 'header') {
          setDesignConfig(prev => {
            let nextX = prev.headerX;
            let nextY = prev.headerY;
            if (e.key === 'ArrowUp') nextY = updateVal(prev.headerY, -step);
            if (e.key === 'ArrowDown') nextY = updateVal(prev.headerY, step);
            if (e.key === 'ArrowLeft') nextX = updateVal(prev.headerX, -step);
            if (e.key === 'ArrowRight') nextX = updateVal(prev.headerX, step);
            return { ...prev, headerX: nextX, headerY: nextY };
          });
        } else if (activeSticker === 'discount') {
          setDesignConfig(prev => {
            let nextX = prev.discountX;
            let nextY = prev.discountY;
            if (e.key === 'ArrowUp') nextY = updateVal(prev.discountY, -step);
            if (e.key === 'ArrowDown') nextY = updateVal(prev.discountY, step);
            if (e.key === 'ArrowLeft') nextX = updateVal(prev.discountX, -step);
            if (e.key === 'ArrowRight') nextX = updateVal(prev.discountX, step);
            return { ...prev, discountX: nextX, discountY: nextY };
          });
        } else if (activeSticker === 'terms') {
          setDesignConfig(prev => {
            let nextX = prev.termsX;
            let nextY = prev.termsY;
            if (e.key === 'ArrowUp') nextY = updateVal(prev.termsY, -step);
            if (e.key === 'ArrowDown') nextY = updateVal(prev.termsY, step);
            if (e.key === 'ArrowLeft') nextX = updateVal(prev.termsX, -step);
            if (e.key === 'ArrowRight') nextX = updateVal(prev.termsX, step);
            return { ...prev, termsX: nextX, termsY: nextY };
          });
        }
      } else if (e.key === 'Enter' && ['discount', 'header', 'terms'].includes(activeSticker)) {
        setInlineEditingLayer(activeSticker);
      } else if (e.key === 'Escape') {
        setInlineEditingLayer(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSticker]);

  // Pre-generate sample QR & Barcode
  useEffect(() => {
    let isMounted = true;
    const generatePreviewCodes = async () => {
      try {
        const lightColor = localQrConfig.whiteBg ? '#ffffff' : '#00000000';
        const qrUrl = await QRCode.toDataURL('CP-SAMPLE-8899', {
          width: 500,
          margin: 1,
          color: { dark: '#0f172a', light: lightColor }
        });
        if (isMounted && qrUrl) setSampleQrDataUrl(qrUrl);
      } catch (e) {
        console.warn('[Studio] QR Preview Error:', e);
      }

      try {
        const bCanvas = document.createElement('canvas');
        JsBarcode(bCanvas, 'CP-SAMPLE-8899', {
          format: 'CODE128',
          width: 2.8,
          height: 80,
          displayValue: false,
          background: 'transparent',
          lineColor: '#0f172a',
          margin: 0
        });
        if (isMounted) setSampleBarcodeDataUrl(bCanvas.toDataURL());
      } catch (e) {
        console.warn('[Studio] Barcode Preview Error:', e);
      }
    };
    generatePreviewCodes();
    return () => { isMounted = false; };
  }, [localQrConfig.whiteBg]);

  const formattedExpiryDisplay = useMemo(() => {
    return formatCustomExpiryDate(expireDate, localExpiryConfig.format, isLifetime, localExpiryConfig.prefix);
  }, [expireDate, localExpiryConfig.format, isLifetime, localExpiryConfig.prefix]);

  // Pointer Down Handlers with Pointer Capture (Zero-lag 60 FPS dragging)
  const handleStartDrag = (e, sticker) => {
    e.stopPropagation();
    try {
      e.currentTarget?.setPointerCapture?.(e.pointerId);
    } catch {}
    setActiveSticker(sticker);
    if (sticker === 'qr') setActiveTab('qr');
    else if (sticker === 'expiry') setActiveTab('expiry');
    else if (sticker === 'logo') setActiveTab('logo');
    else {
      setActiveTab('text');
      setActiveTextLayer(sticker);
    }

    let initX = 0;
    let initY = 0;
    if (sticker === 'qr') {
      initX = localQrConfig.xPercent;
      initY = localQrConfig.yPercent;
    } else if (sticker === 'expiry') {
      initX = localExpiryConfig.xPercent;
      initY = localExpiryConfig.yPercent;
    } else if (sticker === 'logo') {
      initX = designConfig.logoX;
      initY = designConfig.logoY;
    } else if (sticker === 'header') {
      initX = designConfig.headerX;
      initY = designConfig.headerY;
    } else if (sticker === 'discount') {
      initX = designConfig.discountX;
      initY = designConfig.discountY;
    } else if (sticker === 'terms') {
      initX = designConfig.termsX;
      initY = designConfig.termsY;
    }

    dragRef.current = {
      action: 'drag',
      sticker,
      startX: e.clientX,
      startY: e.clientY,
      initX,
      initY
    };
  };

  const handleStartResize = (e, sticker) => {
    e.stopPropagation();
    try {
      e.currentTarget?.setPointerCapture?.(e.pointerId);
    } catch {}
    setActiveSticker(sticker);
    let initSize = 26;
    if (sticker === 'qr') initSize = localQrConfig.sizePercent;
    else if (sticker === 'expiry') initSize = localExpiryConfig.sizePercent;
    else if (sticker === 'logo') initSize = designConfig.logoSize;

    dragRef.current = {
      action: 'resize',
      sticker,
      startX: e.clientX,
      startY: e.clientY,
      initSize
    };
  };

  // Immediate pointer tracking (60 FPS direct animation frame)
  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!dragRef.current || !canvasRef.current) return;
      latestPointerRef.current = { x: e.clientX, y: e.clientY };

      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          if (!dragRef.current || !canvasRef.current) return;
          const rect = canvasRef.current.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return;
          const { x, y } = latestPointerRef.current;
          const { action, sticker, startX, startY, initX, initY, initSize } = dragRef.current;

          if (action === 'drag') {
            const deltaXPercent = ((x - startX) / rect.width) * 100;
            const deltaYPercent = ((y - startY) / rect.height) * 100;
            const newX = Math.round(Math.max(0, Math.min(100, initX + deltaXPercent)) * 10) / 10;
            const newY = Math.round(Math.max(0, Math.min(100, initY + deltaYPercent)) * 10) / 10;

            if (sticker === 'qr') {
              setLocalQrConfig(prev => ({ ...prev, xPercent: newX, yPercent: newY }));
            } else if (sticker === 'expiry') {
              setLocalExpiryConfig(prev => ({ ...prev, xPercent: newX, yPercent: newY }));
            } else if (sticker === 'logo') {
              setDesignConfig(prev => ({ ...prev, logoX: newX, logoY: newY }));
            } else if (sticker === 'header') {
              setDesignConfig(prev => ({ ...prev, headerX: newX, headerY: newY }));
            } else if (sticker === 'discount') {
              setDesignConfig(prev => ({ ...prev, discountX: newX, discountY: newY }));
            } else if (sticker === 'terms') {
              setDesignConfig(prev => ({ ...prev, termsX: newX, termsY: newY }));
            }
          } else if (action === 'resize') {
            const deltaX = x - startX;
            const deltaY = y - startY;
            if (sticker === 'qr') {
              const deltaPercent = ((deltaX + deltaY) / rect.width) * 50;
              const newSize = Math.round(Math.max(8, Math.min(70, initSize + deltaPercent)) * 10) / 10;
              setLocalQrConfig(prev => ({ ...prev, sizePercent: newSize }));
            } else if (sticker === 'expiry') {
              const deltaScale = ((deltaX + deltaY) / rect.width) * 35;
              const newSize = Math.round(Math.max(6, Math.min(45, initSize + deltaScale)) * 10) / 10;
              setLocalExpiryConfig(prev => ({ ...prev, sizePercent: newSize }));
            } else if (sticker === 'logo') {
              const deltaScale = ((deltaX + deltaY) / rect.width) * 35;
              const newSize = Math.round(Math.max(5, Math.min(30, initSize + deltaScale)) * 10) / 10;
              setDesignConfig(prev => ({ ...prev, logoSize: newSize }));
            }
          }
        });
      }
    };

    const handlePointerUp = () => {
      dragRef.current = null;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  // Save & Bake High-Res Artwork (1:1 Exact Mathematical Proportions to Preview)
  const handleSave = async () => {
    let renderedCustomImgUrl = null;

    if (designConfig.bgType !== 'image' || !uploadedArtworkUrl) {
      try {
        if (typeof document !== 'undefined' && document.fonts) {
          await document.fonts.ready;
        }

        const artCanvas = document.createElement('canvas');
        const w = 1712;
        const h = 1080;
        artCanvas.width = w;
        artCanvas.height = h;
        const artCtx = artCanvas.getContext('2d');

        if (artCtx) {
          artCtx.imageSmoothingEnabled = true;
          artCtx.imageSmoothingQuality = 'high';

          // 1. Draw Background
          if (designConfig.bgType === 'solid') {
            artCtx.fillStyle = designConfig.solidColor || '#064e3b';
            artCtx.fillRect(0, 0, w, h);
          } else {
            const grad = artCtx.createLinearGradient(0, 0, w, h);
            const preset = STUDIO_GRADIENT_PRESETS.find(p => p.id === designConfig.gradientKey);
            if (preset) {
              grad.addColorStop(0, preset.c1);
              grad.addColorStop(0.5, preset.c2);
              grad.addColorStop(1, preset.c3);
            } else {
              grad.addColorStop(0, designConfig.gradientColor1 || '#064e3b');
              grad.addColorStop(1, designConfig.gradientColor2 || '#047857');
            }
            artCtx.fillStyle = grad;
            artCtx.fillRect(0, 0, w, h);
          }

          // 2. Metallic Sheen Overlay
          if (designConfig.sheenEnabled) {
            const sGrad = artCtx.createLinearGradient(0, 0, w, h);
            sGrad.addColorStop(0, 'rgba(255,255,255,0.28)');
            sGrad.addColorStop(0.45, 'rgba(255,255,255,0.02)');
            sGrad.addColorStop(1, 'rgba(255,255,255,0.18)');
            artCtx.fillStyle = sGrad;
            artCtx.fillRect(0, 0, w, h);
          }

          // 3. Inner Border
          if (designConfig.borderEnabled) {
            artCtx.save();
            artCtx.strokeStyle = 'rgba(255,255,255,0.28)';
            artCtx.lineWidth = 3.5;
            artCtx.beginPath();
            artCtx.roundRect(30, 30, w - 60, h - 60, 24);
            artCtx.stroke();
            artCtx.restore();
          }

          // 4. Clinic Logo
          if (designConfig.logoEnabled) {
            const lX = Math.round((designConfig.logoX / 100) * w);
            const lY = Math.round((designConfig.logoY / 100) * h);
            const lSize = Math.round((designConfig.logoSize / 100) * w);
            const lR = Math.round(lSize / 2);

            let logoLoaded = false;
            if (clinicInfo?.logoUrl) {
              try {
                const lImg = new Image();
                lImg.crossOrigin = 'anonymous';
                await new Promise(r => { lImg.onload = r; lImg.onerror = r; lImg.src = clinicInfo.logoUrl; });
                if (lImg.naturalWidth > 0) {
                  artCtx.save();
                  artCtx.beginPath();
                  artCtx.arc(lX + lR, lY + lR, lR, 0, Math.PI * 2);
                  artCtx.closePath();
                  artCtx.clip();
                  artCtx.fillStyle = '#ffffff';
                  artCtx.fill();
                  artCtx.drawImage(lImg, lX, lY, lSize, lSize);
                  artCtx.restore();

                  artCtx.save();
                  artCtx.strokeStyle = 'rgba(255,255,255,0.7)';
                  artCtx.lineWidth = 3;
                  artCtx.beginPath();
                  artCtx.arc(lX + lR, lY + lR, lR, 0, Math.PI * 2);
                  artCtx.stroke();
                  artCtx.restore();
                  logoLoaded = true;
                }
              } catch {}
            }
            if (!logoLoaded) {
              artCtx.save();
              artCtx.fillStyle = 'rgba(255,255,255,0.22)';
              artCtx.strokeStyle = 'rgba(255,255,255,0.6)';
              artCtx.lineWidth = 3;
              artCtx.beginPath();
              artCtx.arc(lX + lR, lY + lR, lR, 0, Math.PI * 2);
              artCtx.fill();
              artCtx.stroke();
              artCtx.fillStyle = '#ffffff';
              artCtx.font = `900 ${Math.round(lSize * 0.42)}px sans-serif`;
              artCtx.textAlign = 'center';
              artCtx.textBaseline = 'middle';
              artCtx.fillText('AP', lX + lR, lY + lR);
              artCtx.restore();
            }
          }

          // 5. Custom Texts: 1:1 Pixel-Perfect Mathematical Scaling (Supports multiline Enter \n)
          if (designConfig.headerText) {
            const hX = Math.round((designConfig.headerX / 100) * w);
            const hY = Math.round((designConfig.headerY / 100) * h);
            const hSize = Math.round(w * (designConfig.headerFontSize * 0.0028));
            const hLineHeight = Math.round(hSize * 1.15);
            const lines = String(designConfig.headerText).split('\n');
            artCtx.save();
            artCtx.font = `800 ${hSize}px "Kanit", sans-serif`;
            artCtx.fillStyle = designConfig.headerColor || '#ffffff';
            artCtx.shadowColor = 'rgba(0,0,0,0.4)';
            artCtx.shadowBlur = Math.round(hSize * 0.15);
            artCtx.shadowOffsetY = Math.round(hSize * 0.06);
            artCtx.textBaseline = 'top';
            artCtx.textAlign = 'left';
            lines.forEach((line, idx) => {
              artCtx.fillText(line, hX, hY + (idx * hLineHeight));
            });
            artCtx.restore();
          }

          if (designConfig.discountText) {
            const dX = Math.round((designConfig.discountX / 100) * w);
            const dY = Math.round((designConfig.discountY / 100) * h);
            const dSize = Math.round(w * (designConfig.discountFontSize * 0.0038));
            const dLineHeight = Math.round(dSize * 1.1);
            const lines = String(designConfig.discountText).split('\n');
            artCtx.save();
            artCtx.font = `900 ${dSize}px "Kanit", sans-serif`;
            artCtx.fillStyle = designConfig.discountColor || '#ffffff';
            artCtx.shadowColor = 'rgba(0,0,0,0.5)';
            artCtx.shadowBlur = Math.round(dSize * 0.15);
            artCtx.shadowOffsetY = Math.round(dSize * 0.06);
            artCtx.textBaseline = 'top';
            artCtx.textAlign = 'left';
            lines.forEach((line, idx) => {
              artCtx.fillText(line, dX, dY + (idx * dLineHeight));
            });
            artCtx.restore();
          }

          if (designConfig.termsText) {
            const tX = Math.round((designConfig.termsX / 100) * w);
            const tY = Math.round((designConfig.termsY / 100) * h);
            const tSize = Math.round(w * (designConfig.termsFontSize * 0.0028));
            const tLineHeight = Math.round(tSize * 1.25);
            const lines = String(designConfig.termsText).split('\n');
            artCtx.save();
            artCtx.font = `500 ${tSize}px "Kanit", sans-serif`;
            artCtx.fillStyle = designConfig.termsColor || 'rgba(255,255,255,0.85)';
            artCtx.shadowColor = 'rgba(0,0,0,0.35)';
            artCtx.shadowBlur = Math.round(tSize * 0.15);
            artCtx.shadowOffsetY = Math.round(tSize * 0.06);
            artCtx.textBaseline = 'top';
            artCtx.textAlign = 'left';
            lines.forEach((line, idx) => {
              artCtx.fillText(line, tX, tY + (idx * tLineHeight));
            });
            artCtx.restore();
          }

          renderedCustomImgUrl = artCanvas.toDataURL('image/png');
        }
      } catch (err) {
        console.warn('[Coupon] Failed to bake artwork canvas:', err);
      }
    }

    onSave({
      qrConfig: localQrConfig,
      expiryConfig: localExpiryConfig,
      customImageUrl: renderedCustomImgUrl || uploadedArtworkUrl || null,
      designConfig
    });
    onClose();
  };

  const handleReset = () => {
    setLocalQrConfig({
      codeType: 'qr',
      xPercent: 78,
      yPercent: 32,
      sizePercent: 26,
      whiteBg: true,
      showCode: true,
      codeColor: '#0f172a',
      codeBgStyle: 'none',
      codeFontSize: 10,
      codeDistance: 3.5
    });
    setLocalExpiryConfig({
      enabled: true,
      xPercent: 25,
      yPercent: 82,
      sizePercent: 18,
      color: '#ffffff',
      bgStyle: 'none',
      format: 'eng',
      prefix: 'EXP: ',
      fontFamily: 'Inter',
      fontWeight: 'light'
    });
    setDesignConfig({
      bgType: uploadedArtworkUrl ? 'image' : 'gradient',
      gradientKey: themeColor || 'emerald',
      gradientColor1: '#064e3b',
      gradientColor2: '#047857',
      solidColor: '#064e3b',
      sheenEnabled: true,
      borderEnabled: true,
      logoEnabled: true,
      logoX: 6,
      logoY: 12,
      logoSize: 11,
      headerText: '',
      headerColor: '#ffffff',
      headerFontSize: 13,
      headerX: 20,
      headerY: 13,
      discountText: '',
      discountColor: '#ffffff',
      discountFontSize: 28,
      discountX: 20,
      discountY: 42,
      termsText: '',
      termsColor: 'rgba(255,255,255,0.85)',
      termsFontSize: 11,
      termsX: 20,
      termsY: 76
    });
  };

  // Metrics for proportional rendering matching exactly the 1:1 bake formulas
  const cardWidthPx = Math.round((localQrConfig.sizePercent / 100) * previewDims.width);
  const cardPadPx = localQrConfig.whiteBg ? Math.max(2, Math.round(cardWidthPx * 0.035)) : 0;
  const curCodeFontSize = localQrConfig.codeFontSize ?? 10;
  const curCodeDistance = localQrConfig.codeDistance ?? 3.5;
  const codeFontPx = Math.max(6, Math.min(32, Math.round(cardWidthPx * (curCodeFontSize * 0.009))));
  const codeMarginTopPx = Math.max(0, Math.round(cardWidthPx * (curCodeDistance / 100)));
  const expFontPx = Math.max(9, Math.min(48, Math.round(previewDims.width * (localExpiryConfig.sizePercent || 18) * 0.002)));

  const headerFontPx = Math.max(9, Math.round(previewDims.width * (designConfig.headerFontSize * 0.0028)));
  const discountFontPx = Math.max(14, Math.round(previewDims.width * (designConfig.discountFontSize * 0.0038)));
  const termsFontPx = Math.max(8, Math.round(previewDims.width * (designConfig.termsFontSize * 0.0028)));
  const logoSizePx = Math.max(20, Math.round((designConfig.logoSize / 100) * previewDims.width));

  // Photoshop Color Picker selection value
  const colorPickerInitialColor = 
    colorPickerTarget === 'code' ? (localQrConfig.codeColor || '#0f172a') :
    colorPickerTarget === 'expiry' ? (localExpiryConfig.color || '#ffffff') :
    colorPickerTarget === 'header' ? (designConfig.headerColor || '#ffffff') :
    colorPickerTarget === 'discount' ? (designConfig.discountColor || '#ffffff') :
    colorPickerTarget === 'terms' ? (designConfig.termsColor || 'rgba(255,255,255,0.85)') :
    colorPickerTarget === 'grad1' ? designConfig.gradientColor1 :
    colorPickerTarget === 'grad2' ? designConfig.gradientColor2 :
    colorPickerTarget === 'solid' ? designConfig.solidColor : '#ffffff';

  // Gradient CSS helper
  const getGradientCss = () => {
    if (designConfig.bgType === 'image' && uploadedArtworkUrl) return 'transparent';
    if (designConfig.bgType === 'solid') return designConfig.solidColor || '#064e3b';
    const preset = STUDIO_GRADIENT_PRESETS.find(p => p.id === designConfig.gradientKey);
    if (preset) return `linear-gradient(135deg, ${preset.c1} 0%, ${preset.c2} 50%, ${preset.c3} 100%)`;
    return `linear-gradient(135deg, ${designConfig.gradientColor1 || '#064e3b'} 0%, ${designConfig.gradientColor2 || '#047857'} 100%)`;
  };

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-0 sm:p-3 md:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-[#18181b] border-0 sm:border border-zinc-800 rounded-none sm:rounded-2xl w-full sm:w-[98vw] max-w-[1700px] h-[100dvh] sm:h-[96vh] shadow-2xl flex flex-col overflow-hidden text-zinc-100 animate-in zoom-in-95 duration-150">
        
        {/* Top Studio Header */}
        <div className="p-3 sm:p-4 border-b border-zinc-800/90 flex items-center justify-between shrink-0 bg-[#141416]">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-200 shadow-xs shrink-0">
              <Sparkles size={18} className="sm:w-5 sm:h-5 text-amber-400" />
            </div>
            <div className="hidden sm:block">
              <h3 className="font-bold text-zinc-100 text-xs sm:text-base kanit-text leading-tight flex items-center gap-2">
                <span>สตูดิโอออกแบบคูปอง & เครื่องมือสร้าง QR</span>
                <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-300 font-mono">
                  Photoshop & Canva Style
                </span>
              </h3>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 kanit-text">
                เปลี่ยนสีพื้นหลังไล่เฉด พิมพ์ข้อความอิสระ ใส่โลโก้คลินิก และจัดวางตำแหน่ง QR / บาร์โค้ด
              </p>
            </div>
          </div>

          {/* View Switcher for Mobile & Tablet */}
          <div className="flex lg:hidden items-center bg-[#141416] border border-zinc-800/90 rounded-lg p-0.5 shadow-inner shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold kanit-text transition-all ${
                viewMode === 'split' ? 'bg-zinc-700 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <LayoutGrid size={13} />
              <span>มุมมองคู่</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('canvas')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-semibold kanit-text transition-all flex items-center gap-1 sm:gap-1.5 ${
                viewMode === 'canvas' ? 'bg-zinc-700 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Move size={12} className="sm:w-3.5 sm:h-3.5" />
              <span>ผืนผ้าใบ</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('controls')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-semibold kanit-text transition-all flex items-center gap-1 sm:gap-1.5 ${
                viewMode === 'controls' ? 'bg-zinc-700 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sliders size={12} className="sm:w-3.5 sm:h-3.5" />
              <span>เครื่องมือ</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold kanit-text text-xs transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
              title="รีเซ็ตค่ามาตรฐาน"
            >
              <RotateCcw size={13} className="text-zinc-400" />
              <span className="hidden sm:inline">รีเซ็ต</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 sm:px-5 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold kanit-text text-xs sm:text-sm transition-all shadow-md shadow-emerald-900/30 flex items-center gap-1.5 active:scale-95"
            >
              <Check size={16} />
              <span>บันทึกดีไซน์ & ตำแหน่ง</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Studio Workspace Layout */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          
          {/* LEFT 70%: Interactive High-Precision Canvas Area */}
          <div className={`flex-1 bg-[#101012] flex flex-col items-center justify-center p-3 sm:p-5 md:p-6 lg:p-8 overflow-hidden select-none ${
            viewMode === 'controls' ? 'hidden lg:flex' : 'flex'
          }`}>
            
            {/* Canvas Helper Pill */}
            <div className="mb-2 sm:mb-3 flex items-center gap-2 sm:gap-3 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-[10px] sm:text-[11px] text-zinc-400 font-medium kanit-text shadow-sm">
              <span className="flex items-center gap-1 text-zinc-300">
                <Move size={11} className="text-amber-400" />
                <span>คลิกวัตถุเพื่อลากย้าย</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-zinc-300">
                <span className="text-zinc-400">⌨️ ลูกศร:</span>
                <span>ขยับละเอียด 0.1%</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-zinc-300">
                <span className="text-amber-400">✏️ คลิก 2 ครั้ง:</span>
                <span>พิมพ์แก้ไขข้อความ</span>
              </span>
            </div>

            {/* 85.6 x 54 mm Aspect Ratio Canvas Wrapper */}
            <div
              ref={canvasRef}
              onClick={() => { setActiveSticker(null); setInlineEditingLayer(null); }}
              className="relative w-full max-w-[960px] rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 select-none transition-shadow"
              style={{
                aspectRatio: '85.6 / 54',
                background: getGradientCss(),
                boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)'
              }}
            >
              {/* Optional Custom Background Image from File Upload */}
              {designConfig.bgType === 'image' && uploadedArtworkUrl && (
                <img
                  src={uploadedArtworkUrl}
                  alt="Custom Background"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                />
              )}

              {/* 1. Metallic Sheen Overlay */}
              {designConfig.sheenEnabled && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.02) 45%, rgba(255,255,255,0.18) 100%)',
                    zIndex: 1
                  }}
                />
              )}

              {/* 2. Luxury Inner Gold/White Border */}
              {designConfig.borderEnabled && (
                <div
                  className="absolute pointer-events-none rounded-xl"
                  style={{
                    inset: '2.5%',
                    border: '1.5px solid rgba(255,255,255,0.28)',
                    zIndex: 1
                  }}
                />
              )}

              {/* 3. Clinic Logo Layer */}
              {designConfig.logoEnabled && (
                <div
                  onPointerDown={(e) => handleStartDrag(e, 'logo')}
                  onClick={(e) => { e.stopPropagation(); setActiveTab('logo'); setActiveSticker('logo'); setInlineEditingLayer(null); }}
                  className={`absolute select-none cursor-move group flex items-center justify-center transition-[box-shadow,outline-color] duration-150 ${
                    activeSticker === 'logo'
                      ? 'outline-2 outline-amber-400 outline-offset-2 z-20'
                      : 'hover:outline-1 hover:outline-white/40 hover:outline-offset-1 z-10'
                  }`}
                  style={{
                    left: `${designConfig.logoX}%`,
                    top: `${designConfig.logoY}%`,
                    width: `${designConfig.logoSize}%`,
                    aspectRatio: '1 / 1',
                    touchAction: 'none',
                    userSelect: 'none'
                  }}
                >
                  {clinicInfo?.logoUrl ? (
                    <img
                      src={clinicInfo.logoUrl}
                      alt="Logo"
                      className="w-full h-full object-contain rounded-full shadow-lg border border-white/60 pointer-events-none bg-white/95"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-white/20 border border-white/60 flex items-center justify-center text-white font-black shadow-lg text-[10px]">
                      AP
                    </div>
                  )}

                  {/* Resize Handle for Logo */}
                  {activeSticker === 'logo' && (
                    <div
                      onPointerDown={(e) => handleStartResize(e, 'logo')}
                      className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-400 border border-zinc-900 rounded-full cursor-nwse-resize shadow-md flex items-center justify-center z-30"
                      title="ลากเพื่อย่อ-ขยายโลโก้"
                    >
                      <div className="w-1.5 h-1.5 bg-zinc-900 rounded-full" />
                    </div>
                  )}
                </div>
              )}

              {/* 4. Custom Text Layers (Zero-Lag Smooth 60FPS Dragging + 1:1 Scale + Inline Canvas Edit) */}

              {/* 4A. Header / Brand Text */}
              {designConfig.headerText && (
                <div
                  onPointerDown={(e) => handleStartDrag(e, 'header')}
                  onClick={(e) => { e.stopPropagation(); setActiveTab('text'); setActiveSticker('header'); setActiveTextLayer('header'); }}
                  onDoubleClick={(e) => { e.stopPropagation(); setInlineEditingLayer('header'); }}
                  className={`absolute select-none cursor-move rounded transition-[box-shadow,outline-color] duration-150 ${
                    activeSticker === 'header'
                      ? 'outline-2 outline-amber-400 outline-offset-2 bg-black/20 z-20'
                      : 'hover:outline-1 hover:outline-white/30 hover:outline-offset-1 z-10'
                  }`}
                  style={{
                    left: `${designConfig.headerX}%`,
                    top: `${designConfig.headerY}%`,
                    color: designConfig.headerColor || '#ffffff',
                    fontSize: `${headerFontPx}px`,
                    fontWeight: 800,
                    lineHeight: 1.15,
                    textShadow: '0 2px 4px rgba(0,0,0,0.4)',
                    touchAction: 'none',
                    userSelect: 'none',
                    fontFamily: 'Kanit, sans-serif',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxWidth: '80%'
                  }}
                >
                  {inlineEditingLayer === 'header' ? (
                    <textarea
                      autoFocus
                      rows={Math.max(1, (designConfig.headerText || '').split('\n').length)}
                      value={designConfig.headerText}
                      onChange={(e) => setDesignConfig(p => ({ ...p, headerText: e.target.value }))}
                      onBlur={() => setInlineEditingLayer(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
                          setInlineEditingLayer(null);
                        }
                      }}
                      className="bg-black/80 border border-amber-400 text-white rounded px-1.5 py-0.5 outline-none font-bold resize-none leading-tight font-kanit"
                      style={{ fontSize: `${headerFontPx}px`, minWidth: '140px' }}
                    />
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{designConfig.headerText}</div>
                  )}
                </div>
              )}

              {/* 4B. Discount Highlight (Main Big Text) */}
              {designConfig.discountText && (
                <div
                  onPointerDown={(e) => handleStartDrag(e, 'discount')}
                  onClick={(e) => { e.stopPropagation(); setActiveTab('text'); setActiveSticker('discount'); setActiveTextLayer('discount'); }}
                  onDoubleClick={(e) => { e.stopPropagation(); setInlineEditingLayer('discount'); }}
                  className={`absolute select-none cursor-move rounded transition-[box-shadow,outline-color] duration-150 ${
                    activeSticker === 'discount'
                      ? 'outline-2 outline-amber-400 outline-offset-2 bg-black/25 z-20'
                      : 'hover:outline-1 hover:outline-white/30 hover:outline-offset-1 z-10'
                  }`}
                  style={{
                    left: `${designConfig.discountX}%`,
                    top: `${designConfig.discountY}%`,
                    color: designConfig.discountColor || '#ffffff',
                    fontSize: `${discountFontPx}px`,
                    fontWeight: 900,
                    lineHeight: 1.1,
                    textShadow: '0 2px 6px rgba(0,0,0,0.5)',
                    touchAction: 'none',
                    userSelect: 'none',
                    letterSpacing: '-0.3px',
                    fontFamily: 'Kanit, sans-serif',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxWidth: '85%'
                  }}
                >
                  {inlineEditingLayer === 'discount' ? (
                    <textarea
                      autoFocus
                      rows={Math.max(1, (designConfig.discountText || '').split('\n').length)}
                      value={designConfig.discountText}
                      onChange={(e) => setDesignConfig(p => ({ ...p, discountText: e.target.value }))}
                      onBlur={() => setInlineEditingLayer(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
                          setInlineEditingLayer(null);
                        }
                      }}
                      className="bg-black/85 border-2 border-amber-400 text-white rounded-lg px-2 py-0.5 outline-none font-black resize-none leading-tight font-kanit"
                      style={{ fontSize: `${discountFontPx}px`, minWidth: '160px' }}
                    />
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{designConfig.discountText}</div>
                  )}
                </div>
              )}

              {/* 4C. Terms / Subtext */}
              {designConfig.termsText && (
                <div
                  onPointerDown={(e) => handleStartDrag(e, 'terms')}
                  onClick={(e) => { e.stopPropagation(); setActiveTab('text'); setActiveSticker('terms'); setActiveTextLayer('terms'); }}
                  onDoubleClick={(e) => { e.stopPropagation(); setInlineEditingLayer('terms'); }}
                  className={`absolute select-none cursor-move rounded transition-[box-shadow,outline-color] duration-150 max-w-[75%] ${
                    activeSticker === 'terms'
                      ? 'outline-2 outline-amber-400 outline-offset-2 bg-black/20 z-20'
                      : 'hover:outline-1 hover:outline-white/30 hover:outline-offset-1 z-10'
                  }`}
                  style={{
                    left: `${designConfig.termsX}%`,
                    top: `${designConfig.termsY}%`,
                    color: designConfig.termsColor || 'rgba(255,255,255,0.85)',
                    fontSize: `${termsFontPx}px`,
                    fontWeight: 500,
                    lineHeight: 1.25,
                    textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                    touchAction: 'none',
                    userSelect: 'none',
                    fontFamily: 'Kanit, sans-serif',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {inlineEditingLayer === 'terms' ? (
                    <textarea
                      autoFocus
                      rows={Math.max(1, (designConfig.termsText || '').split('\n').length)}
                      value={designConfig.termsText}
                      onChange={(e) => setDesignConfig(p => ({ ...p, termsText: e.target.value }))}
                      onBlur={() => setInlineEditingLayer(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
                          setInlineEditingLayer(null);
                        }
                      }}
                      className="bg-black/80 border border-amber-400 text-white rounded px-1.5 py-0.5 outline-none font-normal resize-none leading-tight font-kanit"
                      style={{ fontSize: `${termsFontPx}px`, minWidth: '180px' }}
                    />
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{designConfig.termsText}</div>
                  )}
                </div>
              )}

              {/* 5. QR Code / Barcode Sticker */}
              <div
                onPointerDown={(e) => handleStartDrag(e, 'qr')}
                onClick={(e) => { e.stopPropagation(); setActiveTab('qr'); setActiveSticker('qr'); setInlineEditingLayer(null); }}
                className={`absolute select-none cursor-move transition-[box-shadow,border-color] duration-150 group rounded-xl flex flex-col items-center justify-center ${
                  localQrConfig.whiteBg
                    ? 'bg-white shadow-2xl border-2'
                    : 'bg-transparent'
                } ${
                  activeSticker === 'qr'
                    ? (localQrConfig.whiteBg ? 'border-zinc-200 shadow-md ring-1 ring-zinc-400/50 z-20' : 'border-2 border-dashed border-zinc-300/80 z-20')
                    : (localQrConfig.whiteBg ? 'border-transparent hover:border-zinc-400 z-10' : 'border-2 border-dashed border-transparent hover:border-zinc-500/50 z-10')
                }`}
                style={{
                  left: `${localQrConfig.xPercent}%`,
                  top: `${localQrConfig.yPercent}%`,
                  width: `${localQrConfig.sizePercent}%`,
                  maxWidth: `${localQrConfig.sizePercent}%`,
                  transform: 'translate(-50%, -50%)',
                  touchAction: 'none',
                  boxSizing: 'border-box',
                  padding: `${cardPadPx}px`,
                  minWidth: 0
                }}
              >
                {localQrConfig.codeType === 'barcode' ? (
                  <div className="w-full flex items-center justify-center overflow-hidden py-0.5">
                    {sampleBarcodeDataUrl ? (
                      <img src={sampleBarcodeDataUrl} alt="Sample Barcode" className="w-full h-auto object-contain pointer-events-none" />
                    ) : (
                      <Barcode className="w-full h-10 text-zinc-900" />
                    )}
                  </div>
                ) : (
                  <div className="w-full flex items-center justify-center overflow-hidden">
                    {sampleQrDataUrl ? (
                      <img src={sampleQrDataUrl} alt="Sample QR" className="w-full h-auto aspect-square object-contain pointer-events-none" />
                    ) : (
                      <QrCode className="w-full h-full text-zinc-900" />
                    )}
                  </div>
                )}

                {/* Show Code Text Underneath */}
                {localQrConfig.showCode && (
                  <div
                    className={`font-mono tracking-wider font-semibold block truncate max-w-full text-center transition-all ${
                      localQrConfig.codeBgStyle === 'white_pill'
                        ? 'bg-white/95 text-slate-900 border border-slate-200 shadow-sm rounded-full'
                        : localQrConfig.codeBgStyle === 'dark_pill'
                        ? 'bg-slate-900/90 text-white border border-slate-700 shadow-sm rounded-full'
                        : 'bg-transparent'
                    }`}
                    style={{
                      fontSize: `${codeFontPx}px`,
                      marginTop: `${codeMarginTopPx}px`,
                      padding: localQrConfig.codeBgStyle !== 'none' ? '2px 8px' : '0',
                      color: localQrConfig.codeBgStyle === 'dark_pill'
                        ? '#ffffff'
                        : (localQrConfig.codeColor || (localQrConfig.whiteBg ? '#0f172a' : '#ffffff'))
                    }}
                  >
                    CP-SAMPLE-8899
                  </div>
                )}

                {/* Resize Handle for QR */}
                {activeSticker === 'qr' && (
                  <div
                    onPointerDown={(e) => handleStartResize(e, 'qr')}
                    className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-zinc-900 border border-zinc-200 rounded-full cursor-nwse-resize shadow-md flex items-center justify-center z-30 group-hover:scale-110 transition-transform"
                    title="ลากเพื่อย่อ-ขยายขนาด"
                  >
                    <Move size={8} className="text-white transform rotate-45" />
                  </div>
                )}
              </div>

              {/* 6. Expiry Date Sticker (EXP) */}
              {localExpiryConfig.enabled !== false && (
                <div
                  onPointerDown={(e) => handleStartDrag(e, 'expiry')}
                  onClick={(e) => { e.stopPropagation(); setActiveTab('expiry'); setActiveSticker('expiry'); setInlineEditingLayer(null); }}
                  className={`absolute select-none cursor-move transition-[border-color,box-shadow,opacity] duration-150 group flex items-center justify-center ${
                    localExpiryConfig.bgStyle === 'white_pill'
                      ? 'bg-white/95 text-slate-900 border border-zinc-200 shadow-xl rounded-full'
                      : localExpiryConfig.bgStyle === 'dark_pill'
                      ? 'bg-zinc-900/90 text-white border border-zinc-700 shadow-xl rounded-full'
                      : 'bg-transparent'
                  } ${
                    activeSticker === 'expiry'
                      ? 'outline-2 outline-amber-400 outline-offset-2 shadow-md z-20'
                      : 'hover:outline-1 hover:outline-white/30 z-10'
                  }`}
                  style={{
                    left: `${localExpiryConfig.xPercent}%`,
                    top: `${localExpiryConfig.yPercent}%`,
                    transform: 'translate(-50%, -50%)',
                    touchAction: 'none',
                    userSelect: 'none',
                    padding: localExpiryConfig.bgStyle !== 'none' ? `${Math.round(expFontPx * 0.35)}px ${Math.round(expFontPx * 0.7)}px` : '2px 6px'
                  }}
                >
                  <span
                    style={{
                      fontSize: `${expFontPx}px`,
                      color: localExpiryConfig.bgStyle === 'dark_pill' ? '#ffffff' : (localExpiryConfig.color || '#ffffff'),
                      fontFamily: getExpiryFontFamily(localExpiryConfig.fontFamily),
                      fontWeight: localExpiryConfig.fontWeight === 'bold' ? 700 : (localExpiryConfig.fontWeight === 'normal' ? 400 : 300),
                      lineHeight: 1.1,
                      whiteSpace: 'nowrap',
                      display: 'inline-block'
                    }}
                  >
                    {formattedExpiryDisplay}
                  </span>

                  {/* Resize Handle for EXP */}
                  {activeSticker === 'expiry' && (
                    <div
                      onPointerDown={(e) => handleStartResize(e, 'expiry')}
                      className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-zinc-900 border border-zinc-200 rounded-full cursor-nwse-resize shadow-md flex items-center justify-center z-30"
                    >
                      <div className="w-1 h-1 bg-white rounded-full" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT 30%: Photoshop & Canva Control Panel */}
          <div className={`w-full lg:w-[32%] xl:w-[30%] bg-[#141416] border-t lg:border-t-0 lg:border-l border-zinc-800/90 flex flex-col shrink-0 overflow-hidden ${
            viewMode === 'canvas' ? 'hidden lg:flex' : 'flex'
          }`}>
            
            {/* Scrollable Control Settings with custom sleek scrollbar */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 space-y-4 [scrollbar-width:thin] [scrollbar-color:#3f3f46_#141416]">
              <div className="w-full space-y-3">
                
                {/* Layer Navigation Tabs (5 Grid Columns - NO SCROLLBAR, ZERO OVERFLOW) */}
                <div className="grid grid-cols-5 gap-1 p-1 bg-[#101012] rounded-xl border border-zinc-800/90 select-none overflow-hidden">
                  <button
                    type="button"
                    onClick={() => { setActiveTab('text'); setActiveSticker('discount'); setActiveTextLayer('discount'); }}
                    className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 px-0.5 rounded-lg text-[10px] sm:text-xs font-semibold kanit-text transition-all truncate ${
                      activeTab === 'text' ? 'bg-zinc-700 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                    }`}
                  >
                    <Type size={12} className="shrink-0" />
                    <span className="truncate">ข้อความ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('bg'); setActiveSticker('bg'); }}
                    className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 px-0.5 rounded-lg text-[10px] sm:text-xs font-semibold kanit-text transition-all truncate ${
                      activeTab === 'bg' ? 'bg-zinc-700 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                    }`}
                  >
                    <Palette size={12} className="shrink-0" />
                    <span className="truncate">พื้นหลัง</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('logo'); setActiveSticker('logo'); }}
                    className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 px-0.5 rounded-lg text-[10px] sm:text-xs font-semibold kanit-text transition-all truncate ${
                      activeTab === 'logo' ? 'bg-zinc-700 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                    }`}
                  >
                    <Sparkles size={12} className="shrink-0" />
                    <span className="truncate">โลโก้</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('qr'); setActiveSticker('qr'); }}
                    className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 px-0.5 rounded-lg text-[10px] sm:text-xs font-semibold kanit-text transition-all truncate ${
                      activeTab === 'qr' ? 'bg-zinc-700 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                    }`}
                  >
                    <QrCode size={12} className="shrink-0" />
                    <span className="truncate">QR/Bar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('expiry'); setActiveSticker('expiry'); }}
                    className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 px-0.5 rounded-lg text-[10px] sm:text-xs font-semibold kanit-text transition-all truncate ${
                      activeTab === 'expiry' ? 'bg-zinc-700 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                    }`}
                  >
                    <Calendar size={12} className="shrink-0" />
                    <span className="truncate">หมดอายุ</span>
                  </button>
                </div>

                {/* TAB 1: ✍️ ข้อความ (Custom Text Layers) - DIRECT & PROMINENT EDITING */}
                {activeTab === 'text' && (
                  <div className="space-y-3.5 animate-in fade-in duration-100">
                    
                    {/* Layer Switcher Pills */}
                    <div className="grid grid-cols-3 gap-1 bg-[#101012] p-1 rounded-xl border border-zinc-800 select-none">
                      <button
                        type="button"
                        onClick={() => { setActiveTextLayer('discount'); setActiveSticker(designConfig.discountText ? 'discount' : activeSticker); }}
                        className={`py-1.5 px-1 rounded-lg kanit-text text-[11px] font-bold transition-all text-center truncate flex items-center justify-center gap-1 ${
                          activeTextLayer === 'discount' ? 'bg-amber-500 text-zinc-950 shadow-xs' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        <span>🏷️ ส่วนลดใหญ่</span>
                        {designConfig.discountText && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setActiveTextLayer('header'); setActiveSticker(designConfig.headerText ? 'header' : activeSticker); }}
                        className={`py-1.5 px-1 rounded-lg kanit-text text-[11px] font-bold transition-all text-center truncate flex items-center justify-center gap-1 ${
                          activeTextLayer === 'header' ? 'bg-zinc-700 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        <span>🏥 ชื่อคลินิก</span>
                        {designConfig.headerText && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setActiveTextLayer('terms'); setActiveSticker(designConfig.termsText ? 'terms' : activeSticker); }}
                        className={`py-1.5 px-1 rounded-lg kanit-text text-[11px] font-bold transition-all text-center truncate flex items-center justify-center gap-1 ${
                          activeTextLayer === 'terms' ? 'bg-zinc-700 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        <span>📝 เงื่อนไขย่อย</span>
                        {designConfig.termsText && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                      </button>
                    </div>

                    {/* 1. DISCOUNT TEXT CONTROLS (Main Callout) */}
                    {activeTextLayer === 'discount' && (
                      <div className="space-y-3 p-3 bg-zinc-900/60 rounded-2xl border border-amber-500/30 shadow-xs">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-amber-400 kanit-text flex items-center gap-1.5">
                              <Type size={13} />
                              <span>ข้อความส่วนลดหลัก:</span>
                            </label>
                            <div className="flex items-center gap-2">
                              {designConfig.discountText && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDesignConfig(p => ({ ...p, discountText: '' }));
                                    if (activeSticker === 'discount') setActiveSticker('qr');
                                  }}
                                  className="text-[11px] text-red-400 hover:text-red-300 kanit-text flex items-center gap-1 font-medium transition-colors"
                                  title="ลบข้อความนี้ออกจากคูปอง"
                                >
                                  <Trash2 size={12} />
                                  <span>ลบข้อความนี้</span>
                                </button>
                              )}
                              <span className="text-[10px] text-zinc-400 font-mono">(Enter ขึ้นบรรทัดใหม่)</span>
                            </div>
                          </div>
                          <textarea
                            rows={Math.max(2, (designConfig.discountText || '').split('\n').length)}
                            value={designConfig.discountText}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDesignConfig(p => ({ ...p, discountText: val }));
                              if (val && activeSticker !== 'discount') setActiveSticker('discount');
                            }}
                            placeholder={"พิมพ์ข้อความส่วนลด เช่น\nลด 10%\nเฉพาะวันนี้ (กด Enter เพื่อขึ้นบรรทัดใหม่)"}
                            className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border-2 border-amber-400/70 focus:border-amber-400 text-white font-bold text-sm sm:text-base outline-none shadow-inner transition-all resize-y leading-snug font-kanit"
                          />
                        </div>

                        {/* Quick Presets for Discount Text */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-zinc-400 kanit-text">ข้อความด่วน:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {['ลด 10%', 'ลด 15%', 'ลด 20%', 'ลด 30%', 'ลด 50%', 'ลด ฿500', 'VOUCHER\n฿1,000'].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => {
                                  setDesignConfig(p => ({ ...p, discountText: preset }));
                                  setActiveSticker('discount');
                                }}
                                className="px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-[11px] font-semibold kanit-text transition-all active:scale-95 text-left"
                              >
                                {preset.includes('\n') ? preset.replace('\n', ' • ') : preset}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Text Color Picker & Presets */}
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                          <span className="text-xs text-zinc-300 kanit-text font-medium">สีตัวหนังสือส่วนลด:</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => { setColorPickerTarget('discount'); setIsColorPickerOpen(true); }}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-200"
                            >
                              <span>{designConfig.discountColor || '#ffffff'}</span>
                              <div className="w-4 h-4 rounded border border-white/50 shadow-xs" style={{ background: designConfig.discountColor || '#ffffff' }} />
                            </button>
                          </div>
                        </div>

                        {/* Font Size Slider with - / + step buttons */}
                        <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                          <div className="flex items-center justify-between text-xs text-zinc-300 kanit-text font-medium">
                            <span>ขนาดฟอนต์ส่วนลด:</span>
                            <span className="font-mono text-amber-400 font-bold">{designConfig.discountFontSize} pt</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setDesignConfig(p => ({ ...p, discountFontSize: Math.max(14, p.discountFontSize - 2) }))}
                              className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold flex items-center justify-center hover:bg-zinc-700 text-xs"
                            >
                              -
                            </button>
                            <input
                              type="range"
                              min="14"
                              max="54"
                              step="1"
                              value={designConfig.discountFontSize}
                              onChange={(e) => setDesignConfig(p => ({ ...p, discountFontSize: Number(e.target.value) }))}
                              className="flex-1 cursor-pointer accent-amber-400"
                            />
                            <button
                              type="button"
                              onClick={() => setDesignConfig(p => ({ ...p, discountFontSize: Math.min(54, p.discountFontSize + 2) }))}
                              className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold flex items-center justify-center hover:bg-zinc-700 text-xs"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2. HEADER TEXT CONTROLS */}
                    {activeTextLayer === 'header' && (
                      <div className="space-y-3 p-3 bg-zinc-900/60 rounded-2xl border border-zinc-800">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-zinc-200 kanit-text flex items-center gap-1.5">
                              <Type size={13} className="text-amber-400" />
                              <span>ข้อความหัวข้อ / ชื่อคลินิก:</span>
                            </label>
                            <div className="flex items-center gap-2">
                              {designConfig.headerText && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDesignConfig(p => ({ ...p, headerText: '' }));
                                    if (activeSticker === 'header') setActiveSticker('qr');
                                  }}
                                  className="text-[11px] text-red-400 hover:text-red-300 kanit-text flex items-center gap-1 font-medium transition-colors"
                                  title="ลบข้อความนี้ออกจากคูปอง"
                                >
                                  <Trash2 size={12} />
                                  <span>ลบข้อความนี้</span>
                                </button>
                              )}
                              <span className="text-[10px] text-zinc-400 font-mono">(Enter ขึ้นบรรทัดใหม่)</span>
                            </div>
                          </div>
                          <textarea
                            rows={Math.max(2, (designConfig.headerText || '').split('\n').length)}
                            value={designConfig.headerText}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDesignConfig(p => ({ ...p, headerText: val }));
                              if (val && activeSticker !== 'header') setActiveSticker('header');
                            }}
                            placeholder={"พิมพ์ชื่อคลินิก เช่น\nANPING CLINIC\nอันผิง คลินิก (กด Enter ขึ้นบรรทัดใหม่ได้)"}
                            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-zinc-400 text-white font-bold text-sm outline-none shadow-inner resize-y leading-snug font-kanit"
                          />
                        </div>

                        {/* Quick Presets for Header */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-zinc-400 kanit-text">ข้อความด่วน:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {['ANPING CLINIC', 'อันผิง คลินิก', 'EXCLUSIVE VOUCHER', 'GIFT VOUCHER'].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => {
                                  setDesignConfig(p => ({ ...p, headerText: preset }));
                                  setActiveSticker('header');
                                }}
                                className="px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-[11px] font-semibold kanit-text transition-all active:scale-95"
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                          <span className="text-xs text-zinc-300 kanit-text">สีตัวหนังสือ:</span>
                          <button
                            type="button"
                            onClick={() => { setColorPickerTarget('header'); setIsColorPickerOpen(true); }}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-200"
                          >
                            <span>{designConfig.headerColor || '#ffffff'}</span>
                            <div className="w-4 h-4 rounded border border-white/50" style={{ background: designConfig.headerColor || '#ffffff' }} />
                          </button>
                        </div>
                        <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                          <div className="flex items-center justify-between text-xs text-zinc-300 kanit-text">
                            <span>ขนาดฟอนต์หัวข้อ:</span>
                            <span className="font-mono text-zinc-200 font-bold">{designConfig.headerFontSize} pt</span>
                          </div>
                          <input
                            type="range"
                            min="8"
                            max="26"
                            step="1"
                            value={designConfig.headerFontSize}
                            onChange={(e) => setDesignConfig(p => ({ ...p, headerFontSize: Number(e.target.value) }))}
                            className="w-full cursor-pointer accent-zinc-300"
                          />
                        </div>
                      </div>
                    )}

                    {/* 3. TERMS TEXT CONTROLS */}
                    {activeTextLayer === 'terms' && (
                      <div className="space-y-3 p-3 bg-zinc-900/60 rounded-2xl border border-zinc-800">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-zinc-200 kanit-text flex items-center gap-1.5">
                              <Type size={13} className="text-amber-400" />
                              <span>ข้อความเงื่อนไข / สิทธิประโยชน์:</span>
                            </label>
                            <div className="flex items-center gap-2">
                              {designConfig.termsText && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDesignConfig(p => ({ ...p, termsText: '' }));
                                    if (activeSticker === 'terms') setActiveSticker('qr');
                                  }}
                                  className="text-[11px] text-red-400 hover:text-red-300 kanit-text flex items-center gap-1 font-medium transition-colors"
                                  title="ลบข้อความนี้ออกจากคูปอง"
                                >
                                  <Trash2 size={12} />
                                  <span>ลบข้อความนี้</span>
                                </button>
                              )}
                              <span className="text-[10px] text-zinc-400 font-mono">(Enter ขึ้นบรรทัดใหม่)</span>
                            </div>
                          </div>
                          <textarea
                            rows={Math.max(2, (designConfig.termsText || '').split('\n').length)}
                            value={designConfig.termsText}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDesignConfig(p => ({ ...p, termsText: val }));
                              if (val && activeSticker !== 'terms') setActiveSticker('terms');
                            }}
                            placeholder={"พิมพ์เงื่อนไข เช่น\n* สามารถใช้ได้กับทุกบริการและการรักษา\n* สำรองคิวล่วงหน้า 1 วัน"}
                            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-zinc-400 text-white text-xs outline-none shadow-inner resize-y leading-snug font-kanit"
                          />
                        </div>

                        {/* Quick Presets for Terms */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-zinc-400 kanit-text">ข้อความด่วน:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              '* ใช้ได้กับทุกบริการและการรักษา',
                              '* สำรองคิวล่วงหน้า 1 วัน',
                              '* เงื่อนไขเป็นไปตามที่กำหนด',
                              "* แสดงคูปองก่อนรับบริการ\n* ไม่สามารถแลกเปลี่ยนเป็นเงินสดได้"
                            ].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => {
                                  setDesignConfig(p => ({ ...p, termsText: preset }));
                                  setActiveSticker('terms');
                                }}
                                className="px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-[10px] font-medium kanit-text transition-all active:scale-95 text-left"
                              >
                                {preset.includes('\n') ? preset.replace('\n', ' • ') : preset}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                          <span className="text-xs text-zinc-300 kanit-text">สีข้อความเงื่อนไข:</span>
                          <button
                            type="button"
                            onClick={() => { setColorPickerTarget('terms'); setIsColorPickerOpen(true); }}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-200"
                          >
                            <span>{designConfig.termsColor || 'rgba(255,255,255,0.85)'}</span>
                            <div className="w-4 h-4 rounded border border-white/50" style={{ background: designConfig.termsColor || 'rgba(255,255,255,0.85)' }} />
                          </button>
                        </div>
                        <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                          <div className="flex items-center justify-between text-xs text-zinc-300 kanit-text">
                            <span>ขนาดฟอนต์เงื่อนไข:</span>
                            <span className="font-mono text-zinc-200 font-bold">{designConfig.termsFontSize} pt</span>
                          </div>
                          <input
                            type="range"
                            min="6"
                            max="16"
                            step="0.5"
                            value={designConfig.termsFontSize}
                            onChange={(e) => setDesignConfig(p => ({ ...p, termsFontSize: Number(e.target.value) }))}
                            className="w-full cursor-pointer accent-zinc-300"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: 🎨 พื้นหลัง (Background / Gradient) */}
                {activeTab === 'bg' && (
                  <div className="space-y-3 animate-in fade-in duration-100">
                    <div className="grid grid-cols-2 gap-1 bg-[#101012] p-1 rounded-xl border border-zinc-800 select-none">
                      <button
                        type="button"
                        onClick={() => setDesignConfig(p => ({ ...p, bgType: 'gradient' }))}
                        className={`py-1.5 text-xs font-semibold rounded-lg kanit-text transition-all text-center ${
                          designConfig.bgType === 'gradient' ? 'bg-zinc-700 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        ไล่เฉดสี (Gradient)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDesignConfig(p => ({ ...p, bgType: 'solid' }))}
                        className={`py-1.5 text-xs font-semibold rounded-lg kanit-text transition-all text-center ${
                          designConfig.bgType === 'solid' ? 'bg-zinc-700 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        สีเดี่ยว (Solid)
                      </button>
                    </div>

                    {designConfig.bgType === 'gradient' && (
                      <div className="space-y-2.5">
                        <label className="text-xs font-semibold text-zinc-300 kanit-text block">ชุดสีกราเดียนต์คลินิก:</label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {STUDIO_GRADIENT_PRESETS.map((pst) => (
                            <button
                              key={pst.id}
                              type="button"
                              onClick={() => setDesignConfig(p => ({ ...p, gradientKey: pst.id }))}
                              className={`p-1.5 rounded-lg border text-left transition-all flex flex-col items-center gap-1 ${
                                designConfig.gradientKey === pst.id
                                  ? 'border-amber-400 ring-1 ring-amber-400 bg-zinc-800'
                                  : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/60'
                              }`}
                            >
                              <div
                                className="w-full h-6 rounded-md shadow-inner"
                                style={{ background: `linear-gradient(135deg, ${pst.c1} 0%, ${pst.c2} 50%, ${pst.c3} 100%)` }}
                              />
                              <span className="text-[9px] text-zinc-300 font-medium truncate max-w-full text-center">
                                {pst.name.split(' ')[0]}
                              </span>
                            </button>
                          ))}
                        </div>

                        {/* Custom Gradient Colors */}
                        <div className="p-2.5 bg-zinc-900/60 rounded-xl border border-zinc-800/80 space-y-2">
                          <div className="text-[11px] font-semibold text-zinc-300 kanit-text">กำหนดสีกราเดียนต์เอง:</div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => { setColorPickerTarget('grad1'); setIsColorPickerOpen(true); }}
                              className="flex-1 flex items-center justify-between p-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs"
                            >
                              <span className="text-zinc-400">สีเริ่มต้น</span>
                              <div className="w-4 h-4 rounded border border-white/40 shadow-xs" style={{ background: designConfig.gradientColor1 || '#064e3b' }} />
                            </button>
                            <button
                              type="button"
                              onClick={() => { setColorPickerTarget('grad2'); setIsColorPickerOpen(true); }}
                              className="flex-1 flex items-center justify-between p-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs"
                            >
                              <span className="text-zinc-400">สีปลายทาง</span>
                              <div className="w-4 h-4 rounded border border-white/40 shadow-xs" style={{ background: designConfig.gradientColor2 || '#047857' }} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {designConfig.bgType === 'solid' && (
                      <div className="p-2.5 bg-zinc-900/60 rounded-xl border border-zinc-800 space-y-2">
                        <span className="text-xs text-zinc-300 kanit-text">เลือกสีพื้นหลังเดี่ยว:</span>
                        <button
                          type="button"
                          onClick={() => { setColorPickerTarget('solid'); setIsColorPickerOpen(true); }}
                          className="w-full flex items-center justify-between p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs"
                        >
                          <span className="font-mono text-zinc-200">{designConfig.solidColor || '#064e3b'}</span>
                          <div className="w-5 h-5 rounded border border-white/40 shadow-xs" style={{ background: designConfig.solidColor || '#064e3b' }} />
                        </button>
                      </div>
                    )}

                    {/* Effects Toggles: Photoshop Theme */}
                    <div className="space-y-2 pt-2 border-t border-zinc-800">
                      <div className="flex items-center justify-between p-2 bg-zinc-900/50 rounded-xl border border-zinc-800">
                        <span className="text-xs text-zinc-200 kanit-text font-medium">แสงเงาสะท้อนพรีเมียม (Metallic Sheen):</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={designConfig.sheenEnabled}
                          onClick={() => setDesignConfig(p => ({ ...p, sheenEnabled: !p.sheenEnabled }))}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none ${
                            designConfig.sheenEnabled ? 'bg-zinc-200' : 'bg-zinc-800 border border-zinc-700'
                          }`}
                        >
                          <span className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full shadow-md transition duration-200 ${
                            designConfig.sheenEnabled ? 'translate-x-4.5 bg-zinc-900' : 'translate-x-1 bg-zinc-400'
                          }`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-2 bg-zinc-900/50 rounded-xl border border-zinc-800">
                        <span className="text-xs text-zinc-200 kanit-text font-medium">เส้นกรอบทอง / ขอบใน (Luxury Border):</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={designConfig.borderEnabled}
                          onClick={() => setDesignConfig(p => ({ ...p, borderEnabled: !p.borderEnabled }))}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none ${
                            designConfig.borderEnabled ? 'bg-zinc-200' : 'bg-zinc-800 border border-zinc-700'
                          }`}
                        >
                          <span className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full shadow-md transition duration-200 ${
                            designConfig.borderEnabled ? 'translate-x-4.5 bg-zinc-900' : 'translate-x-1 bg-zinc-400'
                          }`} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: 🏥 โลโก้คลินิก (Clinic Logo) */}
                {activeTab === 'logo' && (
                  <div className="space-y-3 animate-in fade-in duration-100">
                    <div className="flex items-center justify-between p-2 bg-zinc-900/50 rounded-xl border border-zinc-800">
                      <span className="text-xs text-zinc-200 kanit-text font-medium">แสดงโลโก้คลินิกบนคูปอง:</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={designConfig.logoEnabled}
                        onClick={() => setDesignConfig(p => ({ ...p, logoEnabled: !p.logoEnabled }))}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none ${
                          designConfig.logoEnabled ? 'bg-zinc-200' : 'bg-zinc-800 border border-zinc-700'
                        }`}
                      >
                        <span className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full shadow-md transition duration-200 ${
                          designConfig.logoEnabled ? 'translate-x-4.5 bg-zinc-900' : 'translate-x-1 bg-zinc-400'
                        }`} />
                      </button>
                    </div>

                    {designConfig.logoEnabled && (
                      <div className="space-y-3 pt-1">
                        <div className="p-2.5 bg-zinc-900/50 rounded-xl border border-zinc-800 space-y-1">
                          <div className="flex justify-between text-xs text-zinc-300">
                            <span>ขนาดโลโก้:</span>
                            <span className="font-mono">{designConfig.logoSize}%</span>
                          </div>
                          <input
                            type="range"
                            min="5"
                            max="30"
                            step="0.5"
                            value={designConfig.logoSize}
                            onChange={(e) => setDesignConfig(p => ({ ...p, logoSize: Number(e.target.value) }))}
                            className="w-full cursor-pointer accent-zinc-300"
                          />
                        </div>

                        <div className="p-2.5 bg-zinc-900/50 rounded-xl border border-zinc-800 space-y-1">
                          <div className="flex justify-between text-xs text-zinc-300">
                            <span>ตำแหน่งแนวนอน (X):</span>
                            <span className="font-mono">{designConfig.logoX}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="0.5"
                            value={designConfig.logoX}
                            onChange={(e) => setDesignConfig(p => ({ ...p, logoX: Number(e.target.value) }))}
                            className="w-full cursor-pointer accent-zinc-300"
                          />
                        </div>

                        <div className="p-2.5 bg-zinc-900/50 rounded-xl border border-zinc-800 space-y-1">
                          <div className="flex justify-between text-xs text-zinc-300">
                            <span>ตำแหน่งแนวตั้ง (Y):</span>
                            <span className="font-mono">{designConfig.logoY}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="0.5"
                            value={designConfig.logoY}
                            onChange={(e) => setDesignConfig(p => ({ ...p, logoY: Number(e.target.value) }))}
                            className="w-full cursor-pointer accent-zinc-300"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: 🔲 QR Code & Barcode */}
                {activeTab === 'qr' && (
                  <div className="space-y-3 animate-in fade-in duration-100">
                    {/* Code Type Switcher */}
                    <div className="flex bg-[#101012] p-1 rounded-xl border border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setLocalQrConfig(prev => ({ ...prev, codeType: 'qr' }))}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg kanit-text transition-all flex items-center justify-center gap-1.5 ${
                          localQrConfig.codeType === 'qr'
                            ? 'bg-zinc-700 text-white shadow-xs'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        <QrCode size={13} />
                        <span>QR Code (2D)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocalQrConfig(prev => ({ ...prev, codeType: 'barcode' }))}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg kanit-text transition-all flex items-center justify-center gap-1.5 ${
                          localQrConfig.codeType === 'barcode'
                            ? 'bg-zinc-700 text-white shadow-xs'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Barcode size={13} />
                        <span>บาร์โค้ด (1D)</span>
                      </button>
                    </div>

                    {/* Size Slider */}
                    <div className="p-2.5 bg-zinc-900/50 rounded-xl border border-zinc-800 space-y-1">
                      <div className="flex justify-between text-xs text-zinc-300 kanit-text">
                        <span>ขนาดโค้ด:</span>
                        <span className="font-mono">{localQrConfig.sizePercent}%</span>
                      </div>
                      <input
                        type="range"
                        min="8"
                        max="65"
                        step="0.5"
                        value={localQrConfig.sizePercent}
                        onChange={(e) => setLocalQrConfig(prev => ({ ...prev, sizePercent: Number(e.target.value) }))}
                        className="w-full cursor-pointer accent-zinc-300"
                      />
                    </div>

                    {/* Position X */}
                    <div className="p-2.5 bg-zinc-900/50 rounded-xl border border-zinc-800 space-y-1.5">
                      <div className="flex justify-between text-xs text-zinc-300 kanit-text">
                        <span>ตำแหน่งแนวนอน (X):</span>
                        <span className="font-mono text-zinc-200 font-bold">{localQrConfig.xPercent}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setLocalQrConfig(prev => ({ ...prev, xPercent: Math.max(0, Math.round((prev.xPercent - 0.5) * 10) / 10) }))}
                          className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold flex items-center justify-center hover:bg-zinc-700 text-xs shrink-0"
                        >
                          -
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="0.1"
                          value={localQrConfig.xPercent}
                          onChange={(e) => setLocalQrConfig(prev => ({ ...prev, xPercent: Number(e.target.value) }))}
                          className="w-full cursor-pointer accent-zinc-300"
                        />
                        <button
                          type="button"
                          onClick={() => setLocalQrConfig(prev => ({ ...prev, xPercent: Math.min(100, Math.round((prev.xPercent + 0.5) * 10) / 10) }))}
                          className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold flex items-center justify-center hover:bg-zinc-700 text-xs shrink-0"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Position Y */}
                    <div className="p-2.5 bg-zinc-900/50 rounded-xl border border-zinc-800 space-y-1.5">
                      <div className="flex justify-between text-xs text-zinc-300 kanit-text">
                        <span>ตำแหน่งแนวตั้ง (Y):</span>
                        <span className="font-mono text-zinc-200 font-bold">{localQrConfig.yPercent}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setLocalQrConfig(prev => ({ ...prev, yPercent: Math.max(0, Math.round((prev.yPercent - 0.5) * 10) / 10) }))}
                          className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold flex items-center justify-center hover:bg-zinc-700 text-xs shrink-0"
                        >
                          -
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="0.1"
                          value={localQrConfig.yPercent}
                          onChange={(e) => setLocalQrConfig(prev => ({ ...prev, yPercent: Number(e.target.value) }))}
                          className="w-full cursor-pointer accent-zinc-300"
                        />
                        <button
                          type="button"
                          onClick={() => setLocalQrConfig(prev => ({ ...prev, yPercent: Math.min(100, Math.round((prev.yPercent + 0.5) * 10) / 10) }))}
                          className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold flex items-center justify-center hover:bg-zinc-700 text-xs shrink-0"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Background Card Style Toggle */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-xs font-semibold text-zinc-300 kanit-text block">พื้นหลังกรอบโค้ด:</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setLocalQrConfig(prev => ({ ...prev, whiteBg: true }))}
                          className={`py-2 px-2.5 rounded-xl border text-xs font-semibold kanit-text flex items-center justify-center gap-1.5 transition-all ${
                            localQrConfig.whiteBg
                              ? 'bg-zinc-700 text-white border-zinc-500 shadow-sm'
                              : 'bg-zinc-800/70 text-zinc-400 border-zinc-800 hover:text-white'
                          }`}
                        >
                          <div className="w-3 h-3 rounded-full bg-white shrink-0" />
                          <span>การ์ดสีขาว</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setLocalQrConfig(prev => ({ ...prev, whiteBg: false }))}
                          className={`py-2 px-2.5 rounded-xl border text-xs font-semibold kanit-text flex items-center justify-center gap-1.5 transition-all ${
                            !localQrConfig.whiteBg
                              ? 'bg-zinc-700 text-white border-zinc-500 shadow-sm'
                              : 'bg-zinc-800/70 text-zinc-400 border-zinc-800 hover:text-white'
                          }`}
                        >
                          <div className="w-3 h-3 rounded border border-zinc-400 shrink-0" />
                          <span>โปร่งใส (ไร้กรอบ)</span>
                        </button>
                      </div>
                    </div>

                    {/* Show Code Text Toggle: Photoshop Theme */}
                    <div className="pt-2 border-t border-zinc-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-zinc-200 kanit-text text-xs">รหัสตัวหนังสือด้านล่าง:</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-semibold kanit-text ${localQrConfig.showCode ? 'text-zinc-200' : 'text-zinc-500'}`}>
                            {localQrConfig.showCode ? 'เปิดแสดง' : 'ปิด'}
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={localQrConfig.showCode}
                            onClick={() => setLocalQrConfig(prev => ({ ...prev, showCode: !prev.showCode }))}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                              localQrConfig.showCode ? 'bg-zinc-200' : 'bg-zinc-800 border border-zinc-700'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full shadow-md transition duration-200 ease-in-out ${
                                localQrConfig.showCode ? 'translate-x-4.5 bg-zinc-900' : 'translate-x-1 bg-zinc-400'
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {localQrConfig.showCode && (
                        <div className="space-y-2 pt-1 pl-1 animate-in fade-in duration-100">
                          {/* Distance Slider */}
                          <div className="p-2 bg-zinc-900/50 rounded-xl border border-zinc-800 space-y-1">
                            <div className="flex justify-between text-[11px] text-zinc-300 kanit-text">
                              <span>ระยะห่างจากโค้ด:</span>
                              <span className="font-mono text-zinc-400">{curCodeDistance}% (≈{codeMarginTopPx}px)</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="20"
                              step="0.5"
                              value={curCodeDistance}
                              onChange={(e) => setLocalQrConfig(prev => ({ ...prev, codeDistance: Number(e.target.value) }))}
                              className="w-full cursor-pointer accent-zinc-300"
                            />
                          </div>

                          {/* Font Size Slider */}
                          <div className="p-2 bg-zinc-900/50 rounded-xl border border-zinc-800 space-y-1">
                            <div className="flex justify-between text-[11px] text-zinc-300 kanit-text">
                              <span>ขนาดตัวหนังสือรหัส:</span>
                              <span className="font-mono text-zinc-400">{curCodeFontSize} pt (≈{codeFontPx}px)</span>
                            </div>
                            <input
                              type="range"
                              min="6"
                              max="20"
                              step="1"
                              value={curCodeFontSize}
                              onChange={(e) => setLocalQrConfig(prev => ({ ...prev, codeFontSize: Number(e.target.value) }))}
                              className="w-full cursor-pointer accent-zinc-300"
                            />
                          </div>

                          {/* Code Color Picker */}
                          <div className="flex items-center justify-between p-2 bg-zinc-900/50 rounded-xl border border-zinc-800">
                            <span className="text-xs text-zinc-300 kanit-text">สีตัวหนังสือรหัส:</span>
                            <button
                              type="button"
                              onClick={() => { setColorPickerTarget('code'); setIsColorPickerOpen(true); }}
                              className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs font-mono"
                            >
                              <span>{localQrConfig.codeColor || '#0f172a'}</span>
                              <div className="w-3.5 h-3.5 rounded border border-white/40 shadow-xs" style={{ background: localQrConfig.codeColor || '#0f172a' }} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 5: 📅 วันหมดอายุ (Expiry Date) - Full Customization Suite Restored */}
                {activeTab === 'expiry' && (
                  <div className="space-y-3.5 animate-in fade-in duration-100">
                    {/* Toggle Switch */}
                    <div className="flex items-center justify-between p-2.5 bg-zinc-900/50 rounded-xl border border-zinc-800">
                      <span className="text-xs text-zinc-200 kanit-text font-medium">เปิดใช้งานวันหมดอายุ:</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-semibold kanit-text ${localExpiryConfig.enabled !== false ? 'text-zinc-200' : 'text-zinc-500'}`}>
                          {localExpiryConfig.enabled !== false ? 'เปิดใช้งาน' : 'ปิด'}
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={localExpiryConfig.enabled !== false}
                          onClick={() => setLocalExpiryConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none ${
                            localExpiryConfig.enabled !== false ? 'bg-zinc-200' : 'bg-zinc-800 border border-zinc-700'
                          }`}
                        >
                          <span className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full shadow-md transition duration-200 ${
                            localExpiryConfig.enabled !== false ? 'translate-x-4.5 bg-zinc-900' : 'translate-x-1 bg-zinc-400'
                          }`} />
                        </button>
                      </div>
                    </div>

                    {localExpiryConfig.enabled !== false && (
                      <div className="space-y-3 pt-0.5">
                        {/* 1. Date Format Selection (รูปแบบวันที่) */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-zinc-300 kanit-text block">รูปแบบวันที่:</label>
                          <div className="grid grid-cols-1 gap-1">
                            {[
                              { id: 'thai_short', label: 'พ.ศ. สั้น (มาตรฐานไทย)', example: '31 ต.ค. 2569' },
                              { id: 'thai_full', label: 'พ.ศ. เต็ม (ทางการ)', example: '31 ตุลาคม 2569' },
                              { id: 'eng', label: 'ค.ศ. สากล (Inter Product)', example: '31 OCT 2026' },
                              { id: 'numeric_th', label: 'ตัวเลขล้วน (พ.ศ.)', example: '31/10/2569' },
                              { id: 'numeric', label: 'ตัวเลขล้วน (ค.ศ.)', example: '31/10/2026' }
                            ].map(fmt => (
                              <button
                                key={fmt.id}
                                type="button"
                                onClick={() => setLocalExpiryConfig(prev => ({ ...prev, format: fmt.id }))}
                                className={`px-2.5 py-1.5 rounded-lg border text-left flex items-center justify-between text-xs transition-all ${
                                  (localExpiryConfig.format || 'eng') === fmt.id
                                    ? 'bg-zinc-700 text-white border-zinc-500 shadow-sm'
                                    : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
                                }`}
                              >
                                <span className="kanit-text font-medium">{fmt.label}</span>
                                <span className="font-mono text-[11px] text-zinc-300 opacity-90">{fmt.example}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 2. Prefix Input & Quick Presets (คำนำหน้าข้อความ) */}
                        <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-zinc-300 kanit-text">คำนำหน้าข้อความ:</label>
                            <span className="text-[10px] text-zinc-500">(พิมพ์เปลี่ยนเองได้)</span>
                          </div>
                          <input
                            type="text"
                            value={localExpiryConfig.prefix !== undefined ? localExpiryConfig.prefix : 'EXP: '}
                            onChange={(e) => setLocalExpiryConfig(prev => ({ ...prev, prefix: e.target.value }))}
                            placeholder="เช่น EXP: หรือ หมดอายุ: หรือ เว้นว่าง"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-zinc-400 text-white font-mono text-xs outline-none"
                          />
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {[
                              { label: 'EXP: ', val: 'EXP: ' },
                              { label: 'หมดอายุ: ', val: 'หมดอายุ: ' },
                              { label: 'ใช้ได้ถึง: ', val: 'ใช้ได้ถึง: ' },
                              { label: '(เว้นว่าง / ไม่มี)', val: '' }
                            ].map(chip => (
                              <button
                                key={chip.label}
                                type="button"
                                onClick={() => setLocalExpiryConfig(prev => ({ ...prev, prefix: chip.val }))}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all border ${
                                  (localExpiryConfig.prefix === chip.val || (chip.val === '' && !localExpiryConfig.prefix))
                                    ? 'bg-zinc-700 text-amber-300 border-zinc-500 font-bold'
                                    : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-white'
                                }`}
                              >
                                {chip.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 3. Font Family (แบบฟอนต์) */}
                        <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
                          <label className="text-xs font-semibold text-zinc-300 kanit-text block">แบบฟอนต์:</label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { id: 'Inter', name: 'Inter (คลีน สากล)' },
                              { id: 'Kanit', name: 'Kanit (คลินิก)' },
                              { id: 'Prompt', name: 'Prompt (โมเดิร์น)' },
                              { id: 'Sarabun', name: 'Sarabun (ทางการ)' },
                              { id: 'Mono', name: 'JetBrains Mono' }
                            ].map(f => (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => setLocalExpiryConfig(prev => ({ ...prev, fontFamily: f.id }))}
                                className={`px-2 py-1.5 rounded-lg border text-left text-xs transition-all ${
                                  (localExpiryConfig.fontFamily || 'Inter') === f.id
                                    ? 'bg-zinc-700 text-white border-zinc-500 shadow-sm font-semibold'
                                    : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-white'
                                }`}
                              >
                                {f.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 4. Font Weight (น้ำหนักฟอนต์) */}
                        <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
                          <label className="text-xs font-semibold text-zinc-300 kanit-text block">น้ำหนักฟอนต์:</label>
                          <div className="grid grid-cols-3 gap-1">
                            {[
                              { id: 'light', name: 'บาง (300)' },
                              { id: 'normal', name: 'ปกติ (400)' },
                              { id: 'bold', name: 'หนา (700)' }
                            ].map(w => (
                              <button
                                key={w.id}
                                type="button"
                                onClick={() => setLocalExpiryConfig(prev => ({ ...prev, fontWeight: w.id }))}
                                className={`py-1.5 text-xs rounded-lg border text-center transition-all ${
                                  (localExpiryConfig.fontWeight || 'light') === w.id
                                    ? 'bg-zinc-700 text-white border-zinc-500 shadow-sm font-bold'
                                    : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-white'
                                }`}
                              >
                                {w.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 5. Background Style (สไตล์พื้นหลัง) */}
                        <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
                          <label className="text-xs font-semibold text-zinc-300 kanit-text block">สไตล์พื้นหลังข้อความ:</label>
                          <div className="grid grid-cols-3 gap-1">
                            {[
                              { id: 'none', name: 'ไร้กรอบ' },
                              { id: 'white_pill', name: 'แคปซูลขาว' },
                              { id: 'dark_pill', name: 'แคปซูลดำ' }
                            ].map(b => (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => setLocalExpiryConfig(prev => ({ ...prev, bgStyle: b.id }))}
                                className={`py-1.5 text-xs rounded-lg border text-center transition-all ${
                                  (localExpiryConfig.bgStyle || 'none') === b.id
                                    ? 'bg-zinc-700 text-white border-zinc-500 shadow-sm font-bold'
                                    : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-white'
                                }`}
                              >
                                {b.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 6. Text Color (สีตัวหนังสือ) */}
                        <div className="flex items-center justify-between p-2.5 bg-zinc-900/50 rounded-xl border border-zinc-800">
                          <span className="text-xs text-zinc-300 kanit-text">สีตัวหนังสือ:</span>
                          <button
                            type="button"
                            onClick={() => { setColorPickerTarget('expiry'); setIsColorPickerOpen(true); }}
                            className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs font-mono"
                          >
                            <span>{localExpiryConfig.color || '#ffffff'}</span>
                            <div className="w-3.5 h-3.5 rounded border border-white/40" style={{ background: localExpiryConfig.color || '#ffffff' }} />
                          </button>
                        </div>

                        {/* 7. Font Size (ขนาดตัวหนังสือ EXP) */}
                        <div className="p-2.5 bg-zinc-900/50 rounded-xl border border-zinc-800 space-y-1.5">
                          <div className="flex justify-between text-xs text-zinc-300 kanit-text">
                            <span>ขนาดตัวหนังสือ (EXP):</span>
                            <span className="font-mono text-zinc-200 font-bold">{localExpiryConfig.sizePercent || 18}% (≈{expFontPx}px)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setLocalExpiryConfig(prev => ({ ...prev, sizePercent: Math.max(6, Math.round(((prev.sizePercent || 18) - 1) * 10) / 10) }))}
                              className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold flex items-center justify-center hover:bg-zinc-700 text-xs shrink-0"
                            >
                              -
                            </button>
                            <input
                              type="range"
                              min="6"
                              max="45"
                              step="0.5"
                              value={localExpiryConfig.sizePercent || 18}
                              onChange={(e) => setLocalExpiryConfig(prev => ({ ...prev, sizePercent: Number(e.target.value) }))}
                              className="w-full cursor-pointer accent-zinc-300"
                            />
                            <button
                              type="button"
                              onClick={() => setLocalExpiryConfig(prev => ({ ...prev, sizePercent: Math.min(45, Math.round(((prev.sizePercent || 18) + 1) * 10) / 10) }))}
                              className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold flex items-center justify-center hover:bg-zinc-700 text-xs shrink-0"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* 8. Position X (ตำแหน่งแนวนอน) */}
                        <div className="p-2.5 bg-zinc-900/50 rounded-xl border border-zinc-800 space-y-1.5">
                          <div className="flex justify-between text-xs text-zinc-300 kanit-text">
                            <span>ตำแหน่งแนวนอน (X):</span>
                            <span className="font-mono text-zinc-200 font-bold">{localExpiryConfig.xPercent}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setLocalExpiryConfig(prev => ({ ...prev, xPercent: Math.max(0, Math.round((prev.xPercent - 0.5) * 10) / 10) }))}
                              className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold flex items-center justify-center hover:bg-zinc-700 text-xs shrink-0"
                            >
                              -
                            </button>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="0.1"
                              value={localExpiryConfig.xPercent}
                              onChange={(e) => setLocalExpiryConfig(prev => ({ ...prev, xPercent: Number(e.target.value) }))}
                              className="w-full cursor-pointer accent-zinc-300"
                            />
                            <button
                              type="button"
                              onClick={() => setLocalExpiryConfig(prev => ({ ...prev, xPercent: Math.min(100, Math.round((prev.xPercent + 0.5) * 10) / 10) }))}
                              className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold flex items-center justify-center hover:bg-zinc-700 text-xs shrink-0"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* 9. Position Y (ตำแหน่งแนวตั้ง) */}
                        <div className="p-2.5 bg-zinc-900/50 rounded-xl border border-zinc-800 space-y-1.5">
                          <div className="flex justify-between text-xs text-zinc-300 kanit-text">
                            <span>ตำแหน่งแนวตั้ง (Y):</span>
                            <span className="font-mono text-zinc-200 font-bold">{localExpiryConfig.yPercent}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setLocalExpiryConfig(prev => ({ ...prev, yPercent: Math.max(0, Math.round((prev.yPercent - 0.5) * 10) / 10) }))}
                              className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold flex items-center justify-center hover:bg-zinc-700 text-xs shrink-0"
                            >
                              -
                            </button>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="0.1"
                              value={localExpiryConfig.yPercent}
                              onChange={(e) => setLocalExpiryConfig(prev => ({ ...prev, yPercent: Number(e.target.value) }))}
                              className="w-full cursor-pointer accent-zinc-300"
                            />
                            <button
                              type="button"
                              onClick={() => setLocalExpiryConfig(prev => ({ ...prev, yPercent: Math.min(100, Math.round((prev.yPercent + 0.5) * 10) / 10) }))}
                              className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold flex items-center justify-center hover:bg-zinc-700 text-xs shrink-0"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Quick Action in Sidebar */}
            <div className="p-3 border-t border-zinc-800/90 bg-[#121214] shrink-0">
              <button
                type="button"
                onClick={handleSave}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold kanit-text text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 active:scale-98 transition-all"
              >
                <Check size={16} />
                <span>เสร็จสิ้น / บันทึกดีไซน์ & ตำแหน่ง</span>
              </button>
            </div>
          </div>
        </div>

        {/* Photoshop Style High-Precision Color Picker Modal */}
        <PhotoshopColorPickerModal
          isOpen={isColorPickerOpen}
          onClose={() => setIsColorPickerOpen(false)}
          initialColor={colorPickerInitialColor}
          onSelectColor={(hex) => {
            if (colorPickerTarget === 'code') setLocalQrConfig(p => ({ ...p, codeColor: hex }));
            else if (colorPickerTarget === 'expiry') setLocalExpiryConfig(p => ({ ...p, color: hex }));
            else if (colorPickerTarget === 'header') setDesignConfig(p => ({ ...p, headerColor: hex }));
            else if (colorPickerTarget === 'discount') setDesignConfig(p => ({ ...p, discountColor: hex }));
            else if (colorPickerTarget === 'terms') setDesignConfig(p => ({ ...p, termsColor: hex }));
            else if (colorPickerTarget === 'grad1') setDesignConfig(p => ({ ...p, gradientColor1: hex }));
            else if (colorPickerTarget === 'grad2') setDesignConfig(p => ({ ...p, gradientColor2: hex }));
            else if (colorPickerTarget === 'solid') setDesignConfig(p => ({ ...p, solidColor: hex }));
          }}
        />
      </div>
    </div>,
    document.body
  );
};

// =========================================================================
// MODAL: PREVIEW COUPON IMAGE MODAL VIEW (Popup แสดงตัวอย่างคูปองฉบับเต็ม)
// =========================================================================
const PreviewCouponModalView = ({
  coupon,
  onClose,
  generateCouponCanvas,
  onCopyImage,
  onCopyText,
  onDownloadPng,
  onPrint
}) => {
  const [imgUrl, setImgUrl] = useState(null);
  const [isRendering, setIsRendering] = useState(true);

  useEffect(() => {
    let active = true;
    const render = async () => {
      setIsRendering(true);
      try {
        const cvs = await generateCouponCanvas(coupon);
        if (cvs && active) {
          setImgUrl(cvs.toDataURL('image/png'));
        }
      } catch (err) {
        console.error('Error rendering coupon preview:', err);
      } finally {
        if (active) setIsRendering(false);
      }
    };
    render();
    return () => { active = false; };
  }, [coupon, generateCouponCanvas]);

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-3.5 sm:p-5 bg-slate-900/65 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-[2rem] w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50 to-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-sm">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-base kanit-text">ตัวอย่างคูปองที่จะส่งลูกค้า</h3>
              <p className="text-xs text-sky-700 font-mono font-extrabold">{coupon.code} • {coupon.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Coupon Card Image Display */}
        <div className="p-4 sm:p-6 bg-slate-50/80 flex flex-col items-center justify-center min-h-[240px]">
          {isRendering ? (
            <div className="flex flex-col items-center gap-2.5 py-10">
              <RefreshCw size={30} className="animate-spin text-sky-500" />
              <span className="text-xs text-slate-500 font-bold kanit-text">กำลังเรนเดอร์ภาพคูปองความละเอียดสูง...</span>
            </div>
          ) : imgUrl ? (
            <div className="rounded-2xl overflow-hidden shadow-xl border border-slate-200/90 max-w-full">
              <img src={imgUrl} alt={coupon.code} className="w-full max-h-[380px] object-contain block" />
            </div>
          ) : (
            <div className="text-xs text-rose-500 font-bold">ไม่สามารถสร้างภาพตัวอย่างได้</div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-white flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onCopyImage(coupon)}
              className="px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold kanit-text flex items-center gap-1.5 transition-all border border-sky-200/80 active:scale-95 shadow-2xs"
              title="คัดลอกรูปภาพลง Clipboard พร้อมกด Ctrl+V วางใน LINE ได้ทันที"
            >
              <Copy size={15} />
              <span>คัดลอกรูปภาพ (ส่ง LINE)</span>
            </button>
            <button
              type="button"
              onClick={() => onCopyText(coupon)}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold kanit-text flex items-center gap-1.5 transition-all border border-emerald-200/80 active:scale-95 shadow-2xs"
              title="คัดลอกข้อความทักทายส่งลูกค้า"
            >
              <MessageSquare size={15} />
              <span>คัดลอกข้อความทักทาย</span>
            </button>
            <button
              type="button"
              onClick={() => onDownloadPng(coupon)}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold kanit-text flex items-center gap-1.5 transition-all active:scale-95"
              title="ดาวน์โหลดภาพ PNG"
            >
              <Download size={15} />
              <span>ดาวน์โหลด</span>
            </button>
            <button
              type="button"
              onClick={() => onPrint(coupon)}
              className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold kanit-text flex items-center gap-1.5 transition-all border border-indigo-200/80 active:scale-95"
              title="สั่งพิมพ์คูปองใบนี้"
            >
              <Printer size={15} />
              <span>พิมพ์</span>
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold kanit-text transition-all ml-auto"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};

const CouponManager = ({
  couponsData = [],
  setCouponsData,
  patientsData = [],
  posProducts = [],
  posHistoryData = [],
  currentBranch = 'all',
  branchesData = [],
  currentUser,
  callAppScript,
  gdriveTokens = {},
  showToast,
  showGlobalAlert,
  isGlobalLoading
}) => {
  // Navigation & View Modes
  const [viewMode, setViewMode] = useState('batches'); // 'batches' | 'all_cards'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'used', 'expired'
  const [searchTerm, setSearchTerm] = useState('');

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createProgress, setCreateProgress] = useState(null); // Real-time animated coupon creation progress { active, current, total, percent, status, message, title }
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [activeDrillDownBatch, setActiveDrillDownBatch] = useState(null);
  const [printModalConfig, setPrintModalConfig] = useState(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [previewCouponModal, setPreviewCouponModal] = useState(null); // ดูตัวอย่างคูปองก่อนส่งลูกค้า

  // Sticky Header & Sticky Search/Filter Bar Refs
  const headerRef = useRef(null);
  const filterRef = useRef(null);

  // Excel Export Modal States
  const [isExportExcelModalOpen, setIsExportExcelModalOpen] = useState(false);
  const [exportSelectedBatches, setExportSelectedBatches] = useState({});
  const [exportDateType, setExportDateType] = useState('all'); // 'all', 'today', '7days', 'this_month', 'custom'
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportStatusFilter, setExportStatusFilter] = useState('all'); // 'all', 'active', 'used', 'expired'

  // QR Scanning States
  const [scannerActive, setScannerActive] = useState(false);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [cameraFacing, setCameraFacing] = useState('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [scannedResultCoupon, setScannedResultCoupon] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanLoopRef = useRef(null);
  const mediaStreamRef = useRef(null);

  // Debounce Action Lock
  const isActionLockedRef = useRef(false);

  // Selective Printing in Batch / Card View
  const [selectedCouponIdsToPrint, setSelectedCouponIdsToPrint] = useState({});

  // Form State for Creating Coupons
  const [form, setForm] = useState({
    title: '',
    description: '',
    discountType: 'percent', // 'percent' | 'amount'
    discountValue: 10,
    minSpend: 0,
    maxDiscount: '',
    patientId: '',
    patientName: '',
    isLifetime: false,
    expireDate: '',
    templateType: 'card', // 'card' (85.6x54mm) | 'strip' (200x54mm) | 'custom_image'
    themeColor: 'emerald',
    customImageUrl: '',
    userUploadedImage: '', // Raw image uploaded by user (clean, no baked text)
    designConfig: null, // Editable Canva & Photoshop layer state
    branchScope: 'all',
    // Custom QR Visual Positioning Editor
    qrConfig: {
      codeType: 'qr', // 'qr' | 'barcode'
      xPercent: 78,
      yPercent: 32,
      sizePercent: 26,
      whiteBg: true,
      showCode: true,
      codeColor: '#0f172a',
      codeBgStyle: 'none',
      codeFontSize: 10,
      codeDistance: 3.5
    },
    // Custom Expiry Date Visual Positioning Editor
    expiryConfig: {
      enabled: true,
      xPercent: 25,
      yPercent: 82,
      sizePercent: 18,
      color: '#0f172a',
      bgStyle: 'none',
      format: 'eng',
      prefix: 'EXP: ',
      fontFamily: 'Inter',
      fontWeight: 'light'
    },
    quantity: 10
  });

  const [patientSearch, setPatientSearch] = useState('');
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const patientInputContainerRef = useRef(null);
  const patientPortalRef = useRef(null);
  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, left: 0, width: 0 });
  const [qrCodeDataUrls, setQrCodeDataUrls] = useState({});
  const [isUploadingArtwork, setIsUploadingArtwork] = useState(false);
  const pendingArtworkFileRef = useRef(null); // Deferred artwork file upload
  const artworkFileInputRef = useRef(null);

  // Calendar Picker States
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calDate, setCalDate] = useState(new Date());
  const [selectedCalDate, setSelectedCalDate] = useState(null);
  const [calView, setCalView] = useState('days'); // 'days' | 'months' | 'years'
  const [calYearPageStart, setCalYearPageStart] = useState(
    Math.floor((new Date().getFullYear() + 543) / 12) * 12
  );

  // Instagram Story Style QR Editor States
  const [isQrEditorOpen, setIsQrEditorOpen] = useState(false);

  // Dynamic positioning for floating patient dropdown portal
  const updateDropdownCoords = useCallback(() => {
    if (patientInputContainerRef.current) {
      const rect = patientInputContainerRef.current.getBoundingClientRect();
      setDropdownCoords({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      });
    }
  }, []);

  useEffect(() => {
    if (isPatientDropdownOpen) {
      updateDropdownCoords();
      window.addEventListener('resize', updateDropdownCoords);
      window.addEventListener('scroll', updateDropdownCoords, true);
      return () => {
        window.removeEventListener('resize', updateDropdownCoords);
        window.removeEventListener('scroll', updateDropdownCoords, true);
      };
    }
  }, [isPatientDropdownOpen, updateDropdownCoords]);

  // Click Outside or Escape to Close Patient Dropdown
  useEffect(() => {
    if (!isPatientDropdownOpen) return;
    const handleClickOutside = (e) => {
      const inInput = patientInputContainerRef.current && patientInputContainerRef.current.contains(e.target);
      const inPortal = patientPortalRef.current && patientPortalRef.current.contains(e.target);
      if (!inInput && !inPortal) {
        setIsPatientDropdownOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside, true);
    document.addEventListener('click', handleClickOutside, true);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside, true);
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [isPatientDropdownOpen]);

  // ระบบ Sticky Header & Sticky Search/Filter Bar ซิงก์ 60FPS มาตรฐานเดียวกับทั้งระบบ
  useEffect(() => {
    const mainElement = document.getElementById('main-scroll-container') || window;
    
    const handleScroll = rAFThrottle((e) => {
      if (!headerRef.current) return;
      const target = e?.target || (mainElement === window ? document.documentElement : mainElement);
      const scrollTop = target.scrollTop ?? window.scrollY ?? 0;

      // 1. ย่อขนาด Header และเพิ่มเงาเบลอเมื่อเลื่อนเกิน 20px
      if (scrollTop > 20) {
        headerRef.current.classList.add('is-scrolled');
      } else {
        headerRef.current.classList.remove('is-scrolled');
      }

      // 2. ปรับขนาดและสถานะ Filter Bar เมื่อเลื่อนมาชนขอบล่างของ Header
      if (filterRef.current && headerRef.current) {
        const headerRect = headerRef.current.getBoundingClientRect();
        const filterRect = filterRef.current.getBoundingClientRect();
        if (filterRect.top <= headerRect.bottom + 1) {
          filterRef.current.classList.add('is-scrolled');
        } else {
          filterRef.current.classList.remove('is-scrolled');
        }
      }
    });

    const container = document.getElementById('main-scroll-container');
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });

    setTimeout(() => {
      if (headerRef.current) headerRef.current.classList.remove('is-scrolled');
      if (filterRef.current) filterRef.current.classList.remove('is-scrolled');
      if (container) container.dispatchEvent(new Event('scroll'));
    }, 60);

    return () => {
      if (container) container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Multi-branch Helpers
  const isBranchSelected = useCallback((bId) => {
    if (!form.branchScope || form.branchScope === 'all') return bId === 'all';
    if (Array.isArray(form.branchScope)) return form.branchScope.includes(bId);
    return form.branchScope.split(',').map(s => s.trim()).includes(bId);
  }, [form.branchScope]);

  const toggleBranch = useCallback((bId) => {
    if (bId === 'all') {
      setForm(prev => ({ ...prev, branchScope: 'all' }));
      return;
    }
    
    let currentList = [];
    if (!form.branchScope || form.branchScope === 'all') {
      currentList = [bId];
    } else if (Array.isArray(form.branchScope)) {
      currentList = [...form.branchScope];
    } else {
      currentList = form.branchScope.split(',').map(s => s.trim()).filter(Boolean);
    }

    if (currentList.includes(bId)) {
      currentList = currentList.filter(id => id !== bId);
    } else {
      currentList.push(bId);
    }

    const allBranchIds = (branchesData || []).map(b => b.id);
    if (currentList.length === 0 || (allBranchIds.length > 0 && currentList.length >= allBranchIds.length)) {
      setForm(prev => ({ ...prev, branchScope: 'all' }));
    } else {
      setForm(prev => ({ ...prev, branchScope: currentList }));
    }
  }, [form.branchScope, branchesData]);

  const handleOpenCalendar = () => {
    if (form.expireDate) {
      const parsed = new Date(form.expireDate);
      if (!isNaN(parsed.getTime())) {
        setCalDate(parsed);
        setSelectedCalDate(parsed);
      }
    } else {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setCalDate(d);
      setSelectedCalDate(d);
    }
    setCalView('days');
    setIsCalendarOpen(true);
  };

  // Supabase Template Library States
  const [templatesList, setTemplatesList] = useState(DEFAULT_PRESET_TEMPLATES);
  const [templateSearchTerm, setTemplateSearchTerm] = useState('');
  const [templatePage, setTemplatePage] = useState(0);
  const [hasMoreTemplates, setHasMoreTemplates] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  // --- 1. Background QR Code Generator for Fast Rendering ---
  useEffect(() => {
    let isCancelled = false;
    const generateAllQr = async () => {
      const newUrls = { ...qrCodeDataUrls };
      let updated = false;

      for (const cp of (couponsData || [])) {
        if (!cp || !cp.code) continue;
        if (!newUrls[cp.code]) {
          try {
            const dataUrl = await QRCode.toDataURL(cp.code, {
              width: 320,
              margin: 1,
              color: { dark: '#0f172a', light: '#ffffff' }
            });
            if (!isCancelled) {
              newUrls[cp.code] = dataUrl;
              updated = true;
            }
          } catch (e) {
            console.warn('[Coupon] QR gen error:', e);
          }
        }
      }

      if (updated && !isCancelled) {
        setQrCodeDataUrls(newUrls);
      }
    };

    if (couponsData && couponsData.length > 0) {
      generateAllQr();
    }

    return () => { isCancelled = true; };
  }, [couponsData]);

  // --- 2. Calculate Revenue & Discount Given from posHistoryData ---
  const couponFinancialStats = useMemo(() => {
    let discountSum = 0;
    let revenueSum = 0;

    (posHistoryData || []).forEach(tx => {
      if (!tx || tx.isDeleted || tx.is_deleted) return;
      const disc = Number(tx.couponDiscount ?? tx.coupon_discount ?? 0);
      const hasCoupon = Boolean(tx.coupon_id || tx.couponCode || tx.coupon_code || disc > 0);
      if (hasCoupon) {
        discountSum += disc;
        revenueSum += Number(tx.netAmount ?? tx.net_amount ?? tx.totalAmount ?? tx.total_amount ?? 0);
      }
    });

    return { discountSum, revenueSum };
  }, [posHistoryData]);

  // --- 3. Executive KPI Summary Cards (5 Cards) ---
  const stats = useMemo(() => {
    let total = 0;
    let active = 0;
    let used = 0;
    let expiringIn7Days = 0;
    const now = Date.now();
    const sevenDaysLater = now + (7 * 24 * 60 * 60 * 1000);

    (couponsData || []).forEach(cp => {
      if (!cp || cp.isDeleted || cp.is_deleted) return;
      total++;
      const isLifetime = Boolean(cp.isLifetime ?? cp.is_lifetime);
      const expDate = cp.expireDate || cp.expire_date;
      let isExpired = false;
      let isExpiringSoon = false;

      if (!isLifetime && expDate) {
        const expTime = new Date(expDate).setHours(23, 59, 59, 999);
        if (expTime < now) {
          isExpired = true;
        } else if (expTime <= sevenDaysLater) {
          isExpiringSoon = true;
        }
      }

      if (cp.status === 'used') {
        used++;
      } else if ((cp.status || 'active') === 'active' && !isExpired) {
        active++;
        if (isExpiringSoon) expiringIn7Days++;
      }
    });

    return {
      total,
      active,
      used,
      expiringIn7Days,
      discountGiven: couponFinancialStats.discountSum,
      revenueGenerated: couponFinancialStats.revenueSum
    };
  }, [couponsData, couponFinancialStats]);

  // --- 4. Group Coupons by Batch ---
  const batchGroups = useMemo(() => {
    const map = new Map();

    (couponsData || []).forEach(cp => {
      if (!cp || cp.isDeleted || cp.is_deleted) return;
      const bId = cp.batchId || cp.batch_id || `SINGLE_${cp.id}`;
      const bName = cp.batchName || cp.batch_name || cp.title || 'ชุดคูปองทั่วไป';

      if (!map.has(bId)) {
        map.set(bId, {
          batchId: bId,
          batchName: bName,
          title: cp.title,
          description: cp.description,
          discountType: cp.discountType || cp.discount_type || 'percent',
          discountValue: cp.discountValue ?? cp.discount_value ?? 0,
          minSpend: cp.minSpend ?? cp.min_spend ?? 0,
          themeColor: cp.themeColor || cp.theme_color || 'emerald',
          templateType: cp.templateType || cp.template_type || 'card',
          bgImage: cp.bgImage || cp.bg_image || '',
          qrConfig: cp.qrConfig || cp.qr_config || null,
          isLifetime: Boolean(cp.isLifetime ?? cp.is_lifetime),
          expireDate: cp.expireDate || cp.expire_date,
          createdAt: cp.createdAt || cp.created_at,
          coupons: [],
          total: 0,
          activeCount: 0,
          usedCount: 0,
          expiredCount: 0
        });
      }

      const grp = map.get(bId);
      grp.coupons.push(cp);
      grp.total++;

      const isLifetime = Boolean(cp.isLifetime ?? cp.is_lifetime);
      const expDate = cp.expireDate || cp.expire_date;
      let isExpired = false;
      if (!isLifetime && expDate) {
        const exp = new Date(expDate);
        exp.setHours(23, 59, 59, 999);
        if (exp.getTime() < Date.now()) isExpired = true;
      }

      const isUsed = cp.status === 'used' || Boolean(cp.isUsed || cp.is_used);
      if (isUsed) {
        grp.usedCount++;
      } else if (isExpired) {
        grp.expiredCount++;
      } else {
        grp.activeCount++;
      }
    });

    return Array.from(map.values()).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [couponsData]);

  // Filtered Batches
  const filteredBatches = useMemo(() => {
    return batchGroups.filter(b => {
      if (statusFilter === 'active' && b.activeCount === 0) return false;
      if (statusFilter === 'used' && b.usedCount === 0) return false;
      if (statusFilter === 'expired' && b.expiredCount === 0) return false;

      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        const matchTitle = (b.title || '').toLowerCase().includes(s);
        const matchName = (b.batchName || '').toLowerCase().includes(s);
        const matchCode = b.coupons.some(c => (c.code || '').toLowerCase().includes(s));
        if (!matchTitle && !matchName && !matchCode) return false;
      }

      return true;
    });
  }, [batchGroups, statusFilter, searchTerm]);

  // ข้อมูลชุดคูปองที่กำลังเปิดดูแบบ Drill-down (ซิงก์แบบ Reactive ตรงกับ batchGroups ทันทีเมื่อมีการตัดคูปองหรือคืนสิทธิ์)
  const currentDrillDownBatch = useMemo(() => {
    if (!activeDrillDownBatch) return null;
    const targetId = activeDrillDownBatch.batchId || activeDrillDownBatch.id;
    return batchGroups.find(b => b.batchId === targetId) || activeDrillDownBatch;
  }, [activeDrillDownBatch, batchGroups]);

  // Filtered Individual Coupons
  const filteredIndividualCoupons = useMemo(() => {
    return (couponsData || []).filter(cp => {
      if (!cp || cp.isDeleted || cp.is_deleted) return false;

      const isLifetime = Boolean(cp.isLifetime ?? cp.is_lifetime);
      const expDate = cp.expireDate || cp.expire_date;
      let effectiveStatus = cp.status || 'active';
      if (effectiveStatus === 'active' && !isLifetime && expDate) {
        const exp = new Date(expDate);
        exp.setHours(23, 59, 59, 999);
        if (exp.getTime() < Date.now()) effectiveStatus = 'expired';
      }

      if (statusFilter !== 'all' && effectiveStatus !== statusFilter) return false;

      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        const code = String(cp.code || '').toLowerCase();
        const title = String(cp.title || '').toLowerCase();
        const pid = String(cp.patientId || cp.patient_id || '').toLowerCase();
        const pname = String(cp.patientName || cp.patient_name || '').toLowerCase();
        if (!code.includes(s) && !title.includes(s) && !pid.includes(s) && !pname.includes(s)) {
          return false;
        }
      }

      return true;
    });
  }, [couponsData, statusFilter, searchTerm]);

  // Filtered Patients for Create Form
  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return (patientsData || []).slice(0, 8);
    const s = patientSearch.toLowerCase();
    return (patientsData || []).filter(p => {
      const hn = String(p.id || p.hn || '').toLowerCase();
      const name = String(p.name || `${p.firstName || ''} ${p.lastName || ''}`).toLowerCase();
      return hn.includes(s) || name.includes(s);
    }).slice(0, 8);
  }, [patientsData, patientSearch]);

  // Fetch Templates from Supabase (Limit 10 + Load More)
  const fetchTemplates = useCallback(async (pageToLoad = 0, append = false) => {
    setIsLoadingTemplates(true);
    try {
      if (!supabase) {
        setTemplatesList(DEFAULT_PRESET_TEMPLATES);
        setHasMoreTemplates(false);
        return;
      }

      const PAGE_SIZE = 10;
      let query = supabase
        .from('coupon_templates')
        .select('*')
        .or('is_deleted.is.null,is_deleted.eq.false')
        .order('created_at', { ascending: false })
        .range(pageToLoad * PAGE_SIZE, (pageToLoad + 1) * PAGE_SIZE - 1);

      if (templateSearchTerm.trim()) {
        query = query.ilike('name', `%${templateSearchTerm.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const loadedList = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        details: typeof row.details === 'string' ? JSON.parse(row.details) : (row.details || {})
      }));

      // Merge with default presets on first page if search is empty
      let combined = loadedList;
      if (pageToLoad === 0 && !templateSearchTerm.trim()) {
        const defaultIds = new Set(loadedList.map(t => t.id));
        const filteredPresets = DEFAULT_PRESET_TEMPLATES.filter(p => !defaultIds.has(p.id));
        combined = [...filteredPresets, ...loadedList];
      }

      setTemplatesList(prev => append ? [...prev, ...loadedList] : combined);
      setHasMoreTemplates((data || []).length === PAGE_SIZE);
      setTemplatePage(pageToLoad);
    } catch (err) {
      console.warn('[Coupon] Fetch templates error:', err);
      if (pageToLoad === 0) setTemplatesList(DEFAULT_PRESET_TEMPLATES);
    } finally {
      setIsLoadingTemplates(false);
    }
  }, [templateSearchTerm]);

  useEffect(() => {
    if (isTemplateModalOpen) {
      fetchTemplates(0, false);
    }
  }, [isTemplateModalOpen, fetchTemplates]);

  // Save Current Form as New Template into Supabase
  const handleSaveAsTemplate = async () => {
    const tplName = window.prompt('กรุณาตั้งชื่อแม่แบบพรีเซ็ตใหม่นี้:', form.title || 'แม่แบบคูปองคลินิก');
    if (!tplName || !tplName.trim()) return;

    try {
      const templatePayload = {
        id: `TPL_${Date.now()}`,
        name: tplName.trim(),
        details: {
          title: form.title,
          description: form.description,
          discountType: form.discountType,
          discountValue: form.discountValue,
          minSpend: form.minSpend,
          isLifetime: form.isLifetime,
          templateType: form.templateType,
          themeColor: form.themeColor,
          customImageUrl: form.customImageUrl,
          qrConfig: form.qrConfig,
          expiryConfig: form.expiryConfig
        },
        created_at: new Date().toISOString()
      };

      if (supabase) {
        const { error } = await supabase.from('coupon_templates').insert([templatePayload]);
        if (error) throw error;
      }

      showToast(`บันทึกแม่แบบ "${tplName}" เรียบร้อยแล้ว`, 'success');
      setTemplatesList(prev => [templatePayload, ...prev]);
    } catch (err) {
      console.error('[Coupon] Save template error:', err);
      showToast('เกิดข้อผิดพลาดในการบันทึกแม่แบบ', 'error');
    }
  };

  // Upload Custom Artwork (Photoshop/Canva): Instant local preview + deferred Google Drive upload
  const handleCustomArtworkUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, WEBP)', 'warning');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('ขนาดไฟล์ต้องไม่เกิน 10MB', 'warning');
      return;
    }

    // Instant local preview (0ms lag, deferred Google Drive upload)
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result;
      if (!dataUrl) {
        showToast('ไม่สามารถอ่านไฟล์ได้', 'error');
        return;
      }
      pendingArtworkFileRef.current = file;
      setForm(prev => ({
        ...prev,
        templateType: 'custom_image',
        userUploadedImage: dataUrl,
        customImageUrl: dataUrl,
        designConfig: prev.designConfig ? { ...prev.designConfig, bgType: 'image' } : null
      }));
      setIsQrEditorOpen(true);
      showToast('โหลดรูปภาพสำเร็จ! เปิดเครื่องมือจัดตำแหน่ง QR และวันหมดอายุ', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Handle Create Batch of Coupons
  const handleCreateCoupons = async (e) => {
    e.preventDefault();
    if (isActionLockedRef.current) return;
    isActionLockedRef.current = true;
    setTimeout(() => { isActionLockedRef.current = false; }, 1000);

    if (Number(form.discountValue) <= 0) {
      showToast('กรุณาระบุมูลค่าส่วนลดให้ถูกต้อง', 'warning');
      return;
    }

    const count = Math.max(1, Math.min(100, Number(form.quantity) || 1));
    const nowIso = new Date().toISOString();
    const batchId = `BATCH-${Date.now()}`;
    const batchName = form.title || 'ชุดคูปองส่วนลด';
    const effectiveBranchScope = Array.isArray(form.branchScope)
      ? (form.branchScope.includes('all') || form.branchScope.length === 0 ? 'all' : form.branchScope.join(','))
      : (form.branchScope || 'all');

    // Close modal immediately so UI never looks frozen
    setIsCreateModalOpen(false);
    setIsPatientDropdownOpen(false);

    // Initial progress popup state
    setCreateProgress({
      current: 0,
      total: count,
      percent: 0,
      title: batchName,
      status: 'starting',
      message: 'กำลังเตรียมข้อมูลและจัดสร้างชุดคูปอง...'
    });

    // Deferred artwork upload to Google Drive if a local file is pending
    let finalImageUrl = form.customImageUrl;
    if (form.templateType === 'custom_image' && pendingArtworkFileRef.current) {
      try {
        setCreateProgress(prev => ({
          ...(prev || {}),
          status: 'uploading',
          message: 'กำลังอัปโหลดรูปภาพแม่แบบคูปองไปยังคลาวด์...'
        }));
        setIsUploadingArtwork(true);
        const file = pendingArtworkFileRef.current;
        const base64Data = await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result?.split(',')[1]);
          r.onerror = reject;
          r.readAsDataURL(file);
        });

        if (typeof callAppScript === 'function' && base64Data) {
          const sanitized = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
          const fileName = `COUPON_ART_${Date.now()}_${sanitized}`;
          const folderId = gdriveTokens?.generalDriveFolderId || undefined;

          const res = await callAppScript('UPLOAD_FILE', 'Settings', {
            fileName,
            mimeType: file.type,
            data: base64Data,
            folderId
          });

          if (res?.status === 'success' && res.fileUrl) {
            finalImageUrl = formatDirectImageUrl(res.fileUrl);
            setForm(prev => ({ ...prev, customImageUrl: finalImageUrl }));
          }
        }
        pendingArtworkFileRef.current = null;
      } catch (uploadErr) {
        console.warn('[Coupon] Deferred artwork upload failed, falling back to data URL:', uploadErr);
      } finally {
        setIsUploadingArtwork(false);
      }
    }

    const newCoupons = [];
    for (let i = 0; i < count; i++) {
      const prefix = form.patientId ? 'VIP' : 'CP';
      const code = generateCouponCode(prefix, form.patientId);

      const couponObj = {
        id: `CP_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
        code: code,
        title: form.title,
        description: form.description || 'ใช้เป็นส่วนลดค่าบริการ/สินค้าที่อันผิงคลินิก',
        discountType: form.discountType,
        discount_type: form.discountType,
        discountValue: Number(form.discountValue),
        discount_value: Number(form.discountValue),
        minSpend: Number(form.minSpend) || 0,
        min_spend: Number(form.minSpend) || 0,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
        max_discount: form.maxDiscount ? Number(form.maxDiscount) : null,
        patientId: form.patientId || null,
        patient_id: form.patientId || null,
        patientName: form.patientName || null,
        patient_name: form.patientName || null,
        branchId: effectiveBranchScope,
        branch_id: effectiveBranchScope,
        branchScope: effectiveBranchScope,
        branch_scope: effectiveBranchScope,
        bgImage: finalImageUrl || null,
        bg_image: finalImageUrl || null,
        templateType: form.templateType,
        template_type: form.templateType,
        themeColor: form.themeColor,
        theme_color: form.themeColor,
        qrConfig: form.qrConfig,
        qr_config: form.qrConfig,
        expiryConfig: form.expiryConfig,
        expiry_config: form.expiryConfig,
        isLifetime: Boolean(form.isLifetime),
        is_lifetime: Boolean(form.isLifetime),
        expireDate: form.isLifetime ? null : form.expireDate,
        expire_date: form.isLifetime ? null : form.expireDate,
        status: 'active',
        source: form.patientId ? 'vip_manual' : 'manual',
        batchId: batchId,
        batch_id: batchId,
        batchName: batchName,
        batch_name: batchName,
        batchTotal: count,
        batch_total: count,
        createdAt: nowIso,
        created_at: nowIso
      };

      newCoupons.push(couponObj);
    }

    try {
      for (let i = 0; i < newCoupons.length; i++) {
        const cp = newCoupons[i];
        const currentNum = i + 1;
        const percent = Math.round((currentNum / count) * 100);

        setCreateProgress(prev => ({
          ...(prev || {}),
          status: 'saving',
          current: currentNum,
          total: count,
          percent: percent,
          message: `กำลังผลิตและบันทึกคูปองใบที่ ${currentNum} จาก ${count} ใบ (${cp.code})`
        }));

        if (typeof callAppScript === 'function') {
          await callAppScript('SAVE_DATA', 'Coupons', cp);
        } else {
          // In development or when offline, small delay to provide smooth progress feedback
          await new Promise(r => setTimeout(r, 60));
        }
      }

      setCreateProgress(prev => ({
        ...(prev || {}),
        status: 'completed',
        current: count,
        percent: 100,
        message: `สร้างชุดคูปอง "${batchName}" เสร็จสมบูรณ์แล้ว!`
      }));

      setCouponsData(prev => [...newCoupons, ...prev]);

      // Brief delay to showcase 100% completion checkmark
      await new Promise(r => setTimeout(r, 700));

      setCreateProgress(null);
      showToast(`สร้างชุดคูปอง "${batchName}" จำนวน ${count} ใบ เรียบร้อยแล้ว`, 'success');

      // Reset Form
      pendingArtworkFileRef.current = null;
      setForm({
        title: '',
        description: '',
        discountType: 'percent',
        discountValue: 10,
        minSpend: 0,
        maxDiscount: '',
        patientId: '',
        patientName: '',
        isLifetime: false,
        expireDate: '',
        templateType: 'card',
        themeColor: 'emerald',
        customImageUrl: '',
        branchScope: 'all',
        qrConfig: {
          codeType: 'qr',
          xPercent: 78,
          yPercent: 32,
          sizePercent: 26,
          whiteBg: true,
          showCode: true,
          codeColor: '#0f172a',
          codeBgStyle: 'none'
        },
        expiryConfig: {
          enabled: true,
          xPercent: 25,
          yPercent: 82,
          sizePercent: 18,
          color: '#0f172a',
          bgStyle: 'none',
          format: 'eng',
          prefix: 'EXP: ',
          fontFamily: 'Inter',
          fontWeight: 'light'
        },
        quantity: 10
      });
      setPatientSearch('');
    } catch (err) {
      console.error('[Coupon] Create batch error:', err);
      setCreateProgress(null);
      setIsCreateModalOpen(true);
      showToast('เกิดข้อผิดพลาดในการสร้างคูปอง: ' + (err?.message || 'กรุณาลองใหม่อีกครั้ง'), 'error');
    }
  };

  // Delete Batch
  const handleDeleteBatch = (batch) => {
    showGlobalAlert({
      type: 'warning',
      title: 'ยืนยันการลบชุดคูปอง?',
      text: `คุณต้องการลบชุดคูปอง "${batch.batchName}" ทั้งหมด ${batch.coupons.length} ใบ ใช่หรือไม่?`,
      onConfirm: async () => {
        try {
          for (const cp of batch.coupons) {
            if (typeof callAppScript === 'function') {
              await callAppScript('DELETE_DATA', 'Coupons', { id: cp.id });
            }
          }
          setCouponsData(prev => prev.filter(c => (c.batchId || c.batch_id) !== batch.batchId));
          showToast(`ลบชุดคูปอง "${batch.batchName}" เรียบร้อยแล้ว`, 'success');
          if (activeDrillDownBatch && activeDrillDownBatch.batchId === batch.batchId) {
            setActiveDrillDownBatch(null);
          }
        } catch (e) {
          showToast('เกิดข้อผิดพลาดในการลบชุดคูปอง', 'error');
        }
      }
    });
  };

  // Delete Single Coupon
  const handleDeleteSingleCoupon = (coupon) => {
    showGlobalAlert({
      type: 'warning',
      title: 'ยืนยันการลบคูปอง?',
      text: `คุณต้องการลบคูปองรหัส "${coupon.code}" ใช่หรือไม่?`,
      onConfirm: async () => {
        try {
          if (typeof callAppScript === 'function') {
            await callAppScript('DELETE_DATA', 'Coupons', { id: coupon.id });
          }
          setCouponsData(prev => prev.filter(c => c.id !== coupon.id));
          showToast(`ลบคูปอง ${coupon.code} เรียบร้อยแล้ว`, 'success');
        } catch (e) {
          showToast('เกิดข้อผิดพลาดในการลบคูปอง', 'error');
        }
      }
    });
  };

  // Redeem Coupon (Manual at Counter)
  const handleRedeemCoupon = async (codeToRedeem) => {
    if (isActionLockedRef.current) return;
    isActionLockedRef.current = true;
    setTimeout(() => { isActionLockedRef.current = false; }, 800);

    const cleanCode = String(codeToRedeem || manualCodeInput || '').trim().toUpperCase();
    if (!cleanCode) {
      showToast('กรุณาระบุรหัสคูปอง', 'warning');
      return;
    }

    const target = (couponsData || []).find(c => String(c.code || '').trim().toUpperCase() === cleanCode);
    if (!target) {
      showToast(`ไม่พบคูปองรหัส "${cleanCode}" ในระบบ`, 'warning');
      return;
    }

    if (target.status === 'used') {
      showToast(`คูปองรหัส "${cleanCode}" ถูกใช้งานไปแล้วเมื่อ ${formatDate(target.usedAt || target.used_at)}`, 'warning');
      setScannedResultCoupon(target);
      return;
    }

    const isLifetime = target.isLifetime ?? target.is_lifetime;
    const expDate = target.expireDate || target.expire_date;
    if (!isLifetime && expDate) {
      const exp = new Date(expDate);
      exp.setHours(23, 59, 59, 999);
      if (exp.getTime() < Date.now()) {
        showToast(`คูปองรหัส "${cleanCode}" หมดอายุไปแล้ว`, 'warning');
        setScannedResultCoupon(target);
        return;
      }
    }

    showGlobalAlert({
      type: 'info',
      title: 'ยืนยันการตัดคูปอง?',
      text: `ต้องการตัดคูปองรหัส "${target.code}" (${target.title}) ใช่หรือไม่?`,
      onConfirm: async () => {
        try {
          const updated = {
            ...target,
            status: 'used',
            isUsed: true,
            is_used: true,
            usedAt: new Date().toISOString(),
            used_at: new Date().toISOString(),
            usedInBranch: currentBranch,
            used_in_branch: currentBranch,
            usedByStaff: currentUser?.name || 'Staff'
          };

          // Optimistic UI update: อัปเดต State ทันทีทั้ง couponsData และ activeDrillDownBatch (จับคู่ทั้ง id และ code)
          setCouponsData(prev => (prev || []).map(c => {
            const matchId = target.id && c.id && String(c.id) === String(target.id);
            const matchCode = target.code && c.code && String(c.code).trim().toUpperCase() === String(target.code).trim().toUpperCase();
            return (matchId || matchCode) ? updated : c;
          }));

          setActiveDrillDownBatch(prev => {
            if (!prev) return null;
            return {
              ...prev,
              coupons: (prev.coupons || []).map(c => {
                const matchId = target.id && c.id && String(c.id) === String(target.id);
                const matchCode = target.code && c.code && String(c.code).trim().toUpperCase() === String(target.code).trim().toUpperCase();
                return (matchId || matchCode) ? updated : c;
              })
            };
          });

          setScannedResultCoupon(updated);
          setManualCodeInput('');
          showToast(`ตัดคูปอง ${target.code} เรียบร้อยแล้ว`, 'success');

          if (typeof callAppScript === 'function') {
            await callAppScript('SAVE_DATA', 'Coupons', updated);
          }
        } catch (err) {
          showToast('เกิดข้อผิดพลาดในการตัดคูปอง', 'error');
        }
      }
    });
  };

  // Undo Redeem Coupon (คืนสิทธิ์คูปอง)
  const handleUndoRedeemCoupon = async (coupon) => {
    if (isActionLockedRef.current) return;
    isActionLockedRef.current = true;
    setTimeout(() => { isActionLockedRef.current = false; }, 800);

    showGlobalAlert({
      type: 'warning',
      title: 'ยกเลิกการใช้คูปอง (คืนสิทธิ์)?',
      text: `ต้องการยกเลิกการใช้คูปอง "${coupon.code}" และคืนสิทธิ์ให้กลับมาใช้งานได้อีกครั้ง ใช่หรือไม่?`,
      onConfirm: async () => {
        try {
          const updated = {
            ...coupon,
            status: 'active',
            isUsed: false,
            is_used: false,
            usedAt: null,
            used_at: null,
            usedInBranch: null,
            used_in_branch: null,
            usedByStaff: null
          };

          // Optimistic UI update: อัปเดต State ทันทีทั้ง couponsData และ activeDrillDownBatch (จับคู่ทั้ง id และ code)
          setCouponsData(prev => (prev || []).map(c => {
            const matchId = coupon.id && c.id && String(c.id) === String(coupon.id);
            const matchCode = coupon.code && c.code && String(c.code).trim().toUpperCase() === String(coupon.code).trim().toUpperCase();
            return (matchId || matchCode) ? updated : c;
          }));

          setActiveDrillDownBatch(prev => {
            if (!prev) return null;
            return {
              ...prev,
              coupons: (prev.coupons || []).map(c => {
                const matchId = coupon.id && c.id && String(c.id) === String(coupon.id);
                const matchCode = coupon.code && c.code && String(c.code).trim().toUpperCase() === String(coupon.code).trim().toUpperCase();
                return (matchId || matchCode) ? updated : c;
              })
            };
          });

          showToast(`คืนสิทธิ์คูปอง ${coupon.code} สำเร็จ`, 'success');
          if (scannedResultCoupon?.id === coupon.id || scannedResultCoupon?.code === coupon.code) {
            setScannedResultCoupon(updated);
          }

          if (typeof callAppScript === 'function') {
            await callAppScript('SAVE_DATA', 'Coupons', updated);
          }
        } catch (err) {
          showToast('เกิดข้อผิดพลาดในการคืนสิทธิ์คูปอง', 'error');
        }
      }
    });
  };

  // Camera QR Scanner with Torch & Flip
  const startCamera = async () => {
    try {
      setScannerActive(true);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('อุปกรณ์ไม่รองรับการเปิดกล้อง', 'warning');
        setScannerActive(false);
        return;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play().catch(() => {});
      }
      const track = stream.getVideoTracks()[0];
      const cap = track?.getCapabilities ? track.getCapabilities() : {};
      setHasTorch(Boolean(cap.torch));

      const tick = () => {
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
              stopCamera();
              handleRedeemCoupon(code.data);
              return;
            }
          }
        }
        scanLoopRef.current = requestAnimationFrame(tick);
      };
      scanLoopRef.current = requestAnimationFrame(tick);
    } catch (err) {
      console.warn('[Coupon] Camera error:', err);
      showToast('ไม่สามารถเปิดกล้องได้ กรุณาพิมพ์รหัสคูปองแทน', 'warning');
      setScannerActive(false);
    }
  };

  const stopCamera = () => {
    if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    setTorchOn(false);
    setScannerActive(false);
  };

  const toggleTorch = async () => {
    if (!mediaStreamRef.current) return;
    const track = mediaStreamRef.current.getVideoTracks()[0];
    if (track && track.applyConstraints) {
      try {
        await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
        setTorchOn(!torchOn);
      } catch (e) {
        console.warn('Torch failed', e);
      }
    }
  };

  useEffect(() => {
    if (!isScanModalOpen) {
      stopCamera();
      setScannedResultCoupon(null);
    }
  }, [isScanModalOpen]);

  // Phone number resolver for coupon printing
  const getCouponPhone = useCallback((coupon) => {
    if (coupon && coupon.branchId && coupon.branchId !== 'all') {
      const b = (branchesData || []).find(br => String(br.id) === String(coupon.branchId) || String(br.name) === String(coupon.branchId));
      if (b && (b.phone || b.tel || b.telephone)) return b.phone || b.tel || b.telephone;
    }
    const currentBranchObj = (branchesData || []).find(b => String(b.id) === String(currentBranch) || String(b.name) === String(currentBranch)) || branchesData?.[0];
    return currentBranchObj?.phone || currentBranchObj?.tel || currentBranchObj?.telephone || '02-123-4567';
  }, [branchesData, currentBranch]);

  // Formatter for print expiry date
  const formatPrintExpDate = (coupon) => {
    if (coupon.isLifetime ?? coupon.is_lifetime) return 'ตลอดชีพ (ไม่มีวันหมดอายุ)';
    const d = coupon.expireDate || coupon.expire_date;
    if (!d) return 'ไม่ระบุ';
    return formatDate(d);
  };

  // 🌟 Helper สร้างรายการเงื่อนไขคูปองแบบไดนามิก (ยอดขั้นต่ำ, สิทธิ์คนไข้, สาขาที่ร่วม/ไม่ร่วมรายการ)
  const buildCouponConditionLines = useCallback((coupon = {}) => {
    const lines = [];

    // 1. เงื่อนไขยอดใช้จ่ายขั้นต่ำ (เปลี่ยนสัญลักษณ์ ฿ เป็นคำว่า "บาท")
    const minSpend = Number(coupon.minSpend ?? coupon.min_spend ?? 0);
    if (minSpend > 0) {
      lines.push(`* เงื่อนไข: มียอดใช้จ่ายตั้งแต่ ${minSpend.toLocaleString()} บาทขึ้นไป`);
    } else {
      lines.push('* เงื่อนไข: สามารถใช้ได้กับทุกบริการและการรักษาทางการแพทย์');
    }

    // 2. เงื่อนไขระบุสิทธิ์เฉพาะบุคคล (ถ้ามีเลือกผู้ใช้คูปอง)
    const patientName = (coupon.patientName || coupon.patient_name || '').trim();
    if (patientName) {
      lines.push(`* สิทธิพิเศษเฉพาะคุณ ${patientName} เท่านั้น`);
      lines.push('(ไม่สามารถโอนสิทธิ์ให้ผู้อื่นได้)');
    }

    // 3. เงื่อนไขสาขาที่ร่วม / ไม่ร่วมรายการ
    const rawBranchScope = coupon.branchScope ?? coupon.branch_scope ?? coupon.branchId ?? coupon.branch_id;
    const allBranches = Array.isArray(branchesData) ? branchesData : [];

    if (rawBranchScope && rawBranchScope !== 'all' && allBranches.length > 1) {
      let selectedIds = [];
      if (Array.isArray(rawBranchScope)) {
        selectedIds = rawBranchScope.map(String);
      } else if (typeof rawBranchScope === 'string') {
        selectedIds = rawBranchScope.split(',').map(s => s.trim()).filter(Boolean);
      }

      if (!selectedIds.includes('all') && selectedIds.length > 0) {
        const selectedBranches = allBranches.filter(b => 
          selectedIds.includes(String(b.id)) || selectedIds.includes(String(b.name))
        );
        const unselectedBranches = allBranches.filter(b => 
          !selectedIds.includes(String(b.id)) && !selectedIds.includes(String(b.name))
        );

        if (selectedBranches.length > 0 && selectedBranches.length < allBranches.length) {
          if (selectedBranches.length <= unselectedBranches.length) {
            // สาขาที่ร่วมรายการน้อยกว่า -> แสดงชื่อสาขาที่ร่วมรายการ
            const names = selectedBranches.map(b => b.name || b.branchName || b.id).join(', ');
            lines.push(`* เฉพาะสาขาที่ร่วมรายการ: ${names}`);
          } else {
            // สาขาที่ไม่ร่วมรายการน้อยกว่า -> แสดงชื่อสาขาที่ไม่ร่วมรายการ
            const names = unselectedBranches.map(b => b.name || b.branchName || b.id).join(', ');
            lines.push(`* สาขาที่ไม่ร่วมรายการ: ${names}`);
          }
        }
      }
    }

    return lines;
  }, [branchesData]);

  // --- 5. Generate 300 DPI Canvas for Single Coupon (Download & Copy to Clipboard) ---
  const generateCouponCanvas = async (coupon) => {
    const isStrip = (coupon.templateType || coupon.template_type) === 'strip';
    const themeKey = coupon.themeColor || coupon.theme_color || 'emerald';
    const theme = PRINT_THEMES[themeKey] || PRINT_THEMES.emerald;
    const customImg = coupon.bgImage || coupon.bg_image || coupon.customImageUrl;
    const isCustomImage = Boolean(customImg) && (coupon.templateType === 'custom_image' || coupon.template_type === 'custom_image');

    const canvas = document.createElement('canvas');
    let width = isStrip ? 2362 : 1011;
    let height = 638;
    let bgImgElement = null;

    if (isCustomImage && customImg) {
      // 1. Preload Custom Background Artwork to get exact natural aspect ratio
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
          img.src = customImg;
        });

        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          bgImgElement = img;
          const natW = img.naturalWidth;
          const natH = img.naturalHeight;

          // Scale canvas to high resolution (target min 1400px, max 2400px for crisp 300 DPI export)
          let targetW = natW;
          let targetH = natH;
          const minDim = 1400;
          const maxDim = 2400;
          if (targetW < minDim && targetH < minDim) {
            const scale = minDim / Math.min(targetW, targetH);
            targetW = Math.round(targetW * scale);
            targetH = Math.round(targetH * scale);
          } else if (targetW > maxDim || targetH > maxDim) {
            const scale = maxDim / Math.max(targetW, targetH);
            targetW = Math.round(targetW * scale);
            targetH = Math.round(targetH * scale);
          }
          width = targetW;
          height = targetH;
        }
      } catch (e) {
        console.warn('[Coupon] Background image load warning:', e);
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (isCustomImage && customImg) {
      // Draw Custom Artwork preserving exact aspect ratio
      if (bgImgElement) {
        ctx.drawImage(bgImgElement, 0, 0, width, height);
      } else {
        ctx.fillStyle = theme.primary;
        ctx.fillRect(0, 0, width, height);
      }

      // 2. Draw Code (QR Code or Barcode) matching exact preview dimensions & center positioning
      const qrCfg = coupon.qrConfig || coupon.qr_config || { codeType: 'qr', xPercent: 78, yPercent: 32, sizePercent: 26, whiteBg: true, showCode: true, codeColor: '#0f172a', codeBgStyle: 'none' };
      const isBarcode = qrCfg.codeType === 'barcode';

      // Card geometry:
      const cardWidth = Math.round((qrCfg.sizePercent / 100) * width);
      const centerX = Math.round((qrCfg.xPercent / 100) * width);
      const centerY = Math.round((qrCfg.yPercent / 100) * height);
      const pad = qrCfg.whiteBg ? Math.round(cardWidth * 0.035) : 0;
      const innerWidth = Math.max(10, cardWidth - (2 * pad));
      const innerHeight = isBarcode ? Math.round(innerWidth * 0.40) : innerWidth;
      const customCodeFontSize = qrCfg.codeFontSize ?? 10;
      const customCodeDistance = qrCfg.codeDistance ?? 3.5;
      const fontHeight = qrCfg.showCode ? Math.max(10, Math.round(cardWidth * (customCodeFontSize * 0.009))) : 0;
      const gap = qrCfg.showCode ? Math.max(0, Math.round(cardWidth * (customCodeDistance / 100))) : 0;
      const pillExtra = (qrCfg.showCode && qrCfg.codeBgStyle !== 'none') ? Math.round(fontHeight * 0.45) : 0;
      const textBlockHeight = qrCfg.showCode ? (gap + fontHeight + pillExtra) : 0;
      const cardHeight = (2 * pad) + innerHeight + textBlockHeight;
      const cardRadius = Math.max(6, Math.round(cardWidth * 0.05));
      const cardX = centerX - Math.round(cardWidth / 2);
      const cardY = centerY - Math.round(cardHeight / 2);
      const codeX = cardX + pad;
      const codeY = cardY + pad;

      // Draw white card background if enabled
      if (qrCfg.whiteBg) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
        ctx.shadowBlur = Math.max(8, Math.round(cardWidth * 0.04));
        ctx.shadowOffsetY = Math.max(2, Math.round(cardWidth * 0.015));
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardWidth, cardHeight, cardRadius);
        ctx.fill();
        ctx.restore();
      }

      if (isBarcode) {
        // Draw 1D Barcode
        try {
          const bCanvas = document.createElement('canvas');
          JsBarcode(bCanvas, coupon.code, {
            format: 'CODE128',
            width: 3.2,
            height: 90,
            displayValue: false,
            background: 'transparent',
            lineColor: '#0f172a',
            margin: 0
          });
          const bImg = new Image();
          await new Promise(resolve => { bImg.onload = resolve; bImg.onerror = resolve; bImg.src = bCanvas.toDataURL(); });
          ctx.drawImage(bImg, codeX, codeY, innerWidth, innerHeight);
        } catch (bErr) {
          console.warn('[Coupon] Barcode draw error:', bErr);
        }
      } else {
        // Draw 2D QR Code
        try {
          const qrLightColor = qrCfg.whiteBg ? '#ffffff' : '#00000000';
          const qrUrl = await QRCode.toDataURL(coupon.code, {
            width: 600,
            margin: 1,
            color: { dark: '#0f172a', light: qrLightColor }
          });
          if (qrUrl) {
            const qrImg = new Image();
            await new Promise(resolve => { qrImg.onload = resolve; qrImg.onerror = resolve; qrImg.src = qrUrl; });
            ctx.drawImage(qrImg, codeX, codeY, innerWidth, innerHeight);
          }
        } catch (qrErr) {
          console.warn('[Coupon] QR draw error:', qrErr);
        }
      }

      // Draw Code text under QR/Barcode
      if (qrCfg.showCode) {
        const codeColor = qrCfg.codeColor || (qrCfg.whiteBg ? '#0f172a' : '#ffffff');
        const codeBgStyle = qrCfg.codeBgStyle || 'none';
        const textX = centerX;
        const textY = codeY + innerHeight + gap + Math.round(fontHeight * 0.5) + (codeBgStyle !== 'none' ? Math.round(fontHeight * 0.15) : 0);

        ctx.font = `600 ${fontHeight}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (codeBgStyle === 'white_pill' || codeBgStyle === 'dark_pill') {
          const tm = ctx.measureText(coupon.code);
          const pillW = tm.width + (fontHeight * 0.9);
          const pillH = fontHeight * 1.45;
          const pillR = pillH / 2;
          ctx.save();
          ctx.fillStyle = codeBgStyle === 'dark_pill' ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.95)';
          ctx.shadowColor = 'rgba(0,0,0,0.12)';
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.roundRect(textX - (pillW / 2), textY - (pillH / 2), pillW, pillH, pillR);
          ctx.fill();
          ctx.restore();
        }

        ctx.fillStyle = codeBgStyle === 'dark_pill' ? '#ffffff' : codeColor;
        ctx.fillText(coupon.code, textX, textY);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
      }

      // 3. Draw Expiry Date according to expiryConfig
      const expCfg = coupon.expiryConfig || coupon.expiry_config || {
        enabled: true, xPercent: 25, yPercent: 82, sizePercent: 18, color: '#0f172a', bgStyle: 'none', format: 'eng', prefix: 'EXP: ', fontFamily: 'Inter', fontWeight: 'light'
      };
      if (expCfg.enabled !== false) {
        const expText = formatCustomExpiryDate(
          coupon.expireDate || coupon.expire_date,
          expCfg.format,
          coupon.isLifetime ?? coupon.is_lifetime,
          expCfg.prefix
        );
        // Expiry font size scales proportionally with canvas width: 0.2% per sizePercent unit
        const expFontSize = Math.max(12, Math.round((expCfg.sizePercent || 18) * 0.002 * width));
        const fontWeight = expCfg.fontWeight === 'normal' ? '400' : '300';
        ctx.font = `${fontWeight} ${expFontSize}px ${getExpiryFontFamily(expCfg.fontFamily)}`;
        const expX = Math.round((expCfg.xPercent / 100) * width);
        const expY = Math.round((expCfg.yPercent / 100) * height);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (expCfg.bgStyle === 'white_pill' || expCfg.bgStyle === 'dark_pill') {
          const textMetrics = ctx.measureText(expText);
          const pillW = textMetrics.width + (expFontSize * 1.2);
          const pillH = expFontSize * 1.6;
          const pillR = pillH / 2;
          ctx.save();
          ctx.fillStyle = expCfg.bgStyle === 'dark_pill' ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.96)';
          ctx.shadowColor = 'rgba(0,0,0,0.15)';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.roundRect(expX - (pillW / 2), expY - (pillH / 2), pillW, pillH, pillR);
          ctx.fill();
          ctx.restore();
        }

        ctx.fillStyle = expCfg.bgStyle === 'dark_pill' ? '#ffffff' : (expCfg.color || '#0f172a');
        ctx.fillText(expText, expX, expY);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
      }
    } else {
      // 🌟 Redesigned Premium Standard Colored Templates (Card 1011x638 or Strip 2362x638)
      // Retrieve clinic branding & receipt-style header info
      const bInfo = resolveBranchInfo(branchesData, coupon.branchId || coupon.branch_id, currentBranch);
      const { clinicName, clinicAddress, clinicPhone, taxId, logoUrl } = bInfo;

      // Full Luxury Theme Canvas Gradient matching batch card aesthetic
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, theme.primaryDark);
      bgGrad.addColorStop(0.5, theme.primary);
      bgGrad.addColorStop(1, theme.primaryDark);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Metallic Sheen Light Flare Line
      const sheenGrad = ctx.createLinearGradient(0, 0, width, height);
      sheenGrad.addColorStop(0, 'rgba(255,255,255,0.3)');
      sheenGrad.addColorStop(0.45, 'rgba(255,255,255,0.02)');
      sheenGrad.addColorStop(1, 'rgba(255,255,255,0.18)');
      ctx.fillStyle = sheenGrad;
      ctx.fillRect(0, 0, width, height);


      // Right Stub Accent Section & Tear Line
      const stubWidth = isStrip ? 580 : 340;
      const stubX = width - stubWidth;
      const stubGrad = ctx.createLinearGradient(stubX, 0, width, height);
      stubGrad.addColorStop(0, theme.primaryDark);
      stubGrad.addColorStop(0.5, theme.primary);
      stubGrad.addColorStop(1, theme.primaryDark);
      ctx.fillStyle = stubGrad;
      ctx.fillRect(stubX, 0, stubWidth, height);

      // Realistic Perforated Dividing Tear Line & Notch Cutouts
      ctx.save();
      ctx.setLineDash([10, 10]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(stubX, 0);
      ctx.lineTo(stubX, height);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Load Clinic Logo (or draw elegant branded crest)
      let logoImg = null;
      if (logoUrl) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise((res) => {
            img.onload = () => { logoImg = img; res(); };
            img.onerror = () => { logoImg = null; res(); };
            img.src = logoUrl;
            setTimeout(res, 600);
          });
        } catch (e) {
          logoImg = null;
        }
      }

      // Draw Brand Receipt-Style Header
      const logoSize = isStrip ? 76 : 56;
      const logoX = isStrip ? 60 : 42;
      const logoY = isStrip ? 42 : 32;
      const headerTextX = logoX + logoSize + (isStrip ? 22 : 16);

      if (logoImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(logoX + (logoSize / 2), logoY + (logoSize / 2), logoSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
        ctx.restore();
        ctx.beginPath();
        ctx.arc(logoX + (logoSize / 2), logoY + (logoSize / 2), logoSize / 2, 0, Math.PI * 2);
        ctx.lineWidth = 2;
        ctx.strokeStyle = theme.primary;
        ctx.stroke();
      } else {
        // Luxury Emblem Monogram
        ctx.save();
        const embGrad = ctx.createLinearGradient(logoX, logoY, logoX + logoSize, logoY + logoSize);
        embGrad.addColorStop(0, theme.primaryDark);
        embGrad.addColorStop(1, theme.primary);
        ctx.fillStyle = embGrad;
        ctx.beginPath();
        ctx.arc(logoX + (logoSize / 2), logoY + (logoSize / 2), logoSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fde047';
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = `900 ${Math.round(logoSize * 0.42)}px "Kanit", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('AP', logoX + (logoSize / 2), logoY + (logoSize / 2) + 2);
        ctx.restore();
      }

      // Helper for smart Thai word segmentation
      const splitThaiWords = (text) => {
        if (!text) return [];
        if (typeof Intl !== 'undefined' && Intl.Segmenter) {
          try {
            const segmenter = new Intl.Segmenter('th', { granularity: 'word' });
            return Array.from(segmenter.segment(text), s => s.segment);
          } catch (e) {
            // fallback
          }
        }
        return text.split(' ');
      };

      // Helper for wrapping text cleanly into multiple lines on canvas
      const wrapCanvasLines = (context, text, maxW) => {
        if (!text) return [];
        const words = splitThaiWords(text);
        const lines = [];
        let curLine = '';
        for (let i = 0; i < words.length; i++) {
          const w = words[i];
          const test = curLine ? `${curLine}${w}` : w;
          if (context.measureText(test).width <= maxW) {
            curLine = test;
          } else {
            if (curLine) lines.push(curLine);
            if (context.measureText(w).width > maxW) {
              let sub = '';
              for (const ch of w) {
                if (context.measureText(sub + ch).width <= maxW) {
                  sub += ch;
                } else {
                  lines.push(sub);
                  sub = ch;
                }
              }
              curLine = sub;
            } else {
              curLine = w;
            }
          }
        }
        if (curLine) lines.push(curLine);
        return lines;
      };

      // Clinic Info (Receipt Header Style - Full Width, No Truncation, 3-5 lines capable)
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${isStrip ? '28' : '22'}px "Kanit", sans-serif`;
      ctx.fillText(clinicName, headerTextX, logoY + (isStrip ? 4 : 2));

      // Multiline Address (No Ellipsis Truncation, fits up to 3-5 lines)
      const maxHeaderW = stubX - 35 - headerTextX;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = `${isStrip ? '16' : '13'}px "Kanit", sans-serif`;
      const addrLines = wrapCanvasLines(ctx, clinicAddress || '', maxHeaderW);
      const addrLineH = isStrip ? 22 : 17;
      const addrStartY = logoY + (isStrip ? 38 : 28);
      addrLines.slice(0, 3).forEach((line, idx) => {
        ctx.fillText(line, headerTextX, addrStartY + (idx * addrLineH));
      });

      // Contact Line (Phone)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = `${isStrip ? '15' : '12'}px "Kanit", sans-serif`;
      const contactInfo = `โทร: ${clinicPhone || '-'}`;
      const contactY = addrStartY + (Math.min(addrLines.length, 3) * addrLineH) + (isStrip ? 4 : 2);
      ctx.fillText(contactInfo, headerTextX, contactY);

      // Delicate Hairline Divider below Header
      const divY = Math.max(logoY + logoSize + (isStrip ? 16 : 14), contactY + (isStrip ? 24 : 18));
      const maxDividerW = stubX - 35;
      const divGrad = ctx.createLinearGradient(logoX, divY, maxDividerW, divY);
      divGrad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
      divGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');
      divGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
      ctx.strokeStyle = divGrad;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(logoX, divY);
      ctx.lineTo(maxDividerW, divY);
      ctx.stroke();

      // Discount Values & Condition Texts
      const isPercent = (coupon.discountType === 'percent' || coupon.discount_type === 'percent');
      const discountVal = Number(coupon.discountValue || coupon.discount_value || 0);
      const discountValStr = isPercent ? `${discountVal}%` : `฿${discountVal.toLocaleString()}`;
      const minSpend = Number(coupon.minSpend ?? coupon.min_spend ?? 0);
      const expText = formatPrintExpDate(coupon);
      const isLifetime = Boolean(coupon.isLifetime ?? coupon.is_lifetime);
      const expCleanStr = isLifetime ? 'ไม่มีวันหมดอายุ' : (expText || 'ไม่ระบุ');
      const noteText = 'กรุณาแสดงบัตรกำนัลนี้แก่เจ้าหน้าที่';

      // 🌟 HERO TITLE: Pure Responsive Font Sizing with Thai Vowel / Tone Mark Safe Zone
      const maxTitleW = stubX - 25 - logoX; // Right edge touches right near dashed line
      const rawTitle = (coupon.title || 'บัตรกำนัลส่วนลดพิเศษ').trim();
      const hasThai = /[\u0E00-\u0E7F]/.test(rawTitle);

      // Measure text width at 100px base font size
      ctx.font = '900 100px "Kanit", sans-serif';
      const w100 = ctx.measureText(rawTitle).width;

      // Calculate the font size where text naturally expands to fill maxTitleW
      let autoFontSize = Math.floor(100 * (maxTitleW / Math.max(1, w100)));

      // Allow single line title to expand near edge of dashed line (up to 150px)
      const maxAllowedSize = isStrip ? 120 : 150;
      const minSingleLineSize = isStrip ? 50 : 44;

      let titleBottomY = 0;
      let titleCenterY = isStrip ? 230 : 220;

      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;

      if (autoFontSize >= minSingleLineSize) {
        // Fits on 1 line: scale font size so it naturally fills the width almost to dashed line!
        const finalFontSize = Math.min(maxAllowedSize, autoFontSize);
        ctx.font = `900 ${finalFontSize}px "Kanit", sans-serif`;

        // If at finalFontSize text slightly exceeds maxTitleW, adjust by exact ratio
        const finalW = ctx.measureText(rawTitle).width;
        let adjustedSize = finalFontSize;
        if (finalW > maxTitleW) {
          adjustedSize = Math.floor(finalFontSize * (maxTitleW / finalW));
          ctx.font = `900 ${adjustedSize}px "Kanit", sans-serif`;
        }

        // Safe top clearance for tone marks (ไม้โท, ไม้เอก) - moved down from logo/header
        const topClearance = hasThai ? (isStrip ? 42 : 46) : (isStrip ? 32 : 36);
        titleCenterY = Math.round(divY + topClearance + (adjustedSize * 0.48));
        ctx.fillText(rawTitle, logoX, titleCenterY);

        // titleBottomY dynamically pushes down based on the actual height of the huge title + lower vowels (สระอู)
        titleBottomY = titleCenterY + (adjustedSize * (hasThai ? 0.52 : 0.44));
      } else {
        // Longer text: intelligently split into 2 balanced lines
        const words = splitThaiWords(rawTitle);
        let bestIdx = 1;
        let bestDiff = Infinity;
        for (let i = 1; i < words.length; i++) {
          const p1 = words.slice(0, i).join('');
          const p2 = words.slice(i).join('');
          const diff = Math.abs(p1.length - p2.length);
          if (diff < bestDiff) {
            bestDiff = diff;
            bestIdx = i;
          }
        }
        const line1 = words.slice(0, bestIdx).join('');
        const line2 = words.slice(bestIdx).join('');

        ctx.font = '900 100px "Kanit", sans-serif';
        const w1 = ctx.measureText(line1).width;
        const w2 = ctx.measureText(line2).width;
        const maxLineW = Math.max(w1, w2);
        let multiSize = Math.floor(100 * (maxTitleW / Math.max(1, maxLineW)));
        multiSize = Math.max(isStrip ? 34 : 26, Math.min(isStrip ? 74 : 66, multiSize));

        ctx.font = `900 ${multiSize}px "Kanit", sans-serif`;
        // Generous line spacing for Thai tone marks on line 2 and lower vowels on line 1
        const lineSpacing = multiSize * (hasThai ? 1.35 : 1.18);
        titleCenterY = Math.round(divY + (hasThai ? 46 : 38) + lineSpacing);
        ctx.fillText(line1, logoX, titleCenterY - (lineSpacing * 0.48));
        ctx.fillText(line2, logoX, titleCenterY + (lineSpacing * 0.48));
        titleBottomY = titleCenterY + (lineSpacing * (hasThai ? 1.12 : 1.0));
      }
      ctx.restore();

      // Condition lines directly under Hero Title (pushed down dynamically)
      const termsLines = buildCouponConditionLines(coupon);
      const numTerms = termsLines.length;

      // Spacing and font sizing based on number of condition lines
      const firstTermsOffset = isStrip 
        ? (numTerms > 2 ? 24 : (numTerms > 1 ? 28 : 34)) 
        : (numTerms > 3 ? 18 : (numTerms > 2 ? 22 : (numTerms > 1 ? 26 : 32)));
      const termsLineH = isStrip 
        ? (numTerms > 2 ? 24 : 30) 
        : (numTerms > 3 ? 22 : (numTerms > 2 ? 25 : 29));
      let baseTermsFontSize = isStrip 
        ? (numTerms === 1 ? 26 : (numTerms === 2 ? 22 : (numTerms === 3 ? 19 : 17)))
        : (numTerms === 1 ? 24 : (numTerms === 2 ? 21 : (numTerms === 3 ? 18 : 16)));

      ctx.save();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      const maxTermsW = stubX - 25 - logoX;
      let lastTermsY = titleBottomY + firstTermsOffset;

      termsLines.forEach((tLine, idx) => {
        const curY = titleBottomY + firstTermsOffset + (idx * termsLineH);
        lastTermsY = curY;

        let curFontSize = baseTermsFontSize;
        ctx.font = `600 ${curFontSize}px "Kanit", sans-serif`;
        while (ctx.measureText(tLine).width > maxTermsW && curFontSize > 13) {
          curFontSize -= 0.5;
          ctx.font = `600 ${curFontSize}px "Kanit", sans-serif`;
        }

        // ข้อความต่อท้ายแบบวงเล็บ เช่น (ไม่สามารถโอนสิทธิ์ให้ผู้อื่นได้) ให้ขยับเว้นวรรคเข้าด้านในให้ตรงกับเนื้อความหลังดอกจัน
        const isSubClause = tLine.trim().startsWith('(');
        const drawX = isSubClause ? logoX + 16 : logoX;
        ctx.fillStyle = isSubClause ? 'rgba(255, 255, 255, 0.88)' : 'rgba(255, 255, 255, 0.95)';

        ctx.fillText(tLine.trim(), drawX, curY);
      });
      ctx.restore();

      const termsBottomY = lastTermsY + (termsLineH * 0.45);

      // 🌟 "ขอบคุณที่ไว้วางใจให้อันผิงดูแลคุณ" - กึ่งกลางในพื้นที่ที่เหลืออย่างพอดี (ดันลงตามจำนวนเงื่อนไข)
      const thanksText = 'ขอบคุณที่ไว้วางใจให้อันผิงดูแลคุณ';
      const leftCenterX = logoX + ((stubX - 22 - logoX) / 2);
      const promptY = height - (isStrip ? 92 : 82);
      const thanksY = isStrip 
        ? Math.round(termsBottomY + 44) 
        : Math.round(termsBottomY + Math.max(18, (promptY - termsBottomY) / 2));

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';

      let thanksFontSize = isStrip ? 38 : (numTerms > 3 ? 32 : (numTerms > 2 ? 35 : 42));
      ctx.font = `900 ${thanksFontSize}px "Kanit", sans-serif`;
      while (ctx.measureText(thanksText).width > (stubX - 35 - logoX) && thanksFontSize > 22) {
        thanksFontSize -= 1;
        ctx.font = `900 ${thanksFontSize}px "Kanit", sans-serif`;
      }
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
      ctx.fillText(thanksText, leftCenterX, thanksY);
      ctx.restore();

      // Bottom Section: Instructions & Clean Expiry Date (No Pill Badge)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = `${isStrip ? '18' : '14'}px "Kanit", sans-serif`;
      ctx.fillText(noteText, logoX, promptY);

      const expY = height - (isStrip ? 52 : 46);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${isStrip ? '20' : '16'}px "Kanit", sans-serif`;
      ctx.fillText(`วันหมดอายุ: ${expCleanStr}`, logoX, expY);

      // 🌟 RIGHT STUB: Discount on Top, QR in Middle, Large Phone on Bottom
      let qrUrl = qrCodeDataUrls[coupon.code];
      if (!qrUrl) {
        qrUrl = await QRCode.toDataURL(coupon.code, { width: 350, margin: 1 });
      }
      if (qrUrl) {
        const qrImg = new Image();
        await new Promise(resolve => {
          qrImg.onload = resolve;
          qrImg.onerror = resolve;
          qrImg.src = qrUrl;
        });

        const stubCenter = stubX + (stubWidth / 2);

        // 1. Discount at Top of Stub (คำว่าลดใหญ่ 78px, เลขและ % ขนาดเท่ากันชิดล่าง)
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 3;

        ctx.font = `bold ${isStrip ? '70' : '78'}px "Kanit", sans-serif`;
        ctx.fillText('ลด', stubCenter, isStrip ? 56 : 74);
        ctx.restore();

        // Discount: Number is large, and % or บาท is half-size and bottom-aligned
        const isPercent = (coupon.discountType === 'percent' || coupon.discount_type === 'percent');
        const discountVal = Number(coupon.discountValue || coupon.discount_value || 0);

        let numStr = '';
        let unitStr = '';

        if (isPercent) {
          numStr = String(discountVal);
          unitStr = '%';
        } else {
          numStr = discountVal.toLocaleString();
          unitStr = 'บาท';
        }

        let numFont = isStrip ? 104 : 136;
        if (numStr.length >= 4) {
          numFont = isStrip ? 66 : 84;
        } else if (numStr.length === 3) {
          numFont = isStrip ? 86 : 110;
        }
        // Unit is half the size of the number (เป็นครึ่งหนึ่งของตัวเลข)
        const unitFont = Math.round(numFont * 0.50);

        ctx.font = `900 ${numFont}px "Kanit", sans-serif`;
        const numW = ctx.measureText(numStr).width;
        ctx.font = `900 ${unitFont}px "Kanit", sans-serif`;
        const unitW = ctx.measureText(unitStr).width;
        const charGap = isStrip ? 4 : 6;
        const totalDiscountW = numW + unitW + charGap;
        const discountStartX = stubCenter - (totalDiscountW / 2);

        // Baseline Y coordinate: Both number and unit are baseline-aligned at the bottom (ให้อยู่ข้างล่าง)
        const discountBaseY = isStrip ? 148 : 224;

        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic'; // Bottom baseline alignment
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 4;

        // 1. Draw large number
        ctx.font = `900 ${numFont}px "Kanit", sans-serif`;
        ctx.fillText(numStr, discountStartX, discountBaseY);

        // 2. Draw unit at half size, flush with bottom baseline
        const unitX = discountStartX + numW + charGap;
        ctx.font = `900 ${unitFont}px "Kanit", sans-serif`;
        ctx.fillText(unitStr, unitX, discountBaseY);
        ctx.restore();

        // 2. White Card with QR Code in Middle of Stub (QR ขยายใหญ่เต็มพื้นที่สีขาว)
        const cardBoxW = isStrip ? 340 : 252;
        const cardBoxH = isStrip ? 232 : 266;
        const cardBoxX = stubCenter - (cardBoxW / 2);
        const cardBoxY = isStrip ? 186 : 286;

        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 5;
        ctx.beginPath();
        ctx.roundRect(cardBoxX, cardBoxY, cardBoxW, cardBoxH, 16);
        ctx.fill();
        ctx.restore();

        // QR Code fills more of the white card (212px instead of 175px)
        const qrInnerSize = isStrip ? 172 : 212;
        const qrInnerX = stubCenter - (qrInnerSize / 2);
        const qrInnerY = cardBoxY + (isStrip ? 10 : 12);
        ctx.drawImage(qrImg, qrInnerX, qrInnerY, qrInnerSize, qrInnerSize);

        // Code text under QR
        ctx.save();
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold ${isStrip ? '19' : '17'}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(coupon.code, stubCenter, qrInnerY + qrInnerSize + (isStrip ? 18 : 20));
        ctx.restore();

        // 3. Large Clinic Phone Number at Bottom of Stub (Grounded, right under QR card)
        const phoneY = height - (isStrip ? 46 : 38);
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${isStrip ? '32' : '30'}px "Kanit", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 9;
        ctx.shadowOffsetY = 2;
        ctx.fillText(`โทร.${clinicPhone || '-'}`, stubCenter, phoneY);
        ctx.restore();
      }
    }

    // Watermark if USED
    if (coupon.status === 'used') {
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate(-25 * Math.PI / 180);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.lineWidth = 10;
      ctx.strokeRect(-250, -80, 500, 160);
      ctx.fillRect(-250, -80, 500, 160);
      ctx.fillStyle = 'rgba(220, 38, 38, 0.9)';
      ctx.font = '900 70px "Kanit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('USED / ใช้แล้ว', 0, 25);
      ctx.restore();
    }

    return canvas;
  };

  // Export Single Coupon PNG
  const handleDownloadSinglePng = async (coupon) => {
    try {
      const canvas = await generateCouponCanvas(coupon);
      if (!canvas) return;
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `Coupon_${coupon.code}.png`;
      a.click();
      showToast(`ดาวน์โหลดรูปภาพคูปอง ${coupon.code} เรียบร้อยแล้ว`, 'success');
    } catch (err) {
      console.error('[Coupon] Download PNG error:', err);
      showToast('เกิดข้อผิดพลาดในการดาวน์โหลดรูปภาพ', 'error');
    }
  };

  // 1-Click "Copy Image to Clipboard" (Paste immediately into LINE/Chat)
  const handleCopyCouponImageToClipboard = async (coupon) => {
    try {
      const canvas = await generateCouponCanvas(coupon);
      if (!canvas) return;
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        if (navigator.clipboard && window.ClipboardItem) {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          showToast(`คัดลอกรูปภาพคูปอง "${coupon.code}" ลงคลิปบอร์ดแล้ว พร้อมกด Ctrl+V ส่งให้ลูกค้าใน LINE`, 'success');
        } else {
          showToast('เบราว์เซอร์ไม่รองรับการคัดลอกรูปภาพโดยตรง', 'warning');
        }
      }, 'image/png');
    } catch (err) {
      console.error('[Coupon] Copy to clipboard error:', err);
      showToast('เกิดข้อผิดพลาดในการคัดลอกรูปภาพ', 'error');
    }
  };

  // เปิด Modal ส่งออก Excel พร้อมตัวกรองเลือกชุดคูปองและวันที่สร้าง
  const handleOpenExportExcel = () => {
    const initBatches = {};
    batchGroups.forEach(b => {
      initBatches[b.batchName] = true;
    });
    setExportSelectedBatches(initBatches);
    setExportDateType('all');
    setExportStartDate('');
    setExportEndDate('');
    setExportStatusFilter('all');
    setIsExportExcelModalOpen(true);
  };

  // ดำเนินการส่งออกไฟล์ Excel (.xlsx) ตามเงื่อนไขที่เลือกใน Modal
  const handleExecuteExportExcel = () => {
    try {
      const selectedBatchesList = Object.keys(exportSelectedBatches).filter(k => exportSelectedBatches[k]);
      
      const filteredForExport = (couponsData || []).filter(cp => {
        if (!cp || cp.isDeleted || cp.is_deleted) return false;

        // 1. กรองตามชุดคูปอง (Batch)
        const batchName = cp.batchName || cp.batch_name || '-';
        if (selectedBatchesList.length > 0 && !selectedBatchesList.includes(batchName)) {
          return false;
        }

        // 2. กรองตามสถานะ (Status)
        const isLifetime = Boolean(cp.isLifetime ?? cp.is_lifetime);
        const expDate = cp.expireDate || cp.expire_date;
        let effectiveStatus = cp.status || 'active';
        if (effectiveStatus === 'active' && !isLifetime && expDate) {
          const exp = new Date(expDate);
          exp.setHours(23, 59, 59, 999);
          if (exp.getTime() < Date.now()) effectiveStatus = 'expired';
        }
        if (exportStatusFilter !== 'all' && effectiveStatus !== exportStatusFilter) {
          return false;
        }

        // 3. กรองตามวันที่สร้างคูปอง (Created Date)
        if (exportDateType !== 'all') {
          const rawDate = cp.createdAt || cp.created_at || cp.date;
          if (!rawDate) return false;
          const cpDate = new Date(rawDate);
          if (isNaN(cpDate.getTime())) return false;

          const now = new Date();
          if (exportDateType === 'today') {
            const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            if (cpDate < startToday) return false;
          } else if (exportDateType === '7days') {
            const past7 = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
            if (cpDate < past7) return false;
          } else if (exportDateType === 'this_month') {
            const startMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
            if (cpDate < startMonth) return false;
          } else if (exportDateType === 'custom') {
            if (exportStartDate) {
              const start = new Date(exportStartDate);
              start.setHours(0, 0, 0, 0);
              if (cpDate < start) return false;
            }
            if (exportEndDate) {
              const end = new Date(exportEndDate);
              end.setHours(23, 59, 59, 999);
              if (cpDate > end) return false;
            }
          }
        }

        return true;
      });

      if (filteredForExport.length === 0) {
        showToast('ไม่พบคูปองตามเงื่อนไขที่เลือกส่งออก', 'warning');
        return;
      }

      const rows = filteredForExport.map((cp, idx) => ({
        'ลำดับ': idx + 1,
        'รหัสคูปอง': cp.code,
        'ชื่อคูปอง/โปรโมชั่น': cp.title,
        'ประเภทส่วนลด': (cp.discountType === 'percent' || cp.discount_type === 'percent') ? 'เปอร์เซ็นต์ (%)' : 'จำนวนเงิน (บาท)',
        'มูลค่าส่วนลด': cp.discountValue || cp.discount_value,
        'ยอดซื้อขั้นต่ำ': cp.minSpend || cp.min_spend || 0,
        'สถานะ': cp.status === 'used' ? 'ใช้แล้ว' : 'พร้อมใช้งาน',
        'วันที่สร้าง': (cp.createdAt || cp.created_at) ? formatDate(cp.createdAt || cp.created_at) : '-',
        'วันที่ใช้': (cp.usedAt || cp.used_at) ? formatDate(cp.usedAt || cp.used_at) : '-',
        'สาขาที่ใช้': cp.usedInBranch || cp.used_in_branch || '-',
        'คนไข้ที่ผูกสิทธิ์': (cp.patientName || cp.patient_name) ? `${cp.patientName || cp.patient_name} (${cp.patientId || cp.patient_id})` : 'ทั่วไป',
        'วันหมดอายุ': (cp.isLifetime ?? cp.is_lifetime) ? 'ตลอดชีพ' : ((cp.expireDate || cp.expire_date) ? formatDate(cp.expireDate || cp.expire_date) : '-'),
        'ชุดคูปอง (Batch)': cp.batchName || cp.batch_name || '-'
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'คูปองที่เลือก');
      XLSX.writeFile(wb, `Anping_Coupons_Export_${Date.now()}.xlsx`);
      showToast(`ส่งออกไฟล์ Excel เรียบร้อยแล้ว (${filteredForExport.length} ใบ)`, 'success');
      setIsExportExcelModalOpen(false);
    } catch (err) {
      console.error('Excel error:', err);
      showToast('เกิดข้อผิดพลาดในการส่งออก Excel', 'error');
    }
  };

  // คัดลอกข้อความทักทายพร้อมส่ง LINE / Facebook สำเร็จรูป
  const handleCopyChatMessage = (coupon) => {
    const isPercent = (coupon.discountType === 'percent' || coupon.discount_type === 'percent');
    const discountStr = isPercent ? `ลด ${coupon.discountValue || coupon.discount_value}%` : `ลด ${Number(coupon.discountValue || coupon.discount_value).toLocaleString()} บาท`;
    const expStr = formatPrintExpDate(coupon);
    const recipient = coupon.patientName ? `คุณ ${coupon.patientName}` : 'ท่าน';
    
    const termsLines = buildCouponConditionLines(coupon);
    const termsMsg = termsLines.length > 0 ? `\nเงื่อนไข:\n${termsLines.map(t => t.trim().startsWith('(') ? `    ${t.trim()}` : `  ${t.trim()}`).join('\n')}` : '';

    const text = `สวัสดีค่ะ${recipient} ✨\nอันผิงคลินิกขอมอบสิทธิประโยชน์คูปองส่วนลดพิเศษ:\n🎁 "${coupon.title}"\nส่วนลด: ${discountStr}${termsMsg}\nรหัสคูปอง: ${coupon.code}\nวันหมดอายุ: ${expStr}\n\nเพียงแสดงรหัสหรือภาพคูปองนี้แก่เจ้าหน้าที่เคาน์เตอร์ก่อนรับบริการนะคะ 🙏💖`;
    navigator.clipboard.writeText(text);
    showToast(`คัดลอกข้อความทักทายของคูปอง "${coupon.code}" แล้ว พร้อมส่งใน LINE/Facebook`, 'success');
  };

  // --- 6. Execute A4 Print (Template 1: Strip 5/page | Template 2: Card 10/page) ---
  const triggerA4Print = async (couponsToPrint, templateType = 'strip') => {
    if (!couponsToPrint || couponsToPrint.length === 0) {
      showToast('ไม่มีคูปองที่จะสั่งพิมพ์', 'warning');
      return;
    }

    // Ensure all QRs and Barcodes are ready before opening print window
    const qrMap = { ...qrCodeDataUrls };
    const barcodeMap = {};
    for (const cp of couponsToPrint) {
      const isTransparentQr = (cp.qrConfig?.whiteBg === false) || (cp.qr_config?.whiteBg === false);
      if (cp.code && (!qrMap[cp.code] || isTransparentQr)) {
        try {
          qrMap[cp.code] = await QRCode.toDataURL(cp.code, {
            width: 280,
            margin: 1,
            color: { dark: '#0f172a', light: isTransparentQr ? '#00000000' : '#ffffff' }
          });
        } catch (err) {
          console.error('[Coupon] QR print error:', err);
        }
      }
      const isBarcode = (cp.qrConfig?.codeType === 'barcode') || (cp.qr_config?.codeType === 'barcode');
      if (isBarcode && cp.code && !barcodeMap[cp.code]) {
        try {
          const bCanvas = document.createElement('canvas');
          JsBarcode(bCanvas, cp.code, {
            format: 'CODE128',
            width: 2.2,
            height: 60,
            displayValue: false,
            background: 'transparent',
            lineColor: '#0f172a',
            margin: 0
          });
          barcodeMap[cp.code] = bCanvas.toDataURL('image/png');
        } catch (bErr) {
          console.warn('[Coupon] Barcode print error:', bErr);
        }
      }
    }
    setQrCodeDataUrls(prev => ({ ...prev, ...qrMap }));

    const printWin = window.open('', '_blank', 'width=980,height=820');
    if (!printWin) {
      showToast('กรุณาอนุญาตให้เปิดหน้าต่าง Pop-up เพื่อพิมพ์คูปอง', 'warning');
      return;
    }

    const isStrip = templateType === 'strip';
    const chunkSize = isStrip ? 5 : 10;
    const pages = [];
    for (let i = 0; i < couponsToPrint.length; i += chunkSize) {
      pages.push(couponsToPrint.slice(i, i + chunkSize));
    }

    const pagesHtml = pages.map((pageCoupons) => {
      const cardsHtml = pageCoupons.map((coupon) => {
        const qrUrl = qrMap[coupon.code] || '';
        const expText = formatPrintExpDate(coupon);
        const isPercent = (coupon.discountType === 'percent' || coupon.discount_type === 'percent');
        const discountVal = Number(coupon.discountValue || coupon.discount_value || 0);
        const discountLabel = isPercent ? `ลด ${discountVal}%` : `ลด ฿${discountVal.toLocaleString()}`;
        
        const themeKey = coupon.themeColor || coupon.theme_color || 'emerald';
        const theme = PRINT_THEMES[themeKey] || PRINT_THEMES.emerald;
        const bInfo = resolveBranchInfo(branchesData, coupon.branchId || currentBranch);
        const { clinicName, clinicAddress, clinicPhone, taxId, logoUrl } = bInfo;
        const customImg = coupon.bgImage || coupon.bg_image;
        const isCustomImg = Boolean(customImg) && (coupon.templateType === 'custom_image' || coupon.template_type === 'custom_image' || templateType === 'custom_image');
        const qrCfg = coupon.qrConfig || coupon.qr_config || { codeType: 'qr', xPercent: 78, yPercent: 32, sizePercent: 26, whiteBg: true, showCode: true, codeColor: '#0f172a', codeBgStyle: 'none' };
        const isBarcode = qrCfg.codeType === 'barcode';
        const codeImgUrl = isBarcode ? (barcodeMap[coupon.code] || '') : qrUrl;
        const expCfg = coupon.expiryConfig || coupon.expiry_config || {
          enabled: true,
          xPercent: 25,
          yPercent: 82,
          sizePercent: 18,
          color: '#0f172a',
          bgStyle: 'none',
          format: 'eng',
          prefix: 'EXP: ',
          fontFamily: 'Inter',
          fontWeight: 'light'
        };
        const customExpText = formatCustomExpiryDate(
          coupon.expireDate || coupon.expire_date,
          expCfg.format,
          coupon.isLifetime ?? coupon.is_lifetime,
          expCfg.prefix
        );

        if (isCustomImg) {
          // TEMPLATE 3: ดีไซน์รูปภาพปรับแต่งเอง (85.6 x 54 mm, 10/A4) วางตำแหน่ง QR Code / Barcode & วันหมดอายุ ตามเครื่องมือสร้าง QR 1:1
          const codeColor = qrCfg.codeColor || (qrCfg.whiteBg ? '#0f172a' : '#ffffff');
          const codeBgStyle = qrCfg.codeBgStyle || 'none';
          const codeBgCss = codeBgStyle === 'white_pill'
            ? 'background: rgba(255,255,255,0.95); padding: 1.5px 7px; border-radius: 9999px; border: 0.3px solid #cbd5e1; box-shadow: 0 1px 3px rgba(0,0,0,0.1);'
            : codeBgStyle === 'dark_pill'
            ? 'background: rgba(15,23,42,0.9); padding: 1.5px 7px; border-radius: 9999px; box-shadow: 0 1px 3px rgba(0,0,0,0.2);'
            : 'background: transparent;';
          const codeTextClr = codeBgStyle === 'dark_pill' ? '#ffffff' : codeColor;
          const expFontWeight = expCfg.fontWeight === 'bold' ? '700' : (expCfg.fontWeight === 'normal' ? '400' : '300');

          // Physical metrics matching Studio 1:1 on 85.6mm card
          const qrWidthMm = (qrCfg.sizePercent / 100) * 85.6;
          const qrPadMm = qrCfg.whiteBg ? Math.max(0.6, qrWidthMm * 0.035) : 0;
          const codeFontMm = Math.max(1.4, Math.min(4.5, qrWidthMm * ((qrCfg.codeFontSize ?? 10) * 0.009)));
          const codeMarginTopMm = Math.max(0, qrWidthMm * ((qrCfg.codeDistance ?? 0) / 100));

          const expFontMm = Math.max(1.8, Math.min(8.0, 85.6 * ((expCfg.sizePercent || 18) * 0.002)));

          return `
            <div class="t2-card custom-art-card" style="background-image: url('${customImg}');">
              <div class="crop-mark top-left"></div>
              <div class="crop-mark top-right"></div>
              <div class="crop-mark bottom-left"></div>
              <div class="crop-mark bottom-right"></div>

              <div class="custom-qr-wrapper" style="
                left: ${qrCfg.xPercent}%;
                top: ${qrCfg.yPercent}%;
                width: ${qrCfg.sizePercent}%;
                transform: translate(-50%, -50%);
              ">
                <div class="custom-qr-box ${qrCfg.whiteBg ? 'with-white-bg' : 'transparent-bg'}" style="
                  padding: ${qrPadMm.toFixed(2)}mm;
                  box-sizing: border-box;
                  width: 100%;
                ">
                  <div style="width: 100%; aspect-ratio: ${isBarcode ? 'auto' : '1/1'}; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                    <img src="${codeImgUrl}" alt="${coupon.code}" class="${isBarcode ? 'custom-barcode-img' : 'custom-qr-img'}" style="width: 100%; height: 100%; object-fit: contain; display: block;" />
                  </div>
                  ${qrCfg.showCode ? `
                    <div class="custom-qr-code-text" style="
                      color: ${codeTextClr};
                      ${codeBgCss}
                      font-size: ${codeFontMm.toFixed(2)}mm;
                      margin-top: ${codeMarginTopMm.toFixed(2)}mm;
                      white-space: nowrap !important;
                      overflow: hidden;
                      text-overflow: clip;
                      line-height: 1.1;
                      width: 100%;
                      text-align: center;
                      display: block;
                      box-sizing: border-box;
                    ">${coupon.code}</div>
                  ` : ''}
                </div>
              </div>

              ${expCfg.enabled !== false ? `
                <div class="custom-exp-wrapper ${expCfg.bgStyle === 'white_pill' ? 'bg-white-pill' : expCfg.bgStyle === 'dark_pill' ? 'bg-dark-pill' : ''}" style="
                  left: ${expCfg.xPercent}%;
                  top: ${expCfg.yPercent}%;
                  transform: translate(-50%, -50%);
                  color: ${expCfg.bgStyle === 'dark_pill' ? '#ffffff' : (expCfg.color || '#0f172a')};
                  font-size: ${expFontMm.toFixed(2)}mm;
                  font-family: ${getExpiryFontFamily(expCfg.fontFamily)};
                  font-weight: ${expFontWeight};
                  white-space: nowrap !important;
                  line-height: 1.1;
                ">
                  ${customExpText}
                </div>
              ` : ''}
            </div>
          `;
        } else if (isStrip) {
          // TEMPLATE 1: แถบยาว 200 x 54 mm (5 ใบ/หน้า A4) พร้อมเส้นตัดตรง 100% และหัวกระดาษแบรนด์คลินิกพรีเมียม
          const t1DiscountFontSize = discountLabel.length > 8 ? '34px' : '42px';
          return `
            <div class="t1-voucher ${customImg ? 'custom-bg' : 'luxury-strip'}" style="${customImg ? `background-image: url('${customImg}');` : `background: ${theme.cardBgGradient};`}">
              ${!customImg ? `
                <div class="t1-sheen"></div>
                <div class="t1-inner-border"></div>
              ` : ''}

              <div class="t1-left">
                <div class="t1-header">
                  <div class="t1-header-brand">
                    ${logoUrl ? `<img src="${logoUrl}" class="t1-logo-img" alt="Logo" onerror="this.onerror=null; this.outerHTML='<div class=\\'t1-logo-badge\\'>AP</div>';" />` : `<div class="t1-logo-badge">AP</div>`}
                    <div class="t1-brand-info">
                      <div class="t1-brand-name">${clinicName}</div>
                      <div class="t1-brand-address">${clinicAddress}</div>
                      <div class="t1-brand-contact">
                        <span>โทร: <strong>${clinicPhone || '-'}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="t1-body">
                  <div class="t1-title">${coupon.title || 'บัตรกำนัลส่วนลดพิเศษ'}</div>
                  <div class="t1-discount-row">
                    <span class="t1-discount-val" style="font-size: ${t1DiscountFontSize};">${discountLabel}</span>
                    <div style="display: flex; flex-direction: column; gap: 0.5mm;">
                      ${buildCouponConditionLines(coupon).map(line => {
                        const isSub = line.trim().startsWith('(');
                        return `<span class="t1-min-spend" style="${isSub ? 'padding-left: 2mm; opacity: 0.9;' : ''}">${line.trim()}</span>`;
                      }).join('')}
                    </div>
                  </div>
                </div>

                <div class="t1-footer">
                  <span class="t1-exp-pill">📅 วันหมดอายุ: <strong>${expText}</strong></span>
                  <span>กรุณาแสดงคูปองต่อเจ้าหน้าที่ก่อนเข้ารับบริการ</span>
                </div>
              </div>

              <div class="t1-stub">
                <div class="t1-stub-content">
                  <div class="t1-qr-card">
                    <img src="${qrUrl}" alt="${coupon.code}" class="t1-qr-img" />
                    <span class="t1-qr-code">${coupon.code}</span>
                  </div>
                  <div class="t1-stub-text">โทร.${clinicPhone || '-'}</div>
                </div>
              </div>
            </div>
          `;
        } else {
          // TEMPLATE 2: บัตรมาตรฐาน 85.6 x 54 mm (10 ใบ/หน้า A4) เกรดกระดาษโฟโต้ ตัดตรง 100%
          const isPercent = (coupon.discountType === 'percent' || coupon.discount_type === 'percent');
          const discountVal = Number(coupon.discountValue || coupon.discount_value || 0);
          const numStr = isPercent ? String(discountVal) : discountVal.toLocaleString();
          const unitStr = isPercent ? '%' : 'บาท';

          const stubNumFontSize = numStr.length >= 4 ? '18px' : (numStr.length === 3 ? '22px' : '28px');
          const stubUnitFontSize = numStr.length >= 4 ? '9px' : (numStr.length === 3 ? '11px' : '14px');

          const isLifetime = Boolean(coupon.isLifetime ?? coupon.is_lifetime);
          const expDisplayClean = isLifetime ? 'ไม่มีวันหมดอายุ' : (expText || 'ไม่ระบุ');
          const termsLines = buildCouponConditionLines(coupon);
          const numTerms = termsLines.length;
          const termsFontSize = numTerms > 3 ? '5.2px' : (numTerms > 2 ? '5.8px' : (numTerms > 1 ? '7px' : '8.5px'));
          const termsMarginTop = numTerms > 3 ? '1.1mm' : (numTerms > 2 ? '1.5mm' : (numTerms > 1 ? '1.8mm' : '2.2mm'));
          const thanksFontSize = numTerms > 3 ? '7.5px' : (numTerms > 2 ? '8.2px' : (numTerms > 1 ? '8.8px' : '9.5px'));
          const thanksMargin = numTerms > 3 ? '0.6mm 0 0.2mm 0' : (numTerms > 2 ? '0.8mm 0 0.3mm 0' : (numTerms > 1 ? '1.1mm 0 0.4mm 0' : '1.5mm 0 0.5mm 0'));

          // Dynamic title font sizing for 55.6mm width to span nearly edge-to-edge
          const titleLen = (coupon.title || '').length;
          let titleFontSize = '19px';
          let titleLineHeight = '1.05';
          if (titleLen <= 5) {
            titleFontSize = '34px';
            titleLineHeight = '0.95';
          } else if (titleLen <= 9) {
            titleFontSize = '27px';
            titleLineHeight = '1.0';
          } else if (titleLen <= 16) {
            titleFontSize = '19px';
            titleLineHeight = '1.05';
          } else if (titleLen <= 26) {
            titleFontSize = '13.5px';
            titleLineHeight = '1.1';
          } else {
            titleFontSize = '10.5px';
            titleLineHeight = '1.15';
          }

          return `
            <div class="t2-card ${customImg ? 'custom-bg' : 'luxury-card'}" style="${customImg ? `background-image: url('${customImg}');` : `background: ${theme.cardBgGradient};`}">
              ${!customImg ? `
                <div class="t2-sheen"></div>
                <div class="t2-inner-border"></div>
              ` : ''}

              <div class="t2-left">
                <div class="t2-header">
                  <div class="t2-header-brand">
                    ${logoUrl ? `<img src="${logoUrl}" class="t2-logo-img" alt="Logo" onerror="this.onerror=null; this.outerHTML='<div class=\\'t2-logo-badge\\'>AP</div>';" />` : `<div class="t2-logo-badge">AP</div>`}
                    <div class="t2-brand-info">
                      <div class="t2-brand-name">${clinicName}</div>
                      <div class="t2-brand-address">${clinicAddress}</div>
                      <div class="t2-brand-contact">
                        <span>โทร: ${clinicPhone || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="t2-divider"></div>

                <div class="t2-body">
                  <div class="t2-title" style="font-size: ${titleFontSize}; line-height: ${titleLineHeight};">${coupon.title || 'บัตรกำนัลส่วนลดพิเศษ'}</div>
                  <div class="t2-terms-group" style="display: flex; flex-direction: column; gap: 0.5mm; margin-top: ${termsMarginTop};">
                    ${termsLines.map(line => {
                      const isSub = line.trim().startsWith('(');
                      return `<div class="t2-min-spend" style="font-size: ${termsFontSize}; margin-top: 0; ${isSub ? 'padding-left: 2mm; opacity: 0.9;' : ''}">${line.trim()}</div>`;
                    }).join('')}
                  </div>
                  <div class="t2-thanks" style="font-size: ${thanksFontSize}; margin: ${thanksMargin};">ขอบคุณที่ไว้วางใจให้อันผิงดูแลคุณ</div>
                </div>

                <div class="t2-footer">
                  <div class="t2-prompt-note">กรุณาแสดงบัตรกำนัลนี้แก่เจ้าหน้าที่</div>
                  <div class="t2-exp-text">วันหมดอายุ: ${expDisplayClean}</div>
                </div>
              </div>

              <div class="t2-stub">
                <div class="t2-stub-content">
                  <div class="t2-stub-discount">
                    <span class="t2-stub-discount-label">ลด</span>
                    <div class="t2-stub-discount-val">
                      <span class="t2-discount-num" style="font-size: ${stubNumFontSize};">${numStr}</span>
                      <span class="t2-discount-unit" style="font-size: ${stubUnitFontSize};">${unitStr}</span>
                    </div>
                  </div>

                  <div class="t2-qr-card">
                    <img src="${qrUrl}" alt="${coupon.code}" class="t2-qr-img" />
                    <span class="t2-qr-code">${coupon.code}</span>
                  </div>

                  <div class="t2-stub-phone">โทร.${clinicPhone || '-'}</div>
                </div>
              </div>
            </div>
          `;
        }
      }).join('');

      return `
        <div class="a4-page">
          <div class="${isStrip ? 'grid-strip' : 'grid-card'}">
            ${cardsHtml}
          </div>
        </div>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>พิมพ์คูปองส่วนลด - Anping Clinic</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Kanit:wght@300;400;500;600;700;800;900&family=Prompt:wght@300;400;500;600;700&family=Sarabun:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 portrait;
            margin: 0mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family: 'Kanit', sans-serif;
            color: #0f172a;
          }
          .a4-page {
            width: 210mm;
            height: 297mm;
            page-break-after: always;
            break-after: page;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            margin: 0;
            box-sizing: border-box;
          }
          .a4-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          /* Hide inner corner crop marks in zero-gap mode so they don't overlap adjacent cards */
          .crop-mark {
            display: none !important;
          }

          /* TEMPLATE 1: STRIP (200 x 54 mm, 5/page) - ไร้ช่องว่างระหว่างคูปอง ตัดคัตเตอร์เส้นเดียว 100% */
          .grid-strip {
            display: flex;
            flex-direction: column;
            gap: 0;
            width: 200mm;
            margin: 0 auto;
            border: 0.35px solid #64748b;
            box-sizing: border-box;
          }
          .t1-voucher {
            width: 200mm;
            height: 54mm;
            border-bottom: 0.35px dashed #64748b;
            border-top: none;
            border-left: none;
            border-right: none;
            border-radius: 0px !important;
            display: flex;
            position: relative;
            background: #ffffff;
            page-break-inside: avoid;
            break-inside: avoid;
            overflow: hidden;
            box-sizing: border-box;
            color: #ffffff;
          }
          .t1-voucher.luxury-strip {
            background-size: cover;
            color: #ffffff;
          }
          .t1-sheen {
            position: absolute;
            inset: 0;
            pointer-events: none;
            background: linear-gradient(135deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.02) 45%, rgba(255,255,255,0.15) 100%);
            z-index: 1;
          }
          .t1-inner-border {
            position: absolute;
            inset: 2mm;
            pointer-events: none;
            border: 0.4px solid rgba(255,255,255,0.3);
            border-radius: 2.5mm;
            z-index: 1;
          }
          .t1-voucher:last-child {
            border-bottom: none;
          }
          .t1-left {
            position: relative;
            z-index: 2;
            flex: 1;
            padding: 4mm 6mm 3.8mm 6.5mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .t1-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .t1-header-brand {
            display: flex;
            align-items: center;
            gap: 2.8mm;
            max-width: 135mm;
          }
          .t1-logo-img {
            width: 9.5mm;
            height: 9.5mm;
            border-radius: 50%;
            object-fit: contain;
            background: #ffffff;
            border: 0.4px solid rgba(255,255,255,0.8);
            box-shadow: 0 1px 4px rgba(0,0,0,0.3);
            flex-shrink: 0;
          }
          .t1-logo-badge {
            width: 9mm;
            height: 9mm;
            border-radius: 50%;
            background: rgba(255,255,255,0.25);
            border: 0.4px solid rgba(255,255,255,0.7);
            color: #ffffff;
            font-size: 10px;
            font-weight: 900;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .t1-brand-info {
            display: flex;
            flex-direction: column;
            text-align: left;
            overflow: hidden;
          }
          .t1-brand-name {
            font-size: 13px;
            font-weight: 900;
            letter-spacing: 0.2px;
            color: #ffffff;
            line-height: 1.15;
            text-shadow: 0 1px 3px rgba(0,0,0,0.45);
          }
          .t1-brand-address {
            font-size: 8.5px;
            color: rgba(255,255,255,0.9);
            line-height: 1.25;
            word-break: break-word;
            max-width: 120mm;
          }
          .t1-brand-contact {
            font-size: 8.5px;
            color: rgba(255,255,255,0.9);
            display: flex;
            gap: 4mm;
            line-height: 1.2;
          }
          .t1-title {
            font-size: 15px;
            font-weight: 800;
            color: #ffffff;
            text-shadow: 0 1px 3px rgba(0,0,0,0.4);
            margin-top: 1px;
          }
          .t1-discount-val {
            font-size: 42px;
            font-weight: 900;
            line-height: 0.95;
            color: #ffffff;
            text-shadow: 0 2px 6px rgba(0,0,0,0.5);
            letter-spacing: -0.5px;
          }
          .t1-min-spend {
            font-size: 9.5px;
            font-weight: 500;
            color: rgba(255,255,255,0.9);
            margin-left: 8px;
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
          }
          .t1-footer {
            font-size: 8.5px;
            color: rgba(255,255,255,0.9);
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 0.4px solid rgba(255,255,255,0.25);
            padding-top: 1.8mm;
          }
          .t1-exp-pill {
            background: rgba(0,0,0,0.3);
            padding: 1.8px 8px;
            border-radius: 9999px;
            border: 0.35px solid rgba(255,255,255,0.35);
            font-weight: 600;
            color: #ffffff;
          }
          .t1-stub {
            position: relative;
            z-index: 2;
            width: 50mm;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 3mm;
            color: #ffffff;
            border-left: 0.8px dashed rgba(255,255,255,0.5);
          }
          .t1-stub-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2mm;
          }
          .t1-qr-card {
            background: #ffffff;
            padding: 3.5px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.35);
          }
          .t1-qr-img {
            width: 27mm;
            height: 27mm;
            display: block;
          }
          .t1-qr-code {
            font-family: 'JetBrains Mono', monospace;
            font-size: 9.5px;
            font-weight: 800;
            color: #0f172a;
            background: #f1f5f9;
            border-radius: 4px;
            padding: 1.5px 6px;
            display: inline-block;
            margin-top: 2.5px;
            letter-spacing: 0.5px;
          }
          .t1-stub-text {
            font-size: 8.5px;
            font-weight: 700;
            letter-spacing: 0.3px;
            color: rgba(255,255,255,0.95);
            text-shadow: 0 1px 2px rgba(0,0,0,0.35);
          }

          /* TEMPLATE 2 & 3: CARD (85.6 x 54 mm, 10/page) - ไร้ช่องว่างระหว่างคูปอง ตัดคัตเตอร์เส้นเดียว 100% */
          .grid-card {
            display: grid;
            grid-template-columns: repeat(2, 85.6mm);
            grid-template-rows: repeat(5, 54mm);
            gap: 0;
            width: 171.2mm;
            margin: 0 auto;
            border: 0.35px solid #64748b;
            box-sizing: border-box;
          }
          .t2-card {
            width: 85.6mm;
            height: 54mm;
            border-right: 0.35px dashed #64748b;
            border-bottom: 0.35px dashed #64748b;
            border-top: none;
            border-left: none;
            border-radius: 0px !important;
            display: flex;
            position: relative;
            background: #ffffff;
            page-break-inside: avoid;
            break-inside: avoid;
            overflow: hidden;
            box-sizing: border-box;
            color: #ffffff;
          }
          .t2-card.luxury-card {
            background-size: cover;
            color: #ffffff;
          }
          .t2-sheen {
            position: absolute;
            inset: 0;
            pointer-events: none;
            background: linear-gradient(135deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.02) 45%, rgba(255,255,255,0.15) 100%);
            z-index: 1;
          }
          .t2-inner-border {
            position: absolute;
            inset: 1.5mm;
            pointer-events: none;
            border: 0.35px solid rgba(255,255,255,0.3);
            border-radius: 2mm;
            z-index: 1;
          }
          .t2-card:nth-child(2n) {
            border-right: none;
          }
          .t2-card:nth-last-child(-n+2) {
            border-bottom: none;
          }
          .t2-left {
            position: relative;
            z-index: 2;
            width: 55.6mm;
            height: 54mm;
            padding: 2.8mm 3.2mm 2.6mm 3.5mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-sizing: border-box;
          }
          .t2-header {
            display: flex;
            align-items: flex-start;
            justify-content: flex-start;
            width: 100%;
          }
          .t2-header-brand {
            display: flex;
            align-items: flex-start;
            gap: 1.8mm;
            width: 100%;
          }
          .t2-logo-img {
            width: 7.2mm;
            height: 7.2mm;
            border-radius: 50%;
            object-fit: contain;
            background: #ffffff;
            border: 0.4px solid rgba(255,255,255,0.8);
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            flex-shrink: 0;
            margin-top: 0.2mm;
          }
          .t2-logo-badge {
            width: 6.8mm;
            height: 6.8mm;
            border-radius: 50%;
            background: rgba(255,255,255,0.25);
            border: 0.4px solid rgba(255,255,255,0.7);
            color: #ffffff;
            font-size: 8px;
            font-weight: 900;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.25);
            margin-top: 0.2mm;
          }
          .t2-brand-info {
            display: flex;
            flex-direction: column;
            text-align: left;
            flex: 1;
            min-width: 0;
          }
          .t2-brand-name {
            font-size: 8px;
            font-weight: 900;
            color: #ffffff;
            line-height: 1.15;
            letter-spacing: 0px;
            text-shadow: 0 1px 2px rgba(0,0,0,0.4);
          }
          .t2-brand-address {
            font-size: 5.4px;
            font-weight: 400;
            color: rgba(255,255,255,0.9);
            line-height: 1.2;
            word-break: break-word;
            margin-top: 0.3mm;
          }
          .t2-brand-contact {
            font-size: 5.2px;
            font-weight: 400;
            color: rgba(255,255,255,0.85);
            line-height: 1.2;
            display: flex;
            gap: 2mm;
            margin-top: 0.3mm;
          }
          .t2-divider {
            width: 100%;
            height: 0.35px;
            background: linear-gradient(90deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.18) 70%, rgba(255,255,255,0) 100%);
            margin: 1mm 0 0.8mm 0;
          }
          .t2-body {
            display: flex;
            flex-direction: column;
            justify-content: center;
            flex: 1;
            padding: 1.2mm 0 0.5mm 0;
          }
          .t2-title {
            font-weight: 900;
            color: #ffffff;
            letter-spacing: -0.2px;
            text-shadow: 0 1px 3px rgba(0,0,0,0.4);
            word-break: break-word;
          }
          .t2-min-spend {
            font-size: 8.5px;
            font-weight: 600;
            color: rgba(255,255,255,0.95);
            line-height: 1.2;
            margin-top: 2.2mm;
          }
          .t2-thanks {
            font-size: 9.5px;
            font-weight: 900;
            color: #ffffff;
            text-align: center;
            margin: 1.5mm 0 0.5mm 0;
            letter-spacing: -0.2px;
            text-shadow: 0 1px 3px rgba(0,0,0,0.4);
            white-space: nowrap;
          }
          .t2-footer {
            display: flex;
            flex-direction: column;
            gap: 0.8mm;
            margin-top: auto;
          }
          .t2-prompt-note {
            font-size: 6px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.88);
            line-height: 1.15;
          }
          .t2-exp-text {
            font-size: 6.6px;
            font-weight: 700;
            color: #ffffff;
            line-height: 1.15;
          }
          .t2-stub {
            position: relative;
            z-index: 2;
            width: 30mm;
            height: 54mm;
            display: flex;
            align-items: center;
            justify-content: center;
            border-left: 0.8px dashed rgba(255,255,255,0.5);
            color: #ffffff;
            box-sizing: border-box;
            padding: 1.8mm 1mm;
          }
          .t2-stub-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            height: 100%;
            width: 100%;
          }
          .t2-stub-discount {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            line-height: 1;
            margin-top: 0.5mm;
          }
          .t2-stub-discount-label {
            font-size: 15px;
            font-weight: 900;
            color: #ffffff;
            line-height: 1;
            margin-bottom: 0.2mm;
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
          }
          .t2-stub-discount-val {
            display: flex;
            align-items: flex-end;
            justify-content: center;
            line-height: 0.9;
            text-shadow: 0 1px 3px rgba(0,0,0,0.4);
          }
          .t2-discount-num {
            font-weight: 900;
            color: #ffffff;
            letter-spacing: -0.4px;
            line-height: 0.9;
          }
          .t2-discount-unit {
            font-weight: 900;
            color: #ffffff;
            margin-left: 0.5mm;
            line-height: 0.9;
            padding-bottom: 0.2mm;
          }
          .t2-qr-card {
            background: #ffffff;
            padding: 1.5px;
            border-radius: 5px;
            text-align: center;
            box-shadow: 0 2px 7px rgba(0,0,0,0.35);
          }
          .t2-qr-img {
            width: 19.5mm;
            height: 19.5mm;
            display: block;
          }
          .t2-qr-code {
            font-family: 'JetBrains Mono', monospace;
            font-size: 6.8px;
            font-weight: 800;
            color: #0f172a;
            background: #f1f5f9;
            border-radius: 3px;
            padding: 1px 3.5px;
            display: inline-block;
            margin-top: 1.5px;
            letter-spacing: 0.2px;
          }
          .t2-stub-phone {
            font-size: 8px;
            font-weight: 800;
            color: #ffffff;
            text-align: center;
            white-space: nowrap;
            line-height: 1.1;
            text-shadow: 0 1px 2px rgba(0,0,0,0.4);
            margin-bottom: 0.5mm;
          }
          .custom-bg {
            background-size: cover !important;
            background-position: center !important;
          }
          .custom-art-card {
            background-size: cover !important;
            background-position: center !important;
            position: relative;
            display: block;
            overflow: hidden;
            box-sizing: border-box;
          }
          .custom-qr-wrapper {
            position: absolute;
            display: flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
          }
          .custom-qr-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 100%;
            box-sizing: border-box;
          }
          .custom-qr-box.with-white-bg {
            background: #ffffff;
            border-radius: 4px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.25);
          }
          .custom-qr-img {
            width: 100%;
            height: 100%;
            aspect-ratio: 1/1;
            display: block;
            object-fit: contain;
          }
          .custom-barcode-img {
            width: 100%;
            height: auto;
            max-height: 14mm;
            display: block;
            object-fit: contain;
          }
          .custom-qr-code-text {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 700;
            letter-spacing: 0.2px;
            white-space: nowrap !important;
            text-align: center;
            width: 100%;
            display: block;
            overflow: hidden;
            text-overflow: clip;
            line-height: 1.1;
            box-sizing: border-box;
          }
          .custom-exp-wrapper {
            position: absolute;
            white-space: nowrap !important;
            pointer-events: none;
            line-height: 1.1;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
          }
          .custom-exp-wrapper.bg-white-pill {
            background: rgba(255, 255, 255, 0.95);
            padding: 1.5px 6px;
            border-radius: 9999px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            border: 0.3px solid rgba(0,0,0,0.1);
          }
          .custom-exp-wrapper.bg-dark-pill {
            background: rgba(15, 23, 42, 0.9);
            padding: 1.5px 6px;
            border-radius: 9999px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            color: #ffffff !important;
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 450);
          };
        </script>
      </body>
      </html>
    `;

    printWin.document.write(html);
    printWin.document.close();
  };

  return (
    <div className="flex flex-col h-full fade-in pb-20 md:pb-0 relative">
      
      {/* --- 1. Sticky Header --- */}
      <div ref={headerRef} className="sticky z-30 w-full pointer-events-none transition-all duration-300 ease-in-out flex flex-col" style={{ top: 'var(--mobile-header-offset, 0px)' }}>
        <div className="w-full pointer-events-auto sticky-header-bg shrink-0">
          <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 flex flex-row justify-between items-center gap-2 sm:gap-4 sticky-header-inner">
            <div>
              <h1 className="font-bold text-slate-800 tracking-tight kanit-text sticky-header-title flex items-center gap-2">
                <Ticket className="text-sky-500" /> ระบบคูปอง & สิทธิประโยชน์
              </h1>
              <p className="text-slate-500 kanit-text sticky-header-desc">
                สร้าง ออกแบบ ส่งออกภาพคมชัด และสั่งพิมพ์คูปองส่วนลดแบบชุดมาตรฐาน A4
              </p>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setIsScanModalOpen(true)}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl font-bold text-slate-700 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all text-xs sm:text-sm active:scale-95"
              >
                <Camera size={18} className="text-sky-600" />
                <span className="hidden sm:inline">สแกน / ตัดคูปอง</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl font-semibold shadow-sm transition-transform active:scale-95 shrink-0 bg-sky-500 hover:bg-sky-600 text-white text-xs sm:text-sm"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">สร้างคูปองใหม่ (เป็นชุด)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- 2. Executive KPI Summary Cards (5 การ์ดตัวชี้วัด) --- */}
      <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 mt-2 sm:mt-3 mb-0 relative z-20 pointer-events-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Card 1: ทั้งหมด */}
          <div className="bg-white p-4 sm:p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-indigo-200 hover:shadow-md transition-all">
            <div className="flex items-center gap-2.5 mb-2 relative z-10">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-50 text-indigo-500 border border-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                <Ticket size={18} />
              </div>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 kanit-text uppercase tracking-wider truncate">
                คูปองทั้งหมด
              </p>
            </div>
            <div className="relative z-10">
              <p className="font-black text-indigo-600 font-data text-2xl sm:text-3xl tracking-tight">
                {stats.total.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400 kanit-text mt-0.5">ยอดผลิตในระบบ</p>
            </div>
          </div>

          {/* Card 2: พร้อมใช้งาน */}
          <div className="bg-white p-4 sm:p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-emerald-200 hover:shadow-md transition-all">
            <div className="flex items-center gap-2.5 mb-2 relative z-10">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-50 text-emerald-500 border border-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} />
              </div>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 kanit-text uppercase tracking-wider truncate">
                พร้อมใช้งาน
              </p>
            </div>
            <div className="relative z-10">
              <p className="font-black text-emerald-600 font-data text-2xl sm:text-3xl tracking-tight">
                {stats.active.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400 kanit-text mt-0.5">ยังไม่ถูกตัดสิทธิ์</p>
            </div>
          </div>

          {/* Card 3: มูลค่าส่วนลดที่มอบให้ */}
          <div className="bg-white p-4 sm:p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-rose-200 hover:shadow-md transition-all">
            <div className="flex items-center gap-2.5 mb-2 relative z-10">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-rose-50 text-rose-500 border border-rose-100 rounded-xl flex items-center justify-center shrink-0">
                <Tag size={18} />
              </div>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 kanit-text uppercase tracking-wider truncate">
                มูลค่าส่วนลด
              </p>
            </div>
            <div className="relative z-10">
              <p className="font-black text-rose-600 font-data text-2xl sm:text-3xl tracking-tight truncate">
                ฿{stats.discountGiven.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400 kanit-text mt-0.5">ส่วนลดที่ลูกค้าได้รับ</p>
            </div>
          </div>

          {/* Card 4: ยอดขายที่เกิดจากบิลคูปอง */}
          <div className="bg-white p-4 sm:p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-sky-200 hover:shadow-md transition-all">
            <div className="flex items-center gap-2.5 mb-2 relative z-10">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-sky-50 text-sky-600 border border-sky-100 rounded-xl flex items-center justify-center shrink-0">
                <Sparkles size={18} />
              </div>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 kanit-text uppercase tracking-wider truncate">
                ยอดขายจากคูปอง
              </p>
            </div>
            <div className="relative z-10">
              <p className="font-black text-sky-600 font-data text-2xl sm:text-3xl tracking-tight truncate">
                ฿{stats.revenueGenerated.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400 kanit-text mt-0.5">ยอดบิลรวมที่มีคูปอง</p>
            </div>
          </div>

          {/* Card 5: ใกล้หมดอายุใน 7 วัน */}
          <div className="bg-white p-4 sm:p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-amber-200 hover:shadow-md transition-all col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2.5 mb-2 relative z-10">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-amber-50 text-amber-500 border border-amber-100 rounded-xl flex items-center justify-center shrink-0">
                <Clock size={18} />
              </div>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 kanit-text uppercase tracking-wider truncate">
                หมดอายุใน 7 วัน
              </p>
            </div>
            <div className="relative z-10">
              <p className="font-black text-amber-600 font-data text-2xl sm:text-3xl tracking-tight">
                {stats.expiringIn7Days.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400 kanit-text mt-0.5">ควรแจ้งเตือนลูกค้า</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- 3. Filter & Search Toolbar (Sticky เมื่อเลื่อนชน Header) --- */}
      <div 
        ref={filterRef}
        className="w-full pointer-events-none sticky z-20 transition-all duration-300 ease-in-out my-3 sm:my-4 sticky-filter-appt"
      >
        <div className="w-full mx-auto pointer-events-none relative z-50">
          <div className="mx-auto bg-white/95 backdrop-blur-xl border-slate-200 pointer-events-auto origin-top sticky-filter-inner shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-4 md:px-8 2xl:px-12 py-3 sm:py-3.5 transition-all">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อคูปอง, รหัส, คนไข้ หรือ HN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs sm:text-sm font-medium outline-none focus:bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all font-data"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Filters & View Switcher */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {/* Template Library Button */}
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold kanit-text transition-all flex items-center gap-1.5 border border-indigo-200/80 shadow-2xs"
              >
                <Bookmark size={14} className="text-indigo-600" />
                <span>คลังแม่แบบ (Templates)</span>
              </button>

              {/* Export to Excel Button (Opens Filter Modal) */}
              <button
                type="button"
                onClick={handleOpenExportExcel}
                className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold kanit-text transition-all flex items-center gap-1.5 border border-emerald-200/80 shadow-2xs"
                title="ส่งออกรายงานคูปองเป็นไฟล์ Excel (เลือกชุดหรือช่วงวันที่ได้)"
              >
                <FileSpreadsheet size={14} className="text-emerald-600" />
                <span>ส่งออก Excel</span>
              </button>

              {/* Status Tabs */}
              <div className="p-1 bg-slate-100/80 rounded-2xl flex items-center gap-1 border border-slate-200/50">
                {[
                  { id: 'all', label: 'ทั้งหมด' },
                  { id: 'active', label: 'พร้อมใช้' },
                  { id: 'used', label: 'ใช้แล้ว' },
                  { id: 'expired', label: 'หมดอายุ' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold kanit-text transition-all ${
                      statusFilter === tab.id
                        ? 'bg-white text-slate-800 shadow-2xs font-extrabold'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* View Mode Switcher */}
              <div className="p-1 bg-slate-100/80 rounded-2xl flex items-center gap-1 border border-slate-200/50">
                <button
                  onClick={() => setViewMode('batches')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold kanit-text flex items-center gap-1.5 transition-all ${
                    viewMode === 'batches'
                      ? 'bg-sky-500 text-white shadow-sm font-extrabold'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Layers size={14} />
                  <span>ชุดคูปอง ({batchGroups.length})</span>
                </button>
                <button
                  onClick={() => setViewMode('all_cards')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold kanit-text flex items-center gap-1.5 transition-all ${
                    viewMode === 'all_cards'
                      ? 'bg-sky-500 text-white shadow-sm font-extrabold'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Ticket size={14} />
                  <span>รายใบเดี่ยว ({filteredIndividualCoupons.length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- 4. Main Content Section (Grids) --- */}
      <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 mt-0 mb-0 relative z-10 pointer-events-auto">
        <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-sm p-4 sm:p-6 lg:p-7 flex flex-col space-y-6">
          {/* Grid Content */}
          {viewMode === 'batches' ? (
            filteredBatches.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-3xl bg-slate-50 text-slate-300 flex items-center justify-center mb-3">
                  <Ticket size={32} />
                </div>
                <h4 className="text-base font-bold text-slate-700 kanit-text">ไม่พบชุดคูปอง</h4>
                <p className="text-xs text-slate-400 mt-1">กดปุ่ม "สร้างคูปองใหม่ (เป็นชุด)" เพื่อเพิ่มคูปองเข้าสู่ระบบ</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredBatches.map(batch => {
                  const theme = THEME_STYLES[batch.themeColor] || THEME_STYLES.emerald;
                  const discountText = batch.discountType === 'percent' ? `ลด ${batch.discountValue}%` : `ลด ฿${Number(batch.discountValue).toLocaleString()}`;
                  const usedPercent = batch.total > 0 ? Math.round((batch.usedCount / batch.total) * 100) : 0;
                  const firstCouponCode = batch.coupons[0]?.code || 'CP-PREVIEW';
                  const sampleQrUrl = qrCodeDataUrls[firstCouponCode];

                  return (
                    <div
                      key={batch.batchId}
                      className="rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 p-5 md:p-6 flex flex-col justify-between group relative overflow-hidden text-white border border-white/20 hover:-translate-y-1"
                    >
                      {/* Background Artwork / Gradient */}
                      {batch.bgImage ? (
                        <div 
                          className="absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: `url('${batch.bgImage}')` }}
                        >
                          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]" />
                        </div>
                      ) : (
                        <div className={`absolute inset-0 bg-gradient-to-br ${theme.bg}`} />
                      )}

                      {/* Metallic / Glossy Lighting Sheen Overlay */}
                      <div 
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.02) 45%, rgba(255,255,255,0.18) 100%)'
                        }}
                      />

                      {/* Content Layer */}
                      <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                        {/* Top Header: Brand & Expiry/Count Badges */}
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/25 shadow-sm">
                                <Sparkles size={16} />
                              </div>
                              <div>
                                <span className="font-extrabold text-xs md:text-sm tracking-wider leading-none block drop-shadow-sm font-data">
                                  ANPING CLINIC
                                </span>
                                <span className="text-[9px] text-white/80 font-light block leading-none mt-1">
                                  คลินิกแพทย์แผนจีน
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                              <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold text-white border border-white/20 shadow-2xs">
                                {batch.isLifetime ? '✨ ตลอดชีพ' : (batch.expireDate ? `หมด ${formatDate(batch.expireDate)}` : 'VOUCHER')}
                              </span>
                              <span className="px-2.5 py-1 rounded-full bg-black/25 backdrop-blur-md text-[10px] font-extrabold text-white border border-white/20 shadow-2xs font-data">
                                ชุด {batch.total} ใบ
                              </span>
                            </div>
                          </div>

                          {/* Title & Discount */}
                          <div className="mt-4">
                            <h3 className="text-lg md:text-xl font-black text-white kanit-text tracking-wide drop-shadow-md line-clamp-1">
                              {batch.batchName || batch.title}
                            </h3>
                            <div className="flex items-baseline gap-2 mt-1">
                              <div className="text-3xl md:text-4xl font-black font-data text-white tracking-tight drop-shadow-lg">
                                {discountText}
                              </div>
                              {batch.minSpend > 0 && (
                                <span className="text-xs font-medium text-white/85 kanit-text drop-shadow-sm">
                                  (ขั้นต่ำ ฿{Number(batch.minSpend).toLocaleString()})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Glassmorphic Progress & Stats Box */}
                        <div className="bg-black/20 backdrop-blur-md rounded-2xl p-3.5 border border-white/20 shadow-inner">
                          <div className="flex justify-between items-center text-xs font-bold kanit-text text-white/90 mb-1.5">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 size={13} className="text-emerald-300" />
                              ความคืบหน้าการใช้สิทธิ์
                            </span>
                            <span className="font-data font-black text-white drop-shadow-sm">
                              {batch.usedCount}/{batch.total} ใบ ({usedPercent}%)
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full h-2.5 bg-black/20 rounded-full overflow-hidden p-0.5 border border-white/15">
                            <div
                              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-white/80 via-white to-emerald-200 shadow-sm"
                              style={{ width: `${usedPercent}%` }}
                            />
                          </div>

                          {/* Status Counter Chips */}
                          <div className="grid grid-cols-3 gap-2 mt-3 pt-0.5">
                            <div className="py-1.5 px-2 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 text-center">
                              <div className="text-[10px] font-bold text-white/85 kanit-text">พร้อมใช้</div>
                              <div className="text-base md:text-lg font-black font-data text-white drop-shadow-sm">{batch.activeCount}</div>
                            </div>
                            <div className="py-1.5 px-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-center">
                              <div className="text-[10px] font-bold text-white/70 kanit-text">ใช้แล้ว</div>
                              <div className="text-base md:text-lg font-black font-data text-white/90 drop-shadow-sm">{batch.usedCount}</div>
                            </div>
                            <div className="py-1.5 px-2 rounded-xl bg-black/25 backdrop-blur-sm border border-white/15 text-center">
                              <div className="text-[10px] font-bold text-white/70 kanit-text">หมดอายุ</div>
                              <div className="text-base md:text-lg font-black font-data text-white/90 drop-shadow-sm">{batch.expiredCount}</div>
                            </div>
                          </div>
                        </div>

                        {/* Footer Action Buttons */}
                        <div className="flex items-center gap-2 pt-2 border-t border-white/20">
                          <button
                            type="button"
                            onClick={() => setActiveDrillDownBatch(batch)}
                            className="flex-1 py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-black kanit-text transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                          >
                            <Eye size={15} className="text-sky-600" />
                            <span>ดูคูปอง ({batch.total} ใบ)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPrintModalConfig({ coupons: batch.coupons, template: batch.templateType || 'card', batchTitle: batch.batchName })}
                            className="py-2.5 px-3.5 rounded-xl bg-black/30 hover:bg-black/45 text-white text-xs font-bold kanit-text transition-all flex items-center gap-1.5 border border-white/25 shadow-sm active:scale-95"
                            title="พิมพ์ / ส่งออก A4"
                          >
                            <Printer size={15} />
                            <span className="hidden sm:inline">พิมพ์ A4</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBatch(batch)}
                            className="p-2.5 rounded-xl bg-black/20 hover:bg-rose-600/80 text-white/80 hover:text-white border border-white/20 transition-colors active:scale-95"
                            title="ลบชุดนี้"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* --- INDIVIDUAL CARDS VIEW --- */
            filteredIndividualCoupons.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-3xl bg-slate-50 text-slate-300 flex items-center justify-center mb-3">
                  <Ticket size={32} />
                </div>
                <h4 className="text-base font-bold text-slate-700 kanit-text">ไม่พบคูปองเดี่ยว</h4>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredIndividualCoupons.map(cp => {
                  const qrUrl = qrCodeDataUrls[cp.code];
                  const isUsed = cp.status === 'used';
                  const isLifetime = Boolean(cp.isLifetime ?? cp.is_lifetime);
                  const expDate = cp.expireDate || cp.expire_date;
                  const discountText = (cp.discountType === 'percent' || cp.discount_type === 'percent')
                    ? `ลด ${cp.discountValue || cp.discount_value}%`
                    : `ลด ฿${Number(cp.discountValue || cp.discount_value).toLocaleString()}`;

                  return (
                    <div
                      key={cp.id}
                      className={`p-4 rounded-3xl border transition-all flex flex-col justify-between gap-3 relative overflow-hidden ${
                        isUsed ? 'bg-slate-50/80 border-slate-200' : 'bg-white border-slate-200/90 shadow-2xs hover:border-sky-300'
                      }`}
                    >
                      {/* Red Rubber Stamp Watermark for USED Coupons */}
                      {isUsed && (
                        <div className="absolute right-2 top-6 pointer-events-none transform rotate-[-20deg] z-10">
                          <div className="border-4 border-rose-500/80 bg-rose-500/10 text-rose-600 font-black text-sm px-3 py-1 rounded-lg uppercase tracking-widest shadow-sm">
                            USED / ใช้แล้ว
                          </div>
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-extrabold font-mono">
                              {cp.code}
                            </span>
                            {isUsed ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[9px] font-bold">
                                ใช้แล้ว ({formatDate(cp.usedAt || cp.used_at)})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold">
                                พร้อมใช้
                              </span>
                            )}
                          </div>
                          <h4 className="font-extrabold text-sm text-slate-800 kanit-text truncate mt-1.5">
                            {cp.title}
                          </h4>
                          <div className="text-xl font-black text-emerald-600 font-data">
                            {discountText}
                          </div>
                          {cp.patientName && (
                            <div className="text-[11px] text-sky-600 font-bold kanit-text mt-0.5">
                              👤 {cp.patientName} ({cp.patientId})
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400 font-data mt-1">
                            {isLifetime ? 'ตลอดชีพ' : `หมดอายุ: ${expDate || '-'}`}
                          </div>
                        </div>
                        {qrUrl && (
                          <div 
                            className="p-1 bg-white rounded-xl border border-slate-200 shadow-2xs shrink-0 cursor-pointer hover:border-sky-400 hover:ring-2 hover:ring-sky-100 hover:scale-105 transition-all group"
                            onClick={() => setPreviewCouponModal(cp)}
                            title="คลิกเพื่อดูตัวอย่างคูปองฉบับเต็มก่อนส่งลูกค้า"
                          >
                            <img src={qrUrl} alt={cp.code} className="w-14 h-14 object-contain group-hover:scale-105 transition-transform" />
                          </div>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-1">
                          {/* 1-Click Copy Image to Clipboard */}
                          <button
                            type="button"
                            onClick={() => handleCopyCouponImageToClipboard(cp)}
                            className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                            title="คัดลอกรูปภาพ (Copy to Clipboard) พร้อมวางใน LINE"
                          >
                            <Copy size={15} />
                          </button>
                          {/* Pre-composed Chat Message for LINE/Facebook */}
                          <button
                            type="button"
                            onClick={() => handleCopyChatMessage(cp)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="คัดลอกข้อความทักทายส่งลูกค้า (LINE / Facebook)"
                          >
                            <MessageSquare size={15} />
                          </button>
                          {/* Download High-Res PNG */}
                          <button
                            type="button"
                            onClick={() => handleDownloadSinglePng(cp)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="ดาวน์โหลดรูปภาพ PNG"
                          >
                            <Download size={15} />
                          </button>
                          {/* Print single card */}
                          <button
                            type="button"
                            onClick={() => setPrintModalConfig({ coupons: [cp], template: 'card', batchTitle: cp.code })}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="พิมพ์ใบนี้"
                          >
                            <Printer size={15} />
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isUsed ? (
                            <button
                              type="button"
                              onClick={() => handleUndoRedeemCoupon(cp)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold kanit-text transition-colors"
                              title="ยกเลิกการใช้ / คืนสิทธิ์"
                            >
                              คืนสิทธิ์
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRedeemCoupon(cp.code)}
                              className="px-2.5 py-1 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-[10px] font-bold kanit-text shadow-2xs transition-colors"
                            >
                              ตัดคูปอง
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteSingleCoupon(cp)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                            title="ลบคูปองนี้"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE COUPONS BATCH MODAL (Portal z-[200])                      */}
      {/* ========================================================================= */}
      {isCreateModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50 via-white to-indigo-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-sky-500/25 shrink-0">
                  <Ticket size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base sm:text-lg kanit-text leading-tight">
                    สร้างคูปองส่วนลดใหม่ (ผลิตเป็นชุด)
                  </h3>
                  <p className="text-xs text-slate-500 kanit-text">กำหนดสิทธิประโยชน์ วันหมดอายุ และสาขาที่ให้บริการ</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl text-xs font-bold kanit-text flex items-center gap-1.5 shadow-2xs transition-colors"
                  title="เลือกจากคลังแม่แบบ"
                >
                  <Bookmark size={13} />
                  <span className="hidden sm:inline">เลือกแม่แบบ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleCreateCoupons} className="flex flex-col flex-1 overflow-hidden min-h-0">
              {/* Scrollable Form Content */}
              <div className="overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-5 flex-1">
                {/* ส่วนที่ 1: ข้อมูลคูปองและมูลค่าส่วนลด */}
              <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/70 space-y-3.5">
                <div className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2.5">
                  <div className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center text-sky-600 shrink-0">
                    <Tag size={16} />
                  </div>
                  <h4 className="text-sm sm:text-base font-extrabold text-slate-800 kanit-text">
                    ส่วนที่ 1: ข้อมูลโปรโมชั่นและมูลค่าส่วนลด
                  </h4>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 kanit-text">
                    ชื่อคูปอง / ชื่อโปรโมชั่น <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น คูปองส่วนลดฉลองเปิดสาขาใหม่, คูปอง VIP ประจำเดือน"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 kanit-text">
                      จำนวนที่ผลิต (ใบ) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold font-data text-sky-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 kanit-text">ประเภทส่วนลด</label>
                    <CustomSelect
                      value={form.discountType}
                      onChange={(val) => setForm({ ...form, discountType: val })}
                      options={[
                        { value: 'percent', label: 'เปอร์เซ็นต์ (%)' },
                        { value: 'amount', label: 'จำนวนเงิน (บาท)' }
                      ]}
                      className="w-full bg-white border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 kanit-text">
                      มูลค่าส่วนลด ({form.discountType === 'percent' ? '%' : 'บาท'}) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={form.discountValue}
                      onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold font-data text-emerald-600 outline-none focus:border-sky-400 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 kanit-text">ยอดซื้อขั้นต่ำ (บาท)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 = ไม่มีขั้นต่ำในการใช้คูปอง"
                    value={form.minSpend || ''}
                    onChange={(e) => setForm({ ...form, minSpend: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-data outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              {/* ส่วนที่ 2: เงื่อนไขและสิทธิ์การใช้งาน */}
              <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/70 space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <ShieldCheck size={16} />
                  </div>
                  <h4 className="text-sm sm:text-base font-extrabold text-slate-800 kanit-text">
                    ส่วนที่ 2: เงื่อนไข อายุการใช้งาน และสาขาที่ให้บริการ
                  </h4>
                </div>

                {/* Expiry Date with Thai Calendar UX */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 kanit-text">
                      อายุการใช้งานคูปอง <span className="text-rose-500">*</span>
                    </label>
                    <div
                      className="flex items-center gap-2 select-none cursor-pointer"
                      onClick={() => setForm(prev => ({ ...prev, isLifetime: !prev.isLifetime }))}
                    >
                      <span className={`text-xs font-bold kanit-text transition-colors ${form.isLifetime ? 'text-amber-600' : 'text-slate-500'}`}>
                        ไม่มีวันหมดอายุ
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={form.isLifetime}
                        onClick={(e) => {
                          e.stopPropagation();
                          setForm(prev => ({ ...prev, isLifetime: !prev.isLifetime }));
                        }}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                          form.isLifetime ? 'bg-amber-500' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            form.isLifetime ? 'translate-x-4.5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {!form.isLifetime && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={handleOpenCalendar}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium cursor-pointer hover:border-sky-400 flex items-center justify-between shadow-2xs group text-left"
                      >
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-sky-600 group-hover:scale-110 transition-transform" />
                          <span className={form.expireDate ? 'font-bold text-slate-800 font-data' : 'text-slate-400'}>
                            {form.expireDate ? formatDate(form.expireDate) : 'กดเพื่อเลือกวันหมดอายุจากปฏิทิน'}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100 flex items-center gap-1">
                          <Calendar size={13} />
                          <span>เลือกปฏิทิน</span>
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Patient Link with Floating Dropdown Portal & Click Outside */}
                <div ref={patientInputContainerRef} className="relative z-20">
                  <label className="block text-xs font-bold text-slate-700 mb-1 kanit-text">
                    ผูกสิทธิ์กับคนไข้ <span className="text-slate-400 font-normal">(เว้นว่างไว้หากเป็นคูปองทั่วไป)</span>
                  </label>
                  <div className="relative">
                    {(() => {
                      const assignedPat = (patientsData || []).find(p => p && ((p.hn && p.hn === form.patientId) || (p.id && String(p.id) === String(form.patientId))));
                      const isAssignedVip = isPatientVipActive(assignedPat);
                      return (
                        <>
                          {isAssignedVip && (
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10 pointer-events-none">
                              <Crown size={15} className="text-amber-500 fill-amber-300" />
                            </div>
                          )}
                          <input
                            type="text"
                            placeholder="พิมพ์ชื่อ หรือ HN เพื่อค้นหาคนไข้..."
                            value={patientSearch || (form.patientName ? `${form.patientName} (${form.patientId})` : '')}
                            onChange={(e) => {
                              setPatientSearch(e.target.value);
                              setIsPatientDropdownOpen(true);
                              updateDropdownCoords();
                              if (!e.target.value) {
                                setForm(prev => ({ ...prev, patientId: '', patientName: '' }));
                              }
                            }}
                            onFocus={() => {
                              setIsPatientDropdownOpen(true);
                              updateDropdownCoords();
                            }}
                            onClick={() => {
                              setIsPatientDropdownOpen(true);
                              updateDropdownCoords();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') setIsPatientDropdownOpen(false);
                            }}
                            className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium outline-none transition-all ${
                              isAssignedVip
                                ? 'pl-9 bg-gradient-to-r from-amber-50 via-yellow-50/70 to-amber-50 border-2 border-amber-400 text-amber-950 font-bold ring-2 ring-amber-400/20'
                                : 'bg-white border border-slate-200 focus:border-sky-400 text-slate-800'
                            }`}
                          />
                          {form.patientId && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                              {isAssignedVip && (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-white kanit-text border border-amber-300 shadow-xs flex items-center gap-1">
                                  <Crown size={10} className="fill-amber-200 text-white" /> VIP
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setForm(prev => ({ ...prev, patientId: '', patientName: '' }));
                                  setPatientSearch('');
                                  setIsPatientDropdownOpen(false);
                                }}
                                className="text-slate-400 hover:text-rose-500 p-0.5"
                                title="ล้างคนไข้"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Multi-Branch Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 kanit-text">
                      สาขาที่สามารถใช้งานได้ <span className="text-slate-400 font-normal">(เลือกได้อิสระ)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, branchScope: 'all' }))}
                      className={`text-[11px] font-bold kanit-text px-2.5 py-0.5 rounded-full transition-all ${
                        (!form.branchScope || form.branchScope === 'all')
                          ? 'bg-sky-500 text-white shadow-2xs'
                          : 'bg-slate-200/80 text-slate-600 hover:bg-slate-300'
                      }`}
                    >
                      🌐 ใช้งานได้ทุกสาขา
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {(branchesData || []).map(b => {
                      const isAll = !form.branchScope || form.branchScope === 'all';
                      const selected = isBranchSelected(b.id);
                      const active = selected || isAll;
                      const branchTitle = b.name || b.branchName || b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => toggleBranch(b.id)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold kanit-text transition-all border ${
                            active
                              ? 'bg-sky-50 border-sky-300 text-sky-800 shadow-2xs ring-1 ring-sky-200'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span>{branchTitle}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ส่วนที่ 3: ดีไซน์และรูปแบบคูปอง */}
              <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/70 space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                    <Layers size={16} />
                  </div>
                  <h4 className="text-sm sm:text-base font-extrabold text-slate-800 kanit-text">
                    ส่วนที่ 3: รูปแบบและดีไซน์คูปอง
                  </h4>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, templateType: 'card' })}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      form.templateType === 'card'
                        ? 'border-sky-500 bg-sky-50/70 ring-2 ring-sky-300 shadow-2xs font-bold'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Ticket size={18} className="text-sky-600 mb-1" />
                    <div className="text-xs font-bold kanit-text text-slate-800">บัตรพรีเมียม</div>
                    <div className="text-[10px] text-slate-400 font-data">85.6 × 54 mm (10/A4)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, templateType: 'strip' })}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      form.templateType === 'strip'
                        ? 'border-sky-500 bg-sky-50/70 ring-2 ring-sky-300 shadow-2xs font-bold'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Scissors size={18} className="text-emerald-600 mb-1" />
                    <div className="text-xs font-bold kanit-text text-slate-800">แถบยาวมีรอยฉีก</div>
                    <div className="text-[10px] text-slate-400 font-data">200 × 54 mm (5/A4)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, templateType: 'custom_image' })}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      form.templateType === 'custom_image'
                        ? 'border-purple-500 bg-purple-50/70 ring-2 ring-purple-300 shadow-2xs font-bold'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <ImageIcon size={18} className="text-purple-600 mb-1" />
                    <div className="text-xs font-bold kanit-text text-slate-800">อัปโหลดดีไซน์เอง</div>
                    <div className="text-[10px] text-slate-400 font-data">Canva / Photoshop</div>
                  </button>
                </div>

                {/* Custom Artwork Upload & Visual Story Editor */}
                {form.templateType === 'custom_image' ? (
                  <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-bold text-purple-900 kanit-text flex items-center gap-2">
                        <ImageIcon size={16} className="text-purple-600" />
                        <span>อัพโหลดรูป</span>
                      </span>

                      <div className="flex items-center gap-2">
                        {isUploadingArtwork && (
                          <span className="text-xs text-purple-600 animate-pulse font-bold kanit-text">
                            กำลังอัปโหลด...
                          </span>
                        )}
                        <input
                          ref={artworkFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleCustomArtworkUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => artworkFileInputRef.current?.click()}
                          className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs kanit-text shadow-sm transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                        >
                          <Upload size={13} />
                          <span>UPLOAD</span>
                        </button>
                      </div>
                    </div>

                    <div className="pt-1 flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!form.customImageUrl) {
                            setForm(prev => ({ ...prev, customImageUrl: DEFAULT_SAMPLE_VOUCHER_ART }));
                          }
                          setIsQrEditorOpen(true);
                        }}
                        className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-xs sm:text-sm kanit-text shadow-md shadow-sky-500/25 flex items-center justify-center gap-2 transition-all active:scale-98"
                      >
                        <Sliders size={16} />
                        <span>🛠 เปิดเครื่องมือสร้าง QR & บาร์โค้ด (จัดวางตำแหน่ง)</span>
                      </button>

                      {!form.customImageUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setForm(prev => ({ ...prev, customImageUrl: DEFAULT_SAMPLE_VOUCHER_ART }));
                          }}
                          className="py-3 px-3.5 rounded-xl border border-sky-300 bg-white hover:bg-sky-50 text-sky-700 font-bold text-xs kanit-text transition-all shrink-0 shadow-2xs"
                        >
                          🎨 ลองใช้ภาพตัวอย่าง
                        </button>
                      )}
                    </div>

                    {form.customImageUrl && (
                      <div className="space-y-3 pt-2">
                        {/* Full Size Live Preview (สัดส่วนจริงเต็มใบ - คลิกเพื่อเปิดเครื่องมือเต็มจอ) */}
                        <div
                          onClick={() => setIsQrEditorOpen(true)}
                          className="p-3 sm:p-4 bg-white rounded-2xl border border-sky-100 flex flex-col items-center cursor-pointer hover:border-sky-300 hover:shadow-md transition-all group"
                          title="คลิกเพื่อเปิดเครื่องมือจัดตำแหน่งแบบเต็มจอ"
                        >
                          <div className="text-xs font-bold text-slate-700 kanit-text mb-2.5 self-start flex items-center justify-between w-full">
                            <span className="flex items-center gap-1.5 text-sky-700">
                              <Eye size={14} className="text-sky-600" />
                              <span>พรีวิวคูปองสัดส่วนจริง (คลิกที่ภาพเพื่อจัดวางตำแหน่ง):</span>
                            </span>
                            <span className="text-xs text-sky-600 group-hover:underline flex items-center gap-0.5 font-bold">
                              <span>คลิกแก้ไขตำแหน่ง</span>
                              <ChevronRight size={13} />
                            </span>
                          </div>
                          <div className="relative w-full max-w-full rounded-xl overflow-hidden border border-slate-300/80 bg-slate-900 shadow-sm flex items-center justify-center">
                            <img
                              src={form.customImageUrl}
                              alt="Voucher Preview"
                              className="w-full max-h-72 sm:max-h-96 object-contain block pointer-events-none select-none"
                            />

                            {/* 1. Mini Preview Code Sticker (QR or Barcode) */}
                            <div
                              className={`absolute ${form.qrConfig.whiteBg ? 'bg-white shadow-md' : 'bg-transparent'} rounded-md flex flex-col items-center justify-center`}
                              style={{
                                left: `${form.qrConfig.xPercent}%`,
                                top: `${form.qrConfig.yPercent}%`,
                                width: `${form.qrConfig.sizePercent}%`,
                                maxWidth: `${form.qrConfig.sizePercent}%`,
                                transform: 'translate(-50%, -50%)',
                                boxSizing: 'border-box',
                                padding: form.qrConfig.whiteBg ? '3.5%' : '0px',
                                minWidth: 0
                              }}
                            >
                              {form.qrConfig.codeType === 'barcode' ? (
                                <Barcode className="w-full h-4 sm:h-5 text-slate-900" />
                              ) : (
                                <QrCode className="w-full h-full text-slate-900" />
                              )}
                              {form.qrConfig.showCode && (
                                <span
                                  className={`font-mono leading-none tracking-wider font-semibold block truncate max-w-full text-center ${
                                    form.qrConfig.codeBgStyle === 'white_pill'
                                      ? 'bg-white/95 border border-slate-200 shadow-2xs'
                                      : form.qrConfig.codeBgStyle === 'dark_pill'
                                      ? 'bg-slate-900/90 text-white border border-slate-700 shadow-2xs'
                                      : 'bg-transparent'
                                  }`}
                                  style={{
                                    fontSize: `${Math.max(6, Math.min(16, Math.round(9 * ((form.qrConfig.codeFontSize ?? 10) / 10))))}px`,
                                    marginTop: `${Math.max(0, ((form.qrConfig.codeDistance ?? 3.5) * 0.7))}px`,
                                    padding: form.qrConfig.codeBgStyle !== 'none' ? '1px 5px' : '0',
                                    borderRadius: '9999px',
                                    color: form.qrConfig.codeBgStyle === 'dark_pill'
                                      ? '#ffffff'
                                      : (form.qrConfig.codeColor || (form.qrConfig.whiteBg ? '#0f172a' : '#ffffff'))
                                  }}
                                >
                                  CP-SAMPLE
                                </span>
                              )}
                            </div>

                            {/* 2. Mini Preview Expiry Date Sticker */}
                            {form.expiryConfig.enabled !== false && (
                              <div
                                className={`absolute select-none pointer-events-none flex items-center justify-center ${
                                  form.expiryConfig.bgStyle === 'white_pill'
                                    ? 'bg-white/95 text-slate-900 border border-slate-200 rounded-full shadow-xs'
                                    : form.expiryConfig.bgStyle === 'dark_pill'
                                    ? 'bg-slate-900/90 text-white border border-slate-700 rounded-full shadow-xs'
                                    : 'bg-transparent'
                                }`}
                                style={{
                                  left: `${form.expiryConfig.xPercent}%`,
                                  top: `${form.expiryConfig.yPercent}%`,
                                  transform: 'translate(-50%, -50%)',
                                  boxSizing: 'border-box',
                                  padding: form.expiryConfig.bgStyle !== 'none' ? '2px 7px' : '1px'
                                }}
                              >
                                <span
                                  className="whitespace-nowrap leading-none select-none drop-shadow-xs"
                                  style={{
                                    fontFamily: getExpiryFontFamily(form.expiryConfig.fontFamily),
                                    fontSize: `${Math.max(9, Math.round((form.expiryConfig.sizePercent || 18) * 0.7))}px`,
                                    fontWeight: form.expiryConfig.fontWeight === 'normal' ? 400 : 300,
                                    color: form.expiryConfig.bgStyle === 'dark_pill' ? '#ffffff' : form.expiryConfig.color
                                  }}
                                >
                                  {formatCustomExpiryDate(form.expireDate, form.expiryConfig.format, form.isLifetime, form.expiryConfig.prefix)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 kanit-text">เลือกโทนสีการ์ด</label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {Object.values(THEME_STYLES).map(th => (
                        <button
                          key={th.id}
                          type="button"
                          onClick={() => setForm({ ...form, themeColor: th.id })}
                          className={`p-2.5 rounded-xl border text-center transition-all bg-white ${
                            form.themeColor === th.id
                              ? 'border-sky-500 ring-2 ring-sky-300 shadow-2xs font-bold'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className={`w-full h-4 rounded-md bg-gradient-to-r ${th.bg} mb-1.5`} />
                          <span className="text-[10px] font-bold kanit-text block truncate text-slate-700">{th.id.toUpperCase()}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              </div>

              {/* Modal Full-Width Fixed Footer (ชิดขอบล่างและข้าง 100%) */}
              <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between gap-2.5 sm:gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleSaveAsTemplate}
                  className="px-3 sm:px-3.5 py-2.5 rounded-xl border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold kanit-text text-xs flex items-center gap-1.5 transition-colors bg-white shadow-2xs whitespace-nowrap shrink-0"
                  title="บันทึกข้อมูลและดีไซน์นี้เป็นแม่แบบ"
                >
                  <Bookmark size={14} className="shrink-0" />
                  <span className="hidden sm:inline">บันทึกเป็นแม่แบบใหม่</span>
                  <span className="sm:hidden">แม่แบบ</span>
                </button>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-3 sm:px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold kanit-text text-xs hover:bg-slate-100 transition-colors bg-white shadow-2xs whitespace-nowrap shrink-0"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-4 sm:px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold kanit-text text-xs shadow-md shadow-sky-500/25 transition-all active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Check size={16} className="shrink-0" />
                    <span>สร้างชุดคูปอง ({form.quantity} ใบ)</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* RUNNING PROGRESS POPUP (PORTAL z-[300]) - แท็บวิ่งๆ แจ้งเตือนสถานะการสร้างคูปอง */}
      {/* ========================================================================= */}
      {createProgress && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-md animate-in fade-in duration-200">
          <style>{`
            @keyframes couponStripesMove {
              0% { background-position: 0 0; }
              100% { background-position: 28px 0; }
            }
            @keyframes shimmerSweep {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(250%); }
            }
          `}</style>
          <div className="relative max-w-sm sm:max-w-md w-full bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 text-center overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Top decorative active gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky-400 via-indigo-500 to-sky-400" />

            {/* Glowing Icon Header */}
            {createProgress.status === 'completed' ? (
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20 animate-in zoom-in duration-300">
                <CheckCircle2 size={36} className="text-emerald-600" />
              </div>
            ) : (
              <div className="relative w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <div className="absolute inset-0 rounded-2xl bg-sky-500/25 blur-lg animate-pulse" />
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/30 relative">
                  <Sparkles size={28} className="animate-spin" style={{ animationDuration: '4s' }} />
                </div>
              </div>
            )}

            {/* Title & Info */}
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-800 kanit-text tracking-tight">
              {createProgress.status === 'completed' ? 'สร้างคูปองสำเร็จเรียบร้อย!' : 'กำลังสร้างชุดคูปอง...'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 truncate px-3">
              ชื่อชุด: <span className="font-bold text-slate-700">{createProgress.title}</span>
            </p>

            {/* Animated Progress Bar ("แท็บวิ่งๆ") */}
            <div className="mt-5 w-full">
              <div className="w-full bg-slate-100 rounded-full h-5 sm:h-6 p-1 border border-slate-200/90 shadow-inner relative overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-sky-400 transition-all duration-300 relative overflow-hidden flex items-center"
                  style={{ width: `${Math.max(6, createProgress.percent)}%` }}
                >
                  {/* Moving Stripes ("แท็บวิ่งๆ") */}
                  {createProgress.status !== 'completed' && (
                    <div
                      className="absolute inset-0 w-full h-full opacity-45 pointer-events-none"
                      style={{
                        backgroundImage:
                          'linear-gradient(45deg, rgba(255,255,255,0.45) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0.45) 75%, transparent 75%, transparent)',
                        backgroundSize: '28px 28px',
                        animation: 'couponStripesMove 0.8s linear infinite'
                      }}
                    />
                  )}
                  {/* Shimmer Light Bar */}
                  <div
                    className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none"
                    style={{ animation: 'shimmerSweep 1.8s ease-in-out infinite' }}
                  />
                </div>
              </div>

              {/* Progress Count & Percentage */}
              <div className="flex items-center justify-between text-xs mt-2.5 px-1 font-bold">
                <span className="text-slate-500 font-data kanit-text">
                  {createProgress.status === 'completed'
                    ? 'เสร็จสิ้นทั้งหมด'
                    : `กำลังผลิตใบที่ ${createProgress.current} จาก ${createProgress.total} ใบ`}
                </span>
                <span className="text-sky-600 font-data text-sm font-extrabold">
                  {createProgress.percent}%
                </span>
              </div>
            </div>

            {/* Status Detail & Advice */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500 kanit-text">
              {createProgress.status === 'completed' ? (
                <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                  <Check size={14} className="stroke-[3]" /> บันทึกข้อมูลคูปองทั้งหมดลงสู่ระบบเรียบร้อยแล้ว
                </span>
              ) : (
                <>
                  <Loader2 size={13} className="animate-spin text-sky-500 shrink-0" />
                  <span className="truncate">ระบบกำลังบันทึกข้อมูล กรุณาอย่าเพิ่งปิดหน้านี้</span>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* FLOATING PATIENT DROPDOWN PORTAL (Portal z-[260]) - NO CLIPPING IN MODAL  */}
      {/* ========================================================================= */}
      {isCreateModalOpen && isPatientDropdownOpen && filteredPatients.length > 0 && typeof document !== 'undefined' && createPortal(
        <div
          ref={patientPortalRef}
          style={{
            position: 'fixed',
            top: `${dropdownCoords.top}px`,
            left: `${dropdownCoords.left}px`,
            width: `${dropdownCoords.width}px`,
            zIndex: 260
          }}
          className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-h-56 overflow-y-auto custom-scrollbar p-1.5 animate-in fade-in zoom-in-95 duration-100"
        >
          {filteredPatients.map(p => {
            const isVip = isPatientVipActive(p);
            const pName = p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim();
            const patHn = p.hn || p.id;
            return (
              <div
                key={p.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setForm(prev => ({ ...prev, patientId: patHn, patientName: pName }));
                  setPatientSearch(`${pName} (${patHn})`);
                  setIsPatientDropdownOpen(false);
                }}
                className={`p-2.5 rounded-xl cursor-pointer flex items-center justify-between text-xs transition-colors mb-1 ${
                  isVip
                    ? 'bg-gradient-to-r from-amber-100/80 via-yellow-50 to-amber-100/70 hover:from-amber-200 hover:to-amber-200/90 border border-amber-300 text-amber-950 font-bold'
                    : 'hover:bg-sky-50 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  {isVip && <Crown size={14} className="text-amber-500 fill-amber-300 shrink-0" />}
                  <span className="font-bold truncate">{pName}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isVip && (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-500 text-white kanit-text">
                      VIP
                    </span>
                  )}
                  <span className={isVip ? 'font-mono text-amber-900 font-bold' : 'font-mono text-sky-600 font-bold'}>
                    {patHn}
                  </span>
                </div>
              </div>
            );
          })}
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* THAI CALENDAR MODAL FOR EXPIRY DATE (Portal z-[250])                       */}
      {/* ========================================================================= */}
      {isCalendarOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setIsCalendarOpen(false)} />
          <div className="relative z-10 w-full max-w-[340px] bg-white rounded-3xl border border-slate-100 p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Calendar Header with Navigation */}
            <div className="flex justify-between items-center mb-3">
              <button
                type="button"
                onClick={() => {
                  if (calView === 'days') setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1));
                  else if (calView === 'months') setCalDate(new Date(calDate.getFullYear() - 1, calDate.getMonth(), 1));
                  else setCalYearPageStart(y => y - 12);
                }}
                className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-colors"
              >
                <ChevronLeft size={18} />
              </button>

              <button
                type="button"
                onClick={() => setCalView(calView === 'days' ? 'months' : calView === 'months' ? 'years' : 'days')}
                className="font-bold text-slate-800 hover:text-sky-600 px-3 py-1 rounded-xl hover:bg-slate-50 transition-colors text-sm kanit-text"
              >
                {calView === 'days' && `${THAI_MONTHS[calDate.getMonth()]} ${calDate.getFullYear() + 543}`}
                {calView === 'months' && `${calDate.getFullYear() + 543}`}
                {calView === 'years' && `${calYearPageStart} - ${calYearPageStart + 11}`}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (calView === 'days') setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1));
                  else if (calView === 'months') setCalDate(new Date(calDate.getFullYear() + 1, calDate.getMonth(), 1));
                  else setCalYearPageStart(y => y + 12);
                }}
                className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Days View */}
            {calView === 'days' && (
              <>
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d, i) => (
                    <div key={d} className={`text-[11px] font-bold kanit-text py-0.5 ${i === 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1 text-center">
                  {Array.from({ length: new Date(calDate.getFullYear(), calDate.getMonth(), 1).getDay() }).map((_, i) => (
                    <div key={`blank-${i}`} className="w-8 h-8 mx-auto" />
                  ))}
                  {Array.from({ length: new Date(calDate.getFullYear(), calDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                    const day = i + 1;
                    const isSelected = selectedCalDate && selectedCalDate.getDate() === day && selectedCalDate.getMonth() === calDate.getMonth() && selectedCalDate.getFullYear() === calDate.getFullYear();
                    const isToday = new Date().getDate() === day && new Date().getMonth() === calDate.getMonth() && new Date().getFullYear() === calDate.getFullYear();

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setSelectedCalDate(new Date(calDate.getFullYear(), calDate.getMonth(), day))}
                        className={`w-8 h-8 mx-auto rounded-xl flex items-center justify-center text-xs font-semibold font-data transition-all ${
                          isSelected
                            ? 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/30'
                            : isToday
                            ? 'bg-sky-50 text-sky-600 font-bold border border-sky-200'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Months View */}
            {calView === 'months' && (
              <div className="grid grid-cols-3 gap-2 py-2">
                {THAI_MONTHS_SHORT.map((m, idx) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setCalDate(new Date(calDate.getFullYear(), idx, 1));
                      setCalView('days');
                    }}
                    className={`py-3 rounded-xl text-xs font-bold kanit-text transition-colors ${
                      calDate.getMonth() === idx ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}

            {/* Years View */}
            {calView === 'years' && (
              <div className="grid grid-cols-3 gap-2 py-2">
                {Array.from({ length: 12 }, (_, i) => calYearPageStart + i).map(yearBE => (
                  <button
                    key={yearBE}
                    type="button"
                    onClick={() => {
                      setCalDate(new Date(yearBE - 543, calDate.getMonth(), 1));
                      setCalView('months');
                    }}
                    className={`py-3 rounded-xl text-xs font-bold font-data transition-colors ${
                      calDate.getFullYear() + 543 === yearBE ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {yearBE}
                  </button>
                ))}
              </div>
            )}

            {/* Quick Presets */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 mb-1.5 kanit-text">ทางลัดยอดนิยม:</div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: '+30 วัน', days: 30 },
                  { label: '+90 วัน', days: 90 },
                  { label: '+6 เดือน', days: 180 },
                  { label: '+1 ปี', days: 365 }
                ].map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      const target = new Date();
                      target.setDate(target.getDate() + p.days);
                      setCalDate(target);
                      setSelectedCalDate(target);
                      setCalView('days');
                    }}
                    className="py-1 px-1 rounded-lg bg-slate-50 hover:bg-sky-50 hover:text-sky-700 border border-slate-200 text-[10px] font-bold kanit-text text-slate-600 transition-colors text-center"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsCalendarOpen(false)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 kanit-text"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedCalDate) {
                    const yyyy = selectedCalDate.getFullYear();
                    const mm = String(selectedCalDate.getMonth() + 1).padStart(2, '0');
                    const dd = String(selectedCalDate.getDate()).padStart(2, '0');
                    setForm(prev => ({ ...prev, expireDate: `${yyyy}-${mm}-${dd}`, isLifetime: false }));
                  }
                  setIsCalendarOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold kanit-text shadow-md shadow-sky-500/20"
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* INSTAGRAM STORY STYLE POSITIONING MODAL (Full Screen, High FPS)           */}
      {/* ========================================================================= */}
      <StoryArtworkEditorModal
        isOpen={isQrEditorOpen}
        onClose={() => setIsQrEditorOpen(false)}
        onSave={({ qrConfig, expiryConfig, customImageUrl, designConfig }) => {
          setForm(prev => {
            const updated = {
              ...prev,
              qrConfig,
              expiryConfig,
              customImageUrl: customImageUrl || prev.customImageUrl,
              designConfig,
              templateType: 'custom_image'
            };
            if (designConfig?.headerText) {
              updated.title = designConfig.headerText;
            }
            if (designConfig?.discountText) {
              const numMatch = designConfig.discountText.match(/\d+/);
              if (numMatch) {
                const parsedVal = Number(numMatch[0]);
                if (parsedVal > 0) updated.discountValue = parsedVal;
              }
            }
            return updated;
          });
          showToast('บันทึกดีไซน์คูปองและตำแหน่ง QR Code เรียบร้อยแล้ว', 'success');
        }}
        initialQrConfig={form.qrConfig}
        initialExpiryConfig={form.expiryConfig}
        initialDesignConfig={form.designConfig}
        uploadedArtworkUrl={form.userUploadedImage}
        expireDate={form.expireDate}
        isLifetime={form.isLifetime}
        clinicInfo={resolveBranchInfo(branchesData, form.branchScope)}
        initialCouponTitle={form.title}
        initialDiscountLabel={form.discountType === 'percent' ? `ลด ${form.discountValue}%` : `ลด ฿${Number(form.discountValue || 0).toLocaleString()}`}
        initialTerms={form.minSpend > 0 ? `* เมื่อมียอดใช้จ่ายตั้งแต่ ฿${Number(form.minSpend).toLocaleString()} ขึ้นไป` : '* สามารถใช้ได้กับทุกบริการและการรักษา'}
        themeColor={form.themeColor}
      />

      {/* ========================================================================= */}
      {/* MODAL 2: SUPABASE TEMPLATE LIBRARY MODAL (Limit 10 + Load More)           */}
      {/* ========================================================================= */}
      {isTemplateModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-3.5 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50/40">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                  <Bookmark size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base kanit-text">
                    คลังแม่แบบคูปอง (Coupon Templates)
                  </h3>
                  <p className="text-xs text-slate-500 kanit-text">เลือกแม่แบบเพื่อสร้างคูปองได้อย่างรวดเร็วใน 1 คลิก</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-100">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อแม่แบบพรีเซ็ต..."
                  value={templateSearchTerm}
                  onChange={(e) => setTemplateSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            {/* Templates List */}
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-3">
              {templatesList.length === 0 ? (
                <div className="text-center py-12 text-slate-400 kanit-text text-xs">
                  ไม่พบแม่แบบที่ค้นหา
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {templatesList.map(tpl => {
                    const d = tpl.details || {};
                    const isPercent = d.discountType === 'percent';
                    const discountStr = isPercent ? `ลด ${d.discountValue}%` : `ลด ฿${Number(d.discountValue || 0).toLocaleString()}`;
                    const th = THEME_STYLES[d.themeColor] || THEME_STYLES.emerald;

                    return (
                      <div
                        key={tpl.id}
                        className="p-4 rounded-2xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all bg-white flex flex-col justify-between gap-3 group"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                              {d.templateType === 'strip' ? 'แถบยาว 200mm' : 'การ์ด 85.6mm'}
                            </span>
                            <div className={`w-3.5 h-3.5 rounded-full bg-gradient-to-r ${th.bg}`} />
                          </div>
                          <h4 className="font-bold text-sm text-slate-800 kanit-text group-hover:text-indigo-600 transition-colors">
                            {tpl.name}
                          </h4>
                          <p className="text-xs text-slate-500 font-light mt-0.5 line-clamp-1">
                            {d.description || d.title}
                          </p>
                          <div className="text-lg font-black text-emerald-600 font-data mt-2">
                            {discountStr}
                            {d.minSpend > 0 && (
                              <span className="text-[10px] text-slate-400 font-normal kanit-text ml-2">
                                (ขั้นต่ำ ฿{Number(d.minSpend).toLocaleString()})
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setForm(prev => ({
                              ...prev,
                              title: d.title || tpl.name,
                              description: d.description || '',
                              discountType: d.discountType || 'percent',
                              discountValue: d.discountValue || 10,
                              minSpend: d.minSpend || 0,
                              isLifetime: Boolean(d.isLifetime),
                              templateType: d.templateType || 'card',
                              themeColor: d.themeColor || 'emerald',
                              customImageUrl: d.customImageUrl || '',
                              qrConfig: d.qrConfig || prev.qrConfig,
                              expiryConfig: d.expiryConfig || prev.expiryConfig
                            }));
                            setIsTemplateModalOpen(false);
                            setIsCreateModalOpen(true);
                            showToast(`เลือกใช้แม่แบบ "${tpl.name}" เรียบร้อย`, 'success');
                          }}
                          className="w-full py-2 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 rounded-xl text-xs font-bold kanit-text transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <span>เลือกใช้แม่แบบนี้</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Infinite Scroll / Load More Button (ทีละ 10 แบบ) */}
              {hasMoreTemplates && (
                <div className="pt-3 text-center">
                  <button
                    type="button"
                    disabled={isLoadingTemplates}
                    onClick={() => fetchTemplates(templatePage + 1, true)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold kanit-text transition-all flex items-center gap-1.5 mx-auto"
                  >
                    {isLoadingTemplates ? (
                      <RefreshCw size={14} className="animate-spin text-slate-500" />
                    ) : (
                      <Plus size={14} />
                    )}
                    <span>ดูเพิ่มเติม (โหลดทีละ 10 แบบ)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 kanit-text">
              <span>💡 แม่แบบพรีเซ็ตจะบันทึกไว้ใช้งานได้ตลอดเวลา</span>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold kanit-text text-xs"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DRILL-DOWN BATCH DETAIL MODAL (Portal z-[200])                   */}
      {/* ========================================================================= */}
      {currentDrillDownBatch && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3.5 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50 to-indigo-50/40 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base sm:text-lg kanit-text">
                    {currentDrillDownBatch.batchName} ({currentDrillDownBatch.coupons.length} ใบ)
                  </h3>
                  <p className="text-xs text-slate-500 kanit-text">
                    ส่วนลด: {currentDrillDownBatch.discountType === 'percent' ? `${currentDrillDownBatch.discountValue}%` : `฿${currentDrillDownBatch.discountValue}`} • วันหมดอายุ: {currentDrillDownBatch.isLifetime ? 'ตลอดชีพ' : currentDrillDownBatch.expireDate}
                  </p>
                </div>
              </div>

              {(() => {
                const selectedInBatch = (currentDrillDownBatch.coupons || []).filter(cp => selectedCouponIdsToPrint[cp.id]);
                const isAllSelected = currentDrillDownBatch.coupons.length > 0 && selectedInBatch.length === currentDrillDownBatch.coupons.length;

                return (
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCouponIdsToPrint(prev => {
                          const next = { ...prev };
                          if (isAllSelected) {
                            currentDrillDownBatch.coupons.forEach(c => { delete next[c.id]; });
                          } else {
                            currentDrillDownBatch.coupons.forEach(c => { next[c.id] = true; });
                          }
                          return next;
                        });
                      }}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-white text-slate-700 text-xs font-bold kanit-text transition-all shadow-2xs"
                    >
                      {isAllSelected ? 'ล้างการเลือก' : 'เลือกทั้งหมด'}
                    </button>

                    {selectedInBatch.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setPrintModalConfig({
                          coupons: selectedInBatch,
                          template: currentDrillDownBatch.templateType || 'card',
                          batchTitle: `${currentDrillDownBatch.batchName} (${selectedInBatch.length} ใบที่เลือก)`
                        })}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold kanit-text shadow-sm flex items-center gap-1.5 transition-all animate-in fade-in"
                      >
                        <Printer size={14} />
                        <span>พิมพ์เฉพาะ {selectedInBatch.length} ใบที่เลือก (A4)</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setPrintModalConfig({ coupons: currentDrillDownBatch.coupons, template: currentDrillDownBatch.templateType || 'card', batchTitle: currentDrillDownBatch.batchName })}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold kanit-text shadow-sm flex items-center gap-1.5 transition-all"
                    >
                      <Printer size={14} />
                      <span>พิมพ์ทั้งชุด ({currentDrillDownBatch.coupons.length} ใบ)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveDrillDownBatch(null)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white"
                    >
                      <X size={20} />
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* Coupons Grid Inside Batch */}
            <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {currentDrillDownBatch.coupons.map((cp, idx) => {
                  const qrUrl = qrCodeDataUrls[cp.code];
                  const isUsed = cp.status === 'used' || Boolean(cp.isUsed || cp.is_used);
                  const isChecked = Boolean(selectedCouponIdsToPrint[cp.id]);

                  return (
                    <div 
                      key={cp.id} 
                      onClick={() => {
                        setSelectedCouponIdsToPrint(prev => ({ ...prev, [cp.id]: !prev[cp.id] }));
                      }}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 relative overflow-hidden cursor-pointer ${
                        isChecked ? 'ring-2 ring-sky-500 border-sky-400 bg-sky-50/20' : ''
                      } ${
                        isUsed ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200/90 shadow-2xs hover:border-sky-300'
                      }`}
                    >
                      {/* Red stamp if used */}
                      {isUsed && (
                        <div className="absolute right-2 top-4 pointer-events-none transform rotate-[-20deg]">
                          <span className="border-2 border-rose-500 bg-rose-50 text-rose-600 font-black text-[9px] px-2 py-0.5 rounded">
                            USED
                          </span>
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              e.stopPropagation();
                              setSelectedCouponIdsToPrint(prev => ({ ...prev, [cp.id]: !prev[cp.id] }));
                            }}
                            className="mt-0.5 w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer border-slate-300"
                            title="ติ๊กเลือกสำหรับพิมพ์"
                          />
                          <div>
                            <span className="text-[10px] font-bold text-slate-400">ใบที่ {idx + 1}</span>
                            <div className="font-mono font-extrabold text-xs text-slate-800 tracking-wider">
                              {cp.code}
                            </div>
                            {cp.patientName && (
                              <div className="text-[11px] text-sky-600 font-bold kanit-text mt-0.5">
                                {cp.patientName}
                              </div>
                            )}
                          </div>
                        </div>
                        {qrUrl && (
                          <img
                            src={qrUrl}
                            alt={cp.code}
                            className="w-12 h-12 rounded-lg border p-0.5 bg-white shrink-0 cursor-pointer hover:border-sky-400 hover:ring-2 hover:ring-sky-100 hover:scale-105 transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewCouponModal(cp);
                            }}
                            title="คลิกเพื่อดูตัวอย่างคูปองฉบับเต็มก่อนส่งลูกค้า"
                          />
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyCouponImageToClipboard(cp);
                            }}
                            className="p-1 text-slate-400 hover:text-sky-600 rounded transition-colors"
                            title="คัดลอกรูปภาพ (Ctrl+V ส่งใน LINE)"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyChatMessage(cp);
                            }}
                            className="p-1 text-slate-400 hover:text-emerald-600 rounded transition-colors"
                            title="คัดลอกข้อความทักทายส่งลูกค้า (LINE / Facebook)"
                          >
                            <MessageSquare size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadSinglePng(cp);
                            }}
                            className="p-1 text-slate-400 hover:text-emerald-600 rounded transition-colors"
                            title="ดาวน์โหลด PNG"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPrintModalConfig({ coupons: [cp], template: 'card', batchTitle: cp.code });
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                            title="พิมพ์ใบนี้"
                          >
                            <Printer size={14} />
                          </button>
                        </div>

                        {isUsed ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUndoRedeemCoupon(cp);
                            }}
                            className="text-[10px] text-amber-700 bg-amber-50 hover:bg-amber-100 font-bold px-2 py-0.5 rounded border border-amber-200"
                          >
                            คืนสิทธิ์
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRedeemCoupon(cp.code);
                            }}
                            className="text-[10px] text-white bg-sky-500 hover:bg-sky-600 font-bold px-2 py-0.5 rounded"
                          >
                            ตัดคูปอง
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 kanit-text">
              <span>ชุดคูปอง ID: {currentDrillDownBatch.batchId}</span>
              <button
                type="button"
                onClick={() => setActiveDrillDownBatch(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold kanit-text"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: PRINT & SHEET EXPORT MODAL (Portal z-[200])                      */}
      {/* ========================================================================= */}
      {printModalConfig && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50 to-indigo-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-800 text-white flex items-center justify-center">
                  <Printer size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base kanit-text">เลือกเทมเพลตสั่งพิมพ์ (A4)</h3>
                  <p className="text-xs text-slate-500 kanit-text">พิมพ์คูปองจำนวน {printModalConfig.coupons.length} ใบ (ขอบตัดตรง 100%)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPrintModalConfig(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Template Choices */}
            <div className="p-5 space-y-3.5">
              {/* Option 1: Card 10 cards/page */}
              <button
                type="button"
                onClick={() => setPrintModalConfig(prev => prev ? ({ ...prev, template: 'card' }) : null)}
                className={`w-full text-left p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                  printModalConfig.template === 'card'
                    ? 'border-sky-500 bg-sky-50/60 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${printModalConfig.template === 'card' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Ticket size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-sm text-slate-800 kanit-text">
                      เทมเพลต 1: ขนาดบัตรเครดิตพรีเมียม (10 ใบ/หน้า A4)
                    </h4>
                    <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[10px] font-extrabold kanit-text">
                      ประหยัดกระดาษสุด
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 kanit-text mt-1">
                    ขนาด 85.6 mm × 54 mm (ตาราง 2 คอลัมน์ × 5 แถว) ขอบฉากตรง 100% พร้อมเส้นมาร์กตัดมุม 0.3px บางเฉียบ
                  </p>
                </div>
              </button>

              {/* Option 2: Strip 5 cards/page */}
              <button
                type="button"
                onClick={() => setPrintModalConfig(prev => prev ? ({ ...prev, template: 'strip' }) : null)}
                className={`w-full text-left p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                  printModalConfig.template === 'strip'
                    ? 'border-sky-500 bg-sky-50/60 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${printModalConfig.template === 'strip' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Scissors size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-sm text-slate-800 kanit-text">
                      เทมเพลต 2: แถบยาวเต็มความกว้าง A4 (5 ใบ/หน้า A4)
                    </h4>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-extrabold kanit-text">
                      ตัดง่ายสุด
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 kanit-text mt-1">
                    ขนาด 200 mm × 54 mm มีเส้นประรอยฉีกสำหรับหางตั๋วคูปอง ตัดขวางแนวนอนเพียง 4 ฉับเสร็จสิ้น
                  </p>
                </div>
              </button>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPrintModalConfig(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold kanit-text text-xs hover:bg-white"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetCoupons = printModalConfig.coupons;
                  const targetTemplate = printModalConfig.template;
                  setPrintModalConfig(null);
                  triggerA4Print(targetCoupons, targetTemplate);
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold kanit-text text-xs shadow-md shadow-slate-900/10 flex items-center gap-2 active:scale-95"
              >
                <Printer size={16} />
                <span>เปิดหน้าต่างพิมพ์ (Print Preview)</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: SCAN & REDEEM COUPON MODAL (Portal z-[200])                      */}
      {/* ========================================================================= */}
      {isScanModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50 to-indigo-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500 text-white">
                  <Camera size={18} />
                </div>
                <h3 className="font-extrabold text-slate-800 text-base kanit-text">สแกน / ตัดคูปอง</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setIsScanModalOpen(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Camera Preview */}
              <div className="relative aspect-video bg-black rounded-2xl overflow-hidden flex items-center justify-center">
                <video ref={videoRef} className={`w-full h-full object-cover ${!scannerActive ? 'hidden' : ''}`} />
                <canvas ref={canvasRef} className="hidden" />

                {!scannerActive && (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-4 py-2 bg-white/90 hover:bg-white text-slate-800 font-bold kanit-text text-xs rounded-xl shadow-lg flex items-center gap-2 transition-transform active:scale-95"
                  >
                    <Camera size={16} className="text-sky-600" />
                    <span>เปิดกล้องสแกน QR Code</span>
                  </button>
                )}

                {scannerActive && (
                  <div className="absolute inset-0 border-2 border-sky-400 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-dashed border-white/80 rounded-2xl animate-pulse" />
                  </div>
                )}

                {/* Camera controls overlay */}
                {scannerActive && (
                  <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    {hasTorch && (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        className={`p-2 rounded-full backdrop-blur-md text-xs font-bold ${
                          torchOn ? 'bg-amber-400 text-slate-900' : 'bg-black/50 text-white'
                        }`}
                      >
                        <Sparkles size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment')}
                      className="p-2 rounded-full bg-black/50 backdrop-blur-md text-white"
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Scanned Result Banner */}
              {scannedResultCoupon && (
                <div className={`p-3.5 rounded-2xl border ${
                  scannedResultCoupon.status === 'used'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs font-mono">{scannedResultCoupon.code}</span>
                    <span className="text-[10px] font-bold uppercase">{scannedResultCoupon.status}</span>
                  </div>
                  <div className="text-sm font-extrabold">{scannedResultCoupon.title}</div>
                  <div className="mt-2 flex items-center gap-2">
                    {scannedResultCoupon.status === 'used' ? (
                      <button
                        type="button"
                        onClick={() => handleUndoRedeemCoupon(scannedResultCoupon)}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold kanit-text"
                      >
                        คืนสิทธิ์คูปองนี้
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRedeemCoupon(scannedResultCoupon.code)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold kanit-text"
                      >
                        ตัดคูปองนี้
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Manual Input Form */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 kanit-text">หรือพิมพ์รหัสคูปองด้วยตนเอง:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="เช่น CP-6901-A123"
                    value={manualCodeInput}
                    onChange={(e) => setManualCodeInput(e.target.value.toUpperCase())}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold tracking-wider outline-none focus:bg-white focus:border-sky-400"
                  />
                  <button
                    type="button"
                    onClick={() => handleRedeemCoupon(manualCodeInput)}
                    className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold kanit-text shadow-sm transition-all active:scale-95"
                  >
                    ตัดคูปอง
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setIsScanModalOpen(false);
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold kanit-text"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: PREVIEW COUPON IMAGE MODAL (Portal z-[210])                      */}
      {/* ========================================================================= */}
      {previewCouponModal && typeof document !== 'undefined' && createPortal(
        <PreviewCouponModalView
          coupon={previewCouponModal}
          onClose={() => setPreviewCouponModal(null)}
          generateCouponCanvas={generateCouponCanvas}
          onCopyImage={handleCopyCouponImageToClipboard}
          onCopyText={handleCopyChatMessage}
          onDownloadPng={handleDownloadSinglePng}
          onPrint={(cp) => {
            setPreviewCouponModal(null);
            setPrintModalConfig({ coupons: [cp], template: 'card', batchTitle: cp.code });
          }}
        />,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: EXCEL EXPORT FILTER MODAL (Portal z-[210])                       */}
      {/* ========================================================================= */}
      {isExportExcelModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-3.5 sm:p-5 bg-slate-900/65 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-[2rem] w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base kanit-text">ส่งออกข้อมูลคูปองเป็น Excel</h3>
                  <p className="text-xs text-slate-500 kanit-text">เลือกชุดคูปอง หรือกรองตามวันที่สร้างเพื่อจำกัดปริมาณข้อมูล</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExportExcelModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
              {/* Filter 1: วันที่สร้างคูปอง */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 kanit-text mb-2">
                  1. ช่วงวันที่สร้างคูปอง (Created Date)
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[
                    { id: 'all', label: 'ทั้งหมด' },
                    { id: 'today', label: 'วันนี้' },
                    { id: '7days', label: '7 วันล่าสุด' },
                    { id: 'this_month', label: 'เดือนนี้' },
                    { id: 'custom', label: 'กำหนดเอง' }
                  ].map(dt => (
                    <button
                      key={dt.id}
                      type="button"
                      onClick={() => setExportDateType(dt.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold kanit-text transition-all ${
                        exportDateType === dt.id
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {dt.label}
                    </button>
                  ))}
                </div>

                {exportDateType === 'custom' && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                    <div>
                      <span className="text-[11px] text-slate-500 font-bold kanit-text block mb-1">วันที่เริ่มต้น</span>
                      <input
                        type="date"
                        value={exportStartDate}
                        onChange={(e) => setExportStartDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-medium outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 font-bold kanit-text block mb-1">วันที่สิ้นสุด</span>
                      <input
                        type="date"
                        value={exportEndDate}
                        onChange={(e) => setExportEndDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-medium outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Filter 2: เลือกชุดคูปอง (Batches) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-extrabold text-slate-700 kanit-text">
                    2. เลือกชุดคูปองที่ต้องการส่งออก ({Object.values(exportSelectedBatches).filter(Boolean).length} / {batchGroups.length} ชุด)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const all = {};
                        batchGroups.forEach(b => { all[b.batchName] = true; });
                        setExportSelectedBatches(all);
                      }}
                      className="text-[11px] text-emerald-600 hover:underline font-bold kanit-text"
                    >
                      เลือกทั้งหมด
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setExportSelectedBatches({})}
                      className="text-[11px] text-slate-400 hover:text-slate-600 font-bold kanit-text"
                    >
                      ยกเลิกทั้งหมด
                    </button>
                  </div>
                </div>

                <div className="max-h-52 overflow-y-auto custom-scrollbar border border-slate-200/90 rounded-2xl divide-y divide-slate-100 bg-slate-50/50 p-1">
                  {batchGroups.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 kanit-text">ไม่พบชุดคูปองในระบบ</div>
                  ) : (
                    batchGroups.map(b => {
                      const isChecked = Boolean(exportSelectedBatches[b.batchName]);
                      return (
                        <label
                          key={b.batchId}
                          className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                            isChecked ? 'bg-emerald-50/70' : 'hover:bg-slate-100/70'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setExportSelectedBatches(prev => ({
                                  ...prev,
                                  [b.batchName]: !prev[b.batchName]
                                }));
                              }}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer border-slate-300"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 kanit-text truncate">{b.title}</p>
                              <p className="text-[10px] text-slate-400 font-mono truncate">{b.batchName} • สร้างเมื่อ {b.createdAt ? formatDate(b.createdAt) : '-'}</p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-[10px] font-bold font-mono shrink-0">
                            {b.total} ใบ
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* สรุปข้อมูลที่จะส่งออก */}
              {(() => {
                const selectedBatchesList = Object.keys(exportSelectedBatches).filter(k => exportSelectedBatches[k]);
                const count = (couponsData || []).filter(cp => {
                  if (!cp || cp.isDeleted || cp.is_deleted) return false;
                  const batchName = cp.batchName || cp.batch_name || '-';
                  if (selectedBatchesList.length > 0 && !selectedBatchesList.includes(batchName)) return false;
                  if (exportDateType !== 'all') {
                    const rawDate = cp.createdAt || cp.created_at || cp.date;
                    if (!rawDate) return false;
                    const cpDate = new Date(rawDate);
                    if (isNaN(cpDate.getTime())) return false;
                    const now = new Date();
                    if (exportDateType === 'today') {
                      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                      if (cpDate < startToday) return false;
                    } else if (exportDateType === '7days') {
                      const past7 = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
                      if (cpDate < past7) return false;
                    } else if (exportDateType === 'this_month') {
                      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
                      if (cpDate < startMonth) return false;
                    } else if (exportDateType === 'custom') {
                      if (exportStartDate) {
                        const start = new Date(exportStartDate);
                        start.setHours(0, 0, 0, 0);
                        if (cpDate < start) return false;
                      }
                      if (exportEndDate) {
                        const end = new Date(exportEndDate);
                        end.setHours(23, 59, 59, 999);
                        if (cpDate > end) return false;
                      }
                    }
                  }
                  return true;
                }).length;

                return (
                  <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-800 kanit-text">จำนวนคูปองที่จะส่งออก:</span>
                    <span className="font-extrabold text-emerald-700 text-sm font-data">{count.toLocaleString()} ใบ</span>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsExportExcelModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold kanit-text transition-all"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                onClick={handleExecuteExportExcel}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold kanit-text flex items-center gap-2 shadow-sm transition-all active:scale-95"
              >
                <FileSpreadsheet size={16} />
                <span>ดาวน์โหลด Excel (.xlsx)</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default React.memo(CouponManager);

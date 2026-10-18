import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import JsBarcode from 'jsbarcode';
import CustomSelect from './CustomSelect';
import QrScannerModal from '../components/QrScannerModal';
import { 
  Ticket, Plus, Search, Filter, Printer, QrCode, Camera, 
  CheckCircle2, AlertCircle, Calendar, User, Trash2, Layers, 
  RefreshCw, X, ChevronRight, ChevronLeft, ChevronUp, ArrowUpDown, Eye, Sparkles, 
  Tag, ShieldCheck, Clock, Scissors, FileText, Check, 
  AlertTriangle, Crown, Hash, Copy, Download, Sliders,
  RotateCcw, RotateCw, Image as ImageIcon, Bookmark, ArrowRight, ExternalLink,
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
    shortName: 'เขียวเอเมอรัลด์',
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
    shortName: 'ฟ้าครามการแพทย์',
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
    name: 'ทองคำหรูหรา (VIP & พรีเมียม)',
    shortName: 'ทองคำหรูหรา',
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
    shortName: 'กุหลาบชมพู',
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
    name: 'ม่วงพรีเมียม (ศาสตร์ความงาม)',
    shortName: 'ม่วงพรีเมียม',
    bg: 'from-purple-600 via-indigo-600 to-purple-900',
    headerBg: '#7c3aed',
    accentText: '#6d28d9',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    primaryColor: '#7c3aed',
    lightBg: '#faf5ff',
    sheen: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.2) 100%)',
    tagColor: '#8b5cf6'
  },
  crimson: {
    id: 'crimson',
    name: 'แดงทับทิมมงคล (มงคล & ฮอตดีล)',
    shortName: 'แดงทับทิม',
    bg: 'from-red-600 via-rose-700 to-red-950',
    headerBg: '#dc2626',
    accentText: '#b91c1c',
    badge: 'bg-red-50 text-red-700 border-red-200',
    primaryColor: '#dc2626',
    lightBg: '#fef2f2',
    sheen: 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.25) 100%)',
    tagColor: '#ef4444'
  },
  amber: {
    id: 'amber',
    name: 'ส้มซันเซ็ท (สดใส & โปรโมชั่น)',
    shortName: 'ส้มซันเซ็ท',
    bg: 'from-orange-500 via-amber-600 to-orange-800',
    headerBg: '#ea580c',
    accentText: '#c2410c',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
    primaryColor: '#ea580c',
    lightBg: '#fff7ed',
    sheen: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.2) 100%)',
    tagColor: '#f97316'
  },
  teal: {
    id: 'teal',
    name: 'เขียวน้ำทะเล (โมเดิร์น & รีเฟรช)',
    shortName: 'เขียวน้ำทะเล',
    bg: 'from-teal-500 via-cyan-600 to-teal-800',
    headerBg: '#0d9488',
    accentText: '#0f766e',
    badge: 'bg-teal-50 text-teal-700 border-teal-200',
    primaryColor: '#0d9488',
    lightBg: '#f0fdfa',
    sheen: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.2) 100%)',
    tagColor: '#14b8a6'
  },
  indigo: {
    id: 'indigo',
    name: 'อินดิโก้นาวี (ภูมิฐาน & ทางการ)',
    shortName: 'อินดิโก้นาวี',
    bg: 'from-indigo-600 via-blue-700 to-indigo-950',
    headerBg: '#4f46e5',
    accentText: '#4338ca',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    primaryColor: '#4f46e5',
    lightBg: '#eef2ff',
    sheen: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.2) 100%)',
    tagColor: '#6366f1'
  },
  fuchsia: {
    id: 'fuchsia',
    name: 'ฟิวเชียออร่า (แฟชั่น & ปาร์ตี้)',
    shortName: 'ฟิวเชียออร่า',
    bg: 'from-fuchsia-600 via-pink-600 to-purple-800',
    headerBg: '#c026d3',
    accentText: '#a21caf',
    badge: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    primaryColor: '#c026d3',
    lightBg: '#fdf4ff',
    sheen: 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.25) 100%)',
    tagColor: '#d946ef'
  },
  cyan: {
    id: 'cyan',
    name: 'ฟ้ามิ้นต์ไอซ์ (ไครโอ & สปา)',
    shortName: 'ฟ้ามิ้นต์ไอซ์',
    bg: 'from-cyan-500 via-teal-600 to-cyan-800',
    headerBg: '#0891b2',
    accentText: '#0e7490',
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    primaryColor: '#0891b2',
    lightBg: '#ecfeff',
    sheen: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.2) 100%)',
    tagColor: '#06b6d4'
  },
  forest: {
    id: 'forest',
    name: 'เขียวพงไพร (สมุนไพร & ธรรมชาติ)',
    shortName: 'เขียวพงไพร',
    bg: 'from-green-700 via-emerald-800 to-emerald-950',
    headerBg: '#15803d',
    accentText: '#166534',
    badge: 'bg-green-50 text-green-700 border-green-200',
    primaryColor: '#15803d',
    lightBg: '#f0fdf4',
    sheen: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.2) 100%)',
    tagColor: '#22c55e'
  },
  violet: {
    id: 'violet',
    name: 'ลาเวนเดอร์ (ผ่อนคลาย & สบายตา)',
    shortName: 'ลาเวนเดอร์',
    bg: 'from-violet-500 via-purple-600 to-indigo-900',
    headerBg: '#6d28d9',
    accentText: '#5b21b6',
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
    primaryColor: '#6d28d9',
    lightBg: '#f5f3ff',
    sheen: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.2) 100%)',
    tagColor: '#8b5cf6'
  },
  bronze: {
    id: 'bronze',
    name: 'บรอนซ์คอปเปอร์ (เมทัลลิก & อบอุ่น)',
    shortName: 'บรอนซ์คอปเปอร์',
    bg: 'from-amber-700 via-yellow-800 to-stone-900',
    headerBg: '#b45309',
    accentText: '#92400e',
    badge: 'bg-stone-100 text-amber-900 border-amber-300',
    primaryColor: '#b45309',
    lightBg: '#fffbeb',
    sheen: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.3) 100%)',
    tagColor: '#d97706'
  },
  dark_gold: {
    id: 'dark_gold',
    name: 'แบล็คการ์ดโกลด์ (เอกซ์คลูซีฟ VIP)',
    shortName: 'แบล็คการ์ดโกลด์',
    bg: 'from-zinc-900 via-neutral-900 to-black',
    headerBg: '#d97706',
    accentText: '#f59e0b',
    badge: 'bg-zinc-800 text-amber-300 border-amber-500/40',
    primaryColor: '#d97706',
    lightBg: '#27272a',
    sheen: 'linear-gradient(135deg, rgba(251,191,36,0.4) 0%, rgba(255,255,255,0.05) 50%, rgba(245,158,11,0.25) 100%)',
    tagColor: '#fbbf24'
  },
  slate: {
    id: 'slate',
    name: 'คลาสสิกขาว-เทา (เรียบหรู มินิมอล)',
    shortName: 'คลาสสิกขาว-เทา',
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
  crimson: {
    primary: '#dc2626',
    primaryDark: '#7f1d1d',
    primaryLight: '#fef2f2',
    cardBgGradient: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 50%, #991b1b 100%)',
    stubGradient: 'linear-gradient(145deg, #450a0a 0%, #7f1d1d 55%, #dc2626 100%)',
    badgeGradient: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 60%, #dc2626 100%)',
    cardStubGradient: 'radial-gradient(circle at 75% 30%, #f87171 0%, #dc2626 55%, #7f1d1d 100%)',
    starColor: '#fef08a',
    tagBg: 'rgba(255, 255, 255, 0.22)',
    tagText: '#ffffff'
  },
  amber: {
    primary: '#ea580c',
    primaryDark: '#7c2d12',
    primaryLight: '#fff7ed',
    cardBgGradient: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 50%, #9a3412 100%)',
    stubGradient: 'linear-gradient(145deg, #431407 0%, #7c2d12 55%, #ea580c 100%)',
    badgeGradient: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 60%, #ea580c 100%)',
    cardStubGradient: 'radial-gradient(circle at 75% 30%, #fb923c 0%, #ea580c 55%, #7c2d12 100%)',
    starColor: '#fde047',
    tagBg: 'rgba(255, 255, 255, 0.22)',
    tagText: '#ffffff'
  },
  teal: {
    primary: '#0d9488',
    primaryDark: '#134e4a',
    primaryLight: '#f0fdfa',
    cardBgGradient: 'linear-gradient(135deg, #134e4a 0%, #0d9488 50%, #115e59 100%)',
    stubGradient: 'linear-gradient(145deg, #042f2e 0%, #134e4a 55%, #0d9488 100%)',
    badgeGradient: 'linear-gradient(135deg, #134e4a 0%, #0f766e 60%, #0d9488 100%)',
    cardStubGradient: 'radial-gradient(circle at 75% 30%, #2dd4bf 0%, #0d9488 55%, #134e4a 100%)',
    starColor: '#fde047',
    tagBg: 'rgba(255, 255, 255, 0.22)',
    tagText: '#ffffff'
  },
  indigo: {
    primary: '#4f46e5',
    primaryDark: '#312e81',
    primaryLight: '#eef2ff',
    cardBgGradient: 'linear-gradient(135deg, #312e81 0%, #4f46e5 50%, #3730a3 100%)',
    stubGradient: 'linear-gradient(145deg, #1e1b4b 0%, #312e81 55%, #4f46e5 100%)',
    badgeGradient: 'linear-gradient(135deg, #312e81 0%, #4338ca 60%, #4f46e5 100%)',
    cardStubGradient: 'radial-gradient(circle at 75% 30%, #818cf8 0%, #4f46e5 55%, #312e81 100%)',
    starColor: '#fde047',
    tagBg: 'rgba(255, 255, 255, 0.22)',
    tagText: '#ffffff'
  },
  fuchsia: {
    primary: '#c026d3',
    primaryDark: '#701a75',
    primaryLight: '#fdf4ff',
    cardBgGradient: 'linear-gradient(135deg, #701a75 0%, #c026d3 50%, #86198f 100%)',
    stubGradient: 'linear-gradient(145deg, #4a044e 0%, #701a75 55%, #c026d3 100%)',
    badgeGradient: 'linear-gradient(135deg, #701a75 0%, #a21caf 60%, #c026d3 100%)',
    cardStubGradient: 'radial-gradient(circle at 75% 30%, #e879f9 0%, #c026d3 55%, #701a75 100%)',
    starColor: '#fef08a',
    tagBg: 'rgba(255, 255, 255, 0.22)',
    tagText: '#ffffff'
  },
  cyan: {
    primary: '#0891b2',
    primaryDark: '#164e63',
    primaryLight: '#ecfeff',
    cardBgGradient: 'linear-gradient(135deg, #164e63 0%, #0891b2 50%, #155e75 100%)',
    stubGradient: 'linear-gradient(145deg, #083344 0%, #164e63 55%, #0891b2 100%)',
    badgeGradient: 'linear-gradient(135deg, #164e63 0%, #0e7490 60%, #0891b2 100%)',
    cardStubGradient: 'radial-gradient(circle at 75% 30%, #22d3ee 0%, #0891b2 55%, #164e63 100%)',
    starColor: '#fde047',
    tagBg: 'rgba(255, 255, 255, 0.22)',
    tagText: '#ffffff'
  },
  forest: {
    primary: '#15803d',
    primaryDark: '#14532d',
    primaryLight: '#f0fdf4',
    cardBgGradient: 'linear-gradient(135deg, #14532d 0%, #15803d 50%, #166534 100%)',
    stubGradient: 'linear-gradient(145deg, #052e16 0%, #14532d 55%, #15803d 100%)',
    badgeGradient: 'linear-gradient(135deg, #14532d 0%, #166534 60%, #15803d 100%)',
    cardStubGradient: 'radial-gradient(circle at 75% 30%, #4ade80 0%, #15803d 55%, #14532d 100%)',
    starColor: '#fde047',
    tagBg: 'rgba(255, 255, 255, 0.22)',
    tagText: '#ffffff'
  },
  violet: {
    primary: '#6d28d9',
    primaryDark: '#4c1d95',
    primaryLight: '#f5f3ff',
    cardBgGradient: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 50%, #5b21b6 100%)',
    stubGradient: 'linear-gradient(145deg, #2e1065 0%, #4c1d95 55%, #6d28d9 100%)',
    badgeGradient: 'linear-gradient(135deg, #4c1d95 0%, #5b21b6 60%, #6d28d9 100%)',
    cardStubGradient: 'radial-gradient(circle at 75% 30%, #a78bfa 0%, #6d28d9 55%, #4c1d95 100%)',
    starColor: '#fde047',
    tagBg: 'rgba(255, 255, 255, 0.22)',
    tagText: '#ffffff'
  },
  bronze: {
    primary: '#b45309',
    primaryDark: '#78350f',
    primaryLight: '#fffbeb',
    cardBgGradient: 'linear-gradient(135deg, #78350f 0%, #b45309 50%, #451a03 100%)',
    stubGradient: 'linear-gradient(145deg, #291205 0%, #451a03 55%, #b45309 100%)',
    badgeGradient: 'linear-gradient(135deg, #78350f 0%, #92400e 60%, #b45309 100%)',
    cardStubGradient: 'radial-gradient(circle at 75% 30%, #f59e0b 0%, #b45309 55%, #78350f 100%)',
    starColor: '#fef08a',
    tagBg: 'rgba(255, 255, 255, 0.25)',
    tagText: '#ffffff'
  },
  dark_gold: {
    primary: '#d97706',
    primaryDark: '#18181b',
    primaryLight: '#27272a',
    cardBgGradient: 'linear-gradient(135deg, #18181b 0%, #27272a 50%, #09090b 100%)',
    stubGradient: 'linear-gradient(145deg, #09090b 0%, #18181b 55%, #27272a 100%)',
    badgeGradient: 'linear-gradient(135deg, #78350f 0%, #d97706 60%, #b45309 100%)',
    cardStubGradient: 'radial-gradient(circle at 75% 30%, #fbbf24 0%, #d97706 55%, #18181b 100%)',
    starColor: '#fde047',
    tagBg: 'rgba(245, 158, 11, 0.3)',
    tagText: '#fef08a'
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
  { id: 'crimson', name: 'แดงทับทิมมงคล', c1: '#7f1d1d', c2: '#dc2626', c3: '#991b1b' },
  { id: 'amber', name: 'ส้มซันเซ็ท', c1: '#7c2d12', c2: '#ea580c', c3: '#9a3412' },
  { id: 'teal', name: 'เขียวน้ำทะเล', c1: '#134e4a', c2: '#0d9488', c3: '#115e59' },
  { id: 'indigo', name: 'อินดิโก้นาวี', c1: '#312e81', c2: '#4f46e5', c3: '#3730a3' },
  { id: 'fuchsia', name: 'ฟิวเชียออร่า', c1: '#701a75', c2: '#c026d3', c3: '#86198f' },
  { id: 'cyan', name: 'ฟ้ามิ้นต์ไอซ์', c1: '#164e63', c2: '#0891b2', c3: '#155e75' },
  { id: 'forest', name: 'เขียวพงไพร', c1: '#14532d', c2: '#15803d', c3: '#166534' },
  { id: 'violet', name: 'ลาเวนเดอร์', c1: '#4c1d95', c2: '#6d28d9', c3: '#5b21b6' },
  { id: 'bronze', name: 'บรอนซ์คอปเปอร์', c1: '#78350f', c2: '#b45309', c3: '#451a03' },
  { id: 'dark_gold', name: 'แบล็คการ์ดโกลด์', c1: '#18181b', c2: '#27272a', c3: '#09090b' },
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

// รูปแบบคูปองแถบยาวตัวอย่างเริ่มต้น (สัดส่วน 3:1 ถึง 3.7:1 พิมพ์ 4 ใบ/หน้า A4 ชิดขอบซ้ายขวา)
const DEFAULT_SAMPLE_STRIP_VOUCHER_ART = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="540" viewBox="0 0 2000 540"><defs><linearGradient id="vbg_strip" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2318181b"/><stop offset="50%" stop-color="%23222226"/><stop offset="100%" stop-color="%232a2a30"/></linearGradient><linearGradient id="gold_grad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="%23fbbf24"/><stop offset="100%" stop-color="%23f59e0b"/></linearGradient><pattern id="pdots_strip" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="%23ffffff" fill-opacity="0.08"/></pattern></defs><rect width="2000" height="540" rx="28" fill="url(%23vbg_strip)"/><rect width="2000" height="540" rx="28" fill="url(%23pdots_strip)"/><rect x="24" y="24" width="1440" height="492" rx="20" fill="none" stroke="%23f59e0b" stroke-width="2" stroke-dasharray="10 6" stroke-opacity="0.6"/><circle cx="95" cy="95" r="38" fill="%23f59e0b" fill-opacity="0.15"/><polygon points="95,68 104,90 127,93 110,108 115,131 95,118 75,131 80,108 63,93 86,90" fill="%23fbbf24"/><text x="155" y="92" font-family="sans-serif" font-weight="900" font-size="34" fill="%23ffffff" letter-spacing="2">ANPING CLINIC</text><text x="155" y="122" font-family="sans-serif" font-weight="600" font-size="16" fill="%23cbd5e1" letter-spacing="1">SPECIAL PRIVILEGE GIFT VOUCHER</text><text x="70" y="250" font-family="sans-serif" font-weight="900" font-size="58" fill="url(%23gold_grad)">DISCOUNT ฿500</text><text x="70" y="305" font-family="sans-serif" font-weight="500" font-size="24" fill="%23f8fafc">บัตรกำนัลส่วนลดแทนเงินสดสำหรับโปรแกรมการรักษาและหัตถการ</text><text x="70" y="440" font-family="sans-serif" font-weight="400" font-size="16" fill="%2394a3b8">เงื่อนไข: ใช้ได้ที่อันผิงคลินิกทุกสาขา | โปรดแสดง QR Code ด้านขวาแก่เจ้าหน้าที่ก่อนรับบริการ</text><line x1="1485" y1="20" x2="1485" y2="520" stroke="%2364748b" stroke-width="2.5" stroke-dasharray="12 10" stroke-opacity="0.8"/><circle cx="1485" cy="0" r="22" fill="%23101012"/><circle cx="1485" cy="540" r="22" fill="%23101012"/><rect x="1515" y="24" width="460" height="492" rx="20" fill="none" stroke="%23475569" stroke-width="1.5" stroke-opacity="0.5"/><text x="1745" y="70" font-family="sans-serif" font-weight="800" font-size="16" fill="%2394a3b8" text-anchor="middle" letter-spacing="1">VOUCHER STUB</text><rect x="1575" y="100" width="340" height="260" rx="14" fill="%23ffffff" fill-opacity="0.06" stroke="%23ffffff" stroke-width="1" stroke-dasharray="6 4" stroke-opacity="0.25"/><text x="1745" y="235" font-family="sans-serif" font-weight="600" font-size="16" fill="%2364748b" text-anchor="middle">QR CODE / BARCODE</text><text x="1745" y="410" font-family="sans-serif" font-weight="700" font-size="18" fill="%23cbd5e1" text-anchor="middle">ANPING CLINIC</text><text x="1745" y="445" font-family="sans-serif" font-weight="400" font-size="14" fill="%2364748b" text-anchor="middle">โปรดเก็บบัตรนี้เพื่อรับสิทธิ์</text></svg>';

// ฟังก์ชันตรวจสอบสัดส่วนคูปองว่าเป็นแบบแถบยาว (4 ใบ/หน้า A4 ชิดขอบซ้ายขวา) หรือไม่
export const isCouponStrip = (coupon) => {
  if (!coupon) return false;
  if (coupon.designConfig?.layoutType === 'card') return false;
  if (coupon.designConfig?.layoutType === 'strip') return true;
  if (coupon.designConfig?.templateType === 'card') return false;
  if (coupon.designConfig?.templateType === 'strip') return true;
  if (coupon.templateType === 'card' || coupon.template_type === 'card') return false;
  if (coupon.templateType === 'strip' || coupon.template_type === 'strip') return true;
  if (coupon.designConfig?.aspectRatio === '85.6 / 54' || coupon.designConfig?.aspectRatio === '85.6/54') return false;
  if (coupon.designConfig?.aspectRatio === '200 / 54' || coupon.designConfig?.aspectRatio === '200/54') return true;
  return false;
};

// ฟังก์ชันดึงการตั้งค่าวันหมดอายุของคูปอง (ดึงจาก expiryConfig, expiry_config หรือ qrConfig.expiryConfig)
const getCouponExpiryConfig = (coupon) => {
  if (!coupon) return null;
  const cfg = coupon.expiryConfig 
    || coupon.expiry_config 
    || coupon.qrConfig?.expiryConfig 
    || coupon.qr_config?.expiryConfig;
  return cfg || {
    enabled: true,
    xPercent: 32,
    yPercent: 90.5,
    sizePercent: 16,
    color: '#0f172a',
    bgStyle: 'none',
    format: 'numeric',
    prefix: '',
    fontFamily: 'Inter',
    fontWeight: 'normal',
    align: 'center'
  };
};

// ฟังก์ชันจัดรูปแบบวันหมดอายุสำหรับดีไซน์คูปองแบบกำหนดเอง (Story Artwork)
const formatCustomExpiryDate = (dateStr, format = 'numeric', isLifetime = false, prefix = '') => {
  if (isLifetime) return 'ไม่มีวันหมดอายุ';
  const cleanPrefix = prefix !== undefined ? prefix : '';
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
  initialLayoutType,
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

  // Layout format: 'card' (85.6 x 54 mm, 10/page) vs 'strip' (200 x 54 mm, 5/page)
  const [layoutType, setLayoutType] = useState(() => {
    if (initialLayoutType) return initialLayoutType;
    if (initialDesignConfig?.layoutType) return initialDesignConfig.layoutType;
    if (initialDesignConfig?.aspectRatio === '200 / 54' || initialDesignConfig?.aspectRatio === '200/54') return 'strip';
    return 'card';
  });

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
    rotation: 0,
    ...(initialQrConfig || {})
  }));
  const [isRotating, setIsRotating] = useState(false);

  // Local state for Expiry Date
  const [localExpiryConfig, setLocalExpiryConfig] = useState(() => ({
    enabled: true,
    xPercent: 32,
    yPercent: 90.5,
    sizePercent: 16,
    color: '#0f172a',
    bgStyle: 'none',
    format: 'numeric',
    prefix: '',
    fontFamily: 'Inter',
    fontWeight: 'normal',
    align: 'center',
    ...(initialExpiryConfig || {})
  }));

  // Effective background image URL (supports either direct upload or image saved in template/form)
  const effectiveArtwork = uploadedArtworkUrl || initialDesignConfig?.customImageUrl;

  // Preload natural dimensions of uploaded artwork so editor canvas ratio matches 1:1 with generator
  const [artworkNaturalDimensions, setArtworkNaturalDimensions] = useState(null);

  useEffect(() => {
    if (effectiveArtwork) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          const isWideRatio = (img.naturalWidth / img.naturalHeight) >= 2.0;
          setArtworkNaturalDimensions({
            width: img.naturalWidth,
            height: img.naturalHeight,
            aspectRatio: `${img.naturalWidth} / ${img.naturalHeight}`
          });
          setLayoutType(isWideRatio ? 'strip' : 'card');
        }
      };
      img.src = effectiveArtwork;
    } else {
      setArtworkNaturalDimensions(null);
    }
  }, [effectiveArtwork]);

  // Editable Layer State: restored from initialDesignConfig if previously edited!
  const [designConfig, setDesignConfig] = useState(() => {
    const defaults = {
      bgType: effectiveArtwork ? 'image' : 'gradient', // 'gradient' | 'solid' | 'image'
      gradientKey: themeColor || 'emerald',
      gradientColor1: '#064e3b',
      gradientColor2: '#047857',
      solidColor: '#064e3b',
      sheenEnabled: true,
      borderEnabled: true,

      // Clinic Logo Layer (default to false: do not show logo at start)
      logoEnabled: false,
      logoX: 6,
      logoY: 12,
      logoSize: 11,

      // Header / Title Text Layer (starts empty - user adds text when desired)
      headerText: '',
      headerColor: '#ffffff',
      headerFontSize: 13,
      headerX: 20,
      headerY: 13,

      // Discount Callout Layer (starts empty - user adds text when desired)
      discountText: '',
      discountColor: '#ffffff',
      discountFontSize: 28,
      discountX: 20,
      discountY: 42,

      // Subtext / Terms Layer (starts empty - user adds text when desired)
      termsText: '',
      termsColor: 'rgba(255,255,255,0.85)',
      termsFontSize: 11,
      termsX: 20,
      termsY: 76
    };

    if (initialDesignConfig) {
      return {
        ...defaults,
        ...initialDesignConfig,
        logoEnabled: initialDesignConfig.logoEnabled ?? defaults.logoEnabled,
        logoX: Number.isFinite(initialDesignConfig.logoX) ? initialDesignConfig.logoX : defaults.logoX,
        logoY: Number.isFinite(initialDesignConfig.logoY) ? initialDesignConfig.logoY : defaults.logoY,
        logoSize: Number.isFinite(initialDesignConfig.logoSize) ? initialDesignConfig.logoSize : defaults.logoSize,
        headerX: Number.isFinite(initialDesignConfig.headerX) ? initialDesignConfig.headerX : defaults.headerX,
        headerY: Number.isFinite(initialDesignConfig.headerY) ? initialDesignConfig.headerY : defaults.headerY,
        headerFontSize: Number.isFinite(initialDesignConfig.headerFontSize) ? initialDesignConfig.headerFontSize : defaults.headerFontSize,
        discountX: Number.isFinite(initialDesignConfig.discountX) ? initialDesignConfig.discountX : defaults.discountX,
        discountY: Number.isFinite(initialDesignConfig.discountY) ? initialDesignConfig.discountY : defaults.discountY,
        discountFontSize: Number.isFinite(initialDesignConfig.discountFontSize) ? initialDesignConfig.discountFontSize : defaults.discountFontSize,
        termsX: Number.isFinite(initialDesignConfig.termsX) ? initialDesignConfig.termsX : defaults.termsX,
        termsY: Number.isFinite(initialDesignConfig.termsY) ? initialDesignConfig.termsY : defaults.termsY,
        termsFontSize: Number.isFinite(initialDesignConfig.termsFontSize) ? initialDesignConfig.termsFontSize : defaults.termsFontSize,
        // Ensure bgType doesn't revert to gradient if an artwork URL is available
        bgType: (initialDesignConfig.bgType === 'image' && !effectiveArtwork)
          ? 'gradient'
          : (initialDesignConfig.bgType || (effectiveArtwork ? 'image' : 'gradient'))
      };
    }
    return defaults;
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
  const pinchRef = useRef(null);
  const isPinchingRef = useRef(false);
  const rafIdRef = useRef(null);
  const latestPointerRef = useRef({ x: 0, y: 0 });

  // Synced state refs for instantaneous 60 FPS access in touch & pointer events
  const activeStickerRef = useRef(activeSticker);
  const localQrConfigRef = useRef(localQrConfig);
  const localExpiryConfigRef = useRef(localExpiryConfig);
  const designConfigRef = useRef(designConfig);

  useEffect(() => { activeStickerRef.current = activeSticker; }, [activeSticker]);
  useEffect(() => { localQrConfigRef.current = localQrConfig; }, [localQrConfig]);
  useEffect(() => { localExpiryConfigRef.current = localExpiryConfig; }, [localExpiryConfig]);
  useEffect(() => { designConfigRef.current = designConfig; }, [designConfig]);

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
      } else if (activeSticker === 'qr' && (e.key === '[' || e.key === '{')) {
        e.preventDefault();
        const step = e.shiftKey ? 15 : (e.altKey ? 1 : 5);
        setLocalQrConfig(prev => ({
          ...prev,
          rotation: (Math.round(((prev.rotation || 0) - step + 360)) % 360)
        }));
      } else if (activeSticker === 'qr' && (e.key === ']' || e.key === '}')) {
        e.preventDefault();
        const step = e.shiftKey ? 15 : (e.altKey ? 1 : 5);
        setLocalQrConfig(prev => ({
          ...prev,
          rotation: (Math.round(((prev.rotation || 0) + step)) % 360)
        }));
      } else if (activeSticker === 'qr' && (e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const step = e.shiftKey ? -90 : 90;
        setLocalQrConfig(prev => ({
          ...prev,
          rotation: (Math.round(((prev.rotation || 0) + step + 360)) % 360)
        }));
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
    if (isPinchingRef.current) return;
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
      initX = Number.isFinite(localQrConfigRef.current.xPercent) ? localQrConfigRef.current.xPercent : 78;
      initY = Number.isFinite(localQrConfigRef.current.yPercent) ? localQrConfigRef.current.yPercent : 32;
    } else if (sticker === 'expiry') {
      initX = Number.isFinite(localExpiryConfigRef.current.xPercent) ? localExpiryConfigRef.current.xPercent : 32;
      initY = Number.isFinite(localExpiryConfigRef.current.yPercent) ? localExpiryConfigRef.current.yPercent : 90.5;
    } else if (sticker === 'logo') {
      initX = Number.isFinite(designConfigRef.current.logoX) ? designConfigRef.current.logoX : 6;
      initY = Number.isFinite(designConfigRef.current.logoY) ? designConfigRef.current.logoY : 12;
    } else if (sticker === 'header') {
      initX = Number.isFinite(designConfigRef.current.headerX) ? designConfigRef.current.headerX : 20;
      initY = Number.isFinite(designConfigRef.current.headerY) ? designConfigRef.current.headerY : 13;
    } else if (sticker === 'discount') {
      initX = Number.isFinite(designConfigRef.current.discountX) ? designConfigRef.current.discountX : 20;
      initY = Number.isFinite(designConfigRef.current.discountY) ? designConfigRef.current.discountY : 42;
    } else if (sticker === 'terms') {
      initX = Number.isFinite(designConfigRef.current.termsX) ? designConfigRef.current.termsX : 20;
      initY = Number.isFinite(designConfigRef.current.termsY) ? designConfigRef.current.termsY : 76;
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
    if (sticker === 'qr') initSize = Number.isFinite(localQrConfigRef.current.sizePercent) ? localQrConfigRef.current.sizePercent : 26;
    else if (sticker === 'expiry') initSize = Number.isFinite(localExpiryConfigRef.current.sizePercent) ? localExpiryConfigRef.current.sizePercent : 16;
    else if (sticker === 'logo') initSize = Number.isFinite(designConfigRef.current.logoSize) ? designConfigRef.current.logoSize : 11;
    else if (sticker === 'discount') initSize = Number.isFinite(designConfigRef.current.discountFontSize) ? designConfigRef.current.discountFontSize : 28;
    else if (sticker === 'header') initSize = Number.isFinite(designConfigRef.current.headerFontSize) ? designConfigRef.current.headerFontSize : 13;
    else if (sticker === 'terms') initSize = Number.isFinite(designConfigRef.current.termsFontSize) ? designConfigRef.current.termsFontSize : 11;

    dragRef.current = {
      action: 'resize',
      sticker,
      startX: e.clientX,
      startY: e.clientY,
      initSize
    };
  };

  const handleStartRotate = (e, sticker) => {
    e.stopPropagation();
    if (isPinchingRef.current) return;
    try {
      e.currentTarget?.setPointerCapture?.(e.pointerId);
    } catch {}
    setActiveSticker(sticker);
    if (sticker === 'qr') setActiveTab('qr');
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const centerX = rect.left + ((Number.isFinite(localQrConfigRef.current.xPercent) ? localQrConfigRef.current.xPercent : 78) / 100) * rect.width;
    const centerY = rect.top + ((Number.isFinite(localQrConfigRef.current.yPercent) ? localQrConfigRef.current.yPercent : 32) / 100) * rect.height;
    const startPointerAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    const initRotation = Number.isFinite(localQrConfigRef.current.rotation) ? localQrConfigRef.current.rotation : 0;

    setIsRotating(true);
    dragRef.current = {
      action: 'rotate',
      sticker,
      centerX,
      centerY,
      startPointerAngle,
      initRotation
    };
  };

  // Immediate pointer tracking (60 FPS direct animation frame) + Two-Finger Pinch Gesture
  useEffect(() => {
    const handlePointerMove = (e) => {
      if (isPinchingRef.current || !dragRef.current || !canvasRef.current) return;
      latestPointerRef.current = { x: e.clientX, y: e.clientY };

      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          if (isPinchingRef.current || !dragRef.current || !canvasRef.current) return;
          const rect = canvasRef.current.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return;
          const { x, y } = latestPointerRef.current;
          const { action, sticker, startX, startY, initX, initY, initSize, centerX, centerY, startPointerAngle, initRotation } = dragRef.current;

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
              const newSize = Math.round(Math.max(5, Math.min(40, initSize + deltaScale)) * 10) / 10;
              setDesignConfig(prev => ({ ...prev, logoSize: newSize }));
            } else if (sticker === 'discount') {
              const deltaFont = ((deltaX + deltaY) / rect.width) * 60;
              const newFont = Math.round(Math.max(12, Math.min(72, initSize + deltaFont)));
              setDesignConfig(prev => ({ ...prev, discountFontSize: newFont }));
            } else if (sticker === 'header') {
              const deltaFont = ((deltaX + deltaY) / rect.width) * 40;
              const newFont = Math.round(Math.max(8, Math.min(40, initSize + deltaFont)));
              setDesignConfig(prev => ({ ...prev, headerFontSize: newFont }));
            } else if (sticker === 'terms') {
              const deltaFont = ((deltaX + deltaY) / rect.width) * 30;
              const newFont = Math.round(Math.max(6, Math.min(30, initSize + deltaFont)));
              setDesignConfig(prev => ({ ...prev, termsFontSize: newFont }));
            }
          } else if (action === 'rotate') {
            const currentAngle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
            let delta = currentAngle - startPointerAngle;
            let newRotation = (initRotation + delta) % 360;
            if (newRotation < 0) newRotation += 360;

            // Smart snap to 0°, 90°, 180°, 270° within 4 degrees; 45°, 135°, 225°, 315° within 2.5 degrees
            const snapAngles = [0, 45, 90, 135, 180, 225, 270, 315, 360];
            for (const snap of snapAngles) {
              const tolerance = (snap % 90 === 0) ? 4 : 2.5;
              if (Math.abs(newRotation - snap) <= tolerance) {
                newRotation = snap % 360;
                break;
              }
            }
            newRotation = Math.round(newRotation);
            if (sticker === 'qr') {
              setLocalQrConfig(prev => ({ ...prev, rotation: newRotation }));
            }
          }
        });
      }
    };

    const handlePointerUp = () => {
      dragRef.current = null;
      setIsRotating(false);
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

  // Multi-Touch Pinch-to-Resize on Canvas (Two-finger pinch in / pinch out for all stickers)
  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        // Stop native browser viewport pinch zoom
        e.preventDefault();
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
        const midX = (t0.clientX + t1.clientX) / 2;
        const midY = (t0.clientY + t1.clientY) / 2;
        const touchAngle = Math.atan2(t1.clientY - t0.clientY, t1.clientX - t0.clientX) * (180 / Math.PI);

        // Check if either touch hit a sticker
        const sticker0 = t0.target?.closest?.('[data-sticker]')?.dataset?.sticker;
        const sticker1 = t1.target?.closest?.('[data-sticker]')?.dataset?.sticker;
        const target = sticker0 || sticker1 || activeStickerRef.current || 'qr';

        setActiveSticker(target);
        if (target === 'qr') setActiveTab('qr');
        else if (target === 'expiry') setActiveTab('expiry');
        else if (target === 'logo') setActiveTab('logo');
        else {
          setActiveTab('text');
          setActiveTextLayer(target);
        }

        let initSize = 26;
        let initX = 50;
        let initY = 50;

        if (target === 'qr') {
          initSize = Number.isFinite(localQrConfigRef.current.sizePercent) ? localQrConfigRef.current.sizePercent : 26;
          initX = Number.isFinite(localQrConfigRef.current.xPercent) ? localQrConfigRef.current.xPercent : 78;
          initY = Number.isFinite(localQrConfigRef.current.yPercent) ? localQrConfigRef.current.yPercent : 32;
        } else if (target === 'expiry') {
          initSize = Number.isFinite(localExpiryConfigRef.current.sizePercent) ? localExpiryConfigRef.current.sizePercent : 16;
          initX = Number.isFinite(localExpiryConfigRef.current.xPercent) ? localExpiryConfigRef.current.xPercent : 32;
          initY = Number.isFinite(localExpiryConfigRef.current.yPercent) ? localExpiryConfigRef.current.yPercent : 90.5;
        } else if (target === 'logo') {
          initSize = Number.isFinite(designConfigRef.current.logoSize) ? designConfigRef.current.logoSize : 11;
          initX = Number.isFinite(designConfigRef.current.logoX) ? designConfigRef.current.logoX : 6;
          initY = Number.isFinite(designConfigRef.current.logoY) ? designConfigRef.current.logoY : 12;
        } else if (target === 'discount') {
          initSize = Number.isFinite(designConfigRef.current.discountFontSize) ? designConfigRef.current.discountFontSize : 28;
          initX = Number.isFinite(designConfigRef.current.discountX) ? designConfigRef.current.discountX : 20;
          initY = Number.isFinite(designConfigRef.current.discountY) ? designConfigRef.current.discountY : 42;
        } else if (target === 'header') {
          initSize = Number.isFinite(designConfigRef.current.headerFontSize) ? designConfigRef.current.headerFontSize : 13;
          initX = Number.isFinite(designConfigRef.current.headerX) ? designConfigRef.current.headerX : 20;
          initY = Number.isFinite(designConfigRef.current.headerY) ? designConfigRef.current.headerY : 13;
        } else if (target === 'terms') {
          initSize = Number.isFinite(designConfigRef.current.termsFontSize) ? designConfigRef.current.termsFontSize : 11;
          initX = Number.isFinite(designConfigRef.current.termsX) ? designConfigRef.current.termsX : 20;
          initY = Number.isFinite(designConfigRef.current.termsY) ? designConfigRef.current.termsY : 76;
        }

        pinchRef.current = {
          sticker: target,
          initDist: Math.max(15, dist),
          initSize,
          initMidX: midX,
          initMidY: midY,
          initX,
          initY,
          initTouchAngle: touchAngle,
          initRotation: Number.isFinite(localQrConfigRef.current.rotation) ? localQrConfigRef.current.rotation : 0
        };
        isPinchingRef.current = true;
        dragRef.current = null; // Cancel single drag to prevent conflicts
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault(); // Stop native viewport pinch zoom
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
        const midX = (t0.clientX + t1.clientX) / 2;
        const midY = (t0.clientY + t1.clientY) / 2;
        const touchAngle = Math.atan2(t1.clientY - t0.clientY, t1.clientX - t0.clientX) * (180 / Math.PI);

        if (!rafIdRef.current) {
          rafIdRef.current = requestAnimationFrame(() => {
            rafIdRef.current = null;
            if (!pinchRef.current || !canvasRef.current) return;
            const rect = canvasRef.current.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;

            const { sticker, initDist, initSize, initMidX, initMidY, initX, initY, initTouchAngle, initRotation } = pinchRef.current;
            const scaleRatio = dist / initDist;

            // Two-finger repositioning + scaling
            const deltaXPercent = ((midX - initMidX) / rect.width) * 100;
            const deltaYPercent = ((midY - initMidY) / rect.height) * 100;
            const newX = Math.round(Math.max(0, Math.min(100, initX + deltaXPercent)) * 10) / 10;
            const newY = Math.round(Math.max(0, Math.min(100, initY + deltaYPercent)) * 10) / 10;

            if (sticker === 'qr') {
              const newSize = Math.round(Math.max(8, Math.min(70, initSize * scaleRatio)) * 10) / 10;
              let nextRot = localQrConfigRef.current.rotation || 0;
              if (Number.isFinite(initTouchAngle)) {
                const deltaAngle = touchAngle - initTouchAngle;
                let rot = ((initRotation || 0) + deltaAngle) % 360;
                if (rot < 0) rot += 360;
                if (Math.abs(rot - 0) <= 3 || Math.abs(rot - 360) <= 3) rot = 0;
                else if (Math.abs(rot - 90) <= 3) rot = 90;
                else if (Math.abs(rot - 180) <= 3) rot = 180;
                else if (Math.abs(rot - 270) <= 3) rot = 270;
                nextRot = Math.round(rot);
              }
              setLocalQrConfig(prev => ({ ...prev, sizePercent: newSize, xPercent: newX, yPercent: newY, rotation: nextRot }));
            } else if (sticker === 'expiry') {
              const newSize = Math.round(Math.max(6, Math.min(45, initSize * scaleRatio)) * 10) / 10;
              setLocalExpiryConfig(prev => ({ ...prev, sizePercent: newSize, xPercent: newX, yPercent: newY }));
            } else if (sticker === 'logo') {
              const newSize = Math.round(Math.max(5, Math.min(40, initSize * scaleRatio)) * 10) / 10;
              setDesignConfig(prev => ({ ...prev, logoSize: newSize, logoX: newX, logoY: newY }));
            } else if (sticker === 'discount') {
              const newSize = Math.round(Math.max(12, Math.min(72, initSize * scaleRatio)));
              setDesignConfig(prev => ({ ...prev, discountFontSize: newSize, discountX: newX, discountY: newY }));
            } else if (sticker === 'header') {
              const newSize = Math.round(Math.max(8, Math.min(40, initSize * scaleRatio)));
              setDesignConfig(prev => ({ ...prev, headerFontSize: newSize, headerX: newX, headerY: newY }));
            } else if (sticker === 'terms') {
              const newSize = Math.round(Math.max(6, Math.min(30, initSize * scaleRatio)));
              setDesignConfig(prev => ({ ...prev, termsFontSize: newSize, termsX: newX, termsY: newY }));
            }
          });
        }
      }
    };

    const handleTouchEnd = (e) => {
      if (e.touches.length < 2) {
        pinchRef.current = null;
        setTimeout(() => {
          isPinchingRef.current = false;
        }, 80);
      }
    };

    canvasEl.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvasEl.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvasEl.addEventListener('touchend', handleTouchEnd);
    canvasEl.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      canvasEl.removeEventListener('touchstart', handleTouchStart);
      canvasEl.removeEventListener('touchmove', handleTouchMove);
      canvasEl.removeEventListener('touchend', handleTouchEnd);
      canvasEl.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []);

  // Save & Bake High-Res Artwork (1:1 Exact Mathematical Proportions to Preview)
  const handleSave = async () => {
    let renderedCustomImgUrl = null;
    const isStrip = layoutType === 'strip';
    const isImageBg = Boolean(designConfig.bgType === 'image' && effectiveArtwork);
    const hasCustomTextOrLogo = Boolean(
      designConfig.logoEnabled ||
      (designConfig.headerText && designConfig.headerText.trim() !== '') ||
      (designConfig.discountText && designConfig.discountText.trim() !== '') ||
      (designConfig.termsText && designConfig.termsText.trim() !== '')
    );

    // Bake artwork canvas if using studio gradient/solid background, OR if user added text/logo on Canva image
    if (!isImageBg || hasCustomTextOrLogo) {
      try {
        if (typeof document !== 'undefined' && document.fonts) {
          await document.fonts.ready;
        }

        const artCanvas = document.createElement('canvas');
        let w = isStrip ? 2362 : 1712;
        let h = isStrip ? 638 : 1080;

        if (isImageBg && artworkNaturalDimensions?.width && artworkNaturalDimensions?.height) {
          // Preserve natural resolution & aspect ratio of uploaded Canva artwork
          w = artworkNaturalDimensions.width;
          h = artworkNaturalDimensions.height;
          const minDim = 1400;
          const maxDim = 2400;
          if (w < minDim && h < minDim) {
            const scale = minDim / Math.min(w, h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
          } else if (w > maxDim || h > maxDim) {
            const scale = maxDim / Math.max(w, h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
          }
        }

        artCanvas.width = w;
        artCanvas.height = h;
        const artCtx = artCanvas.getContext('2d');

        if (artCtx) {
          artCtx.imageSmoothingEnabled = true;
          artCtx.imageSmoothingQuality = 'high';

          // 1. Draw Background
          if (isImageBg) {
            try {
              const bgImg = new Image();
              bgImg.crossOrigin = 'anonymous';
              await new Promise(r => { bgImg.onload = r; bgImg.onerror = r; bgImg.src = effectiveArtwork; });
              if (bgImg.naturalWidth > 0) {
                artCtx.drawImage(bgImg, 0, 0, w, h);
              }
            } catch (err) {
              console.warn('[Studio] Failed to draw background image during bake:', err);
            }
          } else if (designConfig.bgType === 'solid') {
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

          // 2. Metallic Sheen Overlay (applied only on gradient/solid backgrounds)
          if (!isImageBg && designConfig.sheenEnabled) {
            const sGrad = artCtx.createLinearGradient(0, 0, w, h);
            sGrad.addColorStop(0, 'rgba(255,255,255,0.28)');
            sGrad.addColorStop(0.45, 'rgba(255,255,255,0.02)');
            sGrad.addColorStop(1, 'rgba(255,255,255,0.18)');
            artCtx.fillStyle = sGrad;
            artCtx.fillRect(0, 0, w, h);
          }

          // 3. Inner Border (applied only on gradient/solid backgrounds)
          if (!isImageBg && designConfig.borderEnabled) {
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
      customImageUrl: renderedCustomImgUrl || effectiveArtwork || null,
      designConfig: {
        ...designConfig,
        layoutType: isStrip ? 'strip' : 'card',
        aspectRatio: isStrip ? '200 / 54' : '85.6 / 54'
      },
      layoutType: isStrip ? 'strip' : 'card'
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
      codeDistance: 3.5,
      rotation: 0
    });
    setLocalExpiryConfig({
      enabled: true,
      xPercent: 32,
      yPercent: 90.5,
      sizePercent: 16,
      color: '#0f172a',
      bgStyle: 'none',
      format: 'numeric',
      prefix: '',
      fontFamily: 'Inter',
      fontWeight: 'normal'
    });
    setDesignConfig({
      bgType: effectiveArtwork ? 'image' : 'gradient',
      gradientKey: themeColor || 'emerald',
      gradientColor1: '#064e3b',
      gradientColor2: '#047857',
      solidColor: '#064e3b',
      sheenEnabled: true,
      borderEnabled: true,
      logoEnabled: false,
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
  const expFontPx = Math.max(9, Math.round(previewDims.width * (localExpiryConfig.sizePercent || 18) * 0.002));

  const headerFontPx = Math.max(9, Math.round(previewDims.width * (designConfig.headerFontSize * 0.0028)));
  const discountFontPx = Math.max(14, Math.round(previewDims.width * (designConfig.discountFontSize * 0.0038)));
  const termsFontPx = Math.max(8, Math.round(previewDims.width * (designConfig.termsFontSize * 0.0028)));
  const logoSizePx = Math.max(20, Math.round((designConfig.logoSize / 100) * previewDims.width));

  const isStripLayout = layoutType === 'strip';
  // Dynamic canvas aspect ratio: dynamically preserves uploaded Canva artwork ratio
  const canvasAspectRatio = (designConfig.bgType === 'image' && artworkNaturalDimensions)
    ? artworkNaturalDimensions.aspectRatio
    : (isStripLayout ? '200 / 54' : '85.6 / 54');

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
    if (designConfig.bgType === 'image' && effectiveArtwork) return 'transparent';
    if (designConfig.bgType === 'solid') return designConfig.solidColor || '#064e3b';
    const preset = STUDIO_GRADIENT_PRESETS.find(p => p.id === designConfig.gradientKey);
    if (preset) return `linear-gradient(135deg, ${preset.c1} 0%, ${preset.c2} 50%, ${preset.c3} 100%)`;
    return `linear-gradient(135deg, ${designConfig.gradientColor1 || '#064e3b'} 0%, ${designConfig.gradientColor2 || '#047857'} 100%)`;
  };

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-0 sm:p-3 md:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-[#18181b] border-0 sm:border border-zinc-800 rounded-none sm:rounded-2xl w-full sm:w-[98vw] max-w-[1700px] h-[100dvh] sm:h-[96vh] shadow-2xl flex flex-col overflow-hidden text-zinc-100 animate-in zoom-in-95 duration-150">
        
        {/* Top Studio Header: Fully responsive for mobile and desktop */}
        <div className="border-b border-zinc-800/90 shrink-0 bg-[#141416]">
          {/* Main Bar: Title + Desktop Switchers + Actions */}
          <div className="p-2.5 sm:p-3 md:p-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-200 shadow-xs shrink-0">
                <Sparkles size={16} className="sm:w-5 sm:h-5 text-amber-400" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-zinc-100 text-xs sm:text-base kanit-text leading-tight flex items-center gap-2 truncate">
                  <span>สตูดิโอออกแบบคูปอง</span>
                  <span className="hidden sm:inline px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-300 font-mono">
                    Canva Style
                  </span>
                </h3>
                <p className="hidden sm:block text-[10px] sm:text-[11px] text-zinc-400 kanit-text truncate">
                  ปรับแต่งพื้นหลัง ข้อความอิสระ โลโก้ และจัดวางตำแหน่ง QR / บาร์โค้ด
                </p>
              </div>
            </div>

            {/* Desktop Switchers (Format + View) on lg+ screens */}
            <div className="hidden lg:flex items-center gap-2.5">
              {/* Format Switcher */}
              <div className="flex items-center bg-[#101012] border border-zinc-800 rounded-xl p-1 select-none shrink-0">
                <button
                  type="button"
                  onClick={() => setLayoutType('card')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold kanit-text transition-all ${
                    layoutType === 'card' ? 'bg-zinc-700 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                  }`}
                  title="สัดส่วนบัตรพรีเมียม 85.6 × 54 mm (พิมพ์ 10 ใบต่อหน้า A4)"
                >
                  <Ticket size={13} className={layoutType === 'card' ? 'text-sky-400' : 'text-zinc-500'} />
                  <span>บัตรการ์ด (85.6×54)</span>
                  <span className="text-[10px] text-zinc-400 font-mono font-normal">10 ใบ/A4</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutType('strip')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold kanit-text transition-all ${
                    layoutType === 'strip' ? 'bg-zinc-700 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                  }`}
                  title="สัดส่วนคูปองแถบยาวชิดขอบ (พิมพ์ 4 ใบต่อหน้า A4)"
                >
                  <Scissors size={13} className={layoutType === 'strip' ? 'text-emerald-400' : 'text-zinc-500'} />
                  <span>คูปองแถบยาว (ชิดขอบ)</span>
                  <span className="text-[10px] text-zinc-400 font-mono font-normal">4 ใบ/A4</span>
                </button>
              </div>
            </div>

            {/* Action Buttons: Reset, Save, Close (always visible and clickable!) */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 sm:px-3 sm:py-2 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold kanit-text text-xs transition-all shadow-xs flex items-center gap-1.5 active:scale-95 shrink-0 cursor-pointer"
                title="รีเซ็ตค่ามาตรฐาน"
              >
                <RotateCcw size={14} className="text-zinc-400 shrink-0" />
                <span className="hidden sm:inline">รีเซ็ต</span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold kanit-text text-xs sm:text-sm transition-all shadow-md shadow-emerald-900/30 flex items-center gap-1.5 active:scale-95 shrink-0 cursor-pointer"
              >
                <Check size={16} className="shrink-0" />
                <span className="hidden sm:inline">บันทึกดีไซน์ & ตำแหน่ง</span>
                <span className="sm:hidden">บันทึก</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
                title="ปิด"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Mobile & Tablet Toolbar: Format Switcher + View Switcher (Row 2 on screens < lg) */}
          <div className="lg:hidden px-2.5 pb-2.5 pt-0 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            {/* Format Switcher */}
            <div className="flex items-center bg-[#101012] border border-zinc-800 rounded-xl p-0.5 select-none shrink-0">
              <button
                type="button"
                onClick={() => setLayoutType('card')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold kanit-text transition-all whitespace-nowrap ${
                  layoutType === 'card' ? 'bg-zinc-700 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Ticket size={12} className={layoutType === 'card' ? 'text-sky-400' : 'text-zinc-500'} />
                <span>บัตรการ์ด (85.6×54)</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutType('strip')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold kanit-text transition-all whitespace-nowrap ${
                  layoutType === 'strip' ? 'bg-zinc-700 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Scissors size={12} className={layoutType === 'strip' ? 'text-emerald-400' : 'text-zinc-500'} />
                <span>แถบยาว (ชิดขอบ)</span>
              </button>
            </div>

            {/* View Switcher for Mobile & Tablet */}
            <div className="flex items-center bg-[#101012] border border-zinc-800 rounded-xl p-0.5 select-none shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('canvas')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold kanit-text transition-all whitespace-nowrap ${
                  viewMode === 'canvas' ? 'bg-zinc-700 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Move size={12} />
                <span>ผืนผ้าใบ</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('controls')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold kanit-text transition-all whitespace-nowrap ${
                  viewMode === 'controls' ? 'bg-zinc-700 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Sliders size={12} />
                <span>เครื่องมือ</span>
              </button>
            </div>
          </div>
        </div>

        {/* Studio Workspace Layout */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden relative">
          
          {/* LEFT 70%: Interactive High-Precision Canvas Area */}
          <div className={`flex-1 min-h-0 bg-[#101012] flex flex-col items-center justify-center p-3 sm:p-5 md:p-6 lg:p-8 overflow-hidden select-none ${
            viewMode === 'controls' ? 'hidden lg:flex' : 'flex'
          }`}>
            
            {/* Canvas Helper Bar: Modern sleek responsive chips that never break into single-character columns */}
            <div className="mb-2 sm:mb-3 max-w-full overflow-x-auto no-scrollbar flex items-center gap-1.5 sm:gap-2 px-1 select-none">
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 text-[11px] font-bold kanit-text text-emerald-400 shadow-2xs whitespace-nowrap shrink-0">
                {isStripLayout ? <Scissors size={12} /> : <Ticket size={12} />}
                <span>{isStripLayout ? 'แถบยาว ~210 × 74 mm (4 ใบ/A4)' : 'บัตรพรีเมียม 85.6 × 54 mm (10 ใบ/A4)'}</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-zinc-900/80 border border-zinc-800/80 text-[11px] font-medium kanit-text text-zinc-300 shadow-2xs whitespace-nowrap shrink-0">
                <Move size={12} className="text-amber-400 shrink-0" />
                <span>แตะ/ลากวัตถุ</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-zinc-900/80 border border-zinc-800/80 text-[11px] font-medium kanit-text text-zinc-300 shadow-2xs whitespace-nowrap shrink-0">
                <RotateCw size={12} className="text-amber-400 shrink-0" />
                <span>หมุน 360° (ลากปุ่มหมุน/กด R)</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-zinc-900/80 border border-zinc-800/80 text-[11px] font-medium kanit-text text-zinc-300 shadow-2xs whitespace-nowrap shrink-0">
                <span className="text-amber-400">🤏 2 นิ้ว:</span>
                <span>กางหุบขยาย / บิดหมุน</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-zinc-900/80 border border-zinc-800/80 text-[11px] font-medium kanit-text text-zinc-300 shadow-2xs whitespace-nowrap shrink-0">
                <span className="text-zinc-400">⌨️ ลูกศร:</span>
                <span>ขยับละเอียด 0.1%</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-zinc-900/80 border border-zinc-800/80 text-[11px] font-medium kanit-text text-zinc-300 shadow-2xs whitespace-nowrap shrink-0">
                <span className="text-amber-400">✏️ ดับเบิ้ลคลิก:</span>
                <span>แก้ไขข้อความ</span>
              </div>
            </div>

            {/* Proportional Aspect Ratio Canvas Wrapper: matches uploaded image natural ratio or 85.6 x 54 mm */}
            <div
              ref={canvasRef}
              onClick={() => { setActiveSticker(null); setInlineEditingLayer(null); }}
              className="relative w-full max-w-[960px] rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 select-none transition-shadow touch-none"
              style={{
                aspectRatio: canvasAspectRatio,
                background: getGradientCss(),
                boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none'
              }}
            >
              {/* Optional Custom Background Image from File Upload or Template */}
              {designConfig.bgType === 'image' && effectiveArtwork && (
                <img
                  src={effectiveArtwork}
                  alt="Custom Background"
                  className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
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
                  data-sticker="logo"
                  onPointerDown={(e) => handleStartDrag(e, 'logo')}
                  onClick={(e) => { e.stopPropagation(); setActiveTab('logo'); setActiveSticker('logo'); setInlineEditingLayer(null); }}
                  className={`absolute select-none cursor-move group flex items-center justify-center transition-[box-shadow,outline-color] duration-150 ${
                    activeSticker === 'logo'
                      ? 'outline-2 outline-amber-400 outline-offset-2 z-20'
                      : 'hover:outline-1 hover:outline-white/40 hover:outline-offset-1 z-10'
                  }`}
                  style={{
                    left: `${designConfig.logoX ?? 6}%`,
                    top: `${designConfig.logoY ?? 12}%`,
                    width: `${designConfig.logoSize ?? 11}%`,
                    aspectRatio: '1 / 1',
                    touchAction: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none'
                  }}
                >
                  {clinicInfo?.logoUrl ? (
                    <img
                      src={clinicInfo.logoUrl}
                      alt="Logo"
                      className="w-full h-full object-contain rounded-full shadow-lg border border-white/60 pointer-events-none bg-white/95"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-white/20 border border-white/60 flex items-center justify-center text-white font-black shadow-lg text-[10px] pointer-events-none select-none">
                      AP
                    </div>
                  )}

                  {/* Resize Handle for Logo */}
                  {activeSticker === 'logo' && (
                    <div
                      onPointerDown={(e) => handleStartResize(e, 'logo')}
                      className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-400 border border-zinc-900 rounded-full cursor-nwse-resize shadow-md flex items-center justify-center z-30 group-hover:scale-110 transition-transform"
                      title="ลากเพื่อย่อ-ขยาย หรือใช้ 2 นิ้วกางหุบ"
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
                  data-sticker="header"
                  onPointerDown={(e) => handleStartDrag(e, 'header')}
                  onClick={(e) => { e.stopPropagation(); setActiveTab('text'); setActiveSticker('header'); setActiveTextLayer('header'); }}
                  onDoubleClick={(e) => { e.stopPropagation(); setInlineEditingLayer('header'); }}
                  className={`absolute select-none cursor-move rounded transition-[box-shadow,outline-color] duration-150 ${
                    activeSticker === 'header'
                      ? 'outline-2 outline-amber-400 outline-offset-2 bg-black/20 z-20'
                      : 'hover:outline-1 hover:outline-white/30 hover:outline-offset-1 z-10'
                  }`}
                  style={{
                    left: `${designConfig.headerX ?? 20}%`,
                    top: `${designConfig.headerY ?? 13}%`,
                    color: designConfig.headerColor || '#ffffff',
                    fontSize: `${headerFontPx}px`,
                    fontWeight: 800,
                    lineHeight: 1.15,
                    textShadow: '0 2px 4px rgba(0,0,0,0.4)',
                    touchAction: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
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
                    <div style={{ whiteSpace: 'pre-wrap', pointerEvents: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
                      {designConfig.headerText}
                    </div>
                  )}

                  {/* Resize Handle for Header */}
                  {activeSticker === 'header' && inlineEditingLayer !== 'header' && (
                    <div
                      onPointerDown={(e) => handleStartResize(e, 'header')}
                      className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-400 border border-zinc-900 rounded-full cursor-nwse-resize shadow-md flex items-center justify-center z-30 group-hover:scale-110 transition-transform"
                      title="ลากเพื่อย่อ-ขยาย หรือใช้ 2 นิ้วกางหุบ"
                    >
                      <div className="w-1.5 h-1.5 bg-zinc-900 rounded-full" />
                    </div>
                  )}
                </div>
              )}

              {/* 4B. Discount Highlight (Main Big Text) */}
              {designConfig.discountText && (
                <div
                  data-sticker="discount"
                  onPointerDown={(e) => handleStartDrag(e, 'discount')}
                  onClick={(e) => { e.stopPropagation(); setActiveTab('text'); setActiveSticker('discount'); setActiveTextLayer('discount'); }}
                  onDoubleClick={(e) => { e.stopPropagation(); setInlineEditingLayer('discount'); }}
                  className={`absolute select-none cursor-move rounded transition-[box-shadow,outline-color] duration-150 ${
                    activeSticker === 'discount'
                      ? 'outline-2 outline-amber-400 outline-offset-2 bg-black/25 z-20'
                      : 'hover:outline-1 hover:outline-white/30 hover:outline-offset-1 z-10'
                  }`}
                  style={{
                    left: `${designConfig.discountX ?? 20}%`,
                    top: `${designConfig.discountY ?? 42}%`,
                    color: designConfig.discountColor || '#ffffff',
                    fontSize: `${discountFontPx}px`,
                    fontWeight: 900,
                    lineHeight: 1.1,
                    textShadow: '0 2px 6px rgba(0,0,0,0.5)',
                    touchAction: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
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
                    <div style={{ whiteSpace: 'pre-wrap', pointerEvents: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
                      {designConfig.discountText}
                    </div>
                  )}

                  {/* Resize Handle for Discount */}
                  {activeSticker === 'discount' && inlineEditingLayer !== 'discount' && (
                    <div
                      onPointerDown={(e) => handleStartResize(e, 'discount')}
                      className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-400 border border-zinc-900 rounded-full cursor-nwse-resize shadow-md flex items-center justify-center z-30 group-hover:scale-110 transition-transform"
                      title="ลากเพื่อย่อ-ขยาย หรือใช้ 2 นิ้วกางหุบ"
                    >
                      <div className="w-1.5 h-1.5 bg-zinc-900 rounded-full" />
                    </div>
                  )}
                </div>
              )}

              {/* 4C. Terms / Subtext */}
              {designConfig.termsText && (
                <div
                  data-sticker="terms"
                  onPointerDown={(e) => handleStartDrag(e, 'terms')}
                  onClick={(e) => { e.stopPropagation(); setActiveTab('text'); setActiveSticker('terms'); setActiveTextLayer('terms'); }}
                  onDoubleClick={(e) => { e.stopPropagation(); setInlineEditingLayer('terms'); }}
                  className={`absolute select-none cursor-move rounded transition-[box-shadow,outline-color] duration-150 max-w-[75%] ${
                    activeSticker === 'terms'
                      ? 'outline-2 outline-amber-400 outline-offset-2 bg-black/20 z-20'
                      : 'hover:outline-1 hover:outline-white/30 hover:outline-offset-1 z-10'
                  }`}
                  style={{
                    left: `${designConfig.termsX ?? 20}%`,
                    top: `${designConfig.termsY ?? 76}%`,
                    color: designConfig.termsColor || 'rgba(255,255,255,0.85)',
                    fontSize: `${termsFontPx}px`,
                    fontWeight: 500,
                    lineHeight: 1.25,
                    textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                    touchAction: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
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
                    <div style={{ whiteSpace: 'pre-wrap', pointerEvents: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
                      {designConfig.termsText}
                    </div>
                  )}

                  {/* Resize Handle for Terms */}
                  {activeSticker === 'terms' && inlineEditingLayer !== 'terms' && (
                    <div
                      onPointerDown={(e) => handleStartResize(e, 'terms')}
                      className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-400 border border-zinc-900 rounded-full cursor-nwse-resize shadow-md flex items-center justify-center z-30 group-hover:scale-110 transition-transform"
                      title="ลากเพื่อย่อ-ขยาย หรือใช้ 2 นิ้วกางหุบ"
                    >
                      <div className="w-1.5 h-1.5 bg-zinc-900 rounded-full" />
                    </div>
                  )}
                </div>
              )}

              {/* 5. QR Code / Barcode Sticker */}
              <div
                data-sticker="qr"
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
                  left: `${localQrConfig.xPercent ?? 78}%`,
                  top: `${localQrConfig.yPercent ?? 32}%`,
                  width: `${localQrConfig.sizePercent ?? 26}%`,
                  maxWidth: `${localQrConfig.sizePercent ?? 26}%`,
                  transform: `translate(-50%, -50%) rotate(${localQrConfig.rotation || 0}deg)`,
                  transformOrigin: 'center center',
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  boxSizing: 'border-box',
                  padding: `${cardPadPx}px`,
                  minWidth: 0
                }}
              >
                {localQrConfig.codeType === 'barcode' ? (
                  <div className="w-full flex items-center justify-center overflow-hidden py-0.5 pointer-events-none select-none">
                    {sampleBarcodeDataUrl ? (
                      <img src={sampleBarcodeDataUrl} alt="Sample Barcode" className="w-full h-auto object-contain pointer-events-none" />
                    ) : (
                      <Barcode className="w-full h-10 text-zinc-900" />
                    )}
                  </div>
                ) : (
                  <div className="w-full flex items-center justify-center overflow-hidden pointer-events-none select-none">
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
                    className={`font-mono tracking-wider font-semibold block truncate max-w-full text-center transition-all pointer-events-none select-none ${
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
                    title="ลากเพื่อย่อ-ขยายขนาด หรือใช้ 2 นิ้วกางหุบ"
                  >
                    <Move size={8} className="text-white transform rotate-45" />
                  </div>
                )}

                {/* Rotate Handle for QR / Barcode (Canva / Figma Style) */}
                {activeSticker === 'qr' && (
                  <div
                    onPointerDown={(e) => handleStartRotate(e, 'qr')}
                    className="absolute -top-9 left-1/2 -translate-x-1/2 flex flex-col items-center cursor-grab active:cursor-grabbing z-30 group/rot touch-none"
                    title="ลากหมุน 360° (หรือปรับองศาที่แผงควบคุม)"
                  >
                    {/* Angle degree tooltip */}
                    <div className={`mb-0.5 px-1.5 py-0.5 rounded-md bg-amber-400 text-zinc-950 text-[10px] font-mono font-black shadow-lg whitespace-nowrap select-none transition-all pointer-events-none ${
                      isRotating ? 'scale-110 ring-2 ring-white/60 shadow-amber-400/50' : 'scale-90 group-hover/rot:scale-100'
                    }`}>
                      {Math.round(localQrConfig.rotation || 0)}°
                    </div>
                    {/* Rotate button knob */}
                    <div className="w-5.5 h-5.5 rounded-full bg-zinc-900 border-2 border-amber-400 shadow-xl flex items-center justify-center text-amber-400 hover:scale-110 active:scale-95 transition-transform">
                      <RotateCw size={11} className="stroke-[2.5]" />
                    </div>
                    {/* Connecting stem line */}
                    <div className="w-0.5 h-2 bg-amber-400/80 -mt-0.5" />
                  </div>
                )}
              </div>

              {/* 6. Expiry Date Sticker (EXP) */}
              {localExpiryConfig.enabled !== false && (
                <div
                  data-sticker="expiry"
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
                    left: `${localExpiryConfig.xPercent ?? 32}%`,
                    top: `${localExpiryConfig.yPercent ?? 90.5}%`,
                    transform: localExpiryConfig.align === 'left'
                      ? 'translate(0, -50%)'
                      : (localExpiryConfig.align === 'right' ? 'translate(-100%, -50%)' : 'translate(-50%, -50%)'),
                    touchAction: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    padding: localExpiryConfig.bgStyle !== 'none' ? `${Math.round(expFontPx * 0.35)}px ${Math.round(expFontPx * 0.7)}px` : '0px'
                  }}
                >
                  <span
                    style={{
                      fontSize: `${expFontPx}px`,
                      color: localExpiryConfig.bgStyle === 'dark_pill' ? '#ffffff' : (localExpiryConfig.color || '#ffffff'),
                      fontFamily: getExpiryFontFamily(localExpiryConfig.fontFamily),
                      fontWeight: localExpiryConfig.fontWeight === 'bold' ? 700 : (localExpiryConfig.fontWeight === 'normal' ? 400 : 300),
                      lineHeight: 1,
                      whiteSpace: 'nowrap',
                      display: 'inline-block',
                      textAlign: localExpiryConfig.align || 'center',
                      pointerEvents: 'none',
                      userSelect: 'none',
                      WebkitUserSelect: 'none'
                    }}
                  >
                    {formattedExpiryDisplay}
                  </span>

                  {/* Resize Handle for EXP */}
                  {activeSticker === 'expiry' && (
                    <div
                      onPointerDown={(e) => handleStartResize(e, 'expiry')}
                      className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-zinc-900 border border-zinc-200 rounded-full cursor-nwse-resize shadow-md flex items-center justify-center z-30 group-hover:scale-110 transition-transform"
                      title="ลากเพื่อย่อ-ขยาย หรือใช้ 2 นิ้วกางหุบ"
                    >
                      <div className="w-1 h-1 bg-white rounded-full" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT 30%: Photoshop & Canva Control Panel */}
          <div className={`w-full flex-1 lg:flex-none min-h-0 lg:w-[32%] xl:w-[30%] h-full bg-[#141416] border-t lg:border-t-0 lg:border-l border-zinc-800/90 flex flex-col overflow-hidden ${
            viewMode === 'canvas' ? 'hidden lg:flex' : 'flex'
          }`}>
            
            {/* Top Fixed Layer Navigation Tabs (Pinned Header - NEVER SCROLLS AWAY) */}
            <div className="p-2 sm:p-3 pb-2 border-b border-zinc-800/80 bg-[#121214] shrink-0 select-none">
              <div className="grid grid-cols-5 gap-1 p-1 bg-[#101012] rounded-xl border border-zinc-800/90 overflow-hidden">
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
            </div>

            {/* Scrollable Control Settings with custom sleek scrollbar and momentum touch scrolling */}
            <div 
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 space-y-4 [scrollbar-width:thin] [scrollbar-color:#3f3f46_#141416] touch-pan-y"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div className="w-full space-y-3 pb-6">

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
                    {effectiveArtwork ? (
                      <div className="grid grid-cols-3 gap-1 bg-[#101012] p-1 rounded-xl border border-zinc-800 select-none">
                        <button
                          type="button"
                          onClick={() => setDesignConfig(p => ({ ...p, bgType: 'image' }))}
                          className={`py-1.5 text-xs font-semibold rounded-lg kanit-text transition-all text-center ${
                            designConfig.bgType === 'image' ? 'bg-zinc-700 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          รูปที่อัปโหลด
                        </button>
                        <button
                          type="button"
                          onClick={() => setDesignConfig(p => ({ ...p, bgType: 'gradient' }))}
                          className={`py-1.5 text-xs font-semibold rounded-lg kanit-text transition-all text-center ${
                            designConfig.bgType === 'gradient' ? 'bg-zinc-700 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          ไล่เฉดสี
                        </button>
                        <button
                          type="button"
                          onClick={() => setDesignConfig(p => ({ ...p, bgType: 'solid' }))}
                          className={`py-1.5 text-xs font-semibold rounded-lg kanit-text transition-all text-center ${
                            designConfig.bgType === 'solid' ? 'bg-zinc-700 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          สีเดี่ยว
                        </button>
                      </div>
                    ) : (
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
                    )}

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

                    {/* Rotation 360° Slider & Presets */}
                    <div className="p-2.5 bg-zinc-900/50 rounded-xl border border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between text-xs text-zinc-300 kanit-text">
                        <div className="flex items-center gap-1.5 font-semibold text-zinc-200">
                          <RotateCw size={13} className="text-amber-400 shrink-0" />
                          <span>การหมุนโค้ด (360°):</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-zinc-100 font-bold bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700 text-xs shadow-2xs">
                            {Math.round(localQrConfig.rotation || 0)}°
                          </span>
                          {(localQrConfig.rotation || 0) !== 0 && (
                            <button
                              type="button"
                              onClick={() => setLocalQrConfig(prev => ({ ...prev, rotation: 0 }))}
                              className="text-[10px] text-amber-400 hover:text-amber-300 px-1 py-0.5 rounded hover:bg-amber-400/10 kanit-text font-medium transition-colors cursor-pointer"
                              title="รีเซ็ตเป็น 0°"
                            >
                              รีเซ็ต
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Slider 0° - 360° with fine step buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setLocalQrConfig(prev => ({
                            ...prev,
                            rotation: (Math.round(((prev.rotation || 0) - 1 + 360)) % 360)
                          }))}
                          className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold flex items-center justify-center hover:bg-zinc-700 text-xs shrink-0 active:scale-95 transition-all"
                          title="หมุนทวนเข็ม 1°"
                        >
                          -1°
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          step="1"
                          value={Math.round(localQrConfig.rotation || 0)}
                          onChange={(e) => setLocalQrConfig(prev => ({ ...prev, rotation: Number(e.target.value) % 360 }))}
                          className="w-full cursor-pointer accent-amber-400"
                        />
                        <button
                          type="button"
                          onClick={() => setLocalQrConfig(prev => ({
                            ...prev,
                            rotation: (Math.round(((prev.rotation || 0) + 1)) % 360)
                          }))}
                          className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold flex items-center justify-center hover:bg-zinc-700 text-xs shrink-0 active:scale-95 transition-all"
                          title="หมุนตามเข็ม 1°"
                        >
                          +1°
                        </button>
                      </div>

                      {/* Preset Quick Angle Buttons (0°, 90°, 180°, 270°) */}
                      <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                        {[
                          { deg: 0, title: '0°', label: 'แนวนอน' },
                          { deg: 90, title: '90°', label: 'ตั้งขวา' },
                          { deg: 180, title: '180°', label: 'กลับหัว' },
                          { deg: 270, title: '270°', label: 'ตั้งซ้าย' }
                        ].map(preset => {
                          const isSelected = Math.round(localQrConfig.rotation || 0) === preset.deg;
                          return (
                            <button
                              key={preset.deg}
                              type="button"
                              onClick={() => setLocalQrConfig(prev => ({ ...prev, rotation: preset.deg }))}
                              className={`py-1.5 px-1 rounded-lg border text-[11px] font-semibold kanit-text flex flex-col items-center justify-center transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-400/20 text-amber-300 border-amber-400/60 shadow-xs ring-1 ring-amber-400/30'
                                  : 'bg-zinc-800/60 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800'
                              }`}
                            >
                              <span className="font-mono font-bold leading-tight">{preset.title}</span>
                              <span className="text-[9px] text-zinc-400 font-normal">{preset.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* 90-degree quick turn buttons */}
                      <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => setLocalQrConfig(prev => ({
                            ...prev,
                            rotation: (Math.round(((prev.rotation || 0) - 90 + 360)) % 360)
                          }))}
                          className="py-1 px-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/80 text-[11px] text-zinc-300 font-medium kanit-text flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                        >
                          <RotateCcw size={12} className="text-zinc-400" />
                          <span>หมุนซ้าย 90°</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setLocalQrConfig(prev => ({
                            ...prev,
                            rotation: (Math.round(((prev.rotation || 0) + 90)) % 360)
                          }))}
                          className="py-1 px-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/80 text-[11px] text-zinc-300 font-medium kanit-text flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                        >
                          <RotateCw size={12} className="text-zinc-400" />
                          <span>หมุนขวา 90°</span>
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

                        {/* 5.5 Text Alignment (การจัดชิดข้อความ) */}
                        <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
                          <label className="text-xs font-semibold text-zinc-300 kanit-text block">การจัดชิดข้อความ:</label>
                          <div className="grid grid-cols-3 gap-1">
                            {[
                              { id: 'left', name: 'ชิดซ้าย' },
                              { id: 'center', name: 'กึ่งกลาง' },
                              { id: 'right', name: 'ชิดขวา' }
                            ].map(a => (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => setLocalExpiryConfig(prev => ({ ...prev, align: a.id }))}
                                className={`py-1.5 text-xs rounded-lg border text-center transition-all ${
                                  (localExpiryConfig.align || 'center') === a.id
                                    ? 'bg-zinc-700 text-white border-zinc-500 shadow-sm font-bold'
                                    : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-white'
                                }`}
                              >
                                {a.name}
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

// --- Global In-Memory LRU Cache for Coupon QR Codes (Max 250 items, ~5MB RAM total) ---
const couponQrCache = new Map();

/**
 * Lazy Coupon QR Component: Generates and renders QR code just-in-time when mounted on screen.
 * Uses LRU cache to prevent re-generating during scrolling while keeping memory strictly bounded.
 */
const LazyCouponQr = React.memo(({ code, onClick, title, className = "", imgClassName = "w-14 h-14 object-contain" }) => {
  const [qrUrl, setQrUrl] = useState(() => couponQrCache.get(code) || null);
  const [isLoading, setIsLoading] = useState(!qrUrl);

  useEffect(() => {
    if (!code) return;
    if (couponQrCache.has(code)) {
      setQrUrl(couponQrCache.get(code));
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    QRCode.toDataURL(code, {
      width: 280,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' }
    }).then(url => {
      if (!isMounted) return;
      if (couponQrCache.size > 250) {
        const firstKey = couponQrCache.keys().next().value;
        couponQrCache.delete(firstKey);
      }
      couponQrCache.set(code, url);
      setQrUrl(url);
      setIsLoading(false);
    }).catch(err => {
      console.warn('[LazyCouponQr] Error:', err);
      if (isMounted) setIsLoading(false);
    });

    return () => { isMounted = false; };
  }, [code]);

  if (isLoading || !qrUrl) {
    return (
      <div className={`p-1 bg-slate-50 rounded-xl border border-slate-200/80 shadow-2xs shrink-0 flex items-center justify-center animate-pulse ${className || 'w-16 h-16'}`}>
        <QrCode size={20} className="text-slate-300" />
      </div>
    );
  }

  return (
    <div 
      className={`p-1 bg-white rounded-xl border border-slate-200 shadow-2xs shrink-0 cursor-pointer hover:border-sky-400 hover:ring-2 hover:ring-sky-100 hover:scale-105 transition-all group ${className}`}
      onClick={onClick}
      title={title || "คลิกเพื่อดูตัวอย่างคูปองฉบับเต็มก่อนส่งลูกค้า"}
    >
      <img src={qrUrl} alt={code} className={`${imgClassName} group-hover:scale-105 transition-transform`} />
    </div>
  );
});

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
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createProgress, setCreateProgress] = useState(null); // Real-time animated coupon creation progress { active, current, total, percent, status, message, title }
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [activeDrillDownBatch, setActiveDrillDownBatch] = useState(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [previewCouponModal, setPreviewCouponModal] = useState(null); // ดูตัวอย่างคูปองก่อนส่งลูกค้า

  // Sticky Header & Sticky Search/Filter Bar Refs
  const headerRef = useRef(null);
  const filterRef = useRef(null);

  // Manage 'filter-expanded' imperatively to match Finance & Appointment managers
  useEffect(() => {
    if (filterRef.current) {
      if (showMobileFilters) {
        filterRef.current.classList.add('filter-expanded');
      } else {
        filterRef.current.classList.remove('filter-expanded');
      }
    }
  }, [showMobileFilters]);

  // Excel Export Modal States
  const [isExportExcelModalOpen, setIsExportExcelModalOpen] = useState(false);
  const [exportSelectedBatches, setExportSelectedBatches] = useState({});
  const [exportDateType, setExportDateType] = useState('all'); // 'all', 'today', '7days', 'this_month', 'custom'
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportStatusFilter, setExportStatusFilter] = useState('all'); // 'all', 'active', 'used', 'expired'

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
      codeDistance: 3.5,
      rotation: 0
    },
    // Custom Expiry Date Visual Positioning Editor
    expiryConfig: {
      enabled: true,
      xPercent: 32,
      yPercent: 90.5,
      sizePercent: 16,
      color: '#0f172a',
      bgStyle: 'none',
      format: 'numeric',
      prefix: '',
      fontFamily: 'Inter',
      fontWeight: 'normal',
      align: 'center'
    },
    quantity: 10
  });

  const [patientSearch, setPatientSearch] = useState('');
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const patientInputContainerRef = useRef(null);
  const patientPortalRef = useRef(null);
  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, left: 0, width: 0 });
  const [isUploadingArtwork, setIsUploadingArtwork] = useState(false);
  const pendingArtworkFileRef = useRef(null); // Deferred artwork file upload
  const artworkUploadPromiseRef = useRef(null); // Non-blocking background upload promise
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

      // 1. ย่อขนาด Header และเพิ่มเงาเบลอเมื่อเลื่อน พร้อม Hysteresis ป้องกันการกระตุก
      const isHeaderScrolled = headerRef.current.classList.contains('is-scrolled');
      if (isHeaderScrolled ? (scrollTop > 35) : (scrollTop > 50)) {
        headerRef.current.classList.add('is-scrolled');
      } else {
        headerRef.current.classList.remove('is-scrolled');
      }

      // 2. ปรับขนาดและสถานะ Filter Bar เมื่อเลื่อนมาชนขอบล่างของ Header (ใช้ Hysteresis ป้องกันการกระตุก/หลุดสถานะ)
      if (filterRef.current && headerRef.current) {
        const headerRect = headerRef.current.getBoundingClientRect();
        const filterRect = filterRef.current.getBoundingClientRect();
        const isCurrentlyScrolled = filterRef.current.classList.contains('is-scrolled');
        const threshold = isCurrentlyScrolled ? (headerRect.bottom + 6) : (headerRect.bottom + 1);
        if (filterRect.top <= threshold) {
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

    const timer = setTimeout(() => {
      if (headerRef.current) headerRef.current.classList.remove('is-scrolled');
      if (filterRef.current) filterRef.current.classList.remove('is-scrolled');
    }, 200);

    return () => {
      clearTimeout(timer);
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

  // --- 1. Pure Just-In-Time (JIT) QR Architecture ---
  // Background pre-generation of all QR codes is completely removed.
  // QR codes are now generated strictly on-demand when cards scroll into view (<LazyCouponQr />)
  // or when explicitly printing/exporting. This guarantees instant 0ms load and microscopic memory footprint.

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

      const cpImg = cp.bgImage || cp.bg_image || cp.designConfig?.customImageUrl || cp.design_config?.customImageUrl || cp.designConfig?.bgImage || cp.design_config?.bgImage || '';

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
          bgImage: cpImg,
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
      if (!grp.bgImage && cpImg) {
        grp.bgImage = cpImg;
      }
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

  // --- Infinite Scroll / Virtual Pagination for Individual Coupons ---
  const [individualVisibleCount, setIndividualVisibleCount] = useState(24);
  const individualSentinelRef = useRef(null);

  // Reset pagination when search filter changes
  useEffect(() => {
    setIndividualVisibleCount(24);
  }, [searchTerm, statusFilter]);

  // Infinite Scroll Observer for Individual Coupons (Mobile & Desktop)
  useEffect(() => {
    if (viewMode !== 'individual') return;
    const sentinel = individualSentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.isIntersecting) {
        setIndividualVisibleCount(prev => {
          if (prev >= filteredIndividualCoupons.length) return prev;
          return Math.min(prev + 24, filteredIndividualCoupons.length);
        });
      }
    }, { rootMargin: '350px' });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [viewMode, filteredIndividualCoupons.length]);

  const displayedIndividualCoupons = useMemo(() => {
    return filteredIndividualCoupons.slice(0, individualVisibleCount);
  }, [filteredIndividualCoupons, individualVisibleCount]);

  // --- Infinite Scroll for Batch Drill-Down Modal ---
  const [drillDownVisibleCount, setDrillDownVisibleCount] = useState(24);
  const drillDownSentinelRef = useRef(null);

  // Reset drill-down count when active batch changes
  useEffect(() => {
    setDrillDownVisibleCount(24);
  }, [activeDrillDownBatch]);

  const currentDrillDownCoupons = useMemo(() => {
    return currentDrillDownBatch?.coupons || [];
  }, [currentDrillDownBatch]);

  const displayedDrillDownCoupons = useMemo(() => {
    return currentDrillDownCoupons.slice(0, drillDownVisibleCount);
  }, [currentDrillDownCoupons, drillDownVisibleCount]);

  useEffect(() => {
    if (!activeDrillDownBatch) return;
    const sentinel = drillDownSentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.isIntersecting) {
        setDrillDownVisibleCount(prev => {
          if (prev >= currentDrillDownCoupons.length) return prev;
          return Math.min(prev + 24, currentDrillDownCoupons.length);
        });
      }
    }, { rootMargin: '250px' });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [activeDrillDownBatch, currentDrillDownCoupons.length]);

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
      let effectiveArt = form.customImageUrl || form.userUploadedImage || form.designConfig?.customImageUrl || form.designConfig?.bgImage || '';

      // Non-blocking UX Item 5: Await pending Google Drive upload if still in progress
      if (artworkUploadPromiseRef.current) {
        showToast('กำลังรออัปโหลดรูปภาพขึ้น Google Drive สักครู่...', 'info');
        const uploadedUrl = await artworkUploadPromiseRef.current;
        if (uploadedUrl) effectiveArt = uploadedUrl;
      }

      // If effectiveArt is still a Base64 string, upload to Google Drive now to prevent storing Base64 in templates
      if (effectiveArt && effectiveArt.startsWith('data:image/') && typeof callAppScript === 'function') {
        try {
          setIsUploadingArtwork(true);
          const matchMime = effectiveArt.match(/data:(image\/[a-zA-Z0-9.+_-]+);base64,/);
          const mimeType = matchMime ? matchMime[1] : 'image/png';
          const base64Data = effectiveArt.split(',')[1];
          const res = await callAppScript('UPLOAD_FILE', 'Settings', {
            fileName: `COUPON_TPL_${Date.now()}.png`,
            mimeType,
            data: base64Data,
            folderId: gdriveTokens?.generalDriveFolderId || undefined
          });
          if (res?.status === 'success' && res.fileUrl) {
            effectiveArt = formatDirectImageUrl(res.fileUrl);
            setForm(prev => ({
              ...prev,
              customImageUrl: effectiveArt,
              userUploadedImage: effectiveArt,
              designConfig: prev.designConfig ? { ...prev.designConfig, customImageUrl: effectiveArt, bgImage: effectiveArt } : prev.designConfig
            }));
          }
        } catch (uplErr) {
          console.warn('[Coupon] Template artwork upload fallback:', uplErr);
        } finally {
          setIsUploadingArtwork(false);
        }
      }

      const templatePayload = {
        id: `TPL_${Date.now()}`,
        name: tplName.trim(),
        details: {
          title: form.title,
          description: form.description,
          discountType: form.discountType,
          discountValue: form.discountValue,
          minSpend: form.minSpend,
          isLifetime: Boolean(form.isLifetime || !form.expireDate),
          templateType: (form.templateType === 'strip' || form.designConfig?.layoutType === 'strip') ? 'strip' : (form.templateType === 'card' ? 'card' : (effectiveArt ? 'custom_image' : form.templateType)),
          themeColor: form.themeColor,
          customImageUrl: effectiveArt,
          userUploadedImage: effectiveArt,
          bgImage: effectiveArt,
          designConfig: form.designConfig ? { ...form.designConfig, layoutType: (form.templateType === 'strip' || form.designConfig?.layoutType === 'strip') ? 'strip' : 'card', customImageUrl: effectiveArt, bgImage: effectiveArt } : null,
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

  // Delete Template from Supabase / Library
  const handleDeleteTemplate = (tpl) => {
    if (!tpl) return;
    showGlobalAlert({
      type: 'warning',
      title: 'ยืนยันการลบแม่แบบ?',
      text: `คุณต้องการลบแม่แบบ "${tpl.name}" ใช่หรือไม่? หากลบแล้วจะไม่สามารถกู้คืนได้`,
      onConfirm: async () => {
        try {
          if (supabase && tpl.id && !String(tpl.id).startsWith('preset_')) {
            const { error } = await supabase.from('coupon_templates').update({ is_deleted: true, updated_at: new Date().toISOString() }).eq('id', tpl.id);
            if (error) {
              console.warn('[Coupon] Soft delete template fallback to hard delete:', error.message);
              await supabase.from('coupon_templates').delete().eq('id', tpl.id);
            }
          }
          setTemplatesList(prev => prev.filter(t => t.id !== tpl.id));
          showToast(`ลบแม่แบบ "${tpl.name}" เรียบร้อยแล้ว`, 'success');
        } catch (err) {
          console.error('[Coupon] Delete template error:', err);
          showToast('เกิดข้อผิดพลาดในการลบแม่แบบ', 'error');
        }
      }
    });
  };

  // Upload Custom Artwork (Photoshop/Canva): Instant 0ms local preview + Non-blocking background Google Drive upload
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

    // 1. Instant local preview (0ms lag, non-blocking) - พนักงานสามารถเริ่มจัดตำแหน่ง QR และวันหมดอายุได้ทันที!
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const localDataUrl = uploadEvent.target?.result;
      if (!localDataUrl) {
        showToast('ไม่สามารถอ่านไฟล์ได้', 'error');
        return;
      }
      pendingArtworkFileRef.current = file;
      const probeImg = new Image();
      probeImg.onload = () => {
        const isWide = (probeImg.naturalWidth / probeImg.naturalHeight) >= 2.0;
        const detectedLayout = isWide ? 'strip' : 'card';
        setForm(prev => ({
          ...prev,
          templateType: 'custom_image',
          userUploadedImage: localDataUrl,
          customImageUrl: localDataUrl,
          designConfig: prev.designConfig
            ? { ...prev.designConfig, bgType: 'image', layoutType: detectedLayout }
            : { bgType: 'image', layoutType: detectedLayout }
        }));
        setIsQrEditorOpen(true);
        showToast(`โหลดรูปภาพสำเร็จ! (${isWide ? 'ตรวจพบสัดส่วนคูปองแถบยาว ~210×74mm' : 'ตรวจพบสัดส่วนคูปองแบบการ์ด 85.6×54mm'})`, 'success');
      };
      probeImg.onerror = () => {
        setForm(prev => ({
          ...prev,
          userUploadedImage: localDataUrl,
          customImageUrl: localDataUrl,
          designConfig: prev.designConfig ? { ...prev.designConfig, bgType: 'image' } : { bgType: 'image' }
        }));
        setIsQrEditorOpen(true);
        showToast('โหลดรูปภาพสำเร็จ! เปิดเครื่องมือจัดตำแหน่ง QR และวันหมดอายุ', 'success');
      };
      probeImg.src = localDataUrl;

      // 2. Concurrently start background upload to Google Drive
      setIsUploadingArtwork(true);
      const base64Data = localDataUrl.split(',')[1];
      if (typeof callAppScript === 'function' && base64Data) {
        const sanitized = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const fileName = `COUPON_ART_${Date.now()}_${sanitized}`;
        const folderId = gdriveTokens?.generalDriveFolderId || undefined;

        const uploadPromise = callAppScript('UPLOAD_FILE', 'Settings', {
          fileName,
          mimeType: file.type,
          data: base64Data,
          folderId
        }).then(res => {
          if (res?.status === 'success' && res.fileUrl) {
            const directUrl = formatDirectImageUrl(res.fileUrl);
            setForm(prev => ({
              ...prev,
              customImageUrl: directUrl,
              userUploadedImage: directUrl,
              designConfig: prev.designConfig ? { ...prev.designConfig, customImageUrl: directUrl, bgImage: directUrl } : prev.designConfig
            }));
            return directUrl;
          }
          return localDataUrl;
        }).catch(err => {
          console.warn('[Coupon] Background Google Drive upload warning:', err);
          return localDataUrl;
        }).finally(() => {
          setIsUploadingArtwork(false);
          artworkUploadPromiseRef.current = null;
        });

        artworkUploadPromiseRef.current = uploadPromise;
      }
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

    // 1. Resolve Final Artwork URL (Google Drive CDN URL)
    let finalImageUrl = form.customImageUrl || form.userUploadedImage || form.designConfig?.customImageUrl || form.designConfig?.bgImage || '';

    // Non-blocking UX Item 5: If background Google Drive upload is still in progress, smoothly await it
    if (artworkUploadPromiseRef.current) {
      try {
        setCreateProgress(prev => ({
          ...(prev || {}),
          status: 'uploading',
          message: 'กำลังรอการบันทึกภาพต้นฉบับขึ้น Google Drive...'
        }));
        const uploadedUrl = await artworkUploadPromiseRef.current;
        if (uploadedUrl) finalImageUrl = uploadedUrl;
      } catch (e) {
        console.warn('[Coupon] Pending artwork upload error:', e);
      }
    }

    // If finalImageUrl is still a Base64 string (e.g. from legacy template), upload to Google Drive once now!
    if (finalImageUrl && finalImageUrl.startsWith('data:image/') && typeof callAppScript === 'function') {
      try {
        setCreateProgress(prev => ({
          ...(prev || {}),
          status: 'uploading',
          message: 'กำลังแปลงรูปภาพและส่งขึ้น Google Drive...'
        }));
        setIsUploadingArtwork(true);
        const matchMime = finalImageUrl.match(/data:(image\/[a-zA-Z0-9.+_-]+);base64,/);
        const mimeType = matchMime ? matchMime[1] : 'image/png';
        const base64Data = finalImageUrl.split(',')[1];
        const res = await callAppScript('UPLOAD_FILE', 'Settings', {
          fileName: `COUPON_ART_${Date.now()}.png`,
          mimeType,
          data: base64Data,
          folderId: gdriveTokens?.generalDriveFolderId || undefined
        });
        if (res?.status === 'success' && res.fileUrl) {
          finalImageUrl = formatDirectImageUrl(res.fileUrl);
          setForm(prev => ({
            ...prev,
            customImageUrl: finalImageUrl,
            userUploadedImage: finalImageUrl,
            designConfig: prev.designConfig ? { ...prev.designConfig, customImageUrl: finalImageUrl, bgImage: finalImageUrl } : prev.designConfig
          }));
        }
      } catch (uploadErr) {
        console.warn('[Coupon] Creation artwork upload error:', uploadErr);
      } finally {
        setIsUploadingArtwork(false);
      }
    }

    pendingArtworkFileRef.current = null;
    artworkUploadPromiseRef.current = null;

    const isStripLayout = form.templateType === 'strip' || form.designConfig?.layoutType === 'strip';
    const effectiveTemplateType = isStripLayout ? 'strip' : (form.templateType === 'card' ? 'card' : (finalImageUrl ? 'custom_image' : form.templateType));

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
        templateType: effectiveTemplateType,
        template_type: effectiveTemplateType,
        themeColor: form.themeColor,
        qrConfig: { ...form.qrConfig, expiryConfig: form.expiryConfig },
        qr_config: { ...form.qrConfig, expiryConfig: form.expiryConfig },
        expiryConfig: form.expiryConfig,
        expiry_config: form.expiryConfig,
        designConfig: form.designConfig ? { ...form.designConfig, layoutType: isStripLayout ? 'strip' : 'card', customImageUrl: finalImageUrl || form.designConfig.customImageUrl } : { layoutType: isStripLayout ? 'strip' : 'card', customImageUrl: finalImageUrl || null },
        design_config: form.designConfig ? { ...form.designConfig, layoutType: isStripLayout ? 'strip' : 'card', customImageUrl: finalImageUrl || form.designConfig.customImageUrl } : { layoutType: isStripLayout ? 'strip' : 'card', customImageUrl: finalImageUrl || null },
        isLifetime: Boolean(form.isLifetime || !form.expireDate),
        is_lifetime: Boolean(form.isLifetime || !form.expireDate),
        expireDate: (form.isLifetime || !form.expireDate) ? null : form.expireDate,
        expire_date: (form.isLifetime || !form.expireDate) ? null : form.expireDate,
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

    // Optimistic UI Update: แสดงการ์ดชุดคูปองพร้อมรูปพื้นหลังบนหน้าจอทันที ไม่ต้องรอกดรีเฟรช
    setCouponsData(prev => [...newCoupons, ...prev]);

    try {
      setCreateProgress(prev => ({
        ...(prev || {}),
        status: 'saving',
        current: 0,
        total: count,
        percent: 60,
        message: `กำลังบันทึกชุดคูปอง "${batchName}" จำนวน ${count} ใบลงระบบ...`
      }));

      // High Performance Bulk Insert: บันทึกทั้งชุด 10-100 ใบใน 1 คำสั่ง (เสร็จใน 0.2 วินาที)
      if (typeof callAppScript === 'function') {
        try {
          await callAppScript('SAVE_BATCH', 'Coupons', newCoupons);
        } catch (batchErr) {
          console.warn('[Coupon] SAVE_BATCH failed, falling back to individual save:', batchErr);
          for (let i = 0; i < newCoupons.length; i++) {
            await callAppScript('SAVE_DATA', 'Coupons', newCoupons[i]);
          }
        }
      } else {
        await new Promise(r => setTimeout(r, 60));
      }

      setCreateProgress(prev => ({
        ...(prev || {}),
        status: 'completed',
        current: count,
        percent: 100,
        message: `สร้างชุดคูปอง "${batchName}" เสร็จสมบูรณ์แล้ว!`
      }));

      // Ensure state holds the fully-formed coupons with intact artwork
      setCouponsData(prev => {
        const idSet = new Set(newCoupons.map(c => c.id));
        const filteredPrev = (prev || []).filter(c => !idSet.has(c.id));
        return [...newCoupons, ...filteredPrev];
      });

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
          codeBgStyle: 'none',
          rotation: 0
        },
        expiryConfig: {
          enabled: true,
          xPercent: 32,
          yPercent: 90.5,
          sizePercent: 16,
          color: '#0f172a',
          bgStyle: 'none',
          format: 'numeric',
          prefix: '',
          fontFamily: 'Inter',
          fontWeight: 'normal'
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

    let cleanCode = String(codeToRedeem || '').trim();
    const urlMatch = cleanCode.match(/[?&]code=([^&#]+)/i);
    if (urlMatch && urlMatch[1]) {
      try {
        cleanCode = decodeURIComponent(urlMatch[1]).trim();
      } catch (_) {
        cleanCode = urlMatch[1].trim();
      }
    }
    cleanCode = cleanCode.toUpperCase();

    if (!cleanCode) {
      showToast('กรุณาระบุรหัสคูปอง', 'warning');
      return;
    }

    const target = (couponsData || []).find(c => c && String(c.code || '').trim().toUpperCase() === cleanCode);
    if (!target) {
      showGlobalAlert({
        type: 'warning',
        title: 'ไม่พบคูปองในระบบ',
        text: `ไม่พบคูปองรหัส "${cleanCode}" ในระบบ กรุณาตรวจสอบรหัสหรือเงื่อนไขกับลูกค้าอีกครั้ง`
      });
      return;
    }

    if (target.status === 'used' || target.isUsed || target.is_used) {
      showGlobalAlert({
        type: 'warning',
        title: 'คูปองนี้ถูกใช้งานไปแล้ว',
        text: `คูปองรหัส "${cleanCode}" (${target.title || 'คูปองส่วนลด'}) ถูกใช้งานไปแล้วเมื่อ ${formatDate(target.usedAt || target.used_at || target.updatedAt)} โดยสาขา ${target.usedInBranch || target.used_in_branch || '-'}`
      });
      return;
    }

    if (target.isDeleted || target.is_deleted || target.status === 'cancelled' || target.status === 'revoked') {
      showGlobalAlert({
        type: 'danger',
        title: 'รหัสนี้ถูกยกเลิกสิทธิ์',
        text: `คูปองรหัส "${cleanCode}" (${target.title || 'คูปองส่วนลด'}) ถูกยกเลิกหรือระงับสิทธิ์การใช้งานในระบบแล้ว`
      });
      return;
    }

    const isLifetime = Boolean(target.isLifetime ?? target.is_lifetime);
    const expDate = target.expireDate || target.expire_date;
    if (!isLifetime && expDate) {
      const exp = new Date(expDate);
      exp.setHours(23, 59, 59, 999);
      if (exp.getTime() < Date.now()) {
        showGlobalAlert({
          type: 'warning',
          title: 'คูปองนี้หมดอายุแล้ว',
          text: `คูปองรหัส "${cleanCode}" (${target.title || 'คูปองส่วนลด'}) หมดอายุการใช้งานไปแล้วเมื่อวันที่ ${formatDate(expDate)}`
        });
        return;
      }
    }

    showGlobalAlert({
      type: 'info',
      title: 'ยืนยันการตัดคูปอง?',
      text: `ต้องการตัดคูปองรหัส "${target.code}" (${target.title || 'คูปองส่วนลด'}) ใช่หรือไม่?`,
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

          if (typeof callAppScript === 'function') {
            await callAppScript('SAVE_DATA', 'Coupons', updated);
          }
        } catch (err) {
          showToast('เกิดข้อผิดพลาดในการคืนสิทธิ์คูปอง', 'error');
        }
      }
    });
  };

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
    if (coupon.isLifetime ?? coupon.is_lifetime) return 'ไม่มีวันหมดอายุ';
    const d = coupon.expireDate || coupon.expire_date;
    if (!d) return 'ไม่มีวันหมดอายุ';
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
    const isStrip = isCouponStrip(coupon);
    const themeKey = coupon.themeColor || coupon.theme_color || 'emerald';
    const theme = PRINT_THEMES[themeKey] || PRINT_THEMES.emerald;
    const customImg = coupon.bgImage || coupon.bg_image || coupon.customImageUrl;
    const isCustomImage = Boolean(customImg);

    if (typeof document !== 'undefined' && document.fonts) {
      try {
        await document.fonts.ready;
        const expCfg = getCouponExpiryConfig(coupon);
        if (expCfg?.fontFamily) {
          const fontFamily = getExpiryFontFamily(expCfg.fontFamily);
          const fontWeight = expCfg.fontWeight === 'bold' ? '700' : (expCfg.fontWeight === 'normal' ? '400' : '300');
          await document.fonts.load(`${fontWeight} 24px ${fontFamily}`);
        }
      } catch (e) {
        console.warn('[Coupon] Font loading check warning:', e);
      }
    }

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
      const qrCfg = coupon.qrConfig || coupon.qr_config || { codeType: 'qr', xPercent: 78, yPercent: 32, sizePercent: 26, whiteBg: true, showCode: true, codeColor: '#0f172a', codeBgStyle: 'none', rotation: 0 };
      const isBarcode = qrCfg.codeType === 'barcode';
      const qrRotation = Number(qrCfg.rotation) || 0;

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

      if (qrRotation !== 0) {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((qrRotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
      }

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

      if (qrRotation !== 0) {
        ctx.restore();
      }

      // 3. Draw Expiry Date according to expiryConfig
      const expCfg = getCouponExpiryConfig(coupon);
      if (expCfg && expCfg.enabled !== false) {
        const expText = formatCustomExpiryDate(
          coupon.expireDate || coupon.expire_date,
          expCfg.format,
          coupon.isLifetime ?? coupon.is_lifetime,
          expCfg.prefix
        );
        // Expiry font size scales proportionally with canvas width: 0.2% per sizePercent unit
        const expFontSize = Math.max(12, Math.round((expCfg.sizePercent || 18) * 0.002 * width));
        const fontWeight = expCfg.fontWeight === 'bold' ? '700' : (expCfg.fontWeight === 'normal' ? '400' : '300');
        const fontFamily = getExpiryFontFamily(expCfg.fontFamily);
        ctx.font = `${fontWeight} ${expFontSize}px ${fontFamily}`;
        const expX = Math.round((expCfg.xPercent / 100) * width);
        const expY = Math.round((expCfg.yPercent / 100) * height);
        const textAlign = expCfg.align || 'center';
        ctx.textAlign = textAlign;

        const textMetrics = ctx.measureText(expText);

        if (expCfg.bgStyle === 'white_pill' || expCfg.bgStyle === 'dark_pill') {
          const pillW = textMetrics.width + (expFontSize * 1.2);
          const pillH = expFontSize * 1.6;
          const pillR = pillH / 2;
          const pillX = textAlign === 'left'
            ? expX - (expFontSize * 0.6)
            : (textAlign === 'right' ? expX - pillW + (expFontSize * 0.6) : expX - (pillW / 2));
          ctx.save();
          ctx.fillStyle = expCfg.bgStyle === 'dark_pill' ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.96)';
          ctx.shadowColor = 'rgba(0,0,0,0.15)';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.roundRect(pillX, expY - (pillH / 2), pillW, pillH, pillR);
          ctx.fill();
          ctx.restore();
        }

        // Exact visual vertical center correction matching CSS translate(-50%, -50%)
        const glyphMid = (textMetrics.actualBoundingBoxAscent - textMetrics.actualBoundingBoxDescent) / 2;
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = expCfg.bgStyle === 'dark_pill' ? '#ffffff' : (expCfg.color || '#0f172a');
        ctx.fillText(expText, expX, expY + glyphMid);
        ctx.textAlign = 'left';
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
      const stubWidth = isStrip ? 600 : 340;
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
      const logoSize = isStrip ? 88 : 56;
      const logoX = isStrip ? 60 : 42;
      const logoY = isStrip ? 36 : 32;
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
      ctx.font = `bold ${isStrip ? '34' : '22'}px "Kanit", sans-serif`;
      ctx.fillText(clinicName, headerTextX, logoY + (isStrip ? 4 : 2));

      // Multiline Address (No Ellipsis Truncation, fits up to 3-5 lines)
      const maxHeaderW = stubX - 35 - headerTextX;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = `${isStrip ? '18' : '13'}px "Kanit", sans-serif`;
      const addrLines = wrapCanvasLines(ctx, clinicAddress || '', maxHeaderW);
      const addrLineH = isStrip ? 24 : 17;
      const addrStartY = logoY + (isStrip ? 40 : 28);
      addrLines.slice(0, 3).forEach((line, idx) => {
        ctx.fillText(line, headerTextX, addrStartY + (idx * addrLineH));
      });

      // Contact Line (Phone)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = `${isStrip ? '17' : '12'}px "Kanit", sans-serif`;
      const contactInfo = `โทร: ${clinicPhone || '-'}`;
      const contactY = addrStartY + (Math.min(addrLines.length, 3) * addrLineH) + (isStrip ? 6 : 2);
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
      // Strip title expands right up to the dashed divider line per user request
      const maxTitleW = isStrip ? (stubX - 35 - logoX) : (stubX - 25 - logoX);
      const rawTitle = (coupon.title || 'บัตรกำนัลส่วนลดพิเศษ').trim();
      const hasThai = /[\u0E00-\u0E7F]/.test(rawTitle);

      // Measure text width at 100px base font size
      ctx.font = '900 100px "Kanit", sans-serif';
      const w100 = ctx.measureText(rawTitle).width;

      // Calculate the font size where text naturally expands to fill maxTitleW
      let autoFontSize = Math.floor(100 * (maxTitleW / Math.max(1, w100)));

      // Allow single line title to expand near edge of dashed line (up to 180px on Strip)
      const maxAllowedSize = isStrip ? 180 : 150;
      const minSingleLineSize = isStrip ? 48 : 44;

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
        multiSize = Math.max(isStrip ? 42 : 26, Math.min(isStrip ? 88 : 66, multiSize));

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
        ? (numTerms > 2 ? 30 : (numTerms > 1 ? 36 : 42)) 
        : (numTerms > 3 ? 18 : (numTerms > 2 ? 22 : (numTerms > 1 ? 26 : 32)));
      const termsLineH = isStrip 
        ? (numTerms > 2 ? 34 : 40) 
        : (numTerms > 3 ? 22 : (numTerms > 2 ? 25 : 29));
      let baseTermsFontSize = isStrip 
        ? (numTerms === 1 ? 34 : (numTerms === 2 ? 30 : (numTerms === 3 ? 26 : 22)))
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
        while (ctx.measureText(tLine).width > maxTermsW && curFontSize > (isStrip ? 16 : 13)) {
          curFontSize -= 0.5;
          ctx.font = `600 ${curFontSize}px "Kanit", sans-serif`;
        }

        // ข้อความต่อท้ายแบบวงเล็บ เช่น (ไม่สามารถโอนสิทธิ์ให้ผู้อื่นได้) ให้ขยับเว้นวรรคเข้าด้านในให้ตรงกับเนื้อความหลังดอกจัน
        const isSubClause = tLine.trim().startsWith('(');
        const drawX = isSubClause ? logoX + (isStrip ? 24 : 16) : logoX;
        ctx.fillStyle = isSubClause ? 'rgba(255, 255, 255, 0.88)' : 'rgba(255, 255, 255, 0.95)';

        ctx.fillText(tLine.trim(), drawX, curY);
      });
      ctx.restore();

      const termsBottomY = lastTermsY + (termsLineH * 0.45);

      // 🌟 "ขอบคุณที่ไว้วางใจให้อันผิงดูแลคุณ" - ขยายใหญ่และเลื่อนลงมาด้านล่าง
      const thanksText = 'ขอบคุณที่ไว้วางใจให้อันผิงดูแลคุณ';
      const leftCenterX = logoX + ((stubX - 22 - logoX) / 2);
      const promptY = height - (isStrip ? 76 : 82);
      const thanksY = isStrip 
        ? (promptY - 48)
        : Math.round(termsBottomY + Math.max(18, (promptY - termsBottomY) / 2));

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';

      let thanksFontSize = isStrip ? 56 : (numTerms > 3 ? 32 : (numTerms > 2 ? 35 : 42));
      ctx.font = `900 ${thanksFontSize}px "Kanit", sans-serif`;
      while (ctx.measureText(thanksText).width > (stubX - 35 - logoX) && thanksFontSize > (isStrip ? 28 : 22)) {
        thanksFontSize -= 1;
        ctx.font = `900 ${thanksFontSize}px "Kanit", sans-serif`;
      }
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
      ctx.fillText(thanksText, leftCenterX, thanksY);
      ctx.restore();

      // Bottom Section: Instructions & Clean Expiry Date (ขยายขนาดให้สมส่วนกับแถบยาว 200mm)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = `${isStrip ? '24' : '14'}px "Kanit", sans-serif`;
      ctx.fillText(noteText, logoX, promptY);

      const expY = height - (isStrip ? 34 : 46);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${isStrip ? '30' : '16'}px "Kanit", sans-serif`;
      ctx.fillText(`วันหมดอายุ: ${expCleanStr}`, logoX, expY);

      // 🌟 RIGHT STUB: Discount on Top, QR in Middle, Large Phone on Bottom
      let qrUrl = couponQrCache.get(coupon.code);
      if (!qrUrl) {
        qrUrl = await QRCode.toDataURL(coupon.code, { width: 450, margin: 1 });
        if (couponQrCache.size > 250) {
          const firstKey = couponQrCache.keys().next().value;
          couponQrCache.delete(firstKey);
        }
        couponQrCache.set(coupon.code, qrUrl);
      }
      if (qrUrl) {
        const qrImg = new Image();
        await new Promise(resolve => {
          qrImg.onload = resolve;
          qrImg.onerror = resolve;
          qrImg.src = qrUrl;
        });

        const stubCenter = stubX + (stubWidth / 2);

        // 1. Discount at Top of Stub: คำว่า "ลด" เพิ่ม 2 เท่า (isStrip: 125px)
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 3;

        ctx.font = `bold ${isStrip ? '76' : '78'}px "Kanit", sans-serif`;
        ctx.fillText('ลด', stubCenter, isStrip ? 45 : 74);
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

        let numFont = isStrip ? 145 : 136;
        if (numStr.length >= 4) {
          numFont = isStrip ? 95 : 84;
        } else if (numStr.length === 3) {
          numFont = isStrip ? 120 : 110;
        }
        // Unit is half the size of the number
        const unitFont = isStrip ? Math.round(numFont * 0.52) : Math.round(numFont * 0.50);

        ctx.font = `900 ${numFont}px "Kanit", sans-serif`;
        const numW = ctx.measureText(numStr).width;
        ctx.font = `900 ${unitFont}px "Kanit", sans-serif`;
        const unitW = ctx.measureText(unitStr).width;
        const charGap = isStrip ? 8 : 6;
        const totalDiscountW = numW + unitW + charGap;
        const discountStartX = stubCenter - (totalDiscountW / 2);

        // Baseline Y coordinate: Both number and unit are baseline-aligned at the bottom
        const discountBaseY = isStrip ? 180 : 224;

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

        // 2. White Card with QR Code in Middle of Stub (QR ขยายใหญ่ สมส่วน ยืดลงมาชิดเบอร์โทร)
        const cardBoxW = isStrip ? 430 : 252;
        const cardBoxH = isStrip ? 336 : 266;
        const cardBoxX = stubCenter - (cardBoxW / 2);
        const cardBoxY = isStrip ? 208 : 286;

        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 5;
        ctx.beginPath();
        ctx.roundRect(cardBoxX, cardBoxY, cardBoxW, cardBoxH, isStrip ? 18 : 16);
        ctx.fill();
        ctx.restore();

        // QR Code fills more of the white card (ขยายใหญ่ 260px)
        const qrInnerSize = isStrip ? 260 : 212;
        const qrInnerX = stubCenter - (qrInnerSize / 2);
        const qrInnerY = cardBoxY + (isStrip ? 16 : 12);
        ctx.drawImage(qrImg, qrInnerX, qrInnerY, qrInnerSize, qrInnerSize);

        // Code text under QR
        ctx.save();
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold ${isStrip ? '24' : '17'}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(coupon.code, stubCenter, qrInnerY + qrInnerSize + (isStrip ? 26 : 20));
        ctx.restore();

        // 3. Large Clinic Phone Number at Bottom of Stub (เพิ่มขนาดเบอร์โทร 48px)
        const phoneY = height - (isStrip ? 40 : 38);
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${isStrip ? '48' : '30'}px "Kanit", sans-serif`;
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
        'วันหมดอายุ': (cp.isLifetime ?? cp.is_lifetime) ? 'ไม่มีวันหมดอายุ' : ((cp.expireDate || cp.expire_date) ? formatDate(cp.expireDate || cp.expire_date) : 'ไม่มีวันหมดอายุ'),
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
  // --- 6. Execute A4 Print (Option 1: One-Click Smart Print) ---
  // Automatically detects coupon layout (card 10/page vs strip 5/page) based on coupon design & canvas aspect ratio
  const triggerA4Print = async (couponsToPrint, forcedTemplateType = null) => {
    if (!couponsToPrint || couponsToPrint.length === 0) {
      showToast('ไม่มีคูปองที่จะสั่งพิมพ์', 'warning');
      return;
    }

    const firstCp = couponsToPrint[0];

    const printWin = window.open('', '_blank', 'width=980,height=820');
    if (!printWin) {
      showToast('กรุณาอนุญาตให้เปิดหน้าต่าง Pop-up เพื่อพิมพ์คูปอง', 'warning');
      return;
    }

    // Immediate loading screen in the popup window while high-res canvases are rendered
    printWin.document.open();
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>กำลังเตรียมพิมพ์คูปอง...</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Kanit", sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; color: #334155; background: #f8fafc; }
          .spinner { width: 40px; height: 40px; border: 3.5px solid #e2e8f0; border-top-color: #0284c7; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 16px; }
          @keyframes spin { to { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="spinner"></div>
        <p style="font-weight: 800; font-size: 16px; margin: 0 0 6px 0;">กำลังเรนเดอร์ภาพคูปองความละเอียดสูง (300 DPI)...</p>
        <p style="font-size: 13px; color: #64748b; margin: 0 0 4px 0;">ระบบกำลังตรวจสอบสัดส่วนคูปองและจัดหน้ากระดาษ A4 ให้อัตโนมัติ...</p>
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">ระบบจะเปิดหน้าต่างสั่งพิมพ์ให้อัตโนมัติในสักครู่</p>
      </body>
      </html>
    `);
    printWin.document.close();

    // Pre-render all coupons using generateCouponCanvas to guarantee 100% pixel-perfect
    // parity between single coupon preview/print and batch A4 print.
    const renderedCoupons = await Promise.all(
      couponsToPrint.map(async (cp) => {
        try {
          const cvs = await generateCouponCanvas(cp);
          return {
            coupon: cp,
            canvas: cvs,
            width: cvs ? cvs.width : 0,
            height: cvs ? cvs.height : 0,
            dataUrl: cvs ? cvs.toDataURL('image/png') : ''
          };
        } catch (err) {
          console.error('[Coupon] Pre-render canvas error for print:', err);
          return { coupon: cp, canvas: null, width: 0, height: 0, dataUrl: '' };
        }
      })
    );

    // Auto-detect template format from the actual rendered canvases or coupon metadata
    const firstValid = renderedCoupons.find(r => r.width > 0 && r.height > 0);
    const canvasIsStrip = firstValid ? ((firstValid.width / firstValid.height) >= 2.0) : false;
    const isCouponStripMeta = isCouponStrip(firstCp);

    let isStrip = false;
    if (forcedTemplateType === 'strip') {
      isStrip = true;
    } else if (forcedTemplateType === 'card') {
      // If forced to card, only respect if canvas is NOT a long strip (protects against buggy callers)
      isStrip = canvasIsStrip;
    } else {
      isStrip = canvasIsStrip || isCouponStripMeta;
    }

    const templateLabel = isStrip ? 'แถบยาวชิดขอบ (4 ใบ/หน้า A4)' : 'บัตรการ์ดชิดขอบ (10 ใบ/หน้า A4)';

    const chunkSize = isStrip ? 4 : 10;
    const pages = [];
    for (let i = 0; i < renderedCoupons.length; i += chunkSize) {
      pages.push(renderedCoupons.slice(i, i + chunkSize));
    }

    const pagesHtml = pages.map((pageCoupons) => {
      if (isStrip) {
        // แถบยาวชิดขอบซ้ายขวา 100% (หน้าละ 4 ใบ) พร้อมเส้นประนำตัดบางๆ ระหว่างใบ 1 เส้น
        const vouchersHtml = pageCoupons.map((item, idx) => {
          if (!item || !item.dataUrl) return '';
          const isLast = idx === pageCoupons.length - 1;
          return `
            <div class="t1-voucher-box ${isLast ? 'no-border' : ''}">
              <img src="${item.dataUrl}" alt="${item.coupon?.code || ''}" class="t1-voucher-img" />
            </div>
          `;
        }).join('');

        return `
          <div class="a4-page a4-strip-page">
            <div class="grid-strip">
              ${vouchersHtml}
            </div>
          </div>
        `;
      }

      // Card layout: ชิดขอบ A4 เต็มแผ่น 100% (10 ใบ/หน้า: 2 คอลัมน์ x 5 แถว = 105 x 59.4 mm) ตัดง่ายจากขอบจรดขอบ
      const paddedCoupons = [...pageCoupons];
      while (paddedCoupons.length < chunkSize) {
        paddedCoupons.push(null);
      }

      const cardsHtml = paddedCoupons.map((item) => {
        if (!item || !item.dataUrl) {
          return `<div class="t2-card-box empty"></div>`;
        }
        return `
          <div class="t2-card-box">
            <img src="${item.dataUrl}" alt="${item.coupon.code}" class="t2-card-img" />
          </div>
        `;
      }).join('');

      return `
        <div class="a4-page a4-card-page">
          <div class="grid-card">
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
        <style>
          @page {
            size: A4 portrait;
            margin: 0mm !important;
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
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Kanit", sans-serif;
            color: #0f172a;
          }
          .a4-page {
            width: 210mm;
            height: 297mm;
            page-break-after: always;
            break-after: page;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            overflow: hidden;
            background: #ffffff;
            display: block;
          }
          .a4-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          /* TEMPLATE 2: CARD (ชิดขอบ A4 100%, 10 ใบ/หน้า A4: 2 คอลัมน์ x 5 แถว = 105 x 59.4 mm) - สุดขอบ A4 ตัดง่าย */
          .a4-card-page {
            display: block;
            width: 210mm;
            height: 297mm;
            padding: 0;
            margin: 0;
          }
          .grid-card {
            display: grid;
            grid-template-columns: repeat(2, 105mm);
            grid-template-rows: repeat(5, 59.4mm);
            gap: 0;
            width: 210mm;
            width: 100%;
            height: 297mm;
            height: 100%;
            margin: 0;
            padding: 0;
            border: none;
            box-sizing: border-box;
          }
          .t2-card-box {
            width: 105mm;
            width: 100%;
            height: 59.4mm;
            height: 100%;
            margin: 0;
            padding: 0;
            position: relative;
            box-sizing: border-box;
            border-right: 0.75px dashed #94a3b8;
            border-bottom: 0.75px dashed #94a3b8;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ffffff;
            page-break-inside: avoid;
            break-inside: avoid;
            line-height: 0;
            font-size: 0;
          }
          .t2-card-box:nth-child(2n) {
            border-right: none;
          }
          .t2-card-box:nth-last-child(-n+2) {
            border-bottom: none;
          }
          .t2-card-box.empty {
            background: #ffffff;
          }
          .t2-card-img {
            width: 105mm;
            width: 100%;
            height: 59.4mm;
            height: 100%;
            object-fit: fill;
            display: block;
            margin: 0;
            padding: 0;
          }

          /* TEMPLATE 1: STRIP (แถบยาวชิดขอบซ้ายขวา 100%, 4 ใบ/หน้า A4) - พร้อมเส้นประนำตัดบางๆ ระหว่างใบ 1 เส้น */
          .a4-strip-page {
            display: block;
            width: 210mm;
            height: 297mm;
            padding: 0;
            margin: 0;
          }
          .grid-strip {
            display: flex;
            flex-direction: column;
            gap: 0;
            width: 210mm;
            width: 100%;
            margin: 0;
            padding: 0;
            border: none;
            box-sizing: border-box;
          }
          .t1-voucher-box {
            width: 210mm;
            width: 100%;
            margin: 0;
            padding: 0;
            position: relative;
            box-sizing: border-box;
            border-bottom: 0.75px dashed #94a3b8;
            page-break-inside: avoid;
            break-inside: avoid;
            line-height: 0;
            font-size: 0;
          }
          .t1-voucher-box.no-border,
          .t1-voucher-box:last-child {
            border-bottom: none;
          }
          .t1-voucher-img {
            width: 210mm;
            width: 100%;
            height: auto;
            max-height: 74.25mm;
            display: block;
            margin: 0;
            padding: 0;
            object-fit: fill;
          }

          @media print {
            @page {
              size: A4 portrait;
              margin: 0mm !important;
            }
            html, body {
              width: 210mm !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .a4-page {
              width: 210mm !important;
              height: 297mm !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .a4-strip-page {
              width: 210mm !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .grid-strip {
              width: 210mm !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .t1-voucher-box {
              width: 210mm !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .t1-voucher-img {
              width: 210mm !important;
              width: 100% !important;
              height: auto !important;
              max-height: 74.25mm !important;
            }
            .a4-card-page {
              width: 210mm !important;
              height: 297mm !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .grid-card {
              width: 210mm !important;
              height: 297mm !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .t2-card-box {
              width: 105mm !important;
              height: 59.4mm !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .t2-card-img {
              width: 105mm !important;
              width: 100% !important;
              height: 59.4mm !important;
              height: 100% !important;
            }
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
  };

  return (
    <div className="flex flex-col h-full fade-in pb-20 md:pb-0 relative">
      
      {/* --- 1. Sticky Header --- */}
      <div ref={headerRef} className="sticky z-30 w-full pointer-events-none page-sticky-header flex flex-col" style={{ top: 'var(--mobile-header-offset, 0px)' }}>
        <div className="w-full pointer-events-auto sticky-header-bg shrink-0">
          <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 flex flex-row justify-between items-center gap-2 sm:gap-4 sticky-header-inner">
            <div className="min-w-0">
              <h1 className="font-bold text-slate-800 tracking-tight kanit-text sticky-header-title flex items-center gap-1.5 sm:gap-2">
                <Ticket className="text-sky-500 shrink-0 w-5 h-5 sm:w-6 sm:h-6" />
                <span className="truncate hidden sm:inline">ระบบคูปอง & สิทธิประโยชน์</span>
                <span className="truncate sm:hidden">ระบบคูปอง</span>
              </h1>
              <p className="text-slate-500 kanit-text sticky-header-desc">
                สร้าง ออกแบบ ส่งออกภาพคมชัด และสั่งพิมพ์คูปองส่วนลดแบบชุดมาตรฐาน A4
              </p>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsScanModalOpen(true)}
                className="flex items-center justify-center gap-1.5 p-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl font-bold text-slate-700 bg-white border border-slate-200 shadow-xs hover:bg-slate-50 hover:border-slate-300 transition-all text-xs sm:text-sm active:scale-95 shrink-0 sticky-header-btn"
                title="สแกน / ตัดคูปอง"
              >
                <Camera size={18} className="text-sky-600 shrink-0" />
                <span className="hidden sm:inline">สแกน / ตัดคูปอง</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center justify-center gap-1.5 p-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl font-semibold shadow-xs transition-transform active:scale-95 shrink-0 bg-sky-500 hover:bg-sky-600 text-white text-xs sm:text-sm sticky-header-btn"
                title="สร้างคูปองใหม่"
              >
                <Plus size={18} className="shrink-0" />
                <span className="hidden sm:inline">สร้างคูปองใหม่</span>
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
        className="w-full pointer-events-none sticky z-20 my-5 sm:my-6 sticky-filter-appt"
      >
        <div className="w-full mx-auto pointer-events-none relative h-[60px] sm:h-[76px] z-50">
          <div className={`absolute top-0 left-0 right-0 mx-auto bg-white/95 backdrop-blur-xl border-slate-200 pointer-events-auto origin-top sticky-filter-inner shadow-sm flex flex-col px-4 md:px-8 2xl:px-12 py-2.5 sm:py-3 transition-all duration-300 ${showMobileFilters ? 'ease-out' : 'ease-in'}`}>
            
            {/* Top Toolbar Row */}
            <div className="flex flex-row justify-between items-center gap-2 sm:gap-4 w-full">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-0 w-full">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อคูปอง, รหัส, คนไข้ หรือ HN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-9 sm:pl-11 sm:pr-10 py-2 sm:py-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs sm:text-sm font-medium outline-none focus:bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all font-data truncate"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Mobile Filter Toggle Button (เหมือนหน้าการเงิน) */}
              <button 
                type="button"
                onClick={() => setShowMobileFilters(!showMobileFilters)} 
                className={`lg:hidden p-2.5 rounded-xl border transition-colors shrink-0 ${showMobileFilters || statusFilter !== 'all' ? 'bg-sky-50 border-sky-200 text-sky-600' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                title="ตัวกรองและมุมมองเพิ่มเติม"
              >
                {showMobileFilters ? <ChevronUp size={18} /> : <Filter size={18} />}
              </button>

              {/* Desktop Filters & View Switcher (Visible on lg+) */}
              <div className="hidden lg:flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
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

            {/* Mobile Expandable Filter Panel (Accordion สไตล์เดียวกับหน้าการเงิน) */}
            <div className={`lg:hidden grid transition-[grid-template-rows,opacity] ${showMobileFilters ? 'grid-rows-[1fr] opacity-100 ease-out duration-300' : 'grid-rows-[0fr] opacity-0 pointer-events-none ease-in duration-200'}`}>
              <div className={showMobileFilters ? 'overflow-visible' : 'overflow-hidden'}>
                <div className={`flex flex-col gap-2 pt-2.5 mt-1 border-t border-slate-100 transition-transform ${showMobileFilters ? 'translate-y-0 ease-out duration-300' : '-translate-y-2 ease-in duration-200'}`}>
                  {/* Action Buttons: Template & Export */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsTemplateModalOpen(true)}
                      className="w-full px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold kanit-text transition-all flex items-center justify-center gap-1.5 border border-indigo-200/80 shadow-2xs"
                    >
                      <Bookmark size={14} className="text-indigo-600 shrink-0" />
                      <span>คลังแม่แบบ</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenExportExcel}
                      className="w-full px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold kanit-text transition-all flex items-center justify-center gap-1.5 border border-emerald-200/80 shadow-2xs"
                    >
                      <FileSpreadsheet size={14} className="text-emerald-600 shrink-0" />
                      <span>ส่งออก Excel</span>
                    </button>
                  </div>

                  {/* Status Tabs on Mobile */}
                  <div className="p-1 bg-slate-100/90 rounded-xl grid grid-cols-4 gap-1 border border-slate-200/50">
                    {[
                      { id: 'all', label: 'ทั้งหมด' },
                      { id: 'active', label: 'พร้อมใช้' },
                      { id: 'used', label: 'ใช้แล้ว' },
                      { id: 'expired', label: 'หมดอายุ' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setStatusFilter(tab.id)}
                        className={`py-1.5 rounded-lg text-xs font-bold kanit-text text-center transition-all ${
                          statusFilter === tab.id
                            ? 'bg-white text-slate-800 shadow-2xs font-extrabold'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* View Mode Switcher on Mobile */}
                  <div className="p-1 bg-slate-100/90 rounded-xl grid grid-cols-2 gap-1 border border-slate-200/50">
                    <button
                      onClick={() => setViewMode('batches')}
                      className={`py-1.5 rounded-lg text-xs font-bold kanit-text flex items-center justify-center gap-1.5 transition-all ${
                        viewMode === 'batches'
                          ? 'bg-sky-500 text-white shadow-sm font-extrabold'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Layers size={13} />
                      <span>ชุดคูปอง ({batchGroups.length})</span>
                    </button>
                    <button
                      onClick={() => setViewMode('all_cards')}
                      className={`py-1.5 rounded-lg text-xs font-bold kanit-text flex items-center justify-center gap-1.5 transition-all ${
                        viewMode === 'all_cards'
                          ? 'bg-sky-500 text-white shadow-sm font-extrabold'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Ticket size={13} />
                      <span>รายใบ ({filteredIndividualCoupons.length})</span>
                    </button>
                  </div>
                </div>
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
                <p className="text-xs text-slate-400 mt-1">กดปุ่ม "สร้างคูปองใหม่" เพื่อเพิ่มคูปองเข้าสู่ระบบ</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredBatches.map(batch => {
                  const theme = THEME_STYLES[batch.themeColor] || THEME_STYLES.emerald;
                  const discountText = batch.discountType === 'percent' ? `ลด ${batch.discountValue}%` : `ลด ฿${Number(batch.discountValue).toLocaleString()}`;
                  const usedPercent = batch.total > 0 ? Math.round((batch.usedCount / batch.total) * 100) : 0;

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
                                {batch.isLifetime ? 'ไม่มีวันหมดอายุ' : (batch.expireDate ? `หมด ${formatDate(batch.expireDate)}` : 'ไม่มีวันหมดอายุ')}
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
                            onClick={() => triggerA4Print(batch.coupons)}
                            className="py-2.5 px-3.5 rounded-xl bg-black/30 hover:bg-black/45 text-white text-xs font-bold kanit-text transition-all flex items-center gap-1.5 border border-white/25 shadow-sm active:scale-95"
                            title="พิมพ์ A4 ทันที (สัดส่วนตรงตามที่ออกแบบ 100%)"
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
                {displayedIndividualCoupons.map(cp => {
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
                            {isLifetime ? 'ไม่มีวันหมดอายุ' : `หมดอายุ: ${expDate || '-'}`}
                          </div>
                        </div>
                        <LazyCouponQr
                          code={cp.code}
                          onClick={() => setPreviewCouponModal(cp)}
                          title="คลิกเพื่อดูตัวอย่างคูปองฉบับเต็มก่อนส่งลูกค้า"
                        />
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
                            onClick={() => triggerA4Print([cp])}
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

                {/* Infinite Scroll Sentinel / Load More for Individual Coupons */}
                {individualVisibleCount < filteredIndividualCoupons.length && (
                  <div ref={individualSentinelRef} className="col-span-full py-6 flex flex-col items-center justify-center gap-2">
                    <div className="text-xs text-slate-500 kanit-text font-medium">
                      <span>(แสดงแล้ว {displayedIndividualCoupons.length} จาก {filteredIndividualCoupons.length} ใบ)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIndividualVisibleCount(prev => Math.min(prev + 24, filteredIndividualCoupons.length))}
                      className="px-5 py-2 rounded-xl text-xs font-bold kanit-text bg-slate-100 hover:bg-slate-200 text-slate-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
                    >
                      แสดงเพิ่มเติม
                    </button>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE COUPONS BATCH MODAL (Portal z-[200])                      */}
      {/* ========================================================================= */}
      {isCreateModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-none sm:rounded-3xl w-full max-w-3xl shadow-2xl border-0 sm:border border-slate-100 overflow-hidden flex flex-col h-full sm:h-auto max-h-[100dvh] sm:max-h-[92vh] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-3.5 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50 via-white to-indigo-50/50 shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-sky-500/25 shrink-0">
                  <Ticket size={20} className="sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-slate-800 text-sm sm:text-lg kanit-text leading-tight truncate">
                    สร้างคูปองส่วนลดใหม่
                  </h3>
                  <p className="hidden sm:block text-xs text-slate-500 kanit-text">กำหนดสิทธิประโยชน์ วันหมดอายุ และสาขาที่ให้บริการ</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="px-2.5 sm:px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl text-xs font-bold kanit-text flex items-center gap-1.5 shadow-2xs transition-colors shrink-0"
                  title="เลือกจากคลังแม่แบบ"
                >
                  <Bookmark size={13} className="shrink-0" />
                  <span className="hidden sm:inline">เลือกแม่แบบ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleCreateCoupons} className="flex flex-col flex-1 overflow-hidden min-h-0">
              {/* Scrollable Form Content */}
              <div className="overflow-y-auto overflow-x-hidden custom-scrollbar p-3 sm:p-6 space-y-4 sm:space-y-5 flex-1 w-full max-w-full">
                {/* ส่วนที่ 1: ข้อมูลคูปองและมูลค่าส่วนลด */}
              <div className="bg-slate-50/80 rounded-2xl p-3.5 sm:p-5 border border-slate-200/70 space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-sky-100 flex items-center justify-center text-sky-600 shrink-0">
                    <Tag size={14} className="sm:w-4 sm:h-4" />
                  </div>
                  <h4 className="text-xs sm:text-base font-extrabold text-slate-800 kanit-text">
                    ส่วนที่ 1: ข้อมูลและมูลค่าส่วนลด
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
              <div className="bg-slate-50/80 rounded-2xl p-3.5 sm:p-5 border border-slate-200/70 space-y-3.5">
                <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <ShieldCheck size={14} className="sm:w-4 sm:h-4" />
                  </div>
                  <h4 className="text-xs sm:text-base font-extrabold text-slate-800 kanit-text">
                    ส่วนที่ 2: เงื่อนไขและสาขาที่ให้บริการ
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
                      <span className={`text-xs font-bold kanit-text transition-colors ${form.isLifetime ? 'text-sky-600' : 'text-slate-500'}`}>
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
                          form.isLifetime ? 'bg-sky-500' : 'bg-slate-300'
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
                        className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium cursor-pointer hover:border-sky-400 flex items-center justify-between shadow-2xs group text-left transition-all"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Calendar size={15} className="text-sky-600 group-hover:scale-110 transition-transform shrink-0" />
                          <span className={`truncate text-xs sm:text-sm ${form.expireDate ? 'font-bold text-slate-800 font-data' : 'text-slate-400'}`}>
                            {form.expireDate ? formatDate(form.expireDate) : 'กดเพื่อเลือกวันหมดอายุ'}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-sky-600 bg-sky-50 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border border-sky-100 flex items-center gap-1 shrink-0 ml-2">
                          <Calendar size={12} />
                          <span>เลือกวันที่</span>
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Patient Link with Floating Dropdown Portal & Click Outside */}
                <div ref={patientInputContainerRef} className="relative z-20">
                  <label className="block text-xs font-bold text-slate-700 mb-1 kanit-text">
                    ผูกสิทธิ์กับคนไข้ <span className="text-slate-400 font-normal text-[11px]">(ไม่ระบุ = คูปองทั่วไป)</span>
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
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 kanit-text">
                      สาขาที่สามารถใช้งานได้
                    </label>
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, branchScope: 'all' }))}
                      className={`text-[11px] font-bold kanit-text px-3 py-1 rounded-full transition-all whitespace-nowrap shrink-0 ${
                        (!form.branchScope || form.branchScope === 'all')
                          ? 'bg-sky-500 text-white shadow-2xs'
                          : 'bg-slate-200/80 text-slate-600 hover:bg-slate-300'
                      }`}
                    >
                      ทุกสาขา
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
              <div className="bg-slate-50/80 rounded-2xl p-3.5 sm:p-5 border border-slate-200/70 space-y-3.5">
                <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                    <Layers size={14} className="sm:w-4 sm:h-4" />
                  </div>
                  <h4 className="text-xs sm:text-base font-extrabold text-slate-800 kanit-text">
                    ส่วนที่ 3: รูปแบบและดีไซน์คูปอง
                  </h4>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({
                      ...prev,
                      templateType: 'card',
                      designConfig: { ...(prev.designConfig || {}), layoutType: 'card', templateType: 'card', aspectRatio: '85.6 / 54' }
                    }))}
                    className={`p-2.5 sm:p-3 rounded-2xl border text-center sm:text-left transition-all ${
                      form.templateType === 'card'
                        ? 'border-sky-500 bg-sky-50/70 ring-2 ring-sky-300 shadow-2xs font-bold'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-2 min-w-0">
                      <Ticket size={18} className="text-sky-600 shrink-0 mb-0.5 sm:mb-0 sm:mt-0.5" />
                      <div className="min-w-0 w-full text-center sm:text-left">
                        <div className="text-[11px] sm:text-xs font-bold kanit-text text-slate-800 truncate">แบบการ์ด</div>
                        <div className="text-[9.5px] sm:text-[10px] text-slate-400 font-data truncate">10 ใบ/A4</div>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm(prev => ({
                      ...prev,
                      templateType: 'strip',
                      designConfig: { ...(prev.designConfig || {}), layoutType: 'strip', templateType: 'strip', aspectRatio: '200 / 54' }
                    }))}
                    className={`p-2 sm:p-3 rounded-2xl border text-center sm:text-left transition-all ${
                      form.templateType === 'strip'
                        ? 'border-sky-500 bg-sky-50/70 ring-2 ring-sky-300 shadow-2xs font-bold'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-2 min-w-0">
                      <Scissors size={18} className="text-emerald-600 shrink-0 mb-0.5 sm:mb-0 sm:mt-0.5" />
                      <div className="min-w-0 w-full text-center sm:text-left">
                        <div className="text-[11px] sm:text-xs font-bold kanit-text text-slate-800 truncate">แบบแถบยาว</div>
                        <div className="text-[9.5px] sm:text-[10px] text-slate-400 font-data truncate">4 ใบ/A4</div>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm(prev => ({
                      ...prev,
                      templateType: 'custom_image'
                    }))}
                    className={`p-2 sm:p-3 rounded-2xl border text-center sm:text-left transition-all ${
                      form.templateType === 'custom_image'
                        ? 'border-purple-500 bg-purple-50/70 ring-2 ring-purple-300 shadow-2xs font-bold'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-2 min-w-0">
                      <ImageIcon size={18} className="text-purple-600 shrink-0 mb-0.5 sm:mb-0 sm:mt-0.5" />
                      <div className="min-w-0 w-full text-center sm:text-left">
                        <div className="text-[11px] sm:text-xs font-bold kanit-text text-slate-800 truncate">อัปโหลดเอง</div>
                        <div className="text-[9.5px] sm:text-[10px] text-slate-400 font-data truncate">Canva/ภาพ</div>
                      </div>
                    </div>
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

                    {/* Format Switcher within custom_image */}
                    <div className="flex flex-col xs:flex-row sm:items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-purple-100/70 rounded-xl border border-purple-200 w-full min-w-0">
                      <span className="text-[11px] font-bold text-purple-900 kanit-text px-1 shrink-0">
                        สัดส่วนการพิมพ์:
                      </span>
                      <div className="grid grid-cols-2 gap-1.5 flex-1 w-full min-w-0">
                        <button
                          type="button"
                          onClick={() => setForm(prev => {
                            const isSample = !prev.userUploadedImage || 
                              prev.userUploadedImage === DEFAULT_SAMPLE_STRIP_VOUCHER_ART || 
                              prev.userUploadedImage === DEFAULT_SAMPLE_VOUCHER_ART;
                            return {
                              ...prev,
                              templateType: 'custom_image',
                              customImageUrl: isSample ? DEFAULT_SAMPLE_VOUCHER_ART : (prev.customImageUrl || DEFAULT_SAMPLE_VOUCHER_ART),
                              userUploadedImage: isSample ? DEFAULT_SAMPLE_VOUCHER_ART : prev.userUploadedImage,
                              designConfig: { 
                                ...(prev.designConfig || {}), 
                                layoutType: 'card',
                                templateType: 'card',
                                aspectRatio: '85.6 / 54'
                              }
                            };
                          })}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold kanit-text transition-all flex items-center justify-center gap-1.5 cursor-pointer min-w-0 ${
                            !isCouponStrip(form)
                              ? 'bg-white text-purple-700 shadow-2xs border border-purple-200 ring-1 ring-purple-300'
                              : 'text-purple-600/70 hover:bg-white/50'
                          }`}
                          title="บัตรการ์ด 10 ใบต่อหน้า A4 (85.6 × 54 mm)"
                        >
                          <Ticket size={13} className="shrink-0" />
                          <span className="truncate">การ์ด (10 ใบ)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm(prev => {
                            const isSample = !prev.userUploadedImage || 
                              prev.userUploadedImage === DEFAULT_SAMPLE_STRIP_VOUCHER_ART || 
                              prev.userUploadedImage === DEFAULT_SAMPLE_VOUCHER_ART;
                            return {
                              ...prev,
                              templateType: 'custom_image',
                              customImageUrl: isSample ? DEFAULT_SAMPLE_STRIP_VOUCHER_ART : (prev.customImageUrl || DEFAULT_SAMPLE_STRIP_VOUCHER_ART),
                              userUploadedImage: isSample ? DEFAULT_SAMPLE_STRIP_VOUCHER_ART : prev.userUploadedImage,
                              designConfig: { 
                                ...(prev.designConfig || {}), 
                                layoutType: 'strip',
                                templateType: 'strip',
                                aspectRatio: '200 / 54'
                              }
                            };
                          })}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold kanit-text transition-all flex items-center justify-center gap-1.5 cursor-pointer min-w-0 ${
                            isCouponStrip(form)
                              ? 'bg-white text-purple-700 shadow-2xs border border-purple-200 ring-1 ring-purple-300'
                              : 'text-purple-600/70 hover:bg-white/50'
                          }`}
                          title="แถบยาว 4 ใบต่อหน้า A4 (~210 × 74 mm)"
                        >
                          <Scissors size={13} className="shrink-0" />
                          <span className="truncate">แถบยาว (4 ใบ)</span>
                        </button>
                      </div>
                    </div>

                    {/* ข้อมูลระบุขนาดคร่าวๆ สำหรับ Canva / Photoshop */}
                    <div className="p-3 rounded-xl bg-purple-100/70 border border-purple-200/90 text-xs kanit-text text-purple-950 space-y-1.5">
                      <div className="font-bold flex items-center gap-1.5 text-purple-900">
                        <Sparkles size={14} className="text-purple-600 shrink-0" />
                        <span>ขนาดแนะนำสำหรับออกแบบใน Canva / Photoshop:</span>
                      </div>
                      {isCouponStrip(form) ? (
                        <div className="space-y-1 text-purple-900/90 pl-3 border-l-2 border-emerald-500 text-[11px] sm:text-xs">
                          <div className="font-bold text-emerald-800 flex items-center gap-1">
                            <Scissors size={12} className="shrink-0" />
                            <span>สัดส่วนแบบแถบยาว (พิมพ์เต็มหน้า 4 ใบต่อ A4 ชิดขอบ):</span>
                          </div>
                          <div>
                            • <strong>ขนาดพิมพ์จริง:</strong> กว้าง <strong>210 mm</strong> × สูง <strong>74.25 mm</strong> (หรือขนาดแถบยาวมาตรฐาน ~200 × 54 mm)
                          </div>
                          <div>
                            • <strong>ขนาดพิกเซลแนะนำ (Canva 300 DPI):</strong> <strong>2480 × 877 px</strong> (อัตราส่วนประมาณ <strong>2.8 : 1</strong> ถึง <strong>3.7 : 1</strong> เช่น 2000 × 540 px)
                          </div>
                          <div className="text-[10px] text-purple-700/80">
                            * ระบบจัดวางพิมพ์ชิดขอบซ้าย-ขวาเต็มความกว้างหน้ากระดาษ A4 พอดี
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1 text-purple-900/90 pl-3 border-l-2 border-indigo-500 text-[11px] sm:text-xs">
                          <div className="font-bold text-indigo-800 flex items-center gap-1">
                            <Ticket size={12} className="shrink-0" />
                            <span>สัดส่วนแบบบัตรการ์ด (พิมพ์ 10 ใบต่อ A4 • 2 คอลัมน์):</span>
                          </div>
                          <div>
                            • <strong>ขนาดบัตรมาตรฐาน (CR80):</strong> กว้าง <strong>85.6 mm</strong> × สูง <strong>54 mm</strong>
                          </div>
                          <div>
                            • <strong>ขนาดพิกเซลแนะนำ (Canva 300 DPI):</strong> <strong>1011 × 638 px</strong> (หรือ 856 × 540 px)
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const isStripMode = isCouponStrip(form);
                          if (!form.customImageUrl) {
                            const defaultArt = isStripMode ? DEFAULT_SAMPLE_STRIP_VOUCHER_ART : DEFAULT_SAMPLE_VOUCHER_ART;
                            setForm(prev => ({
                              ...prev,
                              customImageUrl: defaultArt,
                              userUploadedImage: defaultArt,
                              templateType: 'custom_image',
                              designConfig: { ...(prev.designConfig || {}), layoutType: isStripMode ? 'strip' : 'card' }
                            }));
                          }
                          setIsQrEditorOpen(true);
                        }}
                        className="w-full py-2.5 sm:py-3 px-3.5 rounded-xl bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-xs sm:text-sm kanit-text shadow-md shadow-sky-500/25 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
                      >
                        <Sliders size={15} className="shrink-0" />
                        <span>สตูดิโอออกแบบ & วาง QR</span>
                      </button>
                    </div>

                    {form.customImageUrl && (
                      <div className="space-y-3 pt-2">
                        {/* Full Size Live Preview (สัดส่วนจริงเต็มใบ - คลิกเพื่อเปิดเครื่องมือเต็มจอ) */}
                        <div
                          onClick={() => setIsQrEditorOpen(true)}
                          className="p-3 sm:p-4 bg-white rounded-2xl border border-sky-100 flex flex-col items-center cursor-pointer hover:border-sky-300 hover:shadow-md transition-all group w-full min-w-0 overflow-hidden"
                          title="คลิกเพื่อเปิดเครื่องมือจัดตำแหน่งแบบเต็มจอ"
                        >
                          <div className="text-xs font-bold text-slate-700 kanit-text mb-2.5 w-full flex items-center justify-between gap-1.5 border-b border-slate-100 pb-2 min-w-0">
                            <div className="flex items-center gap-1.5 text-sky-700 min-w-0 flex-1">
                              <Eye size={13} className="text-sky-600 shrink-0" />
                              <span className="font-bold shrink-0 hidden xs:inline">พรีวิว:</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold kanit-text truncate ${
                                isCouponStrip(form)
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                              }`}>
                                {isCouponStrip(form) ? '✂️ แถบยาว (4 ใบ)' : '💳 การ์ด (10 ใบ)'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                              {/* ปุ่ม Clear */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setForm(prev => {
                                    const isStripMode = isCouponStrip(prev);
                                    return {
                                      ...prev,
                                      customImageUrl: null,
                                      userUploadedImage: null,
                                      designConfig: {
                                        ...(prev.designConfig || {}),
                                        customImageUrl: null,
                                        bgType: 'color',
                                        layoutType: isStripMode ? 'strip' : 'card',
                                        templateType: isStripMode ? 'strip' : 'card',
                                        aspectRatio: isStripMode ? '200 / 54' : '85.6 / 54'
                                      }
                                    };
                                  });
                                  if (artworkFileInputRef.current) {
                                    artworkFileInputRef.current.value = '';
                                  }
                                  pendingArtworkFileRef.current = null;
                                  showToast('เคลียร์ภาพ Canva แล้ว สามารถอัปโหลดหรือสร้างใหม่ได้ทันที', 'info');
                                }}
                                className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold kanit-text flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs shrink-0"
                                title="เคลียร์รูปภาพ Canva และเริ่มต้นใหม่"
                              >
                                <RotateCcw size={11} className="shrink-0" />
                                <span>Clear</span>
                              </button>

                              <span className="text-[11px] sm:text-xs text-sky-600 group-hover:underline flex items-center gap-0.5 font-bold shrink-0">
                                <span className="hidden sm:inline">แก้ไขตำแหน่ง</span>
                                <ChevronRight size={13} className="shrink-0" />
                              </span>
                            </div>
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
                                transform: `translate(-50%, -50%) rotate(${form.qrConfig.rotation || 0}deg)`,
                                transformOrigin: 'center center',
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
                                  transform: form.expiryConfig.align === 'left'
                                    ? 'translate(0, -50%)'
                                    : (form.expiryConfig.align === 'right' ? 'translate(-100%, -50%)' : 'translate(-50%, -50%)'),
                                  boxSizing: 'border-box',
                                  padding: form.expiryConfig.bgStyle !== 'none' ? '2px 7px' : '0px'
                                }}
                              >
                                <span
                                  className="whitespace-nowrap leading-none select-none drop-shadow-xs"
                                  style={{
                                    fontFamily: getExpiryFontFamily(form.expiryConfig.fontFamily),
                                    fontSize: `${Math.max(9, Math.round((form.expiryConfig.sizePercent || 18) * 0.7))}px`,
                                    fontWeight: form.expiryConfig.fontWeight === 'normal' ? 400 : 300,
                                    color: form.expiryConfig.bgStyle === 'dark_pill' ? '#ffffff' : form.expiryConfig.color,
                                    textAlign: form.expiryConfig.align || 'center',
                                    lineHeight: 1
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
                  <div className="space-y-3">
                    <div className="p-3.5 sm:p-4 bg-gradient-to-br from-slate-50/80 via-white to-sky-50/40 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                            form.templateType === 'strip' 
                              ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-emerald-500/20' 
                              : 'bg-gradient-to-tr from-sky-500 to-indigo-500 text-white shadow-sky-500/20'
                          }`}>
                            {form.templateType === 'strip' ? <Scissors size={18} /> : <Ticket size={18} />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs sm:text-sm font-bold kanit-text text-slate-800">
                                {form.templateType === 'strip' ? 'คูปองแบบแถบยาว' : 'บัตรพรีเมียม'}
                              </span>
                              <span className="text-[10px] font-semibold font-mono px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 shadow-2xs">
                                {form.templateType === 'strip' ? '~210 × 74 mm' : '85.6 × 54 mm'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-data mt-0.5 truncate">
                              {form.templateType === 'strip' ? 'จัดเรียง 4 ใบต่อหน้า A4 • 300 DPI ชิดขอบซ้ายขวา' : 'จัดเรียง 10 ใบต่อหน้า A4 • 2 คอลัมน์ (มาตรฐาน)'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const isStripMode = form.templateType === 'strip';
                          const defaultArt = isStripMode ? DEFAULT_SAMPLE_STRIP_VOUCHER_ART : DEFAULT_SAMPLE_VOUCHER_ART;
                          setForm(prev => ({
                            ...prev,
                            customImageUrl: prev.customImageUrl || defaultArt,
                            userUploadedImage: prev.userUploadedImage || defaultArt,
                            designConfig: { ...(prev.designConfig || {}), layoutType: isStripMode ? 'strip' : 'card' }
                          }));
                          setIsQrEditorOpen(true);
                        }}
                        className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-indigo-500 via-sky-500 to-sky-600 hover:from-indigo-600 hover:to-sky-700 text-white text-xs font-bold kanit-text flex items-center justify-center gap-2 shadow-sm shadow-indigo-500/20 transition-all active:scale-[0.98] cursor-pointer"
                      >
                        <Sliders size={14} />
                        <span>เปิดสตูดิโอปรับแต่งดีไซน์คูปอง & จัดวาง QR</span>
                      </button>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-slate-700 kanit-text">
                          เลือกโทนสีคูปอง ({Object.keys(THEME_STYLES).length} โทนสี)
                        </label>
                        <span className="text-[11px] font-semibold text-sky-600 kanit-text bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200 truncate max-w-[200px]">
                          {THEME_STYLES[form.themeColor]?.shortName || THEME_STYLES[form.themeColor]?.name || form.themeColor}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 sm:gap-2">
                        {Object.values(THEME_STYLES).map(th => {
                          const isSelected = form.themeColor === th.id;
                          return (
                            <button
                              key={th.id}
                              type="button"
                              onClick={() => setForm({ ...form, themeColor: th.id })}
                              title={th.name}
                              className={`p-1.5 sm:p-2 rounded-xl border text-center transition-all bg-white relative cursor-pointer ${
                                isSelected
                                  ? 'border-sky-500 ring-2 ring-sky-300 shadow-2xs font-bold bg-sky-50/20'
                                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                              }`}
                            >
                              <div className={`w-full h-3.5 sm:h-4 rounded-md bg-gradient-to-r ${th.bg} mb-1 shadow-2xs`} />
                              <span className="text-[10px] font-bold kanit-text block truncate text-slate-700">
                                {th.shortName || th.name.split(' ')[0]}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              </div>

              {/* Modal Full-Width Fixed Footer */}
              <div className="px-3.5 py-3 sm:px-6 sm:py-4 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSaveAsTemplate}
                  className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold kanit-text text-xs flex items-center gap-1.5 transition-colors bg-white shadow-2xs whitespace-nowrap shrink-0"
                  title="บันทึกข้อมูลและดีไซน์นี้เป็นแม่แบบ"
                >
                  <Bookmark size={14} className="shrink-0" />
                  <span className="hidden sm:inline">บันทึกเป็นแม่แบบใหม่</span>
                  <span className="sm:hidden">แม่แบบ</span>
                </button>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold kanit-text text-xs hover:bg-slate-100 transition-colors bg-white shadow-2xs whitespace-nowrap shrink-0"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold kanit-text text-xs shadow-md shadow-sky-500/25 transition-all active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Check size={15} className="shrink-0" />
                    <span className="hidden sm:inline">สร้างชุดคูปอง ({form.quantity} ใบ)</span>
                    <span className="sm:hidden">สร้าง ({form.quantity})</span>
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
        initialLayoutType={(form.templateType === 'strip' || form.designConfig?.layoutType === 'strip') ? 'strip' : 'card'}
        onSave={({ qrConfig, expiryConfig, customImageUrl, designConfig, layoutType }) => {
          const chosenLayout = layoutType || designConfig?.layoutType || ((form.templateType === 'strip' || form.designConfig?.layoutType === 'strip') ? 'strip' : 'card');
          setForm(prev => {
            const updated = {
              ...prev,
              qrConfig,
              expiryConfig,
              customImageUrl: customImageUrl || prev.customImageUrl,
              userUploadedImage: prev.userUploadedImage || customImageUrl || prev.customImageUrl,
              designConfig: { ...(designConfig || prev.designConfig || {}), layoutType: chosenLayout },
              templateType: prev.templateType === 'custom_image' ? 'custom_image' : chosenLayout
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
          showToast(`บันทึกดีไซน์คูปอง (${chosenLayout === 'strip' ? 'แบบแถบยาว ~210×74 mm' : 'แบบบัตรพรีเมียม 85.6×54 mm'}) เรียบร้อยแล้ว`, 'success');
        }}
        initialQrConfig={form.qrConfig}
        initialExpiryConfig={form.expiryConfig}
        initialDesignConfig={form.designConfig}
        uploadedArtworkUrl={form.userUploadedImage || form.customImageUrl}
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
                    const customImg = d.customImageUrl || d.userUploadedImage || d.bgImage || d.bg_image || d.designConfig?.customImageUrl || d.designConfig?.bgImage || '';
                    const isStrip = d.templateType === 'strip';
                    const isCustomArt = Boolean(customImg);

                    return (
                      <div
                        key={tpl.id}
                        className="rounded-3xl shadow-md hover:shadow-2xl transition-all duration-300 p-4 sm:p-5 flex flex-col justify-between group relative overflow-hidden text-white border border-white/20 hover:-translate-y-0.5"
                      >
                        {/* Background Artwork or Gradient */}
                        {isCustomArt ? (
                          <div 
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url('${customImg}')` }}
                          >
                            <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]" />
                          </div>
                        ) : (
                          <div className={`absolute inset-0 bg-gradient-to-br ${th.bg}`} />
                        )}

                        {/* Metallic / Glossy Lighting Sheen Overlay */}
                        <div 
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.02) 45%, rgba(255,255,255,0.18) 100%)'
                          }}
                        />

                        {/* Content Layer (z-10) */}
                        <div className="relative z-10 flex flex-col h-full justify-between gap-3">
                          <div>
                            {/* Badges and Delete Action Header */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-extrabold text-white border border-white/25 shadow-2xs">
                                  {isStrip ? '✂️ แถบยาว 200mm' : (isCustomArt ? '🖼️ ภาพอัปโหลด' : '💳 การ์ด 85.6mm')}
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full bg-black/25 backdrop-blur-md text-[10px] font-bold text-white border border-white/20 shadow-2xs font-data">
                                  {d.isLifetime ? 'ไม่มีวันหมดอายุ' : 'VOUCHER'}
                                </span>
                              </div>

                              {/* Delete Template Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTemplate(tpl);
                                }}
                                title="ลบแม่แบบนี้"
                                className="w-7 h-7 rounded-xl bg-black/25 hover:bg-rose-600/90 text-white/80 hover:text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all active:scale-90 shadow-2xs cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>

                            <h4 className="font-extrabold text-base text-white kanit-text drop-shadow-md line-clamp-1">
                              {tpl.name}
                            </h4>
                            <p className="text-xs text-white/80 font-light mt-0.5 line-clamp-1 drop-shadow-sm">
                              {d.description || d.title || 'แม่แบบคูปองส่วนลดสำหรับใช้งานซ้ำ'}
                            </p>
                            <div className="text-2xl font-black text-white font-data mt-2 drop-shadow-lg flex items-baseline gap-2">
                              <span>{discountStr}</span>
                              {d.minSpend > 0 && (
                                <span className="text-[10px] text-white/80 font-normal kanit-text drop-shadow-sm">
                                  (ขั้นต่ำ ฿{Number(d.minSpend).toLocaleString()})
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const restoredDesignConfig = d.designConfig ? {
                                ...d.designConfig,
                                bgType: customImg ? 'image' : (d.designConfig.bgType || 'gradient'),
                                logoEnabled: d.designConfig.logoEnabled ?? false
                              } : (customImg ? {
                                bgType: 'image',
                                gradientKey: d.themeColor || 'emerald',
                                gradientColor1: '#064e3b',
                                gradientColor2: '#047857',
                                solidColor: '#064e3b',
                                sheenEnabled: true,
                                borderEnabled: true,
                                logoEnabled: false,
                                logoX: 6,
                                logoY: 12,
                                logoSize: 11,
                                headerText: '',
                                discountText: '',
                                termsText: ''
                              } : null);

                              setForm(prev => ({
                                ...prev,
                                title: d.title || tpl.name,
                                description: d.description || '',
                                discountType: d.discountType || 'percent',
                                discountValue: d.discountValue || 10,
                                minSpend: d.minSpend || 0,
                                isLifetime: Boolean(d.isLifetime),
                                templateType: customImg ? 'custom_image' : (d.templateType || 'card'),
                                themeColor: d.themeColor || 'emerald',
                                customImageUrl: customImg,
                                userUploadedImage: customImg,
                                designConfig: restoredDesignConfig || prev.designConfig,
                                qrConfig: d.qrConfig || prev.qrConfig,
                                expiryConfig: d.expiryConfig || prev.expiryConfig
                              }));
                              setIsTemplateModalOpen(false);
                              setIsCreateModalOpen(true);
                              showToast(`เลือกใช้แม่แบบ "${tpl.name}" เรียบร้อย`, 'success');
                            }}
                            className="w-full py-2.5 bg-white/90 hover:bg-white text-slate-900 rounded-xl text-xs font-bold kanit-text transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-98 cursor-pointer mt-1"
                          >
                            <span>เลือกใช้แม่แบบนี้</span>
                            <ArrowRight size={13} />
                          </button>
                        </div>
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
                    ส่วนลด: {currentDrillDownBatch.discountType === 'percent' ? `${currentDrillDownBatch.discountValue}%` : `฿${currentDrillDownBatch.discountValue}`} • วันหมดอายุ: {currentDrillDownBatch.isLifetime ? 'ไม่มีวันหมดอายุ' : currentDrillDownBatch.expireDate}
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
                        onClick={() => triggerA4Print(selectedInBatch)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold kanit-text shadow-sm flex items-center gap-1.5 transition-all animate-in fade-in active:scale-95"
                        title="พิมพ์เฉพาะใบที่เลือก (สัดส่วนตรงตามที่ออกแบบ)"
                      >
                        <Printer size={14} />
                        <span>พิมพ์เฉพาะ {selectedInBatch.length} ใบที่เลือก (A4)</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => triggerA4Print(currentDrillDownBatch.coupons)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold kanit-text shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
                      title="พิมพ์คูปองทั้งชุด (สัดส่วนตรงตามที่ออกแบบ 100%)"
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
                {displayedDrillDownCoupons.map((cp, idx) => {
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
                        <LazyCouponQr
                          code={cp.code}
                          className="w-12 h-12 p-0.5 rounded-lg"
                          imgClassName="w-11 h-11 object-contain"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewCouponModal(cp);
                          }}
                          title="คลิกเพื่อดูตัวอย่างคูปองฉบับเต็มก่อนส่งลูกค้า"
                        />
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
                              triggerA4Print([cp]);
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

                {/* Infinite Scroll Sentinel for Drill-Down Modal */}
                {drillDownVisibleCount < currentDrillDownCoupons.length && (
                  <div ref={drillDownSentinelRef} className="col-span-full py-4 flex flex-col items-center justify-center gap-2">
                    <div className="text-xs text-slate-500 kanit-text font-medium">
                      <span>(แสดงแล้ว {displayedDrillDownCoupons.length} จาก {currentDrillDownCoupons.length} ใบ)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDrillDownVisibleCount(prev => Math.min(prev + 24, currentDrillDownCoupons.length))}
                      className="px-4 py-1.5 rounded-xl text-xs font-bold kanit-text bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all active:scale-95 cursor-pointer"
                    >
                      แสดงเพิ่มเติม
                    </button>
                  </div>
                )}
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


      {/* ========================================================================= */}
      {/* MODAL 5: SCAN & REDEEM COUPON MODAL (Shared QrScannerModal)               */}
      {/* ========================================================================= */}
      <QrScannerModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onScan={handleRedeemCoupon}
        showToast={showToast}
        title="สแกน / ตัดคูปอง"
        subtitle="ส่องกล้องไปที่ QR Code บนคูปองของลูกค้า หรือพิมพ์รหัส"
        actionButtonText="ตัดคูปอง"
        placeholder="เช่น CP-XXXX หรือ URL คูปอง"
      />

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
            triggerA4Print([cp]);
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

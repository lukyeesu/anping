import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import CalendarDay from './CalendarDay';
import { rAFThrottle, formatDate, formatDateTime, formatStatNumber, getDynamicTextSize, parsePatientName, getPatientFullName, generateNextHN, getAgeString, getPatientId, useModal, useSwipeDown, getPatientLastVisitStr, formatCurPrint, bahtTextPrint, globalGenerateInformedConsentHtml, globalGenerateRecordHtml, globalGenerateOpdHtml, globalGenerateMedicalCertificateHtml, globalGenerateReceiptHtml, getEffectiveApptStatus, getEffectiveApptDatetimeStr, getEffectiveApptIsoDate, parseThaiDateToISO, parseAnyDate, isSameDay, formatFinTime, formatFinCurrency, getFinDynamicTextClass } from '../global/helpers';
import { 
  LayoutDashboard, Users, CalendarRange, Calculator, 
  Package, BarChart3, Settings, Building2, Search, 
  Plus, X, CheckCircle2, AlertCircle, MapPin, Phone,
  Clock, Stethoscope, FileText, Pill, CreditCard, ShieldCheck, AlertOctagon,
  Pencil, Trash2, AlertTriangle, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ArrowUpDown, Loader2,
  User, Briefcase, Table as TableIcon, CalendarDays, LayoutList, List, Truck,
  ShoppingCart, Tag, Minus, Banknote, QrCode, Receipt, ScanText, Camera, Upload, History, Activity,
  TrendingUp, TrendingDown, Download, Filter, Printer, ShoppingBag, XCircle,
  UserCog, BadgeCheck, Wallet, CalendarClock, DollarSign, Award, CalendarX2, HeartPulse, UserPlus, Mail, CheckSquare, Volume2, Megaphone, Link, ExternalLink, LogOut,
  Lock, Home, Save, UserCheck, Key, RotateCcw
} from 'lucide-react';
import { theme } from '../global/theme';

const CustomSelect = ({ value, onChange, options, placeholder, className, disabled, compact, fullWidth, dropUp }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    const dropdownRef = useRef(null);
    const [dropdownStyle, setDropdownStyle] = useState({});

    const selectedOption = options.find(o => (typeof o === 'object' ? String(o.value) : String(o)) === String(value));
    const displayLabel = selectedOption ? (typeof selectedOption === 'object' ? selectedOption.label : selectedOption) : placeholder;
    const hasColor = selectedOption && typeof selectedOption === 'object' && selectedOption.color;

    const updatePosition = useCallback(() => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        
        // Auto flip if there is not enough space below (220px)
        const spaceBelow = vh - rect.bottom;
        const spaceAbove = rect.top;
        const shouldDropUp = dropUp ? (spaceAbove >= 110 || spaceAbove >= spaceBelow) : (spaceBelow < 220 && spaceAbove > spaceBelow);
        const maxAvailHeight = Math.max(96, Math.min(208, (shouldDropUp ? spaceAbove : spaceBelow) - 12));

        // Auto adjust left/right if it goes off screen
        const isNearRightEdge = rect.right > vw - 120;
        const targetWidth = Math.min(rect.width, vw - 16);
        const clampedLeft = Math.max(8, Math.min(rect.left, vw - targetWidth - 8));

        setDropdownStyle({
            position: 'fixed',
            top: shouldDropUp ? 'auto' : rect.bottom + 4,
            bottom: shouldDropUp ? (vh - rect.top + 4) : 'auto',
            left: (compact && !fullWidth && isNearRightEdge) ? 'auto' : clampedLeft,
            right: (compact && !fullWidth && isNearRightEdge) ? Math.max(8, vw - rect.right) : 'auto',
            width: compact && !fullWidth ? 'auto' : targetWidth,
            minWidth: compact && !fullWidth ? Math.min(rect.width, vw - 16) : undefined,
            maxWidth: 'calc(100vw - 16px)',
            maxHeight: `${maxAvailHeight}px`,
            zIndex: 99999,
            transformOrigin: shouldDropUp ? 'bottom center' : 'top center'
        });
    }, [compact, fullWidth, dropUp]);

    const toggleOpen = (e) => {
        if (disabled) return;
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!isOpen) {
            updatePosition();
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        if (!isOpen) return;

        const handleOutsideClick = (e) => {
            if (containerRef.current && containerRef.current.contains(e.target)) {
                return;
            }
            if (dropdownRef.current && dropdownRef.current.contains(e.target)) {
                return;
            }
            setIsOpen(false);
        };

        const handleScroll = (e) => {
            // หากเลื่อนสกอร์ภายในลิสต์ตัวเลือกของ dropdown เอง ให้ทำงานปกติ
            if (dropdownRef.current && (dropdownRef.current === e.target || dropdownRef.current.contains(e.target))) {
                return;
            }
            // หากเกิดการ scroll ที่อื่น (เช่น ตัว modal หรือหน้าจอ) ให้ปิด dropdown ทันที ป้องกันค้างลอย
            setIsOpen(false);
        };

        const handleResize = () => {
            setIsOpen(false);
        };

        document.addEventListener('mousedown', handleOutsideClick);
        document.addEventListener('touchstart', handleOutsideClick);
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleResize);

        const motionObserver = new MutationObserver(() => {
            if (document.body.matches('.is-dragging-sidebar, .is-sidebar-animating')) {
                setIsOpen(false);
            }
        });
        motionObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

        return () => {
            motionObserver.disconnect();
            document.removeEventListener('mousedown', handleOutsideClick);
            document.removeEventListener('touchstart', handleOutsideClick);
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleResize);
        };
    }, [isOpen]);

    return (
        <div ref={containerRef} className={`relative min-w-0 ${className || ''} ${disabled ? (hasColor ? 'pointer-events-none' : 'opacity-70 pointer-events-none') : ''}`}>
            <div
                tabIndex={disabled ? -1 : 0}
                onClick={toggleOpen}
                className={compact 
                    ? `flex items-center min-w-0 ${fullWidth ? 'w-full px-3 justify-between' : 'justify-center px-2.5'} gap-1 cursor-pointer outline-none bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-xl py-2 transition-all font-data shadow-sm`
                    : hasColor
                        ? `w-full min-w-0 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl border outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm text-left flex justify-between items-center gap-2 font-data font-semibold transition-all ${isOpen ? 'ring-2 ring-sky-500/20' : ''} ${selectedOption.color} ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`
                        : `w-full min-w-0 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl bg-white border outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm text-left flex justify-between items-center gap-2 font-data transition-all ${isOpen ? 'border-sky-500 ring-2 ring-sky-500/20' : 'border-slate-200'} ${disabled ? 'bg-slate-50 cursor-not-allowed text-slate-500' : 'cursor-pointer text-slate-700'}`
                }
            >
                <span className={`min-w-0 truncate ${compact ? 'font-medium text-slate-600 text-sm kanit-text' : ''}`}>{String(displayLabel || (compact ? '' : 'เลือก'))}</span>
                {!disabled && (!compact || fullWidth) && <ChevronDown className={`w-4 h-4 text-slate-400 pointer-events-none shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />}
            </div>
            {isOpen && !disabled && createPortal(
                <div ref={dropdownRef} style={dropdownStyle} className={`bg-white border border-slate-200 rounded-2xl shadow-xl overflow-y-auto overflow-x-hidden custom-scrollbar animate-in fade-in duration-200 ${dropUp ? 'origin-bottom' : 'origin-top'} zoom-in-95`}>
                    {options.length > 0 ? options.map((opt, i) => {
                        const val = typeof opt === 'object' ? opt.value : opt;
                        const lbl = typeof opt === 'object' ? opt.label : opt;
                        const optColor = opt && typeof opt === 'object' && opt.color ? opt.color : '';
                        const isSelected = String(value) === String(val);
                        return (
                            <div
                                key={i}
                                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onChange(val); setIsOpen(false); }}
                                className={`px-3.5 sm:px-4 hover:brightness-95 cursor-pointer border-b border-slate-50 last:border-0 font-data transition-all ${compact && !fullWidth ? 'whitespace-nowrap' : 'whitespace-normal break-words'} text-sm py-2.5 ${
                                    optColor 
                                        ? `${optColor} ${isSelected ? 'font-bold ring-1 ring-inset ring-sky-500/30' : ''}` 
                                        : `${isSelected ? 'bg-sky-50 text-sky-600 font-bold' : 'text-slate-700 hover:bg-sky-50'}`
                                }`}
                            >
                                <span className={`inline-flex items-center gap-2 max-w-full ${compact && !fullWidth ? 'truncate' : 'min-w-0'}`}>
                                    {optColor && <span className="w-2.5 h-2.5 shrink-0 rounded-full bg-current opacity-70" />}
                                    <span className={compact && !fullWidth ? 'truncate' : 'min-w-0 break-words'}>{lbl}</span>
                                </span>
                            </div>
                        );
                    }) : (
                        <div className="px-4 py-3 text-xs text-slate-400 italic text-center kanit-text">ไม่มีข้อมูล</div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};

export default CustomSelect;


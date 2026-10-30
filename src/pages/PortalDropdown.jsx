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

const PortalDropdown = ({ isVisible, children, className }) => {
    const [rect, setRect] = useState(null);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const updateRect = () => {
            if (isVisible && wrapperRef.current) {
                const parent = wrapperRef.current.parentElement;
                if (parent) {
                    setRect(parent.getBoundingClientRect());
                }
            }
        };
        updateRect();
        if (isVisible) {
            window.addEventListener('scroll', updateRect, true);
            window.addEventListener('resize', updateRect);
            const parent = wrapperRef.current?.parentElement;
            let resizeObs;
            if (parent && typeof ResizeObserver !== 'undefined') {
                resizeObs = new ResizeObserver(updateRect);
                resizeObs.observe(parent);
            }
            return () => {
                window.removeEventListener('scroll', updateRect, true);
                window.removeEventListener('resize', updateRect);
                resizeObs?.disconnect();
            };
        }
    }, [isVisible]);

    if (!isVisible) return <span ref={wrapperRef} style={{display: 'none'}} />;
    if (!rect) return <span ref={wrapperRef} style={{display: 'none'}} />;

    const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;
    const shouldDropUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    const clampedWidth = Math.min(rect.width, vw - 16);
    const clampedLeft = Math.max(8, Math.min(rect.left, vw - clampedWidth - 8));
    const maxAvailHeight = Math.max(96, Math.min(240, (shouldDropUp ? spaceAbove : spaceBelow) - 12));

    return createPortal(
        <div 
            className={`fixed z-[99999] overflow-y-auto custom-scrollbar ${className || ''}`}
            style={{
                top: shouldDropUp ? 'auto' : rect.bottom + 4,
                bottom: shouldDropUp ? (vh - rect.top + 4) : 'auto',
                left: clampedLeft,
                width: clampedWidth,
                maxWidth: 'calc(100vw - 16px)',
                maxHeight: `${maxAvailHeight}px`,
                transformOrigin: shouldDropUp ? 'bottom center' : 'top center'
            }}
        >
            {children}
        </div>,
        document.body
    );
};

export default PortalDropdown;


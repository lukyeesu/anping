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
            return () => {
                window.removeEventListener('scroll', updateRect, true);
                window.removeEventListener('resize', updateRect);
            };
        }
    }, [isVisible]);

    if (!isVisible) return <span ref={wrapperRef} style={{display: 'none'}} />;
    if (!rect) return <span ref={wrapperRef} style={{display: 'none'}} />;

    const shouldDropUp = typeof window !== 'undefined' && window.innerHeight - rect.bottom < 220;

    return createPortal(
        <div 
            className={`fixed z-[99999] ${className || ''}`}
            style={{
                top: shouldDropUp ? 'auto' : rect.bottom + 4,
                bottom: shouldDropUp ? (window.innerHeight - rect.top + 4) : 'auto',
                left: rect.left,
                width: rect.width,
                transformOrigin: shouldDropUp ? 'bottom center' : 'top center'
            }}
        >
            {children}
        </div>,
        document.body
    );
};

export default PortalDropdown;


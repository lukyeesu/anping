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

const StatCard = ({ title, value, icon: Icon, color }) => {
  const styles = {
    sky: {
      iconBg: 'bg-sky-50 text-sky-500 border-sky-100',
      text: 'text-sky-600',
      hoverBorder: 'hover:border-sky-200',
      blob: 'bg-sky-50/50'
    },
    emerald: {
      iconBg: 'bg-emerald-50 text-emerald-500 border-emerald-100',
      text: 'text-emerald-600',
      hoverBorder: 'hover:border-emerald-200',
      blob: 'bg-emerald-50/50'
    },
    amber: {
      iconBg: 'bg-amber-50 text-amber-500 border-amber-100',
      text: 'text-amber-600',
      hoverBorder: 'hover:border-amber-200',
      blob: 'bg-amber-50/50'
    },
    slate: {
      iconBg: 'bg-slate-50 text-slate-500 border-slate-100',
      text: 'text-slate-600',
      hoverBorder: 'hover:border-slate-200',
      blob: 'bg-slate-50/50'
    }
  };
  
  const st = styles[color] || styles.slate;

  return (
    <div className={`bg-white p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group ${st.hoverBorder} hover:shadow-md transition-all h-full min-h-[110px] sm:min-h-[140px]`}>
      <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-4 relative z-10">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 ${st.iconBg} rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-sm`}>
          <Icon size={20} className="sm:w-6 sm:h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-[11px] font-black text-slate-400 kanit-text uppercase tracking-wider truncate leading-tight" title={title}>{title}</p>
        </div>
      </div>
      <div className="relative z-10 mt-auto w-full">
        <p className={`font-black ${st.text} font-data whitespace-nowrap overflow-hidden mt-0.5 ${getDynamicTextSize(formatStatNumber(value))}`}>{formatStatNumber(value)}</p>
      </div>
      <div className={`absolute -bottom-6 -right-6 w-20 h-20 sm:w-24 sm:h-24 ${st.blob} rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 z-0 pointer-events-none transform group-hover:scale-150`}></div>
    </div>
  );
};

export default StatCard;


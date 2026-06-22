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

const AnimatedModal = ({ isOpen, isClosing, onClose, title, children, maxWidth = 'max-w-2xl', icon: Icon }) => {
    if (!isOpen) return null;

    const modalContent = (
        <div className={`fixed inset-0 z-[100] flex justify-center items-center p-3 sm:p-8 bg-slate-900/40 backdrop-blur-sm ${isClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
            <div className={`bg-white rounded-[1.5rem] sm:rounded-3xl w-full ${maxWidth} max-h-[85dvh] sm:max-h-[90dvh] shadow-2xl flex flex-col transform border border-slate-100 relative overflow-hidden ${isClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
                <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0 z-10 gap-3">
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        {Icon && (
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 shadow-inner shrink-0">
                                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm sm:text-xl font-bold text-slate-800 kanit-text truncate leading-tight">{title}</h3>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-1.5 sm:p-2 shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors">
                        <X size={18} className="sm:w-5 sm:h-5" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
                    {children}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default AnimatedModal;


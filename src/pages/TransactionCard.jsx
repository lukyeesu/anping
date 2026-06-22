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

const TransactionCard = React.memo(({ tx, openDetailModal, handlePrintReceipt, handleEditTransaction, handleDeleteTransaction, formatDate }) => (
    <div key={tx.id} onClick={() => openDetailModal(tx)} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col cursor-pointer hover:border-sky-300 hover:shadow-md transition-all active:scale-[0.98]">
        <div className="flex justify-between items-start mb-2.5">
            <div className="flex flex-col gap-1">
                <span className="font-bold text-sky-600 kanit-text text-xs bg-sky-50 px-2 py-0.5 rounded-md w-fit truncate max-w-[180px]">{tx.id}</span>
                <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 font-data mt-0.5"><Clock size={12} className="text-slate-400"/> {formatDate(tx.date)} {formatFinTime(tx.date)} น.</div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-1 rounded-md kanit-text shrink-0 border ${tx.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                {tx.status === 'completed' ? 'สำเร็จ' : tx.status}
            </span>
        </div>
        
        <div className="mb-1">
            {tx.patientName ? (
                <div className="font-bold text-slate-800 text-sm kanit-text line-clamp-1">{tx.patientName}</div>
            ) : null}
            <div className={`text-xs ${tx.patientName ? 'text-slate-500' : 'text-slate-800 font-bold'} kanit-text line-clamp-2 mt-1`}>
                {tx.note || '-'}
            </div>
        </div>

        <div className="flex justify-between items-end mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="flex flex-col gap-1.5 min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                    {!tx.isAuto ? (
                        <span className="text-[11px] font-bold text-slate-700 kanit-text truncate">{tx.category}</span>
                    ) : (
                        <span className="text-[10px] font-bold text-sky-600 bg-sky-100 px-1.5 py-0.5 rounded-md kanit-text border border-sky-200">ระบบ POS</span>
                    )}
                </div>
                <div className="text-[10px] font-semibold text-slate-500 kanit-text flex items-center gap-1.5">
                    {tx.method === 'cash' ? <><Banknote size={12}/> เงินสด</> : tx.method === 'transfer' ? <><QrCode size={12}/> โอนเงิน</> : (tx.method === 'credit_card' || tx.method === 'credit') ? <><CreditCard size={12}/> บัตรเครดิต</> : <><Package size={12}/> {tx.method}</>}
                </div>
            </div>
            <div className="text-right flex flex-col gap-1 shrink-0">
                <div className={`font-black font-data text-lg leading-none tracking-tight ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatFinCurrency(tx.amount)}
                </div>
            </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
            <button onClick={(e) => { e.stopPropagation(); handlePrintReceipt(tx, 'A4'); }} className="flex items-center justify-center gap-2 py-2 text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-xl transition-colors font-medium text-xs kanit-text shadow-sm border border-slate-100">
                <Printer size={14} /> พิมพ์
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleEditTransaction(tx); }} className="flex items-center justify-center gap-2 py-2 text-slate-500 hover:text-sky-600 bg-slate-50 hover:bg-sky-50 rounded-xl transition-colors font-medium text-xs kanit-text shadow-sm border border-slate-100">
                <Pencil size={14} /> แก้ไข
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(tx); }} className="flex items-center justify-center gap-2 py-2 text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-xl transition-colors font-medium text-xs kanit-text shadow-sm border border-slate-100">
                <Trash2 size={14} /> ลบ
            </button>
        </div>
    </div>
));

export default TransactionCard;


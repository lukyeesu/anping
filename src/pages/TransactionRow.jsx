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

const TransactionRow = React.memo(({ tx, openDetailModal, handlePrintReceipt, handleEditTransaction, handleDeleteTransaction, formatDate }) => (
    <tr key={tx.id} onClick={() => openDetailModal(tx)} className="border-b border-slate-50 last:border-0 hover:bg-sky-50/50 transition-colors group cursor-pointer">
        <td className="p-4 pl-6 text-left">
            <div className="flex flex-col items-start">
                <span className="text-sm font-data text-slate-800 kanit-text font-medium">{formatDate(tx.date)}</span>
                <span className="text-xs font-data text-slate-500 mt-0.5">{formatFinTime(tx.date)} �.</span>
            </div>
        </td>
        <td className="p-4">
            <span className="text-sm font-bold text-sky-600 kanit-text">{tx.id}</span>
        </td>
        <td className="p-4">
            <div className="flex flex-col gap-1">
                {tx.patientName && (
                    <span className="text-sm text-slate-800 font-data line-clamp-1" title={tx.patientName}>
                        {tx.patientName}
                    </span>
                )}
                <span className={`font-data line-clamp-2 leading-tight ${tx.patientName ? 'text-xs text-slate-500' : 'text-sm text-slate-700'}`} title={tx.note || '-'}>
                    {tx.note || '-'}
                </span>
            </div>
        </td>
        <td className="p-4">
            <div className="flex flex-col items-start justify-center">
                {!tx.isAuto && <span className="text-sm font-bold text-slate-800 kanit-text">{tx.category}</span>}
                {tx.isAuto && <span className="text-[11px] font-bold text-sky-600 bg-sky-50 px-2 py-1 rounded-md w-fit kanit-text border border-sky-100">ระบบ POS</span>}
            </div>
        </td>
        <td className="p-4 text-center">
            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold font-data uppercase tracking-wider flex items-center justify-center gap-1.5 w-fit mx-auto border border-slate-200 shadow-sm">
                {tx.method === 'cash' ? <><Banknote size={12}/> เงินสด</> : tx.method === 'transfer' ? <><QrCode size={12}/> โอนเงิน</> : (tx.method === 'credit_card' || tx.method === 'credit') ? <><CreditCard size={12}/> บัตรเครดิต</> : tx.method}
            </span>
        </td>
        <td className="p-4 text-right">
            <span className={`text-base font-bold font-data ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {tx.type === 'income' ? '+' : '-'}{formatFinCurrency(tx.amount)}
            </span>
        </td>
        <td className="p-4 text-center">
            <span className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold kanit-text ${tx.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                <CheckCircle2 size={12} /> {tx.status === 'completed' ? 'สำเร็จ' : tx.status}
            </span>
        </td>
        <td className="p-4 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-end gap-1">
                <button onClick={(e) => { e.stopPropagation(); handlePrintReceipt(tx, 'A4'); }} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors" title="พิมพ์ใบเสร็จ">
                    <Printer size={16}/>
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleEditTransaction(tx); }} className="p-2 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-colors" title="แก้ไข">
                    <Pencil size={16}/>
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(tx); }} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="ลบ">
                    <Trash2 size={16}/>
                </button>
            </div>
        </td>
    </tr>
));

export default TransactionRow;



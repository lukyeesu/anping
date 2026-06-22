import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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

const CalendarDay = React.memo(({ 
    day, events, isCurrent, dateStr, cornerClass, docsOnThisDay, 
    onDayClick, onShowStaff, renderEventItem, isLoading 
}) => {
    const hasDoctor = docsOnThisDay.length > 0;

    return (
        <div 
            data-date={dateStr}
            onClick={() => !isLoading && onDayClick(day, events)}
            className={`calendar-dropzone border-b border-r border-slate-100 p-0.5 sm:p-2 flex flex-col gap-0.5 sm:gap-1.5 transition-colors group aspect-[1/2] sm:aspect-square overflow-hidden relative cursor-pointer ${isCurrent ? 'bg-sky-50/40' : 'bg-white hover:bg-slate-50'} ${cornerClass} ${isLoading ? 'pointer-events-none' : ''}`}
        >
            <div className="flex justify-between items-center p-0.5 sm:p-1 xl:p-1.5 shrink-0 w-full min-w-0 gap-1">
                <div className="shrink-0 flex items-center justify-start w-5 sm:w-8 xl:w-10">
                    <span className={`text-[10px] sm:text-sm xl:text-base 2xl:text-lg font-bold w-4 h-4 sm:w-8 sm:h-8 xl:w-10 xl:h-10 flex items-center justify-center rounded-full ${isCurrent ? 'bg-sky-500 text-white shadow-md' : 'text-slate-700'}`}>
                        {day}
                    </span>
                </div>
                
                <div className="flex flex-wrap items-center justify-center gap-0.5 sm:gap-1 xl:gap-1.5 flex-1 min-w-0 text-center">
                   {isLoading ? (
                       <div className="w-full max-w-[64px] h-4 bg-slate-100 animate-pulse rounded-full"></div>
                   ) : hasDoctor ? (
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); if(onShowStaff) onShowStaff(day); }}
                        className="text-[7px] sm:text-[9px] xl:text-[11px] 2xl:text-xs bg-emerald-50 text-emerald-600 px-1.5 py-0.5 xl:px-2 xl:py-1 rounded-full flex items-center justify-center gap-1 border border-emerald-100 truncate max-w-full font-bold hover:bg-emerald-100 active:scale-95 transition-all" 
                        title={`แพทย์เข้ากะ: ${docsOnThisDay.map(d => d.name).join(', ')} (คลิกเพื่อดูบุคลากรทั้งหมด)`}
                      >
                         <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 xl:w-2 xl:h-2 rounded-full bg-emerald-500 shrink-0"></div>
                         <span className="truncate">แพทย์ {docsOnThisDay.length} ท่าน</span>
                      </button>
                   ) : (
                      <span className="text-[7px] sm:text-[9px] xl:text-[11px] 2xl:text-xs bg-rose-50 text-rose-500 px-1.5 py-0.5 xl:px-2 xl:py-1 rounded-full flex items-center justify-center gap-1 border border-rose-100 max-w-full font-medium truncate" title="ไม่มีแพทย์เข้ากะ">
                          <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 xl:w-2 xl:h-2 rounded-full bg-rose-500 shrink-0"></div>
                          <span className="truncate">หยุด</span>
                      </span>
                   )}
                </div>

                <div className="shrink-0 flex items-center justify-end w-5 sm:w-8 xl:w-10">
                    {isLoading ? (
                        <div className="w-full max-w-[24px] h-4 bg-sky-100 animate-pulse rounded-full"></div>
                    ) : (
                        events.length > 0 && <span className="text-[7px] sm:text-[10px] xl:text-xs 2xl:text-sm font-bold text-sky-500 bg-sky-50 px-1 sm:px-2 py-0.5 xl:py-1 rounded-full border border-sky-100">+{events.length}</span>
                    )}
                </div>
            </div>
            <div className="flex-1 flex flex-col gap-[1px] sm:gap-0.5 overflow-y-auto custom-scrollbar px-0 pr-0.5 mt-0.5 sm:mt-0 no-drag-zone">
                {isLoading ? (
                    <div className="flex flex-col gap-1 w-full">
                        <div className="h-6 w-full bg-slate-50 animate-pulse rounded-md"></div>
                        <div className="h-6 w-4/5 bg-slate-50 animate-pulse rounded-md"></div>
                        <div className="h-6 w-full bg-slate-50 animate-pulse rounded-md"></div>
                    </div>
                ) : (
                    events.map((ev, idx) => renderEventItem(ev, idx, true))
                )}
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.day === nextProps.day &&
        prevProps.isCurrent === nextProps.isCurrent &&
        prevProps.dateStr === nextProps.dateStr &&
        prevProps.cornerClass === nextProps.cornerClass &&
        prevProps.isLoading === nextProps.isLoading &&
        prevProps.onDayClick === nextProps.onDayClick &&
        prevProps.onShowStaff === nextProps.onShowStaff &&
        prevProps.renderEventItem === nextProps.renderEventItem &&
        prevProps.events.length === nextProps.events.length &&
        prevProps.events.every((ev, i) => ev.id === nextProps.events[i].id && ev.dealStatus === nextProps.events[i].dealStatus && ev.name === nextProps.events[i].name) &&
        prevProps.docsOnThisDay.length === nextProps.docsOnThisDay.length &&
        prevProps.docsOnThisDay.every((doc, i) => doc.id === nextProps.docsOnThisDay[i].id)
    );
});

export default CalendarDay;


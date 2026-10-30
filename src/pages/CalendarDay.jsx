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
            className={`calendar-dropzone border-b border-r border-slate-100 p-1 sm:p-1.5 xl:p-2 flex flex-col gap-0.5 sm:gap-1 xl:gap-1.5 transition-colors group min-h-[88px] sm:min-h-[112px] xl:aspect-square overflow-hidden relative cursor-pointer ${isCurrent ? 'bg-sky-50/40' : 'bg-white hover:bg-slate-50'} ${cornerClass} ${isLoading ? 'pointer-events-none' : ''}`}
        >
            <div className="flex flex-col gap-0.5 sm:gap-1 shrink-0 w-full min-w-0">
                <div className="flex justify-between items-center xl:p-1 shrink-0 w-full min-w-0 gap-0.5 sm:gap-1">
                    <div className="shrink-0 flex items-center justify-start xl:w-10">
                        <span className={`text-[10px] sm:text-xs xl:text-base 2xl:text-lg font-bold w-4 h-4 sm:w-6 sm:h-6 xl:w-9 xl:h-9 2xl:w-10 2xl:h-10 flex items-center justify-center rounded-full ${isCurrent ? 'bg-sky-500 text-white shadow-md' : 'text-slate-700'}`}>
                            {day}
                        </span>
                    </div>
                    
                    <div className="hidden xl:flex flex-wrap items-center justify-center gap-1.5 flex-1 min-w-0 text-center">
                       {isLoading ? (
                           <div className="w-full max-w-[64px] h-4 bg-slate-100 animate-pulse rounded-full"></div>
                       ) : hasDoctor ? (
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); if(onShowStaff) onShowStaff(day); }}
                            className="text-[11px] 2xl:text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full flex items-center justify-center gap-1 border border-emerald-100 truncate max-w-full font-bold hover:bg-emerald-100 active:scale-95 transition-all" 
                            title={`แพทย์เข้ากะ: ${docsOnThisDay.map(d => d.name).join(', ')} (คลิกเพื่อดูบุคลากรทั้งหมด)`}
                          >
                             <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                             <span className="truncate">แพทย์ {docsOnThisDay.length} ท่าน</span>
                          </button>
                       ) : (
                          <span className="text-[11px] 2xl:text-xs bg-rose-50 text-rose-500 px-2 py-1 rounded-full flex items-center justify-center gap-1 border border-rose-100 max-w-full font-medium truncate" title="ไม่มีแพทย์เข้ากะ">
                              <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></div>
                              <span className="truncate">หยุด</span>
                          </span>
                       )}
                    </div>

                    <div className="shrink-0 flex items-center justify-end xl:w-10">
                        {isLoading ? (
                            <div className="w-5 sm:w-6 h-3.5 sm:h-4 bg-sky-100 animate-pulse rounded-full"></div>
                        ) : (
                            events.length > 0 && <span className="text-[8px] sm:text-[10px] xl:text-xs 2xl:text-sm font-bold text-sky-600 bg-sky-50 px-1 sm:px-1.5 xl:px-2 py-0.5 xl:py-1 rounded-full border border-sky-100 leading-none">+{events.length}</span>
                        )}
                    </div>
                </div>

                <div className="flex xl:hidden items-center w-full min-w-0">
                    {isLoading ? (
                        <div className="w-full h-3.5 bg-slate-100 animate-pulse rounded-full"></div>
                    ) : hasDoctor ? (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); if (onShowStaff) onShowStaff(day); }}
                            className="w-full text-[8px] sm:text-[10px] bg-emerald-50 text-emerald-600 px-1 sm:px-1.5 py-0.5 rounded-full flex items-center justify-center gap-0.5 sm:gap-1 border border-emerald-100 min-w-0 font-bold hover:bg-emerald-100 active:scale-95 transition-all leading-tight"
                            title={`แพทย์เข้ากะ: ${docsOnThisDay.map(d => d.name).join(', ')} (คลิกเพื่อดูบุคลากรทั้งหมด)`}
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></div>
                            <span className="truncate"><span className="hidden min-[380px]:inline">แพทย์ </span>{docsOnThisDay.length}<span className="hidden sm:inline"> ท่าน</span></span>
                        </button>
                    ) : (
                        <span className="w-full text-[8px] sm:text-[10px] bg-rose-50 text-rose-500 px-1 sm:px-1.5 py-0.5 rounded-full flex items-center justify-center gap-0.5 sm:gap-1 border border-rose-100 min-w-0 font-medium leading-tight" title="ไม่มีแพทย์เข้ากะ">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></div>
                            <span className="truncate">หยุด</span>
                        </span>
                    )}
                </div>
            </div>
            <div className="flex-1 flex flex-col gap-[1px] sm:gap-0.5 overflow-hidden xl:overflow-y-auto custom-scrollbar px-0 xl:pr-0.5 mt-0.5 sm:mt-0 no-drag-zone min-h-0">
                {isLoading ? (
                    <div className="flex flex-col gap-1 w-full">
                        <div className="h-4 sm:h-5 w-full bg-slate-50 animate-pulse rounded-md"></div>
                        <div className="h-4 sm:h-5 w-4/5 bg-slate-50 animate-pulse rounded-md"></div>
                    </div>
                ) : (
                    <>
                        {events.map((ev, idx) => idx < 2 ? renderEventItem(ev, idx, true) : (
                            <div key={ev.id || idx} className="hidden xl:block w-full shrink-0">
                                {renderEventItem(ev, idx, true)}
                            </div>
                        ))}
                        {events.length > 2 && (
                            <div className="xl:hidden text-[8px] sm:text-[10px] font-bold text-sky-600 bg-sky-50/90 border border-sky-100/80 rounded px-1 py-0.5 text-center truncate shrink-0 leading-tight">
                                +{events.length - 2} รายการ
                            </div>
                        )}
                    </>
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
        prevProps.events.every((ev, i) => 
            ev.id === nextProps.events[i].id && 
            ev.dealStatus === nextProps.events[i].dealStatus && 
            ev.status === nextProps.events[i].status &&
            ev.name === nextProps.events[i].name &&
            ev.category === nextProps.events[i].category &&
            ev.artist === nextProps.events[i].artist &&
            ev.doctor === nextProps.events[i].doctor &&
            ev.rawDeliveryStart === nextProps.events[i].rawDeliveryStart &&
            ev.rawDateTime === nextProps.events[i].rawDateTime &&
            ev.postponeCount === nextProps.events[i].postponeCount &&
            ev.postponedDate === nextProps.events[i].postponedDate &&
            ev.postpone1_date === nextProps.events[i].postpone1_date
        ) &&
        prevProps.docsOnThisDay.length === nextProps.docsOnThisDay.length &&
        prevProps.docsOnThisDay.every((doc, i) => doc.id === nextProps.docsOnThisDay[i].id)
    );
});

export default CalendarDay;


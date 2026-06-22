import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import TransactionRow from './TransactionRow';
import TransactionCard from './TransactionCard';
import Skeleton from './Skeleton';
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

const FinanceTableSection = React.memo(({
    isGlobalLoading, visibleTransactions, isLoadingMore, handlePrintReceipt, openDetailModal, 
    handleEditTransaction, handleDeleteTransaction, formatDate
}) => {
    return (
        <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 mt-0 mb-12 flex-1 flex flex-col pointer-events-auto z-10">
          <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100/50 relative overflow-hidden flex flex-col min-h-[400px]">
            <div className="px-2 sm:px-4 py-4">
                {/* --- Desktop View (Table) --- */}
                <div className="hidden lg:block overflow-x-auto overflow-y-hidden">
                  <table className="w-full text-left border-collapse min-w-[900px] table-auto">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 text-sm"><th className="w-[13%] p-4 font-medium text-left pl-6 w-[120px] kanit-text">วันที่/เวลา</th><th className="w-[11%] p-4 font-medium kanit-text w-[120px]">เลขที่บิล</th><th className="w-[21%] p-4 font-medium kanit-text">รายละเอียด</th><th className="w-[11%] p-4 font-medium kanit-text">ประเภท/บทบาท</th><th className="w-[11%] p-4 font-medium text-center kanit-text w-[120px]">ช่องทาง</th><th className="w-[13%] p-4 font-medium text-right w-[150px] kanit-text">จำนวนเงิน</th><th className="w-[11%] p-4 font-medium text-center w-[100px] kanit-text">สถานะ</th><th className="w-[9%] p-4 font-medium text-right pr-6 w-[100px] kanit-text">ดำเนินการ</th></tr>
                    </thead>
                    <tbody className="">
                      {isGlobalLoading ? (
                         Array.from({ length: 5 }).map((_, i) => (
                          <tr key={`skel-${i}`} className="border-b border-slate-50 last:border-0">
                            <td className="p-4 pl-6"><div className="w-full max-w-[80px] h-[16px] bg-slate-200 animate-pulse rounded-xl mb-1"></div><div className="w-full max-w-[60px] h-[12px] bg-slate-200 animate-pulse rounded-xl"></div></td>
                            <td className="p-4"><div className="w-full max-w-[80px] h-[16px] bg-slate-200 animate-pulse rounded-xl"></div></td>
                            <td className="p-4"><div className="w-full max-w-[150px] h-[16px] bg-slate-200 animate-pulse rounded-xl"></div></td>
                            <td className="p-4"><div className="w-full max-w-[120px] h-[16px] bg-slate-200 animate-pulse rounded-xl"></div></td>
                            <td className="p-4"><div className="w-full max-w-[60px] h-[24px] bg-slate-200 animate-pulse rounded-full mx-auto"></div></td>
                            <td className="p-4 text-right"><div className="w-full max-w-[80px] h-[20px] bg-slate-200 animate-pulse rounded-xl ml-auto"></div></td>
                            <td className="p-4"><div className="w-full max-w-[60px] h-[24px] bg-slate-200 animate-pulse rounded-full mx-auto"></div></td>
                            <td className="p-4 pr-6"><div className="flex gap-2 justify-end"><div className="w-full max-w-[24px] h-[24px] bg-slate-200 animate-pulse rounded-lg"></div><div className="w-full max-w-[24px] h-[24px] bg-slate-200 animate-pulse rounded-lg"></div></div></td>
                          </tr>
                        ))
                      ) : visibleTransactions.length > 0 ? (
                        visibleTransactions.map((tx) => (
                          <TransactionRow 
                            key={tx.id} 
                            tx={tx} 
                            openDetailModal={openDetailModal} 
                            handlePrintReceipt={handlePrintReceipt} 
                            handleEditTransaction={handleEditTransaction} 
                            handleDeleteTransaction={handleDeleteTransaction}
                            formatDate={formatDate}
                          />
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="p-10 text-center text-slate-400">
                            <Receipt size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="kanit-text font-medium text-lg">ไม่มีรายการในระบบ</p>
                          </td>
                        </tr>
                      )}
                      
                      {/* Infinity Loading Skeleton (Desktop) */}
                      {isLoadingMore && Array.from({ length: 3 }).map((_, i) => (
                          <tr key={`skel-fin-more-${i}`} className="border-b border-slate-50 last:border-0">
                            <td className="p-4 pl-6"><div className="w-full max-w-[80px] h-[16px] bg-slate-200 animate-pulse rounded-xl mb-1"></div><div className="w-full max-w-[60px] h-[12px] bg-slate-200 animate-pulse rounded-xl"></div></td>
                            <td className="p-4"><div className="w-full max-w-[80px] h-[16px] bg-slate-200 animate-pulse rounded-xl"></div></td>
                            <td className="p-4"><div className="w-full max-w-[150px] h-[16px] bg-slate-200 animate-pulse rounded-xl"></div></td>
                            <td className="p-4"><div className="w-full max-w-[120px] h-[16px] bg-slate-200 animate-pulse rounded-xl"></div></td>
                            <td className="p-4"><div className="w-full max-w-[60px] h-[24px] bg-slate-200 animate-pulse rounded-full mx-auto"></div></td>
                            <td className="p-4 text-right"><div className="w-full max-w-[80px] h-[20px] bg-slate-200 animate-pulse rounded-xl ml-auto"></div></td>
                            <td className="p-4"><div className="w-full max-w-[60px] h-[24px] bg-slate-200 animate-pulse rounded-full mx-auto"></div></td>
                            <td className="p-4 pr-6"><div className="flex gap-2 justify-end"><div className="w-full max-w-[24px] h-[24px] bg-slate-200 animate-pulse rounded-lg"></div><div className="w-full max-w-[24px] h-[24px] bg-slate-200 animate-pulse rounded-lg"></div></div></td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
  
                {/* --- Mobile View (Cards) --- */}
                <div className="lg:hidden space-y-3 mt-2">
                  {isGlobalLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={`skel-mob-fin-${i}`} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                          <div className="flex justify-between items-center mb-1.5"><div className="w-full max-w-[64px] h-[20px] bg-slate-200 animate-pulse rounded-xl"></div><div className="w-full max-w-[64px] h-[20px] bg-slate-200 animate-pulse rounded-md"></div></div>
                          <div className="mb-3"><div className="w-full max-w-[160px] h-[24px] bg-slate-200 animate-pulse rounded-xl mb-2"></div><div className="w-full max-w-[96px] h-[24px] bg-slate-200 animate-pulse rounded-lg"></div></div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                              <div className="flex items-center gap-2"><div className="w-full max-w-[20px] h-[20px] bg-slate-200 animate-pulse rounded-full"></div><div className="w-full max-w-[128px] h-[16px] bg-slate-200 animate-pulse rounded-xl"></div></div>
                          </div>
                      </div>
                    ))
                  ) : visibleTransactions.length > 0 ? (
                    visibleTransactions.map((tx) => (
                      <TransactionCard 
                        key={tx.id} 
                        tx={tx} 
                        openDetailModal={openDetailModal} 
                        handlePrintReceipt={handlePrintReceipt} 
                        handleEditTransaction={handleEditTransaction} 
                        handleDeleteTransaction={handleDeleteTransaction}
                        formatDate={formatDate}
                      />
                    ))
                  ) : (
                    <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                      <Receipt size={40} className="mx-auto mb-3 opacity-30" />
                      <p className="kanit-text font-bold text-sm">ไม่มีรายการในระบบ</p>
                    </div>
                  )}
  
                  <div className="w-full flex flex-col gap-3 py-2 pb-6">
                    {isLoadingMore && Array.from({ length: 2 }).map((_, i) => (
                      <div key={`skel-mob-fin-more-${i}`} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                          <div className="flex justify-between items-center mb-1.5"><div className="w-full max-w-[64px] h-[20px] bg-slate-200 animate-pulse rounded-xl"></div><div className="w-full max-w-[64px] h-[20px] bg-slate-200 animate-pulse rounded-md"></div></div>
                          <div className="mb-3"><div className="w-full max-w-[160px] h-[24px] bg-slate-200 animate-pulse rounded-xl mb-2"></div><div className="w-full max-w-[96px] h-[24px] bg-slate-200 animate-pulse rounded-lg"></div></div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                              <div className="flex items-center gap-2"><div className="w-full max-w-[20px] h-[20px] bg-slate-200 animate-pulse rounded-full"></div><div className="w-full max-w-[128px] h-[16px] bg-slate-200 animate-pulse rounded-xl"></div></div>
                          </div>
                      </div>
                    ))}
                  </div>
                </div>
            </div>
          </div>
        </div>
    );
});

export default FinanceTableSection;



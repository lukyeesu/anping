import React, { useState, useEffect } from 'react';
import { ShieldCheck, Key, AlertCircle, CheckCircle2, Loader2, ArrowLeft, Eye, EyeOff, User, Clock, Lock, Check } from 'lucide-react';

const ResetPasswordScreen = ({ token, callAppScript, showToast }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass1, setShowPass1] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [isVerifying, setIsVerifying] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [staffInfo, setStaffInfo] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  // ตรวจสอบความถูกต้องและอายุของ Token เมื่อเปิดหน้า
  useEffect(() => {
    let isMounted = true;
    const verifyToken = async () => {
      try {
        const cleanToken = String(token || '').trim();
        if (!cleanToken) {
          if (!isMounted) return;
          setIsTokenValid(false);
          setError('ไม่พบรหัสโทเค็นในลิงก์');
          setIsVerifying(false);
          return;
        }

        const res = await callAppScript('VERIFY_RESET_TOKEN', 'Staff', { token: cleanToken });
        if (!isMounted) return;

        if (res && res.status === 'success') {
          setIsTokenValid(true);
          setStaffInfo({
            name: res.staffName || 'พนักงาน',
            username: res.username || ''
          });
          if (res.expiresAt) {
            setExpiresAt(Number(res.expiresAt));
          }
        } else {
          setIsTokenValid(false);
          setError(res?.message || 'ลิงก์รีเซ็ตรหัสผ่านนี้หมดอายุแล้ว หรือถูกใช้งานไปแล้ว');
        }
      } catch (err) {
        if (!isMounted) return;
        setIsTokenValid(false);
        setError(err.message || 'ไม่สามารถตรวจสอบลิงก์ได้ กรุณาลองใหม่อีกครั้ง');
      } finally {
        if (isMounted) setIsVerifying(false);
      }
    };

    verifyToken();
    return () => { isMounted = false; };
  }, [token, callAppScript]);

  // Live Countdown Timer (15 นาที)
  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeLeft(diff);

      if (diff <= 0) {
        setIsTokenValid(false);
        setError('ลิงก์นี้หมดอายุแล้ว (มีอายุการใช้งาน 15 นาที) กรุณาติดต่อฝ่ายบุคคล (HR) เพื่อขอลิงก์ใหม่');
      }
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [expiresAt]);

  const formatCountdown = (seconds) => {
    if (seconds === null || seconds === undefined) return '15:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const isLengthValid = newPassword.length >= 6;
  const isMatch = newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError('กรุณากรอกรหัสผ่านใหม่ทั้ง 2 ช่อง');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง');
      return;
    }
    if (newPassword.length < 6) {
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const cleanToken = String(token || '').trim();
      const res = await callAppScript('CONFIRM_RESET_PASSWORD', 'Staff', { 
        token: cleanToken, 
        newPassword: String(newPassword).trim() 
      });
      if (res && res.status === 'success') {
        setIsSuccess(true);
        if (showToast) showToast('เปลี่ยนรหัสผ่านใหม่สำเร็จเรียบร้อยแล้ว', 'success');
      } else {
        setError(res?.message || 'ลิงก์รีเซ็ตรหัสผ่านหมดอายุหรือไม่ถูกต้อง');
      }
    } catch (err) {
      console.error('Reset password error', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToLogin = () => {
    window.location.href = window.location.origin;
  };

  // 1. หน้าจอสถานะสำเร็จ (เปลี่ยนรหัสผ่านสำเร็จ)
  if (isSuccess) {
    return (
      <div className="min-h-[100dvh] w-full bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden login-screen-container">
        {/* Decorative background blobs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-sky-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-[10%] left-[20%] w-[30%] h-[30%] bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        <div className="w-full max-w-md bg-white/85 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white p-8 pt-10 relative z-10 text-center animate-scale-up">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-emerald-50">
            <CheckCircle2 size={44} className="animate-bounce" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 kanit-text mb-2">รีเซ็ตรหัสผ่านสำเร็จ!</h2>
          <p className="text-slate-500 text-sm kanit-text mb-2">
            รหัสผ่านของคุณถูกตั้งค่าใหม่เรียบร้อยแล้ว
          </p>
          <p className="text-xs text-slate-400 kanit-text mb-8">
            สามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่นี้ได้ทันที (เพื่อความปลอดภัย กรุณาอย่าเปิดเผยรหัสผ่านแก่ผู้อื่น)
          </p>
          <button 
            type="button"
            onClick={handleGoToLogin} 
            className="w-full py-3.5 px-4 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-bold kanit-text text-base shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <span>เข้าสู่ระบบด้วยรหัสผ่านใหม่</span>
            <ArrowLeft size={18} className="rotate-180" />
          </button>
        </div>
      </div>
    );
  }

  // 2. หน้าจอขณะกำลังตรวจสอบ Token
  if (isVerifying) {
    return (
      <div className="min-h-[100dvh] w-full bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden login-screen-container">
        <div className="w-36 h-36 mx-auto flex items-center justify-center mb-6 bg-white rounded-full p-2 shadow-xl ring-4 ring-white animate-pulse">
          <img 
            src="/anpingclinic.png" 
            alt="Anping Clinic" 
            className="w-full h-full object-contain rounded-full"
          />
        </div>
        <Loader2 className="w-10 h-10 text-sky-500 animate-spin mb-3" />
        <p className="text-slate-600 kanit-text font-medium text-sm animate-pulse">
          กำลังตรวจสอบความถูกต้องของลิงก์เปลี่ยนรหัสผ่าน...
        </p>
      </div>
    );
  }

  // 3. หน้าจอเมื่อลิงก์หมดอายุ หรือ Token ไม่ถูกต้อง
  if (!isTokenValid) {
    return (
      <div className="min-h-[100dvh] w-full bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden login-screen-container">
        {/* Decorative background blobs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-[10%] left-[20%] w-[30%] h-[30%] bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="w-full max-w-md bg-white/85 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white p-8 pt-10 relative z-10 text-center animate-scale-up">
          <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner ring-4 ring-rose-50">
            <AlertCircle size={44} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 kanit-text mb-2">ลิงก์ไม่ถูกต้องหรือหมดอายุ</h2>
          <p className="text-slate-500 text-sm kanit-text mb-4 leading-relaxed">
            {error || 'ลิงก์สำหรับเปลี่ยนรหัสผ่านนี้มีอายุการใช้งาน 15 นาที และได้หมดอายุไปแล้ว หรือถูกใช้งานไปแล้ว'}
          </p>
          <div className="p-3.5 bg-amber-50 border border-amber-200/70 rounded-xl text-amber-800 text-xs kanit-text mb-6 text-left flex items-start gap-2.5">
            <Clock size={16} className="shrink-0 text-amber-600 mt-0.5" />
            <span>หากต้องการเปลี่ยนรหัสผ่าน กรุณาติดต่อฝ่ายบุคคล (HR) หรือผู้ดูแลระบบ เพื่อขอรับลิงก์สร้างรหัสผ่านใหม่อีกครั้ง</span>
          </div>
          <button 
            type="button"
            onClick={handleGoToLogin} 
            className="w-full py-3.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold kanit-text shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <ArrowLeft size={18} />
            <span>กลับไปหน้าเข้าสู่ระบบ</span>
          </button>
        </div>
      </div>
    );
  }

  // 4. หน้าจอหลัก: ฟอร์มตั้งค่ารหัสผ่านใหม่ (ใส่รหัสผ่าน 2 ครั้งเพื่อเป็นการรีเช็ค)
  return (
    <div className="min-h-[100dvh] w-full bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden login-screen-container">
      {/* Decorative background blobs - UX/UI เดียวกับ LoginScreen */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-sky-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-[10%] left-[20%] w-[30%] h-[30%] bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="w-full max-w-md bg-white/85 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white p-8 pt-20 relative z-10 animate-scale-up mt-16 mb-6">
        {/* Floating circular Clinic Logo */}
        <div className="w-36 h-36 mx-auto flex items-center justify-center mb-6 -mt-36 bg-white rounded-full p-1.5 shadow-xl ring-4 ring-white">
          <img 
            src="/anpingclinic.png" 
            alt="Anping Clinic" 
            className="w-full h-full object-contain rounded-full"
          />
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-slate-800 kanit-text mb-1">อันผิงคลินิก (Anping Clinic)</h1>
          <p className="text-sm font-medium text-slate-500 kanit-text">ตั้งค่ารหัสผ่านใหม่ (Set New Password)</p>
        </div>

        {/* Info card: พนักงาน + นับเวลาถอยหลัง 15 นาที */}
        <div className="mb-6 p-3.5 bg-sky-50/80 border border-sky-100 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-600 shrink-0">
              <User size={18} />
            </div>
            <div className="truncate">
              <div className="text-[11px] text-slate-400 kanit-text font-medium leading-none mb-1">บัญชีพนักงาน</div>
              <div className="text-xs sm:text-sm font-bold text-slate-800 kanit-text truncate">
                {staffInfo?.name || 'พนักงาน'}
              </div>
              {staffInfo?.username && (
                <div className="text-[11px] text-sky-600 font-data truncate">@{staffInfo.username}</div>
              )}
            </div>
          </div>

          <div className="text-right shrink-0 pl-2">
            <div className="text-[10px] text-slate-400 kanit-text font-medium flex items-center gap-1 justify-end">
              <Clock size={11} className="text-amber-500" />
              <span>หมดอายุใน</span>
            </div>
            <div className="text-xs sm:text-sm font-black text-amber-600 font-mono">
              {formatCountdown(timeLeft)}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-600 text-xs sm:text-sm kanit-text font-medium animate-shake">
            <AlertCircle size={16} className="shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ช่องใส่รหัสผ่านใหม่ ครั้งที่ 1 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 kanit-text mb-1.5 ml-1">
              รหัสผ่านใหม่ <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock size={17} />
              </div>
              <input 
                type={showPass1 ? 'text' : 'password'}
                className="w-full pl-10 pr-10 py-3 bg-slate-50/60 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all font-data text-slate-700 outline-none text-sm"
                placeholder="กำหนดรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPass1(!showPass1)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                {showPass1 ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* ช่องใส่รหัสผ่านใหม่ ครั้งที่ 2 (รีเช็ค) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 kanit-text mb-1.5 ml-1">
              ยืนยันรหัสผ่านใหม่อีกครั้ง (Re-check) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <ShieldCheck size={17} />
              </div>
              <input 
                type={showPass2 ? 'text' : 'password'}
                className="w-full pl-10 pr-10 py-3 bg-slate-50/60 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all font-data text-slate-700 outline-none text-sm"
                placeholder="พิมพ์รหัสผ่านเดิมอีกครั้งเพื่อยืนยัน"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPass2(!showPass2)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                {showPass2 ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Live Check Checklist (ตัวช่วยรีเช็คแบบเรียลไทม์) */}
          <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3 space-y-1.5 text-xs kanit-text">
            <div className={`flex items-center gap-1.5 ${isLengthValid ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${isLengthValid ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                <Check size={11} />
              </div>
              <span>ความยาวรหัสผ่านอย่างน้อย 6 ตัวอักษร</span>
            </div>
            <div className={`flex items-center gap-1.5 ${isMatch ? 'text-emerald-600 font-semibold' : (confirmPassword ? 'text-rose-500' : 'text-slate-400')}`}>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${isMatch ? 'bg-emerald-100 text-emerald-600' : (confirmPassword ? 'bg-rose-100 text-rose-500' : 'bg-slate-200 text-slate-400')}`}>
                <Check size={11} />
              </div>
              <span>
                {isMatch ? 'รหัสผ่านทั้งสองช่องตรงกันเรียบร้อย' : (confirmPassword ? 'รหัสผ่านทั้งสองช่องยังไม่ตรงกัน' : 'รหัสผ่านทั้งสองช่องต้องตรงกัน')}
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <button 
              type="submit" 
              disabled={isLoading || !isLengthValid || !isMatch}
              className="w-full py-3.5 px-4 bg-gradient-to-br from-sky-400 to-sky-600 hover:from-sky-500 hover:to-sky-700 text-white rounded-xl font-bold kanit-text text-base shadow-lg shadow-sky-500/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 size={19} className="animate-spin" />
                  <span>กำลังบันทึกรหัสผ่าน...</span>
                </>
              ) : (
                <>
                  <Key size={18} />
                  <span>บันทึกรหัสผ่านใหม่</span>
                </>
              )}
            </button>
            
            <button 
              type="button" 
              onClick={handleGoToLogin}
              className="w-full py-2.5 px-4 bg-transparent hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-xl font-bold kanit-text text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={15} />
              <span>กลับไปหน้าเข้าสู่ระบบ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordScreen;

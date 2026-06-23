import React, { useState } from 'react';
import { ShieldCheck, Key, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';

const ResetPasswordScreen = ({ token, callAppScript, showToast }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [isVerifying, setIsVerifying] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);

  React.useEffect(() => {
    const verifyToken = async () => {
      try {
        const res = await callAppScript('VERIFY_RESET_TOKEN', 'Staff', { token });
        if (res.status === 'success') {
          setIsTokenValid(true);
        } else {
          setIsTokenValid(false);
          setError(res.message || 'ลิงก์นี้หมดอายุหรือถูกใช้งานไปแล้ว');
        }
      } catch(err) {
        setIsTokenValid(false);
        setError('ไม่สามารถตรวจสอบลิงก์ได้ กรุณาลองใหม่อีกครั้ง');
      } finally {
        setIsVerifying(false);
      }
    };
    verifyToken();
  }, [token, callAppScript]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError('กรุณากรอกรหัสผ่านให้ครบถ้วน');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    if (newPassword.length < 6) {
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
        const res = await callAppScript('CONFIRM_RESET_PASSWORD', 'Staff', { token, newPassword });
        if (res.status === 'success') {
            setIsSuccess(true);
            if(showToast) showToast('รีเซ็ตรหัสผ่านสำเร็จ คุณสามารถล็อกอินด้วยรหัสผ่านใหม่ได้แล้ว', 'success');
        } else {
            setError(res.message || 'ลิงก์รีเซ็ตรหัสผ่านหมดอายุหรือไม่ถูกต้อง');
        }
    } catch(err) {
        console.error('Reset password error', err);
        setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ');
    } finally {
        setIsLoading(false);
    }
  };

  if (isSuccess) {
      return (
        <div className="min-h-[100dvh] w-full bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden login-screen-container">
            <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white p-8 relative z-10 text-center animate-scale-up">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 kanit-text mb-3">รีเซ็ตรหัสผ่านสำเร็จ!</h2>
                <p className="text-slate-500 text-sm kanit-text mb-8">รหัสผ่านของคุณถูกตั้งค่าใหม่เรียบร้อยแล้ว ตอนนี้คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที</p>
                <button 
                    onClick={() => window.location.href = window.location.origin} 
                    className="w-full py-3.5 px-4 bg-gradient-to-br from-emerald-400 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 text-white rounded-xl font-bold kanit-text shadow-lg shadow-emerald-500/30 flex items-center justify-center transition-all"
                >
                    กลับไปหน้าเข้าสู่ระบบ
                </button>
            </div>
        </div>
      );
  }

  if (isVerifying) {
    return (
      <div className="min-h-[100dvh] w-full bg-slate-50 flex flex-col items-center justify-center p-4 login-screen-container">
         <Loader2 className="w-12 h-12 text-sky-500 animate-spin mb-4" />
         <p className="text-slate-500 kanit-text font-medium animate-pulse">กำลังตรวจสอบข้อมูลลิงก์...</p>
      </div>
    );
  }

  if (!isTokenValid) {
    return (
        <div className="min-h-[100dvh] w-full bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden login-screen-container">
            <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white p-8 relative z-10 text-center animate-scale-up">
                <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 kanit-text mb-3">ลิงก์ไม่ถูกต้อง</h2>
                <p className="text-slate-500 text-sm kanit-text mb-8">{error || 'ลิงก์รีเซ็ตรหัสผ่านนี้หมดอายุ หรือถูกใช้งานไปแล้ว กรุณาขอลิงก์ใหม่อีกครั้ง'}</p>
                <button 
                    onClick={() => window.location.href = window.location.origin} 
                    className="w-full py-3.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold kanit-text shadow-lg flex items-center justify-center gap-2 transition-all"
                >
                    <ArrowLeft size={20} /> กลับไปหน้าเข้าสู่ระบบ
                </button>
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

        <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white p-8 pt-10 relative z-10 animate-scale-up">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-black text-slate-800 kanit-text mb-2">ตั้งค่ารหัสผ่านใหม่</h1>
                <p className="text-sm font-medium text-slate-500 kanit-text">กรุณากำหนดรหัสผ่านใหม่ของคุณ</p>
            </div>

            {error && (
                <div className="mb-6 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-600 text-sm kanit-text font-medium animate-shake">
                    <AlertCircle size={16} className="shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-sm font-bold text-slate-700 kanit-text mb-1.5 ml-1">รหัสผ่านใหม่</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <Key size={18} />
                        </div>
                        <input 
                            type="password" 
                            className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all font-data text-slate-700 outline-none"
                            placeholder="อย่างน้อย 6 ตัวอักษร"
                            value={newPassword}
                            onChange={(e) => {setNewPassword(e.target.value); setError('');}}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 kanit-text mb-1.5 ml-1">ยืนยันรหัสผ่านใหม่</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <ShieldCheck size={18} />
                        </div>
                        <input 
                            type="password" 
                            className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all font-data text-slate-700 outline-none"
                            placeholder="ยืนยันรหัสผ่านอีกครั้ง"
                            value={confirmPassword}
                            onChange={(e) => {setConfirmPassword(e.target.value); setError('');}}
                        />
                    </div>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full py-3.5 px-4 bg-gradient-to-br from-sky-400 to-sky-600 hover:from-sky-500 hover:to-sky-700 text-white rounded-xl font-bold kanit-text text-base shadow-lg shadow-sky-500/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'บันทึกรหัสผ่านใหม่'}
                    </button>
                    
                    <button 
                        type="button" 
                        onClick={() => window.location.href = window.location.origin}
                        className="w-full py-2.5 px-4 bg-transparent hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-xl font-bold kanit-text text-sm transition-all flex items-center justify-center gap-1.5"
                    >
                        <ArrowLeft size={16} /> กลับไปหน้าแรก
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};

export default ResetPasswordScreen;

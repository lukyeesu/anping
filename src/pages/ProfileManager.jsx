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

const ProfileManager = ({ currentUser, setCurrentUser, staffData = [], setStaffData, branchesData = [], callAppScript, showToast, isGlobalLoading, roleLabels = {}, integrationTokens }) => {
  const [formData, setFormData] = useState({
    id: '', name: '', prefix: '', firstName: '', lastName: '', nickname: '', phone: '', email: '', gender: '', photo: '',
    address: '', moo: '', road: '', subDistrict: '', district: '', province: '', zipcode: '',
    curAddress: '', curMoo: '', curRoad: '', curSubDistrict: '', curDistrict: '', curProvince: '', curZipcode: '',
    lineId: '', facebook: '', instagram: '', tiktok: '',
    role: '', category: '', baseSalary: 0, commissionRate: 0, otRate: 0, branchId: '', employmentType: '',
    username: '', position: '', licenseNumber: '', dob: '', emName: '', emRelation: '', emPhone: '', emAddress: '',
    commissionCondition: 'all', commissionThreshold: 0, commissionType: 'percent',
    ...currentUser
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // ดึงข้อมูลพนักงานล่าสุดจาก staffData เพื่อให้ได้ข้อมูลที่ครบถ้วนและอัปเดตที่สุด
  useEffect(() => {
    const freshUser = staffData.find(s => s.id === currentUser.id);
    if (freshUser) {
      setFormData(prev => ({
        ...prev,
        ...freshUser
      }));
    }
  }, [currentUser, staffData]);

  // แยกชื่อจริงและนามสกุลสำหรับกรณีที่ยังไม่มีแยก
  useEffect(() => {
    if (formData.name && (!formData.firstName || !formData.lastName)) {
      const parts = formData.name.split(' ');
      let prefix = '';
      let firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';

      // ค้นหาคำนำหน้า
      const prefixes = ['นพ.', 'พญ.', 'ดร.', 'นส.', 'นาง', 'นาย', 'น.ส.'];
      for (const p of prefixes) {
        if (firstName.startsWith(p)) {
          prefix = p;
          firstName = firstName.replace(p, '');
          break;
        }
      }

      setFormData(prev => ({
        ...prev,
        prefix: prev.prefix || prefix,
        firstName: prev.firstName || firstName,
        lastName: prev.lastName || lastName
      }));
    }
  }, [formData.name]);

  const handleInputChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const handleDobChange = (e) => {
    if (e.nativeEvent && e.nativeEvent.inputType && e.nativeEvent.inputType.includes('delete')) {
        setFormData(prev => ({ ...prev, dob: e.target.value }));
        return;
    }
    let value = e.target.value.replace(/\D/g, ''); 
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 4) value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
    else if (value.length > 2) value = `${value.slice(0, 2)}/${value.slice(2)}`;
    setFormData(prev => ({ ...prev, dob: value }));
  };

  const copyAddressToCurrent = () => {
    setFormData(prev => ({
      ...prev,
      curAddress: prev.address,
      curMoo: prev.moo,
      curRoad: prev.road,
      curSubDistrict: prev.subDistrict,
      curDistrict: prev.district,
      curProvince: prev.province,
      curZipcode: prev.zipcode
    }));
    showToast('คัดลอกที่อยู่ตามทะเบียนบ้านเรียบร้อย', 'success');
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { 
        showToast('ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB', 'warning');
        return;
      }
      setIsProcessing(true);
      showToast('กำลังอัปโหลดรูปภาพโปรไฟล์...', 'success');
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result.split(',')[1]; 
        
        try {
            const response = await callAppScript('UPLOAD_FILE', 'Staff', {
                fileName: `STAFF_${Date.now()}_${file.name}`,
                mimeType: file.type,
                data: base64Data,
                folderId: integrationTokens?.generalDriveFolderId || '1WwPiD2WQLbHK7xnFPW-GnJQj16-NrNb4' 
            });

            if (response.status === 'success' && response.fileUrl) {
                setFormData(prev => ({ ...prev, photo: response.fileUrl }));
                showToast('อัปโหลดรูปโปรไฟล์สำเร็จ (อย่าลืมกดปุ่มบันทึกข้อมูลด้านล่าง)', 'success');
            } else {
                throw new Error(response.message || 'ไม่สามารถรับ URL ของรูปภาพได้');
            }
        } catch (error) {
            console.error("Upload error:", error);
            showToast('เกิดข้อผิดพลาดในการอัปโหลด: ' + error.message, 'danger');
        } finally {
            setIsProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ตรวจสอบความถูกต้องของการเปลี่ยนรหัสผ่าน
    if (showPasswordForm) {
      if (!oldPassword) {
        showToast('กรุณากรอกรหัสผ่านเดิมเพื่อยืนยันตัวตน', 'warning');
        return;
      }
      
      // ดึงข้อมูลรหัสผ่านปัจจุบันจาก currentUser
      const currentPassword = currentUser.password || '';
      if (oldPassword !== currentPassword) {
        showToast('รหัสผ่านเดิมไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง', 'danger');
        return;
      }
      
      if (!newPassword || newPassword.length < 4) {
        showToast('กรุณากำหนดรหัสผ่านใหม่ความยาวอย่างน้อย 4 ตัวอักษร', 'warning');
        return;
      }
      
      if (newPassword !== confirmNewPassword) {
        showToast('รหัสผ่านใหม่และรหัสผ่านยืนยันไม่ตรงกัน', 'danger');
        return;
      }
    }

    setIsProcessing(true);
    
    const fullName = `${formData.prefix}${formData.firstName} ${formData.lastName}`.trim();
    const updatedUser = {
      ...formData,
      name: fullName || formData.name,
      baseSalary: Number(formData.baseSalary),
      commissionRate: Number(formData.commissionRate),
      otRate: Number(formData.otRate)
    };

    // หากผ่านการตรวจสอบและมีการเปลี่ยนรหัสผ่าน ให้ตั้งรหัสผ่านใหม่
    if (showPasswordForm) {
      updatedUser.password = newPassword;
    }

    try {
      if (callAppScript) {
        await callAppScript('SAVE_DATA', 'Staff', updatedUser);
      }
      
      // อัปเดตข้อมูลระดับแอพ
      setCurrentUser(updatedUser);
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('clinic_currentUser', JSON.stringify(updatedUser));
      }
      
      // อัปเดตข้อมูลในสเตตพนักงาน
      setStaffData(prev => prev.map(s => s.id === updatedUser.id ? updatedUser : s));
      
      // รีเซ็ตฟอร์มรหัสผ่าน
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowPasswordForm(false);

      showToast('บันทึกข้อมูลส่วนตัวและรหัสผ่านสำเร็จเรียบร้อย', 'success');
    } catch(err) {
      showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'danger');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Card Header */}
        <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-sky-400 to-sky-600 relative"></div>
          <div className="px-6 pb-6 relative flex flex-col md:flex-row items-center md:items-end gap-5 -mt-10">
            <div className="relative group w-28 h-28 rounded-full border-4 border-white bg-slate-100 shadow-md overflow-hidden cursor-pointer shrink-0" onClick={() => fileInputRef.current?.click()}>
              {formData.photo ? (
                <img src={formData.photo} alt={formData.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50"><User size={48} /></div>
              )}
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={20} className="mb-0.5" />
                <span className="text-[10px] kanit-text">เปลี่ยนรูป</span>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </div>
            
            <div className="text-center md:text-left flex-1 min-w-0 md:pb-2">
              <h2 className="text-xl font-bold text-slate-800 kanit-text truncate">{formData.name} {formData.nickname && <span className="text-slate-400 font-medium text-lg">({formData.nickname})</span>}</h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-1.5 text-xs text-slate-500 kanit-text font-medium text-left">
                <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">รหัสพนักงาน: {formData.empCode || formData.id}</span>
                <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">แผนก: {formData.category === 'doctor' ? 'แพทย์' : formData.category === 'staff' ? 'สต๊าฟ/พนักงาน' : formData.category || 'ทั่วไป'}</span>
                <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg font-bold border border-emerald-100 flex items-center gap-1.5">
                  <span className="w-full max-w-[6px] h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  ตำแหน่ง: {formData.position || roleLabels[formData.role] || formData.role || 'พนักงาน'}
                </span>
                {formData.branchId && <span className="bg-sky-50 text-sky-600 px-2.5 py-1 rounded-lg">สาขา: {formData.branchId === 'all' ? 'ทุกสาขา' : branchesData.find(b => b.id === formData.branchId)?.name || formData.branchId}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* บัญชีผู้ใช้เข้าระบบ */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-sky-600 border-b border-slate-100 pb-3 flex items-center gap-2 kanit-text"><UserCheck size={18} /> ข้อมูลบัญชีผู้ใช้</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1 kanit-text">ID พนักงาน (Username สำหรับเข้าระบบ)</label>
              <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed text-sm font-data" value={formData.username || ''} readOnly disabled placeholder="สำหรับเข้าสู่ระบบ" />
            </div>
            <div>
              {!showPasswordForm ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1 kanit-text">รหัสผ่าน</label>
                  <button type="button" onClick={() => setShowPasswordForm(true)} className="w-full py-2.5 bg-sky-50 border border-sky-100 text-sky-600 hover:text-sky-700 hover:bg-sky-100 rounded-xl font-bold kanit-text text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                    <Key size={14} /> เปลี่ยนรหัสผ่านใหม่
                  </button>
                </div>
              ) : (
                <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 relative animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="text-xs font-bold text-slate-700 kanit-text flex items-center gap-1.5"><Key size={14} className="text-sky-500" /> ตั้งค่ารหัสผ่านใหม่</h4>
                    <button type="button" onClick={() => { setShowPasswordForm(false); setOldPassword(''); setNewPassword(''); setConfirmNewPassword(''); }} className="text-slate-400 hover:text-slate-600 text-xs font-bold kanit-text transition-colors">ยกเลิก</button>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1 ml-1 kanit-text">รหัสผ่านเดิม <span className="text-rose-500">*</span></label>
                    <input type="password" required={showPasswordForm} value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-xs focus:border-sky-500" placeholder="ระบุรหัสผ่านที่ใช้งานปัจจุบัน" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1 ml-1 kanit-text">รหัสผ่านใหม่ <span className="text-rose-500">*</span></label>
                    <input type="password" required={showPasswordForm} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-xs focus:border-sky-500" placeholder="อย่างน้อย 4 ตัวอักษร" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1 ml-1 kanit-text">ยืนยันรหัสผ่านใหม่ <span className="text-rose-500">*</span></label>
                    <input type="password" required={showPasswordForm} value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-xs focus:border-sky-500" placeholder="ระบุรหัสผ่านใหม่อีกครั้ง" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* ข้อมูลทั่วไป */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-sky-600 border-b border-slate-100 pb-3 flex items-center gap-2 kanit-text"><UserCheck size={18} /> ข้อมูลส่วนตัว</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">คำนำหน้า <span className="text-rose-500">*</span></label>
                <select required className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm kanit-text" value={formData.prefix} onChange={(e) => handleInputChange('prefix', e.target.value)}>
                  <option value="">เลือก</option>
                  <option value="นาย">นาย</option>
                  <option value="นาง">นาง</option>
                  <option value="นางสาว">นางสาว</option>
                  <option value="ดร.">ดร.</option>
                  <option value="นพ.">นพ.</option>
                  <option value="พญ.">พญ.</option>
                  <option value="ทพ.">ทพ.</option>
                  <option value="ทพญ.">ทพญ.</option>
                  <option value="น.ส.">น.ส.</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">ชื่อจริง <span className="text-rose-500">*</span></label>
                <input required type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.firstName} onChange={(e) => handleInputChange('firstName', e.target.value)} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">นามสกุล <span className="text-rose-500">*</span></label>
                <input required type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.lastName} onChange={(e) => handleInputChange('lastName', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">ชื่อเล่น</label>
                <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.nickname || ''} onChange={(e) => handleInputChange('nickname', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">ตำแหน่งงาน</label>
                <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.position || ''} onChange={(e) => handleInputChange('position', e.target.value)} placeholder="เช่น แพทย์แผนจีน, ผู้ช่วย..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">เลขที่ใบประกอบโรคศิลป์</label>
                <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.licenseNumber || ''} onChange={(e) => handleInputChange('licenseNumber', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">วันเกิด</label>
                <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.dob || ''} onChange={handleDobChange} placeholder="DD/MM/YYYY" maxLength="10" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">เพศ</label>
                <select className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm kanit-text" value={formData.gender} onChange={(e) => handleInputChange('gender', e.target.value)}>
                  <option value="">เลือก</option>
                  <option value="ชาย">ชาย</option>
                  <option value="หญิง">หญิง</option>
                  <option value="ไม่ระบุ">ไม่ระบุ</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">เบอร์โทรศัพท์ <span className="text-rose-500">*</span></label>
                <input required type="tel" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.phone || ''} onChange={(e) => handleInputChange('phone', e.target.value)} placeholder="08X-XXX-XXXX" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">อีเมล</label>
                <input type="email" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.email || ''} onChange={(e) => handleInputChange('email', e.target.value)} placeholder="name@example.com" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">หมายเลขบัตรประชาชน</label>
              <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.idCard || ''} onChange={(e) => handleInputChange('idCard', e.target.value)} maxLength="13" />
            </div>
          </div>

          {/* ข้อมูลโซเชียลและการติดต่อ */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-sky-600 border-b border-slate-100 pb-3 flex items-center gap-2 kanit-text"><Phone size={18} /> โซเชียลมีเดีย</h3>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1 kanit-text">Line ID</label>
              <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.lineId || ''} onChange={(e) => handleInputChange('lineId', e.target.value)} placeholder="Line ID" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1 kanit-text">Facebook</label>
              <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.facebook || ''} onChange={(e) => handleInputChange('facebook', e.target.value)} placeholder="ชื่อ Facebook" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1 kanit-text">Instagram</label>
              <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.instagram || ''} onChange={(e) => handleInputChange('instagram', e.target.value)} placeholder="@username" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1 kanit-text">TikTok</label>
              <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.tiktok || ''} onChange={(e) => handleInputChange('tiktok', e.target.value)} placeholder="@username" />
            </div>
          </div>

          {/* ที่อยู่ตามทะเบียนบ้าน */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-sky-600 border-b border-slate-100 pb-3 flex items-center gap-2 kanit-text"><Home size={18} /> ที่อยู่ตามทะเบียนบ้าน</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">ที่อยู่ (เลขที่ / ชื่อหมู่บ้าน)</label>
              <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.address || ''} onChange={(e) => handleInputChange('address', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">หมู่ที่</label>
                <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.moo || ''} onChange={(e) => handleInputChange('moo', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">ซอย/ถนน</label>
                <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.road || ''} onChange={(e) => handleInputChange('road', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">แขวง/ตำบล</label>
                <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.subDistrict || ''} onChange={(e) => handleInputChange('subDistrict', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">เขต/อำเภอ</label>
                <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.district || ''} onChange={(e) => handleInputChange('district', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">จังหวัด</label>
                <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.province || ''} onChange={(e) => handleInputChange('province', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">รหัสไปรษณีย์</label>
                <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.zipcode || ''} onChange={(e) => handleInputChange('zipcode', e.target.value)} maxLength="5" />
              </div>
            </div>
          </div>

          {/* ที่อยู่ปัจจุบัน */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-sky-600 flex items-center gap-2 kanit-text"><MapPin size={18} /> ที่อยู่ปัจจุบัน</h3>
              <button type="button" onClick={copyAddressToCurrent} className="text-[11px] font-bold text-sky-500 hover:text-sky-600 border border-sky-200 hover:bg-sky-50 px-2.5 py-1 rounded-lg kanit-text transition-colors">คัดลอกจากทะเบียนบ้าน</button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">ที่อยู่ (เลขที่ / ชื่อหมู่บ้าน)</label>
              <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.curAddress || ''} onChange={(e) => handleInputChange('curAddress', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">หมู่ที่</label>
                <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.curMoo || ''} onChange={(e) => handleInputChange('curMoo', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">ซอย/ถนน</label>
                <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.curRoad || ''} onChange={(e) => handleInputChange('curRoad', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">แขวง/ตำบล</label>
                <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.curSubDistrict || ''} onChange={(e) => handleInputChange('curSubDistrict', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">เขต/อำเภอ</label>
                <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.curDistrict || ''} onChange={(e) => handleInputChange('curDistrict', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">จังหวัด</label>
                <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.curProvince || ''} onChange={(e) => handleInputChange('curProvince', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">รหัสไปรษณีย์</label>
                <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.curZipcode || ''} onChange={(e) => handleInputChange('curZipcode', e.target.value)} maxLength="5" />
              </div>
            </div>
          </div>

          {/* ผู้ติดต่อกรณีฉุกเฉิน */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-sm space-y-4 md:col-span-2">
            <h3 className="text-sm font-bold text-sky-600 border-b border-slate-100 pb-3 flex items-center gap-2 kanit-text"><Phone size={18} /> ผู้ติดต่อกรณีฉุกเฉิน</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">ชื่อผู้ติดต่อ</label>
                <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.emName || ''} onChange={(e) => handleInputChange('emName', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">เกี่ยวข้องเป็น</label>
                <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.emRelation || ''} onChange={(e) => handleInputChange('emRelation', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">เบอร์โทรศัพท์ติดต่อ</label>
                <input type="tel" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.emPhone || ''} onChange={(e) => handleInputChange('emPhone', e.target.value)} />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 kanit-text">ที่อยู่ที่ติดต่อได้</label>
                <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-data" value={formData.emAddress || ''} onChange={(e) => handleInputChange('emAddress', e.target.value)} />
              </div>
            </div>
          </div>

          {/* ข้อมูลการทำงานและค่าตอบแทน (Read-only) */}
          <div className="bg-slate-100/70 p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 md:col-span-2">
            <h3 className="text-sm font-bold text-slate-700 border-b border-slate-200 pb-3 flex items-center gap-2 kanit-text"><Lock size={18} className="text-slate-500" /> ข้อมูลระบบการจ้างงานและค่าตอบแทน (ล็อกเฉพาะผู้ดูแลระบบแก้ไขได้)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1 kanit-text">ตำแหน่งงาน (Position)</label>
                <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-slate-200/60 border border-slate-300 text-slate-500 cursor-not-allowed text-sm font-data" value={formData.position || roleLabels[formData.role] || formData.role} readOnly />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1 kanit-text">ประเภทการจ้างงาน</label>
                <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-slate-200/60 border border-slate-300 text-slate-500 cursor-not-allowed text-sm font-data" value={formData.employmentType === 'monthly' ? 'รายเดือน' : formData.employmentType === 'daily' ? 'รายวัน' : formData.employmentType === 'hourly' ? 'Part-time (รายชั่วโมง)' : formData.employmentType || 'ไม่ระบุ'} readOnly />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1 kanit-text">
                  {formData.employmentType === 'monthly' ? 'เงินเดือนฐาน (Base Salary)' : 
                   formData.employmentType === 'daily' ? 'ค่าแรงรายวัน' : 'ค่าแรงรายชั่วโมง'}
                </label>
                <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-slate-200/60 border border-slate-300 text-slate-500 cursor-not-allowed text-sm font-data" value={formData.baseSalary ? `${Number(formData.baseSalary).toLocaleString()} บาท` : '0 บาท'} readOnly />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1 kanit-text">เรท OT (บาท/ชม.)</label>
                <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-slate-200/60 border border-slate-300 text-slate-500 cursor-not-allowed text-sm font-data" value={`${formData.otRate || 0} บาท`} readOnly />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1 kanit-text">เงื่อนไขค่าคอมมิชชั่น</label>
                <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-slate-200/60 border border-slate-300 text-slate-500 cursor-not-allowed text-sm font-data" value={formData.commissionCondition === 'threshold' ? `ให้ตั้งแต่คนที่ (บิลที่) ${formData.commissionThreshold || 1} ต่อวัน` : 'ให้ทุกบิลการขาย'} readOnly />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1 kanit-text">อัตราค่าคอมมิชชั่น</label>
                <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-slate-200/60 border border-slate-300 text-slate-500 cursor-not-allowed text-sm font-data" value={`${formData.commissionRate || 0} ${formData.commissionType === 'amount' ? 'บาท' : '%'}`} readOnly />
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button 
            type="submit" 
            disabled={isProcessing || isGlobalLoading}
            className="px-6 py-3 bg-gradient-to-br from-sky-400 to-sky-600 hover:from-sky-500 hover:to-sky-700 text-white rounded-xl font-bold kanit-text text-sm shadow-md shadow-sky-500/20 flex items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            บันทึกการเปลี่ยนแปลงโปรไฟล์
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileManager;


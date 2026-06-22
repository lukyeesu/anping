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

const BranchManager = ({ branchesData = [], setBranchesData, showToast, callAppScript, isGlobalLoading, showGlobalAlert, globalAlert }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
      const initialForm = { id: '', name: '', clinicName: '', licenseNumber: '', logo: '', taxId: '', address: '', phone: '', email: '', manager: '', status: 'active', rooms: [] };
  const [formData, setFormData] = useState(initialForm);

  const addRoom = () => setFormData(prev => ({ ...prev, rooms: [...(prev.rooms || []), ''] }));
  const removeRoom = (index) => setFormData(prev => ({ ...prev, rooms: (prev.rooms || []).filter((_, i) => i !== index) }));
  const handleRoomChange = (index, value) => {
    setFormData(prev => {
      const newRooms = [...(prev.rooms || [])];
      newRooms[index] = value;
      return { ...prev, rooms: newRooms };
    });
  };

  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => { setIsModalOpen(false); setIsClosing(false); }, 300);
  };

  const handleOpenAdd = () => {
    setEditingBranch(null);
    setFormData({ ...initialForm, id: `b${branchesData.length + 1}` });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (branch) => {
    setEditingBranch(branch);
    setFormData({ ...initialForm, ...branch, rooms: branch.rooms || [] });
    setIsModalOpen(true);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { 
        showToast('ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB', 'warning');
        return;
      }
      setIsProcessing(true);
      showToast('กำลังอัปโหลดโลโก้...', 'success');
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result.split(',')[1]; 
        
        try {
            const response = await callAppScript('UPLOAD_FILE', 'Branches', {
                fileName: `LOGO_${Date.now()}_${file.name}`,
                mimeType: file.type,
                data: base64Data,
                folderId: '1WwPiD2WQLbHK7xnFPW-GnJQj16-NrNb4' 
            });

            if (response.status === 'success' && response.fileUrl) {
                setFormData(prev => ({ ...prev, logo: response.fileUrl }));
                showToast('อัปโหลดโลโก้สำเร็จ', 'success');
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

  const handleSave = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await callAppScript('SAVE_DATA', 'Branches', formData);
      if (editingBranch) {
        setBranchesData(prev => prev.map(b => b.id === formData.id ? formData : b));
      } else {
        setBranchesData(prev => [...prev, formData]);
      }
      showToast('บันทึกข้อมูลสาขาสำเร็จ', 'success');
      closeModal();
    } catch (err) {
      showToast('ไม่สามารถบันทึกข้อมูลได้', 'warning');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteBranch = (branch) => {
    showGlobalAlert({
      type: 'warning',
      title: 'ยืนยันการลบสาขา?',
      text: `คุณต้องการลบข้อมูล "${branch.name}" ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      onConfirm: async () => {
        globalAlert.setIsOpen(false);
        setIsProcessing(true);
        try {
          await callAppScript('DELETE_DATA', 'Branches', { id: branch.id });
          setBranchesData(prev => prev.filter(b => b.id !== branch.id));
          showToast('ลบข้อมูลสาขาเรียบร้อยแล้ว', 'danger');
        } catch (error) {
          showToast('ลบข้อมูลไม่สำเร็จ', 'warning');
        } finally {
          setIsProcessing(false);
        }
      }
    });
      };

  return (
    <div className="flex flex-col h-full fade-in pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 kanit-text flex items-center gap-2">
            <Building2 className="w-6 h-6 text-sky-500" /> จัดการสาขา
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 kanit-text mt-1">ตั้งค่าและจัดการข้อมูลสาขาทั้งหมดของคลินิก</p>
        </div>
        <button onClick={handleOpenAdd} className="w-full md:w-auto px-5 py-2.5 bg-sky-500 text-white rounded-xl font-bold kanit-text hover:bg-sky-600 transition-all shadow-md shadow-sky-500/20 flex items-center justify-center gap-2">
          <Plus size={18} /> เพิ่มสาขาใหม่
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isGlobalLoading ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
             <Loader2 className="w-10 h-10 animate-spin opacity-20" />
             <p className="kanit-text text-sm italic">กำลังโหลดข้อมูลสาขา...</p>
          </div>
        ) : branchesData.length > 0 ? (
          branchesData.map((branch, idx) => (
            <div key={branch.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50/50 rounded-bl-full -mr-8 -mt-8 group-hover:bg-sky-100/50 transition-colors"></div>
               
               <div className="relative z-10">
                 <div className="flex justify-between items-start mb-4">
                   <div className="w-12 h-12 bg-sky-50 text-sky-500 rounded-2xl flex items-center justify-center shadow-inner overflow-hidden shrink-0 bg-white border border-sky-100">
                     {branch.logo ? (
                       <img src={branch.logo} alt="logo" className="w-full h-full object-contain" />
                     ) : (
                       <Building2 size={24} />
                     )}
                   </div>
                   <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${branch.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400'}`}>
                     {branch.status === 'active' ? 'เปิดบริการ' : 'ปิดชั่วคราว'}
                   </span>
                 </div>
                 
                 <h3 className="text-lg font-bold text-slate-800 kanit-text mb-1">{branch.name}</h3>
                 {branch.clinicName && <p className="text-xs font-bold text-sky-600 kanit-text mb-1 truncate">{branch.clinicName}</p>}
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex flex-wrap gap-1 items-center">
                    <span>ID: {branch.id}</span>
                    {branch.licenseNumber && <span className="text-slate-300">|</span>}
                    {branch.licenseNumber && <span>ใบอนุญาต: {branch.licenseNumber}</span>}
                    {branch.taxId && <span className="text-slate-300">|</span>}
                    {branch.taxId && <span>TAX: {branch.taxId}</span>}
                 </p>
                 
                 <div className="space-y-2.5 mb-6">
                    <div className="flex items-center gap-2.5 text-slate-500">
                       <MapPin size={14} className="shrink-0" />
                       <p className="text-xs kanit-text line-clamp-1">{branch.address || 'ไม่ระบุที่อยู่'}</p>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-500">
                       <Phone size={14} className="shrink-0" />
                       <p className="text-xs font-data">{branch.phone || 'ไม่ระบุเบอร์โทร'}</p>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-500">
                       <Mail size={14} className="shrink-0" />
                       <p className="text-xs font-data truncate">{branch.email || 'ไม่ระบุอีเมล'}</p>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-500">
                       <User size={14} className="shrink-0" />
                       <p className="text-xs kanit-text">ผู้จัดการ: {branch.manager || 'ไม่ระบุ'}</p>
                    </div>
                 </div>

                 {branch.rooms && branch.rooms.length > 0 && (
                    <div className="mb-6 pt-4 border-t border-slate-50">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <Briefcase size={12} className="text-sky-500" /> ห้องตรวจ / พื้นที่ ({branch.rooms.length})
                       </p>
                       <div className="flex flex-wrap gap-1.5">
                          {branch.rooms.map((r, i) => (
                             <span key={i} className="px-2.5 py-1 bg-sky-50/50 text-sky-700 rounded-lg text-[10px] font-bold kanit-text border border-sky-100/50 shadow-sm">
                                {r}
                             </span>
                          ))}
                       </div>
                    </div>
                 )}
                 
                 <div className="flex gap-2">
                    <button onClick={() => handleOpenEdit(branch)} className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold kanit-text hover:bg-sky-50 hover:text-sky-600 transition-colors border border-slate-100">
                       แก้ไขข้อมูล
                    </button>
                    <button onClick={() => handleDeleteBranch(branch)} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-500 transition-colors border border-slate-100">
                       <Trash2 size={16} />
                    </button>
                 </div>
               </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-300">
             <Building2 size={64} className="opacity-10 mb-4" />
             <p className="kanit-text text-lg font-bold">ยังไม่มีข้อมูลสาขา</p>
             <p className="kanit-text text-sm italic">กดปุ่ม "เพิ่มสาขาใหม่" เพื่อเริ่มต้น</p>
          </div>
        )}
      </div>

      {/* --- Alert Modal --- */}
      

      {isModalOpen && createPortal(
        <div className={`fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm ${isClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className="absolute inset-0" onClick={closeModal}></div>
          <div className={`bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl flex flex-col transform border border-slate-100 relative overflow-hidden max-h-[90dvh] ${isClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
             <div className="p-4 sm:p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30 shrink-0 z-10">
                <div className="flex items-center gap-3 sm:gap-4">
                   <div className="w-10 h-10 sm:w-12 sm:h-12 bg-sky-500 text-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/20">
                      <Building2 size={20} />
                   </div>
                   <div>
                      <h3 className="text-lg sm:text-xl font-bold text-slate-800 kanit-text">{editingBranch ? 'แก้ไขข้อมูลสาขา' : 'เพิ่มสาขาใหม่'}</h3>
                      <p className="text-[10px] text-slate-400 kanit-text uppercase tracking-widest mt-0.5">Branch Configuration</p>
                   </div>
                </div>
                <button onClick={closeModal} className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white text-slate-400 hover:text-slate-600 rounded-full shadow-sm border border-slate-100 transition-colors"><X size={18} /></button>
             </div>
             
             <form onSubmit={handleSave} className="p-0 space-y-0 flex flex-col flex-1 overflow-hidden min-h-0">
                <div className="p-4 sm:p-8 space-y-4 sm:space-y-5 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30">
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-2 items-center sm:items-start bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex flex-col items-center gap-2 shrink-0">
                            <div className="relative w-24 h-24 sm:w-28 sm:h-28 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden group">
                                {formData.logo ? (
                                    <img src={formData.logo} alt="Logo" className="w-full h-full object-contain bg-white p-2" />
                                ) : (
                                    <Building2 size={32} className="text-slate-300" />
                                )}
                                <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <Upload size={20} className="mb-1" />
                                    <span className="text-[10px] font-bold kanit-text">อัปโหลดโลโก้</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                </label>
                            </div>
                            <span className="text-[10px] text-slate-400 kanit-text">ขนาดไม่เกิน 5MB</span>
                        </div>

                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">
                           <div className="col-span-1 sm:col-span-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 kanit-text">ชื่อสาขา <span className="text-rose-500">*</span></label>
                              <input required type="text" className="w-full px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all font-data text-sm sm:text-base" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="เช่น สาขาสุขุมวิท" />
                           </div>
                           <div className="col-span-1">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 kanit-text">รหัสสาขา <span className="text-rose-500">*</span></label>
                              <input required type="text" className="w-full px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all font-data uppercase text-sm sm:text-base" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value.toLowerCase()})} disabled={!!editingBranch} />
                           </div>
                           <div className="col-span-1">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 kanit-text">ผู้จัดการสาขา</label>
                              <input type="text" className="w-full px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all font-data text-sm sm:text-base" value={formData.manager} onChange={e => setFormData({...formData, manager: e.target.value})} placeholder="ชื่อ-นามสกุล" />
                           </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <div className="col-span-1 sm:col-span-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 kanit-text">ชื่อจดทะเบียน / นิติบุคคล</label>
                              <input type="text" className="w-full px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all font-data text-sm sm:text-base" value={formData.clinicName} onChange={e => setFormData({...formData, clinicName: e.target.value})} placeholder="ชื่อบริษัทที่จดทะเบียน" />
                           </div>
                           <div className="col-span-1">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 kanit-text">เลขที่ใบอนุญาต</label>
                              <input type="text" className="w-full px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all font-data text-sm sm:text-base" value={formData.licenseNumber} onChange={e => setFormData({...formData, licenseNumber: e.target.value})} placeholder="เลขที่ใบอนุญาตสถานพยาบาล" />
                           </div>
                           <div className="col-span-1">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 kanit-text">เลขประจำตัวผู้เสียภาษี (Tax ID)</label>
                              <input type="text" className="w-full px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all font-data text-sm sm:text-base" value={formData.taxId} onChange={e => setFormData({...formData, taxId: e.target.value})} placeholder="เลข 13 หลัก" maxLength="13" />
                           </div>
                        </div>
                        <div>
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 kanit-text">ที่อยู่สาขา / สำนักงาน</label>
                           <textarea className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all font-data min-h-[80px] resize-none text-sm" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="เลขที่, ถนน, ตำบล, อำเภอ..." />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 kanit-text">เบอร์โทรศัพท์</label>
                              <input type="tel" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all font-data text-sm" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="02-XXX-XXXX" />
                           </div>
                           <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 kanit-text">อีเมล</label>
                              <input type="email" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all font-data text-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="example@email.com" />
                           </div>
                        </div>

                        {/* --- [NEW] ระบบจัดการห้องตรวจ (Dynamic Rooms) - Responsive Fix --- */}
                        <div className="bg-slate-50/50 p-4 sm:p-5 rounded-2xl border border-slate-100 space-y-3">
                           <div className="flex flex-wrap justify-between items-center gap-2 mb-1">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 kanit-text flex items-center gap-1.5">
                                 <Briefcase size={12} className="text-sky-500" /> รายชื่อห้อง / พื้นที่
                              </label>
                              <button type="button" onClick={addRoom} className="text-[10px] font-bold text-sky-500 hover:text-sky-600 flex items-center gap-1 kanit-text bg-white px-2.5 py-1.5 rounded-lg border border-sky-100 shadow-sm transition-all active:scale-95">
                                 <Plus size={12} /> เพิ่มห้อง
                              </button>
                           </div>
                           <div className="space-y-2">
                              {(formData.rooms || []).map((room, idx) => (
                                 <div key={idx} className="flex gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <input 
                                       type="text" 
                                       className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 transition-all font-data text-sm shadow-sm min-w-0" 
                                       value={room} 
                                       onChange={e => handleRoomChange(idx, e.target.value)} 
                                       placeholder={`เช่น ห้องตรวจ ${idx + 1}`} 
                                    />
                                    <button type="button" onClick={() => removeRoom(idx)} className="p-2.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0 border border-transparent hover:border-rose-100 shadow-sm bg-white">
                                       <Trash2 size={18} />
                                    </button>
                                 </div>
                              ))}
                              {(formData.rooms || []).length === 0 && (
                                 <div className="text-center py-4 bg-white/50 rounded-xl border border-dashed border-slate-200">
                                    <p className="text-[11px] text-slate-400 italic kanit-text">ยังไม่ได้ระบุรายชื่อห้อง</p>
                                 </div>
                              )}
                           </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 kanit-text">สถานะการให้บริการ</label>
                       <div className="flex bg-slate-50 p-1.5 rounded-2xl gap-2 border border-slate-100">
                          <button type="button" onClick={() => setFormData({...formData, status: 'active'})} className={`flex-1 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold kanit-text transition-all ${formData.status === 'active' ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100' : 'text-slate-400 hover:text-slate-600'}`}>เปิดบริการ</button>
                          <button type="button" onClick={() => setFormData({...formData, status: 'inactive'})} className={`flex-1 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold kanit-text transition-all ${formData.status === 'inactive' ? 'bg-white text-rose-500 shadow-sm border border-rose-100' : 'text-slate-400 hover:text-slate-600'}`}>ปิดชั่วคราว</button>
                       </div>
                    </div>
                </div>

                <div className="p-4 sm:p-6 border-t border-slate-100 bg-white shrink-0 z-10">
                   <button type="submit" disabled={isProcessing} className="w-full py-3.5 sm:py-4 bg-sky-500 text-white rounded-2xl font-bold shadow-xl shadow-sky-500/20 hover:bg-sky-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2 kanit-text text-base sm:text-lg">
                      {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 size={24} />} 
                      {editingBranch ? 'ยืนยันการแก้ไข' : 'บันทึกข้อมูลสาขา'}
                   </button>
                </div>
             </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default BranchManager;


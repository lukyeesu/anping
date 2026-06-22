import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import CustomSelect from './CustomSelect';
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

const PatientModal = React.memo(({ 
    isOpen, isClosing, isViewMode, setIsViewMode, editingId, formData, setFormData, 
    calculatedAge, closeMedModal, handleSavePatient, handleSmartCardRead, 
    setIsScannerOpen, isProcessing, formatDateTime, theme, handleDobChange, 
    handleOpenCalendar, dobWrapperRef, posProducts, handleOpenOpdCalendar, 
    opdWrapperRef, showOpdForm, handleOpenOpdForm, isClosingOpdForm, 
    newOpdRecord, setNewOpdRecord, openTxDropdownIndex, setOpenTxDropdownIndex,
    handleCancelOpdForm, handleSaveOpdRecord, handleDeleteOpdRecord, 
    opdSectionRef, opdFormSectionRef, copyAddressToCurrent, 
    handlePatientPhoneChange, removePatientPhone, addPatientPhone, 
    showPrefixDropdown, setShowPrefixDropdown, formatDate, CustomSelect,
    isScanning, videoRef, handleCapture, handleSelectDate, thaiMonths, thaiMonthsShort,
    calDate, calView, setCalDate, setCalView, handlePrevMonth, handleNextMonth,
    blankDays, monthDays, opdCalDate, setOpdCalDate, opdCalView, setOpdCalView,
    opdYearPageStart, setOpdYearPageStart, opdTime, setOpdTime, isCalendarClosing,
    closeMedCalendar, isOpdCalendarClosing, closeMedOpdCalendar,
    editingOpdIndex, yearPageStart, setYearPageStart,
    branchesData = [], currentBranch = '', staffData = [],
    CheckCircle2, Loader2, ScanText, X, FileText, Pencil, Plus, Users, CreditCard, Clock, MapPin, Package, Stethoscope, Phone, Trash2, CalendarIcon, User, UserPlus, ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, AlertTriangle
    }) => {

    // --- เพิ่มฟังก์ชันสำหรับพิมพ์ใบประวัติการรักษา (OPD) ---
    const handlePrintOpdRecord = (record, index) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('เบราว์เซอร์บล็อกการเปิดหน้าต่างพิมพ์ กรุณาอนุญาต Pop-ups');
        return;
    }

    const visitNumber = (formData.opdRecords ? formData.opdRecords.length : 1) - index;
    const html = globalGenerateOpdHtml(formData, record, visitNumber, branchesData, currentBranch);

    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => {
        printWindow.print();
    }, 500);
    };

    const handlePrintMedicalCertificate = (record, index) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('เบราว์เซอร์บล็อกการเปิดหน้าต่างพิมพ์ กรุณาอนุญาต Pop-ups');
        return;
    }

    const html = globalGenerateMedicalCertificateHtml(formData, record, branchesData, currentBranch, staffData);

    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => {
        printWindow.print();
    }, 500);
    };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex justify-center items-center p-3 sm:p-8 bg-slate-900/40 backdrop-blur-sm ${isClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
      <div className={`bg-white rounded-[1.5rem] sm:rounded-3xl w-full max-w-5xl max-h-[80dvh] sm:max-h-[90dvh] shadow-2xl flex flex-col transform border border-slate-100 relative overflow-hidden ${isClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0 z-10 gap-3">
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 shadow-inner shrink-0">
                {isViewMode ? <FileText className="w-5 h-5 sm:w-6 sm:h-6" /> : (editingId ? <Pencil className="w-5 h-5 sm:w-6 sm:h-6" /> : <Plus className="w-5 h-5 sm:w-6 sm:h-6" />)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-xl font-bold text-slate-800 kanit-text truncate leading-tight">{editingId ? `${formData.hn} - ${formData.prefix}${formData.firstName} ${formData.lastName}` : 'เพิ่มเวชระเบียนใหม่'}</h3>
              <p className="text-[10px] sm:text-sm text-slate-500 kanit-text truncate leading-tight mt-0.5">{isViewMode ? `อายุ ${calculatedAge} | ข้อมูลคนไข้สำหรับเรียกดู` : (editingId ? `อายุ ${calculatedAge} | แก้ไขข้อมูลเวชระเบียน` : 'กรอกข้อมูลคนไข้ให้ครบถ้วน')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button type="button" onClick={closeMedModal} className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-1.5 sm:p-2 shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors"><X size={18} className="sm:w-5 sm:h-5" /></button>
          </div>
        </div>
        
        <div className="p-4 sm:p-5 flex-1 bg-slate-50/30 overflow-y-auto custom-scrollbar">
          <form id="patient-form" onSubmit={handleSavePatient}>
            <fieldset disabled={isViewMode} className="space-y-5 sm:space-y-6 border-none p-0 m-0 min-w-0">
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm relative z-10">
              <div className="border-b border-sky-100 pb-3 mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h4 className="text-lg font-bold text-sky-600 flex items-center gap-2 kanit-text"><Users size={20} /> ข้อมูลส่วนตัว</h4>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {!isViewMode && (
                    <>
                      <button 
                        type="button" 
                        onClick={handleSmartCardRead} 
                        disabled={isProcessing}
                        className="text-xs sm:text-sm px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl font-medium transition-colors flex items-center gap-1.5 kanit-text border border-emerald-100 shadow-sm disabled:opacity-50"
                      >
                        <CreditCard size={16} /> <span className="hidden sm:inline">อ่านข้อมูลจากบัตร</span><span className="sm:hidden">อ่านบัตร</span>
                      </button>

                      <button 
                        type="button" 
                        onClick={() => setIsScannerOpen(true)} 
                        className="text-xs sm:text-sm px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl font-medium transition-colors flex items-center gap-1.5 kanit-text border border-indigo-100 shadow-sm"
                      >
                        <ScanText size={16} /> <span className="hidden sm:inline">สแกนจากกล้อง (OCR)</span><span className="sm:hidden">สแกนกล้อง</span>
                      </button>
                    </>
                  )}
                  <div className="text-sm font-medium text-slate-500 flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 kanit-text">
                    <Clock size={16} className="text-slate-400" /><span>ลงทะเบียน: {formatDateTime(formData.createdAt)}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">HN <span className="text-rose-500">*</span></label><input required type="text" className={`${theme.input} bg-slate-100 text-slate-500 cursor-not-allowed font-data`} value={formData.hn} disabled readOnly /></div>
                
                <div className="relative" style={{ zIndex: 30 }}>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">คำนำหน้า <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <input 
                      required 
                      type="text" 
                      className={`${theme.input} font-data pr-10`} 
                      value={formData.prefix} 
                      onChange={(e) => setFormData({...formData, prefix: e.target.value})} 
                      disabled={isViewMode} 
                      placeholder="พิมพ์หรือเลือก" 
                      onFocus={() => setShowPrefixDropdown(true)} 
                      onBlur={() => setTimeout(() => setShowPrefixDropdown(false), 200)} 
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ChevronDown size={18} className={`transition-transform duration-200 ${showPrefixDropdown ? 'rotate-180' : ''}`} />
                    </div>
                    {showPrefixDropdown && !isViewMode && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200 origin-top">
                        {['นาย', 'นาง', 'นางสาว', 'ด.ช.', 'ด.ญ.', 'พระ', 'ดร.', 'นพ.', 'พญ.', 'ทพ.', 'ว่าที่ ร.ต.'].map(opt => (
                          <div 
                            key={opt} 
                            onMouseDown={(e) => { e.preventDefault(); setFormData({...formData, prefix: opt}); setShowPrefixDropdown(false); }} 
                            className={`px-3 py-2.5 hover:bg-sky-50 cursor-pointer border-b border-slate-50 last:border-0 font-data text-sm transition-colors ${formData.prefix === opt ? 'bg-sky-50 text-sky-600 font-bold' : 'text-slate-700'}`}
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 lg:col-span-1"><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ชื่อ <span className="text-rose-500">*</span></label><input required type="text" className={`${theme.input} font-data`} value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} /></div>
                <div className="md:col-span-2 lg:col-span-1"><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">นามสกุล <span className="text-rose-500">*</span></label><input required type="text" className={`${theme.input} font-data`} value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ชื่อเล่น</label><input type="text" className={`${theme.input} font-data`} value={formData.nickname} onChange={(e) => setFormData({...formData, nickname: e.target.value})} /></div>
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">วัน/เดือน/ปีเกิด <span className="text-rose-500">*</span></label>
                  <div ref={dobWrapperRef} className="relative group">
                    <input required type="text" className={`${theme.input} pr-12 font-data`} value={formData.dob} onChange={handleDobChange} placeholder="วว/ดด/ปปปป" maxLength="10" />
                    {!isViewMode && (<button type="button" onClick={handleOpenCalendar} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-sky-500 hover:bg-slate-100 rounded-xl transition-colors"><CalendarIcon size={20} /></button>)}
                  </div>
                </div>
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">อายุ</label><input type="text" className={`${theme.input} bg-slate-100 text-slate-500 font-data`} value={calculatedAge} disabled readOnly /></div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">เพศ <span className="text-rose-500">*</span></label>
                  <CustomSelect value={formData.gender} onChange={(val) => setFormData({...formData, gender: val})} options={[{value:'', label:'เลือก'}, 'ชาย', 'หญิง', 'ไม่ระบุ']} disabled={isViewMode} />
                </div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">หมายเลขบัตรประชาชน/พาสปอร์ต</label><input type="text" className={`${theme.input} font-data`} value={formData.idCard} onChange={(e) => setFormData({...formData, idCard: e.target.value})} maxLength="13" /></div>
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">สัญชาติ</label><input type="text" className={`${theme.input} font-data`} value={formData.nationality} onChange={(e) => setFormData({...formData, nationality: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">เชื้อชาติ</label><input type="text" className={`${theme.input} font-data`} value={formData.ethnicity} onChange={(e) => setFormData({...formData, ethnicity: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ศาสนา</label><input type="text" className={`${theme.input} font-data`} value={formData.religion} onChange={(e) => setFormData({...formData, religion: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">อาชีพ</label><input type="text" className={`${theme.input} font-data`} value={formData.occupation} onChange={(e) => setFormData({...formData, occupation: e.target.value})} /></div>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm relative z-10">
              <h4 className="text-lg font-bold text-sky-600 border-b border-sky-100 pb-3 mb-5 flex items-center gap-2 kanit-text"><MapPin size={20} /> ข้อมูลติดต่อ</h4>
              <div className="mb-6">
                <h5 className="font-semibold text-slate-700 mb-3 kanit-text">ที่อยู่ตามบัตรประชาชน</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                  <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ที่อยู่ (เลขที่) / ชื่อหมู่บ้าน / อาคาร</label><input type="text" className={`${theme.input} font-data`} value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} disabled={isViewMode} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">หมู่ที่</label><input type="text" className={`${theme.input} font-data`} value={formData.moo} onChange={(e) => setFormData({...formData, moo: e.target.value})} disabled={isViewMode} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ซอย/ถนน</label><input type="text" className={`${theme.input} font-data`} value={formData.road} onChange={(e) => setFormData({...formData, road: e.target.value})} disabled={isViewMode} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">แขวง/ตำบล</label><input type="text" className={`${theme.input} font-data`} value={formData.subDistrict} onChange={(e) => setFormData({...formData, subDistrict: e.target.value})} disabled={isViewMode} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">เขต/อำเภอ</label><input type="text" className={`${theme.input} font-data`} value={formData.district} onChange={(e) => setFormData({...formData, district: e.target.value})} disabled={isViewMode} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">จังหวัด</label><input type="text" className={`${theme.input} font-data`} value={formData.province} onChange={(e) => setFormData({...formData, province: e.target.value})} disabled={isViewMode} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">รหัสไปรษณีย์</label><input type="text" className={`${theme.input} font-data`} value={formData.zipcode} onChange={(e) => setFormData({...formData, zipcode: e.target.value})} maxLength="5" disabled={isViewMode} /></div>
                </div>
              </div>
              <div className="h-px w-full bg-slate-100 my-6"></div>
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <h5 className="font-semibold text-slate-700 kanit-text">ที่อยู่ปัจจุบัน <span className="text-slate-400 font-normal text-xs">(ที่สามารถติดต่อได้)</span></h5>
                  {!isViewMode && (
                    <button type="button" onClick={copyAddressToCurrent} className="text-xs bg-sky-50 text-sky-600 hover:bg-sky-100 px-3 py-1.5 rounded-lg kanit-text transition-colors font-medium flex items-center justify-center gap-1.5 w-full sm:w-auto">
                      <MapPin size={14} /> ใช้ที่อยู่เดียวกับบัตรประชาชน
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                  <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ที่อยู่ (เลขที่) / ชื่อหมู่บ้าน / อาคาร</label><input type="text" className={`${theme.input} font-data`} value={formData.curAddress} onChange={(e) => setFormData({...formData, curAddress: e.target.value})} disabled={isViewMode} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">หมู่ที่</label><input type="text" className={`${theme.input} font-data`} value={formData.curMoo} onChange={(e) => setFormData({...formData, curMoo: e.target.value})} disabled={isViewMode} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ซอย/ถนน</label><input type="text" className={`${theme.input} font-data`} value={formData.curRoad} onChange={(e) => setFormData({...formData, curRoad: e.target.value})} disabled={isViewMode} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">แขวง/ตำบล</label><input type="text" className={`${theme.input} font-data`} value={formData.curSubDistrict} onChange={(e) => setFormData({...formData, curSubDistrict: e.target.value})} disabled={isViewMode} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">เขต/อำเภอ</label><input type="text" className={`${theme.input} font-data`} value={formData.curDistrict} onChange={(e) => setFormData({...formData, curDistrict: e.target.value})} disabled={isViewMode} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">จังหวัด</label><input type="text" className={`${theme.input} font-data`} value={formData.curProvince} onChange={(e) => setFormData({...formData, curProvince: e.target.value})} disabled={isViewMode} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">รหัสไปรษณีย์</label><input type="text" className={`${theme.input} font-data`} value={formData.curZipcode} onChange={(e) => setFormData({...formData, curZipcode: e.target.value})} maxLength="5" disabled={isViewMode} /></div>
                </div>
              </div>
              <div className="h-px w-full bg-slate-100 my-6"></div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2.5 ml-1 kanit-text">เบอร์โทรศัพท์ <span className="text-rose-500">*</span></label>
                <div className="space-y-3 max-w-md">
                    {formData.phones.map((phone, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            <input 
                              required 
                              type="tel" 
                              className={`${theme.input} py-2.5 font-data`} 
                              value={phone} 
                              onChange={(e) => handlePatientPhoneChange(idx, e.target.value)} 
                              placeholder="08X-XXX-XXXX" 
                              disabled={isViewMode} 
                            />
                            {formData.phones.length > 1 && !isViewMode && (
                                <button type="button" onClick={() => removePatientPhone(idx)} className="p-2.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0 border border-transparent hover:border-rose-100"><Trash2 size={20} /></button>
                            )}
                        </div>
                    ))}
                    {!isViewMode && (
                        <button type="button" onClick={addPatientPhone} className="text-xs sm:text-sm font-medium text-sky-500 hover:text-sky-600 flex items-center justify-center gap-1.5 mt-2 bg-sky-50 hover:bg-sky-100 px-4 py-2 rounded-xl transition-colors kanit-text w-full sm:w-auto border border-sky-100">
                            <Plus size={16} /> เพิ่มเบอร์โทรศัพท์ติดต่อ
                        </button>
                    )}
                </div>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h4 className="text-lg font-bold text-sky-600 border-b border-sky-100 pb-3 mb-5 flex items-center gap-2 kanit-text"><Phone size={20} /> ผู้ติดต่อกรณีฉุกเฉิน</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ชื่อผู้ติดต่อ</label><input type="text" className={`${theme.input} font-data`} value={formData.emName} onChange={(e) => setFormData({...formData, emName: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">เกี่ยวข้องเป็น</label><input type="text" className={`${theme.input} font-data`} value={formData.emRelation} onChange={(e) => setFormData({...formData, emRelation: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">เบอร์โทรศัพท์ <span className="text-rose-500">*</span></label><input type="tel" className={`${theme.input} font-data`} value={formData.emPhone} onChange={(e) => setFormData({...formData, emPhone: e.target.value})} /></div>
                <div className="md:col-span-2 lg:col-span-3"><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ที่อยู่ที่ติดต่อได้</label><input type="text" className={`${theme.input} font-data`} value={formData.emAddress} onChange={(e) => setFormData({...formData, emAddress: e.target.value})} /></div>
              </div>
            </div>

            {isViewMode && (
              <div className="bg-white p-4 sm:p-6 rounded-2xl border border-indigo-100 shadow-sm relative z-10">
                <h4 className="text-lg font-bold text-indigo-600 border-b border-indigo-100 pb-3 mb-5 flex items-center gap-2 kanit-text">
                  <Package size={20} /> คอร์ส/แพ็กเกจ คงเหลือ
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {formData.courses && formData.courses.filter(c => c.remainingSessions > 0).length > 0 ? (
                    formData.courses.filter(c => c.remainingSessions > 0).map(course => (
                      <div key={course.id} className="bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100 flex flex-col gap-2 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-100/50 px-2 py-0.5 rounded-md">คงเหลือ {course.remainingSessions}/{course.totalSessions}</div>
                          <div className="text-[10px] text-slate-400 font-data">{formatDate(course.purchasedAt)}</div>
                        </div>
                        <h5 className="font-bold text-slate-800 kanit-text text-sm sm:text-base leading-tight line-clamp-2 min-h-[2.5rem]">{course.name}</h5>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                          <div 
                            className="bg-indigo-500 h-full transition-all duration-500" 
                            style={{ width: `${(course.remainingSessions / course.totalSessions) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="md:col-span-3 py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                       <p className="text-slate-400 kanit-text text-sm italic">ยังไม่มีคอร์สคงเหลือในขณะนี้</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm relative z-10">
              <h4 className="text-lg font-bold text-sky-600 border-b border-sky-100 pb-3 mb-5 flex items-center gap-2 kanit-text"><Stethoscope size={20} /> ข้อมูลสุขภาพเบื้องต้น</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">หมู่เลือด</label>
                  <CustomSelect value={formData.bloodGroup} onChange={(val) => setFormData({...formData, bloodGroup: val})} options={[{value:'', label:'ไม่ทราบ'}, 'A', 'B', 'O', 'AB']} disabled={isViewMode} />
                </div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">อาการสำคัญที่มาพบแพทย์ <span className="text-rose-500">*</span></label><textarea required rows="2" className={`${theme.input} resize-none font-data`} value={formData.chiefComplaint} onChange={(e) => setFormData({...formData, chiefComplaint: e.target.value})}></textarea></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">ประวัติการแพ้อาหาร/ยา/สมุนไพร (ถ้ามี)</label><textarea rows="2" className={`${theme.input} resize-none font-data`} value={formData.allergies} onChange={(e) => setFormData({...formData, allergies: e.target.value})}></textarea></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-600 mb-1.5 ml-1 kanit-text">โรคประจำตัว (ถ้ามี)</label><textarea rows="2" className={`${theme.input} resize-none font-data`} value={formData.underlyingDisease} onChange={(e) => setFormData({...formData, underlyingDisease: e.target.value})}></textarea></div>
              </div>
            </div>
            </fieldset>

            <div ref={opdSectionRef} className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm relative z-10 mt-6 sm:mt-8">
              <div className="border-b border-sky-100 pb-3 mb-5 flex justify-between items-center">
                <h4 className="text-lg font-bold text-sky-600 flex items-center gap-2 kanit-text"><FileText size={20} /> ประวัติการรักษา (OPD)</h4>
                {!showOpdForm && (<button type="button" onClick={() => handleOpenOpdForm()} className="text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-xl font-medium transition-colors flex items-center gap-1.5 sm:gap-2 kanit-text"><Plus size={16} /> <span className="hidden sm:inline">เพิ่มประวัติการรักษา</span><span className="sm:hidden">เพิ่ม</span></button>)}
              </div>
              {showOpdForm && (
                <div ref={opdFormSectionRef} className={`bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 mb-6 shadow-inner ${isClosingOpdForm ? 'fade-out-up' : 'fade-in-up'}`}>
                  <h5 className="font-semibold text-slate-700 mb-4 kanit-text">{editingOpdIndex !== null ? 'แก้ไขบันทึกการรักษา' : 'บันทึกการรักษาใหม่'}</h5>
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative">
                        <label className="block text-xs font-medium text-slate-600 mb-1 ml-1 kanit-text">วันที่/เวลา</label>
                        <div ref={opdWrapperRef} className="relative group">
                          <input type="text" className={`${theme.input} bg-white py-2 text-sm pr-9 font-data`} value={newOpdRecord.datetime} onChange={(e) => setNewOpdRecord({...newOpdRecord, datetime: e.target.value})} placeholder="DD/MM/YYYY HH:mm น." />
                          <button type="button" onClick={handleOpenOpdCalendar} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-sky-500 rounded-lg transition-colors"><CalendarIcon size={16} /></button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1 ml-1 kanit-text">แพทย์ผู้รักษา</label>
                        <input type="text" className={`${theme.input} bg-white py-2 text-sm font-data`} value={newOpdRecord.doctor} onChange={(e) => setNewOpdRecord({...newOpdRecord, doctor: e.target.value})} placeholder="ระบุชื่อแพทย์" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                       <div><label className="block text-[10px] font-medium text-slate-600 mb-1 ml-1 kanit-text">อุณหภูมิ (?C)</label><input type="text" className={`${theme.input} bg-white py-2 text-sm px-2 text-center font-data`} value={newOpdRecord.temp} onChange={(e) => setNewOpdRecord({...newOpdRecord, temp: e.target.value})} placeholder="36.5" /></div>
                       <div><label className="block text-[10px] font-medium text-slate-600 mb-1 ml-1 kanit-text">สัญญาณชีพ (/min)</label><input type="text" className={`${theme.input} bg-white py-2 text-sm px-2 text-center font-data`} value={newOpdRecord.pulse} onChange={(e) => setNewOpdRecord({...newOpdRecord, pulse: e.target.value})} placeholder="80" /></div>
                       <div className="col-span-2 md:col-span-1"><label className="block text-[10px] font-medium text-slate-600 mb-1 ml-1 kanit-text">ความดัน</label><input type="text" className={`${theme.input} bg-white py-2 text-sm px-2 text-center font-data`} value={newOpdRecord.bp} onChange={(e) => setNewOpdRecord({...newOpdRecord, bp: e.target.value})} placeholder="120/80" /></div>
                       <div><label className="block text-[10px] font-medium text-slate-600 mb-1 ml-1 kanit-text">น้ำหนัก (kg)</label><input type="text" className={`${theme.input} bg-white py-2 text-sm px-2 text-center font-data`} value={newOpdRecord.weight} onChange={(e) => setNewOpdRecord({...newOpdRecord, weight: e.target.value})} placeholder="60" /></div>
                       <div><label className="block text-[10px] font-medium text-slate-600 mb-1 ml-1 kanit-text">ส่วนสูง (cm)</label><input type="text" className={`${theme.input} bg-white py-2 text-sm px-2 text-center font-data`} value={newOpdRecord.height} onChange={(e) => setNewOpdRecord({...newOpdRecord, height: e.target.value})} placeholder="170" /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="block text-xs font-medium text-slate-600 mb-1 ml-1 kanit-text">อาการสำคัญ (CC)</label><textarea rows="2" className={`${theme.input} bg-white py-2 text-sm resize-none font-data`} value={newOpdRecord.cc} onChange={(e) => setNewOpdRecord({...newOpdRecord, cc: e.target.value})} placeholder="เช่น มีไข้ ไอ เจ็บคอ..."></textarea></div>
                      <div><label className="block text-xs font-medium text-slate-600 mb-1 ml-1 kanit-text">การวินิจฉัย (Dx)</label><textarea rows="2" className={`${theme.input} bg-white py-2 text-sm resize-none font-data`} value={newOpdRecord.dx} onChange={(e) => setNewOpdRecord({...newOpdRecord, dx: e.target.value})} placeholder="เช่น Acute Pharyngitis..."></textarea></div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1 ml-1 kanit-text">การรักษาที่ให้</label>
                      <div className="flex flex-col gap-2">
                        {newOpdRecord.tx.map((treatment, txIndex) => (
                          <div key={txIndex} className="flex gap-2 items-stretch w-full">
                            <div className="relative flex-1" style={{ zIndex: 50 - txIndex }}>
                              <input 
                                  type="text"
                                  className={`${theme.input} bg-white py-2 text-sm font-data pr-10`}
                                  value={treatment} 
                                  onChange={(e) => {
                                      const updatedTx = [...newOpdRecord.tx];
                                      updatedTx[txIndex] = e.target.value;
                                      setNewOpdRecord({...newOpdRecord, tx: updatedTx});
                                  }} 
                                  onFocus={() => setOpenTxDropdownIndex(txIndex)}
                                  onBlur={() => setTimeout(() => { if (openTxDropdownIndex === txIndex) setOpenTxDropdownIndex(null) }, 200)}
                                  placeholder="พิมพ์ค้นหา หรือเลือกจากรายการ..."
                              />
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <ChevronDown size={18} className={`transition-transform duration-200 ${openTxDropdownIndex === txIndex ? 'rotate-180' : ''}`} />
                              </div>
                              {openTxDropdownIndex === txIndex && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200 origin-top">
                                  {posProducts.filter(p => p.name.toLowerCase().includes(treatment.toLowerCase())).length > 0 ? (
                                      posProducts.filter(p => p.name.toLowerCase().includes(treatment.toLowerCase())).map(p => (
                                        <div
                                          key={p.id}
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            const updatedTx = [...newOpdRecord.tx];
                                            updatedTx[txIndex] = p.name;
                                            setNewOpdRecord({...newOpdRecord, tx: updatedTx});
                                            setOpenTxDropdownIndex(null);
                                          }}
                                          className={`px-3 py-2.5 hover:bg-sky-50 cursor-pointer border-b border-slate-50 last:border-0 font-data text-sm transition-colors ${treatment === p.name ? 'bg-sky-50 text-sky-600 font-bold' : 'text-slate-700'}`}
                                        >
                                          {p.name}
                                        </div>
                                      ))
                                  ) : (
                                      <div className="px-3 py-2.5 text-sm text-slate-400 font-data flex items-center gap-2 pointer-events-none">
                                          <Plus size={14} className="text-sky-500" /> พิมพ์เพื่อระบุการรักษาเพิ่มเติม...
                                      </div>
                                  )}
                                </div>
                              )}
                            </div>
                            {newOpdRecord.tx.length > 1 && (
                              <button type="button" onClick={() => {
                                  const updatedTx = newOpdRecord.tx.filter((_, i) => i !== txIndex);
                                  setNewOpdRecord({...newOpdRecord, tx: updatedTx});
                              }} className="px-3 bg-white text-rose-500 border border-rose-100 rounded-2xl hover:bg-rose-50 transition-colors flex items-center justify-center shrink-0">
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button type="button" onClick={() => setNewOpdRecord({...newOpdRecord, tx: [...newOpdRecord.tx, '']})} className="px-4 py-2 mt-1 bg-sky-50 text-sky-600 border border-sky-100 rounded-2xl text-sm font-semibold hover:bg-sky-100 whitespace-nowrap transition-colors flex items-center gap-1 self-start kanit-text">
                          <Plus size={16} /> เพิ่มรายการรักษา
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1 ml-1 kanit-text">หมายเหตุเพิ่มเติม</label>
                      <textarea rows="2" className={`${theme.input} bg-white py-2 text-sm resize-none font-data`} value={newOpdRecord.note} onChange={(e) => setNewOpdRecord({...newOpdRecord, note: e.target.value})} placeholder="รายละเอียดหรือคำแนะนำเพิ่มเติม..."></textarea>
                    </div>
                  </div>
                  <div className="flex flex-row justify-end gap-2 mt-4 pt-4 border-t border-slate-200 w-full">
                    <button type="button" onClick={handleCancelOpdForm} className="flex-1 sm:flex-none px-2 sm:px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors kanit-text truncate">ยกเลิก</button>
                    <button type="button" onClick={handleSaveOpdRecord} className="flex-1 sm:flex-none px-2 sm:px-4 py-2 text-sm text-white bg-sky-500 hover:bg-sky-600 rounded-xl font-medium shadow-md transition-colors kanit-text truncate">
                      {editingOpdIndex !== null ? 'บันทึกการแก้ไข' : 'ยืนยันการเพิ่ม'}
                    </button>
                  </div>
                </div>
              )}

              {formData.opdRecords && formData.opdRecords.length > 0 ? (
                <div className="border border-slate-100 rounded-xl bg-white overflow-hidden">
                  <div className="hidden lg:block overflow-x-auto overflow-y-hidden">
                    <table className="table-auto w-full text-left border-collapse min-w-[800px] text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 kanit-text"><th className="w-[14%] p-3 font-medium">วันที่/เวลา</th><th className="w-[12%] p-3 font-medium">สาขา</th><th className="w-[12%] p-3 font-medium">Vitals</th><th className="w-[24%] p-3 font-medium">อาการ/วินิจฉัย</th><th className="w-[12%] p-3 font-medium">การรักษา</th><th className="w-[18%] p-3 font-medium">แพทย์</th><th className="w-[8%] p-3 font-medium text-right">จัดการ</th></tr>
                      </thead>
                      <tbody>
                        {formData.opdRecords.map((record, index) => (
                          <tr key={index} className="border-b border-slate-50 hover:bg-slate-50/80 align-top font-data">
                            <td className="p-3 text-slate-700 whitespace-nowrap"><div className="font-semibold">{record.datetime ? record.datetime.split(' ')[0] : '-'}</div><div className="text-xs text-slate-500">{record.datetime ? record.datetime.split(' ').slice(1).join(' ') : ''}</div></td>
                            <td className="p-3 text-slate-700 whitespace-nowrap">
                              <div className="text-xs font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-100 w-fit">
                                {branchesData.find(b => b.id === record.branchId)?.name || record.branchId || '-'}
                              </div>
                            </td>
                            <td className="p-3 text-slate-500 text-[11px] whitespace-nowrap">
                              T: <span className="font-data font-semibold text-slate-700">{record.temp || '-'}</span> | PR: <span className="font-data font-semibold text-slate-700">{record.pulse || '-'}</span> | BP: <span className="font-data font-semibold text-slate-700">{record.bp || '-'}</span><br/>
                              W: <span className="font-data font-semibold text-slate-700">{record.weight || '-'}</span> | H: <span className="font-data font-semibold text-slate-700">{record.height || '-'}</span>
                            </td>
                            <td className="p-3 text-slate-700 max-w-[150px]">
                              <div className="text-sm font-semibold truncate" title={record.cc}>{record.cc || '-'}</div>
                              <div className="text-xs text-sky-600 font-medium truncate mt-0.5" title={record.dx}>{record.dx || '-'}</div>
                            </td>
                            <td className="p-3 text-slate-600 text-xs max-w-[150px]">
                              {Array.isArray(record.tx) ? (
                                record.tx.filter(t => t).map((t, idx) => (
                                  <span key={idx} className="inline-block px-2 py-1 bg-sky-50 text-sky-600 rounded-md mb-1 mr-1">{t}</span>
                                ))
                              ) : (
                                <span className="inline-block px-2 py-1 bg-sky-50 text-sky-600 rounded-md mb-1">{record.tx || '-'}</span>
                              )}
                              {record.note && <div className="truncate text-slate-400 mt-0.5" title={record.note}>* {record.note}</div>}
                            </td>
                            <td className="p-3 text-slate-700 whitespace-nowrap">{record.doctor || '-'}</td>
                            <td className="p-3 text-right">
                              <div className="flex justify-end gap-1">
                                <button type="button" onClick={() => handleOpenOpdForm(index, record)} className="text-slate-400 hover:text-sky-600 p-1.5 bg-white hover:bg-sky-50 border border-slate-100 rounded-lg shadow-sm transition-colors" title="แก้ไข">
                                  <Pencil size={16} />
                                </button>
                                <button type="button" onClick={() => handleDeleteOpdRecord(index)} className="text-rose-400 hover:text-rose-600 p-1.5 bg-white hover:bg-rose-50 border border-slate-100 rounded-lg shadow-sm transition-colors" title="ลบ">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="lg:hidden flex flex-col divide-y divide-slate-100">
                      {formData.opdRecords.map((record, index) => (
                          <div key={`opd-mobile-${index}`} className="p-4 flex flex-col gap-3 hover:bg-slate-50 transition-colors space-row-animation" style={{ animationDelay: `${index < 10 ? index * 40 : 0}ms` }}>
                              <div className="flex justify-between items-start">
                                  <div>
                                      <div className="font-bold text-slate-800 flex items-center gap-2">
                                          <CalendarIcon size={14} className="text-sky-500" />
                                          {record.datetime ? record.datetime.split(' ')[0] : '-'}
                                      </div>
                                      <div className="text-xs font-medium text-slate-500 mt-0.5 flex items-center gap-1.5">
                                          <Clock size={12} /> {record.datetime ? record.datetime.split(' ').slice(1).join(' ') : ''}
                                      </div>
                                  </div>
                              </div>
                              <div className="grid grid-cols-1 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                                  <div>
                                      <span className="font-semibold text-slate-500">Vitals:</span>
                                      <span className="text-slate-600 ml-1 font-data">T:{record.temp||'-'} PR:{record.pulse||'-'} BP:{record.bp||'-'} W:{record.weight||'-'} H:{record.height||'-'}</span>
                                  </div>
                                  <div>
                                      <span className="font-semibold text-slate-500">อาการ (CC):</span>
                                      <span className="text-slate-700 ml-1 font-data">{record.cc || '-'}</span>
                                  </div>
                                  <div>
                                      <span className="font-semibold text-sky-600">วินิจฉัย (Dx):</span>
                                      <span className="text-slate-700 ml-1 font-data font-medium">{record.dx || '-'}</span>
                                  </div>
                                  <div>
                                      <span className="font-semibold text-emerald-600">การรักษา:</span>
                                      <div className="mt-1 flex flex-wrap gap-1">
                                          {Array.isArray(record.tx) ? (
                                            record.tx.filter(t => t).map((t, idx) => (
                                              <span key={idx} className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md">{t}</span>
                                            ))
                                          ) : (
                                            <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md">{record.tx || '-'}</span>
                                          )}
                                      </div>
                                      {record.note && <div className="mt-1 text-slate-400 italic">* {record.note}</div>}
                                  </div>
                                  <div className="pt-2 mt-1 border-t border-slate-200/60 flex items-center justify-between">
                                      <span className="text-[10px] font-semibold text-slate-400">สาขา / แพทย์</span>
                                      <div className="flex flex-col items-end">
                                          <span className="text-[10px] font-bold text-sky-600 uppercase">{branchesData.find(b => b.id === record.branchId)?.name || record.branchId || '-'}</span>
                                          <span className="font-medium text-slate-600 font-data flex items-center gap-1 text-[11px]"><User size={10}/> {record.doctor || '-'}</span>
                                      </div>
                                  </div>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                                  <button type="button" onClick={() => handlePrintOpdRecord(record, index)} className="flex items-center justify-center gap-1.5 py-2 text-slate-500 hover:text-indigo-600 bg-white border border-slate-100 hover:bg-indigo-50 hover:border-indigo-100 rounded-xl transition-colors font-medium text-[11px] kanit-text shadow-sm">
                                      <Printer size={14} /> OPD
                                  </button>
                                  <button type="button" onClick={() => handlePrintMedicalCertificate(record, index)} className="flex items-center justify-center gap-1.5 py-2 text-slate-500 hover:text-emerald-600 bg-white border border-slate-100 hover:bg-emerald-50 hover:border-emerald-100 rounded-xl transition-colors font-medium text-[11px] kanit-text shadow-sm">
                                      <Printer size={14} /> ใบรับรอง
                                  </button>
                                  <button type="button" onClick={() => handleOpenOpdForm(index, record)} className="flex items-center justify-center gap-1.5 py-2 text-slate-500 hover:text-sky-600 bg-white border border-slate-100 hover:bg-sky-50 hover:border-sky-100 rounded-xl transition-colors font-medium text-[11px] kanit-text shadow-sm">
                                      <Pencil size={14} /> แก้ไข
                                  </button>
                                  <button type="button" onClick={() => handleDeleteOpdRecord(index)} className="flex items-center justify-center gap-1.5 py-2 text-slate-500 hover:text-rose-600 bg-white border border-slate-100 hover:bg-rose-50 hover:border-rose-100 rounded-xl transition-colors font-medium text-[11px] kanit-text shadow-sm">
                                      <Trash2 size={14} /> ลบ
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-slate-100 border-dashed kanit-text"><FileText size={32} className="mx-auto mb-2 text-slate-300" /><p className="text-sm">ยังไม่มีประวัติการรักษา</p></div>
              )}
            </div>
          </form>
        </div>

        <div className="p-4 sm:p-6 border-t border-slate-100 flex flex-row justify-end gap-2 sm:gap-3 bg-white shrink-0 w-full">
            {isViewMode ? (
                <>
                   <button type="button" onClick={closeMedModal} className="flex-1 sm:flex-none sm:w-auto px-2 sm:px-6 py-3 text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-sm kanit-text truncate">ปิดหน้าต่าง</button>
                   <button type="button" onClick={(e) => { e.preventDefault(); setIsViewMode(false); }} className={`flex-1 sm:flex-none sm:w-auto px-2 sm:px-6 py-3 text-sm font-semibold shadow-md transition-all active:scale-95 ${theme.primary} rounded-xl flex items-center justify-center gap-1 sm:gap-2 kanit-text truncate`}><Pencil size={18} className="shrink-0" /> แก้ไขข้อมูล</button>
                </>
            ) : (
                <>
                   <button type="button" onClick={closeMedModal} className="flex-1 sm:flex-none sm:w-auto px-2 sm:px-6 py-3 text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-sm kanit-text truncate">ยกเลิก</button>
                   <button type="submit" form="patient-form" disabled={isProcessing} className="flex-1 sm:flex-none sm:w-auto px-2 sm:px-6 py-3 text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1 sm:gap-2 kanit-text truncate">
                       {isProcessing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0"></div> : <CheckCircle2 size={18} className="shrink-0" />}
                       {editingId ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}
                   </button>
                </>
            )}
        </div>
      </div>
    </div>
  );
});

export default PatientModal;


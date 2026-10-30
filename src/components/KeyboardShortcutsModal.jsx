import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Download, Smartphone, Laptop, CreditCard, Users, 
  Stethoscope, Receipt, Package, Calendar, Keyboard, X, Sparkles, 
  CheckCircle2, ShieldCheck, HelpCircle, ArrowRight, Eye, RefreshCw,
  Zap, Globe, Radio, Activity, Check, ExternalLink, Info
} from 'lucide-react';

const SHORTCUT_GROUPS = [
  {
    title: 'การค้นหาและการควบคุมหน้าต่าง',
    items: [
      {
        keys: ['Esc'],
        title: 'ปิด Modal / ล้างข้อความค้นหา',
        desc: 'กดครั้งแรกเพื่อล้างข้อความในช่องค้นหา หรือกดเพื่อปิดหน้าต่างป๊อปอัป / Modal ที่เปิดอยู่'
      },
      {
        keys: ['Ctrl', 'K'],
        altKeys: ['/'],
        title: 'ค้นหาด่วน (Quick Search)',
        desc: 'โฟกัสไปยังช่องค้นหาของหน้าปัจจุบันทันที เพื่อพิมพ์ค้นหาต่อได้เลย'
      },
      {
        keys: ['Enter'],
        title: 'บันทึก / ยืนยันข้อมูล',
        desc: 'กดบันทึกข้อมูลใน Modal หรือฟอร์มปัจจุบัน (ยกเว้นขณะพิมพ์ในช่องหมายเหตุหรือข้อความยาว)'
      }
    ]
  },
  {
    title: 'การจัดการข้อมูลและทำงานด่วน',
    items: [
      {
        keys: ['Alt', 'S'],
        title: 'บันทึกข้อมูลทันที (Save)',
        desc: 'สั่งกดปุ่มบันทึกของฟอร์มหรือการตั้งค่าปัจจุบันทันที โดยไม่ต้องเลื่อนหาปุ่ม'
      },
      {
        keys: ['Alt', 'N'],
        altKeys: ['F2'],
        title: 'เพิ่มรายการใหม่ด่วน (New Item)',
        desc: 'กดปุ่มเพิ่มนัดหมายใหม่, ลงทะเบียนคนไข้, เพิ่มสินค้า หรือบันทึกรายรับ-จ่าย ตามหน้าที่เปิดอยู่'
      }
    ]
  },
  {
    title: 'คู่มือและความช่วยเหลือ',
    items: [
      {
        keys: ['Shift', '?'],
        altKeys: ['Ctrl', '/'],
        title: 'เปิดหน้าต่างคู่มือนี้',
        desc: 'เปิดหรือปิดหน้าต่างคู่มือการใช้งานและแป้นพิมพ์ลัดของระบบ'
      }
    ]
  }
];

const KeyboardShortcutsModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('downloads'); // 'downloads', 'smartcard', 'features', 'shortcuts'

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center p-2.5 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-5xl lg:max-w-6xl w-full max-h-[calc(100dvh-1.5rem)] flex flex-col border border-slate-100 animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-5 [@media(max-height:480px)]:py-2.5 border-b border-slate-100 flex items-center justify-between gap-2.5 bg-gradient-to-r from-sky-50 via-indigo-50/40 to-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 [@media(max-height:480px)]:w-8 [@media(max-height:480px)]:h-8 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-sky-500/20 shrink-0">
              <BookOpen className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-lg text-slate-800 kanit-text flex items-center gap-2 truncate">
                <span className="truncate">คู่มือการใช้ & ดาวน์โหลดแอปคลินิก</span>
                <Sparkles size={16} className="text-amber-500 hidden sm:inline shrink-0" />
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 kanit-text truncate [@media(max-height:480px)]:hidden">
                อันผิงคลินิก (Anping Clinic) - วิธีใช้งานและดาวน์โหลดแอปพลิเคชัน
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
            title="ปิดหน้าต่าง (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 px-3 sm:px-6 gap-1 sm:gap-2 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setActiveTab('downloads')}
            className={`py-2.5 sm:py-3 [@media(max-height:480px)]:py-2 px-3 sm:px-4 text-xs sm:text-sm font-bold kanit-text border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'downloads'
                ? 'border-sky-500 text-sky-600 bg-white/70 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download size={15} className="shrink-0" />
            <span>ดาวน์โหลดแอป (3 ตัวเลือก)</span>
          </button>

          <button
            onClick={() => setActiveTab('smartcard')}
            className={`py-2.5 sm:py-3 [@media(max-height:480px)]:py-2 px-3 sm:px-4 text-xs sm:text-sm font-bold kanit-text border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'smartcard'
                ? 'border-sky-500 text-sky-600 bg-white/70 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard size={15} className="shrink-0" />
            <span>เครื่องอ่านบัตรประชาชน</span>
          </button>

          <button
            onClick={() => setActiveTab('features')}
            className={`py-2.5 sm:py-3 [@media(max-height:480px)]:py-2 px-3 sm:px-4 text-xs sm:text-sm font-bold kanit-text border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'features'
                ? 'border-sky-500 text-sky-600 bg-white/70 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Stethoscope size={15} className="shrink-0" />
            <span>ระบบงานคลินิก</span>
          </button>

          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`py-2.5 sm:py-3 [@media(max-height:480px)]:py-2 px-3 sm:px-4 text-xs sm:text-sm font-bold kanit-text border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'shortcuts'
                ? 'border-sky-500 text-sky-600 bg-white/70 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Keyboard size={15} className="shrink-0" />
            <span>แป้นพิมพ์ลัด</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-3.5 sm:p-6 [@media(max-height:480px)]:p-3.5 min-h-0 overflow-y-auto custom-scrollbar flex-1 text-left space-y-5 sm:space-y-6">
          
          {/* TAB 1: DOWNLOADS */}
          {activeTab === 'downloads' && (
            <div className="space-y-6">
              {/* Hero Banner */}
              <div className="bg-gradient-to-r from-sky-50 via-indigo-50/50 to-emerald-50/50 border border-sky-100 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-sky-500/20 shrink-0 mt-0.5">
                    <Download size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm sm:text-base text-slate-900 kanit-text flex items-center gap-2 flex-wrap">
                      <span>ศูนย์ดาวน์โหลดแอปพลิเคชันและโปรแกรมอ่านบัตร</span>
                      <span className="text-[11px] font-bold text-sky-700 bg-sky-100/90 px-2.5 py-0.5 rounded-full">
                        พร้อมใช้งาน 3 รายการ
                      </span>
                    </h4>
                    <p className="text-xs text-slate-600 kanit-text mt-0.5 leading-relaxed">
                      เลือกดาวน์โหลดตามอุปกรณ์ที่ใช้งาน: แท็บเล็ตประจำห้องตรวจ (Android APK) หรือคอมพิวเตอร์เคาน์เตอร์ (Windows PC)
                    </p>
                  </div>
                </div>
              </div>

              {/* Group 1: Tablet / Android Apps */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                  <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center font-bold text-xs shrink-0">
                    1
                  </div>
                  <h4 className="font-bold text-sm sm:text-base text-slate-800 kanit-text flex items-center gap-2">
                    <Smartphone size={18} className="text-sky-500" />
                    <span>แอปพลิเคชันสำหรับแท็บเล็ตและมือถือ Android</span>
                  </h4>
                  <span className="text-xs text-slate-400 kanit-text hidden md:inline">
                    (ติดตั้งสำหรับใช้งานประจำคลินิก)
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:gap-5">
                  {/* Card 1: AnpingClinic.apk (Official Production Release) */}
                  <div className="rounded-2xl border-2 border-sky-500/40 bg-gradient-to-b from-sky-50/50 via-white to-white p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-sky-500 transition-all flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl tracking-wider flex items-center gap-1 shadow-xs">
                      <Sparkles size={11} />
                      <span>แนะนำสำหรับแท็บเล็ต</span>
                    </div>

                    <div>
                      <div className="flex items-start gap-2.5 sm:gap-3 mb-3.5 pt-3.5 min-[360px]:pt-3 min-[360px]:pr-24 sm:pr-28">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-sky-500/25 shrink-0 group-hover:scale-105 transition-transform">
                          <Smartphone className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <h5 className="font-bold text-sm sm:text-lg text-slate-900 kanit-text">
                              AnpingClinic.apk
                            </h5>
                            <span className="text-[11px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md font-mono shrink-0">
                              v1.6.26 ล่าสุด
                            </span>
                          </div>
                          <p className="text-xs text-sky-700 font-medium kanit-text">
                            แอปพลิเคชันระบบคลินิกสำหรับแท็บเล็ตและสมาร์ตโฟน Android พร้อมเชื่อมต่อเครื่องอ่านบัตรประชาชนในตัว
                          </p>
                        </div>
                      </div>

                      <ul className="text-xs text-slate-600 kanit-text space-y-2 mt-4 bg-white/80 p-3.5 rounded-xl border border-sky-100/60">
                        <li className="flex items-start gap-2">
                          <Zap size={14} className="text-sky-500 shrink-0 mt-0.5" />
                          <span><strong className="text-slate-800">อ่านบัตรประชาชนรวดเร็ว:</strong> เสียบเครื่องอ่านบัตร USB-C/OTG เข้าแท็บเล็ต ดึงข้อมูลส่วนตัวและรูปถ่ายเข้าสู่เวชระเบียนให้อัตโนมัติในทันที</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span><strong className="text-slate-800">ประสิทธิภาพสูงและเสถียร:</strong> ปรับแต่งระบบ Responsive และขยาย Font Size ชัดเจน พร้อมตัวขีดเลื่อนปิดหน้าจอที่สวยงาม 60-120fps บนทุกขนาดจอ</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <ShieldCheck size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                          <span><strong className="text-slate-800">ฟังก์ชันคลินิกครบวงจร:</strong> เวชระเบียน (OPD), การตรวจรักษา, สิทธิประโยชน์คูปอง, การเงิน, แคชเชียร์ POS, คลังยา และนัดหมาย</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 size={14} className="text-sky-500 shrink-0 mt-0.5" />
                          <span><strong className="text-slate-800">ระบบพิมพ์และแจ้งเตือน:</strong> รองรับการพิมพ์ใบเสร็จ สลิป และเวชระเบียน พร้อมการแจ้งเตือนแบบ Real-time</span>
                        </li>
                      </ul>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100">
                      <a
                        href="/AnpingClinic.apk"
                        download="AnpingClinic.apk"
                        className="w-full py-2.5 px-3 sm:px-4 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold text-xs sm:text-sm kanit-text flex items-center justify-center gap-2 transition-all shadow-md shadow-sky-500/25 hover:-translate-y-0.5 min-w-0"
                      >
                        <Download size={16} className="shrink-0" />
                        <span className="truncate">ดาวน์โหลด AnpingClinic.apk (v1.6.26 ล่าสุด)</span>
                      </a>
                      <span className="block text-center text-[10px] text-slate-400 mt-2 font-medium">
                        ขนาดประมาณ 8.14 MB • สำหรับแท็บเล็ตและสมาร์ตโฟน Android (ติดตั้งง่ายในคลิกเดียว)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Group 2: PC & Browser Companion */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                    2
                  </div>
                  <h4 className="font-bold text-sm sm:text-base text-slate-800 kanit-text flex items-center gap-2 min-w-0">
                    <Laptop size={18} className="text-emerald-600 shrink-0" />
                    <span>โปรแกรมสำหรับคอมพิวเตอร์ PC และการใช้งานผ่านเว็บเบราว์เซอร์</span>
                  </h4>
                  <span className="text-xs text-slate-400 kanit-text hidden md:inline shrink-0">
                    (สำหรับอ่านบัตรประชาชนเมื่อเปิดเว็บผ่าน Google Chrome / Edge)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
                  {/* Card 3: Thai Card Agent for Windows (System Tray) */}
                  <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-50/50 via-white to-white p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-emerald-500 transition-all flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl tracking-wider shadow-xs flex items-center gap-1">
                      <Laptop size={11} />
                      <span>สำหรับ Windows PC</span>
                    </div>

                    <div>
                      <div className="flex items-start gap-2.5 sm:gap-3 mb-3.5 pt-3.5 min-[360px]:pt-3 min-[360px]:pr-24 sm:pr-28">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 shrink-0 group-hover:scale-105 transition-transform">
                          <Laptop className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <h5 className="font-bold text-sm sm:text-lg text-slate-900 kanit-text">
                              Thai Card Agent
                            </h5>
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md font-mono shrink-0">
                              Windows System Tray
                            </span>
                          </div>
                          <p className="text-xs text-emerald-700 font-medium kanit-text">
                            โปรแกรมอ่านบัตรสำหรับคอมพิวเตอร์ PC เคาน์เตอร์คลินิก
                          </p>
                        </div>
                      </div>

                      <ul className="text-xs text-slate-600 kanit-text space-y-2 mt-4 bg-white/80 p-3 rounded-xl border border-emerald-100/60">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span><strong className="text-slate-800">ซ่อนในถาดไอคอน (Hide Icons):</strong> ซ่อนตัวมุมขวาล่างแบบ Discord ไม่เกะกะแถบงาน</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span><strong className="text-slate-800">มีไฟบอกสถานะ:</strong> ไอคอนแสดงไฟชัดเจน (🟢 กำลังทำงาน / 🔴 ปิดพัก)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span><strong className="text-slate-800">เปิด-ปิดง่ายด้วยคลิกขวา:</strong> คลิกขวาที่ไอคอนเพื่อ สลับเปิด/ปิด หรือรีสตาร์ท</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span><strong className="text-slate-800">เชื่อมต่อเว็บทันที:</strong> เสียบบัตรประชาชนแล้วดึงข้อมูลเข้าสู่ Chrome/Edge ได้ทันที</span>
                        </li>
                      </ul>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100">
                      <a
                        href="/thai-card-agent-windows.zip"
                        download="thai-card-agent-windows.zip"
                        className="w-full py-2.5 px-3 sm:px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm kanit-text flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/25 hover:-translate-y-0.5 min-w-0"
                      >
                        <Download size={16} className="shrink-0" />
                        <span className="truncate">ดาวน์โหลด Agent Windows (.zip)</span>
                      </a>
                      <span className="block text-center text-[10px] text-slate-400 mt-2 font-medium">
                        ขนาดประมาณ 4.8 MB • แตกไฟล์แล้วเปิด .vbs ใช้งานได้ทันที
                      </span>
                    </div>
                  </div>

                  {/* Card 4: anping-card-agent.apk (Background Service for Chrome) */}
                  <div className="rounded-2xl border-2 border-indigo-500/30 bg-gradient-to-b from-indigo-50/40 via-white to-white p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-indigo-500/60 transition-all flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl tracking-wider shadow-xs flex items-center gap-1">
                      <CreditCard size={11} />
                      <span>สำหรับ Chrome บน Android</span>
                    </div>

                    <div>
                      <div className="flex items-start gap-2.5 sm:gap-3 mb-3.5 pt-3.5 min-[360px]:pt-3 min-[360px]:pr-24 sm:pr-28">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0 group-hover:scale-105 transition-transform">
                          <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <h5 className="font-bold text-sm sm:text-lg text-slate-900 kanit-text">
                              Anping Card Agent
                            </h5>
                            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md font-mono shrink-0">
                              v1.4.7 Service
                            </span>
                          </div>
                          <p className="text-xs text-indigo-700 font-medium kanit-text">
                            ตัวกลางเชื่อมต่อเครื่องอ่านบัตรสำหรับเบราว์เซอร์
                          </p>
                        </div>
                      </div>

                      <ul className="text-xs text-slate-600 kanit-text space-y-2 mt-4 bg-white/80 p-3 rounded-xl border border-indigo-100/60">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                          <span><strong className="text-slate-800">สำหรับเปิดผ่าน Chrome:</strong> เหมาะสำหรับผู้ที่ชอบเปิดเว็บคลินิกผ่านเบราว์เซอร์แท็บเล็ต</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                          <span><strong className="text-slate-800">Background Service:</strong> ทำงานในเบื้องหลังเงียบๆ ไม่เกะกะสายตา</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                          <span><strong className="text-slate-800">ดึงข้อมูล 1 คลิก:</strong> เสียบบัตรแล้วกดปุ่ม "อ่านข้อมูลจากบัตร" บนหน้าเว็บ</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                          <span><strong className="text-slate-800">ปลอดภัย ออฟไลน์:</strong> สื่อสารเฉพาะภายในเครื่อง ไม่ส่งข้อมูลออกภายนอก</span>
                        </li>
                      </ul>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100">
                      <a
                        href="/anping-card-agent.apk"
                        download="anping-card-agent.apk"
                        className="w-full py-2.5 px-3 sm:px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs sm:text-sm kanit-text flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/25 hover:-translate-y-0.5 min-w-0"
                      >
                        <Download size={16} className="shrink-0" />
                        <span className="truncate">ดาวน์โหลด Card Agent.apk (v1.4.7)</span>
                      </a>
                      <span className="block text-center text-[10px] text-slate-400 mt-2 font-medium">
                        ขนาดประมาณ 6.17 MB • ติดตั้งแล้วเปิดแอป 1 ครั้งเพื่อเริ่ม Service
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Decision Tip */}
              <div className="p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600 kanit-text">
                <div className="flex items-center gap-2.5">
                  <HelpCircle size={18} className="text-sky-500 shrink-0" />
                  <span>
                    <strong>วิธีเลือกอย่างง่าย:</strong> หากใช้แท็บเล็ต แนะนำดาวน์โหลด <strong>AnpingClinic.apk</strong> | หากใช้คอมเคาน์เตอร์ PC แนะนำดาวน์โหลด <strong>Thai Card Agent (Windows)</strong>
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('smartcard')}
                  className="text-sky-600 hover:text-sky-700 font-bold hover:underline flex items-center gap-1 cursor-pointer shrink-0 self-end sm:self-center"
                >
                  <span>วิธีต่อสายอ่านบัตร</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: SMART CARD GUIDE */}
          {activeTab === 'smartcard' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <h4 className="font-bold text-sm text-slate-900 kanit-text flex items-center gap-2">
                  <CreditCard className="text-sky-500" size={18} />
                  วิธีใช้งานเครื่องอ่านบัตรประชาชน Smart Card
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed kanit-text">
                  ระบบรองรับเครื่องอ่านบัตรประชาชนมาตรฐาน USB CCID / OTG ทุกรุ่น สามารถเลือกใช้งานได้ 3 รูปแบบตามความสะดวก:
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <div className="font-bold text-xs sm:text-sm text-sky-700 kanit-text flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-xs font-mono">1</span>
                    แบบใช้งานผ่านแอปแท็บเล็ต AnpingClinic (แนะนำที่สุดสำหรับแท็บเล็ต)
                  </div>
                  <p className="text-xs text-slate-600 kanit-text leading-relaxed pl-7">
                    ติดตั้งแอป <strong>AnpingClinic.apk</strong> บนแท็บเล็ต เสียบสายเครื่องอ่านบัตรผ่านพอร์ต USB-C/OTG เมื่อเสียบบัตรประชาชน ระบบจะดึงข้อมูลส่วนตัวและรูปถ่ายเข้าสู่ฟอร์มเวชระเบียนให้อัตโนมัติในทันที พร้อมเสียงแจ้งเตือน 1 ครั้ง
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <div className="font-bold text-xs sm:text-sm text-emerald-700 kanit-text flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-mono">2</span>
                    แบบใช้งานบนคอมพิวเตอร์ Windows PC (System Tray / Hide Icons)
                  </div>
                  <p className="text-xs text-slate-600 kanit-text leading-relaxed pl-7">
                    ดาวน์โหลดและแตกไฟล์ <strong>thai-card-agent-windows.zip</strong> แล้วดับเบิ้ลคลิกที่ไฟล์ <strong>"เปิดใช้งานเครื่องอ่านบัตร (System Tray).vbs"</strong> ตัวโปรแกรมจะซ่อนตัวเข้าไปอยู่ในถาดไอคอนมุมขวาล่างของ Windows (ลูกศร ^ ซ่อนไอคอนเหมือน Discord) แสดงไฟเขียว 🟢 พร้อมอ่านบัตรประชาชนเข้าสู่เว็บคลินิกบน Chrome/Edge ได้ทันที หากต้องการปิดหรือรีสตาร์ท เพียงคลิกขวาที่ไอคอน
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <div className="font-bold text-xs sm:text-sm text-indigo-700 kanit-text flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-mono">3</span>
                    แบบใช้งานผ่านเว็บเบราว์เซอร์บน Android (Google Chrome)
                  </div>
                  <p className="text-xs text-slate-600 kanit-text leading-relaxed pl-7">
                    ติดตั้งแอป <strong>anping-card-agent.apk</strong> เปิดโปรแกรมทิ้งไว้ในเบื้องหลัง จากนั้นเปิดเว็บคลินิกบนเบราว์เซอร์ เสียบบัตรประชาชนแล้วกดปุ่ม <strong>"อ่านข้อมูลจากบัตร"</strong> เพื่อดึงข้อมูลเข้าสู่ฟอร์ม
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-1.5">
                  <div className="font-bold text-xs sm:text-sm text-emerald-800 kanit-text flex items-center gap-2">
                    <Eye size={16} className="text-emerald-600" />
                    ปุ่มดูข้อมูลบัตรฉบับเต็ม (Card Inspector)
                  </div>
                  <p className="text-xs text-emerald-900/80 kanit-text leading-relaxed">
                    เมื่ออ่านบัตรแล้ว ท่านสามารถกดปุ่ม <strong>"ดูข้อมูลบัตรฉบับเต็ม"</strong> เพื่อตรวจสอบรูปถ่ายใบหน้าขนาดใหญ่, เลขบัตร, ชื่อไทย-อังกฤษ, ที่อยู่ตามทะเบียนราษฎร์ครบทุกช่อง, วันออกบัตร/วันหมดอายุ และผู้ออกบัตร ได้อย่างครบถ้วน 100%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FEATURES GUIDE */}
          {activeTab === 'features' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <Users size={18} className="text-sky-500 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 kanit-text">
                  <strong className="text-slate-800 block text-sm">ระบบเวชระเบียน (Medical Records)</strong>
                  ค้นหาประวัติคนไข้ด้วยชื่อ เลขบัตร หรือเบอร์โทร, ลงทะเบียนคนไข้ใหม่ด้วยบัตรประชาชน, บันทึกประวัติแพ้ยา โรคประจำตัว และยินยอม PDPA
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <Stethoscope size={18} className="text-indigo-500 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 kanit-text">
                  <strong className="text-slate-800 block text-sm">ระบบตรวจรักษา (OPD & Doctor)</strong>
                  บันทึกอาการสำคัญ (CC), วินิจฉัยโรค (Dx), สั่งยา, สั่งทำหัตถการ, และแนบรูปถ่ายติดตามอาการก่อน-หลังการรักษา
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <Package size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 kanit-text">
                  <strong className="text-slate-800 block text-sm">ระบบคอร์สการรักษา & คูปอง (Courses & Coupons)</strong>
                  บันทึกการซื้อแพ็กเกจคอร์ส, ตัดจำนวนครั้งการรักษาแบบ Realtime, และจัดการโปรโมชันส่วนลด
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <Receipt size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 kanit-text">
                  <strong className="text-slate-800 block text-sm">ระบบการเงิน & แคชเชียร์ (POS & Finance)</strong>
                  คิดเงิน, สแกนชำระผ่าน QR พร้อมเพย์ (PromptPay), ออกใบเสร็จรับเงิน ใบกำกับภาษี และสรุปยอดรายรับ-รายจ่าย
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <Calendar size={18} className="text-purple-500 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 kanit-text">
                  <strong className="text-slate-800 block text-sm">ระบบตารางนัดหมาย (Appointments)</strong>
                  ลงคิวนัดหมายล่วงหน้า, ปฏิทินแพทย์ประจำวัน, และส่งข้อความหรือโทรแจ้งเตือนคนไข้ก่อนถึงวันนัด
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: KEYBOARD SHORTCUTS */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-6">
              {SHORTCUT_GROUPS.map((group, gIdx) => (
                <div key={gIdx} className="space-y-2.5">
                  <div className="text-xs font-bold text-sky-600 kanit-text tracking-wide uppercase">
                    {group.title}
                  </div>
                  <div className="space-y-2">
                    {group.items.map((item, idx) => (
                      <div 
                        key={idx}
                        className="p-3 rounded-2xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-100 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-sm text-slate-800 kanit-text">
                            {item.title}
                          </div>
                          <div className="text-xs text-slate-500 kanit-text mt-0.5 leading-relaxed">
                            {item.desc}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap shrink-0 self-start sm:self-center">
                          <div className="flex items-center gap-1 shrink-0">
                            {item.keys.map((k, kIdx) => (
                              <React.Fragment key={kIdx}>
                                <kbd className="shrink-0 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-black text-slate-700 shadow-2xs">
                                  {k}
                                </kbd>
                                {kIdx < item.keys.length - 1 && (
                                  <span className="text-slate-300 text-xs font-bold">+</span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>

                          {item.altKeys && (
                            <>
                              <span className="text-slate-300 text-xs px-0.5 shrink-0">หรือ</span>
                              <div className="flex items-center gap-1 shrink-0">
                                {item.altKeys.map((k, kIdx) => (
                                  <kbd key={kIdx} className="shrink-0 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-black text-slate-700 shadow-2xs">
                                    {k}
                                  </kbd>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-3.5 [@media(max-height:480px)]:py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-500 kanit-text shrink-0">
          <span className="text-[11px] sm:text-xs min-w-0 truncate">
            กด <kbd className="shrink-0 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-mono font-bold text-slate-700">Esc</kbd> เพื่อปิดหน้าต่าง
          </span>
          <button
            onClick={onClose}
            className="px-4 sm:px-5 py-2 [@media(max-height:480px)]:py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold transition-all shadow-xs cursor-pointer shrink-0"
          >
            ปิดคู่มือ
          </button>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import CustomSelect from './CustomSelect';
import CalendarDay from './CalendarDay';
import { POS_ICONS } from '../global/constants';
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

const CatalogManager = ({ products = [], setProducts, callAppScript, showToast, isGlobalLoading, showGlobalAlert, globalAlert, posHistoryData = [] }) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // เพิ่ม State สำหรับจัดการการกรอง
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isEditFormClosing, setIsEditFormClosing] = useState(false);
  const [isProcessingProduct, setIsProcessingProduct] = useState(false);
  const [showCategorySuggest, setShowCategorySuggest] = useState(false);
  const initialProductForm = { id: '', name: '', type: '', price: '', stockManaged: false, icon: 'Package', isCourse: false, courseSessions: 1, minStock: 5 };
  const [productForm, setProductForm] = useState(initialProductForm);
          const headerRef = React.useRef(null);
  const filterRef = React.useRef(null);

  // --- ระบบ Sticky เลียนแบบหน้าอื่นๆ ---
  useEffect(() => {
    const mainElement = document.getElementById('main-scroll-container');
    if (!mainElement) return;

    const handleScroll = rAFThrottle((e) => {
      if (!headerRef.current) return;
      const target = e.target || mainElement;
      const { scrollTop } = target;
      
      if (scrollTop > 20) {
          headerRef.current.classList.add('is-scrolled');
      } else {
          headerRef.current.classList.remove('is-scrolled');
      }

      if (filterRef.current && headerRef.current) {
          const headerRect = headerRef.current.getBoundingClientRect();
          const filterRect = filterRef.current.getBoundingClientRect();
          if (filterRect.top <= headerRect.bottom + 1) {
              filterRef.current.classList.add('is-scrolled');
          } else {
              filterRef.current.classList.remove('is-scrolled');
          }
      }
    });

    setTimeout(() => {
        if (mainElement && headerRef.current) {
            if (mainElement.scrollTop > 20) headerRef.current.classList.add('is-scrolled');
            else headerRef.current.classList.remove('is-scrolled');
        }
    }, 50);

    mainElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainElement.removeEventListener('scroll', handleScroll);
  }, []);

  const closeEditForm = () => {
    setIsEditFormClosing(true);
    setTimeout(() => {
        setIsEditFormOpen(false);
        setIsEditFormClosing(false);
    }, 300);
  };

  const handleOpenAddProduct = () => {
      setProductForm({ ...initialProductForm });
      setIsEditFormOpen(true);
  };

  const handleOpenEditProduct = (prod) => {
      setProductForm({ 
        ...initialProductForm, 
        ...prod, 
        isCourse: !!prod.isCourse, 
        courseSessions: prod.courseSessions || 1,
        minStock: prod.minStock !== undefined ? prod.minStock : 5
      });
      setIsEditFormOpen(true);
  };

  const handleSaveProduct = async (e) => {
      e.preventDefault();
      setIsProcessingProduct(true);
      
      let finalId = productForm.id;
      if (!finalId) {
          let prefix = 'serv';
          if (productForm.isCourse) prefix = 'cour';
          else if (productForm.stockManaged) prefix = 'prod';

          let maxNum = 0;
          products.forEach(p => {
              if (p.id && p.id.toLowerCase().startsWith(prefix)) {
                  const numMatch = p.id.match(/\d+$/);
                  if (numMatch) {
                      const num = parseInt(numMatch[0], 10);
                      if (num > maxNum) maxNum = num;
                  }
              }
          });
          // รันเลข 3 หลัก เช่น 001, 002
          finalId = `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
      }

      const payload = {
          ...productForm,
          id: finalId,
          price: Number(productForm.price),
          courseSessions: Number(productForm.courseSessions) || 1,
          minStock: Number(productForm.minStock) || 0
      };

      try {
          await callAppScript('SAVE_DATA', 'setting_pos', payload);
          if (productForm.id) {
              setProducts(products.map(p => p.id === productForm.id ? payload : p));
              showToast('อัปเดตรายการสำเร็จ', 'success');
          } else {
              setProducts([payload, ...products]);
              showToast('เพิ่มรายการใหม่สำเร็จ', 'success');
          }
          closeEditForm();
      } catch (error) {
          showToast('บันทึกไม่สำเร็จ กรุณาลองใหม่', 'warning');
      }
      setIsProcessingProduct(false);
  };

  const handleDeleteProduct = (prod) => {
      showGlobalAlert({
          type: 'warning', title: 'ยืนยันการลบรายการ?',
          text: `คุณต้องการลบ "${prod.name}" ใช่หรือไม่?`,
          onConfirm: async () => {
              globalAlert.setIsOpen(false);
              setIsProcessingProduct(true);
              try {
                  await callAppScript('DELETE_DATA', 'setting_pos', { id: prod.id });
                  setProducts(products.filter(p => p.id !== prod.id));
                  showToast('ลบรายการสำเร็จ', 'danger');
              } catch (error) {
                  showToast('ลบไม่สำเร็จ กรุณาลองใหม่', 'warning');
              }
              setIsProcessingProduct(false);
          }
      });
        };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.type.toLowerCase().includes(search.toLowerCase());
      let matchType = true;
      if (filterType === 'product') matchType = p.stockManaged;
      else if (filterType === 'course') matchType = p.isCourse;
      else if (filterType === 'service') matchType = !p.stockManaged && !p.isCourse;
      
      return matchSearch && matchType;
    });
  }, [products, search, filterType]);

  const categories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.type)));
  }, [products]);

  // --- [NEW] คำนวณ Ranking สินค้า/บริการขายดีจาก posHistoryData ---
  const rankings = useMemo(() => {
      const itemCounts = {}; 

      const productTypeMap = {};
      products.forEach(p => {
          productTypeMap[p.name] = !!p.stockManaged; // true = Product, false = Service/Course
      });

      (posHistoryData || []).forEach(tx => {
          if (tx.status !== 'cancelled' && tx.items) {
              tx.items.forEach(item => {
                  // ข้ามรายการที่เป็นการตัดคอร์ส (ฟรี) หรือหมายเหตุแพทย์
                  if (item.price === 0 && (item.name.includes('ตัดรอบ') || item.name.includes('หมายเหตุ'))) return;

                  if (!itemCounts[item.name]) {
                      const isProd = productTypeMap[item.name] === true;
                      itemCounts[item.name] = { name: item.name, qty: 0, revenue: 0, isProduct: isProd };
                  }
                  itemCounts[item.name].qty += Number(item.quantity) || 0;
                  itemCounts[item.name].revenue += Number(item.total) || 0;
              });
          }
      });

      const allRanked = Object.values(itemCounts);
      // จัดเรียงและตัดมาเฉพาะ 5 อันดับแรก
      const topProducts = allRanked.filter(i => i.isProduct).sort((a, b) => b.qty - a.qty).slice(0, 5);
      const topServices = allRanked.filter(i => !i.isProduct).sort((a, b) => b.qty - a.qty).slice(0, 5);

      // หาค่า Max เพื่อเอาไปทำเป้ากราฟแท่ง (Progress Bar)
      const maxProdQty = Math.max(...topProducts.map(p => p.qty), 1);
      const maxServQty = Math.max(...topServices.map(s => s.qty), 1);

      return { topProducts, topServices, maxProdQty, maxServQty };
  }, [posHistoryData, products]);

  const formatCurrency = (amount) => new Intl.NumberFormat('th-TH').format(amount);

  return (
    <div className="fade-in pb-10 relative flex flex-col h-full">
      
      {/* --- 1. Sticky Header --- */}
      <div ref={headerRef} className="sticky z-30 w-full pointer-events-none transition-all duration-300 ease-in-out flex flex-col" style={{ top: 'var(--mobile-header-offset, 0px)' }}>
        <div className="w-full pointer-events-auto sticky-header-bg shrink-0">
          <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 flex flex-row justify-between items-center gap-2 sm:gap-4 sticky-header-inner">
            <div>
              <h1 className="font-bold text-slate-800 tracking-tight kanit-text sticky-header-title flex items-center gap-2">
                <Tag className="text-sky-500" /> สินค้า/บริการ
              </h1>
              <p className="text-slate-500 kanit-text sticky-header-desc">จัดการสินค้า, บริการ, คอร์ส และแพ็กเกจ ทั้งหมดในคลินิก</p>
            </div>
            <div className="flex gap-2">
              {!isEditFormOpen && (
                <button onClick={handleOpenAddProduct} className="flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl font-semibold shadow-sm transition-transform active:scale-95 shrink-0 bg-sky-500 text-white hover:bg-sky-600 kanit-text sticky-header-btn px-4 py-2 sm:px-6 sm:py-3">
                  <Plus size={18} /> <span className="hidden sm:inline">เพิ่มรายการใหม่</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- 2. Ranking Cards Section (Non-sticky, จะเลื่อนหายไปตามการ Scroll) --- */}
      <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 mt-4 sm:mt-5 mb-0 relative z-20 pointer-events-auto">
        {!isGlobalLoading && (rankings.topProducts.length > 0 || rankings.topServices.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                
                {/* Card 1: สินค้าขายดี */}
                <div className="bg-white rounded-[2rem] p-6 sm:p-7 border border-slate-100 shadow-sm flex flex-col">
                    <div className="flex items-center gap-3 sm:gap-4 mb-6">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-500 text-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
                            <Package size={24} className="sm:w-6 sm:h-6" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-800 kanit-text">5 อันดับสินค้าขายดี</h3>
                    </div>
                    
                    <div className="flex flex-col gap-4 sm:gap-5 flex-1">
                        {rankings.topProducts.length > 0 ? rankings.topProducts.map((item, i) => (
                            <div key={i} className="relative flex flex-col justify-center">
                                <div className="flex justify-between items-end mb-1.5 z-10 relative px-1">
                                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 pr-4">
                                        <span className="text-amber-500 font-black text-sm sm:text-base w-4 text-center shrink-0">{i + 1}</span>
                                        <span className="font-bold text-slate-700 kanit-text text-sm sm:text-base truncate">{item.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                        <span className="text-slate-400 font-data text-[10px] sm:text-xs">฿{formatCurrency(item.revenue)}</span>
                                        <div className="text-indigo-600 font-black font-data text-sm sm:text-base w-16 text-right">
                                            {item.qty} <span className="text-xs sm:text-sm font-bold kanit-text">ชิ้น</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 sm:h-2 rounded-full overflow-hidden">
                                    <div className="bg-indigo-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${(item.qty / rankings.maxProdQty) * 100}%` }}></div>
                                </div>
                            </div>
                        )) : (
                            <div className="flex-1 flex items-center justify-center text-slate-400 kanit-text text-sm italic py-4">ยังไม่มีข้อมูลการขายสินค้า</div>
                        )}
                    </div>
                </div>

                {/* Card 2: บริการ/คอร์สยอดนิยม */}
                <div className="bg-white rounded-[2rem] p-6 sm:p-7 border border-slate-100 shadow-sm flex flex-col">
                    <div className="flex items-center gap-3 sm:gap-4 mb-6">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 text-emerald-500 rounded-xl sm:rounded-2xl flex items-center justify-center border border-emerald-100 shadow-sm shrink-0">
                            <Stethoscope size={24} className="sm:w-6 sm:h-6" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-800 kanit-text">5 อันดับบริการ / คอร์สยอดนิยม</h3>
                    </div>
                    
                    <div className="flex flex-col gap-4 sm:gap-5 flex-1">
                        {rankings.topServices.length > 0 ? rankings.topServices.map((item, i) => (
                            <div key={i} className="relative flex flex-col justify-center">
                                <div className="flex justify-between items-end mb-1.5 z-10 relative px-1">
                                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 pr-4">
                                        <span className="text-amber-500 font-black text-sm sm:text-base w-4 text-center shrink-0">{i + 1}</span>
                                        <span className="font-bold text-slate-700 kanit-text text-sm sm:text-base truncate">{item.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                        <span className="text-slate-400 font-data text-[10px] sm:text-xs">฿{formatCurrency(item.revenue)}</span>
                                        <div className="text-emerald-600 font-black font-data text-sm sm:text-base w-16 text-right">
                                            {item.qty} <span className="text-xs sm:text-sm font-bold kanit-text">ครั้ง</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 sm:h-2 rounded-full overflow-hidden">
                                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${(item.qty / rankings.maxServQty) * 100}%` }}></div>
                                </div>
                            </div>
                        )) : (
                            <div className="flex-1 flex items-center justify-center text-slate-400 kanit-text text-sm italic py-4">ยังไม่มีข้อมูลการขายบริการ/คอร์ส</div>
                        )}
                    </div>
                </div>

            </div>
        )}
      </div>

      {/* --- 3. Filter Component (เมื่อเลื่อนชน Header จะเกาะติด Sticky อัตโนมัติ) --- */}
      <div 
         ref={filterRef}
         className="w-full pointer-events-none sticky z-20 transition-all duration-300 ease-in-out my-5 sm:my-6 sticky-filter-appt" 
      >
        <div className="w-full mx-auto pointer-events-none relative h-[60px] sm:h-[76px] z-50">
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 mx-auto bg-white/95 backdrop-blur-xl border-slate-200 pointer-events-auto origin-top sticky-filter-inner shadow-sm flex flex-row justify-between items-center gap-2 sm:gap-4 px-4 md:px-8 2xl:px-12 py-3 sm:py-4 transition-all">
            <div className="relative flex-1 min-w-0 w-full">
              <input 
                type="text" 
                placeholder="ค้นหาชื่อ หรือหมวดหมู่..." 
                className="w-full pl-9 pr-3 sm:pl-11 sm:pr-4 py-2 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 transition-colors shadow-inner font-data truncate"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Search className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-slate-400 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2" />
            </div>
            <div className="flex items-center gap-2 pointer-events-auto shrink-0 z-50 w-[140px] sm:w-[180px]">
              <CustomSelect 
                value={filterType}
                onChange={(val) => setFilterType(val)}
                options={[
                  {value: 'all', label: `ทั้งหมด (${products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.type.toLowerCase().includes(search.toLowerCase())).length})`},
                  {value: 'service', label: 'เฉพาะบริการ'},
                  {value: 'product', label: 'เฉพาะสินค้า'},
                  {value: 'course', label: 'เฉพาะคอร์ส'}
                ]}
                className="w-full"
                compact
              />
            </div>
          </div>
        </div>
      </div>

      {/* --- 4. ตาราง/เนื้อหา (Content Area) --- */}
      <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 mt-0 mb-12 flex-1 flex flex-col pointer-events-auto z-10">

        {isGlobalLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={`skel-cat-${i}`} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4">
                <div className="flex items-start justify-between relative z-10">
                  <div className="w-full max-w-[56px] h-14 bg-slate-200 rounded-2xl animate-pulse"></div>
                </div>
                <div className="min-w-0 relative z-10">
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    <div className="w-full max-w-[64px] h-5 bg-slate-200 rounded-lg animate-pulse"></div>
                    <div className="w-full max-w-[96px] h-5 bg-slate-200 rounded-lg animate-pulse"></div>
                  </div>
                  <div className="w-full h-5 bg-slate-200 rounded animate-pulse mb-2"></div>
                  <div className="w-2/3 h-5 bg-slate-200 rounded animate-pulse mb-3"></div>
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50">
                    <div className="w-full max-w-[96px] h-7 bg-slate-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filteredProducts.map((prod) => {
              const PIcon = typeof prod.icon === 'string' ? (POS_ICONS[prod.icon] || Package) : (prod.icon || Package);
              return (
                <div key={prod.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4 hover:border-sky-300 hover:shadow-xl hover:shadow-sky-500/5 transition-all group relative overflow-hidden">
                  <div className="flex items-start justify-between relative z-10">
                    <div className="w-14 h-14 bg-sky-50 text-sky-500 rounded-2xl flex items-center justify-center shrink-0 border border-sky-100 shadow-inner">
                      <PIcon size={28} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <button onClick={() => handleOpenEditProduct(prod)} className="p-2.5 bg-white text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all border border-slate-100 shadow-sm"><Pencil size={16} /></button>
                      <button onClick={() => handleDeleteProduct(prod)} className="p-2.5 bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-slate-100 shadow-sm"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <div className="min-w-0 relative z-10">
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black kanit-text truncate uppercase border border-slate-200/50">{prod.type}</span>
                        {prod.stockManaged && <span className="px-2 py-0.5 bg-indigo-50 text-indigo-500 rounded-lg text-[10px] font-black kanit-text uppercase border border-indigo-100">ตัดสต็อก (ขั้นต่ำ {prod.minStock !== undefined ? prod.minStock : 5})</span>}
                        {prod.isCourse && <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black kanit-text uppercase border border-amber-100">คอร์ส ({prod.courseSessions})</span>}
                        {prod.isVatable && <span className="px-2 py-0.5 bg-sky-50 text-sky-600 rounded-lg text-[10px] font-black kanit-text uppercase border border-sky-100">+VAT</span>}
                    </div>
                    <h4 className="font-bold text-slate-800 text-base kanit-text line-clamp-2 leading-tight mb-3">{prod.name}</h4>
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50">
                        <span className="text-xl font-black text-sky-600 font-data">฿{Number(prod.price).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-slate-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-[3rem] p-16 border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-4 shadow-sm">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-2 shadow-inner"><Search size={40} className="text-slate-200" /></div>
            <p className="kanit-text font-bold text-xl text-slate-400">ไม่พบรายการที่ค้นหา</p>
            {search && <button onClick={() => setSearch('')} className="text-sky-500 font-bold kanit-text hover:underline text-sm">ล้างการค้นหา "{search}"</button>}
          </div>
        )}
      </div>

      {isEditFormOpen && createPortal(
        <div className={`fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm ${isEditFormClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className={`bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ${isEditFormClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center shadow-inner">
                        <Tag size={20} />
                    </div>
                    <h4 className="font-bold text-slate-800 text-xl kanit-text">{productForm.id ? 'แก้ไขข้อมูลรายการ' : 'เพิ่มข้อมูลรายการใหม่'}</h4>
                </div>
                <button type="button" onClick={closeEditForm} disabled={isProcessingProduct} className="text-slate-400 hover:bg-white p-2 rounded-xl transition-colors shadow-sm border border-transparent hover:border-slate-200"><X size={20}/></button>
            </div>
            
            <form id="catalog-form" onSubmit={handleSaveProduct} className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-8 bg-slate-50/30">
                <div className="bg-white p-6 sm:p-8 rounded-[1.5rem] border border-slate-100 shadow-sm">
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-600 ml-1 kanit-text uppercase tracking-wide">ชื่อรายการ <span className="text-rose-500">*</span></label>
                                <input required type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 transition-all font-data" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} placeholder="เช่น เลเซอร์ฝ้า, ครีมกันแดด" />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-600 ml-1 kanit-text uppercase tracking-wide">ราคา (บาท) <span className="text-rose-500">*</span></label>
                                <input required type="number" min="0" step="0.01" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 transition-all font-data font-bold text-sky-600 text-lg" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} placeholder="0.00" />
                            </div>
                        </div>
                        
                        <div className="space-y-2 relative z-20">
                            <label className="block text-sm font-bold text-slate-600 ml-1 kanit-text uppercase tracking-wide">หมวดหมู่ <span className="text-rose-500">*</span></label>
                            <div className="relative">
                                <input 
                                    required 
                                    type="text" 
                                    className="w-full px-4 py-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 transition-all font-data peer" 
                                    value={productForm.type} 
                                    onChange={e => setProductForm({...productForm, type: e.target.value})} 
                                    placeholder="พิมพ์หมวดหมู่ หรือเลือกจากรายการ" 
                                    onFocus={() => setShowCategorySuggest(true)}
                                    onBlur={() => setTimeout(() => setShowCategorySuggest(false), 200)}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <ChevronDown size={18} className="transition-transform duration-200 peer-focus:rotate-180" />
                                </div>
                                {showCategorySuggest && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200 origin-top">
                                        {categories.filter(c => c !== 'ทั้งหมด' && c.toLowerCase().includes(productForm.type.toLowerCase())).map((cat, idx) => (
                                            <div 
                                                key={idx} 
                                                onMouseDown={(e) => { e.preventDefault(); setProductForm({...productForm, type: cat}); setShowCategorySuggest(false); }} 
                                                className={`px-4 py-2.5 hover:bg-sky-50 cursor-pointer border-b border-slate-50 last:border-0 font-data text-sm transition-colors ${productForm.type === cat ? 'bg-sky-50 text-sky-600 font-bold' : 'text-slate-700'}`}
                                            >
                                                {cat}
                                            </div>
                                        ))}
                                        {categories.filter(c => c !== 'ทั้งหมด' && c.toLowerCase().includes(productForm.type.toLowerCase())).length === 0 && productForm.type && (
                                            <div className="px-4 py-2.5 text-sm text-slate-400 font-data flex items-center gap-2 pointer-events-none">
                                                <Plus size={14} className="text-sky-500" /> เพิ่มหมวดหมู่ใหม่: "{productForm.type}"
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2 relative z-10">
                            <label className="block text-sm font-bold text-slate-600 ml-1 kanit-text uppercase tracking-wide">เลือกไอคอน <span className="text-rose-500">*</span></label>
                            <div className="grid grid-cols-5 sm:grid-cols-8 gap-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                {Object.keys(POS_ICONS).map(iconKey => {
                                    const CurrentIcon = POS_ICONS[iconKey];
                                    const isSelected = productForm.icon === iconKey;
                                    return (
                                        <button 
                                            key={iconKey} type="button" 
                                            onClick={() => setProductForm({...productForm, icon: iconKey})}
                                            className={`aspect-square flex items-center justify-center rounded-xl transition-all ${isSelected ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30 scale-110 z-10' : 'bg-white text-slate-500 hover:bg-sky-50 border border-slate-200 hover:border-sky-200'}`}
                                        >
                                            <CurrentIcon size={24} />
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* แก้ไขเติม !! ด้านหน้า checked ทุกตัว */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                            <div onClick={() => setProductForm({...productForm, stockManaged: !productForm.stockManaged})} className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${productForm.stockManaged ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                                <input type="checkbox" className="w-5 h-5 mt-0.5 accent-indigo-500 rounded cursor-pointer pointer-events-none" checked={!!productForm.stockManaged} readOnly />
                                <div>
                                    <label className="font-bold text-slate-800 kanit-text cursor-pointer block leading-tight">จัดการสต็อก (สินค้า)</label>
                                    <p className="text-xs text-slate-500 mt-1 kanit-text">รายการนี้เป็นสิ่งของที่ต้องนับจำนวน มีการรับเข้า และตัดจ่าย</p>
                                </div>
                            </div>
                            <div onClick={() => setProductForm({...productForm, isCourse: !productForm.isCourse})} className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${productForm.isCourse ? 'bg-amber-50/50 border-amber-200 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                                <input type="checkbox" className="w-5 h-5 mt-0.5 accent-amber-500 rounded cursor-pointer pointer-events-none" checked={!!productForm.isCourse} readOnly />
                                <div>
                                    <label className="font-bold text-slate-800 kanit-text cursor-pointer block leading-tight">คอร์ส / แพ็กเกจ</label>
                                    <p className="text-xs text-slate-500 mt-1 kanit-text">รายการนี้มีจำนวนครั้งที่ต้องตัดเมื่อมาใช้บริการ</p>
                                </div>
                            </div>
                            <div onClick={() => setProductForm({...productForm, isVatable: !productForm.isVatable})} className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${productForm.isVatable ? 'bg-sky-50/50 border-sky-200 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                                <input type="checkbox" className="w-5 h-5 mt-0.5 accent-sky-500 rounded cursor-pointer pointer-events-none" checked={!!productForm.isVatable} readOnly />
                                <div>
                                    <label className="font-bold text-slate-800 kanit-text cursor-pointer block leading-tight">คิดภาษี (VAT)</label>
                                    <p className="text-xs text-slate-500 mt-1 kanit-text">นำมูลค่าของรายการนี้ไปรวมคำนวณภาษีในหน้า POS</p>
                                </div>
                            </div>
                        </div>

                        {productForm.stockManaged && (
                            <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-200/60 animate-in fade-in slide-in-from-top-2">
                                <label className="block text-sm font-bold text-indigo-700 mb-2 kanit-text">แจ้งเตือนสต็อกขั้นต่ำ <span className="text-rose-500">*</span></label>
                                <div className="flex items-center gap-3">
                                    <input required type="number" min="0" className="w-full max-w-[200px] px-4 py-3 bg-white border border-indigo-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-data font-bold text-indigo-700 text-lg text-center" value={productForm.minStock} onChange={e => setProductForm({...productForm, minStock: e.target.value})} placeholder="5" />
                                    <span className="font-bold text-indigo-600 kanit-text">ชิ้น/หน่วย</span>
                                </div>
                            </div>
                        )}

                        {productForm.isCourse && (
                            <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-200/60 animate-in fade-in slide-in-from-top-2">
                                <label className="block text-sm font-bold text-amber-700 mb-2 kanit-text">จำนวนครั้งทั้งหมด (Total Sessions) <span className="text-rose-500">*</span></label>
                                <div className="flex items-center gap-3">
                                    <input required type="number" min="1" className="w-full max-w-[200px] px-4 py-3 bg-white border border-amber-200 rounded-xl outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-data font-bold text-amber-700 text-lg text-center" value={productForm.courseSessions} onChange={e => setProductForm({...productForm, courseSessions: e.target.value})} placeholder="1" />
                                    <span className="font-bold text-amber-600 kanit-text">ครั้ง</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 border-t border-slate-100 bg-white shrink-0 flex gap-4">
                  <button type="button" onClick={closeEditForm} className="flex-[1] py-4 bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl font-bold kanit-text hover:bg-slate-200 transition-colors">ยกเลิก</button>
                  <button type="submit" disabled={isProcessingProduct} className="flex-[2] py-4 bg-sky-500 text-white rounded-2xl font-bold shadow-xl shadow-sky-500/30 kanit-text hover:bg-sky-600 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 text-lg">
                      {isProcessingProduct ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />} ยืนยันการบันทึก
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

export default CatalogManager;


import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Skeleton from './Skeleton';
import CustomSelect from './CustomSelect';
import CalendarDay from './CalendarDay';
import { POS_ICONS } from '../global/constants';
import { rAFThrottle, parseBool, formatDate, formatDateTime, formatStatNumber, getDynamicTextSize, parsePatientName, getPatientFullName, generateNextHN, getAgeString, getPatientId, useModal, useSwipeDown, getPatientLastVisitStr, formatCurPrint, bahtTextPrint, globalGenerateInformedConsentHtml, globalGenerateRecordHtml, globalGenerateOpdHtml, globalGenerateMedicalCertificateHtml, globalGenerateReceiptHtml, getEffectiveApptStatus, getEffectiveApptDatetimeStr, getEffectiveApptIsoDate, parseThaiDateToISO, parseAnyDate, isSameDay, formatFinTime, formatFinCurrency, getFinDynamicTextClass } from '../global/helpers';
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
import { supabase, rowToJS } from '../lib/supabase';

const InventoryManager = ({
    inventoryData = [], setInventoryData,
    inventoryLogsData = [], setInventoryLogsData,
    posProducts = [], branchesData = [],
    showToast, callAppScript, isGlobalLoading,
    currentBranch, fetchInventoryStats
}) => {
  const [search, setSearch] = useState('');
  const [activeBranch, setActiveBranch] = useState(currentBranch === 'all' ? 'ทั้งหมด' : currentBranch);
  const [serverInvStats, setServerInvStats] = useState(null);

  useEffect(() => {
    if (fetchInventoryStats) {
      fetchInventoryStats().then(res => {
        if (res) setServerInvStats(res);
      }).catch(err => console.error(err));
    }
  }, [fetchInventoryStats]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalClosing, setIsModalClosing] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isAdjustClosing, setIsAdjustClosing] = useState(false);

  // Log Modal States
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isLogClosing, setIsLogClosing] = useState(false);
  const [selectedProductLogs, setSelectedProductLogs] = useState([]);
  const [logProductInfo, setLogProductInfo] = useState(null);

  // Lot Modal States
  const [isLotModalOpen, setIsLotModalOpen] = useState(false);
  const [isLotClosing, setIsLotClosing] = useState(false);
  const [selectedLotItem, setSelectedLotItem] = useState(null);

  const [editingItem, setEditingItem] = useState(null);
  const [adjustItem, setAdjustItem] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const headerRef = useRef(null);
  const filterRef = useRef(null); // --- [NEW] เพิ่ม Ref สำหรับ Filter เพื่อให้มันขยายตัวได้ ---

  useEffect(() => {
    setActiveBranch(currentBranch === 'all' ? 'ทั้งหมด' : currentBranch);
  }, [currentBranch]);

  // --- ระบบ Sticky เลียนแบบหน้านัดหมาย (ฉลาดขึ้น รู้จักจังหวะชน) ---
  useEffect(() => {
    const mainElement = document.getElementById('main-scroll-container');
    if (!mainElement) return;

    const handleScroll = rAFThrottle((e) => {
      // ป้องกันไม่ให้คำนวณและอัปเดต ถ้า Component ถูกซ่อนอยู่
      if (!headerRef.current || headerRef.current.offsetHeight === 0) return;

      const target = e.target || mainElement;
      const { scrollTop } = target;
      
      // 1. อัปเดต Header ทันทีเมื่อเลื่อนเกิน 20px
      if (scrollTop > 20) {
          headerRef.current.classList.add('is-scrolled');
      } else {
          headerRef.current.classList.remove('is-scrolled');
      }

      // 2. อัปเดต Filter ขยายขนาด "เฉพาะตอนที่เลื่อนมาชน Header พอดีเป๊ะ"
      if (filterRef.current && headerRef.current) {
          const headerRect = headerRef.current.getBoundingClientRect();
          const filterRect = filterRef.current.getBoundingClientRect();
          
          // ถ้าขอบบนของ Filter ชนกับขอบล่างของ Header พอดี (ระยะห่าง <= 1px)
          if (filterRect.top <= headerRect.bottom + 1) {
              filterRef.current.classList.add('is-scrolled');
          } else {
              filterRef.current.classList.remove('is-scrolled');
          }
      }
    });

    setTimeout(() => {
        if (headerRef.current) headerRef.current.classList.remove('is-scrolled');
        if (filterRef.current) {
            filterRef.current.classList.remove('is-scrolled');
            if (filterRef.current.classList.contains('filter-expanded')) filterRef.current.classList.remove('filter-expanded');
        }
        if (mainElement) mainElement.dispatchEvent(new Event('scroll'));
    }, 50);

    mainElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainElement.removeEventListener('scroll', handleScroll);
  }, []);

  // --- Closing logic with animation ---
  const closeModal = () => {
    setIsModalClosing(true);
    setTimeout(() => { setIsModalOpen(false); setIsModalClosing(false); }, 300);
  };
  const closeAdjustModal = () => {
    setIsAdjustClosing(true);
    setTimeout(() => { setIsAdjustModalOpen(false); setIsAdjustClosing(false); }, 300);
  };
  const closeLogModal = () => {
    setIsLogClosing(true);
    setTimeout(() => { setIsLogModalOpen(false); setIsLogClosing(false); }, 300);
  };
  const closeLotModal = () => {
    setIsLotClosing(true);
    setTimeout(() => { setIsLotModalOpen(false); setIsLotClosing(false); }, 300);
  };

  // --- Calendar states for Expire Date ---
  const [showCalendar, setShowCalendar] = useState(false);
  const [calDate, setCalDate] = useState(new Date());
  const [calView, setCalView] = useState('days'); // 'days', 'months', 'years'
  const [yearPageStart, setYearPageStart] = useState(0);
  const [isCalendarClosing, setIsCalendarClosing] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState('form_expire'); // 'form_expire', 'adjust_expire', 'adjust_receive'
  const expireDateWrapperRef = React.useRef(null);

  const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

  const closeCalendar = () => {
    setIsCalendarClosing(true);
    setTimeout(() => { setShowCalendar(false); setIsCalendarClosing(false); }, 300);
  };
  
  const invCalSwipeProps = useSwipeDown(closeCalendar);

  const handleOpenCalendar = () => {
    setCalendarTarget('form_expire');
    const targetDate = formData.expireDate;
    if (targetDate && targetDate.includes('/')) {
        const parts = targetDate.split('/');
        const y = parseInt(parts[2], 10) - 543;
        if (!isNaN(y)) setCalDate(new Date(y, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10)));
    } else {
        setCalDate(new Date());
    }
    setCalView('days');
    setShowCalendar(true);
  };

  const handleOpenCalendarForAdjust = (field) => { // 'expireDate' or 'receiveDate'
    setCalendarTarget(field === 'expireDate' ? 'adjust_expire' : 'adjust_receive');
    const targetDate = field === 'expireDate' ? adjustData.expireDate : adjustData.receiveDate;
    
    if (targetDate && targetDate.includes('/')) {
        const parts = targetDate.split('/');
        const y = parseInt(parts[2], 10) - 543;
        if (!isNaN(y)) setCalDate(new Date(y, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10)));
    } else {
        setCalDate(new Date());
    }
    setCalView('days');
    setShowCalendar(true);
  };

  const handleDaySelect = (day) => {
    const d = String(day).padStart(2, '0');
    const m = String(calDate.getMonth() + 1).padStart(2, '0');
    const y = calDate.getFullYear() + 543;
    const dateStr = `${d}/${m}/${y}`;
    
    if (calendarTarget === 'adjust_expire') {
        setAdjustData({ ...adjustData, expireDate: dateStr });
    } else if (calendarTarget === 'adjust_receive') {
        setAdjustData({ ...adjustData, receiveDate: dateStr });
    } else {
        setFormData({ ...formData, expireDate: dateStr });
    }
    closeCalendar();
  };

  const handlePrevMonth = () => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1));

  useEffect(() => {
    if (calView === 'years') setYearPageStart(Math.floor((calDate.getFullYear() + 543) / 12) * 12);
  }, [calView, calDate]);

  // Form states
  const initialForm = { 
    id: '', 
    productId: '', 
    name: '',
    category: 'อุปกรณ์ทางการแพทย์',
    unit: 'ชิ้น',
    minStock: 5,
    costPrice: '',
    itemSource: 'internal', // 'internal' | 'pos'
    receiveDate: new Date().toISOString().split('T')[0], // เพิ่มวันที่รับเข้าเริ่มต้น
    expireDate: '', 
    lotNo: '',
    branchAssignments: [] // จะถูกเติมอัตโนมัติเมื่อเปิด Modal
  };
  const [formData, setFormData] = useState(initialForm);
  const [adjustData, setAdjustData] = useState({ type: 'add', amount: 1, reason: '', branchId: '', lotNo: '', expireDate: '', receiveDate: '' });
  const [itemTypeFilter, setItemTypeFilter] = useState('all'); // 'all', 'pos', 'internal'

  const addBranchAssignment = () => {
    // ป้องกันการเพิ่มสาขาซ้ำในลิสต์
    const currentBranchIds = formData.branchAssignments.map(b => b.branchId);
    const availableBranch = branches.find(b => !currentBranchIds.includes(b.id));
    
    if (!availableBranch) {
        showToast('เลือกสาขาครบถ้วนแล้ว', 'warning');
        return;
    }

    setFormData(prev => ({
      ...prev,
      branchAssignments: [...prev.branchAssignments, { branchId: availableBranch.id, quantity: 0, isNew: true }]
    }));
  };

  const removeBranchAssignment = (index) => {
    setFormData(prev => ({
      ...prev,
      branchAssignments: prev.branchAssignments.filter((_, i) => i !== index)
    }));
  };

  const updateBranchAssignment = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      branchAssignments: prev.branchAssignments.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const branches = branchesData;

  const isStockForProduct = useCallback((stockRow, targetProductId) => {
    if (!stockRow || !targetProductId) return false;
    const cleanTarget = String(targetProductId).replace(/^INV_/, '').trim().toLowerCase();
    const cleanId = String(stockRow.id || '').replace(/^INV_/, '').trim().toLowerCase();
    const cleanPId = String(stockRow.productId || stockRow.product_id || '').replace(/^INV_/, '').trim().toLowerCase();
    const cleanCode = String(stockRow.code || '').replace(/^INV_/, '').trim().toLowerCase();

    return cleanId === cleanTarget || cleanPId === cleanTarget || cleanCode === cleanTarget;
  }, []);

  // แก้ไข: ปรับปรุง Logic การรวมข้อมูลให้รองรับทั้งสินค้า POS และอุปกรณ์/เวชภัณฑ์ภายในคลินิก (Internal Inventory)
  const joinedData = useMemo(() => {
    const manageableProducts = (posProducts || []).filter(p => {
      if (!p || p.isDeleted || p.is_deleted) return false;
      // เอาเฉพาะรายการที่เลือก/ติ๊กถูกว่าเป็นสินค้า (Stock Managed)
      const isStockChecked = Boolean(parseBool(p.stockManaged) || parseBool(p.stock_managed) || p.kind === 'stock' || p.itemKind === 'stock' || (typeof p.id === 'string' && p.id.toLowerCase().startsWith('prod')));
      return isStockChecked;
    });
    const results = [];

    // 1. ประมวลผลสินค้าจาก POS Catalog
    manageableProducts.forEach(product => {
      const productStocks = (inventoryData || []).filter(i => isStockForProduct(i, product.id));
      
      // กรณีเลือกสาขาเจาะจง
      if (activeBranch !== 'ทั้งหมด') {
        const branchStocks = productStocks.filter(i => (i.branchId || i.branch_id) === activeBranch);
        
        if (branchStocks.length === 0) {
          // ถ้ายังไม่มีสต็อกเลย ให้โชว์แถวว่าง 1 แถวสำหรับสาขานั้น
          results.push({ 
            id: `AUTO_${product.id}_${activeBranch}`,
            productId: product.id,
            branchId: activeBranch,
            quantity: 0,
            minStock: product.minStock !== undefined ? product.minStock : 5,
            receiveDate: '',
            expireDate: '',
            lotNo: '',
            product: product,
            isGrouped: false,
            isInternal: false
          });
        } else {
          // รวบรวมข้อมูลให้เป็นแบบ Group เสมอ เพื่อความเป็นระเบียบและรวม Lot ไว้ในปุ่ม
          const totalQty = branchStocks.reduce((sum, s) => sum + Number(s.quantity ?? s.stockQuantity ?? s.stock_quantity ?? 0), 0);
          const minStock = product.minStock !== undefined ? product.minStock : 5;
          
          results.push({
            id: `GROUPED_${product.id}_${activeBranch}`,
            productId: product.id,
            branchId: activeBranch,
            quantity: totalQty,
            minStock: minStock,
            product: product,
            isGrouped: true,
            stocks: branchStocks,
            isInternal: false
          });
        }
      } else {
        // กรณีดู "ทุกสาขา" (ยังคงรวมยอดต่อสินค้าเพื่อให้ดูง่าย แต่เก็บข้อมูลล็อตไว้ข้างใน)
        const totalQty = productStocks.reduce((sum, s) => sum + Number(s.quantity ?? s.stockQuantity ?? s.stock_quantity ?? 0), 0);
        const minStock = product.minStock !== undefined ? product.minStock : 5;
        
        results.push({
          id: `GROUPED_${product.id}`,
          productId: product.id,
          branchId: 'ทุกสาขา',
          quantity: totalQty,
          minStock: minStock,
          product: product,
          isGrouped: true,
          stocks: productStocks,
          isInternal: false
        });
      }
    });

    // 2. ประมวลผลอุปกรณ์การแพทย์ / เครื่องใช้สำนักงาน / เวชภัณฑ์ภายในคลินิก (ที่ไม่ได้อยู่ใน POS Catalog)
    const processedIds = new Set();
    (inventoryData || []).forEach(item => {
      if (!item || item.isDeleted || item.is_deleted) return;

      // ตรวจสอบว่าตรงกับสินค้า POS หรือไม่
      const isPos = manageableProducts.some(p => isStockForProduct(item, p.id));
      if (isPos) return;

      const itemCode = String(item.productId || item.product_id || item.code || item.id || '').replace(/^INV_/, '').trim();
      const itemName = String(item.name || itemCode).trim();
      const groupKey = (itemCode || itemName).toLowerCase();

      if (processedIds.has(groupKey)) return;
      processedIds.add(groupKey);

      // รวบรวมสต็อกของรายการอุปกรณ์นี้
      const itemStocks = (inventoryData || []).filter(i => {
        if (!i || i.isDeleted || i.is_deleted) return false;
        const iCode = String(i.productId || i.product_id || i.code || i.id || '').replace(/^INV_/, '').trim();
        const iName = String(i.name || iCode).trim();
        return (itemCode && iCode.toLowerCase() === itemCode.toLowerCase()) ||
               (itemName && iName.toLowerCase() === itemName.toLowerCase()) ||
               isStockForProduct(i, itemCode);
      });

      const baseItem = itemStocks[0] || item;
      const cat = baseItem.category || baseItem.type || 'อุปกรณ์และเครื่องใช้';
      
      let icon = 'Package';
      if (cat.includes('แพทย์') || cat.includes('พยาบาล')) icon = 'Stethoscope';
      else if (cat.includes('เวชภัณฑ์') || cat.includes('ยา')) icon = 'Pill';
      else if (cat.includes('สำนักงาน') || cat.includes('เอกสาร')) icon = 'FileText';
      else if (cat.includes('ทำความสะอาด') || cat.includes('ทั่วไป')) icon = 'Briefcase';

      const internalProduct = {
        id: itemCode || baseItem.id,
        name: baseItem.name || itemCode || 'อุปกรณ์ไม่ระบุชื่อ',
        category: cat,
        type: cat,
        unit: baseItem.unit || 'ชิ้น',
        minStock: baseItem.minStock !== undefined ? Number(baseItem.minStock) : (baseItem.min_stock !== undefined ? Number(baseItem.min_stock) : 5),
        costPrice: baseItem.costPrice !== undefined ? Number(baseItem.costPrice) : (baseItem.cost_price !== undefined ? Number(baseItem.cost_price) : 0),
        icon: icon,
        isInternal: true
      };

      if (activeBranch !== 'ทั้งหมด') {
        const branchStocks = itemStocks.filter(i => (i.branchId || i.branch_id) === activeBranch);
        if (branchStocks.length === 0) {
          results.push({
            id: `AUTO_${internalProduct.id}_${activeBranch}`,
            productId: internalProduct.id,
            branchId: activeBranch,
            quantity: 0,
            minStock: internalProduct.minStock,
            receiveDate: '',
            expireDate: '',
            lotNo: '',
            product: internalProduct,
            isGrouped: false,
            isInternal: true
          });
        } else {
          const totalQty = branchStocks.reduce((sum, s) => sum + Number(s.quantity ?? s.stockQuantity ?? s.stock_quantity ?? 0), 0);
          results.push({
            id: `GROUPED_${internalProduct.id}_${activeBranch}`,
            productId: internalProduct.id,
            branchId: activeBranch,
            quantity: totalQty,
            minStock: internalProduct.minStock,
            product: internalProduct,
            isGrouped: true,
            stocks: branchStocks,
            isInternal: true
          });
        }
      } else {
        const totalQty = itemStocks.reduce((sum, s) => sum + Number(s.quantity ?? s.stockQuantity ?? s.stock_quantity ?? 0), 0);
        results.push({
          id: `GROUPED_${internalProduct.id}`,
          productId: internalProduct.id,
          branchId: 'ทุกสาขา',
          quantity: totalQty,
          minStock: internalProduct.minStock,
          product: internalProduct,
          isGrouped: true,
          stocks: itemStocks,
          isInternal: true
        });
      }
    });

    return results;
  }, [inventoryData, posProducts, activeBranch, isStockForProduct]);

  const counts = useMemo(() => {
    let posCount = 0;
    let internalCount = 0;
    joinedData.forEach(item => {
      if (item.isInternal || item.product?.isInternal) internalCount++;
      else posCount++;
    });
    return {
      all: joinedData.length,
      pos: posCount,
      internal: internalCount
    };
  }, [joinedData]);

  const filteredData = useMemo(() => {
    return joinedData.filter(item => {
      if (!item) return false;

      // กรองตามประเภทรายการ
      if (itemTypeFilter === 'pos' && (item.isInternal || item.product?.isInternal)) return false;
      if (itemTypeFilter === 'internal' && (!item.isInternal && !item.product?.isInternal)) return false;

      const pName = String(item.product?.name || item.name || '').toLowerCase();
      const pId = String(item.productId || item.product?.id || item.code || '').toLowerCase();
      const pCat = String(item.product?.category || item.category || '').toLowerCase();
      const pSearch = (search || '').toLowerCase();
      return pName.includes(pSearch) || pId.includes(pSearch) || pCat.includes(pSearch);
    });
  }, [joinedData, search, itemTypeFilter]);

  // สถิติสต็อก
  const stats = useMemo(() => {
    const today = new Date();
    let total = filteredData.length;
    let low = 0, out = 0, expired = 0, nearExpiry = 0;

    filteredData.forEach(item => {
      if (item.quantity <= 0) out++;
      else if (item.quantity <= item.minStock) low++;

      // เช็ควันหมดอายุ
      const checkExpiration = (stockItem) => {
        if (!stockItem.expireDate || !stockItem.expireDate.includes('/') || stockItem.quantity <= 0) return { isExpired: false, isNear: false };
        const parts = stockItem.expireDate.split('/');
        if (parts.length !== 3) return { isExpired: false, isNear: false };
        const expDate = new Date(parseInt(parts[2], 10) - 543, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        const monthsDiff = (expDate.getFullYear() - today.getFullYear()) * 12 + (expDate.getMonth() - today.getMonth());
        
        if (expDate < today) return { isExpired: true, isNear: false };
        if (monthsDiff <= 3) return { isExpired: false, isNear: true };
        return { isExpired: false, isNear: false };
      };

      if (item.isGrouped && item.stocks) {
        let prodHasExpired = false;
        let prodHasNear = false;
        item.stocks.forEach(s => {
          const { isExpired, isNear } = checkExpiration(s);
          if (isExpired) prodHasExpired = true;
          if (isNear) prodHasNear = true;
        });
        if (prodHasExpired) expired++;
        if (prodHasNear) nearExpiry++;
      } else {
        const { isExpired, isNear } = checkExpiration(item);
        if (isExpired) expired++;
        if (isNear) nearExpiry++;
      }
    });

    return { total, low, out, expired, nearExpiry };
  }, [filteredData]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    const initialCode = `EQP-${Date.now().toString().slice(-4)}`;
    setFormData({ 
        ...initialForm, 
        itemSource: 'internal', // ค่าเริ่มต้นเป็นอุปกรณ์ภายในตามที่ผู้ใช้ร้องขอ
        productId: initialCode,
        name: '',
        category: 'อุปกรณ์ทางการแพทย์',
        unit: 'ชิ้น',
        minStock: 5,
        costPrice: '',
        branchAssignments: [{ branchId: activeBranch === 'ทั้งหมด' ? 'b1' : activeBranch, quantity: 0, isNew: true }] 
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    
    // ดึงข้อมูลทุกสาขาของสินค้านี้มาแสดงใน Modal (ไร้รอยต่อ)
    const allProductStocks = (inventoryData || []).filter(i => isStockForProduct(i, item.productId));
    const assignments = allProductStocks.map(s => ({
        id: s.id,
        branchId: s.branchId || s.branch_id,
        quantity: Number(s.quantity ?? s.stockQuantity ?? s.stock_quantity ?? 0)
    }));

    // ถ้ายังไม่มีสาขาไหนเลย ให้ใส่สาขาปัจจุบันเป็นค่าเริ่มต้น
    if (assignments.length === 0) {
        assignments.push({ branchId: activeBranch === 'ทั้งหมด' ? 'b1' : activeBranch, quantity: 0, isNew: true });
    }

    // ใช้ข้อมูลจากแถวแรกเป็นค่าพื้นฐาน (กรณี grouped จะดึงจากข้อมูลที่มี)
    const baseInfo = allProductStocks[0] || item;
    const isInternal = Boolean(item.isInternal || item.product?.isInternal || !posProducts.some(p => isStockForProduct(item, p.id)));

    setFormData({
      id: item.productId, 
      productId: item.productId,
      itemSource: isInternal ? 'internal' : 'pos',
      name: item.product?.name || item.name || baseInfo.name || '',
      category: item.product?.category || item.category || baseInfo.category || 'อุปกรณ์ทางการแพทย์',
      unit: item.product?.unit || item.unit || baseInfo.unit || 'ชิ้น',
      minStock: item.minStock ?? baseInfo.minStock ?? baseInfo.min_stock ?? 5,
      costPrice: item.product?.costPrice ?? baseInfo.costPrice ?? baseInfo.cost_price ?? '',
      receiveDate: baseInfo.receiveDate || baseInfo.receive_date || new Date().toISOString().split('T')[0],
      expireDate: baseInfo.expireDate || baseInfo.expire_date || '',
      lotNo: baseInfo.lotNo || baseInfo.lot_no || '',
      branchAssignments: assignments
    });
    setIsModalOpen(true);
  };

  const handleDeleteItem = async (item) => {
    if (!item) return;
    const targetName = item.product?.name || item.name || item.productId;
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบรายการ "${targetName}" ออกจากคลังสินค้า? การดำเนินการนี้จะลบสต็อกของทุกสาขา`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const targetPId = item.productId || item.product?.id || item.code || item.id;
      const stocksToDelete = (inventoryData || []).filter(i => isStockForProduct(i, targetPId));
      
      for (const s of stocksToDelete) {
        if (s.id) {
          await callAppScript('DELETE_DATA', 'Inventory', { id: s.id });
        }
      }

      setInventoryData(prev => prev.filter(i => !isStockForProduct(i, targetPId)));
      showToast(`ลบรายการ "${targetName}" เรียบร้อยแล้ว`, 'success');
      closeModal();
    } catch (err) {
      console.error('Delete error:', err);
      showToast('ไม่สามารถลบรายการได้', 'warning');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenAdjust = (item) => {
    // กำหนดสาขาเริ่มต้น: ถ้าเป็นสาขา "ทั้งหมด" ให้พยายามเอาจากข้อมูลดิบก่อน (หรือค่าเริ่มต้น b1)
    const defaultBranch = activeBranch === 'ทั้งหมด' 
        ? (item.stocks?.[0]?.branchId || item.stocks?.[0]?.branch_id || 'b1') 
        : activeBranch;

    // ค้นหาข้อมูลสต็อกปัจจุบันของสาขาที่เลือก เพื่อเอาล็อตและวันหมดอายุมาแสดงเริ่มต้น
    const existingStock = item.isGrouped 
        ? item.stocks?.find(s => (s.branchId || s.branch_id) === defaultBranch)
        : item;

    setAdjustItem(item);
    setAdjustData({ 
        type: 'add', 
        amount: 1, 
        reason: '', 
        branchId: defaultBranch,
        lotNo: existingStock?.lotNo || existingStock?.lot_no || '',
        expireDate: existingStock?.expireDate || existingStock?.expire_date || '',
        receiveDate: existingStock?.receiveDate || existingStock?.receive_date || new Date().toISOString().split('T')[0]
    });
    setIsAdjustModalOpen(true);
  };

  const handleOpenLotModal = (item) => {
    setSelectedLotItem(item);
    setIsLotModalOpen(true);
  };

  // ฟังก์ชันเปิดดูประวัติ (Log) ดึงจากตาราง inventory_logs บน DB โดยตรง
  const handleOpenLogs = async (item) => {
    const rawTargetId = item.productId || item.product?.id || item.code || item.id || '';
    const cleanTargetId = String(rawTargetId).replace(/^INV_/, '').trim();
    const productName = item.product?.name || item.name || '';

    setLogProductInfo(item.product || { name: productName || 'สินค้า' });
    setIsLogModalOpen(true);

    try {
      let fetchedLogs = [];
      if (supabase) {
        let query = supabase.from('inventory_logs').select('*');
        if (cleanTargetId && productName) {
          query = query.or(`item_id.eq."${cleanTargetId}",product_id.eq."${cleanTargetId}",item_name.eq."${productName}"`);
        } else if (cleanTargetId) {
          query = query.or(`item_id.eq."${cleanTargetId}",product_id.eq."${cleanTargetId}"`);
        } else if (productName) {
          query = query.eq('item_name', productName);
        }
        query = query.order('created_at', { ascending: false }).limit(100);

        const { data, error } = await query;
        if (!error && Array.isArray(data) && data.length > 0) {
          fetchedLogs = data.map(rowToJS);
        }
      }

      // Fallback กรองจากข้อมูลที่มีในเครื่อง
      const fallbackLogs = inventoryLogsData.filter(l => {
        const lProductId = String(l.productId || l.product_id || l.itemId || l.item_id || l.code || '').trim();
        const lProductName = String(l.productName || l.product_name || l.itemName || l.item_name || '').trim();
        
        const matchId = cleanTargetId && (
          lProductId.toLowerCase() === cleanTargetId.toLowerCase() ||
          lProductId.toLowerCase().replace(/^inv_/, '') === cleanTargetId.toLowerCase()
        );
        const matchName = productName && lProductName && lProductName.toLowerCase() === productName.toLowerCase();

        return matchId || matchName;
      });

      const combinedLogs = [...fetchedLogs, ...fallbackLogs];

      // กรองเอาเฉพาะรายการที่ไม่ซ้ำกัน
      const seenIds = new Set();
      const uniqueLogs = combinedLogs.filter(l => {
        const idKey = l.id || `${l.productId || l.product_id}_${l.timestamp || l.created_at}_${l.amount || l.quantity}`;
        if (seenIds.has(idKey)) return false;
        seenIds.add(idKey);
        return true;
      });

      setSelectedProductLogs(uniqueLogs);
    } catch (e) {
      console.error('Error fetching inventory logs:', e);
    }
  };

  const handleSaveItem = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();

    // ตรวจสอบความครบถ้วนของข้อมูล
    if (formData.itemSource === 'pos') {
      if (!formData.productId) {
        showToast('กรุณาเลือกสินค้าจาก POS', 'warning');
        return;
      }
    } else {
      if (!formData.name?.trim()) {
        showToast('กรุณาระบุชื่ออุปกรณ์ / เครื่องใช้ / เวชภัณฑ์', 'warning');
        return;
      }
      if (!formData.productId?.trim()) {
        showToast('กรุณาระบุรหัสรายการ', 'warning');
        return;
      }
    }

    if (!formData.branchAssignments || formData.branchAssignments.length === 0) {
      showToast('กรุณาระบุข้อมูลสาขาอย่างน้อย 1 สาขา', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      const results = [];
      const logs = [];
      const finalProductId = formData.productId.trim();
      const finalName = (formData.itemSource === 'pos'
        ? (posProducts.find(p => p.id === formData.productId)?.name || formData.name || finalProductId)
        : formData.name.trim()
      );

      for (const assignment of formData.branchAssignments) {
          // ใช้ ID เดิมของสาขานั้นๆ ถ้ามี หรือสร้างใหม่ถ้าเป็นสาขาที่เพิ่งเพิ่ม
          const finalId = assignment.id || `STK${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          const isNew = !assignment.id;
          
          const payload = {
            id: finalId,
            productId: finalProductId,
            product_id: finalProductId,
            code: finalProductId,
            name: finalName,
            category: formData.category || 'อุปกรณ์และเครื่องใช้',
            unit: formData.unit || 'ชิ้น',
            minStock: Number(formData.minStock || 5),
            min_stock: Number(formData.minStock || 5),
            costPrice: Number(formData.costPrice || 0),
            cost_price: Number(formData.costPrice || 0),
            branchId: assignment.branchId,
            branch_id: assignment.branchId,
            quantity: Number(assignment.quantity || 0),
            stockQuantity: Number(assignment.quantity || 0),
            stock_quantity: Number(assignment.quantity || 0),
            receiveDate: formData.receiveDate || '',
            receive_date: formData.receiveDate || '',
            expireDate: formData.expireDate || '',
            expire_date: formData.expireDate || '',
            lotNo: (formData.lotNo || '').trim(),
            lot_no: (formData.lotNo || '').trim()
          };
          
          await callAppScript('SAVE_DATA', 'Inventory', payload);
          
          // บันทึก Log
          const logPayload = {
              id: `LOG${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              productId: payload.productId,
              product_id: payload.productId,
              itemId: payload.productId,
              item_id: payload.productId,
              productName: finalName,
              item_name: finalName,
              branchId: payload.branchId,
              branch_id: payload.branchId,
              type: 'MANUAL',
              change_type: 'MANUAL',
              amount: payload.quantity,
              quantity: payload.quantity,
              balance: payload.quantity,
              lotNo: payload.lotNo,
              lot_no: payload.lotNo,
              expireDate: payload.expireDate,
              expire_date: payload.expireDate,
              receiveDate: payload.receiveDate,
              receive_date: payload.receiveDate,
              reason: isNew ? 'เพิ่มรายการเข้าสู่คลัง' : 'อัปเดตข้อมูลรวมศูนย์',
              notes: isNew ? 'เพิ่มรายการเข้าสู่คลัง' : 'อัปเดตข้อมูลรวมศูนย์',
              timestamp: new Date().toISOString()
          };
          await callAppScript('SAVE_DATA', 'InventoryLogs', logPayload);
          
          results.push(payload);
          logs.push(logPayload);
      }

      setInventoryData(prev => {
          let next = [...prev];
          results.forEach(res => {
              const idx = next.findIndex(i => i.id === res.id);
              if (idx !== -1) next[idx] = { ...next[idx], ...res };
              else next.push(res);
          });
          return next;
      });

      setInventoryLogsData(prev => [...logs, ...prev]);
      
      showToast('บันทึกข้อมูลและกระจายสต็อกสำเร็จ', 'success');
      closeModal();
    } catch (err) {
      console.error("Inventory Save Error:", err);
      showToast('ไม่สามารถบันทึกข้อมูลได้', 'warning');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmAdjust = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!adjustItem || !adjustData.branchId) {
      showToast('กรุณาระบุข้อมูลให้ครบถ้วน', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      const amount = Number(adjustData.amount);
      const isAdd = adjustData.type === 'add';
      const targetBranchId = adjustData.branchId;
      const targetLotNo = String(adjustData.lotNo || '').trim();
      const pId = adjustItem.productId || adjustItem.product?.id || adjustItem.code || adjustItem.id || '';
      const cleanPId = String(pId).replace(/^INV_/, '').trim();
      const pName = adjustItem.product?.name || adjustItem.name || '';

      // ค้นหาข้อมูลสต็อกปัจจุบันของสาขา และ ล็อต ที่เลือก
      const existingStock = (inventoryData || []).find(i => 
        isStockForProduct(i, cleanPId) && 
        (i.branchId || i.branch_id) === targetBranchId && 
        (String(i.lotNo || i.lot_no || '').trim() === targetLotNo)
      );
      
      const currentQty = existingStock ? (Number(existingStock.quantity ?? existingStock.stockQuantity ?? existingStock.stock_quantity) || 0) : 0;
      const newQty = isAdd ? currentQty + amount : Math.max(0, currentQty - amount);

      // ใช้ ID เดิมถ้ามี หรือสร้างใหม่
      const finalId = existingStock?.id || `STK${Date.now()}`;
      const payload = {
          id: finalId,
          productId: adjustItem.productId,
          product_id: adjustItem.productId,
          code: adjustItem.productId,
          name: pName,
          category: adjustItem.product?.category || adjustItem.category || 'อุปกรณ์และเครื่องใช้',
          unit: adjustItem.product?.unit || adjustItem.unit || 'ชิ้น',
          minStock: adjustItem.minStock || 5,
          min_stock: adjustItem.minStock || 5,
          costPrice: adjustItem.costPrice || 0,
          cost_price: adjustItem.costPrice || 0,
          branchId: targetBranchId,
          branch_id: targetBranchId,
          quantity: newQty,
          stockQuantity: newQty,
          stock_quantity: newQty,
          expireDate: adjustData.expireDate || '',
          expire_date: adjustData.expireDate || '',
          lotNo: targetLotNo || '',
          lot_no: targetLotNo || '',
          receiveDate: adjustData.receiveDate || '',
          receive_date: adjustData.receiveDate || ''
      };

      await callAppScript('SAVE_DATA', 'Inventory', payload);

      // สร้าง Log สำหรับการปรับปรุง/จ่ายออก/รับเข้า
      const logPayload = {
          id: `LOG${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          productId: pId,
          product_id: pId,
          itemId: pId,
          item_id: pId,
          productName: pName,
          item_name: pName,
          branchId: targetBranchId,
          branch_id: targetBranchId,
          type: isAdd ? 'IN' : 'OUT',
          change_type: isAdd ? 'IN' : 'OUT',
          amount: isAdd ? amount : -amount,
          quantity: isAdd ? amount : -amount,
          balance: newQty,
          reason: adjustData.reason || (isAdd ? 'รับเข้าสินค้า' : 'จ่ายออก/ปรับปรุงสต็อก'),
          notes: adjustData.reason || (isAdd ? 'รับเข้าสินค้า' : 'จ่ายออก/ปรับปรุงสต็อก'),
          lotNo: targetLotNo || '',
          lot_no: targetLotNo || '',
          expireDate: adjustData.expireDate || '',
          expire_date: adjustData.expireDate || '',
          receiveDate: adjustData.receiveDate || '',
          receive_date: adjustData.receiveDate || '',
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString()
      };
      await callAppScript('SAVE_DATA', 'InventoryLogs', logPayload);

      setInventoryData(prev => {
          const exists = prev.some(i => i.id === finalId);
          if (exists) return prev.map(i => i.id === finalId ? payload : i);
          return [payload, ...prev];
      });
      setInventoryLogsData(prev => [logPayload, ...prev]);

      showToast(`ปรับปรุงสต็อกสำเร็จ (ยอดใหม่: ${newQty})`, 'success');
      closeAdjustModal();
    } catch (err) {
      console.error("Adjustment Error:", err);
      showToast('ไม่สามารถปรับปรุงสต็อกได้', 'warning');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAdjustment = handleConfirmAdjust;

  return (
    <div className="flex flex-col h-full fade-in pb-20 md:pb-0 relative">

      {/* --- 1. Sticky Header --- */}
      {/* แก้ไข: ถอด Filter ออกจากก้อน Header ด้านบน */}
      <div ref={headerRef} className="sticky z-30 w-full pointer-events-none transition-all duration-300 ease-in-out flex flex-col" style={{ top: 'var(--mobile-header-offset, 0px)' }}>
        <div className="w-full pointer-events-auto sticky-header-bg shrink-0">
          <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 flex flex-row justify-between items-center gap-2 sm:gap-4 sticky-header-inner">
            <div>
              <h1 className="font-bold text-slate-800 tracking-tight kanit-text sticky-header-title flex items-center gap-2">
                <Package className="text-sky-500" /> ระบบคลังสินค้า
              </h1>
              <p className="text-slate-500 kanit-text sticky-header-desc">จัดการสต๊อกยา เวชภัณฑ์ และสินค้าทุกสาขา</p>
            </div>
            <button 
              onClick={handleOpenAdd}
              className={`flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl font-semibold shadow-sm transition-transform active:scale-95 shrink-0 ${theme.primary} kanit-text sticky-header-btn px-4 py-2 sm:px-6 sm:py-3`}
            >
              <Plus size={18} /> <span className="hidden sm:inline">เพิ่มรายการสต็อก</span>
            </button>
          </div>
        </div>
      </div>

      {/* --- 2. Stats Section (ปรับ Layout ใหม่) --- */}
      <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 mt-4 mb-0 relative z-20 pointer-events-auto">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
          <div className="bg-white p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-sky-200 hover:shadow-md transition-all h-full min-h-[110px] sm:min-h-[140px]">
            <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-4 relative z-10">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-sky-50 text-sky-500 border border-sky-100 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-sm"><Package size={20} className="sm:w-6 sm:h-6" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-[11px] font-black text-slate-400 kanit-text uppercase tracking-wider truncate leading-tight" title="รายการทั้งหมด">รายการทั้งหมด</p>
              </div>
            </div>
            <div className="relative z-10 mt-auto w-full">
              <p className={`font-black text-slate-800 font-data whitespace-nowrap overflow-hidden ${getDynamicTextSize(formatStatNumber(stats.total))}`}>{formatStatNumber(stats.total)}</p>
            </div>
            <div className="absolute -bottom-6 -right-6 w-20 h-20 sm:w-24 sm:h-24 bg-slate-50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 z-0 pointer-events-none transform group-hover:scale-150"></div>
          </div>
          <div className="bg-white p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-amber-200 hover:shadow-md transition-all h-full min-h-[110px] sm:min-h-[140px]">
            <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-4 relative z-10">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-50 text-amber-500 border border-amber-100 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-sm"><AlertTriangle size={20} className="sm:w-6 sm:h-6" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-[11px] font-black text-slate-400 kanit-text uppercase tracking-wider leading-tight line-clamp-2" title="สต็อกใกล้หมด">สต็อกใกล้หมด</p>
              </div>
            </div>
            <div className="relative z-10 mt-auto w-full">
              <p className={`font-black text-amber-600 font-data whitespace-nowrap overflow-hidden ${getDynamicTextSize(formatStatNumber(stats.low))}`}>{formatStatNumber(stats.low)}</p>
            </div>
            <div className="absolute -bottom-6 -right-6 w-20 h-20 sm:w-24 sm:h-24 bg-amber-50/50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 z-0 pointer-events-none transform group-hover:scale-150"></div>
          </div>
          <div className="bg-white p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-rose-200 hover:shadow-md transition-all h-full min-h-[110px] sm:min-h-[140px]">
            <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-4 relative z-10">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-rose-50 text-rose-500 border border-rose-100 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-sm"><X size={20} className="sm:w-6 sm:h-6" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-[11px] font-black text-slate-400 kanit-text uppercase tracking-wider truncate leading-tight" title="สินค้าหมด">สินค้าหมด</p>
              </div>
            </div>
            <div className="relative z-10 mt-auto w-full">
              <p className={`font-black text-rose-600 font-data whitespace-nowrap overflow-hidden ${getDynamicTextSize(formatStatNumber(stats.out))}`}>{formatStatNumber(stats.out)}</p>
            </div>
            <div className="absolute -bottom-6 -right-6 w-20 h-20 sm:w-24 sm:h-24 bg-rose-50/50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 z-0 pointer-events-none transform group-hover:scale-150"></div>
          </div>
          <div className="bg-white p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-rose-200 hover:shadow-md transition-all h-full min-h-[110px] sm:min-h-[140px]">
            <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-4 relative z-10">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-rose-100 text-rose-600 border border-rose-200 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-sm"><AlertOctagon size={20} className="sm:w-6 sm:h-6" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-[11px] font-black text-slate-400 kanit-text uppercase tracking-wider truncate leading-tight" title="หมดอายุ">หมดอายุ</p>
              </div>
            </div>
            <div className="relative z-10 mt-auto w-full">
              <p className={`font-black text-rose-700 font-data whitespace-nowrap overflow-hidden ${getDynamicTextSize(formatStatNumber(stats.expired))}`}>{formatStatNumber(stats.expired)}</p>
            </div>
            <div className="absolute -bottom-6 -right-6 w-20 h-20 sm:w-24 sm:h-24 bg-rose-100/50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 z-0 pointer-events-none transform group-hover:scale-150"></div>
          </div>
          <div className="bg-white p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-amber-200 hover:shadow-md transition-all h-full min-h-[110px] sm:min-h-[140px] col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-4 relative z-10">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 text-amber-600 border border-amber-200 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-sm"><Clock size={20} className="sm:w-6 sm:h-6" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-[11px] font-black text-slate-400 kanit-text uppercase tracking-wider leading-tight line-clamp-2" title="ใกล้หมดอายุ">ใกล้หมดอายุ</p>
              </div>
            </div>
            <div className="relative z-10 mt-auto w-full">
              <p className={`font-black text-amber-700 font-data whitespace-nowrap overflow-hidden ${getDynamicTextSize(formatStatNumber(stats.nearExpiry))}`}>{formatStatNumber(stats.nearExpiry)}</p>
            </div>
            <div className="absolute -bottom-6 -right-6 w-20 h-20 sm:w-24 sm:h-24 bg-amber-100/50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 z-0 pointer-events-none transform group-hover:scale-150"></div>
          </div>
        </div>
      </div>

      {/* --- 3. Filter Component (ย้ายมาอยู่ใต้ Stats และใช้ระบบ Sticky อัตโนมัติเมื่อเลื่อนชน) --- */}
      {/* แก้ไข: เปลี่ยนคลาส mb-4 ให้เป็น my-5 sm:my-6 แบบหน้านัดหมาย */}
      <div 
         ref={filterRef}
         className="w-full pointer-events-none sticky z-20 transition-all duration-300 ease-in-out my-5 sm:my-6 sticky-filter-appt" 
      >
        {/* แก้ไข: ลดความสูง Placeholder ให้พอดี */}
        <div className="w-full mx-auto pointer-events-none relative h-[60px] sm:h-[76px] z-50">
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 mx-auto bg-white/95 backdrop-blur-xl border-slate-200 pointer-events-auto origin-top sticky-filter-inner shadow-sm flex flex-row justify-between items-center gap-2 sm:gap-4 px-4 md:px-8 2xl:px-12 py-3 sm:py-4 transition-all">
            <div className="relative flex-1 min-w-0 w-full">
              <input
                type="text"
                placeholder="ค้นหาชื่อสินค้า หรือรหัส..."
                className="w-full pl-9 pr-9 sm:pl-11 sm:pr-10 py-2 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 transition-colors shadow-inner font-data truncate"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Search className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-slate-400 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2" />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-full transition-all"
                  title="ล้างข้อความ"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 pointer-events-auto shrink-0 z-50 w-[120px] sm:w-[240px]">
              <CustomSelect
                value={activeBranch}
                onChange={val => setActiveBranch(val)}
                options={[{ id: 'ทั้งหมด', name: 'ทุกสาขา (รวมยอด)' }, ...branchesData].map(b => ({ value: b.id, label: b.name }))}
                placeholder="เลือกสาขา"
                className="w-full"
                compact
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {/* แก้ไข: เปลี่ยนจาก mt-4 เป็น mt-0 เพื่อล้างระยะขอบที่ทับซ้อนกัน */}
      <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 mt-0 mb-12 flex-1 flex flex-col pointer-events-auto z-10">
        
        {/* --- Category Filter Tabs (ทั้งหมด, สินค้าขายหน้าร้าน, อุปกรณ์/เวชภัณฑ์ภายใน) --- */}
        <div className="flex items-center gap-2 mb-3.5 overflow-x-auto no-scrollbar py-1">
          <button
            type="button"
            onClick={() => setItemTypeFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold kanit-text transition-all flex items-center gap-2 shrink-0 ${
              itemTypeFilter === 'all'
                ? 'bg-slate-800 text-white shadow-md shadow-slate-800/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80 shadow-xs'
            }`}
          >
            <LayoutList size={14} /> รายการทั้งหมด ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setItemTypeFilter('pos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold kanit-text transition-all flex items-center gap-2 shrink-0 ${
              itemTypeFilter === 'pos'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                : 'bg-white text-slate-600 hover:bg-sky-50 border border-slate-200/80 shadow-xs'
            }`}
          >
            <Tag size={14} /> สินค้า POS ({counts.pos})
          </button>
          <button
            type="button"
            onClick={() => setItemTypeFilter('internal')}
            className={`px-4 py-2 rounded-xl text-xs font-bold kanit-text transition-all flex items-center gap-2 shrink-0 ${
              itemTypeFilter === 'internal'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'bg-white text-slate-600 hover:bg-indigo-50 border border-slate-200/80 shadow-xs'
            }`}
          >
            <Stethoscope size={14} /> อุปกรณ์ / เครื่องใช้ภายใน ({counts.internal})
          </button>
        </div>

        <div className="flex-1 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
          {isGlobalLoading ? (
          <div className="flex-1 flex flex-col p-4 gap-3">
             {/* Skeleton for Mobile & Desktop */}
             <div className="hidden lg:flex w-full h-12 bg-slate-50 border-b border-slate-100" />
             {Array.from({ length: 4 }).map((_, i) => (
                <div key={`skel-inv-${i}`} className="flex flex-col lg:flex-row gap-4 p-4 lg:p-5 bg-white border border-slate-100 rounded-2xl lg:rounded-none lg:border-x-0 lg:border-t-0 shadow-sm lg:shadow-none items-start lg:items-center">
                   <div className="flex items-center gap-4 w-full lg:w-1/4">
                      <div className="w-full max-w-[48px] h-12 bg-slate-200 rounded-xl animate-pulse shrink-0"></div>
                      <div className="flex flex-col gap-2 w-full"><div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse"></div><div className="h-3 w-1/2 bg-slate-200 rounded animate-pulse"></div></div>
                   </div>
                   <div className="hidden lg:block w-1/4"><div className="h-6 w-full max-w-[80px] bg-slate-200 rounded-lg animate-pulse mx-auto"></div></div>
                   <div className="hidden lg:block w-1/4"><div className="h-4 w-full max-w-[96px] bg-slate-200 rounded animate-pulse mx-auto mb-1"></div><div className="h-3 w-full max-w-[64px] bg-slate-200 rounded animate-pulse mx-auto"></div></div>
                   <div className="w-full lg:w-1/4 flex lg:justify-center justify-between items-center bg-slate-50 lg:bg-transparent p-3 lg:p-0 rounded-xl border border-slate-100 lg:border-none">
                      <div className="lg:hidden h-4 w-full max-w-[64px] bg-slate-200 rounded animate-pulse"></div>
                      <div className="h-8 w-full max-w-[48px] bg-slate-200 rounded-lg animate-pulse"></div>
                   </div>
                </div>
             ))}
          </div>
        ) : filteredData.length > 0 ? (
          <>
          {/* --- Desktop View (Table) --- */}
          <div className="hidden lg:block overflow-x-auto custom-scrollbar">
            <table className="table-auto w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100"><th className="w-[32%] px-7 py-5 text-sm font-black text-slate-500 kanit-text uppercase tracking-wider whitespace-nowrap">สินค้า / เวชภัณฑ์</th><th className="w-[16%] px-7 py-5 text-sm font-black text-slate-500 kanit-text uppercase tracking-wider text-center whitespace-nowrap">สาขาที่เปิด</th><th className="w-[8%] px-7 py-5 text-sm font-black text-slate-500 kanit-text uppercase tracking-wider text-center whitespace-nowrap">ล็อต & วันหมดอายุ</th><th className="w-[16%] px-7 py-5 text-sm font-black text-slate-500 kanit-text uppercase tracking-wider text-center whitespace-nowrap">คงเหลือ</th><th className="w-[16%] px-7 py-5 text-sm font-black text-slate-500 kanit-text uppercase tracking-wider text-center whitespace-nowrap">ความปลอดภัย</th><th className="w-[140px] px-7 py-5 text-sm font-black text-slate-500 kanit-text uppercase tracking-wider text-right whitespace-nowrap">จัดการ</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredData.map((item, idx) => {
                  const prod = item.product || { name: item.name || 'สินค้า', icon: 'Package', type: 'ทั่วไป' };
                  const Icon = POS_ICONS[prod.icon] || Package;
                  const isLow = item.quantity <= item.minStock && item.quantity > 0;
                  const isOut = item.quantity <= 0;
                  
                  // Logic ตรวจสอบวันหมดอายุ (Safety Check) และนับจำนวนล็อต
                  let expiryStatus = 'normal'; // 'normal', 'warning', 'danger'
                  let expiredLots = 0;
                  let warningLots = 0;
                  
                  const checkDate = (dateStr, qty) => {
                      if (!dateStr || !dateStr.includes('/') || Number(qty) <= 0) return 'normal';
                      const parts = dateStr.split('/');
                      const expDate = new Date(parseInt(parts[2])-543, parseInt(parts[1])-1, parseInt(parts[0]));
                      const today = new Date();
                      today.setHours(0,0,0,0);
                      
                      // เปลี่ยนเป็นคำนวณหาจำนวนวันเพื่อความแม่นยำ 100%
                      const timeDiff = expDate.getTime() - today.getTime();
                      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                      
                      if (daysDiff <= 0) return 'danger';
                      if (daysDiff <= 90) return 'warning';
                      return 'normal';
                  };

                  if (item.isGrouped && item.stocks) {
                      // นับเฉพาะล็อตที่ไม่ซ้ำกัน (ป้องกันกรณีกระจายหลายสาขาแต่เป็นล็อตเดียวกัน) และมีสินค้าเหลืออยู่
                      const uniqueLots = [];
                      item.stocks.forEach(s => {
                          if (Number(s.quantity) > 0) {
                              const lotKey = s.lotNo ? `${s.lotNo}_${s.expireDate}` : s.id;
                              if (!uniqueLots.find(u => u.key === lotKey)) {
                                  uniqueLots.push({ key: lotKey, expireDate: s.expireDate, quantity: s.quantity });
                              }
                          }
                      });

                      uniqueLots.forEach(u => {
                          const status = checkDate(u.expireDate, u.quantity);
                          if (status === 'danger') expiredLots++;
                          else if (status === 'warning') warningLots++;
                      });
                      
                      if (expiredLots > 0) expiryStatus = 'danger';
                      else if (warningLots > 0) expiryStatus = 'warning';
                  } else {
                      expiryStatus = checkDate(item.expireDate, item.quantity);
                  }

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => handleOpenLogs(item)}>
                      <td className="px-7 py-5">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isOut ? 'bg-rose-50 text-rose-500' : isLow ? 'bg-amber-50 text-amber-500' : 'bg-sky-50 text-sky-500'}`}>
                            <Icon size={24} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 kanit-text text-base truncate leading-tight">{prod.name}</p>
                            <p className="text-xs text-slate-400 font-data tracking-tight mt-1.5 whitespace-nowrap">{item.productId} | {prod.type || 'ทั่วไป'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-7 py-5 text-center">
                        {item.isGrouped ? (
                            <div className="flex flex-col items-center gap-1.5">
                                <div className="flex flex-wrap justify-center gap-1.5">
                                    {Array.from(new Set(item.stocks.map(s => s.branchId))).map(bId => {
                                        const bName = branches.find(b => b.id === bId)?.name || bId;
                                        return (
                                            <span key={bId} className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase border border-indigo-100 whitespace-nowrap">
                                                {bName}
                                            </span>
                                        );
                                    })}
                                </div>
                                <p className="text-[10px] text-slate-400 kanit-text whitespace-nowrap">รวมจาก {item.stocks.length} ล็อต</p>
                            </div>
                        ) : (
                            <span className="inline-block px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold kanit-text uppercase whitespace-nowrap">
                                {branches.find(b => b.id === item.branchId)?.name || item.branchId}
                            </span>
                        )}
                      </td>
                      <td className="px-7 py-5 text-center">
                        {item.isGrouped ? (
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleOpenLotModal(item); }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-xs font-bold kanit-text transition-colors border border-indigo-100 shadow-sm whitespace-nowrap"
                            >
                                <Package size={14} /> ดูข้อมูลล็อต ({item.stocks.length})
                            </button>
                        ) : item.expireDate || item.lotNo ? (
                            <div className="flex flex-col items-center gap-1">
                                <span className={`text-sm font-bold font-data whitespace-nowrap ${expiryStatus === 'danger' ? 'text-rose-600' : expiryStatus === 'warning' ? 'text-amber-600' : 'text-slate-600'}`}>
                                    EXP: {item.expireDate || '-'}
                                </span>
                                <span className="text-xs text-slate-400 font-data tracking-tighter uppercase whitespace-nowrap">LOT: {item.lotNo || '-'}</span>
                            </div>
                        ) : <span className="text-slate-300 text-sm whitespace-nowrap">-</span>}
                      </td>
                      <td className="px-7 py-5 text-center">
                        <p className={`font-bold text-xl font-data whitespace-nowrap ${isOut ? 'text-rose-500' : isLow ? 'text-amber-500' : 'text-slate-700'}`}>
                          {item.quantity}
                        </p>
                        <p className="text-xs text-slate-400 kanit-text mt-0.5 font-medium whitespace-nowrap">ขั้นต่ำ: {item.minStock}</p>
                      </td>
                      <td className="px-7 py-5 text-center">
                        {expiryStatus === 'danger' ? (
                            <div className="inline-flex items-center gap-1.5 text-xs font-black text-white bg-rose-500 px-3 py-1.5 rounded-xl animate-pulse shadow-md shadow-rose-500/30 whitespace-nowrap">
                                <AlertOctagon size={14} /> {item.isGrouped && expiredLots > 0 ? `หมดอายุ (${expiredLots} ล็อต)` : 'หมดอายุ/ห้ามจ่าย'}
                            </div>
                        ) : expiryStatus === 'warning' ? (
                            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200 whitespace-nowrap">
                                <Clock size={14} /> {item.isGrouped && warningLots > 0 ? `ใกล้หมดอายุ (${warningLots} ล็อต)` : 'ใกล้หมดอายุ'}
                            </div>
                        ) : isOut ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-500 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100 whitespace-nowrap">
                            <X size={14} /> สินค้าหมด
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-500 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 whitespace-nowrap">
                            <AlertTriangle size={14} /> สต็อกต่ำ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 whitespace-nowrap">
                            <CheckCircle2 size={14} /> ปลอดภัย
                          </span>
                        )}
                      </td>
                      <td className="px-7 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity no-drag-zone">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleOpenLogs(item); }}
                            className="p-2.5 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-colors border border-transparent hover:border-indigo-100"
                            title="ดูประวัติ"
                          >
                            <History size={20} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleOpenAdjust(item); }}
                            className="p-2.5 text-sky-500 hover:bg-sky-50 rounded-xl transition-colors border border-transparent hover:border-sky-100"
                            title="ปรับสต็อก"
                          >
                            <ArrowUpDown size={20} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleOpenEdit(item); }}
                            className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors border border-transparent hover:border-slate-200"
                            title="แก้ไข"
                          >
                            <Pencil size={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* --- Mobile View (Cards) --- */}
          <div className="lg:hidden flex flex-col gap-3 p-3 bg-slate-50/50">
             {filteredData.map((item, idx) => {
                  const prod = item.product || { name: item.name || 'สินค้า', icon: 'Package', type: 'ทั่วไป' };
                  const Icon = POS_ICONS[prod.icon] || Package;
                  const isLow = item.quantity <= item.minStock && item.quantity > 0;
                  const isOut = item.quantity <= 0;
                  
                  let expiryStatus = 'normal';
                  let expiredLots = 0;
                  let warningLots = 0;
                  
                  const checkDate = (dateStr, qty) => {
                      if (!dateStr || !dateStr.includes('/') || Number(qty) <= 0) return 'normal';
                      const parts = dateStr.split('/');
                      const expDate = new Date(parseInt(parts[2])-543, parseInt(parts[1])-1, parseInt(parts[0]));
                      const today = new Date();
                      today.setHours(0,0,0,0);
                      
                      const timeDiff = expDate.getTime() - today.getTime();
                      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                      
                      if (daysDiff <= 0) return 'danger';
                      if (daysDiff <= 90) return 'warning';
                      return 'normal';
                  };

                  if (item.isGrouped && item.stocks) {
                      const uniqueLots = [];
                      item.stocks.forEach(s => {
                          if (Number(s.quantity) > 0) {
                              const lotKey = s.lotNo ? `${s.lotNo}_${s.expireDate}` : s.id;
                              if (!uniqueLots.find(u => u.key === lotKey)) {
                                  uniqueLots.push({ key: lotKey, expireDate: s.expireDate, quantity: s.quantity });
                              }
                          }
                      });

                      uniqueLots.forEach(u => {
                          const status = checkDate(u.expireDate, u.quantity);
                          if (status === 'danger') expiredLots++;
                          else if (status === 'warning') warningLots++;
                      });
                      
                      if (expiredLots > 0) expiryStatus = 'danger';
                      else if (warningLots > 0) expiryStatus = 'warning';
                  } else {
                      expiryStatus = checkDate(item.expireDate, item.quantity);
                  }

                  return (
                     <div key={item.id} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3 space-row-animation active:scale-[0.98] transition-transform cursor-pointer" style={{ animationDelay: `${(idx % 25) * 30}ms` }} onClick={() => handleOpenLogs(item)}>
                        
                        <div className="flex justify-between items-start gap-2 mb-1">
                           <div className="flex items-start gap-3 min-w-0 flex-1">
                             <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${isOut ? 'bg-rose-50 text-rose-500' : isLow ? 'bg-amber-50 text-amber-500' : 'bg-sky-50 text-sky-500'}`}>
                               <Icon size={24} />
                             </div>
                             <div className="min-w-0 flex-1">
                               <p className="font-bold text-slate-800 kanit-text text-sm sm:text-base line-clamp-2 leading-tight pr-1">{prod.name}</p>
                               <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                   <p className="text-[10px] sm:text-xs text-slate-400 font-data tracking-tight whitespace-nowrap truncate max-w-[80px] sm:max-w-[100px]">{item.productId}</p>
                                   <div className="w-1 h-1 rounded-full bg-slate-300 shrink-0"></div>
                                   <p className="text-[10px] sm:text-xs text-slate-400 font-data tracking-tight whitespace-nowrap truncate max-w-[100px]">{prod.type || 'ทั่วไป'}</p>
                               </div>
                             </div>
                           </div>
                           <div className="shrink-0 flex flex-col items-end gap-1.5 pl-1">
                               {expiryStatus === 'danger' ? (
                                    <span className="text-[9px] sm:text-[10px] font-black text-white bg-rose-500 px-2 py-1 rounded-md flex items-center gap-1 shadow-sm whitespace-nowrap">
                                        <AlertOctagon size={12} className="shrink-0" /> {item.isGrouped && expiredLots > 0 ? `หมดอายุ (${expiredLots})` : 'หมดอายุ'}
                                    </span>
                                ) : expiryStatus === 'warning' ? (
                                    <span className="text-[9px] sm:text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-md flex items-center gap-1 border border-amber-200 whitespace-nowrap">
                                        <Clock size={12} className="shrink-0" /> {item.isGrouped && warningLots > 0 ? `ใกล้หมดอายุ (${warningLots})` : 'ใกล้หมดอายุ'}
                                    </span>
                                ) : isOut ? (
                                    <span className="text-[9px] sm:text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-md flex items-center gap-1 border border-rose-100 whitespace-nowrap">
                                        <X size={12} className="shrink-0" /> สินค้าหมด
                                    </span>
                                ) : isLow ? (
                                    <span className="text-[9px] sm:text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded-md flex items-center gap-1 border border-amber-100 whitespace-nowrap">
                                        <AlertTriangle size={12} className="shrink-0" /> สต็อกต่ำ
                                    </span>
                                ) : (
                                    <span className="text-[9px] sm:text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-md flex items-center gap-1 border border-emerald-100 whitespace-nowrap">
                                        <CheckCircle2 size={12} className="shrink-0" /> ปกติ
                                    </span>
                                )}
                           </div>
                        </div>

                        <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-100 flex flex-col gap-2">
                           <div className="flex items-center justify-between">
                              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider kanit-text">สาขา</span>
                              <div className="text-right">
                                {item.isGrouped ? (
                                    <div className="flex flex-wrap justify-end gap-1">
                                        {Array.from(new Set(item.stocks.map(s => s.branchId))).map(bId => {
                                            const bName = branches.find(b => b.id === bId)?.name || bId;
                                            return (
                                                <span key={bId} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[9px] sm:text-[10px] font-black uppercase border border-indigo-100 whitespace-nowrap">
                                                    {bName}
                                                </span>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <span className="px-2 py-0.5 bg-white text-slate-600 rounded-md text-[9px] sm:text-[10px] font-bold kanit-text uppercase border border-slate-200 shadow-sm whitespace-nowrap">
                                        {branches.find(b => b.id === item.branchId)?.name || item.branchId}
                                    </span>
                                )}
                              </div>
                           </div>
                           
                           {item.isGrouped ? (
                               <div className="flex items-center justify-between mt-1">
                                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider kanit-text">จัดการล็อต</span>
                                  <button onClick={(e) => { e.stopPropagation(); handleOpenLotModal(item); }} className="text-[10px] sm:text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md border border-indigo-100 flex items-center gap-1 transition-colors">
                                      <Package size={12} /> ข้อมูลล็อต ({item.stocks.length})
                                  </button>
                               </div>
                           ) : (
                               <div className="flex items-center justify-between mt-1">
                                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider kanit-text">ล็อต / หมดอายุ</span>
                                  <div className="flex items-center gap-2">
                                      <span className="text-[10px] sm:text-xs text-slate-500 font-data">LOT: {item.lotNo || '-'}</span>
                                      <span className={`text-[10px] sm:text-xs font-bold font-data ${expiryStatus === 'danger' ? 'text-rose-600' : expiryStatus === 'warning' ? 'text-amber-600' : 'text-slate-600'}`}>EXP: {item.expireDate || '-'}</span>
                                  </div>
                               </div>
                           )}

                           <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-200">
                               <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider kanit-text">คงเหลือ / ขั้นต่ำ</span>
                               <div className="flex items-baseline gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
                                   <span className={`text-lg sm:text-xl font-black font-data leading-none ${isOut ? 'text-rose-500' : isLow ? 'text-amber-500' : 'text-sky-600'}`}>
                                      {item.quantity}
                                   </span>
                                   <span className="text-[10px] sm:text-xs text-slate-400 font-medium">/ {item.minStock}</span>
                               </div>
                           </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-1">
                            <button onClick={(e) => { e.stopPropagation(); handleOpenLogs(item); }} className="flex items-center justify-center gap-1.5 py-2.5 sm:py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-[11px] sm:text-xs font-bold kanit-text border border-indigo-100 transition-colors">
                                <History size={16} /> ประวัติ
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleOpenAdjust(item); }} className="flex items-center justify-center gap-1.5 py-2.5 sm:py-3 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-xl text-[11px] sm:text-xs font-bold kanit-text border border-sky-100 transition-colors">
                                <ArrowUpDown size={16} /> ปรับสต็อก
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(item); }} className="flex items-center justify-center gap-1.5 py-2.5 sm:py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-[11px] sm:text-xs font-bold kanit-text border border-slate-200 transition-colors">
                                <Pencil size={16} /> แก้ไข
                            </button>
                        </div>
                     </div>
                  );
             })}
          </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-2">
              <Package size={32} className="opacity-20" />
            </div>
            <p className="kanit-text text-sm italic">ไม่พบข้อมูลสต็อกที่ต้องการ</p>
            </div>
            )}
            </div>
            </div>

            {/* Add/Edit Modal */}
      {isModalOpen && createPortal(
        <div className={`fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm ${isModalClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className="absolute inset-0" onClick={closeModal}></div>
          <div className={`bg-white rounded-3xl w-full max-w-lg max-h-[92dvh] shadow-2xl flex flex-col transform border border-slate-100 relative overflow-hidden ${isModalClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner shrink-0 ${
                  formData.itemSource === 'internal' ? 'bg-indigo-100 text-indigo-600' : 'bg-sky-100 text-sky-600'
                }`}>
                  {formData.itemSource === 'internal' ? <Stethoscope size={20} /> : <Package size={20} />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 kanit-text leading-tight">
                    {editingItem ? (formData.itemSource === 'internal' ? 'แก้ไขอุปกรณ์ / เวชภัณฑ์' : 'แก้ไขสต็อกสินค้า') : 'เพิ่มรายการสต็อกใหม่'}
                  </h3>
                  <p className="text-xs text-slate-500 kanit-text">จัดการข้อมูลพื้นฐาน จำนวนสต็อก และสาขาที่จัดเก็บ</p>
                </div>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-2"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSaveItem} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
              
              {/* ประเภทรายการ (Segmented Toggle) - แสดงเฉพาะตอนเพิ่มใหม่ */}
              {!editingItem && (
                <div className="flex bg-slate-100/90 p-1.5 rounded-2xl gap-1 border border-slate-200/50">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ 
                      ...prev, 
                      itemSource: 'internal',
                      productId: prev.productId && !prev.productId.startsWith('PROD') ? prev.productId : `EQP-${Date.now().toString().slice(-4)}`
                    }))}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold kanit-text transition-all flex items-center justify-center gap-1.5 ${
                      formData.itemSource === 'internal' 
                        ? 'bg-white text-indigo-700 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Stethoscope size={14} /> อุปกรณ์ / เวชภัณฑ์ภายใน
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, itemSource: 'pos' }))}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold kanit-text transition-all flex items-center justify-center gap-1.5 ${
                      formData.itemSource === 'pos' 
                        ? 'bg-white text-sky-700 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Tag size={14} /> สินค้าจาก POS
                  </button>
                </div>
              )}

              {/* กรณี 1: สินค้าจาก POS Catalog */}
              {formData.itemSource === 'pos' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 kanit-text uppercase">
                    สินค้า / บริการ จาก POS <span className="text-rose-500">*</span>
                  </label>
                  <CustomSelect 
                    placeholder="เลือกสินค้าจาก POS"
                    value={formData.productId}
                    onChange={val => {
                      const selected = posProducts.find(p => p.id === val);
                      setFormData(prev => ({
                        ...prev, 
                        productId: val,
                        name: selected?.name || prev.name,
                        category: selected?.category || selected?.type || prev.category,
                        unit: selected?.unit || prev.unit,
                        minStock: selected?.minStock ?? prev.minStock,
                        costPrice: selected?.costPrice ?? prev.costPrice
                      }));
                    }}
                    options={posProducts.map(p => ({ value: p.id, label: `${p.name} (${p.id})` }))}
                    className="w-full"
                  />
                  {formData.productId && (
                    <div className="mt-2.5 p-3 bg-sky-50/70 rounded-2xl border border-sky-100 text-xs text-sky-800 flex items-center justify-between kanit-text">
                      <span>หมวด: <strong className="font-semibold">{formData.category || 'ทั่วไป'}</strong> | หน่วย: <strong className="font-semibold">{formData.unit || 'ชิ้น'}</strong></span>
                      <span className="font-data font-bold bg-white px-2 py-0.5 rounded-lg border border-sky-200">รหัส: {formData.productId}</span>
                    </div>
                  )}
                </div>
              ) : (
                /* กรณี 2: อุปกรณ์ / เครื่องใช้สำนักงาน / เวชภัณฑ์ภายในคลินิก */
                <div className="space-y-4">
                  {/* ชื่ออุปกรณ์ / รายการ */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1 kanit-text uppercase">
                      ชื่ออุปกรณ์ / เครื่องใช้ / เวชภัณฑ์ <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="เช่น ถุงมือแพทย์ Size M, กระดาษ A4 80g, เข็มฉีดยา 24G..."
                      className={`${theme.input} !py-2.5 text-sm font-medium`}
                    />
                  </div>

                  {/* หมวดหมู่อุปกรณ์ */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1 kanit-text uppercase">
                      หมวดหมู่อุปกรณ์ / การใช้งาน
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                      {[
                        { label: 'อุปกรณ์ทางการแพทย์', icon: Stethoscope },
                        { label: 'เวชภัณฑ์และวัสดุสิ้นเปลือง', icon: Pill },
                        { label: 'เครื่องใช้สำนักงาน', icon: FileText },
                        { label: 'ของใช้ทั่วไป / แม่บ้าน', icon: Package }
                      ].map(cat => (
                        <button
                          key={cat.label}
                          type="button"
                          onClick={() => setFormData({ ...formData, category: cat.label })}
                          className={`px-2.5 py-2 rounded-xl text-xs font-semibold kanit-text flex items-center gap-1.5 border transition-all text-left truncate ${
                            formData.category === cat.label
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold shadow-xs'
                              : 'bg-slate-50/50 text-slate-600 border-slate-200/70 hover:bg-slate-100'
                          }`}
                        >
                          <cat.icon size={13} className="shrink-0 text-indigo-500" />
                          <span className="truncate">{cat.label}</span>
                        </button>
                      ))}
                    </div>
                    <input 
                      type="text"
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      placeholder="หรือระบุหมวดหมู่อื่นๆ..."
                      className={`${theme.input} !py-2 text-xs`}
                    />
                  </div>

                  {/* รหัสรายการ & หน่วยนับ */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1 kanit-text uppercase">
                        รหัสรายการ <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        type="text"
                        required
                        value={formData.productId}
                        onChange={e => setFormData({ ...formData, productId: e.target.value })}
                        placeholder="เช่น EQP-001..."
                        className={`${theme.input} !py-2.5 font-data text-sm uppercase`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1 kanit-text uppercase">
                        หน่วยนับ
                      </label>
                      <input 
                        type="text"
                        value={formData.unit}
                        onChange={e => setFormData({ ...formData, unit: e.target.value })}
                        placeholder="ชิ้น / กล่อง / รีม / ชุด..."
                        className={`${theme.input} !py-2.5 text-sm`}
                      />
                    </div>
                  </div>

                  {/* จุดเตือนสต็อก & ราคาต้นทุน */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1 kanit-text uppercase">
                        เตือนเมื่อสต็อกต่ำ (Min Stock)
                      </label>
                      <input 
                        type="number"
                        min="0"
                        value={formData.minStock}
                        onChange={e => setFormData({ ...formData, minStock: e.target.value })}
                        className={`${theme.input} !py-2.5 font-data text-center text-sm`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1 kanit-text uppercase">
                        ราคาต้นทุน (บาท) <span className="text-slate-400 text-[10px] font-normal">(ไม่บังคับ)</span>
                      </label>
                      <input 
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.costPrice}
                        onChange={e => setFormData({ ...formData, costPrice: e.target.value })}
                        placeholder="0.00"
                        className={`${theme.input} !py-2.5 font-data text-center text-sm`}
                      />
                    </div>
                  </div>

                  {/* ข้อมูลล็อตและวันหมดอายุ (ถ้ามี) */}
                  <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 kanit-text flex items-center gap-1.5">
                        <Clock size={14} className="text-indigo-500" /> ข้อมูลล็อตและวันหมดอายุ (ถ้ามี)
                      </span>
                      <span className="text-[11px] text-slate-400 kanit-text">สำหรับเวชภัณฑ์ / วัสดุสิ้นเปลือง</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 ml-1 kanit-text uppercase">เลขที่ล็อต (Lot No.)</label>
                        <input 
                          type="text"
                          value={formData.lotNo}
                          onChange={e => setFormData({ ...formData, lotNo: e.target.value })}
                          placeholder="เช่น LOT-01..."
                          className={`${theme.input} !py-2 font-data text-xs uppercase`}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 ml-1 kanit-text uppercase">วันหมดอายุ</label>
                        <div className="relative group">
                          <input 
                            type="text"
                            value={formData.expireDate}
                            onChange={e => setFormData({ ...formData, expireDate: e.target.value })}
                            placeholder="วว/ดด/ปปปป"
                            className={`${theme.input} !py-2 pr-8 font-data text-xs`}
                          />
                          <button 
                            type="button" 
                            onClick={handleOpenCalendar} 
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-sky-500 transition-colors"
                          >
                            <CalendarIcon size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ส่วนการจัดการสาขาแบบ Array (เหมือนเพิ่มเบอร์โทร) */}
              <div className="space-y-3 pt-1">
                <label className="block text-xs font-bold text-slate-500 ml-1 kanit-text uppercase">ข้อมูลสต็อกรายสาขา <span className="text-rose-500">*</span></label>
                <div className="space-y-2.5">
                  {formData.branchAssignments.map((assignment, idx) => (
                    <div key={idx} className="flex gap-2 items-start bg-slate-50/50 p-2 rounded-2xl border border-slate-100">
                      <div className="flex-1">
                        <CustomSelect 
                          value={assignment.branchId}
                          onChange={val => updateBranchAssignment(idx, 'branchId', val)}
                          options={branches.map(b => ({ value: b.id, label: b.name }))}
                          className="w-full"
                          compact
                        />
                      </div>
                      <div className="w-[110px]">
                        <input 
                          required type="number" min="0" 
                          className={`${theme.input} !py-2.5 font-data text-center text-sm`}
                          value={assignment.quantity}
                          onChange={e => updateBranchAssignment(idx, 'quantity', e.target.value)}
                          placeholder="จำนวน"
                        />
                      </div>
                      {formData.branchAssignments.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removeBranchAssignment(idx)}
                          className="p-2.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button 
                  type="button" 
                  onClick={addBranchAssignment}
                  className="text-xs font-bold text-sky-500 hover:text-sky-600 flex items-center gap-1.5 mt-2 bg-sky-50 hover:bg-sky-100 px-4 py-2 rounded-xl transition-colors kanit-text border border-sky-100/50"
                >
                  <Plus size={14} /> เพิ่มสาขาอื่น
                </button>
              </div>
            </form>

            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex items-center gap-3 shrink-0">
                {editingItem && (
                  <button 
                    type="button" 
                    onClick={() => handleDeleteItem(editingItem)}
                    disabled={isProcessing}
                    className="p-3 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl font-bold kanit-text transition-colors border border-rose-200/70 shrink-0"
                    title="ลบรายการนี้ออกจากคลัง"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button type="button" onClick={closeModal} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold kanit-text hover:bg-slate-50 transition-colors">ยกเลิก</button>
                <button type="button" onClick={handleSaveItem} disabled={isProcessing} className="flex-[2] py-3 bg-sky-500 text-white rounded-xl font-bold shadow-md shadow-sky-500/30 kanit-text hover:bg-sky-600 transition-colors flex items-center justify-center gap-2">
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 size={18} />} {editingItem ? 'บันทึกข้อมูล' : 'ยืนยันเพิ่มรายการ'}
                </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- Custom Calendar Portal for Inventory --- */}
      {showCalendar && createPortal(
        <div className={`fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/30 sm:bg-slate-900/10 backdrop-blur-sm ${isCalendarClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className="absolute inset-0" onClick={closeCalendar}></div>
          <div 
            ref={invCalSwipeProps.ref} 
            style={invCalSwipeProps.style}
            className={`relative z-[165] w-full max-w-[340px] sm:max-w-[320px] bg-white sm:rounded-[1.5rem] border border-slate-100 p-5 sm:p-5 mobile-bottom-sheet shadow-2xl ${isCalendarClosing ? 'closing modal-animate-out' : 'modal-animate-in'}`}
          >
            <div className="w-full pt-1 pb-4 -mt-2 sm:hidden flex justify-center items-start touch-none">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>
            
            {calView === 'days' && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <button type="button" onClick={handlePrevMonth} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronLeft size={20} /></button>
                  <button type="button" onClick={() => setCalView('months')} className="font-bold text-slate-800 hover:text-sky-500 px-3 py-1.5 sm:py-1 rounded-xl hover:bg-slate-50 transition-colors text-base sm:text-sm kanit-text">{thaiMonths[calDate.getMonth()]} {calDate.getFullYear() + 543}</button>
                  <button type="button" onClick={handleNextMonth} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronRight size={20} /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-3">
                  {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d, i) => (<div key={d} className={`text-[11px] sm:text-xs font-semibold tracking-wide py-1 kanit-text ${i === 0 ? 'text-rose-500' : 'text-slate-500'}`}>{d}</div>))}
                </div>
                <div className="grid grid-cols-7 gap-y-2 sm:gap-y-1 text-center">
                  {Array.from({ length: new Date(calDate.getFullYear(), calDate.getMonth(), 1).getDay() }, (_, i) => i).map(b => <div key={`blank-${b}`} className="w-10 h-10 sm:w-8 h-8"></div>)}
                  {Array.from({ length: new Date(calDate.getFullYear(), calDate.getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map(day => {
                    const dateStr = `${String(day).padStart(2, '0')}/${String(calDate.getMonth() + 1).padStart(2, '0')}/${calDate.getFullYear() + 543}`;
                    
                    let isSelected = false;
                    if (calendarTarget === 'adjust_expire') isSelected = adjustData.expireDate === dateStr;
                    else if (calendarTarget === 'adjust_receive') isSelected = adjustData.receiveDate === dateStr;
                    else isSelected = formData.expireDate === dateStr;

                    const isToday = new Date().getDate() === day && new Date().getMonth() === calDate.getMonth() && new Date().getFullYear() === calDate.getFullYear();
                    return (<button key={day} type="button" onClick={() => handleDaySelect(day)} className={`w-10 h-10 sm:w-8 sm:h-8 mx-auto rounded-full flex items-center justify-center text-sm sm:text-xs font-medium transition-all font-data ${isSelected ? 'bg-sky-500 text-white shadow-md shadow-sky-500/40 transform scale-110' : isToday ? 'bg-sky-50 text-sky-600 font-bold border border-sky-200' : 'text-slate-700 hover:bg-slate-100'}`}>{day}</button>)
                  })}
                </div>
              </>
            )}

            {calView === 'months' && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <button type="button" onClick={() => setCalDate(new Date(calDate.getFullYear() - 1, calDate.getMonth(), 1))} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronLeft size={20} /></button>
                  <button type="button" onClick={() => setCalView('years')} className="font-bold text-slate-800 hover:text-sky-500 px-3 py-1.5 sm:py-1 rounded-xl hover:bg-slate-50 transition-colors text-base sm:text-sm font-data">{calDate.getFullYear() + 543}</button>
                  <button type="button" onClick={() => setCalDate(new Date(calDate.getFullYear() + 1, calDate.getMonth(), 1))} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronRight size={20} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'].map((m, i) => (
                    <button key={m} type="button" onClick={() => {setCalDate(new Date(calDate.getFullYear(), i, 1)); setCalView('days');}} className={`py-4 sm:py-3 rounded-2xl text-sm font-medium transition-all kanit-text ${calDate.getMonth() === i ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30' : 'text-slate-700 hover:bg-slate-50'}`}>{m}</button>
                  ))}
                </div>
              </>
            )}

            {calView === 'years' && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <button type="button" onClick={() => setYearPageStart(y => y - 12)} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronLeft size={20} /></button>
                  <span className="font-bold text-slate-800 px-3 py-1.5 text-base sm:text-sm font-data">{yearPageStart} - {yearPageStart + 11}</span>
                  <button type="button" onClick={() => setYearPageStart(y => y + 12)} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronRight size={20} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({length: 12}, (_, i) => yearPageStart + i).map(y => (
                    <button key={y} type="button" onClick={() => {setCalDate(new Date(y - 543, calDate.getMonth(), 1)); setCalView('months');}} className={`py-4 sm:py-3 rounded-2xl text-sm font-medium transition-all font-data ${(calDate.getFullYear() + 543) === y ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30' : 'text-slate-700 hover:bg-slate-50'}`}>{y}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Adjustment Modal */}
      {isAdjustModalOpen && createPortal(
        <div className={`fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm ${isAdjustClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className="absolute inset-0" onClick={closeAdjustModal}></div>
          <div className={`bg-white rounded-[2rem] w-full max-w-2xl max-h-[90dvh] shadow-2xl flex flex-col transform border border-slate-100 relative overflow-hidden ${isAdjustClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-sky-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
                  <ArrowUpDown size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 kanit-text leading-tight">ปรับปรุงสต็อกสินค้า</h3>
                  <p className="text-sm text-slate-500 kanit-text mt-0.5">{adjustItem?.product?.name || adjustItem?.name || 'รายการสต็อก'} <span className="mx-2 text-slate-300">|</span> <span className="font-data">{adjustItem?.productId}</span></p>
                </div>
              </div>
              <button onClick={closeAdjustModal} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-xl transition-colors"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSaveAdjustment} className="flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                <div className="grid grid-cols-1 md:grid-cols-2">
                  {/* Left Column: ข้อมูลพื้นฐานและล็อต */}
                  <div className="p-6 border-b md:border-b-0 md:border-r border-slate-100 space-y-6">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-sky-500 rounded-full"></div>
                      <h4 className="text-xs font-black text-slate-800 kanit-text uppercase tracking-widest">ข้อมูลสาขาและคลัง</h4>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-slate-400 ml-1 kanit-text uppercase tracking-wider">ทำรายการที่สาขา</label>
                        <CustomSelect 
                          value={adjustData.branchId}
                          onChange={val => {
                            const targetPId = adjustItem?.productId || adjustItem?.product?.id || adjustItem?.code || adjustItem?.id;
                            const branchStocks = inventoryData.filter(i => isStockForProduct(i, targetPId) && (i.branchId || i.branch_id) === val);
                            const firstStock = branchStocks[0];
                            setAdjustData({
                                ...adjustData, 
                                branchId: val,
                                lotNo: firstStock?.lotNo || firstStock?.lot_no || '',
                                expireDate: firstStock?.expireDate || firstStock?.expire_date || '',
                                receiveDate: firstStock?.receiveDate || firstStock?.receive_date || new Date().toISOString().split('T')[0]
                            });
                          }}
                          options={branches.map(b => ({ value: b.id, label: b.name }))}
                          className="w-full"
                          compact
                          fullWidth
                        />
                      </div>
                      
                      <div className="bg-sky-50/50 p-4 rounded-2xl border border-sky-100/50 flex flex-col items-center justify-center">
                        <span className="text-[10px] font-bold text-sky-600 kanit-text uppercase mb-1">คงเหลือล็อตที่เลือก</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-sky-700 font-data">
                            {(() => {
                              const targetPId = adjustItem?.productId || adjustItem?.product?.id || adjustItem?.code || adjustItem?.id;
                              const matchedStock = inventoryData.find(i => 
                                isStockForProduct(i, targetPId) && 
                                (i.branchId || i.branch_id) === adjustData.branchId &&
                                (String(i.lotNo || i.lot_no || '').trim() === String(adjustData.lotNo || '').trim())
                              );
                              return matchedStock ? Number(matchedStock.quantity ?? matchedStock.stockQuantity ?? matchedStock.stock_quantity ?? 0) : 0;
                            })()}
                          </span>
                          <span className="text-sm font-bold text-sky-600 kanit-text">รายการ</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-amber-500 rounded-full"></div>
                        <h4 className="text-xs font-black text-slate-800 kanit-text uppercase tracking-widest">การจัดการล็อต</h4>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-slate-400 ml-1 kanit-text uppercase tracking-wider">เลือกล็อตเดิมที่มี</label>
                          <CustomSelect 
                            placeholder="เลือกจากล็อตเดิมที่มี..."
                            value={adjustData.lotNo === 'N/A' ? '' : adjustData.lotNo}
                            compact
                            fullWidth
                            onChange={val => {
                                const targetPId = adjustItem?.productId || adjustItem?.product?.id || adjustItem?.code || adjustItem?.id;
                                const stock = inventoryData.find(i => isStockForProduct(i, targetPId) && (i.branchId || i.branch_id) === adjustData.branchId && (i.lotNo === val || i.lot_no === val));
                                setAdjustData({ 
                                    ...adjustData, 
                                    lotNo: val, 
                                    expireDate: stock?.expireDate || stock?.expire_date || '',
                                    receiveDate: stock?.receiveDate || stock?.receive_date || adjustData.receiveDate
                                });
                            }}
                            options={(() => {
                                const targetPId = adjustItem?.productId || adjustItem?.product?.id || adjustItem?.code || adjustItem?.id;
                                const matchedList = inventoryData.filter(i => {
                                  if (!isStockForProduct(i, targetPId)) return false;
                                  if (adjustData.branchId && (i.branchId || i.branch_id) !== adjustData.branchId) return false;
                                  const lotVal = String(i.lotNo || i.lot_no || '').trim();
                                  return lotVal !== '' && lotVal !== 'N/A';
                                });

                                const lotMap = new Map();
                                matchedList.forEach(i => {
                                  const lotVal = String(i.lotNo || i.lot_no || '').trim();
                                  const qty = Number(i.quantity ?? i.stockQuantity ?? i.stock_quantity ?? 0);
                                  if (!lotMap.has(lotVal)) {
                                    lotMap.set(lotVal, qty);
                                  } else {
                                    lotMap.set(lotVal, lotMap.get(lotVal) + qty);
                                  }
                                });

                                return Array.from(lotMap.entries()).map(([lotVal, qty]) => ({
                                  value: lotVal,
                                  label: `ล็อต: ${lotVal} (คงเหลือ ${qty})`
                                }));
                            })()}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-slate-400 ml-1 kanit-text uppercase tracking-wider">ระบุล็อตใหม่</label>
                          <input 
                            type="text" className={`${theme.input} !py-3 font-data uppercase text-sm`} 
                            value={adjustData.lotNo === 'N/A' ? '' : adjustData.lotNo} 
                            onChange={e => {
                                const newLot = e.target.value.toUpperCase();
                                const targetPId = adjustItem?.productId || adjustItem?.product?.id || adjustItem?.code || adjustItem?.id;
                                const stock = inventoryData.find(i => isStockForProduct(i, targetPId) && (i.branchId || i.branch_id) === adjustData.branchId && (i.lotNo === newLot || i.lot_no === newLot));
                                setAdjustData({
                                    ...adjustData, 
                                    lotNo: newLot, 
                                    expireDate: stock?.expireDate || stock?.expire_date || adjustData.expireDate,
                                    receiveDate: stock?.receiveDate || stock?.receive_date || adjustData.receiveDate
                                });
                            }} 
                            placeholder="พิมพ์ชื่อล็อตใหม่ (เช่น LOT-2026A)..." 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: วันที่และจำนวน */}
                  <div className="p-6 bg-slate-50/30 space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                        <h4 className="text-xs font-black text-slate-800 kanit-text uppercase tracking-widest">วันที่สำคัญ</h4>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-slate-400 ml-1 kanit-text uppercase">วันที่รับเข้าสินค้า</label>
                          <div className="relative group">
                            <input 
                              type="text" className={`${theme.input} !py-3 pr-10 font-data text-sm group-hover:border-sky-300 transition-colors`} 
                              value={adjustData.receiveDate} 
                              onChange={e => setAdjustData({...adjustData, receiveDate: e.target.value})} 
                              placeholder="วว/ดด/ปปปป" 
                            />
                            <button type="button" onClick={() => handleOpenCalendarForAdjust('receiveDate')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-sky-500 transition-colors">
                              <CalendarIcon size={18} />
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-slate-400 ml-1 kanit-text uppercase">วันหมดอายุของล็อต</label>
                          <div className="relative group">
                            <input 
                              type="text" className={`${theme.input} !py-3 pr-10 font-data text-sm group-hover:border-amber-300 transition-colors`} 
                              value={adjustData.expireDate} 
                              onChange={e => setAdjustData({...adjustData, expireDate: e.target.value})} 
                              placeholder="วว/ดด/ปปปป" 
                            />
                            <button type="button" onClick={() => handleOpenCalendarForAdjust('expireDate')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors">
                              <CalendarIcon size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
                        <h4 className="text-xs font-black text-slate-800 kanit-text uppercase tracking-widest">การปรับปรุงจำนวน</h4>
                      </div>

                      <div className="space-y-4">
                        <div className="flex bg-slate-200/50 p-1.5 rounded-2xl gap-1.5">
                          <button 
                            type="button" 
                            onClick={() => setAdjustData({...adjustData, type: 'add'})}
                            className={`flex-1 py-3 rounded-xl text-xs font-black kanit-text transition-all flex items-center justify-center gap-2 ${adjustData.type === 'add' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:bg-white'}`}
                          >
                            <Plus size={18} /> รับเข้า
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setAdjustData({...adjustData, type: 'sub'})}
                            className={`flex-1 py-3 rounded-xl text-xs font-black kanit-text transition-all flex items-center justify-center gap-2 ${adjustData.type === 'sub' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-slate-500 hover:bg-white'}`}
                          >
                            <Minus size={18} /> จ่ายออก
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-slate-400 ml-1 kanit-text uppercase">จำนวน <span className="text-rose-500">*</span></label>
                            <div className="relative flex items-center">
                              <button 
                                type="button"
                                onClick={() => setAdjustData({...adjustData, amount: Math.max(1, (parseInt(adjustData.amount) || 1) - 1)})}
                                className="absolute left-2 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors active:scale-95 z-10"
                              >
                                <Minus size={18} strokeWidth={3} />
                              </button>
                              <input 
                                required type="number" min="1" 
                                className={`${theme.input} !py-3.5 px-14 font-data text-2xl font-black text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${adjustData.type === 'add' ? 'text-emerald-600 border-emerald-100 focus:border-emerald-500' : 'text-rose-600 border-rose-100 focus:border-rose-500'}`}
                                value={adjustData.amount}
                                onChange={e => {
                                  const val = e.target.value;
                                  if (val === '' || parseInt(val) >= 1) {
                                    setAdjustData({...adjustData, amount: val});
                                  }
                                }}
                              />
                              <button 
                                type="button"
                                onClick={() => setAdjustData({...adjustData, amount: (parseInt(adjustData.amount) || 0) + 1})}
                                className="absolute right-2 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors active:scale-95 z-10"
                              >
                                <Plus size={18} strokeWidth={3} />
                              </button>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-slate-400 ml-1 kanit-text uppercase">หมายเหตุ / เหตุผล</label>
                            <input 
                              type="text" className={`${theme.input} !py-3 text-sm`}
                              placeholder="ระบุเหตุผล หรือเลือกด้านล่าง..."
                              value={adjustData.reason}
                              onChange={e => setAdjustData({...adjustData, reason: e.target.value})}
                            />
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {[
                                'เบิกใช้งานในคลินิก',
                                'รับเข้าสต็อกสั่งซื้อ',
                                'ปรับยอดจากการตรวจนับ',
                                'ชำรุด / เสียหาย',
                                'หมดอายุ / เสื่อมสภาพ'
                              ].map(chip => (
                                <button
                                  key={chip}
                                  type="button"
                                  onClick={() => setAdjustData({ ...adjustData, reason: chip })}
                                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all kanit-text ${
                                    adjustData.reason === chip 
                                      ? 'bg-sky-50 text-sky-700 border-sky-300 font-semibold' 
                                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  {chip}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons (Sticky Footer) */}
              <div className="p-4 sm:p-5 bg-white border-t border-slate-100 flex gap-3 shrink-0 z-10 w-full mt-auto">
                <button type="button" onClick={closeAdjustModal} className="flex-1 py-2.5 sm:py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold kanit-text hover:bg-slate-50 transition-colors shadow-sm">ยกเลิก</button>
                <button type="submit" disabled={isProcessing} className="flex-[2] py-2.5 sm:py-3 bg-sky-500 text-white rounded-xl font-black shadow-md shadow-sky-500/30 hover:bg-sky-600 active:scale-95 transition-all flex items-center justify-center gap-2 sm:gap-3 text-base kanit-text">
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 size={20} />} บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Lot Modal */}
      {isLotModalOpen && createPortal(
        <div className={`fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm ${isLotClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className="absolute inset-0" onClick={closeLotModal}></div>
          <div className={`bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col transform border border-slate-100 relative overflow-hidden ${isLotClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 kanit-text leading-tight">ข้อมูลรายการแต่ละล็อต</h3>
                  <p className="text-xs text-slate-500 kanit-text truncate max-w-[200px]">{selectedLotItem?.product.name}</p>
                </div>
              </div>
              <button onClick={closeLotModal} className="text-slate-400 hover:text-slate-600 p-2"><X size={20} /></button>
            </div>
            <div className="p-0 overflow-y-auto custom-scrollbar max-h-[60vh]">
              {selectedLotItem && selectedLotItem.stocks && selectedLotItem.stocks.length > 0 ? (
                <div className="flex flex-col divide-y divide-slate-50">
                  {selectedLotItem.stocks.sort((a,b) => {
                     const parseD = (dStr) => {
                         if (!dStr || !dStr.includes('/')) return new Date(9999, 11, 31).getTime(); // ถ้าไม่มีวันหมดอายุให้ไปอยู่ล่างสุด
                         const p = dStr.split('/');
                         return new Date(parseInt(p[2], 10) - 543, parseInt(p[1], 10) - 1, parseInt(p[0], 10)).getTime();
                     };
                     return parseD(a.expireDate) - parseD(b.expireDate);
                  }).map((s, si) => {
                     const branchName = branchesData.find(b => b.id === s.branchId)?.name || s.branchId;
                     // ตรวจสอบวันหมดอายุ
                     let expiryStatus = 'ok';
                     if (s.expireDate) {
                        const parts = s.expireDate.split('/');
                        if (parts.length === 3) {
                            const expDate = new Date(parseInt(parts[2], 10) - 543, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                            const today = new Date();
                            const timeDiff = expDate.getTime() - today.getTime();
                            const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                            if (daysDiff <= 0) expiryStatus = 'danger';
                            else if (daysDiff <= 90) expiryStatus = 'warning';
                        }
                     }
                     return (
                      <div key={si} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                             <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-black uppercase border border-indigo-100">
                               {branchName}
                             </span>
                             {s.receiveDate && (
                                <span className="text-[10px] text-slate-400 font-medium kanit-text flex items-center gap-1">
                                   <Clock size={10} /> รับเข้า: {s.receiveDate}
                                </span>
                             )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                             <div className="flex flex-col">
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ล็อต (LOT)</span>
                               <span className="text-sm font-black text-slate-700 font-data">{s.lotNo || '-'}</span>
                             </div>
                             <div className="w-px h-6 bg-slate-200"></div>
                             <div className="flex flex-col">
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">วันหมดอายุ (EXP)</span>
                               <span className={`text-sm font-black font-data flex items-center gap-1 ${expiryStatus === 'danger' ? 'text-rose-600' : expiryStatus === 'warning' ? 'text-amber-500' : 'text-slate-700'}`}>
                                  {s.expireDate || '-'}
                                  {expiryStatus === 'danger' && <AlertOctagon size={12} className="text-rose-500 animate-pulse" />}
                                  {expiryStatus === 'warning' && <AlertTriangle size={12} className="text-amber-500" />}
                               </span>
                             </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider kanit-text">คงเหลือ</span>
                          <span className="text-2xl font-black text-sky-600 font-data">{s.quantity}</span>
                        </div>
                      </div>
                     );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 kanit-text">ไม่มีข้อมูลล็อตสำหรับรายการนี้</div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={closeLotModal} className="px-6 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl font-bold kanit-text transition-colors shadow-sm">
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Log Modal */}
      {isLogModalOpen && createPortal(
        <div className={`fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm ${isLogClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className="absolute inset-0" onClick={closeLogModal}></div>
          <div className={`bg-white rounded-3xl w-full max-w-2xl max-h-[85dvh] shadow-2xl flex flex-col transform border border-slate-100 relative overflow-hidden ${isLogClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner shrink-0">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 kanit-text leading-tight">ประวัติการเคลื่อนไหวสต็อก</h3>
                  <p className="text-xs text-slate-500 kanit-text truncate max-w-[250px]">{logProductInfo?.name}</p>
                </div>
              </div>
              <button onClick={closeLogModal} className="text-slate-400 hover:text-slate-600 p-2"><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 bg-slate-50/30">
              {selectedProductLogs.length > 0 ? (
                <div className="space-y-3">
                  {selectedProductLogs.map((logItem, idx) => {
                    const logAmount = Number(logItem.amount ?? logItem.quantity ?? 0);
                    const logType = logItem.type || logItem.change_type || logItem.changeType || 'MANUAL';
                    const isPositive = logType === 'IN' || (logType === 'MANUAL' && logAmount > 0);
                    const absQty = Math.abs(logAmount);
                    const qtyDisplay = isPositive ? `+${absQty}` : `-${absQty}`;
                    const textColor = isPositive ? 'text-emerald-500' : (logType === 'OUT' || logType === 'SALE' ? 'text-rose-500' : 'text-sky-500');

                    const log = {
                      id: logItem.id || idx,
                      type: logType,
                      branchId: logItem.branchId || logItem.branch_id || 'all',
                      timestamp: logItem.timestamp || logItem.created_at || logItem.createdAt,
                      reason: logItem.reason || logItem.notes || logItem.note || 'อัปเดตสต็อก',
                      amount: logAmount,
                      balance: logItem.balance !== undefined && logItem.balance !== null ? logItem.balance : '-',
                      lotNo: logItem.lotNo || logItem.lot_no,
                      expireDate: logItem.expireDate || logItem.expire_date
                    };
                    return (
                    <div key={`log_${log.id}_${idx}`} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:border-indigo-200 transition-all">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            log.type === 'SALE' ? 'bg-amber-50 text-amber-500' :
                            log.type === 'IN' ? 'bg-emerald-50 text-emerald-500' :
                            log.type === 'OUT' ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-500'
                        }`}>
                            {log.type === 'SALE' ? <Calculator size={18} /> :
                             log.type === 'IN' ? <Plus size={18} /> :
                             log.type === 'OUT' ? <Minus size={18} /> : <Settings size={18} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                             <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                log.type === 'SALE' ? 'bg-amber-100 text-amber-600' :
                                log.type === 'IN' ? 'bg-emerald-100 text-emerald-600' :
                                log.type === 'OUT' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'
                             }`}>
                                {log.type === 'SALE' ? 'ขายสินค้า' :
                                 log.type === 'IN' ? 'รับเข้า' :
                                 log.type === 'OUT' ? 'จ่ายออก' : 'ปรับปรุง'}
                             </span>
                             <span className="px-2 py-0.5 bg-indigo-50 text-indigo-500 rounded text-[9px] font-black uppercase border border-indigo-100">
                                {branches.find(b => b.id === log.branchId)?.name || log.branchId}
                             </span>
                             <span className="text-[10px] text-slate-400 font-data">{formatDateTime(log.timestamp)}</span>
                          </div>
                          <p className="text-sm font-bold text-slate-700 kanit-text mt-1">{log.reason}</p>
                          {(log.lotNo || log.expireDate) && (
                            <div className="flex flex-wrap gap-2 mt-1.5">
                              {log.lotNo && (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase border border-slate-200">
                                  LOT: {log.lotNo}
                                </span>
                              )}
                              {log.expireDate && (
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[9px] font-black uppercase border border-amber-100">
                                  EXP: {log.expireDate}
                                </span>
                              )}
                            </div>
                          )}
                          {log.note && <p className="text-[11px] text-slate-400 kanit-text italic mt-0.5">{log.note}</p>}
                        </div>
                      </div>
                      
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-50">
                        <div className="flex items-center gap-1.5">
                            <span className={`text-sm font-black ${textColor}`}>
                                {qtyDisplay}
                            </span>
                            <span className="text-[10px] text-slate-400 kanit-text font-medium">รายการ</span>
                        </div>
                        <div className="text-[11px] font-bold text-slate-400 kanit-text">คงเหลือ: <span className="text-slate-600 font-data">{log.balance}</span></div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                  <History size={48} className="opacity-10 mb-3" />
                  <p className="kanit-text text-sm italic">ยังไม่มีประวัติความเคลื่อนไหว</p>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0 flex justify-end">
                <button onClick={closeLogModal} className="px-6 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold kanit-text hover:bg-slate-100 transition-colors shadow-sm">ปิดหน้าต่าง</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default React.memo(InventoryManager);


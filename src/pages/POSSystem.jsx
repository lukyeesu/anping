import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Skeleton from './Skeleton';
import CustomSelect from './CustomSelect';
import CatalogManager from './CatalogManager';
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

const POSSystem = ({ 
    products = [], setProducts, 
    patientsData = [], setPatientsData, 
    posHistoryData = [], setPosHistoryData, 
    inventoryData = [], setInventoryData,
    setInventoryLogsData,
    currentBranch,
    branchesData = [],
    showToast, callAppScript, isGlobalLoading, showGlobalAlert, globalAlert,
    showMobileBars,
    handlePrintReceipt // <--- เพิ่ม Props นี้
}) => {
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('ทั้งหมด');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const [discount, setDiscount] = useState(0);
  
  // --- แก้ไข: ให้ดึงค่าเริ่มต้นจาก LocalStorage ---
  const [discountType, setDiscountType] = useState(() => {
    return (typeof localStorage !== 'undefined' && localStorage.getItem('pos_discountType')) || 'amount';
  }); // 'amount' or 'percent'
  
  // --- เพิ่ม State สำหรับการคิดภาษี (ดึงจาก LocalStorage) ---
  const [taxMode, setTaxMode] = useState(() => {
    return (typeof localStorage !== 'undefined' && localStorage.getItem('pos_taxMode')) || 'none';
  }); // 'include' (รวม VAT), 'exclude' (แยก VAT), 'none' (ไม่คิด VAT)
  
  const [vatRate, setVatRate] = useState(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('pos_vatRate') : null;
    return saved !== null ? Number(saved) : 7;
  }); // ค่าเริ่มต้น 7%

  // --- เพิ่ม: บันทึกการตั้งค่าลง LocalStorage ทันทีที่มีการเปลี่ยนค่า ---
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('pos_discountType', discountType);
      localStorage.setItem('pos_taxMode', taxMode);
      localStorage.setItem('pos_vatRate', vatRate.toString());
    }
  }, [discountType, taxMode, vatRate]);
  
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  // --- ใช้ Custom Hooks จัดการ Modal แทน State แยก ---
  const checkoutModal = useModal();
  const historyModal = useModal();
  const manageModal = useModal();
    const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  // --- [NEW] Ref สำหรับควบคุม Scroll ใน Modal ชำระเงิน ---
  const checkoutScrollRef = useRef(null);

  useEffect(() => {
    if (paymentMethod === 'transfer' || checkoutSuccess) {
      setTimeout(() => {
        if (checkoutScrollRef.current) {
          checkoutScrollRef.current.scrollTo({
            top: checkoutScrollRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 150); // หน่วงเวลาเล็กน้อยเพื่อให้ DOM เรนเดอร์รูป QR หรือข้อความสำเร็จเสร็จก่อน
    }
  }, [paymentMethod, checkoutSuccess]);

  // --- เพิ่ม State สำหรับ Infinite Scroll ของประวัติการขาย ---
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(25);
  const [isHistoryLoadingMore, setIsHistoryLoadingMore] = useState(false);

  // --- เพิ่ม State สำหรับดูและแก้ไขรายละเอียดบิล ---
  const [selectedHistoryTxn, setSelectedHistoryTxn] = useState(null);
  const [isEditingHistory, setIsEditingHistory] = useState(false);
  const [historyEditForm, setHistoryEditForm] = useState(null);
  const [isSavingHistory, setIsSavingHistory] = useState(false);

  // --- เพิ่ม State ควบคุมการเปิดปิดตะกร้าบนมือถือ ---
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // --- [NEW] State สำหรับระบบจับเวลา QR Code ---
  const [qrCountdown, setQrCountdown] = useState(300); // 300 วินาที = 5 นาที
  const [isQrExpired, setIsQrExpired] = useState(false);
  const [qrKey, setQrKey] = useState(Date.now()); // ไว้ใช้รีเฟรชรูป QR ใหม่

  // --- [NEW] ระบบจับเวลาถอยหลัง QR Code ---
  useEffect(() => {
    let timer;
    if (paymentMethod === 'transfer' && checkoutModal.isOpen && !checkoutSuccess && !isQrExpired) {
      timer = setInterval(() => {
        setQrCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsQrExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [paymentMethod, checkoutModal.isOpen, checkoutSuccess, isQrExpired]);

  const formatCountdown = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };
  // ------------------------------------------------

  // แก้ไข: เพิ่ม Effect สำหรับรีเซ็ตสถานะตะกร้ามือถือเมื่อขยายหน้าจอ (Resize Bug Fix)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isMobileCartOpen) {
        setIsMobileCartOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileCartOpen]);

  // --- States สำหรับการจัดการสินค้า POS ---
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isManageClosing, setIsManageClosing] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isProcessingProduct, setIsProcessingProduct] = useState(false);
  const initialProductForm = { id: '', name: '', type: '', price: '', stockManaged: false, icon: 'Package', isCourse: false, courseSessions: 1 };
  const [productForm, setProductForm] = useState(initialProductForm);
  const [isAlertClosing, setIsAlertClosing] = useState(false);

  const closeAlert = () => {
    setIsAlertClosing(true);
    setTimeout(() => {
        globalAlert.close();
        setIsAlertClosing(false);
    }, 300);
  };

  // --- ฟังก์ชันเมื่อเลือกคนไข้ ให้ดึงประวัติล่าสุดมาใส่ตะกร้า ---
  const handleSelectPatient = (patientId, patientLabel) => {
    setSelectedPatientId(patientId);
    setPatientSearchTerm(patientLabel);
    setIsPatientDropdownOpen(false);

    let newCartItems = []; // เริ่มต้นด้วยตะกร้าว่างเปล่าเสมอเพื่อล้างของเก่า

    if (patientId) {
      const patient = patientsData.find(p => (p.id || p.hn) === patientId);
      // เช็คว่าคนไข้มีประวัติการรักษา (OPD) หรือไม่
      if (patient && patient.opdRecords && patient.opdRecords.length > 0) {
        const latestOpd = patient.opdRecords[0]; // ดึงประวัติใบล่าสุด (index 0)

        // 1. นำการรักษา (Tx) มาเทียบกับ Catalog สินค้า POS
        if (latestOpd.tx) {
          const treatments = Array.isArray(latestOpd.tx) ? latestOpd.tx : [latestOpd.tx];
          treatments.forEach(tName => {
            if (!tName) return;
            const matchedProduct = products.find(p => p.name === tName);
            if (matchedProduct) {
              const existing = newCartItems.find(item => item.product.id === matchedProduct.id);
              if (existing) existing.quantity += 1;
              else newCartItems.push({ product: matchedProduct, quantity: 1 });
            } else {
              // หากการรักษานั้นไม่ได้ถูกตั้งค่าไว้ใน POS ให้สร้างเป็นรายการชั่วคราวแจ้งเตือน
              newCartItems.push({
                product: {
                  id: `TEMP_TX_${Date.now()}_${Math.random()}`,
                  name: tName,
                  price: 0,
                  type: 'รายการจากแพทย์ (รอระบุราคา/รหัส)',
                  icon: 'Stethoscope',
                  isTemp: true
                },
                quantity: 1
              });
            }
          });
        }

        // 2. นำหมายเหตุ (Note) มาใส่ตะกร้าด้วยในฐานะข้อความแจ้งเตือน (ราคา 0 บาท)
        if (latestOpd.note) {
          newCartItems.push({
            product: {
              id: `NOTE_${Date.now()}`,
              name: `หมายเหตุแพทย์: ${latestOpd.note}`,
              price: 0,
              type: 'ข้อความแจ้งเตือน',
              icon: 'FileText',
              isNote: true
            },
            quantity: 1
          });
        }
      }
    }

    // แทนที่ตะกร้าเดิมด้วยรายการใหม่ทั้งหมด (เคลียร์ของเก่า)
    setCart(newCartItems);

    if (patientId && newCartItems.length > 0) {
      showToast('ล้างตะกร้าและดึงรายการล่าสุดมาใส่ให้แล้ว', 'success');
    } else if (patientId) {
      showToast('ล้างตะกร้า เริ่มบิลใหม่สำหรับคนไข้ที่เลือก', 'success');
    } else {
      showToast('ล้างตะกร้า เริ่มบิลสำหรับลูกค้าทั่วไป', 'success');
    }
  };

  // ดึงรายการหมวดหมู่ที่มีทั้งหมดจากข้อมูล Products
  const categories = ['ทั้งหมด', ...new Set(products.map(p => p.type))];

  // กรองสินค้าตามคำค้นหาและหมวดหมู่
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = activeCategory === 'ทั้งหมด' || p.type === activeCategory;
      return matchSearch && matchCategory;
    });
  }, [products, searchQuery, activeCategory]);

  // ฟังก์ชันจัดการตะกร้า
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQuantity = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0); // ล้างเฉพาะมูลค่าส่วนลด
    setSelectedPatientId('');
    setPatientSearchTerm('');
    // นำการรีเซ็ต setTaxMode และ setVatRate ออก เพื่อให้จำค่าเดิมไว้ใช้กับบิลถัดไป
    setIsSummaryExpanded(false); // พับส่วนคิดเงินเก็บลงเมื่อล้างตะกร้า
    setIsMobileCartOpen(false); // ปิดตะกร้าบนมือถือกลับไปหน้าเลือกสินค้า
  };

  // --- คำนวณยอดเงินและภาษีแบบละเอียด (แยก Vatable / Non-Vatable) ---
  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const discountAmount = discountType === 'percent' ? (subtotal * (discount / 100)) : Number(discount);
  const afterDiscount = Math.max(0, subtotal - discountAmount);

  let totalVatable = 0;
  let totalNonVatable = 0;
  cart.forEach(item => {
      const itemTotal = item.product.price * item.quantity;
      if (item.product.isVatable) {
          totalVatable += itemTotal;
      } else {
          totalNonVatable += itemTotal;
      }
  });

  const vatableRatio = subtotal > 0 ? (totalVatable / subtotal) : 0;
  const vatableDiscount = discountAmount * vatableRatio;
  const netVatable = Math.max(0, totalVatable - vatableDiscount);

  let vatAmount = 0;
  let priceExcludingVat = afterDiscount;
  let grandTotal = afterDiscount;

  if (taxMode === 'exclude') {
    // แยก VAT (บวกเพิ่มจากยอด Vatable หลังหักส่วนลด)
    vatAmount = netVatable * (vatRate / 100);
    grandTotal = afterDiscount + vatAmount;
    priceExcludingVat = afterDiscount;
  } else if (taxMode === 'include') {
    // รวม VAT (ถอด VAT ออกจากยอด Vatable)
    vatAmount = netVatable - (netVatable * 100 / (100 + vatRate));
    priceExcludingVat = afterDiscount - vatAmount;
    grandTotal = afterDiscount;
  }
  // --------------------------------------------------------

  // Format ค่าเงิน
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  };

  // จัดการการชำระเงิน
  const handleCheckout = () => {
    if (cart.length === 0) {
      showToast('ตะกร้าสินค้าว่างเปล่า', 'warning');
      return;
    }
    checkoutModal.open();
    setCheckoutSuccess(false);
  };

  // แก้ไข: เปลี่ยนเป็นการทำงานแบบ Asynchronous และส่งข้อมูลไปบันทึกผ่าน API
  const confirmPayment = async () => {
    setIsProcessingPayment(true);
    
    // สร้าง Payload ข้อมูลบิลเพื่อส่งไปบันทึกในฐานข้อมูล
    const receiptId = `REC${Date.now()}`; // สร้าง ID บิลแบบง่ายๆ
    const transactionData = {
        id: receiptId,
        patientId: selectedPatientId,
        patientName: patientSearchTerm || 'ลูกค้าทั่วไป (ไม่ระบุ)',
        branchId: currentBranch === 'all' ? 'b1' : currentBranch, // บันทึกว่าขายที่สาขาไหน
        items: cart.map(item => ({
            id: item.product.id,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            total: item.product.price * item.quantity,
            isVatable: !!item.product.isVatable // เก็บประวัติไปด้วยว่ารายการนี้ตอนขายคิด VAT หรือไม่
        })),
        subtotal: subtotal,
        discountValue: discount,
        discountType: discountType,
        discountAmount: discountAmount,
        totalVatable: totalVatable,
        netVatable: netVatable,
        taxMode: taxMode,
        vatRate: vatRate,
        vatAmount: vatAmount,
        grandTotal: grandTotal,
        paymentMethod: paymentMethod,
        status: 'completed',
        createdAt: new Date().toISOString()
    };

    try {
        // ส่งข้อมูลไปบันทึกลงชีตชื่อ 'POS_Transactions' (สำคัญสุด ให้ทำเป็นลำดับแรก)
        await callAppScript('SAVE_DATA', 'POS_Transactions', transactionData);
        
        // --- เริ่มปรับปรุง: รวบรวม API Calls สำหรับสต็อกและคอร์สไว้ยิงพร้อมกัน (Promise.all) ---
        const backgroundTasks = [];
        
        // --- ระบบตัดสต็อกอัตโนมัติ (Automatic Stock Deduction - FEFO: First Expired First Out) ---
        const targetBranch = currentBranch === 'all' ? 'b1' : currentBranch;
        let localInvData = [...inventoryData];
        let localLogs = [];
        
        for (const item of cart) {
            if (item.product.stockManaged) {
                // ดึงรายการสต็อกทั้งหมดของสินค้านี้ในสาขานี้ และเรียงลำดับตามวันหมดอายุ (FEFO)
                const productStocks = localInvData
                    .filter(inv => inv.productId === item.product.id && inv.branchId === targetBranch)
                    .sort((a, b) => {
                        if (!a.expireDate) return 1;
                        if (!b.expireDate) return -1;
                        // แปลง วว/ดด/ปปปป เป็น Date object (รองรับปี พ.ศ. โดย -543)
                        const parseDate = (d) => {
                            const [day, month, year] = d.split('/').map(Number);
                            return new Date(year - 543, month - 1, day);
                        };
                        return parseDate(a.expireDate) - parseDate(b.expireDate);
                    });

                let remainingToDeduct = item.quantity;

                for (const stockItem of productStocks) {
                    if (remainingToDeduct <= 0) break;

                    const deductAmount = Math.min(stockItem.quantity, remainingToDeduct);
                    if (deductAmount <= 0) continue;

                    const newQty = stockItem.quantity - deductAmount;
                    remainingToDeduct -= deductAmount;

                    const updatedStock = { ...stockItem, quantity: newQty };
                    
                    // เพิ่มคิวเข้า Background Tasks
                    backgroundTasks.push(callAppScript('SAVE_DATA', 'Inventory', updatedStock));
                    
                    // สร้าง Log การตัดสต็อกรายล็อต
                    const branchName = branchesData.find(b => b.id === targetBranch)?.name || targetBranch;
                    const logPayload = {
                        id: `LOG${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        productId: item.product.id,
                        branchId: targetBranch,
                        type: 'SALE',
                        amount: deductAmount,
                        balance: newQty,
                        reason: `ขายสินค้า (บิล: ${receiptId})`,
                        note: `ล็อต: ${stockItem.lotNo || 'N/A'}, สาขา: ${branchName}`,
                        lotNo: stockItem.lotNo,
                        expireDate: stockItem.expireDate,
                        timestamp: new Date().toISOString()
                    };
                    backgroundTasks.push(callAppScript('SAVE_DATA', 'InventoryLogs', logPayload));

                    // อัปเดต Local State สต็อกและ Log ทันที
                    const idx = localInvData.findIndex(s => s.id === stockItem.id);
                    if (idx !== -1) localInvData[idx] = updatedStock;
                    localLogs.push(logPayload);
                }

                // กรณีสต็อกไม่พอ (หักจนติดลบในล็อตสุดท้าย หรือแจ้งเตือน)
                if (remainingToDeduct > 0) {
                    console.warn(`Stock insufficient for ${item.product.name}. Remaining to deduct: ${remainingToDeduct}`);
                }
            }
        }

        // --- เพิ่มระบบจัดการคอร์ส/แพ็กเกจ ---
        let updatedPatientForState = null;
        if (selectedPatientId && patientsData.length > 0) {
            const currentPatient = patientsData.find(p => (p.id || p.hn) === selectedPatientId);
            if (currentPatient) {
                let updatedCourses = currentPatient.courses ? [...currentPatient.courses] : [];
                let hasChanges = false;

                cart.forEach(item => {
                    // 1. กรณีซื้อคอร์สใหม่ (สินค้าปกติที่มี flag isCourse และไม่ใช่การตัดยอด)
                    if (item.product.isCourse && !item.product.isRedeem) {
                        for (let i = 0; i < item.quantity; i++) {
                            updatedCourses.push({
                                id: `CRS${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                                productId: item.product.id,
                                name: item.product.name,
                                totalSessions: Number(item.product.courseSessions) || 1,
                                remainingSessions: Number(item.product.courseSessions) || 1,
                                purchasedAt: new Date().toISOString()
                            });
                        }
                        hasChanges = true;
                    }
                    
                    // 2. กรณีตัดคอร์ส (Redeem)
                    if (item.product.isRedeem && item.product.courseId) {
                        updatedCourses = updatedCourses.map(c => {
                            if (c.id === item.product.courseId) {
                                return { ...c, remainingSessions: Math.max(0, c.remainingSessions - item.quantity) };
                            }
                            return c;
                        });
                        hasChanges = true;
                    }
                });

                if (hasChanges) {
                    const updatedPatient = { ...currentPatient, courses: updatedCourses };
                    backgroundTasks.push(callAppScript('SAVE_DATA', 'Patients', updatedPatient));
                    updatedPatientForState = updatedPatient;
                }
            }
        }

        // ประมวลผล Task ทั้งหมดพร้อมกัน (ช่วยให้ทำรายการเสร็จเร็วขึ้นหลายเท่าตัว)
        if (backgroundTasks.length > 0) {
            await Promise.all(backgroundTasks);
        }

        // อัปเดต React States รวดเดียว
        if (localLogs.length > 0) {
            setInventoryData(localInvData);
            setInventoryLogsData(prev => [...localLogs, ...prev]);
        }
        if (updatedPatientForState && setPatientsData) {
            setPatientsData(prev => prev.map(p => (p.id || p.hn) === selectedPatientId ? updatedPatientForState : p));
        }

        // อัปเดต State ประวัติการขายทันทีเพื่อให้แสดงใน Modal
        if (setPosHistoryData) {
            setPosHistoryData(prev => [transactionData, ...prev]);
        }
        
        setIsProcessingPayment(false);
        setCheckoutSuccess(true);
        setIsMobileCartOpen(false); // ปิดหน้าตะกร้ามือถือเมื่อชำระเงินสำเร็จ
        showToast('ทำรายการชำระเงินและบันทึกข้อมูลสำเร็จ', 'success');
    } catch (error) {
        console.error("POS Transaction Error:", error);
        setIsProcessingPayment(false);
        showToast('บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่', 'warning');
    }
  };

  const closeCheckoutAndReset = () => {
    checkoutModal.close();
    setTimeout(() => {
      if (checkoutSuccess) {
        clearCart();
      }
      setCheckoutSuccess(false);
    }, 300);
  };

  const closeHistoryModal = () => {
    historyModal.close();
    setTimeout(() => {
      setVisibleHistoryCount(25); // รีเซ็ตจำนวนการแสดงผลกลับเป็นค่าเริ่มต้นเมื่อปิดหน้าต่าง
      setSelectedHistoryTxn(null); // รีเซ็ตบิลที่เลือกดูอยู่
      setIsEditingHistory(false);
    }, 300);
  };

  // --- ฟังก์ชันจัดการดูและแก้ไขบิลย้อนหลัง ---
  const handleViewHistoryTxn = (txn) => {
    setSelectedHistoryTxn(txn);
    setHistoryEditForm(null);
    setIsEditingHistory(false);
    
    // สั่งให้คอนเทนเนอร์เลื่อนกลับขึ้นไปบนสุดเสมอเมื่อเปิดดูรายละเอียดบิล
    setTimeout(() => {
      const scrollContainer = document.getElementById('pos-history-scroll-container');
      if (scrollContainer) {
        scrollContainer.scrollTop = 0;
      }
    }, 50);
  };

  const handleBackToHistoryList = () => {
    setSelectedHistoryTxn(null);
    setIsEditingHistory(false);
  };

  const handleEditTxn = () => {
    setHistoryEditForm({ ...selectedHistoryTxn });
    setIsEditingHistory(true);
  };

  const handleSaveTxnEdit = async () => {
    setIsSavingHistory(true);
    try {
        await callAppScript('SAVE_DATA', 'POS_Transactions', historyEditForm);
        // อัปเดตข้อมูลในตารางหลัก
        if (setPosHistoryData) {
            setPosHistoryData(prev => prev.map(t => t.id === historyEditForm.id ? historyEditForm : t));
        }
        // อัปเดตข้อมูลในหน้าดูรายละเอียด
        setSelectedHistoryTxn(historyEditForm);
        setIsEditingHistory(false);
        showToast('บันทึกการแก้ไขบิลสำเร็จ', 'success');
    } catch (error) {
        console.error(error);
        showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'warning');
    } finally {
        setIsSavingHistory(false);
    }
  };

  // --- ฟังก์ชันจัดการการเลื่อน (Scroll) เพื่อโหลดข้อมูลเพิ่ม (Infinite Scroll) ---
  const handleHistoryScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // ตรวจสอบว่าเลื่อนลงมาเกือบสุดหรือยัง (เหลืออีก 50px)
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      if (visibleHistoryCount < (posHistoryData?.length || 0) && !isHistoryLoadingMore) {
        setIsHistoryLoadingMore(true);
        setTimeout(() => {
          setVisibleHistoryCount(prev => prev + 25);
          setIsHistoryLoadingMore(false);
        }, 800); // หน่วงเวลาเล็กน้อยให้เห็น Loading Skeleton
      }
    }
  };

  const closeManageModal = () => {
    setIsManageClosing(true);
    setTimeout(() => {
      setIsManageModalOpen(false);
      setIsManageClosing(false);
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
        courseSessions: prod.courseSessions || 1 
      });
      setIsEditFormOpen(true);
  };

  const handleSaveProduct = async (e) => {
      e.preventDefault();
      setIsProcessingProduct(true);
      
      const payload = {
          ...productForm,
          id: productForm.id || `ITM${Date.now()}`,
          price: Number(productForm.price),
          courseSessions: Number(productForm.courseSessions) || 1
      };

      try {
          // บันทึกลงชีต setting_pos
          await callAppScript('SAVE_DATA', 'setting_pos', payload);
          
          if (productForm.id) {
              setProducts(products.map(p => p.id === productForm.id ? payload : p));
              showToast('อัปเดตรายการสำเร็จ', 'success');
          } else {
              setProducts([payload, ...products]);
              showToast('เพิ่มรายการใหม่สำเร็จ', 'success');
          }
          setIsEditFormOpen(false);
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

  // สร้างตัวเลือกสำหรับ CustomSelect โดยเรียงลำดับจากประวัติการรักษาล่าสุด (หรือลงทะเบียนล่าสุด) ก่อน
  const patientOptions = useMemo(() => {
    const sortedPatients = [...patientsData].sort((a, b) => {
        const valA = getPatientLastVisitStr(a);
        const valB = getPatientLastVisitStr(b);
        if (valA < valB) return 1;  // ค่าน้อยกว่า (เก่ากว่า) ให้อยู่ข้างล่าง
        if (valA > valB) return -1; // ค่ามากกว่า (ใหม่กว่า) ให้อยู่ข้างบน
        return 0;
    });
    
    return [
      { value: '', label: 'เลือกลูกค้าทั่วไป (ไม่ระบุ)' },
      ...sortedPatients.map(p => ({ value: p.id || p.hn, label: `${p.hn || p.id} - ${getPatientFullName(p)}` }))
    ];
  }, [patientsData]);

  return (
    <>
      <style>{`
        @media (max-height: 500px) and (orientation: landscape) {
          .pos-header { margin-bottom: 0.5rem !important; }
          .pos-header h1 { font-size: 1.1rem !important; }
          .pos-header button { padding: 0.25rem 0.5rem !important; font-size: 0.75rem !important; }
          .pos-search-bar { padding: 0.5rem !important; }
          .pos-search-bar .relative { margin-bottom: 0.5rem !important; }
          .pos-search-bar input { padding-top: 0.4rem !important; padding-bottom: 0.4rem !important; }
          .pos-product-grid { padding: 0.5rem !important; }
          .pos-product-card { padding: 0.75rem !important; }
          .pos-product-card .w-12 { width: 2rem !important; height: 2rem !important; margin-bottom: 0.5rem !important; }
          .pos-product-card .w-14 { width: 2rem !important; height: 2rem !important; margin-bottom: 0.5rem !important; }
          .pos-product-card h3 { font-size: 0.85rem !important; }
          .pos-cart-header { padding: 0.5rem !important; }
          .pos-cart-items { padding: 0.5rem !important; }
          .pos-summary-toggle { py: 0.25rem !important; }
          .pos-summary-content { padding: 0.5rem !important; }
          .pos-checkout-btn { padding-top: 0.5rem !important; padding-bottom: 0.5rem !important; }
        }
      `}</style>
      {/* แก้ไข: เพิ่ม z-[70] เมื่อเปิดตะกร้าบนมือถือ เพื่อยกเลเยอร์ให้ลอยข้าม Header และ Navbar */}
      <div className={`absolute inset-0 flex flex-col p-3 sm:p-4 lg:p-6 xl:p-8 fade-in ${isMobileCartOpen ? 'z-[70]' : ''}`}>
        
        {/* Header ของ POS */}
        <div className="pos-header flex flex-row justify-between items-center gap-2 sm:gap-4 mb-3 sm:mb-4 shrink-0 w-full">
          <div className="flex flex-col items-start">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 kanit-text tracking-tight flex items-center gap-2 leading-none">
              <Calculator className="w-5 h-5 sm:w-6 sm:h-6 text-sky-500 shrink-0" /> 
              <span>ระบบ POS</span>
              {/* แสดงผลแนวนอนบน Desktop */}
              <span className="hidden sm:inline-flex text-xs sm:text-sm font-medium text-slate-400 ml-2 bg-slate-100 px-2 py-1 rounded-lg">จุดรับชำระเงิน</span>
            </h1>
            {/* แสดงผลบรรทัดล่างบน Mobile */}
            <span className="sm:hidden text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md mt-1.5 ml-7">จุดรับชำระเงิน</span>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => historyModal.open()}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-sky-600 hover:bg-sky-50 transition-colors shadow-sm kanit-text text-[11px] sm:text-sm font-medium"
            >
              <History size={16} className="sm:w-[18px] sm:h-[18px]" /> <span className="hidden sm:inline">ประวัติการขาย</span><span className="sm:hidden">ประวัติ</span>
            </button>
          </div>
        </div>

        {/* Main Content: 2 Columns แบบพอดีหน้าจอ (ปรับเป็น md เพื่อให้แท็บเล็ตแนวตั้งแสดงผลแบบ 2 ฝั่งได้) */}
        <div className="flex-1 flex flex-col md:flex-row gap-3 md:gap-4 lg:gap-6 min-h-0 relative">
          
          {/* Left Column: Product Catalog (ซ่อนบนมือถือถ้าตะกร้าเปิดอยู่) */}
          <div className={`flex-[6] md:flex-1 flex flex-col bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-slate-100/50 overflow-hidden min-h-0 ${isMobileCartOpen ? 'hidden md:flex' : 'flex'}`}>
            
            {/* Search & Filter Bar */}
            <div className="pos-search-bar p-4 sm:p-5 border-b border-slate-100 bg-slate-50 shrink-0">
              <div className="relative mb-4">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="ค้นหารหัส, ชื่อสินค้า หรือบริการ..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-5 py-3 sm:py-3.5 bg-white border border-slate-200 rounded-2xl text-base outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 transition-colors font-data shadow-sm"
                />
              </div>
              
              {/* Category Pills */}
              <div className="flex items-center gap-2.5 overflow-x-auto custom-scrollbar pb-2.5 pt-1 -mx-1 px-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`whitespace-nowrap px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-sm font-bold kanit-text transition-all shrink-0 ${
                      activeCategory === cat 
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20' 
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Grid */}
            <div className="pos-product-grid flex-1 p-4 sm:p-6 pb-24 lg:pb-6 overflow-y-auto custom-scrollbar bg-slate-50/30">
              {isGlobalLoading ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 sm:gap-5 auto-rows-max">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={`skel-pos-${i}`} className="bg-white p-5 sm:p-6 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col h-full">
                      <div className="w-full max-w-[56px] h-14 bg-slate-200 rounded-2xl mb-4 animate-pulse shrink-0"></div>
                      <div className="flex-1 flex flex-col justify-between w-full">
                        <div className="mb-2">
                          <div className="h-3 w-full max-w-[64px] bg-slate-200 rounded animate-pulse mb-2"></div>
                          <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse"></div>
                        </div>
                        <div className="flex items-end justify-between mt-auto w-full pt-2">
                          <div className="h-5 w-full max-w-[80px] bg-slate-200 rounded animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 min-[450px]:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 sm:gap-5 auto-rows-max">
                  {filteredProducts.map((product, index) => {
                    const Icon = typeof product.icon === 'string' ? (POS_ICONS[product.icon] || Package) : (product.icon || Package);
                    return (
                      <button 
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className="pos-product-card bg-white p-5 sm:p-6 rounded-[1.5rem] border border-slate-200 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-500/10 transition-all flex flex-col h-full text-left group active:scale-[0.98] space-row-animation"
                        style={{ animationDelay: `${(index % 20) * 30}ms` }}
                      >
                        <div className="w-14 h-14 bg-sky-50 text-sky-500 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-sky-500 group-hover:text-white transition-colors shrink-0">
                          <Icon className="w-7 h-7" strokeWidth={2} />
                        </div>
                        
                        <div className="flex-1 flex flex-col justify-between w-full">
                          <div className="mb-2">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-1.5 truncate">{product.type}</span>
                            <h3 className="font-bold text-slate-800 text-sm sm:text-base kanit-text line-clamp-2 leading-tight min-h-[2.5rem]">{product.name}</h3>
                          </div>
                          
                          <div className="flex items-end justify-between mt-auto w-full pt-2 border-t border-slate-50">
                            <div className="font-bold text-sky-600 text-base sm:text-lg font-data leading-none">
                              {formatCurrency(product.price)}
                            </div>
                            {product.stockManaged && (
                              <div className="text-xs text-slate-400 font-bold kanit-text mb-0.5 shrink-0 ml-1 bg-slate-50 px-1.5 py-0.5 rounded">
                                {product.stock !== undefined ? product.stock : 20}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20">
                  <Search className="w-14 h-14 mb-4 opacity-10" />
                  <p className="kanit-text font-bold text-sm sm:text-base italic">ไม่พบรายการที่ค้นหา</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Cart Area (บน Desktop และ Tablet แสดงด้านขวา, บนมือถือแสดงเต็มจอเมื่อกดปุ่ม) */}
          <div className={`flex-[4] md:flex-none md:min-h-0 w-full md:w-[280px] lg:w-[350px] xl:w-[400px] flex-col bg-slate-50 md:bg-white md:rounded-3xl md:shadow-sm md:border md:border-slate-100/50 overflow-hidden shrink-0 ${isMobileCartOpen ? 'fixed inset-0 z-[70] flex bg-white animate-in slide-in-from-bottom-4 duration-300' : 'hidden md:flex'}`}>
          
            {/* Mobile Cart Header (แสดงเฉพาะบนมือถือเมื่อเปิดตะกร้า) */}
            <div className="md:hidden p-5 bg-white border-b border-slate-100 flex justify-between items-center shrink-0 shadow-sm z-10">
               <h2 className="font-bold text-slate-800 kanit-text flex items-center gap-3 text-xl">
                 <ShoppingCart className="text-sky-500" /> ตะกร้าสินค้า
               </h2>
               <button onClick={() => setIsMobileCartOpen(false)} className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"><X size={24}/></button>
            </div>

            {/* Cart Header & Patient Select */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-white md:bg-slate-50/50 shrink-0">
              <h2 className="hidden md:flex font-bold text-slate-800 kanit-text items-center gap-2 mb-3 sm:mb-4 text-base sm:text-lg">
                <ShoppingCart className="w-5 h-5 text-sky-500" /> รายการบิล
            </h2>
            <div className="relative w-full">
              <div className="flex items-center w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500 transition-all shadow-sm">
                <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
                <input 
                  type="text"
                  className="w-full bg-transparent outline-none text-sm sm:text-base font-data text-slate-700"
                  placeholder="ค้นหาชื่อ หรือ HN ลูกค้า..."
                  value={patientSearchTerm}
                  onChange={(e) => {
                    setPatientSearchTerm(e.target.value);
                    setSelectedPatientId('');
                    setIsPatientDropdownOpen(true);
                  }}
                  onFocus={() => setIsPatientDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setIsPatientDropdownOpen(false), 200)}
                />
                {selectedPatientId && (
                  <button 
                    onClick={() => { setSelectedPatientId(''); setPatientSearchTerm(''); setIsPatientDropdownOpen(false); }} 
                    className="text-slate-400 hover:text-rose-500 ml-2 shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              
              {isPatientDropdownOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200 origin-top">
                    <div 
                      onMouseDown={(e) => { e.preventDefault(); handleSelectPatient('', ''); }}
                      className={`px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 font-data text-sm sm:text-base ${!selectedPatientId ? 'bg-sky-50 text-sky-600 font-bold' : 'text-slate-500'}`}
                    >
                       ลูกค้าทั่วไป (ไม่ระบุ)
                    </div>
                    {patientOptions.filter(p => p.value !== '' && p.label.toLowerCase().includes(patientSearchTerm.toLowerCase())).length === 0 && patientSearchTerm && (
                        <div className="px-4 py-3 text-slate-400 text-sm sm:text-base text-center font-data">
                            ไม่พบข้อมูลลูกค้า
                        </div>
                    )}
                    {patientOptions.filter(p => p.value !== '' && p.label.toLowerCase().includes(patientSearchTerm.toLowerCase())).map((opt) => (
                        <div
                            key={opt.value}
                            onMouseDown={(e) => { e.preventDefault(); handleSelectPatient(opt.value, opt.label); }}
                            className={`px-4 py-3 hover:bg-sky-50 cursor-pointer border-b border-slate-50 last:border-0 font-data transition-colors text-sm sm:text-base ${selectedPatientId === opt.value ? 'bg-sky-50 text-sky-600 font-bold' : 'text-slate-700'}`}
                        >
                            {opt.label}
                        </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* คอร์สคงเหลือของลูกค้า (แสดงเฉพาะเมื่อเลือกลูกค้า) */}
          {selectedPatientId && (
            <div className="relative z-10 px-3 sm:px-4 py-2 bg-indigo-50/30 border-b border-indigo-100 shrink-0 overflow-x-auto custom-scrollbar no-drag-zone">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                <span className="text-[10px] font-bold text-indigo-700 kanit-text uppercase tracking-wider">คอร์สคงเหลือ</span>
              </div>
              <div className="flex gap-2 pb-1">
                {(() => {
                  const patient = patientsData.find(p => (p.id || p.hn) === selectedPatientId);
                  const activeCourses = patient?.courses?.filter(c => c.remainingSessions > 0) || [];

                  if (activeCourses.length === 0) {
                    return <div className="text-[10px] text-slate-400 kanit-text py-1 italic">ไม่มีคอร์สคงเหลือ</div>;
                  }

                  return activeCourses.map(course => (
                    <button
                      key={course.id}
                      onClick={() => {
                        // ตรวจสอบก่อนว่ามีการกดตัดคอร์สนี้ไปในตะกร้าหรือยัง
                        const isAlreadyInCart = cart.some(item => item.product.courseId === course.id);
                        if (isAlreadyInCart) {
                          showToast('รายการนี้อยู่ในตะกร้าแล้ว', 'warning');
                          return;
                        }

                        const courseProduct = products.find(p => p.id === course.productId) || {
                          id: course.productId,
                          name: course.name,
                          price: 0,
                          type: 'คอร์สเดิม',
                          icon: 'Package'
                        };

                        // เพิ่มรายการตัดคอร์สเข้าตะกร้า
                        const redeemItem = {
                          product: { 
                            ...courseProduct, 
                            id: `REDEEM_${course.id}`, 
                            price: 0, 
                            isRedeem: true, 
                            courseId: course.id,
                            name: `ตัดรอบ: ${course.name} (${course.remainingSessions}/${course.totalSessions})`
                          },
                          quantity: 1
                        };
                        setCart(prev => [...prev, redeemItem]);
                        showToast(`เพิ่มการตัดคอร์ส ${course.name} เข้าตะกร้า`, 'success');
                      }}
                      className="shrink-0 px-3 py-2 bg-white border border-indigo-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all shadow-sm active:scale-95 text-left group"
                    >
                      <div className="text-[10px] font-bold text-slate-400 kanit-text group-hover:text-indigo-500 transition-colors">คงเหลือ {course.remainingSessions}/{course.totalSessions}</div>
                      <div className="text-xs font-bold text-slate-700 kanit-text truncate max-w-[120px]">{course.name}</div>
                    </button>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* --- แก้ไข: Middle Area (รวมรายการบิล และ หน้าต่างตั้งค่าส่วนลดแบบ Overlay) --- */}
          {/* แก้ไข 2: ถอด overflow-hidden ออก และเพิ่ม z-20 เพื่อให้แท็บยืดทะลุไปบังคอร์สคงเหลือได้แบบอิสระ */}
          <div className="flex-1 min-h-0 relative flex flex-col bg-slate-50/20 z-20">
            
            {/* 1. Cart Items List (อยู่ด้านหลังเสมอ) */}
            {/* Spacer div ดันด้านล่าง 100px ป้องกันรายการสุดท้ายโดนบัง */}
            <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-4 sm:p-5">
              {cart.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {cart.map((item, idx) => {
                    const CartItemIcon = typeof item.product.icon === 'string' ? (POS_ICONS[item.product.icon] || Package) : (item.product.icon || Package);
                    return (
                      <div key={idx} className="flex flex-col gap-3 relative group p-3 sm:p-4 bg-white border border-slate-100 rounded-[1.5rem] hover:border-sky-200 transition-all shadow-sm">
                         
                         {/* ส่วนบน: ไอคอน + รายละเอียด + ปุ่มลบ */}
                         <div className="flex gap-3 sm:gap-4 items-start">
                             <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 ${item.product.isNote ? 'bg-amber-50 text-amber-500' : item.product.isRedeem ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-50 text-slate-400'}`}>
                                <CartItemIcon size={24} className="sm:w-7 sm:h-7 stroke-[1.5]" />
                             </div>
                             
                             <div className="flex-1 min-w-0 pt-1">
                               <div className="flex justify-between items-start gap-2">
                                 <h4 className={`font-bold text-sm sm:text-base kanit-text leading-tight ${item.product.isNote ? 'text-amber-700' : item.product.isRedeem ? 'text-indigo-700' : 'text-slate-800'}`}>
                                   {item.product.isRedeem && <span className="mr-1.5 px-1.5 py-0.5 bg-indigo-500 text-white text-[9px] rounded uppercase font-black tracking-tighter align-middle">ตัดคอร์ส</span>}
                                   {item.product.name}
                                   {item.product.isVatable && <span className="ml-1.5 px-1.5 py-0.5 bg-sky-50 text-sky-600 text-[10px] rounded border border-sky-200 font-bold tracking-tighter align-middle">(V)</span>}
                                 </h4>
                                 <button onClick={() => removeFromCart(item.product.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-1 -mt-1 -mr-1 shrink-0"><X size={18} /></button>
                               </div>

                              {/* ข้อความสถานะเพิ่มเติม (ถ้ามี) */}
                              {item.product.isTemp ? (
                                <div className="text-rose-500 font-bold text-xs kanit-text mt-1.5">ไม่มีราคาในระบบ</div>
                              ) : item.product.isNote ? null : (
                                item.product.isRedeem ? <div className="text-indigo-500 font-bold text-xs font-data mt-1">FREE (REDEEM)</div> : null
                              )}
                             </div>
                         </div>

                         {/* ส่วนล่าง: ปุ่มปรับจำนวน + ราคารวม */}
                         {!item.product.isNote && (
                           <div className="flex items-center justify-between pt-1">
                             
                             {/* Qty Controls ชิดซ้าย */}
                             <div className="flex items-center gap-1.5 bg-slate-50/80 rounded-xl border border-slate-200 p-1 w-fit">
                               <button onClick={() => updateQuantity(item.product.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-slate-500 shadow-sm border border-slate-100 hover:text-sky-500 transition-colors"><Minus size={14} strokeWidth={2.5}/></button>
                               <span className="font-black text-sm sm:text-base text-slate-700 w-8 text-center font-data select-none">{item.quantity}</span>
                               <button onClick={() => updateQuantity(item.product.id, 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-slate-500 shadow-sm border border-slate-100 hover:text-sky-500 transition-colors"><Plus size={14} strokeWidth={2.5}/></button>
                             </div>
                             
                             {/* ยอดเงินรวม ชิดขวา */}
                             <div className="text-right flex flex-col justify-end">
                               {item.quantity > 1 && !item.product.isRedeem && (
                                   <span className="text-[10px] text-slate-400 font-data mb-0.5 tracking-tight">{formatCurrency(item.product.price)} / หน่วย</span>
                               )}
                               <span className={`font-black text-lg sm:text-xl font-data leading-none tracking-tight ${item.product.isRedeem ? 'text-indigo-500' : 'text-slate-800'}`}>
                                 {item.product.isRedeem ? '0.00' : formatCurrency(item.product.price * item.quantity)}
                               </span>
                             </div>
                           </div>
                         )}
                      </div>
                     );
                  })}
                  
                  {/* Spacer เผื่อพื้นที่ด้านล่าง 100px ให้มองเห็นรายการสุดท้ายได้เต็มที่ ไม่โดนแถบด้านล่างบังแน่นอน */}
                  <div className="h-[100px] w-full shrink-0 pointer-events-none"></div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 opacity-50"><ShoppingCart size={32} /></div>
                  <p className="kanit-text font-bold text-sm sm:text-base italic">ยังไม่มีรายการในบิล</p>
                </div>
              )}
            </div>

            {/* 2. Expandable Settings Overlay (ลอยขึ้นมาบังรายการบิล) */}
            {/* แก้ไข 3: ปรับ z-index เป็น z-30 ให้อยู่เหนือกล่องตรงกลาง พร้อมเพิ่มเงาให้ลอยเด่นขึ้น */}
            <div 
              className={`absolute bottom-0 left-0 w-full flex flex-col bg-white rounded-t-[1.5rem] xl:rounded-t-[2rem] shadow-[0_-15px_40px_rgba(0,0,0,0.15)] z-30 transition-transform duration-300 ease-in-out border-t border-slate-100 ${isSummaryExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-32px)]'}`}
            >
              {/* Toggle Tab (มองเห็นเสมอที่ความสูง 32px) */}
              <div 
                className="h-[32px] w-full flex justify-center items-center hover:bg-sky-50 text-slate-500 hover:text-sky-600 cursor-pointer rounded-t-[1.5rem] xl:rounded-t-[2rem] transition-colors shrink-0"
                onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                title={isSummaryExpanded ? "ย่อรายละเอียด" : "ตั้งค่าส่วนลดและภาษี"}
              >
                <div className="flex items-center gap-1.5 kanit-text font-bold text-[10px] sm:text-[11px] tracking-wide select-none">
                  {isSummaryExpanded ? <ChevronDown size={14} className="text-sky-500" /> : <ChevronUp size={14} className="text-sky-500" />}
                  <span>{isSummaryExpanded ? 'ย่อรายละเอียดส่วนลดและภาษี' : 'ตั้งค่าส่วนลดและภาษี'}</span>
                  {!isSummaryExpanded && (discountAmount > 0 || vatAmount > 0) && (
                     <span className="flex h-1.5 w-1.5 relative ml-0.5">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                     </span>
                  )}
                </div>
              </div>

              {/* Settings Content (แสดงผลเมื่อกางขึ้นมา) */}
              <div className="overflow-y-auto custom-scrollbar p-4 sm:p-5 max-h-[40vh] sm:max-h-[350px] bg-slate-50/80 border-t border-slate-100/80">
                <div className="space-y-2.5 sm:space-y-3 font-data text-xs sm:text-sm">
                  {/* รวมเป็นเงิน */}
                  <div className="flex justify-between items-center text-slate-700">
                    <span className="kanit-text font-medium">รวมเป็นเงิน</span>
                    <span className="font-bold">{formatCurrency(subtotal)}</span>
                  </div>

                  {/* ส่วนลดเพิ่มเติม */}
                  <div className="flex justify-between items-center">
                    <span className="kanit-text font-medium text-slate-700 flex items-center gap-1">
                      ส่วนลดเพิ่มเติม
                      {discount > 0 && (
                         <span className="text-rose-500 font-bold text-[10px] sm:text-xs">
                            {discountType === 'percent' 
                               ? `(${formatCurrency(discountAmount)} ฿)` 
                               : `(${Number(((Number(discount) || 0) * 100 / (subtotal || 1)).toFixed(2))}%)`}
                         </span>
                      )}
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        value={discount || ''}
                        onChange={(e) => setDiscount(Number(e.target.value))}
                        className="w-16 sm:w-20 px-2 py-1 text-right text-xs sm:text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg outline-none focus:border-sky-400 font-data transition-colors"
                        placeholder="0.00"
                      />
                      <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden h-[26px] sm:h-[28px]">
                        <button onClick={() => setDiscountType('amount')} className={`px-2 text-[10px] sm:text-xs font-bold font-data transition-colors ${discountType === 'amount' ? 'bg-sky-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>฿</button>
                        <div className="w-px bg-slate-200"></div>
                        <button onClick={() => setDiscountType('percent')} className={`px-2 text-[10px] sm:text-xs font-bold font-data transition-colors ${discountType === 'percent' ? 'bg-sky-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>%</button>
                      </div>
                    </div>
                  </div>

                  {/* ส่วนลดรวมทั้งหมด */}
                  <div className="flex justify-between items-center text-rose-500 font-medium">
                    <span className="kanit-text">ส่วนลดรวมทั้งหมด</span>
                    <span className="font-bold">- {formatCurrency(discountAmount)}</span>
                  </div>

                  <div className="h-px w-full bg-slate-200/60 my-1.5"></div>

                  {/* ยอดหลังหักส่วนลด */}
                  <div className="flex justify-between items-center text-slate-700 font-medium">
                    <span className="kanit-text">ยอดหลังหักส่วนลด</span>
                    <span className="font-bold">{formatCurrency(afterDiscount)}</span>
                  </div>

                  {/* การคิดภาษี (Radio Buttons) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1">
                    <span className="kanit-text font-bold text-slate-800">การคิดภาษี</span>
                    <div className="flex items-center gap-3 text-[10px] sm:text-xs kanit-text">
                      <label className="flex items-center gap-1.5 cursor-pointer group">
                        <input type="radio" name="taxMode" value="include" checked={taxMode === 'include'} onChange={() => setTaxMode('include')} className="hidden" />
                        <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border flex items-center justify-center transition-colors shrink-0 ${taxMode === 'include' ? 'border-sky-500' : 'border-slate-300 group-hover:border-sky-400'}`}>
                          {taxMode === 'include' && <div className="w-2 h-2 sm:w-2 sm:h-2 rounded-full bg-sky-500" />}
                        </div>
                        <span className={`transition-colors ${taxMode === 'include' ? 'text-sky-600 font-bold' : 'text-slate-600 group-hover:text-sky-500'}`}>รวม VAT</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer group">
                        <input type="radio" name="taxMode" value="exclude" checked={taxMode === 'exclude'} onChange={() => setTaxMode('exclude')} className="hidden" />
                        <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border flex items-center justify-center transition-colors shrink-0 ${taxMode === 'exclude' ? 'border-sky-500' : 'border-slate-300 group-hover:border-sky-400'}`}>
                          {taxMode === 'exclude' && <div className="w-2 h-2 sm:w-2 sm:h-2 rounded-full bg-sky-500" />}
                        </div>
                        <span className={`transition-colors ${taxMode === 'exclude' ? 'text-sky-600 font-bold' : 'text-slate-600 group-hover:text-sky-500'}`}>แยก VAT</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer group">
                        <input type="radio" name="taxMode" value="none" checked={taxMode === 'none'} onChange={() => setTaxMode('none')} className="hidden" />
                        <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border flex items-center justify-center transition-colors shrink-0 ${taxMode === 'none' ? 'border-sky-500' : 'border-slate-300 group-hover:border-sky-400'}`}>
                          {taxMode === 'none' && <div className="w-2 h-2 sm:w-2 sm:h-2 rounded-full bg-sky-500" />}
                        </div>
                        <span className={`transition-colors ${taxMode === 'none' ? 'text-sky-600 font-bold' : 'text-slate-600 group-hover:text-sky-500'}`}>ไม่คิด VAT</span>
                      </label>
                    </div>
                  </div>

                  {/* ราคาไม่รวมภาษีมูลค่าเพิ่ม */}
                  <div className={`flex justify-between items-center text-slate-700 font-medium transition-opacity duration-300 ${taxMode === 'none' ? 'opacity-40 select-none' : ''}`}>
                    <span className="kanit-text">ราคาไม่รวมภาษีมูลค่าเพิ่ม</span>
                    <span className="font-bold">{formatCurrency(priceExcludingVat)}</span>
                  </div>

                  {/* ภาษีมูลค่าเพิ่ม + Input % */}
                  <div className={`flex justify-between items-center text-slate-700 font-medium transition-opacity duration-300 ${taxMode === 'none' ? 'opacity-40 select-none pointer-events-none' : ''}`}>
                    <div className="flex items-center gap-2">
                        <span className="kanit-text">ภาษีมูลค่าเพิ่ม</span>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                value={vatRate}
                                onChange={(e) => setVatRate(Number(e.target.value))}
                                disabled={taxMode === 'none'}
                                className="w-12 sm:w-14 px-1 py-0.5 text-center text-xs sm:text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg outline-none focus:border-sky-400 font-data disabled:bg-slate-50 transition-colors"
                            />
                            <span className="text-xs sm:text-sm">%</span>
                        </div>
                    </div>
                    <span className="font-bold">{formatCurrency(vatAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* --- Always Visible Bottom Section (Totals & Buttons - Fixed Footer) --- */}
          {/* แก้ไข 4: เพิ่ม z-40 ให้ส่วนท้าย (Footer) ยึดอยู่บนสุดเหนือบิลเสมอ ไม่ว่าแท็บส่วนลดจะกางหรือหด */}
          <div className="px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4 flex flex-col bg-white shrink-0 z-40 border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] relative">
              <div className="flex justify-between items-center text-lg sm:text-xl font-black text-slate-800 mb-3 select-none">
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="kanit-text">ยอดสุทธิ</span>
                  {!isSummaryExpanded && (discountAmount > 0 || vatAmount > 0) && (
                     <span className="text-[9px] sm:text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md kanit-text border border-amber-100 animate-in fade-in">
                        มีส่วนลด/ภาษี
                     </span>
                  )}
                </div>
                <span className="font-data text-sky-600">{formatCurrency(grandTotal)}</span>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={clearCart} 
                  disabled={cart.length === 0}
                  className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 text-slate-500 font-semibold hover:bg-slate-50 hover:text-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="ล้างตะกร้า"
                >
                  <Trash2 size={18} className="sm:w-5 sm:h-5" />
                </button>
                <button 
                  onClick={handleCheckout}
                  disabled={cart.length === 0}
                  className={`flex-1 py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-lg shadow-md transition-all active:scale-[0.98] kanit-text disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${
                    cart.length > 0 ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-sky-500/30' : 'bg-slate-100 text-slate-400 shadow-none'
                  }`}
                >
                  ชำระเงิน {cart.length > 0 ? formatCurrency(grandTotal) : ''}
                </button>
              </div>
          </div>
          
          </div> {/* End of Right Column */}

          {/* --- Floating Mobile Cart Button (แสดงเฉพาะบนมือถือตอนอยู่หน้าเลือกสินค้า) --- */}
          {!isMobileCartOpen && (
            <div className={`md:hidden fixed left-4 right-4 z-40 transition-all duration-300 ease-in-out ${showMobileBars ? 'bottom-[76px]' : 'bottom-6'}`}>
              <button 
                onClick={() => setIsMobileCartOpen(true)}
                className={`w-full p-4 rounded-2xl shadow-xl flex items-center justify-between transition-all active:scale-95 ${cart.length > 0 ? 'bg-sky-500 text-white shadow-sky-500/30' : 'bg-white text-slate-600 border border-slate-200 shadow-slate-200/50'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${cart.length > 0 ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <ShoppingCart size={24} />
                  </div>
                  <div className="text-left flex flex-col justify-center">
                    <p className={`text-[10px] font-black kanit-text leading-none mb-1.5 uppercase tracking-widest ${cart.length > 0 ? 'text-sky-100' : 'text-slate-400'}`}>
                      ตะกร้าสินค้า ({cart.reduce((sum, item) => sum + item.quantity, 0)})
                    </p>
                    <p className={`text-lg font-bold font-data leading-none ${cart.length > 0 ? 'text-white' : 'text-slate-600'}`}>
                      {formatCurrency(grandTotal)}
                    </p>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 kanit-text font-black text-sm ${cart.length > 0 ? 'bg-white/20 pl-4 pr-2.5 py-2 rounded-xl' : 'opacity-50'}`}>
                   <span>{cart.length > 0 ? 'ดูบิล' : 'เปิดตะกร้า'}</span>
                   <ChevronRight size={18} />
                </div>
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Checkout Modal */}
      {checkoutModal.isOpen && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm ${checkoutModal.isClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className={`bg-white w-full max-w-md rounded-[1.5rem] shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden ${checkoutModal.isClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <h3 className="text-base sm:text-lg font-bold text-slate-800 kanit-text flex items-center gap-2">
                <Banknote size={18} className="text-sky-500"/> ชำระเงิน
              </h3>
              <button onClick={closeCheckoutAndReset} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-full transition-colors"><X size={18}/></button>
            </div>
            
            <div ref={checkoutScrollRef} className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-4 sm:gap-5 scroll-smooth">
               <div className="bg-gradient-to-br from-sky-50 to-sky-100/50 p-4 sm:p-5 rounded-2xl text-center border border-sky-100 shadow-inner relative overflow-hidden shrink-0">
                  <div className="absolute -top-4 -right-4 w-20 h-20 bg-sky-200/50 rounded-full blur-2xl pointer-events-none"></div>
                  <p className="text-[11px] sm:text-xs text-sky-600 font-bold kanit-text mb-0.5 relative z-10 uppercase tracking-wider">ยอดสุทธิที่ต้องชำระ</p>
                  <h2 className="text-3xl sm:text-4xl font-black text-sky-600 font-data tracking-tighter relative z-10 leading-none py-1">{formatCurrency(grandTotal)}</h2>
               </div>

               <div className="space-y-3 shrink-0">
                  <label className="block text-sm font-bold text-slate-700 kanit-text">เลือกวิธีชำระเงิน</label>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                     <button onClick={() => setPaymentMethod('cash')} className={`p-3 sm:p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all kanit-text ${paymentMethod === 'cash' ? 'ring-2 ring-sky-500 border-transparent bg-sky-50 text-sky-700 shadow-sm scale-[1.02] z-10' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <Banknote size={24} /> <span className="text-xs sm:text-sm font-bold whitespace-nowrap">เงินสด</span>
                     </button>
                     <button onClick={() => setPaymentMethod('transfer')} className={`p-3 sm:p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all kanit-text ${paymentMethod === 'transfer' ? 'ring-2 ring-sky-500 border-transparent bg-sky-50 text-sky-700 shadow-sm scale-[1.02] z-10' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <QrCode size={24} /> <span className="text-xs sm:text-sm font-bold whitespace-nowrap">โอนเงิน (QR)</span>
                     </button>
                     <button onClick={() => setPaymentMethod('credit')} className={`p-3 sm:p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all kanit-text col-span-2 ${paymentMethod === 'credit' ? 'ring-2 ring-sky-500 border-transparent bg-sky-50 text-sky-700 shadow-sm scale-[1.02] z-10' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <CreditCard size={24} /> <span className="text-xs sm:text-sm font-bold whitespace-nowrap">บัตรเครดิต</span>
                     </button>
                  </div>

                  {paymentMethod === 'transfer' && (
                     <div className="mt-4 border border-sky-100 bg-sky-50/50 p-4 sm:p-5 rounded-2xl flex flex-col items-center justify-center animate-in fade-in zoom-in-95">
                        <p className="text-xs sm:text-sm font-bold text-slate-500 kanit-text mb-3 sm:mb-4 text-center">สแกน QR Code พร้อมเพย์</p>
                        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 shrink-0 relative mb-4">
                            <div className="absolute inset-0 border-2 border-sky-400 rounded-xl animate-pulse opacity-40 pointer-events-none"></div>
                            <img 
                               src={`https://promptpay.io/0926321039/${grandTotal}.png`} 
                               alt="PromptPay QR" 
                               className="w-48 h-48 sm:w-56 sm:h-56 object-contain pointer-events-none select-none relative z-10" 
                            />
                        </div>
                        <div className="text-center flex flex-col items-center w-full">
                            <h4 className="text-lg sm:text-xl font-black text-sky-700 kanit-text leading-tight mb-1">นาย พงษ์สิทธิ์ แซ่อึ้ง</h4>
                            <p className="text-xs sm:text-sm text-slate-500 font-data mb-3">เบอร์พร้อมเพย์: 092-632-1039</p>
                            <div className="bg-white px-5 py-3 rounded-2xl border border-sky-100 shadow-sm w-full max-w-[240px]">
                               <p className="text-[10px] sm:text-xs text-slate-400 font-bold kanit-text mb-0.5">ยอดชำระสุทธิ</p>
                               <p className="text-xl sm:text-2xl font-black text-sky-600 font-data leading-none">{formatCurrency(grandTotal)}</p>
                            </div>
                        </div>
                     </div>
                  )}
               </div>

               <div className="mt-auto pt-4 flex flex-col justify-end shrink-0">
                 {checkoutSuccess ? (
                    <div className="flex flex-col items-center py-2 animate-in fade-in zoom-in slide-in-from-bottom-4">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-3">
                            <CheckCircle2 size={24} />
                        </div>
                        <h4 className="font-bold text-slate-800 text-base kanit-text">ทำรายการสำเร็จ</h4>
                        <p className="text-slate-500 text-xs kanit-text mb-4">บันทึกข้อมูลการขายเรียบร้อยแล้ว</p>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full">
                           <button onClick={() => handlePrintReceipt(posHistoryData[0], '80mm')} className="py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl font-bold transition-colors kanit-text text-xs sm:text-sm flex flex-col items-center justify-center gap-1 border border-indigo-100 shadow-sm active:scale-95"><Printer size={16}/> สลิป (80mm)</button>
                           <button onClick={() => handlePrintReceipt(posHistoryData[0], 'A4')} className="py-2 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-xl font-bold transition-colors kanit-text text-xs sm:text-sm flex flex-col items-center justify-center gap-1 border border-sky-100 shadow-sm active:scale-95"><Printer size={16}/> ใบเสร็จ (A4)</button>
                           <button onClick={closeCheckoutAndReset} className="col-span-2 sm:col-span-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors kanit-text text-sm flex items-center justify-center shadow-sm active:scale-95">เสร็จสิ้น</button>
                        </div>
                    </div>
                 ) : (
                    <button 
                       onClick={confirmPayment}
                       disabled={isProcessingPayment}
                       className="w-full py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold shadow-md shadow-sky-500/30 transition-all active:scale-95 flex justify-center items-center gap-2 kanit-text text-base"
                    >
                       {isProcessingPayment ? <Loader2 className="w-5 h-5 animate-spin" /> : <Receipt size={18} />}
                       {isProcessingPayment ? 'กำลังบันทึก...' : 'ยืนยันการรับเงิน'}
                    </button>
                 )}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModal.isOpen && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm ${historyModal.isClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className={`bg-white w-full max-w-4xl rounded-[1.5rem] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${historyModal.isClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0 z-10">
              <h3 className="text-base sm:text-lg font-bold text-slate-800 kanit-text flex items-center gap-2">
                <History size={20} className="text-sky-500"/> ประวัติการทำรายการ (POS)
              </h3>
              <button onClick={closeHistoryModal} className="text-slate-400 hover:text-slate-600 hover:bg-white p-1.5 sm:p-2 rounded-full transition-colors shadow-sm border border-transparent hover:border-slate-200"><X size={20} className="sm:w-5 sm:h-5"/></button>
            </div>
            
            {/* เพิ่ม id="pos-history-scroll-container" เพื่อให้ฟังก์ชันหาเจอและสั่ง scroll กลับไปบนสุดได้ */}
            <div id="pos-history-scroll-container" className="p-0 sm:p-6 flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30" onScroll={!selectedHistoryTxn ? handleHistoryScroll : undefined}>
                {isGlobalLoading ? (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden m-4 sm:m-0">
                        <div className="overflow-x-auto overflow-y-hidden">
                            <table className="table-auto w-full text-left border-collapse min-w-[700px]">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wide kanit-text"><th className="w-[19%] p-4 font-bold">วันที่/เวลา</th><th className="w-[16%] p-4 font-bold">เลขที่บิล</th><th className="w-[16%] p-4 font-bold">ลูกค้า</th><th className="w-[19%] p-4 font-bold text-right">ยอดรวม</th><th className="w-[16%] p-4 font-bold text-center">วิธีชำระ</th><th className="w-[14%] p-4 font-bold text-center">สถานะ</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {Array.from({ length: 5 }).map((_, idx) => (
                                        <tr key={`skel-hist-${idx}`} className="border-b border-slate-50"><td className="p-4"><div className="h-4 w-full max-w-[128px] bg-slate-200 rounded animate-pulse"></div></td><td className="p-4"><div className="h-4 w-full max-w-[96px] bg-slate-200 rounded animate-pulse"></div></td><td className="p-4"><div className="h-4 w-full max-w-[160px] bg-slate-200 rounded animate-pulse"></div></td><td className="p-4"><div className="h-4 w-full max-w-[80px] bg-slate-200 rounded animate-pulse ml-auto"></div></td><td className="p-4"><div className="h-6 w-full max-w-[64px] bg-slate-200 rounded-lg animate-pulse mx-auto"></div></td><td className="p-4"><div className="h-6 w-full max-w-[64px] bg-slate-200 rounded-full animate-pulse mx-auto"></div></td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : selectedHistoryTxn ? (
                    // --- View Details & Edit View ---
                    <div className="bg-white sm:rounded-2xl sm:border border-slate-100 sm:shadow-sm overflow-hidden fade-in min-h-full flex flex-col">
                         {/* Header ของหน้ารายละเอียด */}
                         <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <button onClick={handleBackToHistoryList} className="p-1.5 sm:p-2 bg-white hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors shadow-sm border border-slate-200">
                                    <ChevronLeft size={20} className="sm:w-5 sm:h-5" />
                                </button>
                                <div>
                                    <h4 className="font-bold text-slate-800 kanit-text text-sm sm:text-base leading-tight">รายละเอียดบิล</h4>
                                    <p className="text-[10px] sm:text-xs text-sky-600 font-bold font-data mt-0.5">{selectedHistoryTxn.id}</p>
                                </div>
                            </div>
                            <div>
                                {!isEditingHistory ? (
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                        <button onClick={() => handlePrintReceipt(selectedHistoryTxn, '80mm')} title="พิมพ์สลิป 80mm" className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-white border border-slate-200 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all active:scale-95 shadow-sm text-[11px] sm:text-sm font-bold kanit-text">
                                            <Printer size={14} className="sm:w-[16px] sm:h-[16px]" /> <span className="hidden sm:inline">สลิป (80mm)</span>
                                        </button>
                                        <button onClick={() => handlePrintReceipt(selectedHistoryTxn, 'A4')} title="พิมพ์ใบเสร็จ A4" className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-white border border-slate-200 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all active:scale-95 shadow-sm text-[11px] sm:text-sm font-bold kanit-text">
                                            <Printer size={14} className="sm:w-[16px] sm:h-[16px]" /> <span className="hidden sm:inline">A4</span>
                                        </button>
                                        <button onClick={handleEditTxn} className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-4 sm:py-2 bg-white border border-slate-200 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all active:scale-95 shadow-sm text-[11px] sm:text-sm font-bold kanit-text">
                                            <Pencil size={14} className="sm:w-[16px] sm:h-[16px]" /> <span className="hidden sm:inline">แก้ไขข้อมูล</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setIsEditingHistory(false)} disabled={isSavingHistory} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors text-[11px] sm:text-sm font-bold kanit-text disabled:opacity-50">
                                            ยกเลิก
                                        </button>
                                        <button onClick={handleSaveTxnEdit} disabled={isSavingHistory} className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-sky-500 text-white hover:bg-sky-600 rounded-xl transition-all active:scale-95 shadow-md shadow-sky-500/20 text-[11px] sm:text-sm font-bold kanit-text disabled:opacity-50">
                                            {isSavingHistory ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <CheckCircle2 size={14} className="sm:w-[16px] sm:h-[16px]" />} บันทึก
                                        </button>
                                    </div>
                                )}
                            </div>
                         </div>

                         {/* Body ของหน้ารายละเอียด */}
                         <div className="p-4 sm:p-6 flex-1 bg-white">
                            {/* Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div className={`p-4 rounded-xl border ${isEditingHistory ? 'bg-sky-50/30 border-sky-100' : 'bg-slate-50 border-slate-100'}`}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400"><User size={12}/></div>
                                        <p className="text-[11px] sm:text-xs font-bold text-slate-500 kanit-text uppercase tracking-wider">ข้อมูลลูกค้า & วันที่</p>
                                    </div>
                                    {isEditingHistory ? (
                                        <div className="space-y-3 mt-1 relative z-20">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-500 mb-1 kanit-text">ชื่อลูกค้า</label>
                                                <input type="text" className={`${theme.input} py-2 px-3 text-sm font-data`} value={historyEditForm.patientName} onChange={e => setHistoryEditForm({...historyEditForm, patientName: e.target.value})} placeholder="ลูกค้าทั่วไป (ไม่ระบุ)" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="pl-1">
                                            <p className="font-bold text-slate-800 text-sm sm:text-base kanit-text">{selectedHistoryTxn.patientName || 'ลูกค้าทั่วไป (ไม่ระบุ)'}</p>
                                            <p className="text-xs text-slate-500 font-data mt-1.5 flex items-center gap-1.5"><Clock size={12} className="text-slate-400"/> {formatDateTime(selectedHistoryTxn.createdAt)}</p>
                                        </div>
                                    )}
                                </div>
                                <div className={`p-4 rounded-xl border ${isEditingHistory ? 'bg-sky-50/30 border-sky-100' : 'bg-slate-50 border-slate-100'}`}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400"><CreditCard size={12}/></div>
                                        <p className="text-[11px] sm:text-xs font-bold text-slate-500 kanit-text uppercase tracking-wider">สถานะ & การชำระเงิน</p>
                                    </div>
                                    {isEditingHistory ? (
                                        <div className="grid grid-cols-2 gap-3 mt-1 relative z-10">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-500 mb-1 kanit-text">สถานะบิล</label>
                                                <CustomSelect 
                                                    compact
                                                    value={historyEditForm.status} 
                                                    onChange={val => setHistoryEditForm({...historyEditForm, status: val})}
                                                    options={[{value:'completed', label:'✅ สำเร็จ'}, {value:'cancelled', label:'❌ ยกเลิก (Void)'}]}
                                                    className="w-full"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-500 mb-1 kanit-text">วิธีชำระเงิน</label>
                                                <CustomSelect 
                                                    compact
                                                    value={historyEditForm.paymentMethod} 
                                                    onChange={val => setHistoryEditForm({...historyEditForm, paymentMethod: val})}
                                                    options={[{value:'cash', label:'💵 เงินสด'}, {value:'transfer', label:'📱 โอนเงิน'}, {value:'credit', label:'💳 บัตรเครดิต'}]}
                                                    className="w-full"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2 pl-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-500 w-16">สถานะ:</span>
                                                <span className={`px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-bold kanit-text ${selectedHistoryTxn.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : selectedHistoryTxn.status === 'cancelled' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                                                    {selectedHistoryTxn.status === 'completed' ? 'สำเร็จ' : selectedHistoryTxn.status === 'cancelled' ? 'ยกเลิก (Void)' : selectedHistoryTxn.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-500 w-16">ช่องทาง:</span>
                                                <span className="px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-bold bg-white border border-slate-200 text-slate-600 kanit-text flex items-center gap-1.5 shadow-sm">
                                                    {selectedHistoryTxn.paymentMethod === 'cash' ? <><Banknote size={12}/> เงินสด</> : selectedHistoryTxn.paymentMethod === 'transfer' ? <><QrCode size={12}/> โอนเงิน</> : selectedHistoryTxn.paymentMethod === 'credit' ? <><CreditCard size={12}/> บัตรเครดิต</> : selectedHistoryTxn.paymentMethod}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Items List */}
                            <h5 className="font-bold text-slate-700 kanit-text mb-3 flex items-center gap-2"><ShoppingCart size={16} className="text-sky-500" /> รายการสินค้า ({selectedHistoryTxn.items?.length || 0})</h5>
                            <div className="border border-slate-100 rounded-xl overflow-hidden mb-6 w-full">
                                {/* Desktop Table */}
                                <div className="hidden sm:block overflow-x-auto w-full">
                                    <table className="table-auto w-full text-left border-collapse min-w-[500px]">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-medium kanit-text sticky top-0"><th className="w-[16%] p-3 text-center">#</th><th className="w-[32%] p-3">รายการสินค้า / บริการ</th><th className="w-[16%] p-3 text-center ">จำนวน</th><th className="w-[19%] p-3 text-right ">ราคา/หน่วย</th><th className="w-[17%] p-3 text-right ">รวม (บาท)</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {(selectedHistoryTxn.items || []).map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors font-data text-sm">
                                                    <td className="p-3 text-center text-slate-400 text-xs">{idx + 1}</td>
                                                    <td className="p-3 text-slate-700 font-bold kanit-text">{item.name}</td>
                                                    <td className="p-3 text-center font-semibold">{item.quantity}</td>
                                                    <td className="p-3 text-right text-slate-500">{formatCurrency(item.price)}</td>
                                                    <td className="p-3 text-right font-bold text-sky-600">{formatCurrency(item.total)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Mobile List */}
                                <div className="sm:hidden flex flex-col divide-y divide-slate-50 bg-slate-50/30">
                                    {(selectedHistoryTxn.items || []).map((item, idx) => (
                                        <div key={idx} className="p-3 flex flex-col gap-1 bg-white">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="font-bold text-slate-800 text-sm kanit-text leading-tight">{item.name}</div>
                                                <div className="font-bold text-sky-600 text-sm font-data shrink-0">{formatCurrency(item.total)}</div>
                                            </div>
                                            <div className="flex justify-between items-center text-xs font-data text-slate-500 mt-1">
                                                <div>จำนวน {item.quantity} รายการ</div>
                                                <div>{formatCurrency(item.price)} / หน่วย</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="flex flex-col sm:flex-row justify-between items-end sm:items-start gap-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100">
                                <div className="w-full sm:w-auto">
                                    <div className="text-[10px] sm:text-xs text-slate-400 kanit-text mb-1 flex items-center gap-1.5"><FileText size={12}/> รหัสอ้างอิง: {selectedHistoryTxn.id}</div>
                                </div>
                                <div className="w-full sm:w-72 space-y-2 text-sm font-data">
                                    <div className="flex justify-between text-slate-600"><span className="kanit-text">รวมเป็นเงิน</span><span className="font-semibold">{formatCurrency(selectedHistoryTxn.subtotal)}</span></div>
                                    {selectedHistoryTxn.discountAmount > 0 && (
                                        <div className="flex justify-between text-rose-500"><span className="kanit-text">ส่วนลด {selectedHistoryTxn.discountType === 'percent' ? `(${selectedHistoryTxn.discountValue}%)` : ''}</span><span className="font-semibold">- {formatCurrency(selectedHistoryTxn.discountAmount)}</span></div>
                                    )}
                                    {selectedHistoryTxn.vatAmount > 0 && (
                                        <div className="flex justify-between text-slate-600"><span className="kanit-text">ภาษี ({selectedHistoryTxn.taxMode === 'include' ? 'รวม' : 'แยก'})</span><span className="font-semibold">{formatCurrency(selectedHistoryTxn.vatAmount)}</span></div>
                                    )}
                                    <div className="h-px bg-slate-200/60 my-2"></div>
                                    <div className="flex justify-between items-end text-xl sm:text-2xl font-black text-sky-600 kanit-text"><span className="text-base sm:text-lg">ยอดสุทธิ</span><span className="font-data tracking-tight">{formatCurrency(selectedHistoryTxn.grandTotal)}</span></div>
                                </div>
                            </div>
                         </div>
                    </div>
                ) : posHistoryData && posHistoryData.length > 0 ? (
                    // --- Existing List View ---
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden m-4 sm:m-0">
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto overflow-y-hidden">
                            <table className="table-auto w-full text-left border-collapse min-w-[700px]">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wide kanit-text"><th className="w-[19%] p-4 font-bold">วันที่/เวลา</th><th className="w-[16%] p-4 font-bold">เลขที่บิล</th><th className="w-[16%] p-4 font-bold">ลูกค้า</th><th className="w-[19%] p-4 font-bold text-right">ยอดรวม</th><th className="w-[16%] p-4 font-bold text-center">วิธีชำระ</th><th className="w-[14%] p-4 font-bold text-center">สถานะ</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {/* ใช้ .slice เพื่อจำกัดจำนวนการแสดงผลแบบ Infinite Scroll */}
                                    {posHistoryData.slice(0, visibleHistoryCount).map((txn, idx) => (
                                        <tr key={txn.id || idx} onClick={() => handleViewHistoryTxn(txn)} className="hover:bg-sky-50/50 cursor-pointer transition-colors font-data text-sm space-row-animation group" style={{ animationDelay: `${(idx % 25) * 30}ms` }}>
                                            <td className="p-4 text-slate-600">{formatDateTime(txn.createdAt)}</td>
                                            <td className="p-4 font-bold text-sky-600 kanit-text group-hover:text-sky-700">{txn.id}</td>
                                            <td className="p-4 text-slate-800 kanit-text font-medium">{txn.patientName || '-'}</td>
                                            <td className="p-4 font-bold text-slate-800 text-right">{formatCurrency(txn.grandTotal)}</td>
                                            <td className="p-4 text-center">
                                                <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg kanit-text font-semibold flex items-center justify-center gap-1.5 w-fit mx-auto border border-slate-200 shadow-sm">
                                                    {txn.paymentMethod === 'cash' ? <><Banknote size={12}/> เงินสด</> : txn.paymentMethod === 'transfer' ? <><QrCode size={12}/> โอนเงิน</> : txn.paymentMethod === 'credit' ? <><CreditCard size={12}/> บัตรเครดิต</> : txn.paymentMethod}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full kanit-text ${txn.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : txn.status === 'cancelled' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
                                                    {txn.status === 'completed' ? 'สำเร็จ' : txn.status === 'cancelled' ? 'ยกเลิก' : txn.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {isHistoryLoadingMore && Array.from({ length: 3 }).map((_, idx) => (
                                        <tr key={`skel-hist-more-${idx}`} className="border-b border-slate-50"><td className="p-4"><div className="h-4 w-full max-w-[128px] bg-slate-200 rounded animate-pulse"></div></td><td className="p-4"><div className="h-4 w-full max-w-[96px] bg-slate-200 rounded animate-pulse"></div></td><td className="p-4"><div className="h-4 w-full max-w-[160px] bg-slate-200 rounded animate-pulse"></div></td><td className="p-4"><div className="h-4 w-full max-w-[80px] bg-slate-200 rounded animate-pulse ml-auto"></div></td><td className="p-4"><div className="h-6 w-full max-w-[64px] bg-slate-200 rounded-lg animate-pulse mx-auto"></div></td><td className="p-4"><div className="h-6 w-full max-w-[64px] bg-slate-200 rounded-full animate-pulse mx-auto"></div></td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Mobile Card View */}
                        <div className="md:hidden flex flex-col divide-y divide-slate-100 bg-slate-50/50">
                            {posHistoryData.slice(0, visibleHistoryCount).map((txn, idx) => (
                                <div key={txn.id || idx} onClick={() => handleViewHistoryTxn(txn)} className="p-4 bg-white hover:bg-sky-50/50 cursor-pointer transition-colors space-row-animation active:scale-[0.98]" style={{ animationDelay: `${(idx % 25) * 30}ms` }}>
                                    <div className="flex justify-between items-start mb-2.5">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-sky-600 kanit-text text-sm bg-sky-50 px-2 py-0.5 rounded-md w-fit">{txn.id}</span>
                                            <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 font-data"><Clock size={12}/> {formatDateTime(txn.createdAt)}</div>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md kanit-text shrink-0 ${txn.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : txn.status === 'cancelled' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
                                            {txn.status === 'completed' ? 'สำเร็จ' : txn.status === 'cancelled' ? 'ยกเลิก' : txn.status}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-end mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <div className="flex flex-col gap-1">
                                            <div className="text-xs font-semibold text-slate-400 kanit-text">ลูกค้า</div>
                                            <div className="text-sm font-bold text-slate-700 kanit-text line-clamp-1">{txn.patientName || '-'}</div>
                                        </div>
                                        <div className="text-right flex flex-col gap-1 shrink-0">
                                            <div className="text-[10px] text-slate-400 kanit-text font-semibold flex items-center justify-end gap-1.5">
                                                {txn.paymentMethod === 'cash' ? <Banknote size={12}/> : txn.paymentMethod === 'transfer' ? <QrCode size={12}/> : <CreditCard size={12}/>}
                                                {txn.paymentMethod === 'cash' ? 'เงินสด' : txn.paymentMethod === 'transfer' ? 'โอนเงิน' : txn.paymentMethod === 'credit' ? 'บัตรเครดิต' : txn.paymentMethod}
                                            </div>
                                            <div className="font-black text-sky-600 font-data text-lg leading-none">{formatCurrency(txn.grandTotal)}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isHistoryLoadingMore && Array.from({ length: 3 }).map((_, idx) => (
                                <div key={`skel-mob-${idx}`} className="p-4 bg-white flex flex-col gap-3 border-b border-slate-100">
                                    <div className="flex justify-between"><div className="h-5 w-full max-w-[96px] bg-slate-200 rounded animate-pulse"></div><div className="h-5 w-full max-w-[64px] bg-slate-200 rounded-md animate-pulse"></div></div>
                                    <div className="flex justify-between items-end mt-2"><div className="h-4 w-full max-w-[128px] bg-slate-200 rounded animate-pulse"></div><div className="h-6 w-full max-w-[80px] bg-slate-200 rounded animate-pulse"></div></div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 min-h-[300px] p-6">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 shadow-inner">
                            <Receipt size={32} className="text-slate-300" />
                        </div>
                        <p className="kanit-text font-bold text-lg text-slate-500 mb-1">ยังไม่มีข้อมูลประวัติการขาย</p>
                        <p className="text-sm kanit-text">รายการบิลที่ชำระเงินสำเร็จจะแสดงที่นี่</p>
                    </div>
                )}
            </div>
            
            {/* ซ่อนปุ่มปิดด้านล่างเมื่ออยู่ในโหมดดูรายละเอียด เพราะมีปุ่ม Back ด้านบนแล้ว */}
            {!selectedHistoryTxn && (
                <div className="p-3 sm:p-4 border-t border-slate-100 bg-white text-right shrink-0 z-10">
                    <button onClick={closeHistoryModal} className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold kanit-text hover:bg-slate-200 transition-colors">ปิดหน้าต่าง</button>
                </div>
            )}
          </div>
        </div>
      )}

      {/* Modal และ Alert จัดการสินค้าถูกย้ายไปยัง CatalogManager แล้ว */}
      
      
    </>
  );
};

export default POSSystem;


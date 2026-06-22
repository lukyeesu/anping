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

const MedicalRecords = ({ patientsData, setPatientsData, currentBranch, branchesData = [], staffData = [], callAppScript, showToast, isGlobalLoading, posProducts = [], showGlobalAlert, globalAlert, setPdpaQrModal, currentUser }) => {
  // --- 1. State Declarations ---
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingPdpaHn, setProcessingPdpaHn] = useState(null);
  const medModal = useModal();
  const [editingId, setEditingId] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // --- States สำหรับระบบสแกนบัตร ปชช. ---
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = React.useRef(null);

  const [showPrefixDropdown, setShowPrefixDropdown] = useState(false); // State ควบคุม Dropdown คำนำหน้า
  const [showDoctorSuggest, setShowDoctorSuggest] = useState(false); // State ควบคุม Dropdown ค้นหาแพทย์

  // --- [NEW] State สำหรับระบบจดจำแพทย์ที่เลือกล่าสุด (Recent Doctors) ---
  const [recentDoctors, setRecentDoctors] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('clinic_recent_doctors');
        if (saved) return JSON.parse(saved);
    }
    return [];
  });

  // บันทึก Recent Doctors ลง Local Storage เมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('clinic_recent_doctors', JSON.stringify(recentDoctors));
    }
  }, [recentDoctors]);

  // --- [NEW] State สำหรับระบบจดจำการรักษาล่าสุด (Recent Treatments) ---
  const [recentTreatments, setRecentTreatments] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('clinic_recent_treatments');
        if (saved) return JSON.parse(saved);
    }
    return [];
  });

  // บันทึก Recent Treatments ลง Local Storage เมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('clinic_recent_treatments', JSON.stringify(recentTreatments));
    }
  }, [recentTreatments]);

  // ฟังก์ชันจัดการเมื่อเลือกแพทย์
  const handleSelectDoctor = (doctorName) => {
    setNewOpdRecord({...newOpdRecord, doctor: doctorName});
    setShowDoctorSuggest(false);
    
    // อัปเดตรายชื่อแพทย์ล่าสุด (เอาไปไว้บนสุด และจำกัดแค่ 3 ชื่อ)
    setRecentDoctors(prev => {
        const newRecents = [doctorName, ...prev.filter(name => name !== doctorName)].slice(0, 3);
        return newRecents;
    });
  };

  // ฟังก์ชันจัดการเมื่อเลือกการรักษา
  const handleSelectTreatment = (treatmentName, txIndex) => {
    const updatedTx = [...newOpdRecord.tx];
    updatedTx[txIndex] = treatmentName;
    setNewOpdRecord({...newOpdRecord, tx: updatedTx});
    setOpenTxDropdownIndex(null);
    
    // อัปเดตรายการรักษาล่าสุด (เอาไปไว้บนสุด และจำกัดแค่ 5 ชื่อ)
    setRecentTreatments(prev => {
        const newRecents = [treatmentName, ...prev.filter(name => name !== treatmentName)].slice(0, 5);
        return newRecents;
    });
  };

  // --- จำลองระบบ Login User (ดึงจาก Auth Context ในระบบจริง) ---
  // ทดสอบระบบ: หากต้องการทดสอบว่าเป็นแพทย์ ให้เปลี่ยน role เป็น 'doctor', name: 'พญ. ใจดี'
  // currentUser ถูกส่งมาจาก props ในคอมโพเนนต์หลักแล้ว 

  const headerRef = React.useRef(null);
  const filterRef = React.useRef(null); // --- [NEW] เพิ่ม Ref สำหรับ Filter เพื่อให้มันขยายตัวได้ ---

  // --- 2. Derived State (Memos & Filtering) ---
  const stats = useMemo(() => {
    let total = patientsData.length;
    let newThisMonth = 0;
    let male = 0;
    let female = 0;
    let visitedToday = 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const todayStr = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()+543}`;

    patientsData.forEach(p => {
      // ผู้ป่วยใหม่เดือนนี้
      if (p.createdAt) {
        const createdDate = new Date(p.createdAt);
        if (createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear) {
          newThisMonth++;
        }
      }
      
      // สถิติเพศ
      if (p.gender === 'ชาย') male++;
      else if (p.gender === 'หญิง') female++;

      // รับบริการวันนี้ (เช็คจากประวัติ OPD)
      if (p.opdRecords && p.opdRecords.length > 0) {
        const lastOpdDate = p.opdRecords[0].datetime.split(' ')[0];
        if (lastOpdDate === todayStr) {
          visitedToday++;
        }
      }
    });

    return { total, newThisMonth, male, female, visitedToday };
  }, [patientsData]);

  const filteredPatients = useMemo(() => {
    return patientsData.filter(p => {
      const s = search.toLowerCase();
      // ค้นหาให้ครอบคลุม (Case-insensitive)
      return ((p.firstName && p.firstName.toLowerCase().includes(s)) || (p.lastName && p.lastName.toLowerCase().includes(s)) || (p.id && p.id.toLowerCase().includes(s)) || (p.hn && p.hn.toLowerCase().includes(s)) || (p.idCard && p.idCard.includes(s)) || (p.phone && p.phone.includes(s)));
    });
  }, [patientsData, search]);

  const sortedPatients = useMemo(() => {
    let sortableItems = [...filteredPatients];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key] || '', bValue = b[sortConfig.key] || '';
        if (sortConfig.key === 'id') {
            aValue = a.id || a.hn || '';
            bValue = b.id || b.hn || '';
        }
        if (sortConfig.key === 'age') {
            aValue = a.dob ? a.dob.split('/').reverse().join('') : '';
            bValue = b.dob ? b.dob.split('/').reverse().join('') : '';
        }
        if (sortConfig.key === 'lastVisit') {
            const getIsoDateStr = (p) => {
                const dt = p.opdRecords && p.opdRecords.length > 0 ? p.opdRecords[0].datetime : (p.lastVisit || '');
                if (!dt) return '';
                const parts = dt.split(' ')[0].split('/');
                return parts.length === 3 ? `${parts[2]}${parts[1]}${parts[0]}` : dt;
            };
            aValue = getIsoDateStr(a);
            bValue = getIsoDateStr(b);
        }
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredPatients, sortConfig]);

  // สั่งให้เปิดกล้องจริงเมื่อเปิดหน้าต่างสแกน
  useEffect(() => {
    let active = true;
    let stream = null;
    if (isScannerOpen && navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(s => {
          if (!active) {
            s.getTracks().forEach(track => track.stop());
            return;
          }
          stream = s;
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch(err => {
          console.log("ไม่สามารถเปิดกล้องได้:", err);
          showToast('อุปกรณ์ไม่รองรับ หรือไม่ได้อนุญาตให้ใช้กล้อง', 'warning');
        });
    }
    return () => {
      active = false;
      if (videoRef.current) {
          try { videoRef.current.srcObject = null; } catch (e) {}
      }
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [isScannerOpen]);

  const initialFormState = {
    hn: '', prefix: '', firstName: '', lastName: '', nickname: '', dob: '', gender: '', idCard: '', nationality: 'ไทย', ethnicity: 'ไทย', religion: 'พุทธ', occupation: '',
    address: '', moo: '', road: '', subDistrict: '', district: '', province: '', zipcode: '', 
    curAddress: '', curMoo: '', curRoad: '', curSubDistrict: '', curDistrict: '', curProvince: '', curZipcode: '', 
    phones: [''], emName: '', emRelation: '', emPhone: '', emAddress: '', 
    bloodGroup: '', chiefComplaint: '', allergies: '', underlyingDisease: '', createdAt: '', opdRecords: [],
    courses: []
  };
  
  const [formData, setFormData] = useState(initialFormState);
  
  const initialOpdState = { datetime: '', doctor: '', branchId: '', temp: '', pulse: '', bp: '', weight: '', height: '', cc: '', dx: '', tx: [''], advice: '', note: '' };
  const [showOpdForm, setShowOpdForm] = useState(false);
  const [isClosingOpdForm, setIsClosingOpdForm] = useState(false);
  const [newOpdRecord, setNewOpdRecord] = useState(initialOpdState);
  const [editingOpdIndex, setEditingOpdIndex] = useState(null);
  const [openTxDropdownIndex, setOpenTxDropdownIndex] = useState(null); 

  const [showCalendar, setShowCalendar] = useState(false);
  const [calDate, setCalDate] = useState(new Date());
  const [calView, setCalView] = useState('days'); 
  const [yearPageStart, setYearPageStart] = useState(0);
  const [calendarPos, setCalendarPos] = useState({ top: 0, left: 0 });

  const [showOpdCalendar, setShowOpdCalendar] = useState(false);
  const [opdCalDate, setOpdCalDate] = useState(new Date());
  const [opdCalView, setOpdCalView] = useState('days');
  const [opdYearPageStart, setOpdYearPageStart] = useState(0);
  const [opdTime, setOpdTime] = useState({ h: '08', m: '00' });
  const [opdCalendarPos, setOpdCalendarPos] = useState({ top: 0, left: 0 });

  const [isModalClosing, setIsModalClosing] = useState(false);
  const [isCalendarClosing, setIsCalendarClosing] = useState(false);
  const [isOpdCalendarClosing, setIsOpdCalendarClosing] = useState(false);
      // Fix: Use refs instead of direct DOM manipulation
  const dobWrapperRef = React.useRef(null);
  const opdWrapperRef = React.useRef(null);
  const opdSectionRef = React.useRef(null);
  const opdFormSectionRef = React.useRef(null);

  const closeMedModal = () => { medModal.close(); };
  const closeMedCalendar = () => { setIsCalendarClosing(true); setTimeout(() => { setShowCalendar(false); setIsCalendarClosing(false); }, 300); };
  const closeMedOpdCalendar = () => { setIsOpdCalendarClosing(true); setTimeout(() => { setShowOpdCalendar(false); setIsOpdCalendarClosing(false); }, 300); };
    const medCalSwipeProps = useSwipeDown(closeMedCalendar);
  const medOpdCalSwipeProps = useSwipeDown(closeMedOpdCalendar);

  // --- ฟังก์ชันจัดการเบอร์โทรศัพท์แบบไดนามิก ---
  const handlePatientPhoneChange = (index, value) => {
    const newPhones = [...formData.phones];
    newPhones[index] = value;
    setFormData({ ...formData, phones: newPhones });
  };
  const addPatientPhone = () => setFormData({ ...formData, phones: [...formData.phones, ''] });
  const removePatientPhone = (index) => setFormData({ ...formData, phones: formData.phones.filter((_, i) => i !== index) });

  // --- ฟังก์ชันคัดลอกที่อยู่ ---
  const copyAddressToCurrent = () => {
    setFormData({
      ...formData,
      curAddress: formData.address,
      curMoo: formData.moo,
      curRoad: formData.road,
      curSubDistrict: formData.subDistrict,
      curDistrict: formData.district,
      curProvince: formData.province,
      curZipcode: formData.zipcode
    });
  };

  // --- ฟังก์ชันเชื่อมต่อ Google Cloud Vision API (OCR) ของจริง ---
  const captureImageToBase64 = () => {
    const video = videoRef.current;
    if (!video) return null;
    // สร้าง Canvas จำลองเพื่อแคปภาพจากวิดีโอ
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    // แปลงเป็น Base64
    const dataUrl = canvas.toDataURL('image/jpeg');
    return dataUrl.split(',')[1]; // ตัดส่วน header data:image/jpeg;base64, ออก
  };

  const parseIdCardText = (text) => {
    const lines = text.split('\n').map(line => line.trim());
    
    // เตรียมตัวแปรให้ครบทุกช่องตามที่คุณต้องการ (เพิ่ม gender และ road)
    let extractedData = { idCard: '', prefix: '', firstName: '', lastName: '', dob: '', gender: '', address: '', moo: '', road: '', subDistrict: '', district: '', province: '' };

    // 1. หาเลขบัตรประชาชน 13 หลัก
    const idMatch = text.replace(/\s/g, '').match(/\d{13}/);
    if (idMatch) extractedData.idCard = idMatch[0];

    // 2. หาชื่อ-นามสกุลไทย และ วิเคราะห์เพศ
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('ชื่อตัวและชื่อสกุล') || line.match(/^(นาย|นาง|นางสาว|น\.ส\.|ด\.ช\.|ด\.ญ\.)/)) {
            let nameLine = line.replace('ชื่อตัวและชื่อสกุล', '').trim();
            if (!nameLine && i + 1 < lines.length) nameLine = lines[i+1].trim();
            
            const prefixMatch = nameLine.match(/^(นาย|นางสาว|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.)/);
            if (prefixMatch) {
                let rawPrefix = prefixMatch[1];
                // แปลงตัวย่อ น.ส. เป็นคำเต็ม
                if (rawPrefix === 'น.ส.') rawPrefix = 'นางสาว';
                extractedData.prefix = rawPrefix;

                // กำหนดเพศอัตโนมัติจากคำนำหน้า
                if (['นาย', 'ด.ช.'].includes(rawPrefix)) {
                    extractedData.gender = 'ชาย';
                } else if (['นาง', 'นางสาว', 'ด.ญ.'].includes(rawPrefix)) {
                    extractedData.gender = 'หญิง';
                }

                const nameParts = nameLine.substring(prefixMatch[0].length).trim().split(/\s+/);
                if (nameParts.length >= 1) extractedData.firstName = nameParts[0];
                if (nameParts.length >= 2) extractedData.lastName = nameParts.slice(1).join(' ');
            }
            break;
        }
    }

    // 3. หาวันเกิด
    const dobMatch = text.match(/(?:เกิดวันที่|Date of Birth|เกิด)\s*(\d{1,2})\s+([ก-๙a-zA-Z.]+)\s+(\d{4})/);
    if (dobMatch) {
        const day = dobMatch[1].padStart(2, '0');
        const monthStr = dobMatch[2];
        const year = dobMatch[3];
        const thaiMonthsMap = {
            'ม.ค.': '01', 'มกราคม': '01', 'ก.พ.': '02', 'กุมภาพันธ์': '02', 'มี.ค.': '03', 'มีนาคม': '03', 'เม.ย.': '04', 'เมษายน': '04',
            'พ.ค.': '05', 'พฤษภาคม': '05', 'มิ.ย.': '06', 'มิถุนายน': '06', 'ก.ค.': '07', 'กรกฎาคม': '07', 'ส.ค.': '08', 'สิงหาคม': '08',
            'ก.ย.': '09', 'กันยายน': '09', 'ต.ค.': '10', 'ตุลาคม': '10', 'พ.ย.': '11', 'พฤศจิกายน': '11', 'ธ.ค.': '12', 'ธันวาคม': '12'
        };
        let month = '01';
        for (const [key, value] of Object.entries(thaiMonthsMap)) {
            if (monthStr.includes(key)) { month = value; break; }
        }
        extractedData.dob = `${day}/${month}/${year}`;
    }

    // 4. หาศาสนาและสัญชาติ (เพิ่มระบบสแกนข้อมูลส่วนนี้)
    const religionMatch = text.match(/ศาสนา\s*([ก-๙]+)/);
    if (religionMatch) {
        extractedData.religion = religionMatch[1].trim();
    }
    
    const nationalityMatch = text.match(/สัญชาติ\s*([ก-๙]+)/);
    if (nationalityMatch) {
        extractedData.nationality = nationalityMatch[1].trim();
    }

    // 5. หาที่อยู่แบบแม่นยำสูง (แยกส่วนด้วย Regex)
    const addressIndex = lines.findIndex(line => line.includes('ที่อยู่') || line.includes('Address'));
    if (addressIndex !== -1) {
        // รวบรวมข้อความที่อยู่ทั้งหมดเข้าด้วยกันก่อน
        let addressText = lines[addressIndex].replace(/ที่อยู่|Address/g, '').trim();
        let lineOffset = 1;
        while (addressIndex + lineOffset < lines.length) {
            const nextLine = lines[addressIndex + lineOffset];
            // หยุดเมื่อเจอฟิลด์อื่นที่ไม่ใช่ที่อยู่
            if (nextLine.includes('ศาสนา') || nextLine.match(/\d{13}/) || nextLine.includes('วันออกบัตร') || nextLine.includes('Date of Issue')) {
                break;
            }
            addressText += ' ' + nextLine.trim();
            lineOffset++;
        }
        
        // ลบช่องว่างส่วนเกิน
        addressText = addressText.replace(/\s+/g, ' ').trim();

        // สกัดข้อมูลแต่ละส่วน
        let provMatch = addressText.match(/(?:จังหวัด|จ\.)\s*([^\s]+)/);
        if (provMatch) extractedData.province = provMatch[1];

        let distMatch = addressText.match(/(?:อำเภอ|เขต|อ\.)\s*([^\s]+)/);
        if (distMatch) extractedData.district = distMatch[1];

        let subDistMatch = addressText.match(/(?:ตำบล|แขวง|ต\.)\s*([^\s]+)/);
        if (subDistMatch) extractedData.subDistrict = subDistMatch[1];

        // เพิ่มการหา "ถนน"
        let roadMatch = addressText.match(/(?:ถนน|ถ\.)\s*([^\s]+)/);
        if (roadMatch) extractedData.road = roadMatch[1];

        let mooMatch = addressText.match(/หมู่(?:ที่)?\s*([^\s]+)/);
        if (mooMatch) extractedData.moo = mooMatch[1];

        // "บ้านเลขที่" คือส่วนแรกสุดก่อนที่จะถึงคำระบุโซน
        let houseMatch = addressText.split(/\s+(หมู่|ซอย|ตรอก|ถนน|ตำบล|แขวง|อำเภอ|เขต|จังหวัด)/)[0];
        if (houseMatch) {
            extractedData.address = houseMatch.replace(/^ที่อยู่\s*/, '').trim();
        }
    }

    setIsScannerOpen(false);
    setTimeout(() => {
        setFormData(prev => ({ ...prev, ...extractedData }));
        showToast('ดึงข้อมูลจากบัตรประชาชน (OCR) สำเร็จ', 'success');
    }, 300);
  };

  const handleRealScan = async () => {

    const base64Image = captureImageToBase64();
    if (!base64Image) {
        showToast('ไม่สามารถจับภาพจากกล้องได้', 'warning');
        return;
    }

    // Freeze the video frame to prevent GPU compositing flickers on mobile
    if (videoRef.current) {
        try { videoRef.current.pause(); } catch (e) { console.log(e); }
    }

    setIsScanning(true);

    try {
        const response = await fetch('/api/vision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requests: [{
                    image: { content: base64Image },
                    features: [{ type: 'DOCUMENT_TEXT_DETECTION' }]
                }]
            })
        });

        const data = await response.json();
        
        if (data.error) {
            console.error("API Error:", data.error);
            showToast(`API Error: ${data.error.message}`, 'danger');
            if (videoRef.current) { try { videoRef.current.play(); } catch (e) {} }
        } else if (data.responses && data.responses[0] && data.responses[0].fullTextAnnotation) {
            const text = data.responses[0].fullTextAnnotation.text;
            parseIdCardText(text); // โยนข้อความที่อ่านได้เข้าฟังก์ชันสกัดข้อมูล
        } else {
            showToast('ไม่พบข้อความบนบัตร กรุณาจัดบัตรให้อยู่ในกรอบ แสงสว่างเพียงพอ และสแกนใหม่', 'warning');
            if (videoRef.current) { try { videoRef.current.play(); } catch (e) {} }
        }
    } catch (error) {
        console.error("OCR Request Error:", error);
        showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ Google Cloud Vision API', 'danger');
        if (videoRef.current) { try { videoRef.current.play(); } catch (e) {} }
    } finally {
        setIsScanning(false);
    }
  };

  // --- ฟังก์ชันเชื่อมต่อกับโปรแกรมตัวกลางอ่านบัตร (Smart Card Reader) บน Localhost ---
  const handleSmartCardRead = async () => {
    setIsProcessing(true);
    try {
        // ยิง API ไปหาโปรแกรมตัวกลางในเครื่อง (Port 8181 หรือตามที่โปรแกรมตัวกลางกำหนด)
        // หมายเหตุ: ต้องมีโปรแกรม Agent รันอยู่ที่เครื่องคอมพิวเตอร์ของผู้ใช้
        const response = await fetch('http://localhost:8181/api/read-card', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            // ใส่ timeout ป้องกันการรอนานเกินไปหากไม่ได้เปิดโปรแกรมตัวกลาง
            signal: AbortSignal.timeout(5000) 
        });

        if (!response.ok) {
            throw new Error('ไม่สามารถอ่านบัตรได้ กรุณาเสียบบัตรให้แน่น');
        }

        const data = await response.json();
        
        // ตัวอย่างการ Map ข้อมูลที่ได้จากโปรแกรมตัวกลาง (Format ขึ้นอยู่กับโปรแกรม Agent ที่ใช้)
        // สมมติว่า Agent ส่ง JSON กลับมาเป็น { pid, titleName, fname, lname, dob, address... }
        setFormData(prev => ({
            ...prev,
            idCard: data.pid || data.citizenId || '',
            prefix: data.titleName || data.titleTH || '',
            firstName: data.fname || data.firstNameTH || '',
            lastName: data.lname || data.lastNameTH || '',
            dob: data.dob ? `${data.dob.substring(6,8)}/${data.dob.substring(4,6)}/${data.dob.substring(0,4)}` : '', // แปลง YYYYMMDD เป็น DD/MM/YYYY
            gender: data.gender === '1' || data.gender === 'Male' ? 'ชาย' : (data.gender === '2' || data.gender === 'Female' ? 'หญิง' : 'ไม่ระบุ'),
            religion: data.religion || prev.religion, // <-- เพิ่มบรรทัดนี้เพื่ออัปเดตศาสนา
            address: data.address || data.houseNo || '',
            moo: data.moo || '',
            subDistrict: data.subDistrict || data.tumbol || '',
            district: data.district || data.amphur || '',
            province: data.province || '',
        }));

        showToast('ดึงข้อมูลจากบัตรประชาชนสำเร็จ', 'success');

    } catch (error) {
        console.error("Smart Card Reader Error:", error);
        if (error.name === 'TimeoutError' || error.message === 'Failed to fetch') {
            showToast('เชื่อมต่อเครื่องอ่านไม่ได้: ตรวจสอบว่าเปิดโปรแกรมอ่านบัตร (Agent) แล้วหรือยัง', 'danger');
        } else {
            showToast(`ไม่สามารถอ่านบัตรได้: ${error.message}`, 'warning');
        }
    } finally {
        setIsProcessing(false);
    }
  };

  // --- Constants ---
  const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  // --- 2. Helper Functions ---
  const handleDobChange = (e) => {
    // Fix: Prevent cursor jump on delete
    if (e.nativeEvent && e.nativeEvent.inputType && e.nativeEvent.inputType.includes('delete')) {
        setFormData({ ...formData, dob: e.target.value });
        return;
    }
    let value = e.target.value.replace(/\D/g, ''); 
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 4) value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
    else if (value.length > 2) value = `${value.slice(0, 2)}/${value.slice(2)}`;
    setFormData({ ...formData, dob: value });
  };

  const requestSort = (key) => setSortConfig({ key, direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc' });

  // เพิ่มฟังก์ชันพิมพ์เวชระเบียนเพื่อให้สามารถเรียกใช้งานได้ทั้งบน Desktop และ Mobile
  const handlePrintRecord = (patient) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showToast('เบราว์เซอร์บล็อกการเปิดหน้าต่างพิมพ์ กรุณาอนุญาต Pop-ups', 'warning');
        return;
    }

    try {
        const html = globalGenerateRecordHtml(patient, branchesData, currentBranch);
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
            if (printWindow.print) printWindow.print();
        }, 500);
    } catch (e) {
        console.error("Print Error:", e);
        showToast("เกิดข้อผิดพลาดในการพิมพ์: " + e.message, "error");
    }
  };

  const handlePrintInformedConsent = (patient) => {
    console.log("handlePrintInformedConsent called with patient:", patient);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showToast('เบราว์เซอร์บล็อกการเปิดหน้าต่างพิมพ์ กรุณาอนุญาต Pop-ups', 'warning');
        return;
    }

    try {
        const html = globalGenerateInformedConsentHtml(patient, branchesData, currentBranch);
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
            if (printWindow.print) printWindow.print();
        }, 500);
    } catch (e) {
        console.error("Print Error:", e);
        showToast("เกิดข้อผิดพลาดในการพิมพ์: " + e.message, "danger");
    }
  };

  // --- 3. Derived State (Memos & Filtering) ---
  const calculatedAge = useMemo(() => getAgeString(formData.dob), [formData.dob]);
  const blankDays = Array.from({ length: new Date(calDate.getFullYear(), calDate.getMonth(), 1).getDay() }, (_, i) => i);
  const monthDays = Array.from({ length: new Date(calDate.getFullYear(), calDate.getMonth() + 1, 0).getDate() }, (_, i) => i + 1);


  useEffect(() => {
    setVisibleCount(20);
    setIsLoadingMore(false);
  }, [search, sortConfig, currentBranch]);

  // --- 4. Effects & Infinity Scroll Logic ---
  useEffect(() => {
    // Fix: Use ID instead of element selector
    const mainElement = document.getElementById('main-scroll-container');
    if (!mainElement) return;

    const handleScroll = rAFThrottle((e) => {
      // ป้องกันไม่ให้คำนวณและอัปเดต ถ้า Component ถูกซ่อนอยู่
      if (!headerRef.current || headerRef.current.offsetHeight === 0) return;

      const target = e.target || mainElement;
      const { scrollTop, scrollHeight, clientHeight } = target;
      
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
          
          if (filterRect.top <= headerRect.bottom + 5) {
              filterRef.current.classList.add('is-scrolled');
          } else {
              filterRef.current.classList.remove('is-scrolled');
          }
      }
      
      // เช็คว่าเลื่อนลงมาเกือบถึงล่างสุดหรือยัง (เหลืออีก 100px)
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        if (visibleCount < sortedPatients.length && !isLoadingMore) {
           setIsLoadingMore(true);
           setTimeout(() => {
              setVisibleCount(prev => prev + 10);
              setIsLoadingMore(false);
           }, 1000);
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
  }, [visibleCount, sortedPatients.length, isLoadingMore]);

  useEffect(() => {
    if (calView === 'years') setYearPageStart(Math.floor((calDate.getFullYear() + 543) / 12) * 12);
  }, [calView, calDate]);

  useEffect(() => {
    if (opdCalView === 'years') setOpdYearPageStart(Math.floor((opdCalDate.getFullYear() + 543) / 12) * 12);
  }, [opdCalView, opdCalDate]);

  // --- 5. Event Handlers ---
  const handleOpenCalendar = () => {
    if (dobWrapperRef.current) {
      const rect = dobWrapperRef.current.getBoundingClientRect();
      setCalendarPos({ top: rect.bottom, left: rect.left });
    }
    if (formData.dob?.length === 10) {
      const parts = formData.dob.split('/');
      const y = parseInt(parts[2], 10) - 543;
      if (!isNaN(y)) setCalDate(new Date(y, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10)));
      else setCalDate(new Date());
    } else setCalDate(new Date());
    setCalView('days');
    setShowCalendar(true);
  };

  const handlePrevMonth = () => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1));
  const handleSelectDate = (day) => {
    setFormData({ ...formData, dob: `${String(day).padStart(2, '0')}/${String(calDate.getMonth() + 1).padStart(2, '0')}/${calDate.getFullYear() + 543}` });
    closeMedCalendar();
  };

  const handleOpenEdit = (patient, isView = false) => {
    setEditingId(patient.id || patient.hn);

    // ใช้ฟังก์ชันอัจฉริยะวิเคราะห์ชื่อเผื่อข้อมูลในอดีตไม่มีการแยกช่องมาให้
    const parsed = parsePatientName(patient.name || '');

    // รองรับข้อมูลเบอร์โทรศัพท์จากระบบเก่า (phone1, phone2, หรือ phone แบบ string)
    let loadedPhones = [''];
    if (patient.phones && Array.isArray(patient.phones) && patient.phones.length > 0) {
      loadedPhones = patient.phones;
    } else if (patient.phone1 || patient.phone2) {
      loadedPhones = [patient.phone1, patient.phone2].filter(Boolean);
    } else if (patient.phone) {
      loadedPhones = Array.isArray(patient.phone) ? patient.phone : [patient.phone];
    }
    if (loadedPhones.length === 0) loadedPhones = [''];
    
    setFormData({ 
      ...initialFormState, ...patient, hn: patient.hn || patient.id,
      prefix: patient.prefix || parsed.prefix,
      firstName: patient.firstName || parsed.firstName, 
      lastName: patient.lastName || parsed.lastName, 
      gender: patient.gender || parsed.gender,
      phones: loadedPhones,
      createdAt: patient.createdAt || new Date().toISOString(), opdRecords: patient.opdRecords || []
    });
    setShowOpdForm(false); setEditingOpdIndex(null); setIsViewMode(isView); medModal.open();
    
    // เปลี่ยนเงื่อนไขให้เลื่อนลงไปที่ประวัติการรักษาเฉพาะตอนที่เข้ามาเพื่อดูรายละเอียด (isView = true) เท่านั้น
    if (isView) {
      setTimeout(() => {
        if (opdSectionRef.current) {
          opdSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    // Fix: Don't generate HN yet to prevent race condition, do it on save
    setFormData({ ...initialFormState, hn: '', createdAt: new Date().toISOString(), opdRecords: [] });
    setShowOpdForm(false); setEditingOpdIndex(null); setIsViewMode(false); medModal.open();
  };

  const handleOpenOpdCalendar = () => {
    if (opdWrapperRef.current) {
      const rect = opdWrapperRef.current.getBoundingClientRect();
      setOpdCalendarPos({ top: rect.bottom, left: rect.left });
    }

    const dtStr = newOpdRecord.datetime;
    const now = new Date();
    let d = now.getDate(), m = now.getMonth(), y = now.getFullYear();
    let h = String(now.getHours()).padStart(2, '0'), min = String(now.getMinutes()).padStart(2, '0');
    
    if (dtStr) {
      const parts = dtStr.split(' ');
      if (parts.length >= 2) {
          const dateParts = parts[0].split('/');
          if(dateParts.length === 3) {
              d = parseInt(dateParts[0], 10);
              m = parseInt(dateParts[1], 10) - 1;
              y = parseInt(dateParts[2], 10) - 543;
          }
          const timeParts = parts[1].split(':');
          if(timeParts.length === 2) {
              h = timeParts[0];
              min = timeParts[1].replace('น.', '').trim();
          }
      }
    }
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) setOpdCalDate(new Date(y, m, d));
    else setOpdCalDate(now);
    
    setOpdTime({ h, m: min });
    setOpdCalView('days');
    setShowOpdCalendar(true);
  };

  // --- เพิ่มฟังก์ชันสำหรับพิมพ์ใบประวัติการรักษา (OPD) ---
  const handlePrintOpdRecord = (record, index) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showToast('เบราว์เซอร์บล็อกการเปิดหน้าต่างพิมพ์ กรุณาอนุญาต Pop-ups', 'warning');
        return;
    }

    try {
        const visitNumber = (formData.opdRecords ? formData.opdRecords.length : 1) - index;
        const html = globalGenerateOpdHtml(formData, record, visitNumber, branchesData, currentBranch);

        printWindow.document.write(html);
        printWindow.document.close();

        setTimeout(() => {
            if (printWindow.print) printWindow.print();
        }, 500);
    } catch (e) {
        console.error("Print Error:", e);
        showToast("เกิดข้อผิดพลาดในการพิมพ์: " + e.message, "error");
    }
  };

  // --- อัปเกรด: ฟังก์ชันพิมพ์ใบรับรองแพทย์ พร้อมระบบ Auto-Increment เลขรัน และเซฟลงฐานข้อมูล ---
  const handlePrintMedicalCertificate = async (record, index) => {
    let updatedRecord = { ...record };
    let dataToPrint = formData;
    
    // ฟังก์ชันจัดการเปิดหน้าต่างพิมพ์ (เรียกใช้ซ้ำได้)
    const executePrint = (printData, rec) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showToast('เบราว์เซอร์บล็อกการเปิดหน้าต่างพิมพ์ กรุณาอนุญาต Pop-ups', 'warning');
            return;
        }
        try {
            const html = globalGenerateMedicalCertificateHtml(printData, rec, branchesData, currentBranch, staffData);
            printWindow.document.write(html);
            printWindow.document.close();
            setTimeout(() => { if (printWindow.print) printWindow.print(); }, 500);
        } catch (e) {
            console.error("Print Error:", e);
            showToast("เกิดข้อผิดพลาดในการพิมพ์: " + e.message, "error");
        }
    };
    
    // 1. ตรวจสอบว่าประวัติการรักษานี้ มีเลขใบรับรองแพทย์แล้วหรือยัง?
    if (record.medCertNumber) {
        // หากมีเลขอยู่แล้ว (พิมพ์ซ้ำ) ให้พิมพ์ได้เลยไม่ต้องถามยืนยัน
        executePrint(dataToPrint, updatedRecord);
        return;
    }

    // 2. ถ้ายังไม่มีเลข ให้เด้ง Modal ถามเพื่อยืนยัน ป้องกันพนักงานกดผิด
    showGlobalAlert({
        type: 'info',
        title: 'ออกใบรับรองแพทย์?',
        text: 'ระบบจะทำการรัน "เลขที่เอกสารใหม่" และบันทึกลงประวัติการรักษานี้ คุณแน่ใจหรือไม่ว่าต้องการดำเนินการต่อ?',
        onConfirm: async () => {
            globalAlert.setIsOpen(false);
            setIsProcessing(true); // ป้องกันกดซ้ำขณะประมวลผล
            showToast('กำลังสร้างเลขที่เอกสารใหม่...', 'success');

            const recordDate = record.datetime ? record.datetime.split(' ')[0] : '';
            let y = new Date().getFullYear();
            let m = String(new Date().getMonth() + 1).padStart(2, '0');
            
            // ดึง ปี ค.ศ. และ เดือน ออกมาจากวันที่รับการรักษา
            if (recordDate) {
                const parts = recordDate.split('/');
                if (parts.length === 3) {
                    y = parseInt(parts[2], 10) - 543;
                    m = parts[1].padStart(2, '0');
                }
            }
            
            // รูปแบบ Prefix เช่น DC202604-
            const docPrefix = `DC${y}${m}-`;
            let maxSeq = 0;
            
            // สแกนหาเลขรันสูงสุดในฐานข้อมูลคนไข้ทั้งหมด (เฉพาะเดือน/ปีนั้นๆ)
            patientsData.forEach(p => {
                if (p.opdRecords) {
                    p.opdRecords.forEach(opd => {
                        if (opd.medCertNumber && opd.medCertNumber.startsWith(docPrefix)) {
                            const seqStr = opd.medCertNumber.replace(docPrefix, '');
                            const seqNum = parseInt(seqStr, 10);
                            if (!isNaN(seqNum) && seqNum > maxSeq) {
                                maxSeq = seqNum;
                            }
                        }
                    });
                }
            });
            
            // สร้างเลขรันใหม่ 5 หลัก (เช่น 00001)
            const nextSeq = String(maxSeq + 1).padStart(5, '0');
            updatedRecord.medCertNumber = `${docPrefix}${nextSeq}`;
            
            // อัปเดตข้อมูลลง State ก่อน
            const newRecords = [...(formData.opdRecords || [])];
            newRecords[index] = updatedRecord;
            dataToPrint = { ...formData, opdRecords: newRecords };
            setFormData(dataToPrint);
            
            // จัดเตรียมข้อมูลส่งไปเซฟที่ Backend (Google Apps Script)
            const combinedData = {
              ...dataToPrint,
              name: `${dataToPrint.prefix}${dataToPrint.firstName} ${dataToPrint.lastName}`.trim(),
              phone: dataToPrint.phones && dataToPrint.phones.length > 0 ? dataToPrint.phones[0] : '',
              id: editingId || dataToPrint.hn
            };
            
            try {
              if (callAppScript) {
                  await callAppScript('SAVE_DATA', 'Patients', combinedData);
              }
              // อัปเดต Global State
              setPatientsData(patientsData.map(p => p.id === combinedData.id ? combinedData : p));
              showToast(`บันทึกเลขที่เอกสารสำเร็จ: ${updatedRecord.medCertNumber}`, 'success');
              // เปิดหน้าต่างสั่งพิมพ์หลังจากที่บันทึกเลขรันลงเซิร์ฟเวอร์เสร็จสมบูรณ์
              executePrint(dataToPrint, updatedRecord);
            } catch (e) {
              console.error("Save MedCertNumber Error:", e);
              showToast('สร้างเอกสารสำเร็จ แต่บันทึกลงฐานข้อมูลไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต', 'warning');
              // ถึงเซิร์ฟเวอร์จะล่ม ก็ยังยอมให้เปิดปริ้นท์ได้อยู่ดี
              executePrint(dataToPrint, updatedRecord);
            } finally {
              setIsProcessing(false);
            }
        }
    });
      };

  const handleOpenOpdForm = (index = null, record = null) => {
    if (index !== null && record) { 
      setEditingOpdIndex(index); 
      setNewOpdRecord({
        ...record,
        tx: Array.isArray(record.tx) ? record.tx : (record.tx ? [record.tx] : ['']),
        branchId: record.branchId || (currentBranch !== 'all' ? currentBranch : '')
      }); 
    } 
    else { 
      setEditingOpdIndex(null); 
      // ดึงข้อมูลแพทย์ผู้รักษาอัตโนมัติหากคนล็อกอินเป็นแพทย์
      const isDoctor = currentUser.role === 'doctor' || currentUser.category === 'doctor';
      setNewOpdRecord({ 
          ...initialOpdState, 
          datetime: formatDateTime(new Date().toISOString()), 
          tx: [''], 
          branchId: currentBranch !== 'all' ? currentBranch : '',
          doctor: isDoctor ? currentUser.name : ''
      }); 
    }
    setShowOpdForm(true);

    setTimeout(() => {
      if (opdFormSectionRef.current) {
        // เปลี่ยนจาก block: 'center' เป็น 'start' เพื่อให้ส่วนหัวของฟอร์มชิดขอบบนพอดี
        opdFormSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 250); // เพิ่มเวลาหน่วงเล็กน้อยเพื่อให้แน่ใจว่าฟอร์ม render เสร็จและแอนิเมชันเริ่มแล้ว
  };

  const handleCancelOpdForm = () => {
    setIsClosingOpdForm(true); 
    
    setTimeout(() => {
      setShowOpdForm(false);
      setEditingOpdIndex(null);
      setIsClosingOpdForm(false);
      
      if (opdSectionRef.current) {
        opdSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 250); 
  };

  const handleSaveOpdRecord = async () => {
    if (!newOpdRecord.branchId) {
        showToast('กรุณาเลือกสาขาที่รับบริการ', 'warning');
        return;
    }
    let newRecords = [...(formData.opdRecords || [])];
    if (editingOpdIndex !== null) newRecords[editingOpdIndex] = newOpdRecord;
    else newRecords = [newOpdRecord, ...newRecords];
    
    const updatedFormData = { ...formData, opdRecords: newRecords };
    setFormData(updatedFormData);

    // อัปเดตรายการรักษาล่าสุด (recent treatments)
    if (newOpdRecord.tx && Array.isArray(newOpdRecord.tx)) {
      const validTx = newOpdRecord.tx.filter(Boolean);
      if (validTx.length > 0) {
        setRecentTreatments(prev => {
          const updated = [...validTx, ...prev.filter(t => !validTx.includes(t))].slice(0, 5);
          return updated;
        });
      }
    }

    setIsClosingOpdForm(true); 
    setTimeout(() => {
      setShowOpdForm(false);
      setEditingOpdIndex(null);
      setIsClosingOpdForm(false);
    }, 250);
    
    setIsProcessing(true);

    setTimeout(() => {
      if (opdSectionRef.current) {
        opdSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);

    const combinedData = {
      ...updatedFormData,
      name: `${updatedFormData.prefix}${updatedFormData.firstName} ${updatedFormData.lastName}`.trim(),
      phone: updatedFormData.phones && updatedFormData.phones.length > 0 ? updatedFormData.phones[0] : '', // อัปเดตการดึง phone
      id: editingId || updatedFormData.hn
    };

    try {
      await callAppScript('SAVE_DATA', 'Patients', combinedData);
      setPatientsData(patientsData.map(p => p.id === combinedData.id ? combinedData : p));
      setIsProcessing(false);
      showToast('บันทึกประวัติการรักษาเรียบร้อยแล้ว', 'success');
    } catch (error) {
      setIsProcessing(false);
      showToast('เกิดข้อผิดพลาดในการบันทึกประวัติการรักษา', 'warning');
    }
  };

  const handleDeleteOpdRecord = (index) => {
    showGlobalAlert({
      type: 'warning',
      title: 'ยืนยันการลบประวัติ?',
      text: 'คุณแน่ใจหรือไม่ว่าต้องการลบประวัติการรักษานี้?',
      onConfirm: async () => {
        globalAlert.setIsOpen(false);
        setIsProcessing(true);
        
        const newRecords = [...(formData.opdRecords || [])];
        newRecords.splice(index, 1);
        
        const updatedFormData = { ...formData, opdRecords: newRecords };
        setFormData(updatedFormData);

        const combinedData = {
          ...updatedFormData,
          name: `${updatedFormData.prefix}${updatedFormData.firstName} ${updatedFormData.lastName}`.trim(),
          phone: updatedFormData.phones && updatedFormData.phones.length > 0 ? updatedFormData.phones[0] : '', // อัปเดตการดึง phone
          id: editingId || updatedFormData.hn
        };

        try {
          await callAppScript('SAVE_DATA', 'Patients', combinedData);
          setPatientsData(patientsData.map(p => p.id === combinedData.id ? combinedData : p));
          setIsProcessing(false);
          showToast('ลบประวัติการรักษาเรียบร้อยแล้ว', 'danger');
        } catch (error) {
          setIsProcessing(false);
          showToast('เกิดข้อผิดพลาดในการลบประวัติการรักษา', 'warning');
        }
      }
    });
      };

  const handleSavePatient = async (e) => {
    e.preventDefault();

    // --- เพิ่มการตรวจสอบเลขบัตรประชาชนซ้ำ ---
    if (formData.idCard && formData.idCard.trim() !== '') {
        const isDuplicate = patientsData.some(p => 
            p.idCard === formData.idCard && (p.hn || p.id) !== editingId
        );
        if (isDuplicate) {
            showToast('ไม่สามารถบันทึกได้ เนื่องจากเลขบัตรประชาชนนี้มีอยู่ในระบบแล้ว', 'warning');
            return; // หยุดการทำงาน ไม่ให้บันทึกต่อ
        }
    }
    // ------------------------------------

    setIsProcessing(true);

    // Fix: Generate HN at save time to avoid duplicate HN race condition
    const currentHn = editingId || formData.hn || generateNextHN(patientsData);
    const combinedData = {
      ...formData,
      name: `${formData.prefix}${formData.firstName} ${formData.lastName}`.trim(),
      phone: formData.phones && formData.phones.length > 0 ? formData.phones[0] : '', // อัปเดตให้ดึงเบอร์หลักไปแสดงผลตาราง
      phone1: formData.phones && formData.phones.length > 0 ? formData.phones[0] : '', // เผื่อระบบเก่าดึง phone1 ไปใช้
      hn: currentHn
    };
    delete combinedData.id;

    try {
      await callAppScript('SAVE_DATA', 'Patients', combinedData);
      
      if (editingId) {
        setPatientsData(patientsData.map(p => (p.hn || p.id) === editingId ? { ...p, ...combinedData } : p));
      } else {
        const newPatient = { ...combinedData, lastVisit: new Date().toISOString().split('T')[0], branchId: currentBranch === 'all' ? 'b1' : currentBranch };
        setPatientsData([newPatient, ...patientsData]);
      }
      
      setIsProcessing(false);
      closeMedModal();
      showToast(editingId ? 'บันทึกการแก้ไขข้อมูลเรียบร้อยแล้ว' : 'เพิ่มข้อมูลผู้ป่วยใหม่เรียบร้อยแล้ว', 'success');
      
    } catch (error) {
      setIsProcessing(false);
      showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'warning');
    }
  };

  const handleGeneratePdpaLink = async (patient, e) => {
    e.stopPropagation();

    // Check if patient already has a status, require confirmation
    if (patient.pdpaStatus === 'green' || patient.pdpaStatus === 'red') {
        showGlobalAlert({
            type: 'info', // Using info for blue theme if available, otherwise default
            title: 'สร้างลิงก์ขออนุญาตใหม่?',
            text: 'ผู้ป่วยรายนี้ได้ให้ความยินยอม (หรือปฏิเสธ) ไปแล้ว คุณแน่ใจหรือไม่ว่าต้องการสร้างลิงก์ให้ผู้ป่วยทำรายการใหม่? ข้อมูลความยินยอมเดิมจะถูกลบและรอการยืนยันใหม่',
            onConfirm: () => {
                globalAlert.setIsOpen(false);
                proceedGenerateLink(patient);
            }
        });
        return;
    }

    proceedGenerateLink(patient);
  };

  const proceedGenerateLink = async (patient) => {
    const patientHn = patient.hn || patient.id;
    setProcessingPdpaHn(patientHn);
    const token = Math.random().toString(36).substr(2, 9);
    const expires = new Date().getTime() + 60 * 60 * 1000; // 1 hour

    // Reset specific consents when generating new link
    const updatedPatient = { 
        ...patient, 
        pdpaStatus: 'yellow', 
        pdpaToken: token, 
        pdpaExpires: expires,
        isConsentMarketing: null,
        isConsentReview: null
    };

    setIsProcessing(true);
    try {
        await callAppScript('SAVE_DATA', 'Patients', updatedPatient);
        setPatientsData(patientsData.map(p => (p.hn || p.id) === (patient.hn || patient.id) ? updatedPatient : p));

        const link = `${window.location.origin}/?pdpa=${token}&hn=${patient.hn || patient.id}`;

        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(link);
            showToast('สร้างลิ้งก์ PDPA และคัดลอกลงคลิปบอร์ดแล้ว (หมดอายุใน 1 ชม.)', 'success');
        } else {
            // Fallback
            const textArea = document.createElement("textarea");
            textArea.value = link;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                showToast('สร้างลิ้งก์ PDPA และคัดลอกลงคลิปบอร์ดแล้ว (หมดอายุใน 1 ชม.)', 'success');
            } catch (err) {
                console.error('Fallback copy failed', err);
            }
            document.body.removeChild(textArea);
        }
        
        // Open QR Modal instead of immediately opening a new tab
        setPdpaQrModal({ isOpen: true, link: link, patient: updatedPatient });
        
    } catch (error) {
        console.error("Error generating PDPA link:", error);
        showToast('เกิดข้อผิดพลาดในการสร้างลิ้งก์ PDPA', 'warning');
    } finally {
        setIsProcessing(false);
        setProcessingPdpaHn(null);
    }
  };

  const renderPdpaButton = (patient) => {
      const patientHn = patient.hn || patient.id;
      const isCurrentProcessing = processingPdpaHn === patientHn;
      
      // Determine statuses
      const isPdpaAgreed = patient.pdpaStatus === 'green';
      const isTxAgreed = patient.informedConsentStatus === 'green';
      const isMktAgreed = patient.isConsentMarketing === true || patient.isConsentMarketing === 'true';
      const isRevAgreed = patient.isConsentReview === true || patient.isConsentReview === 'true';
      
      const hasAnyConsentAgreed = isPdpaAgreed || isTxAgreed || isMktAgreed || isRevAgreed;

      // Link button renderer
      const renderLinkButton = () => (
          <button 
              disabled={isProcessing}
              onClick={(e) => { e.stopPropagation(); handleGeneratePdpaLink(patient, e); }} 
              className={`mt-1 px-2 py-0.5 rounded-md text-[9px] font-bold border transition-colors flex items-center justify-center gap-1 mx-auto ${
                  isCurrentProcessing
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : isProcessing
                          ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                          : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
              }`}
          >
             {isCurrentProcessing ? (
                 <Loader2 size={10} className="animate-spin text-slate-400" />
             ) : (
                 <Link size={10}/>
             )}
             {isCurrentProcessing ? 'กำลังสร้าง...' : 'ขอยินยอม'}
          </button>
      );

      // Render small green check/red cross badge
      const renderMiniBadge = (label, isAgreed) => (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
              isAgreed 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                  : 'bg-rose-50 text-rose-700 border border-rose-100'
          }`}>
              <span>{label}:</span>
              <span className={isAgreed ? 'text-emerald-500 font-black' : 'text-rose-500 font-black'}>
                  {isAgreed ? '✓' : '✗'}
              </span>
          </span>
      );

      // If no consent has been given yet (never consented or only pending link), show ONLY the button
      if (!hasAnyConsentAgreed) {
          return (
              <div className="py-1">
                  {renderLinkButton()}
              </div>
          );
      }

      // If at least one consent is given, show all 4 badges, but HIDE the button
      return (
          <div className="flex flex-col items-center gap-1.5 py-1">
              {/* Top: PDPA / การรักษา */}
              <div className="flex justify-center items-center gap-1.5 w-full">
                  {renderMiniBadge('PDPA', isPdpaAgreed)}
                  {renderMiniBadge('การรักษา', isTxAgreed)}
              </div>
              
              {/* Bottom: MKT / REV */}
              <div className="flex justify-center items-center gap-1.5 w-full">
                  {renderMiniBadge('MKT', isMktAgreed)}
                  {renderMiniBadge('REV', isRevAgreed)}
              </div>
          </div>
      );
  };

  const handleDeleteClick = (patient) => {
    const patientHn = patient.hn || patient.id;
    showGlobalAlert({
      type: 'warning',
      title: 'ยืนยันการลบข้อมูล?',
      text: `คุณแน่ใจหรือไม่ว่าต้องการลบประวัติของ ${getPatientFullName(patient)}? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      onConfirm: async () => {
        globalAlert.setIsOpen(false);
        setIsProcessing(true);
        try {
          await callAppScript('DELETE_DATA', 'Patients', { hn: patientHn, id: patientHn });
          setPatientsData(patientsData.filter(p => (p.hn || p.id) !== patientHn));
          setIsProcessing(false);
          showToast('ลบข้อมูลผู้ป่วยเรียบร้อยแล้ว', 'danger');
        } catch (error) {
          setIsProcessing(false);
          showToast('ลบข้อมูลไม่สำเร็จ', 'warning');
        }
      }
    });
      };

  // --- 1. Component Separation & 2. React.memo (via useMemo) ---
  // การใช้ useMemo ห่อหุ้มการเรนเดอร์ตาราง จะทำหน้าที่เหมือน React.memo และแยก Component ออกมาในตัว
  // เพื่อป้องกันไม่ให้เบราว์เซอร์ต้องวาดข้อมูล 600 แถวใหม่ทุกครั้งที่ Header มีการขยับ (isRecordsScrolled เปลี่ยน)
  const memoizedPatientTableRows = useMemo(() => {
    return sortedPatients.slice(0, visibleCount).map((patient, index) => (
      <tr key={`${getPatientId(patient)}-${index}`} onClick={() => handleOpenEdit(patient, true)} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group cursor-pointer text-sm last:border-0 font-data space-row-animation">
        <td className="py-4 pl-6 font-medium text-sky-600 kanit-text">{getPatientId(patient)}</td><td className="py-4 text-slate-700 font-medium font-data">{getPatientFullName(patient)}</td>
        <td className="py-4 text-slate-500">{patient.gender || '-'}</td><td className="py-4 text-slate-500">{patient.dob ? getAgeString(patient.dob).split(' ')[0] + ' ปี' : '-'}</td>
        <td className="py-4 text-slate-500">{patient.idCard || '-'}</td><td className="py-4 text-slate-500">{patient.phone || patient.phone1 || '-'}</td>
        <td className="py-4 text-slate-500">{patient.opdRecords && patient.opdRecords.length > 0 ? patient.opdRecords[0].datetime.split(' ')[0] : formatDate(patient.lastVisit)}</td>
        <td className="py-4 text-center text-slate-500">{patient.opdRecords ? patient.opdRecords.length : 0}</td>
        <td className="py-4 text-center">{renderPdpaButton(patient)}</td>
        <td className="py-4 text-right pr-4">
          <div className="flex justify-end gap-2 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); handlePrintRecord(patient); }} className="p-2 text-sky-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-colors" title="พิมพ์ใบเวชระเบียน"><Printer size={18} /></button>
            <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(patient, false); }} className="p-2 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-colors" title="แก้ไขข้อมูล"><Pencil size={18} /></button>
            <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(patient); }} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="ลบข้อมูล"><Trash2 size={18} /></button>
          </div>
        </td>
      </tr>
    ));
  }, [sortedPatients, visibleCount, isProcessing, processingPdpaHn]); // อัปเดตตารางเฉพาะตอนข้อมูลเปลี่ยนหรือเลื่อนโหลดเพิ่มเท่านั้น (Virtualization Concept)

  const memoizedPatientMobileCards = useMemo(() => {
    return sortedPatients.slice(0, visibleCount).map((patient, index) => {
        const phoneNum = patient.phone || patient.phone1;
        const ageStr = patient.dob ? getAgeString(patient.dob).split(' ')[0] + ' ปี' : '-';
        const lastVisitStr = patient.opdRecords && patient.opdRecords.length > 0 ? patient.opdRecords[0].datetime.split(' ')[0] : formatDate(patient.lastVisit);
        
        // เพิ่มตัวแปรเช็คผู้ป่วยใหม่ เพื่อทำป้ายสถานะให้หน้าตาเหมือนหน้านัดหมาย
        const isNewPatient = !(patient.opdRecords && patient.opdRecords.length > 0);
        
        return (
            <div key={`mobile-${getPatientId(patient)}-${index}`} onClick={() => handleOpenEdit(patient, true)} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col cursor-pointer hover:border-sky-300 hover:shadow-md transition-all space-row-animation active:scale-[0.98]" style={{ animationDelay: `${index < 10 ? index * 40 : 0}ms` }}>
                
                {/* แถวที่ 1: รหัส HN, ป้ายสถานะ และปุ่มจัดการ */}
                <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center flex-wrap gap-2.5">
                        <span className="font-black text-sky-600 text-base kanit-text tracking-wide">{getPatientId(patient)}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap ${isNewPatient ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                            {isNewPatient ? 'ผู้ป่วยใหม่' : 'ผู้ป่วยเก่า'}
                        </span>
                    </div>
                    <div className="text-right whitespace-nowrap bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 shrink-0 ml-2">
                        <span className="font-medium text-slate-500 text-[10px] sm:text-xs kanit-text">รับการรักษา</span>
                        <span className="font-bold text-sky-600 text-xs sm:text-sm font-data mx-1">{patient.opdRecords ? patient.opdRecords.length : 0}</span>
                        <span className="font-medium text-slate-500 text-[10px] sm:text-xs kanit-text">ครั้ง</span>
                    </div>
                </div>

                {/* แถวที่ 2: ชื่อคนไข้ และ เบอร์โทรศัพท์ */}
                <div className="mb-3">
                    <h4 className="font-bold text-slate-800 text-lg font-data leading-tight">{getPatientFullName(patient)}</h4>
                    <div className="mt-1.5">
                        {phoneNum ? (
                            <a href={`tel:${phoneNum}`} onClick={(e)=>e.stopPropagation()} className="inline-flex items-center gap-1.5 text-slate-600 hover:text-sky-600 font-medium font-data text-[11px] sm:text-xs bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 w-fit transition-colors">
                                <Phone size={12} className="text-sky-500" /> {phoneNum}
                            </a>
                        ) : <span className="text-[10px] text-slate-400 block">- ไม่มีเบอร์ติดต่อ -</span>}
                    </div>
                </div>

                {/* แถวที่ 3: ข้อมูลส่วนตัวอื่นๆ (จัดกลุ่มในกล่องสีเทาให้เหมือนกล่องนัดหมาย) */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs">
                        <div className="w-5 h-5 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 shrink-0"><User size={10} /></div>
                        <div className="min-w-0 flex-1 truncate">
                            <span className="font-medium text-slate-500">เพศ:</span>
                            <span className="font-bold text-slate-700 ml-1.5">{patient.gender || '-'}</span>
                            <span className="text-slate-300 mx-2">|</span>
                            <span className="font-medium text-slate-500">อายุ:</span>
                            <span className="font-bold text-slate-700 ml-1.5">{ageStr}</span>
                        </div>
                    </div>
                    {patient.idCard && (
                    <div className="flex items-center gap-2 text-xs">
                        <div className="w-5 h-5 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 shrink-0"><CreditCard size={10} /></div>
                        <div className="min-w-0 flex-1 truncate">
                            <span className="font-medium text-slate-500">เลขบัตรฯ:</span>
                            <span className="font-bold text-slate-700 ml-1.5 font-data">{patient.idCard}</span>
                        </div>
                    </div>
                    )}
                    <div className="flex items-center gap-2 text-xs">
                        <div className="w-5 h-5 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 shrink-0"><Clock size={10} /></div>
                        <div className="min-w-0 flex-1 truncate">
                            <span className="font-medium text-slate-500">รับบริการล่าสุด:</span>
                            <span className="font-bold text-sky-600 ml-1.5 font-data">{lastVisitStr}</span>
                        </div>
                    </div>
                    
                    {/* แถวที่ 3.5: สถานะ PDPA */}
                    <div className="flex items-center gap-2 text-xs mt-1 pt-2 border-t border-slate-200">
                        <div className="w-5 h-5 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 shrink-0"><ShieldCheck size={10} /></div>
                        <div className="min-w-0 flex-1 flex items-center gap-2">
                            <span className="font-medium text-slate-500">PDPA:</span>
                            {renderPdpaButton(patient)}
                        </div>
                    </div>
                </div>

                {/* แถวที่ 4: ปุ่มจัดการ (แก้ไขเป็น grid-cols-3 และเพิ่มปุ่มพิมพ์) */}
                <div className="mt-3 grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
                    <button onClick={(e) => { e.stopPropagation(); handlePrintRecord(patient); }} className="flex items-center justify-center gap-2 py-2 text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-xl transition-colors font-medium text-sm kanit-text">
                        <Printer size={16} /> พิมพ์
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(patient, false); }} className="flex items-center justify-center gap-2 py-2 text-slate-500 hover:text-sky-600 bg-slate-50 hover:bg-sky-50 rounded-xl transition-colors font-medium text-sm kanit-text">
                        <Pencil size={16} /> แก้ไข
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(patient); }} className="flex items-center justify-center gap-2 py-2 text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-xl transition-colors font-medium text-sm kanit-text">
                        <Trash2 size={16} /> ลบ
                    </button>
                </div>
            </div>
        );
    });
  }, [sortedPatients, visibleCount, isProcessing, processingPdpaHn]);

  return (
    <>
      <div className="fade-in pb-10 relative flex flex-col h-full w-full">
        
        {/* --- 1. Sticky Header --- */}
        <div ref={headerRef} className="sticky z-30 w-full pointer-events-none transition-all duration-300 ease-in-out flex flex-col" style={{ top: 'var(--mobile-header-offset, 0px)' }}>
          <div className="w-full pointer-events-auto sticky-header-bg shrink-0">
            <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 flex flex-row justify-between items-center gap-2 sm:gap-4 sticky-header-inner">
              <div>
                <h1 className="font-bold text-slate-800 tracking-tight kanit-text sticky-header-title">ระบบเวชระเบียน</h1>
                <p className="text-slate-500 kanit-text sticky-header-desc">จัดการข้อมูลคนไข้ ศูนย์รวมข้อมูลทุกสาขา</p>
              </div>
              <button onClick={handleOpenAdd} className={`flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl font-semibold shadow-sm transition-transform active:scale-95 shrink-0 ${theme.primary} kanit-text sticky-header-btn px-4 py-2 sm:px-6 sm:py-3`}>
                <Plus size={18} /> <span className="hidden sm:inline">เพิ่มประวัติใหม่</span>
              </button>
            </div>
          </div>
        </div>

        {/* --- 2. Stats Section (ปรับ Layout ใหม่ให้แสดงผลสวยงามบนมือถือ ไม่บีบอัด) --- */}
        <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 mt-4 mb-0 relative z-20 pointer-events-auto">
           <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
              {/* คนไข้ทั้งหมด - แสดงผลเป็นแถวยาวเต็มความกว้างบนมือถือ และกลับมาเป็นแนวตั้งบนจอใหญ่ */}
              <div className="col-span-2 md:col-span-1 bg-white p-3.5 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-sm flex flex-row sm:flex-col justify-between items-center sm:items-start relative overflow-hidden group hover:border-sky-200 hover:shadow-md transition-all min-h-[72px] sm:min-h-[140px] w-full">
                <div className="flex items-center gap-2.5 sm:gap-3 relative z-10">
                  <div className="w-9 h-9 sm:w-12 sm:h-12 bg-sky-50 text-sky-500 border border-sky-100 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-sm"><Users size={18} className="sm:w-6 sm:h-6" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-[11px] font-black text-slate-400 kanit-text uppercase tracking-wider truncate leading-tight" title="คนไข้ทั้งหมด">คนไข้ทั้งหมด</p>
                  </div>
                </div>
                <div className="relative z-10 sm:mt-auto text-right sm:text-left">
                  <p className={`font-black text-slate-800 font-data whitespace-nowrap overflow-hidden ${getDynamicTextSize(formatStatNumber(stats.total))}`}>{formatStatNumber(stats.total)}</p>
                </div>
                <div className="absolute -bottom-6 -right-6 w-20 h-20 sm:w-24 sm:h-24 bg-slate-50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 z-0 pointer-events-none transform group-hover:scale-150"></div>
              </div>

              {/* คนไข้ชาย - อยู่คู่กันฝั่งซ้ายบนมือถือ */}
              <div className="col-span-1 bg-white p-3.5 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-blue-200 hover:shadow-md transition-all min-h-[96px] sm:min-h-[140px]">
                <div className="flex items-center gap-2.5 sm:gap-3 mb-1 sm:mb-4 relative z-10">
                  <div className="w-9 h-9 sm:w-12 sm:h-12 bg-blue-50 text-blue-500 border border-blue-100 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-sm"><User size={18} className="sm:w-6 sm:h-6" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-[11px] font-black text-slate-400 kanit-text uppercase tracking-wider truncate leading-tight" title="คนไข้ชาย">คนไข้ชาย</p>
                  </div>
                </div>
                <div className="relative z-10 mt-auto w-full">
                  <p className={`font-black text-blue-600 font-data whitespace-nowrap overflow-hidden mt-0.5 ${getDynamicTextSize(formatStatNumber(stats.male))}`}>{formatStatNumber(stats.male)}</p>
                </div>
                <div className="absolute -bottom-6 -right-6 w-20 h-20 sm:w-24 sm:h-24 bg-blue-50/50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 z-0 pointer-events-none transform group-hover:scale-150"></div>
              </div>

              {/* คนไข้หญิง - อยู่คู่กันฝั่งขวาบนมือถือ */}
              <div className="col-span-1 bg-white p-3.5 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-pink-200 hover:shadow-md transition-all min-h-[96px] sm:min-h-[140px]">
                <div className="flex items-center gap-2.5 sm:gap-3 mb-1 sm:mb-4 relative z-10">
                  <div className="w-9 h-9 sm:w-12 sm:h-12 bg-pink-50 text-pink-500 border border-pink-100 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-sm"><User size={18} className="sm:w-6 sm:h-6" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-[11px] font-black text-slate-400 kanit-text uppercase tracking-wider truncate leading-tight" title="คนไข้หญิง">คนไข้หญิง</p>
                  </div>
                </div>
                <div className="relative z-10 mt-auto w-full">
                  <p className={`font-black text-pink-600 font-data whitespace-nowrap overflow-hidden mt-0.5 ${getDynamicTextSize(formatStatNumber(stats.female))}`}>{formatStatNumber(stats.female)}</p>
                </div>
                <div className="absolute -bottom-6 -right-6 w-20 h-20 sm:w-24 sm:h-24 bg-pink-50/50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 z-0 pointer-events-none transform group-hover:scale-150"></div>
              </div>
           </div>
        </div>

        {/* --- 3. Filter Component (Sticky แบบกึ่งกลาง Distribute Vertically) --- */}
        <div 
           ref={filterRef}
           className="w-full pointer-events-none sticky z-20 transition-all duration-300 ease-in-out my-5 sm:my-6 sticky-filter-appt" 
        >
          <div className="w-full mx-auto pointer-events-none relative h-[76px] sm:h-[92px] z-50">
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 mx-auto bg-white/95 backdrop-blur-xl border-slate-200 pointer-events-auto origin-top sticky-filter-inner shadow-sm flex flex-row items-center px-4 md:px-8 2xl:px-12 py-3 sm:py-4 transition-all">
              <div className="relative w-full">
                <input type="text" placeholder="ค้นหาชื่อ, รหัส HN, เบอร์โทร หรือเลขบัตรประชาชน..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-2 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 transition-colors shadow-inner font-data truncate" />
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>
        </div>

        {/* --- 4. ตาราง/เนื้อหา --- */}
        <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 mt-0 mb-12 flex-1 flex flex-col pointer-events-auto z-10">
          <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100/50 relative overflow-hidden flex flex-col min-h-[400px]">
              <div className="px-2 sm:px-4 py-4">
                
                {/* --- Desktop View (Table) --- */}
                {/* แก้ไข: เพิ่ม overflow-y-hidden เพื่อป้องกัน Scrollbar กระพริบ */}
                <div className="hidden lg:block overflow-x-auto overflow-y-hidden">
                  <table className="w-full text-left border-collapse min-w-[1100px] table-auto">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-100 text-sm"><th className="pt-6 pb-4 font-medium pl-6 cursor-pointer hover:text-sky-600 transition-colors group select-none kanit-text w-[11%]" onClick={() => requestSort('id')}><div className="flex items-center gap-1">รหัส HN <ArrowUpDown size={14} className={`transition-opacity ${sortConfig.key === 'id' ? 'opacity-100 text-sky-500' : 'opacity-30 group-hover:opacity-70'}`} /></div></th><th className="w-[15%] pt-6 pb-4 font-medium text-left kanit-text">ชื่อคนไข้</th><th className="w-[5%] pt-6 pb-4 font-medium text-left kanit-text">เพศ</th><th className="w-[5%] pt-6 pb-4 font-medium text-left kanit-text">อายุ</th><th className="pt-6 pb-4 font-medium cursor-pointer hover:text-sky-600 transition-colors group select-none kanit-text w-[13%]" onClick={() => requestSort('idCard')}><div className="flex items-center gap-1">เลขบัตรประชาชน <ArrowUpDown size={14} className={`transition-opacity ${sortConfig.key === 'idCard' ? 'opacity-100 text-sky-500' : 'opacity-30 group-hover:opacity-70'}`} /></div></th><th className="pt-6 pb-4 font-medium cursor-pointer hover:text-sky-600 transition-colors group select-none kanit-text w-[11%]" onClick={() => requestSort('phone')}><div className="flex items-center gap-1">เบอร์ติดต่อ <ArrowUpDown size={14} className={`transition-opacity ${sortConfig.key === 'phone' ? 'opacity-100 text-sky-500' : 'opacity-30 group-hover:opacity-70'}`} /></div></th><th className="pt-6 pb-4 font-medium cursor-pointer hover:text-sky-600 transition-colors group select-none kanit-text w-[10%]" onClick={() => requestSort('lastVisit')}><div className="flex items-center gap-1">รับบริการล่าสุด <ArrowUpDown size={14} className={`transition-opacity ${sortConfig.key === 'lastVisit' ? 'opacity-100 text-sky-500' : 'opacity-30 group-hover:opacity-70'}`} /></div></th><th className="w-[10%] pt-6 pb-4 font-medium text-center kanit-text">การรักษา(ครั้ง)</th><th className="w-[10%] pt-6 pb-4 font-medium text-center kanit-text">สถานะการยินยอม</th><th className="w-[140px] pt-6 pb-4 font-medium text-right pr-4 kanit-text">จัดการ</th></tr>
                    </thead>
                    <tbody>
                      {isGlobalLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={`skel-med-${i}`} className="border-b border-slate-50">
                            <td className="py-4 pl-6"><div className="h-4 w-3/4 max-w-[80px] bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-full max-w-[200px] bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-full max-w-[32px] bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-full max-w-[48px] bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-full max-w-[150px] bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-full max-w-[120px] bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-full max-w-[100px] bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4 text-center"><div className="h-4 w-full max-w-[40px] bg-slate-200 rounded animate-pulse mx-auto"></div></td>
                            <td className="py-4 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex gap-1">
                                  <div className="h-3.5 w-full max-w-[40px] bg-slate-200 rounded animate-pulse"></div>
                                  <div className="h-3.5 w-full max-w-[48px] bg-slate-200 rounded animate-pulse"></div>
                                </div>
                                <div className="flex gap-1">
                                  <div className="h-3.5 w-full max-w-[32px] bg-slate-200 rounded animate-pulse"></div>
                                  <div className="h-3.5 w-full max-w-[32px] bg-slate-200 rounded animate-pulse"></div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 pr-4"><div className="flex justify-end gap-2 transition-opacity"><div className="h-8 w-full max-w-[32px] bg-slate-200 rounded-lg animate-pulse"></div><div className="h-8 w-full max-w-[32px] bg-slate-200 rounded-lg animate-pulse"></div><div className="h-8 w-full max-w-[32px] bg-slate-200 rounded-lg animate-pulse"></div></div></td>
                          </tr>
                        ))
                      ) : memoizedPatientTableRows}
                      {isLoadingMore && Array.from({ length: 2 }).map((_, i) => (
                          <tr key={`skel-med-more-${i}`} className="border-b border-slate-50">
                            <td className="py-4 pl-6"><div className="h-4 w-3/4 max-w-[80px] bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-full max-w-[200px] bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-full max-w-[32px] bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-full max-w-[48px] bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-full max-w-[150px] bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-full max-w-[120px] bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4"><div className="h-4 w-full max-w-[100px] bg-slate-200 rounded animate-pulse"></div></td>
                            <td className="py-4 text-center"><div className="h-4 w-full max-w-[40px] bg-slate-200 rounded animate-pulse mx-auto"></div></td>
                            <td className="py-4 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex gap-1">
                                  <div className="h-3.5 w-full max-w-[40px] bg-slate-200 rounded animate-pulse"></div>
                                  <div className="h-3.5 w-full max-w-[48px] bg-slate-200 rounded animate-pulse"></div>
                                </div>
                                <div className="flex gap-1">
                                  <div className="h-3.5 w-full max-w-[32px] bg-slate-200 rounded animate-pulse"></div>
                                  <div className="h-3.5 w-full max-w-[32px] bg-slate-200 rounded animate-pulse"></div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 pr-4"><div className="flex justify-end gap-2 transition-opacity"><div className="h-8 w-full max-w-[32px] bg-slate-200 rounded-lg animate-pulse"></div><div className="h-8 w-full max-w-[32px] bg-slate-200 rounded-lg animate-pulse"></div><div className="h-8 w-full max-w-[32px] bg-slate-200 rounded-lg animate-pulse"></div></div></td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* --- Mobile View (Cards) --- */}
                <div className="lg:hidden space-y-4 mt-2">
                    {isGlobalLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={`skel-med-mob-${i}`} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                                <div className="flex justify-between items-center mb-1.5">
                                    <div className="h-5 w-full max-w-[64px] bg-slate-200 rounded animate-pulse"></div>
                                    <div className="h-5 w-full max-w-[64px] bg-slate-200 rounded-md animate-pulse"></div>
                                </div>
                                <div className="mb-3">
                                    <div className="h-6 w-full max-w-[160px] bg-slate-200 rounded animate-pulse mb-2"></div>
                                    <div className="h-6 w-full max-w-[96px] bg-slate-200 rounded-lg animate-pulse"></div>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-full max-w-[20px] h-5 rounded-full bg-slate-200 animate-pulse shrink-0"></div>
                                        <div className="h-4 w-full max-w-[160px] bg-slate-200 rounded animate-pulse"></div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-full max-w-[20px] h-5 rounded-full bg-slate-200 animate-pulse shrink-0"></div>
                                        <div className="h-4 w-full max-w-[128px] bg-slate-200 rounded animate-pulse"></div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-full max-w-[20px] h-5 rounded-full bg-slate-200 animate-pulse shrink-0"></div>
                                        <div className="h-4 w-full max-w-[112px] bg-slate-200 rounded animate-pulse"></div>
                                    </div>
                                    {/* แถวที่ 3.5: สถานะ PDPA (Skeleton) */}
                                    <div className="flex items-center gap-2 mt-1 pt-2 border-t border-slate-200">
                                        <div className="w-full max-w-[20px] h-5 rounded-full bg-slate-200 animate-pulse shrink-0"></div>
                                        <div className="h-4 w-full max-w-[144px] bg-slate-200 rounded animate-pulse"></div>
                                    </div>
                                </div>
                                {/* แถวที่ 4: ปุ่มจัดการ (Skeleton) */}
                                <div className="mt-3 grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
                                    <div className="h-9 bg-slate-200 rounded-xl animate-pulse"></div>
                                    <div className="h-9 bg-slate-200 rounded-xl animate-pulse"></div>
                                    <div className="h-9 bg-slate-200 rounded-xl animate-pulse"></div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <>
                            {memoizedPatientMobileCards}
                            {!isGlobalLoading && sortedPatients.length === 0 && (
                                <div className="text-center py-10 text-slate-400 kanit-text bg-slate-50 rounded-2xl border border-slate-100 border-dashed">ไม่พบข้อมูลผู้ป่วย</div>
                            )}
                            {isLoadingMore && Array.from({ length: 2 }).map((_, i) => (
                                <div key={`skel-med-mob-more-${i}`} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <div className="h-5 w-full max-w-[64px] bg-slate-200 rounded animate-pulse"></div>
                                        <div className="h-5 w-full max-w-[64px] bg-slate-200 rounded-md animate-pulse"></div>
                                    </div>
                                    <div className="mb-3">
                                        <div className="h-6 w-full max-w-[160px] bg-slate-200 rounded animate-pulse mb-2"></div>
                                        <div className="h-6 w-full max-w-[96px] bg-slate-200 rounded-lg animate-pulse"></div>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-full max-w-[20px] h-5 rounded-full bg-slate-200 animate-pulse shrink-0"></div>
                                            <div className="h-4 w-full max-w-[160px] bg-slate-200 rounded animate-pulse"></div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-full max-w-[20px] h-5 rounded-full bg-slate-200 animate-pulse shrink-0"></div>
                                            <div className="h-4 w-full max-w-[128px] bg-slate-200 rounded animate-pulse"></div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-full max-w-[20px] h-5 rounded-full bg-slate-200 animate-pulse shrink-0"></div>
                                            <div className="h-4 w-full max-w-[112px] bg-slate-200 rounded animate-pulse"></div>
                                        </div>
                                        {/* แถวที่ 3.5: สถานะ PDPA (Skeleton) */}
                                        <div className="flex items-center gap-2 mt-1 pt-2 border-t border-slate-200">
                                            <div className="w-full max-w-[20px] h-5 rounded-full bg-slate-200 animate-pulse shrink-0"></div>
                                            <div className="h-4 w-full max-w-[144px] bg-slate-200 rounded animate-pulse"></div>
                                        </div>
                                    </div>
                                    {/* แถวที่ 4: ปุ่มจัดการ (Skeleton) */}
                                    <div className="mt-3 grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
                                        <div className="h-9 bg-slate-200 rounded-xl animate-pulse"></div>
                                        <div className="h-9 bg-slate-200 rounded-xl animate-pulse"></div>
                                        <div className="h-9 bg-slate-200 rounded-xl animate-pulse"></div>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
              </div>
          </div>
        </div>
      </div>

      {medModal.isOpen && (
        <div className={`fixed inset-0 z-[100] flex justify-center items-center p-3 sm:p-8 bg-slate-900/40 backdrop-blur-sm ${medModal.isClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className={`bg-white rounded-[1.5rem] sm:rounded-3xl w-full max-w-5xl max-h-[80dvh] sm:max-h-[90dvh] shadow-2xl flex flex-col transform border border-slate-100 relative overflow-hidden ${medModal.isClosing ? 'modal-animate-out' : 'modal-animate-in'}`}>
            {/* แก้ไข UX/UI ส่วนหัว Modal เวชระเบียน */}
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0 z-10 gap-3">
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 shadow-inner shrink-0">
                    {isViewMode ? <FileText className="w-5 h-5 sm:w-6 sm:h-6" /> : (editingId ? <Pencil className="w-5 h-5 sm:w-6 sm:h-6" /> : <Plus className="w-5 h-5 sm:w-6 sm:h-6" />)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base sm:text-2xl font-bold text-slate-800 kanit-text truncate leading-tight">{editingId ? `${formData.hn} - ${formData.prefix}${formData.firstName} ${formData.lastName} (การรักษา ${formData.opdRecords ? formData.opdRecords.length : 0} ครั้ง)` : 'เพิ่มเวชระเบียนใหม่'}</h3>
                  </div>
                  <p className="text-[10px] sm:text-sm text-slate-500 kanit-text truncate leading-tight mt-0.5">{isViewMode ? `อายุ ${calculatedAge} | ข้อมูลผู้ป่วยสำหรับเรียกดู` : (editingId ? `อายุ ${calculatedAge} | แก้ไขข้อมูลเวชระเบียน` : 'กรอกข้อมูลผู้ป่วยให้ครบถ้วน')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {/* เหลือแค่ปุ่มปิด X ด้านบน */}
                <button type="button" onClick={closeMedModal} className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-1.5 sm:p-2 shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors"><X size={18} className="sm:w-5 sm:h-5" /></button>
              </div>
            </div>
            
            {/* เอาคลาสเว้นระยะด้านล่างที่เหลือทิ้งไว้ออกเหมือนกัน */}
            <div className="p-4 sm:p-5 flex-1 bg-slate-50/30 overflow-y-auto custom-scrollbar">
              <form id="patient-form" onSubmit={handleSavePatient}>
                <fieldset disabled={isViewMode} className="space-y-5 sm:space-y-6 border-none p-0 m-0 min-w-0">
                  


                <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm relative z-10">
                  <div className="border-b border-sky-100 pb-3 mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <h4 className="text-lg font-bold text-sky-600 flex items-center gap-2 kanit-text"><Users size={20} /> ข้อมูลส่วนตัว</h4>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      {!isViewMode && (
                        <>
                          {/* ปุ่มอ่านบัตรจากเครื่อง Smart Card Reader (เพิ่มใหม่) */}
                          <button 
                            type="button" 
                            onClick={handleSmartCardRead} 
                            disabled={isProcessing}
                            className="text-xs sm:text-sm px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl font-medium transition-colors flex items-center gap-1.5 kanit-text border border-emerald-100 shadow-sm disabled:opacity-50"
                          >
                            <CreditCard size={16} /> <span className="hidden sm:inline">อ่านข้อมูลจากบัตร</span><span className="sm:hidden">อ่านบัตร</span>
                          </button>

                          {/* ปุ่มสแกนกล้อง (OCR) เดิม */}
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
                  
                  {/* --- ส่วนที่ 1: ที่อยู่ตามบัตรประชาชน --- */}
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

                  {/* --- ส่วนที่ 2: ที่อยู่ปัจจุบัน --- */}
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

                  {/* --- ส่วนที่ 3: เบอร์โทรศัพท์ (Dynamic) --- */}
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

                {/* --- ส่วนที่แสดงเฉพาะในโหมดดูข้อมูล (View Mode): คอร์สคงเหลือ --- */}
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

                <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm relative z-10">                  <h4 className="text-lg font-bold text-sky-600 border-b border-sky-100 pb-3 mb-5 flex items-center gap-2 kanit-text"><Stethoscope size={20} /> ข้อมูลสุขภาพเบื้องต้น</h4>
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

                {/* Consent Status Section (Only visible if editing an existing record) */}
                {editingId && (() => {
                    const pat = patientsData.find(p => (p.hn || p.id) === (formData.hn || formData.id)) || formData;
                    return (
                        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm relative z-10 animate-in fade-in duration-300">
                            <div className="border-b border-sky-100 pb-3 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <h4 className="text-lg font-bold text-sky-600 flex items-center gap-2 kanit-text"><ShieldCheck size={20} /> สถานะความยินยอมระบบออนไลน์</h4>
                                {!isViewMode && (
                                     <button 
                                         type="button" 
                                         onClick={(e) => handleGeneratePdpaLink(pat, e)} 
                                         disabled={isProcessing}
                                         className="text-xs sm:text-sm px-3 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-xl font-medium transition-colors flex items-center gap-1.5 kanit-text border border-amber-200 shadow-sm disabled:opacity-50"
                                     >
                                         {isProcessing && processingPdpaHn === (pat.hn || pat.id) ? (
                                             <Loader2 size={16} className="animate-spin text-amber-600" />
                                         ) : (
                                             <Link size={16} />
                                         )}
                                         {isProcessing && processingPdpaHn === (pat.hn || pat.id) ? 'กำลังสร้าง...' : 'สร้างลิงก์ขอยินยอม (PDPA & การรักษา)'}
                                     </button>
                                 )}
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Column 1: PDPA Consent */}
                                <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
                                    <div>
                                        <h5 className="font-bold text-slate-700 text-sm kanit-text mb-3 flex items-center gap-1.5"><ShieldCheck size={16} className="text-sky-500"/> 1. ความยินยอมข้อมูลส่วนบุคคล (PDPA)</h5>
                                        {pat.pdpaStatus === 'green' ? (
                                            <div className="space-y-4">
                                                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex flex-col justify-center items-center text-center">
                                                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-emerald-500 mb-2 shadow-sm"><ShieldCheck size={20}/></div>
                                                    <h6 className="font-bold text-emerald-700 kanit-text text-base">ยินยอมให้เก็บและใช้ข้อมูลแล้ว</h6>
                                                    <p className="text-[11px] text-emerald-600 mt-1">ผู้ป่วยให้ความยินยอมเมื่อ: {pat.pdpaTimestamp ? new Date(pat.pdpaTimestamp).toLocaleString('th-TH') : '-'}</p>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/60 flex justify-between items-center text-xs">
                                                        <span className="font-medium text-slate-500 kanit-text">การตลาด (Marketing)</span>
                                                        <span className={`font-bold flex items-center gap-1 ${pat.isConsentMarketing ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                            {pat.isConsentMarketing ? <><CheckCircle2 size={14}/> ยินยอม</> : <><XCircle size={14}/> ไม่ยินยอม</>}
                                                        </span>
                                                    </div>
                                                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/60 flex justify-between items-center text-xs">
                                                        <span className="font-medium text-slate-500 kanit-text">การรีวิว (Review)</span>
                                                        <span className={`font-bold flex items-center gap-1 ${pat.isConsentReview ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                            {pat.isConsentReview ? <><CheckCircle2 size={14}/> ยินยอม</> : <><XCircle size={14}/> ไม่ยินยอม</>}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : pat.pdpaStatus === 'red' ? (
                                            <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 flex flex-col justify-center items-center text-center">
                                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-rose-500 mb-2 shadow-sm"><XCircle size={20}/></div>
                                                <h6 className="font-bold text-rose-700 kanit-text text-base">ไม่ยินยอม</h6>
                                                <p className="text-xs text-rose-600 mt-1">ผู้ป่วยปฏิเสธการให้ความยินยอม (จำเป็นต้องยินยอมเพื่อรับบริการ)</p>
                                                <div className="text-[10px] text-rose-400 mt-2">
                                                    <p>ทำรายการเมื่อ: {pat.pdpaTimestamp ? new Date(pat.pdpaTimestamp).toLocaleString('th-TH') : '-'}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-white p-6 rounded-xl border border-slate-200 border-dashed flex flex-col justify-center items-center text-center min-h-[160px]">
                                                <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-2 shadow-sm"><FileText size={20}/></div>
                                                <h6 className="font-bold text-slate-600 kanit-text text-sm">ยังไม่มีข้อมูลความยินยอม</h6>
                                                <p className="text-xs text-slate-400 mt-1">กรุณาสร้างลิงก์ขอยินยอมให้ผู้ป่วยทำรายการ</p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {pat.pdpaStatus === 'green' && (
                                        <div className="text-[10px] text-slate-400 mt-4 pt-3 border-t border-slate-200/50 space-y-0.5">
                                            <p><strong>IP Address:</strong> {pat.pdpaIpAddress || '-'}</p>
                                            <p className="truncate" title={pat.pdpaUserAgent || '-'}><strong>อุปกรณ์:</strong> {pat.pdpaUserAgent || '-'}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Column 2: Informed Consent */}
                                <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
                                    <div>
                                        <h5 className="font-bold text-slate-700 text-sm kanit-text mb-3 flex items-center gap-1.5"><HeartPulse size={16} className="text-sky-500"/> 2. ใบยินยอมรับการรักษาพยาบาล (Informed Consent)</h5>
                                        {pat.informedConsentStatus === 'green' ? (
                                            <div className="space-y-3">
                                                <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-100 flex flex-col justify-center items-center text-center">
                                                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-emerald-500 mb-2 shadow-sm"><CheckSquare size={20}/></div>
                                                    <h6 className="font-bold text-emerald-700 kanit-text text-sm">ยินยอมรับการรักษาพยาบาลแล้ว</h6>
                                                    <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                                                        ลงนามโดย: {pat.informedConsentSignerType === 'patient' ? 'ผู้ป่วยเอง' : `ผู้แทนโดยชอบธรรม (${pat.informedConsentRepresentativeName || '-'})`}
                                                     </p>
                                                     {pat.informedConsentSignerType === 'representative' && (
                                                         <p className="text-[10px] text-emerald-500 font-medium">ความเกี่ยวข้อง: {pat.informedConsentRepresentativeRelation || '-'}</p>
                                                     )}
                                                    <p className="text-[10px] text-emerald-500 mt-0.5">ยินยอมเมื่อ: {pat.informedConsentTimestamp ? new Date(pat.informedConsentTimestamp).toLocaleString('th-TH') : '-'}</p>
                                                </div>

                                                {/* Signature Display */}
                                                {pat.informedConsentSignatureUrl && (
                                                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/60 flex flex-col items-center">
                                                        <span className="text-[10px] font-bold text-slate-400 mb-1 self-start kanit-text">ภาพลายมือชื่อ (E-Signature)</span>
                                                        <div className="bg-slate-50 border border-slate-100 rounded-md p-1.5 w-full flex items-center justify-center h-16 overflow-hidden relative">
                                                            <img 
                                                                src={pat.informedConsentSignatureUrl} 
                                                                alt="E-Signature" 
                                                                className="max-h-full max-w-full object-contain pointer-events-none"
                                                                onError={(e) => {
                                                                    e.target.style.display = 'none';
                                                                    e.target.parentNode.innerHTML = '<span class="text-xs text-slate-400 font-medium">รูปภาพลายเซ็น</span>';
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex justify-between w-full mt-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => handlePrintInformedConsent(pat)}
                                                                className="text-[10px] text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 transition-colors"
                                                            >
                                                                <Printer size={10} /> พิมพ์ใบยินยอม (A4)
                                                            </button>
                                                            <a 
                                                                href={pat.informedConsentSignatureUrl} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer" 
                                                                className="text-[10px] text-sky-500 hover:text-sky-600 font-bold flex items-center gap-1 transition-colors"
                                                            >
                                                                <ExternalLink size={10} /> ดูลายเซ็นขนาดเต็ม
                                                            </a>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="bg-white p-6 rounded-xl border border-slate-200 border-dashed flex flex-col justify-center items-center text-center min-h-[160px]">
                                                <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-2 shadow-sm"><FileText size={20}/></div>
                                                <h6 className="font-bold text-slate-600 kanit-text text-sm">ยังไม่มีข้อมูลการยินยอมการรักษา</h6>
                                                <p className="text-xs text-slate-400 mt-1">กรุณาสร้างลิงก์ขอยินยอมให้ผู้ป่วยทำรายการ</p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {pat.informedConsentStatus === 'green' && (
                                        <div className="text-[10px] text-slate-400 mt-4 pt-3 border-t border-slate-200/50 space-y-0.5">
                                            <p><strong>IP Address:</strong> {pat.informedConsentIpAddress || '-'}</p>
                                            <p className="truncate" title={pat.informedConsentUserAgent || '-'}><strong>อุปกรณ์:</strong> {pat.informedConsentUserAgent || '-'}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })()}

                <div ref={opdSectionRef} className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm relative z-10 mt-6 sm:mt-8">
                  <div className="border-b border-sky-100 pb-3 mb-5 flex justify-between items-center">
                    <h4 className="text-lg font-bold text-sky-600 flex items-center gap-2 kanit-text"><FileText size={20} /> ประวัติการรักษา (OPD)</h4>
                    {!showOpdForm && (<button type="button" onClick={() => handleOpenOpdForm()} className="text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-xl font-medium transition-colors flex items-center gap-1.5 sm:gap-2 kanit-text"><Plus size={16} /> <span className="hidden sm:inline">เพิ่มประวัติการรักษา</span><span className="sm:hidden">เพิ่ม</span></button>)}
                  </div>
                  {showOpdForm && (
                    <div ref={opdFormSectionRef} className={`bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 mb-6 shadow-inner ${isClosingOpdForm ? 'fade-out-up' : 'fade-in-up'}`}>
                      <h5 className="font-semibold text-slate-700 mb-4 kanit-text">{editingOpdIndex !== null ? 'แก้ไขบันทึกการรักษา' : 'บันทึกการรักษาใหม่'}</h5>
                      
                      <div className="flex flex-col gap-4">
                        {/* แถวที่ 1: วันที่/เวลา, แพทย์ */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-20">
                          <div className="relative">
                            <label className="block text-xs font-medium text-slate-600 mb-1 ml-1 kanit-text">วันที่/เวลา</label>
                            <div ref={opdWrapperRef} className="relative group">
                              <input type="text" className={`${theme.input} bg-white py-2 text-sm pr-9 font-data`} value={newOpdRecord.datetime} onChange={(e) => setNewOpdRecord({...newOpdRecord, datetime: e.target.value})} placeholder="DD/MM/YYYY HH:mm น." />
                              <button type="button" onClick={handleOpenOpdCalendar} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-sky-500 rounded-lg transition-colors"><CalendarIcon size={16} /></button>
                            </div>
                          </div>
                          
                          {/* --- Dropdown แพทย์ผู้รักษา (อัจฉริยะ + Recent) --- */}
                          <div className="relative">
                            <label className="block text-xs font-medium text-slate-600 mb-1 ml-1 kanit-text">แพทย์ผู้รักษา</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    className={`${theme.input} bg-white py-2 text-sm font-data ${currentUser.role === 'doctor' || currentUser.category === 'doctor' ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : 'pr-8 cursor-pointer'}`} 
                                    value={newOpdRecord.doctor} 
                                    onChange={(e) => {
                                        if (currentUser.role !== 'doctor' && currentUser.category !== 'doctor') setNewOpdRecord({...newOpdRecord, doctor: e.target.value});
                                    }} 
                                    onFocus={() => {
                                        if (currentUser.role !== 'doctor' && currentUser.category !== 'doctor') setShowDoctorSuggest(true);
                                    }}
                                    onBlur={() => setTimeout(() => setShowDoctorSuggest(false), 200)}
                                    placeholder="ค้นหา หรือ ระบุชื่อแพทย์" 
                                    readOnly={currentUser.role === 'doctor' || currentUser.category === 'doctor'}
                                />
                                {(currentUser.role !== 'doctor' && currentUser.category !== 'doctor') && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <ChevronDown size={16} className={`transition-transform duration-200 ${showDoctorSuggest ? 'rotate-180' : ''}`} />
                                    </div>
                                )}
                            </div>
                            
                            {showDoctorSuggest && (currentUser.role !== 'doctor' && currentUser.category !== 'doctor') && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200 origin-top flex flex-col">
                                    
                                    {/* ส่วนที่ 1: แพทย์ที่เลือกล่าสุด (แสดงเฉพาะตอนที่ยังไม่ได้พิมพ์ค้นหา) */}
                                    {recentDoctors.length > 0 && !newOpdRecord.doctor && (
                                        <div className="flex flex-col">
                                            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 sticky top-0 z-10">
                                                <History size={12} className="text-slate-400" />
                                                <span className="text-[10px] font-bold text-slate-500 uppercase kanit-text tracking-wider">เลือกล่าสุด</span>
                                            </div>
                                            {recentDoctors.map((docName, idx) => (
                                                <div 
                                                    key={`recent-${idx}`} 
                                                    onMouseDown={(e) => { e.preventDefault(); handleSelectDoctor(docName); }} 
                                                    className={`px-3 py-2.5 hover:bg-sky-50 cursor-pointer border-b border-slate-50 last:border-0 font-data text-sm transition-colors text-slate-700 flex items-center gap-2`}
                                                >
                                                    <Clock size={12} className="text-slate-300" />
                                                    {docName}
                                                </div>
                                            ))}
                                            <div className="h-px bg-slate-200 mx-3 my-1"></div>
                                        </div>
                                    )}

                                    {/* ส่วนที่ 2: รายชื่อแพทย์ทั้งหมด */}
                                    <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 sticky top-0 z-10">
                                        <Users size={12} className="text-slate-400" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase kanit-text tracking-wider">รายชื่อทั้งหมด</span>
                                    </div>
                                    {(() => {
                                        const allDocs = staffData.filter(s => s.role === 'doctor' || s.category === 'doctor');
                                        const filteredDocs = allDocs.filter(d => !newOpdRecord.doctor || d.name.toLowerCase().includes(newOpdRecord.doctor.toLowerCase()));
                                        
                                        if (filteredDocs.length > 0) {
                                            return filteredDocs.map((doc, idx) => (
                                                <div 
                                                    key={doc.id || idx} 
                                                    onMouseDown={(e) => { e.preventDefault(); handleSelectDoctor(doc.name); }} 
                                                    className={`px-3 py-2.5 hover:bg-sky-50 cursor-pointer border-b border-slate-50 last:border-0 font-data text-sm transition-colors ${newOpdRecord.doctor === doc.name ? 'bg-sky-50 text-sky-600 font-bold' : 'text-slate-700'}`}
                                                >
                                                    {doc.name}
                                                </div>
                                            ));
                                        } else {
                                            return (
                                                <div className="px-3 py-6 text-sm text-slate-400 font-data flex flex-col items-center justify-center gap-2 kanit-text">
                                                    <Search size={24} className="opacity-20" />
                                                    <span>ไม่พบรายชื่อแพทย์</span>
                                                </div>
                                            );
                                        }
                                    })()}
                                </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1 ml-1 kanit-text">สาขาที่รับบริการ</label>
                            <CustomSelect
                              value={newOpdRecord.branchId}
                              onChange={(val) => setNewOpdRecord({...newOpdRecord, branchId: val})}
                              placeholder="เลือกสาขา"
                              options={branchesData.map(b => ({ value: b.id, label: b.clinicName || b.name }))}
                            />
                          </div>
                        </div>

                        {/* แถวที่ 2: Vitals ปรับลด Grid สำหรับหน้าจอมือถือให้อ่านง่ายขึ้น */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                           <div><label className="block text-[10px] font-medium text-slate-600 mb-1 ml-1 kanit-text">อุณหภูมิ (?C)</label><input type="text" className={`${theme.input} bg-white py-2 text-sm px-2 text-center font-data`} value={newOpdRecord.temp} onChange={(e) => setNewOpdRecord({...newOpdRecord, temp: e.target.value})} placeholder="36.5" /></div>
                           <div><label className="block text-[10px] font-medium text-slate-600 mb-1 ml-1 kanit-text">สัญญาณชีพ (/min)</label><input type="text" className={`${theme.input} bg-white py-2 text-sm px-2 text-center font-data`} value={newOpdRecord.pulse} onChange={(e) => setNewOpdRecord({...newOpdRecord, pulse: e.target.value})} placeholder="80" /></div>
                           <div className="col-span-2 md:col-span-1"><label className="block text-[10px] font-medium text-slate-600 mb-1 ml-1 kanit-text">ความดัน</label><input type="text" className={`${theme.input} bg-white py-2 text-sm px-2 text-center font-data`} value={newOpdRecord.bp} onChange={(e) => setNewOpdRecord({...newOpdRecord, bp: e.target.value})} placeholder="120/80" /></div>
                           <div><label className="block text-[10px] font-medium text-slate-600 mb-1 ml-1 kanit-text">น้ำหนัก (kg)</label><input type="text" className={`${theme.input} bg-white py-2 text-sm px-2 text-center font-data`} value={newOpdRecord.weight} onChange={(e) => setNewOpdRecord({...newOpdRecord, weight: e.target.value})} placeholder="60" /></div>
                           <div><label className="block text-[10px] font-medium text-slate-600 mb-1 ml-1 kanit-text">ส่วนสูง (cm)</label><input type="text" className={`${theme.input} bg-white py-2 text-sm px-2 text-center font-data`} value={newOpdRecord.height} onChange={(e) => setNewOpdRecord({...newOpdRecord, height: e.target.value})} placeholder="170" /></div>
                        </div>

                        {/* แถวที่ 3: CC, Dx */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div><label className="block text-xs font-medium text-slate-600 mb-1 ml-1 kanit-text">อาการสำคัญ (CC)</label><textarea rows="2" className={`${theme.input} bg-white py-2 text-sm resize-none font-data`} value={newOpdRecord.cc} onChange={(e) => setNewOpdRecord({...newOpdRecord, cc: e.target.value})} placeholder="เช่น มีไข้ ไอ เจ็บคอ..."></textarea></div>
                          <div><label className="block text-xs font-medium text-slate-600 mb-1 ml-1 kanit-text">การวินิจฉัย (Dx)</label><textarea rows="2" className={`${theme.input} bg-white py-2 text-sm resize-none font-data`} value={newOpdRecord.dx} onChange={(e) => setNewOpdRecord({...newOpdRecord, dx: e.target.value})} placeholder="เช่น Acute Pharyngitis..."></textarea></div>
                        </div>

                        {/* แถวที่ 4: Tx */}
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1 ml-1 kanit-text">การรักษาที่ให้</label>
                          <div className="flex flex-col gap-2">
                            {newOpdRecord.tx.map((treatment, txIndex) => (
                              <div key={txIndex} className="flex gap-2 items-stretch w-full">
                                {/* ใช้ z-index คำนวณตาม index เพื่อให้ dropdown ของรายการบน ทับรายการล่าง */}
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
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200 origin-top flex flex-col">
                                      
                                      {/* ส่วนที่ 1: การรักษาล่าสุด (แสดงเฉพาะตอนที่ยังไม่ได้พิมพ์ค้นหา) */}
                                      {recentTreatments.length > 0 && !treatment && (
                                        <div className="flex flex-col">
                                          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 sticky top-0 z-10">
                                            <History size={12} className="text-slate-400" />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase kanit-text tracking-wider">การรักษาล่าสุด (Recent)</span>
                                          </div>
                                          {recentTreatments.map((txName, idx) => (
                                            <div 
                                              key={`recent-tx-${idx}`} 
                                              onMouseDown={(e) => {
                                                e.preventDefault();
                                                handleSelectTreatment(txName, txIndex);
                                              }}
                                              className="px-3 py-2.5 hover:bg-sky-50 cursor-pointer border-b border-slate-50 last:border-0 font-data text-sm transition-colors text-slate-700 flex items-center gap-2"
                                            >
                                              <Clock size={12} className="text-slate-300" />
                                              {txName}
                                            </div>
                                          ))}
                                          <div className="h-px bg-slate-200 mx-3 my-1"></div>
                                        </div>
                                      )}

                                      {/* ส่วนที่ 2: รายการการรักษาทั้งหมด (Catalog) */}
                                      {recentTreatments.length > 0 && !treatment && (
                                        <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 sticky top-0 z-10">
                                          <Package size={12} className="text-slate-400" />
                                          <span className="text-[10px] font-bold text-slate-500 uppercase kanit-text tracking-wider">รายการทั้งหมด</span>
                                        </div>
                                      )}

                                      {posProducts.filter(p => p.name.toLowerCase().includes(treatment.toLowerCase())).length > 0 ? (
                                          posProducts.filter(p => p.name.toLowerCase().includes(treatment.toLowerCase())).map(p => (
                                            <div
                                              key={p.id}
                                              onMouseDown={(e) => {
                                                e.preventDefault();
                                                handleSelectTreatment(p.name, txIndex);
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

                        {/* แถวที่ 5: ความเห็น/ข้อแนะนำ & Note */}
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1 ml-1 kanit-text">ความเห็น/ข้อแนะนำ</label>
                          <textarea rows="2" className={`${theme.input} bg-white py-2 text-sm resize-none font-data mb-3`} value={newOpdRecord.advice || ''} onChange={(e) => setNewOpdRecord({...newOpdRecord, advice: e.target.value})} placeholder="ระบุความเห็นหรือข้อแนะนำ..."></textarea>

                          <label className="block text-xs font-medium text-slate-600 mb-1 ml-1 kanit-text">หมายเหตุเพิ่มเติม</label>
                          <textarea rows="2" className={`${theme.input} bg-white py-2 text-sm resize-none font-data`} value={newOpdRecord.note} onChange={(e) => setNewOpdRecord({...newOpdRecord, note: e.target.value})} placeholder="รายละเอียดหรือหมายเหตุอื่นๆ..."></textarea>
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
                      {/* --- Desktop View (Table) --- */}
                      {/* แก้ไข: เพิ่ม overflow-y-hidden เพื่อป้องกัน Scrollbar กระพริบ */}
                      <div className="hidden lg:block overflow-x-auto overflow-y-hidden">
                        <table className="table-auto w-full text-left border-collapse min-w-[800px] text-sm">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 kanit-text"><th className="w-[14%] p-3 font-medium">วันที่/เวลา</th><th className="w-[12%] p-3 font-medium">สาขา</th><th className="w-[12%] p-3 font-medium">Vitals</th><th className="w-[24%] p-3 font-medium">อาการ/วินิจฉัย</th><th className="w-[12%] p-3 font-medium">การรักษา</th><th className="w-[18%] p-3 font-medium">แพทย์</th><th className="w-[120px] p-3 font-medium text-right">จัดการ</th></tr>
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
                                <td className="p-3 text-slate-500 text-[11px] whitespace-nowrap">                                  T: <span className="font-data font-semibold text-slate-700">{record.temp || '-'}</span> | PR: <span className="font-data font-semibold text-slate-700">{record.pulse || '-'}</span> | BP: <span className="font-data font-semibold text-slate-700">{record.bp || '-'}</span><br/>
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
                                    <button type="button" onClick={() => handlePrintOpdRecord(record, index)} className="text-sky-600 p-1.5 bg-sky-50 border border-sky-100 rounded-lg shadow-sm transition-colors hover:bg-sky-100" title="พิมพ์ใบ OPD">
                                      <Printer size={16} />
                                    </button>
                                    <button type="button" onClick={() => handlePrintMedicalCertificate(record, index)} className="text-emerald-600 p-1.5 bg-emerald-50 border border-emerald-100 rounded-lg shadow-sm transition-colors hover:bg-emerald-100" title="พิมพ์ใบรับรองแพทย์">
                                      <FileText size={16} />
                                    </button>
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

                      {/* --- Mobile View (Cards) --- */}
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
                                      <button type="button" onClick={(e) => { e.stopPropagation(); handlePrintOpdRecord(record, index); }} className="flex items-center justify-center gap-1.5 py-2 text-sky-600 bg-sky-50 border border-sky-100 rounded-xl transition-colors font-medium text-[11px] kanit-text shadow-sm hover:bg-sky-100">
                                          <Printer size={14} /> OPD
                                      </button>
                                      <button type="button" onClick={(e) => { e.stopPropagation(); handlePrintMedicalCertificate(record, index); }} className="flex items-center justify-center gap-1.5 py-2 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl transition-colors font-medium text-[11px] kanit-text shadow-sm hover:bg-emerald-100">
                                          <Printer size={14} /> ใบรับรอง
                                      </button>
                                      <button type="button" onClick={(e) => { e.stopPropagation(); handleOpenOpdForm(index, record); }} className="flex items-center justify-center gap-1.5 py-2 text-slate-500 hover:text-sky-600 bg-white border border-slate-100 hover:bg-sky-50 hover:border-sky-100 rounded-xl transition-colors font-medium text-[11px] kanit-text shadow-sm">
                                          <Pencil size={14} /> แก้ไข
                                      </button>
                                      <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteOpdRecord(index); }} className="flex items-center justify-center gap-1.5 py-2 text-slate-500 hover:text-rose-600 bg-white border border-slate-100 hover:bg-rose-50 hover:border-rose-100 rounded-xl transition-colors font-medium text-[11px] kanit-text shadow-sm">
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

            {/* ย้ายปุ่ม Action ต่างๆ มารวมกันไว้ข้างล่างตรงนี้ทั้งหมด พร้อมทำเป็น flex-col-reverse บนมือถือ */}
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
      )}

      {showCalendar && (
        <div className={`fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/30 sm:bg-slate-900/10 backdrop-blur-sm ${isCalendarClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className="absolute inset-0" onClick={closeMedCalendar}></div>
          <div 
            ref={medCalSwipeProps.ref} 
            style={medCalSwipeProps.style}
            className={`relative z-[165] w-full max-w-[340px] sm:max-w-[320px] bg-white sm:rounded-[1.5rem] border border-slate-100 p-5 sm:p-5 mobile-bottom-sheet shadow-2xl ${isCalendarClosing ? 'closing modal-animate-out' : 'modal-animate-in'}`}
          >
            <div className="w-full pt-1 pb-4 -mt-2 sm:hidden flex justify-center items-start touch-none">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>
            {calView === 'days' && (
              <>
                <div className="flex justify-between items-center mb-4"><button type="button" onClick={handlePrevMonth} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronLeft size={20} /></button><button type="button" onClick={() => setCalView('months')} className="font-bold text-slate-800 hover:text-sky-500 px-3 py-1.5 sm:py-1 rounded-xl hover:bg-slate-50 transition-colors text-base sm:text-sm kanit-text">{thaiMonths[calDate.getMonth()]} {calDate.getFullYear() + 543}</button><button type="button" onClick={handleNextMonth} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronRight size={20} /></button></div>
                <div className="grid grid-cols-7 gap-1 text-center mb-3">{['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d, i) => (<div key={d} className={`text-[11px] sm:text-xs font-semibold tracking-wide py-1 kanit-text ${i === 0 ? 'text-rose-500' : 'text-slate-500'}`}>{d}</div>))}</div>
                <div className="grid grid-cols-7 gap-y-2 sm:gap-y-1 text-center">{blankDays.map(b => <div key={`blank-${b}`} className="w-10 h-10 sm:w-8 sm:h-8"></div>)}{monthDays.map(day => {
                  const isSelected = formData.dob === `${String(day).padStart(2, '0')}/${String(calDate.getMonth() + 1).padStart(2, '0')}/${calDate.getFullYear() + 543}`;
                  const isToday = new Date().getDate() === day && new Date().getMonth() === calDate.getMonth() && new Date().getFullYear() === calDate.getFullYear();
                  return (<button key={day} type="button" onClick={() => handleSelectDate(day)} className={`w-10 h-10 sm:w-8 sm:h-8 mx-auto rounded-full flex items-center justify-center text-sm sm:text-xs font-medium transition-all font-data ${isSelected ? 'bg-sky-500 text-white shadow-md shadow-sky-500/40 transform scale-110' : isToday ? 'bg-sky-50 text-sky-600 font-bold border border-sky-200' : 'text-slate-700 hover:bg-slate-100'}`}>{day}</button>)
                })}</div>
              </>
            )}
            {calView === 'months' && (
              <>
                <div className="flex justify-between items-center mb-6"><button type="button" onClick={() => setCalDate(new Date(calDate.getFullYear() - 1, calDate.getMonth(), 1))} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronLeft size={20} /></button><button type="button" onClick={() => setCalView('years')} className="font-bold text-slate-800 hover:text-sky-500 px-3 py-1.5 sm:py-1 rounded-xl hover:bg-slate-50 transition-colors text-base sm:text-sm font-data">{calDate.getFullYear() + 543}</button><button type="button" onClick={() => setCalDate(new Date(calDate.getFullYear() + 1, calDate.getMonth(), 1))} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronRight size={20} /></button></div>
                <div className="grid grid-cols-3 gap-2">{thaiMonthsShort.map((m, i) => (<button key={m} type="button" onClick={() => {setCalDate(new Date(calDate.getFullYear(), i, 1)); setCalView('days');}} className={`py-4 sm:py-3 rounded-2xl text-sm font-medium transition-all kanit-text ${calDate.getMonth() === i ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30' : 'text-slate-700 hover:bg-slate-50'}`}>{m}</button>))}</div>
              </>
            )}
            {calView === 'years' && (
              <>
                <div className="flex justify-between items-center mb-6"><button type="button" onClick={() => setYearPageStart(y => y - 12)} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronLeft size={20} /></button><span className="font-bold text-slate-800 px-3 py-1.5 text-base sm:text-sm font-data">{yearPageStart} - {yearPageStart + 11}</span><button type="button" onClick={() => setYearPageStart(y => y + 12)} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronRight size={20} /></button></div>
                <div className="grid grid-cols-3 gap-2">{Array.from({length: 12}, (_, i) => yearPageStart + i).map(y => (<button key={y} type="button" onClick={() => {setCalDate(new Date(y - 543, calDate.getMonth(), 1)); setCalView('months');}} className={`py-4 sm:py-3 rounded-2xl text-sm font-medium transition-all font-data ${(calDate.getFullYear() + 543) === y ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30' : 'text-slate-700 hover:bg-slate-50'}`}>{y}</button>))}</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* --- ปฏิทินประวัติการรักษา (OPD Calendar) --- */}
      {showOpdCalendar && (
        <div className={`fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/30 sm:bg-slate-900/10 backdrop-blur-sm ${isOpdCalendarClosing ? 'backdrop-animate-out' : 'fade-in'}`}>
          <div className="absolute inset-0" onClick={closeMedOpdCalendar}></div>
          <div 
            ref={medOpdCalSwipeProps.ref} 
            style={medOpdCalSwipeProps.style}
            className={`relative z-[165] w-full max-w-[340px] sm:max-w-[320px] bg-white/95 backdrop-blur-xl sm:rounded-[1.5rem] border border-slate-100 p-5 sm:p-5 mobile-bottom-sheet shadow-2xl ${isOpdCalendarClosing ? 'closing modal-animate-out' : 'modal-animate-in'}`}
          >
            <div className="w-full pt-1 pb-4 -mt-2 sm:hidden flex justify-center items-start touch-none">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>
            {opdCalView === 'days' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center mb-2">
                  <button type="button" onClick={() => setOpdCalDate(new Date(opdCalDate.getFullYear(), opdCalDate.getMonth() - 1, 1))} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronLeft size={20} /></button>
                  <button type="button" onClick={() => setOpdCalView('months')} className="font-bold text-slate-800 hover:text-sky-500 px-3 py-1.5 sm:py-1 rounded-xl hover:bg-slate-50 transition-colors text-base sm:text-sm kanit-text">{thaiMonths[opdCalDate.getMonth()]} {opdCalDate.getFullYear() + 543}</button>
                  <button type="button" onClick={() => setOpdCalDate(new Date(opdCalDate.getFullYear(), opdCalDate.getMonth() + 1, 1))} className="p-2 sm:p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-colors"><ChevronRight size={20} /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {['อา','จ','อ','พ','พฤ','ศ','ส'].map((d, i) => (<div key={d} className={`text-[11px] sm:text-[10px] font-bold uppercase tracking-wider kanit-text ${i === 0 ? 'text-rose-500' : 'text-slate-400'}`}>{d}</div>))}
                </div>
                <div className="grid grid-cols-7 gap-y-2 sm:gap-y-1 text-center">
                  {Array.from({ length: new Date(opdCalDate.getFullYear(), opdCalDate.getMonth(), 1).getDay() }, (_, i) => i).map(b => <div key={`blank-${b}`} className="w-10 h-10 sm:w-8 h-8"></div>)}
                  {Array.from({ length: new Date(opdCalDate.getFullYear(), opdCalDate.getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map(day => {
                    const isSelected = opdCalDate.getDate() === day;
                    const isToday = new Date().getDate() === day && new Date().getMonth() === opdCalDate.getMonth() && new Date().getFullYear() === opdCalDate.getFullYear();
                    return (
                      <button key={day} type="button" onClick={() => setOpdCalDate(new Date(opdCalDate.getFullYear(), opdCalDate.getMonth(), day))} className={`w-10 h-10 sm:w-8 sm:h-8 mx-auto rounded-full flex items-center justify-center text-sm sm:text-xs font-medium transition-all font-data ${isSelected ? 'bg-sky-500 text-white shadow-md' : isToday ? 'bg-sky-50 text-sky-600 font-bold border border-sky-200' : 'text-slate-700 hover:bg-slate-100'}`}>{day}</button>
                    )
                  })}
                </div>
              </div>
            )}
            {opdCalView === 'months' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center mb-4">
                  <button type="button" onClick={() => setOpdCalDate(new Date(opdCalDate.getFullYear() - 1, opdCalDate.getMonth(), 1))} className="p-2 sm:p-1.5 text-slate-400 hover:bg-sky-50 rounded-full"><ChevronLeft size={20} /></button>
                  <button type="button" onClick={() => setOpdCalView('months')} className="font-bold text-slate-800 hover:text-sky-500 px-3 py-1.5 sm:py-1 rounded-xl text-base sm:text-sm font-data">{opdCalDate.getFullYear() + 543}</button>
                  <button type="button" onClick={() => setOpdCalDate(new Date(opdCalDate.getFullYear() + 1, opdCalDate.getMonth(), 1))} className="p-2 sm:p-1.5 text-slate-400 hover:bg-sky-50 rounded-full"><ChevronRight size={20} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {thaiMonthsShort.map((m, i) => (<button key={m} type="button" onClick={() => {setOpdCalDate(new Date(opdCalDate.getFullYear(), i, 1)); setOpdCalView('days');}} className={`py-4 sm:py-3 rounded-2xl text-sm font-bold transition-all kanit-text ${opdCalDate.getMonth() === i ? 'bg-sky-500 text-white shadow-md' : 'text-slate-700 hover:bg-slate-50'}`}>{m}</button>))}
                </div>
              </div>
            )}
            {opdCalView === 'years' && (
                <div className="space-y-3">
                <div className="flex justify-between items-center mb-4 px-1">
                  <button type="button" onClick={() => setOpdYearPageStart(y => y - 12)} className="p-2 sm:p-1.5 text-slate-400 hover:bg-sky-50 rounded-full"><ChevronLeft size={20} /></button>
                  <span className="font-bold text-slate-800 text-base sm:text-sm font-data">{opdYearPageStart} - {opdYearPageStart + 11}</span>
                  <button type="button" onClick={() => setOpdYearPageStart(y => y + 12)} className="p-2 sm:p-1.5 text-slate-400 hover:bg-sky-50 rounded-full"><ChevronRight size={20} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({length: 12}, (_, i) => opdYearPageStart + i).map(y => (<button key={y} type="button" onClick={() => {setOpdCalDate(new Date(y - 543, opdCalDate.getMonth(), 1)); setOpdCalView('months');}} className={`py-4 sm:py-3 rounded-2xl text-sm font-bold transition-all font-data ${(opdCalDate.getFullYear() + 543) === y ? 'bg-sky-500 text-white shadow-md' : 'text-slate-700 hover:bg-slate-50'}`}>{y}</button>))}
                </div>
              </div>
            )}

            {/* Time & Action Panel - ปรับเลย์เอาต์แนวนอนตามรูปภาพ (Mockup) */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-row items-center justify-between w-full gap-1 sm:gap-2">
                <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-50/50 px-2 py-1.5 rounded-xl border border-slate-200 shadow-sm shrink-0">
                    <Clock size={16} className="text-sky-500 shrink-0" />
                    
                    <CustomSelect 
                        compact dropUp
                        value={opdTime.h} 
                        onChange={v => setOpdTime({...opdTime, h: v})} 
                        options={Array.from({length:24}, (_,i)=>({value: String(i).padStart(2,'0'), label: String(i).padStart(2,'0')}))}
                    />
                    
                    <span className="text-slate-400 font-bold kanit-text pb-0.5 shrink-0">:</span>
                    
                    <CustomSelect 
                        compact dropUp
                        value={opdTime.m} 
                        onChange={v => setOpdTime({...opdTime, m: v})} 
                        options={Array.from({length:60}, (_,i)=>({value: String(i).padStart(2,'0'), label: String(i).padStart(2,'0')}))}
                    />
                </div>
                
                <div className="flex gap-1.5 sm:gap-2 shrink-0">
                    <button type="button" onClick={() => {
                          const now = new Date();
                          setOpdCalDate(now);
                          setOpdTime({h: String(now.getHours()).padStart(2,'0'), m: String(now.getMinutes()).padStart(2,'0')});
                          setOpdCalView('days');
                    }} className="px-2.5 sm:px-3 py-2 text-[11px] sm:text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors kanit-text shadow-sm whitespace-nowrap">ปัจจุบัน</button>
                    <button type="button" onClick={() => {
                          const d = String(opdCalDate.getDate()).padStart(2, '0');
                          const m = String(opdCalDate.getMonth() + 1).padStart(2, '0');
                          const y = opdCalDate.getFullYear() + 543;
                          setNewOpdRecord({...newOpdRecord, datetime: `${d}/${m}/${y} ${opdTime.h}:${opdTime.m} น.`});
                          closeMedOpdCalendar();
                    }} className="px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-semibold text-white bg-sky-500 hover:bg-sky-600 rounded-xl shadow-md shadow-sky-500/20 transition-colors kanit-text whitespace-nowrap">ตกลง</button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal สำหรับกล้อง (Medical Records Scanner) */}
      {isScannerOpen && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/75 fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col modal-animate-in">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 kanit-text flex items-center gap-2 text-lg">
                <ScanText className="text-indigo-500" /> สแกนบัตรประชาชน
              </h3>
              <button type="button" onClick={() => !isScanning && setIsScannerOpen(false)} className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-full transition-colors" disabled={isScanning}>
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 bg-slate-800 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden">
                <div className="w-[85%] aspect-[8.5/5.4] border-2 border-white/50 rounded-2xl relative z-10 overflow-hidden shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                    {/* มุมกล้อง (Corners) */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-2xl"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-2xl"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-2xl"></div>
                    
                    {/* แอนิเมชันเส้นสแกน */}
                    {isScanning && (
                        <div className="absolute left-0 right-0 h-1 bg-indigo-500 shadow-[0_0_15px_5px_rgba(99,102,241,0.5)]" style={{ animation: 'scanLine 2s linear infinite' }}></div>
                    )}
                </div>
                
                <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover z-0"></video>
                
                <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/60 transition-all duration-300 ${isScanning ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                    <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mb-3" />
                    <p className="text-white font-bold kanit-text">กำลังประมวลผล OCR...</p>
                    <p className="text-indigo-200 text-xs mt-1 kanit-text">กรุณารอสักครู่</p>
                </div>
            </div>
            
            <div className="p-5 bg-white flex flex-col gap-3">
              <p className="text-sm text-slate-500 text-center kanit-text">จัดวางบัตรประชาชนให้อยู่ในกรอบ และมีแสงสว่างเพียงพอ</p>
              <button 
                  type="button"
                  onClick={handleRealScan} 
                  disabled={isScanning}
                  className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all active:scale-95 flex items-center justify-center gap-2 kanit-text text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  {isScanning ? <Loader2 size={24} className="animate-spin" /> : <Camera size={24} />} 
                  {isScanning ? 'กำลังสแกน...' : 'ถ่ายภาพและดึงข้อมูล'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </>
  );
};

export default MedicalRecords;





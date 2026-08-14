import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import MedicalRecords from './MedicalRecords';
import CustomSelect from './CustomSelect';
import CalendarDay from './CalendarDay';
import { getLocalStore } from '../lib/offlineStore';
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

const ReportsManager = ({ patientsData = [], setPatientsData, posHistoryData = [], setPosHistoryData, branchesData = [], posProducts = [], isGlobalLoading, showToast, currentBranch, staffData = [], callAppScript, fetchPatientsPaginated }) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [docServerStats, setDocServerStats] = useState(null);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  // States สำหรับเก็บข้อมูลที่รวมกับ IndexedDB และข้อมูล Paginated
  const [localPatients, setLocalPatients] = useState(patientsData || []);
  const [localPosHistory, setLocalPosHistory] = useState(posHistoryData || []);
  const [hasMoreServer, setHasMoreServer] = useState(true);

  const headerRef = useRef(null);
  const filterRef = useRef(null);

  // 🌟 1. ดึงข้อมูลจาก IndexedDB (patients, treatments, pos_transactions) ที่เคยโหลดมาจากหน้าอื่น (0 Egress)
  useEffect(() => {
    let isMounted = true;

    const syncFromIndexedDB = async () => {
      try {
        const [dbPatients, dbTreatments, dbPosTx] = await Promise.all([
          getLocalStore('patients').catch(() => []),
          getLocalStore('treatments').catch(() => []),
          getLocalStore('pos_transactions').catch(() => [])
        ]);

        if (!isMounted) return;

        // Map Treatments จาก IndexedDB
        const txMap = {};
        (dbTreatments || []).forEach(t => {
          if (!t) return;
          const pid = String(t.patient_id || t.patientId || t.hn || '').trim();
          if (pid) {
            const lower = pid.toLowerCase();
            const norm = lower.replace(/o/g, '0');
            if (!txMap[pid]) txMap[pid] = [];
            if (!txMap[lower]) txMap[lower] = txMap[pid];
            if (!txMap[norm]) txMap[norm] = txMap[pid];
            txMap[pid].push(t);
          }
        });

        // Merge patients จาก IndexedDB เข้ากับ patientsData prop
        const patMap = new Map();
        [...(patientsData || []), ...(dbPatients || [])].forEach(p => {
          if (!p) return;
          const key = String(p.id || p.hn || '').trim();
          if (!key) return;

          const existing = patMap.get(key) || p;
          let opdList = existing.opdRecords || existing.opd_records || existing.treatments || [];
          if (typeof opdList === 'string' && opdList.startsWith('[')) {
            try { opdList = JSON.parse(opdList); } catch (e) {}
          }
          if (!Array.isArray(opdList)) opdList = [];

          const pId = String(p.id || '').trim();
          const pHn = String(p.hn || '').trim();
          const pNorm = (pId || pHn).toLowerCase().replace(/o/g, '0');
          const fetchedTx = txMap[pId] || txMap[pHn] || txMap[pNorm] || [];

          const finalOpd = fetchedTx.length > 0 ? fetchedTx : opdList;
          patMap.set(key, { ...existing, ...p, opdRecords: finalOpd });
        });

        const mergedPatients = Array.from(patMap.values());

        // Merge pos_transactions จาก IndexedDB เข้ากับ posHistoryData prop
        const posMap = new Map();
        [...(posHistoryData || []), ...(dbPosTx || [])].forEach(tx => {
          if (!tx) return;
          const key = String(tx.id || tx.receiptNo || tx.receipt_no || '').trim();
          if (key) posMap.set(key, tx);
        });

        const mergedPos = Array.from(posMap.values());

        if (isMounted) {
          if (mergedPatients.length > 0) setLocalPatients(mergedPatients);
          if (mergedPos.length > 0) setLocalPosHistory(mergedPos);
        }
      } catch (e) {
        console.error("IndexedDB Reports sync error:", e);
      }
    };

    syncFromIndexedDB();
    return () => { isMounted = false; };
  }, []);

  // ซิงค์เมื่อ props อัปเดตข้อมูลใหม่
  useEffect(() => {
    if (patientsData && patientsData.length > 0) {
      setLocalPatients(prev => {
        const patMap = new Map();
        [...prev, ...patientsData].forEach(p => {
          if (!p) return;
          const key = String(p.id || p.hn || '').trim();
          if (key) {
            const existing = patMap.get(key) || {};
            patMap.set(key, { ...existing, ...p });
          }
        });
        return Array.from(patMap.values());
      });
    }
  }, [patientsData]);

  useEffect(() => {
    if (posHistoryData && posHistoryData.length > 0) {
      setLocalPosHistory(prev => {
        const posMap = new Map();
        [...prev, ...posHistoryData].forEach(tx => {
          if (!tx) return;
          const key = String(tx.id || tx.receiptNo || tx.receipt_no || '').trim();
          if (key) posMap.set(key, tx);
        });
        return Array.from(posMap.values());
      });
    }
  }, [posHistoryData]);

  // 🌟 ดึงสรุปจำนวนเอกสารตรงจาก Server (0 Egress / High Performance HEAD Count)
  useEffect(() => {
    let isMounted = true;
    setIsStatsLoading(true);

    const loadStats = async () => {
      try {
        if (callAppScript) {
          const res = await callAppScript('GET_REPORT_DOCUMENT_STATS', 'System', { branchId: currentBranch });
          if (isMounted && res?.status === 'success' && res.data) {
            setDocServerStats(res.data);
            setIsStatsLoading(false);
            return;
          }
        }
      } catch (e) {
        console.error("loadReportStats error:", e);
      }
      if (isMounted) setIsStatsLoading(false);
    };

    loadStats();
    return () => { isMounted = false; };
  }, [currentBranch, callAppScript]);

  // 1. รวบรวมและจัดเตรียมข้อมูลเอกสารทั้งหมด (Normalize Data) - OPTIMIZED
  const allDocuments = useMemo(() => {
    let docs = [];
    const nowIso = new Date().toISOString();

    // 1.1 เวชระเบียน (Medical Records), ประวัติการรักษา (OPD) และ ใบรับรองแพทย์
    localPatients.forEach(p => {
        const parsed = parsePatientName(getPatientFullName(p));
        const fullPatient = {
            ...p,
            prefix: p.prefix || parsed.prefix,
            firstName: p.firstName || parsed.firstName,
            lastName: p.lastName || parsed.lastName
        };

        const patientName = getPatientFullName(fullPatient);
        const recDate = fullPatient.createdAt || fullPatient.created_at || nowIso;
        const patientHn = fullPatient.hn || fullPatient.id;
        
        // เพิ่มเวชระเบียน
        docs.push({
            id: `REC-${patientHn}`,
            type: 'record',
            typeLabel: 'เวชระเบียนผู้ป่วย',
            date: recDate,
            timestamp: new Date(recDate).getTime(),
            patientName: patientName || 'ไม่ระบุชื่อ',
            refNo: patientHn,
            rawData: fullPatient
        });

        // เพิ่มใบยินยอมการรักษา (ถ้าลงชื่อยินยอมเรียบร้อยแล้ว)
        const isConsentAgreed = fullPatient.informedConsentStatus === 'green' || 
                               fullPatient.informed_consent_status === 'green' ||
                               fullPatient.consentStatus === 'green' ||
                               fullPatient.consent_status === 'green';

        if (isConsentAgreed) {
            const consentDate = fullPatient.informedConsentTimestamp || fullPatient.informed_consent_timestamp 
                ? new Date(fullPatient.informedConsentTimestamp || fullPatient.informed_consent_timestamp).toISOString()
                : recDate;
            docs.push({
                id: `CONSENT-${patientHn}`,
                type: 'consent',
                typeLabel: 'ใบยินยอมรับการรักษาพยาบาล',
                date: consentDate,
                timestamp: new Date(consentDate).getTime(),
                patientName: patientName || 'ไม่ระบุชื่อ',
                refNo: patientHn,
                rawData: fullPatient
            });
        }

        // เพิ่มประวัติการรักษา (OPD) และ ใบรับรองแพทย์
        const opdList = fullPatient.opdRecords || fullPatient.opd_records || fullPatient.treatments || [];
        if (Array.isArray(opdList) && opdList.length > 0) {
            opdList.forEach((opd, idx) => {
                let opdIsoDate = nowIso;
                const dateRaw = opd.datetime || opd.created_at || opd.createdAt;
                if (dateRaw) {
                    try {
                        if (dateRaw.includes('/')) {
                            const parts = dateRaw.split(' ');
                            const dParts = parts[0].split('/');
                            if (dParts.length === 3) {
                                opdIsoDate = new Date(parseInt(dParts[2])-543, parseInt(dParts[1])-1, parseInt(dParts[0])).toISOString();
                            }
                        } else {
                            opdIsoDate = new Date(dateRaw).toISOString();
                        }
                    } catch { /* Ignore invalid date format */ }
                }

                const opdKey = opd.id || idx;

                // ประวัติการรักษา (OPD)
                docs.push({
                    id: `OPD-${patientHn}-${opdKey}`,
                    type: 'opd',
                    typeLabel: 'ประวัติการรักษา (OPD)',
                    date: opdIsoDate,
                    timestamp: new Date(opdIsoDate).getTime(),
                    patientName: patientName || 'ไม่ระบุชื่อ',
                    refNo: `${patientHn} (ครั้งที่ ${opdList.length - idx})`,
                    rawData: { opd, patient: fullPatient, index: idx, visitNumber: opdList.length - idx }
                });

                // เพิ่มใบรับรองแพทย์ (ถ้ามีการรันเลขที่เอกสารแล้ว)
                const medCertNo = opd.medCertNumber || opd.med_cert_number || opd.medCertNo || opd.med_cert_no;
                if (medCertNo) {
                    docs.push({
                        id: `MEDCERT-${patientHn}-${opdKey}`,
                        type: 'medcert',
                        typeLabel: 'ใบรับรองแพทย์',
                        date: opdIsoDate,
                        timestamp: new Date(opdIsoDate).getTime(),
                        patientName: patientName || 'ไม่ระบุชื่อ',
                        refNo: medCertNo,
                        rawData: { opd, patient: fullPatient, index: idx }
                    });
                }
            });
        }
    });

    // 1.2 ใบเสร็จรับเงิน (Receipts)
    localPosHistory.forEach(tx => {
        const txStatus = tx.status || tx.deal_status || tx.rawTx?.status;
        if (txStatus !== 'cancelled') {
            const txDate = tx.createdAt || tx.created_at || tx.date || nowIso;
            const receiptId = tx.id || tx.receiptNo || tx.receipt_no || '-';
            docs.push({
                id: `POS-${receiptId}`,
                type: 'receipt',
                typeLabel: 'ใบเสร็จรับเงิน',
                date: txDate,
                timestamp: new Date(txDate).getTime(),
                patientName: tx.patientName || tx.patient_name || (tx.rawTx?.patientName) || 'ลูกค้าทั่วไป (ไม่ระบุ)',
                refNo: receiptId,
                rawData: tx
            });
        }
    });

    // เรียงลำดับจากใหม่ไปเก่า
    return docs.sort((a, b) => b.timestamp - a.timestamp);
  }, [localPatients, localPosHistory]);

  // 2. กรองข้อมูลตามการค้นหาและประเภท
  const filteredDocs = useMemo(() => {
      const s = search.toLowerCase();
      return allDocuments.filter(doc => {
          const matchSearch = (doc.patientName || '').toLowerCase().includes(s) || (doc.refNo || '').toLowerCase().includes(s);
          const matchType = filterType === 'all' || doc.type === filterType;
          return matchSearch && matchType;
      });
  }, [allDocuments, search, filterType]);

  // 3. สถิติสรุปเอกสาร (ใช้ผลลัพธ์คำนวณรวมจาก Server โดยตรง - 0 Egress)
  const stats = useMemo(() => {
      if (docServerStats) {
          return {
              total: docServerStats.total || 0,
              records: docServerStats.records || 0,
              opds: docServerStats.opds || 0,
              receipts: docServerStats.receipts || 0,
              medcerts: docServerStats.medcerts || 0,
              consents: docServerStats.consents || 0
          };
      }

      let localRecs = 0, localOpds = 0, localReceipts = 0, localMedcerts = 0, localConsents = 0;
      allDocuments.forEach(d => {
          if (d.type === 'record') localRecs++;
          else if (d.type === 'opd') localOpds++;
          else if (d.type === 'receipt') localReceipts++;
          else if (d.type === 'medcert') localMedcerts++;
          else if (d.type === 'consent') localConsents++;
      });

      const total = localRecs + localOpds + localReceipts + localMedcerts + localConsents;
      return { total, records: localRecs, opds: localOpds, receipts: localReceipts, medcerts: localMedcerts, consents: localConsents };
  }, [docServerStats, allDocuments]);

  // 4. การจัดการเลือกเอกสาร (Checkbox)
  const toggleSelection = (id) => {
      setSelectedDocs(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
      if (selectedDocs.length === filteredDocs.length && filteredDocs.length > 0) {
          setSelectedDocs([]);
      } else {
          setSelectedDocs(filteredDocs.map(d => d.id));
      }
  };

  const isAllSelected = filteredDocs.length > 0 && selectedDocs.length === filteredDocs.length;

  // ฟังก์ชันพิมพ์เดี่ยวที่ยกมาจากหน้าเวชระเบียนแบบ 100% เพื่อให้ผลลัพธ์เหมือนกันทุกประการ
  const handleSinglePrint = (doc) => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
          alert('เบราว์เซอร์บล็อกการเปิดหน้าต่างพิมพ์ กรุณาอนุญาต Pop-ups');
          return;
      }
      
      let html = '';
      try {
          if (doc.type === 'record') {
              html = globalGenerateRecordHtml(doc.rawData, branchesData, currentBranch);
          } else if (doc.type === 'opd') {
              html = globalGenerateOpdHtml(doc.rawData.patient, doc.rawData.opd, doc.rawData.visitNumber, branchesData, currentBranch);
          } else if (doc.type === 'receipt') {
              html = globalGenerateReceiptHtml(doc.rawData, 'A4', branchesData, patientsData, posProducts, currentBranch);
          } else if (doc.type === 'medcert') {
              html = globalGenerateMedicalCertificateHtml(doc.rawData.patient, doc.rawData.opd, branchesData, currentBranch, staffData);
          } else if (doc.type === 'consent') {
              html = globalGenerateInformedConsentHtml(doc.rawData, branchesData, currentBranch);
          }

          printWindow.document.write(html);
          printWindow.document.close();
          
          setTimeout(() => {
              printWindow.print();
          }, 500);
      } catch (err) {
          console.error("Single Print Error:", err);
          showToast("เกิดข้อผิดพลาดในการพิมพ์: " + err.message, "danger");
      }
  };

  const handleBulkPrint = () => {
      if (selectedDocs.length === 0) {
          showToast('กรุณาเลือกเอกสารที่ต้องการพิมพ์อย่างน้อย 1 รายการ', 'warning');
          return;
      }
      
      // กรณีใบเดียว ให้ใช้ handleSinglePrint เพื่อผลลัพธ์ที่เหมือนต้นฉบับ 100%
      if (selectedDocs.length === 1) {
          const doc = filteredDocs.find(d => d.id === selectedDocs[0]);
          if (doc) {
              handleSinglePrint(doc);
              setSelectedDocs([]);
              return;
          }
      }

      setIsPrinting(true);

      const docsToPrint = filteredDocs.filter(d => selectedDocs.includes(d.id));
      let combinedBody = '';
      let combinedStyles = '';

      docsToPrint.forEach((doc, index) => {
          let html = '';
          let pageClass = '';
          
          if (doc.type === 'record') {
              html = globalGenerateRecordHtml(doc.rawData, branchesData, currentBranch);
              pageClass = 'page-a5-land';
          } else if (doc.type === 'opd') {
              html = globalGenerateOpdHtml(doc.rawData.patient, doc.rawData.opd, doc.rawData.visitNumber, branchesData, currentBranch);
              pageClass = 'page-a5-land';
          } else if (doc.type === 'receipt') {
              html = globalGenerateReceiptHtml(doc.rawData, 'A4', branchesData, patientsData, posProducts, currentBranch);
              pageClass = 'page-a4-receipt';
          } else if (doc.type === 'medcert') {
              html = globalGenerateMedicalCertificateHtml(doc.rawData.patient, doc.rawData.opd, branchesData, currentBranch, staffData);
              pageClass = 'page-a4-medcert';
          } else if (doc.type === 'consent') {
              html = globalGenerateInformedConsentHtml(doc.rawData, branchesData, currentBranch);
              pageClass = 'page-a4-consent';
          }

          const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
          if (styleMatch) {
              let cleanStyle = styleMatch[1]
                  .replace(/@page\s*\{[^}]+\}/gi, '')
                  .replace(/\/\*[\s\S]*?\*\//g, ''); // [FIX] ลบ Comments ออกเพื่อป้องกันปัญหาตอนสโคปคลาส
              
              // [FIX] Scoping CSS อย่างปลอดภัย ข้ามคำสั่ง @media และจัดการ comma-separated selectors
              cleanStyle = cleanStyle.replace(/([^\r\n,{}]+)(?=[^{}]*\{)/g, (match) => {
                  const selector = match.trim();
                  if (!selector || selector.startsWith('@')) return match; // ป้องกันการทำลาย @media print
                  
                  return selector.split(',').map(s => {
                      const sel = s.trim();
                      if (sel === 'body' || sel === 'html') return `.doc-page-${index}`;
                      if (sel.startsWith('@')) return sel;
                      return `.doc-page-${index} ${sel}`;
                  }).join(', ') + ' ';
              });
              combinedStyles += cleanStyle + '\n';
          }

          const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          const content = bodyMatch ? bodyMatch[1] : html;

          combinedBody += `<div class="print-page ${pageClass} doc-page-${index}" id="doc-${index}">${content}</div>`;
      });

      const finalHtml = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
          <meta charset="UTF-8">
          <title>พิมพ์เอกสาร (${selectedDocs.length} รายการ)</title>
          <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
              body { margin: 0; padding: 0; background: #fff; font-family: 'Sarabun', sans-serif; }
              * { box-sizing: border-box; }
              @page a4-page-medcert { size: A4; }
              @page a4-page-consent { size: A4; }
              @page a4-page-receipt { size: A4; margin: 5mm; }
              @page a5-land-page { size: A5 landscape; margin: 10mm; }
              @page a5-port-page { size: A5; margin: 10mm; }
              @media print {
                  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                  .print-page { 
                      page-break-after: always; /* Legacy fallback */
                      break-after: page; /* Modern standard */
                      overflow: hidden; 
                  }
                  .print-page:last-child { 
                      page-break-after: auto; 
                      break-after: auto;
                  }
                  .page-a4-medcert { page: a4-page-medcert; }
                  .page-a4-consent { page: a4-page-consent; }
                  .page-a4-receipt { page: a4-page-receipt; }
                  .page-a5-land { page: a5-land-page; }
                  .page-a5-port { page: a5-port-page; }
              }
              ${combinedStyles}
          </style>
      </head>
      <body>${combinedBody}</body>
      </html>`;

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
          alert('เบราว์เซอร์บล็อกการเปิดหน้าต่างพิมพ์ กรุณาอนุญาต Pop-ups');
          setIsPrinting(false);
          return;
      }
      printWindow.document.write(finalHtml);
      printWindow.document.close();
      setTimeout(() => {
          printWindow.print();
          setIsPrinting(false);
          setSelectedDocs([]); 
          showToast('สั่งพิมพ์สำเร็จ', 'success');
      }, 800);
  };

  const getDocBadge = (type, label) => {
      let colorClass = 'bg-slate-100 text-slate-600 border-slate-200';
      if (type === 'record') colorClass = 'bg-indigo-50 text-indigo-600 border-indigo-100';
      if (type === 'opd') colorClass = 'bg-emerald-50 text-emerald-600 border-emerald-100';
      if (type === 'receipt') colorClass = 'bg-sky-50 text-sky-600 border-sky-100';
      if (type === 'medcert') colorClass = 'bg-rose-50 text-rose-600 border-rose-100';
      if (type === 'consent') colorClass = 'bg-amber-50 text-amber-600 border-amber-100';
      return <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold kanit-text border ${colorClass}`}>{label}</span>;
  };

  // Infinite Scroll & Sticky Behavior
  const [visibleCount, setVisibleCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isLoadingMoreRef = useRef(false);
  const visibleDocs = filteredDocs.slice(0, visibleCount);

  // ฟังก์ชันดึงข้อมูลเพิ่มเมื่อเลื่อนลงสุด (Infinite Scroll)
  const handleLoadMore = useCallback(() => {
    if (isLoadingMoreRef.current) return;

    // 1. ถ้ายังมีข้อมูลที่แคชอยู่ใน filteredDocs แต่ยังไม่ได้แสดง ให้ขยาย visibleCount เพิ่ม
    if (visibleCount < filteredDocs.length) {
      setVisibleCount(prev => Math.min(prev + 20, filteredDocs.length));
      return;
    }

    // 2. ถ้าแสดงข้อมูลในเครื่องครบแล้ว ให้ดึงข้อมูลหน้าถัดไปจาก Server และซิงค์ลง IndexedDB
    if (hasMoreServer && fetchPatientsPaginated) {
      isLoadingMoreRef.current = true;
      setIsLoadingMore(true);

      const offset = localPatients.length;
      fetchPatientsPaginated({ offset, limit: 20 })
        .then(res => {
          if (res?.status === 'success' && Array.isArray(res.patients) && res.patients.length > 0) {
            setLocalPatients(prev => {
              const existingIds = new Set(prev.map(p => String(p.id || p.hn).trim()));
              const newPats = res.patients.filter(p => !existingIds.has(String(p.id || p.hn).trim()));
              const updated = [...prev, ...newPats];
              if (setPatientsData) setPatientsData(updated);
              return updated;
            });
            setHasMoreServer(res.hasMore !== false);
            setVisibleCount(prev => prev + 20);
          } else {
            setHasMoreServer(false);
          }
        })
        .catch(err => {
          console.error("ReportsManager handleLoadMore error:", err);
        })
        .finally(() => {
          isLoadingMoreRef.current = false;
          setIsLoadingMore(false);
        });
    }
  }, [visibleCount, filteredDocs.length, hasMoreServer, fetchPatientsPaginated, localPatients.length, setPatientsData]);

  useEffect(() => {
    const mainElement = document.querySelector('main');

    const handleScroll = rAFThrottle(() => {
      let scrollTop = 0;
      let clientHeight = 0;
      let scrollHeight = 0;

      const scrollTarget = (mainElement && mainElement.scrollHeight > mainElement.clientHeight) ? mainElement : window;

      if (scrollTarget === window) {
        scrollTop = window.scrollY || document.documentElement.scrollTop;
        clientHeight = window.innerHeight;
        scrollHeight = document.documentElement.scrollHeight;
      } else {
        scrollTop = mainElement.scrollTop;
        clientHeight = mainElement.clientHeight;
        scrollHeight = mainElement.scrollHeight;
      }

      if (headerRef.current) {
        if (scrollTop > 20) headerRef.current.classList.add('is-scrolled');
        else headerRef.current.classList.remove('is-scrolled');
      }

      if (filterRef.current && headerRef.current) {
        const headerRect = headerRef.current.getBoundingClientRect();
        const filterRect = filterRef.current.getBoundingClientRect();
        if (filterRect.top <= headerRect.bottom + 1) filterRef.current.classList.add('is-scrolled');
        else filterRef.current.classList.remove('is-scrolled');
      }

      if (scrollTop + clientHeight >= scrollHeight - 300) {
        handleLoadMore();
      }
    });

    window.addEventListener('scroll', handleScroll, { passive: true });
    if (mainElement) {
      mainElement.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (mainElement) mainElement.removeEventListener('scroll', handleScroll);
    };
  }, [handleLoadMore]);

  return (
    <div className="fade-in pb-10 relative flex flex-col h-full w-full">
      <div ref={headerRef} className="sticky z-30 w-full pointer-events-none transition-all duration-300 ease-in-out flex flex-col" style={{ top: 'var(--mobile-header-offset, 0px)' }}>
        <div className="w-full pointer-events-auto sticky-header-bg shrink-0">
          <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 flex flex-row justify-between items-center gap-2 sm:gap-4 sticky-header-inner">
            <div>
              <h1 className="font-bold text-slate-800 tracking-tight kanit-text sticky-header-title">รายงานและสรุปเอกสาร</h1>
              <p className="text-slate-500 kanit-text sticky-header-desc">พิมพ์ประวัติ และใบเสร็จรับเงินย้อนหลังแบบชุด</p>
            </div>
            <button 
              onClick={handleBulkPrint} 
              disabled={selectedDocs.length === 0 || isPrinting}
              className={`flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl font-semibold shadow-sm transition-transform active:scale-95 shrink-0 kanit-text sticky-header-btn px-4 py-2 sm:px-6 sm:py-3 ${selectedDocs.length > 0 ? 'bg-sky-500 text-white shadow-sky-500/30' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
              {isPrinting ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />} 
              <span className="hidden sm:inline">พิมพ์ที่เลือก ({selectedDocs.length})</span>
              <span className="sm:hidden">พิมพ์ ({selectedDocs.length})</span>
            </button>
          </div>
        </div>
      </div>

      <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 mt-4 mb-0 relative z-20 pointer-events-auto">
         <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
            <div className="bg-white p-4 sm:p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden h-full min-h-[110px] sm:min-h-[140px]">
              <div className="flex items-center gap-2.5 mb-2 relative z-10">
                <div className="w-10 h-10 bg-slate-50 text-slate-500 border border-slate-100 rounded-xl flex items-center justify-center shrink-0"><LayoutList size={20} /></div>
                <div className="min-w-0 flex-1"><p className="text-[10px] sm:text-[11px] font-black text-slate-400 kanit-text uppercase tracking-wider">เอกสารทั้งหมด</p></div>
              </div>
              <div className="relative z-10 mt-auto">{isStatsLoading ? <div className="h-8 w-16 bg-slate-200 rounded animate-pulse"></div> : <p className="font-black text-slate-800 font-data text-2xl sm:text-3xl">{formatStatNumber(stats.total)}</p>}</div>
            </div>
            <div className="bg-white p-4 sm:p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden h-full min-h-[110px] sm:min-h-[140px]">
              <div className="flex items-center gap-2.5 mb-2 relative z-10">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-500 border border-indigo-100 rounded-xl flex items-center justify-center shrink-0"><Users size={20} /></div>
                <div className="min-w-0 flex-1"><p className="text-[10px] sm:text-[11px] font-black text-slate-400 kanit-text uppercase tracking-wider">เวชระเบียน</p></div>
              </div>
              <div className="relative z-10 mt-auto">{isStatsLoading ? <div className="h-8 w-16 bg-slate-200 rounded animate-pulse"></div> : <p className="font-black text-indigo-600 font-data text-2xl sm:text-3xl">{formatStatNumber(stats.records)}</p>}</div>
            </div>
            <div className="bg-white p-4 sm:p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden h-full min-h-[110px] sm:min-h-[140px]">
              <div className="flex items-center gap-2.5 mb-2 relative z-10">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-500 border border-emerald-100 rounded-xl flex items-center justify-center shrink-0"><Stethoscope size={20} /></div>
                <div className="min-w-0 flex-1"><p className="text-[10px] sm:text-[11px] font-black text-slate-400 kanit-text uppercase tracking-wider">ใบ OPD</p></div>
              </div>
              <div className="relative z-10 mt-auto">{isStatsLoading ? <div className="h-8 w-16 bg-slate-200 rounded animate-pulse"></div> : <p className="font-black text-emerald-600 font-data text-2xl sm:text-3xl">{formatStatNumber(stats.opds)}</p>}</div>
            </div>
            <div className="bg-white p-4 sm:p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden h-full min-h-[110px] sm:min-h-[140px]">
              <div className="flex items-center gap-2.5 mb-2 relative z-10">
                <div className="w-10 h-10 bg-rose-50 text-rose-500 border border-rose-100 rounded-xl flex items-center justify-center shrink-0"><FileText size={20} /></div>
                <div className="min-w-0 flex-1"><p className="text-[10px] sm:text-[11px] font-black text-slate-400 kanit-text uppercase tracking-wider">ใบรับรองแพทย์</p></div>
              </div>
              <div className="relative z-10 mt-auto">{isStatsLoading ? <div className="h-8 w-16 bg-slate-200 rounded animate-pulse"></div> : <p className="font-black text-rose-600 font-data text-2xl sm:text-3xl">{formatStatNumber(stats.medcerts)}</p>}</div>
            </div>
            <div className="bg-white p-4 sm:p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden h-full min-h-[110px] sm:min-h-[140px]">
              <div className="flex items-center gap-2.5 mb-2 relative z-10">
                <div className="w-10 h-10 bg-amber-50 text-amber-500 border border-amber-100 rounded-xl flex items-center justify-center shrink-0"><HeartPulse size={20} /></div>
                <div className="min-w-0 flex-1"><p className="text-[10px] sm:text-[11px] font-black text-slate-400 kanit-text uppercase tracking-wider">ใบยินยอมรักษา</p></div>
              </div>
              <div className="relative z-10 mt-auto">{isStatsLoading ? <div className="h-8 w-16 bg-slate-200 rounded animate-pulse"></div> : <p className="font-black text-amber-600 font-data text-2xl sm:text-3xl">{formatStatNumber(stats.consents)}</p>}</div>
            </div>
            <div className="bg-white p-4 sm:p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden h-full min-h-[110px] sm:min-h-[140px]">
              <div className="flex items-center gap-2.5 mb-2 relative z-10">
                <div className="w-10 h-10 bg-sky-50 text-sky-500 border border-sky-100 rounded-xl flex items-center justify-center shrink-0"><Receipt size={20} /></div>
                <div className="min-w-0 flex-1"><p className="text-[10px] sm:text-[11px] font-black text-slate-400 kanit-text uppercase tracking-wider">ใบเสร็จ</p></div>
              </div>
              <div className="relative z-10 mt-auto">{isStatsLoading ? <div className="h-8 w-16 bg-slate-200 rounded animate-pulse"></div> : <p className="font-black text-sky-600 font-data text-2xl sm:text-3xl">{formatStatNumber(stats.receipts)}</p>}</div>
            </div>
         </div>
      </div>

      <div ref={filterRef} className="w-full pointer-events-none sticky z-20 transition-all duration-300 ease-in-out my-5 sm:my-6 sticky-filter-appt">
        <div className="w-full mx-auto pointer-events-none relative h-[76px] sm:h-[92px] z-50">
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 mx-auto bg-white/95 backdrop-blur-xl border-slate-200 pointer-events-auto origin-top sticky-filter-inner shadow-sm flex flex-row items-center gap-2 sm:gap-4 px-4 md:px-8 2xl:px-12 py-3 sm:py-4 transition-all">
            <div className="relative flex-1 min-w-0">
              <input type="text" placeholder="ค้นหาชื่อลูกค้า, รหัสเอกสาร, HN..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-2 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:border-sky-400 shadow-inner font-data truncate" />
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2" />
            </div>
            <div className="w-[125px] sm:w-[165px] shrink-0">
               <CustomSelect
                  value={filterType}
                  onChange={(val) => setFilterType(val)}
                  compact
                  fullWidth
                  options={[
                    { value: 'all', label: 'ทั้งหมด' },
                    { value: 'record', label: 'เวชระเบียน' },
                    { value: 'opd', label: 'ใบ OPD' },
                    { value: 'medcert', label: 'ใบรับรองแพทย์' },
                    { value: 'consent', label: 'ใบยินยอมรักษา' },
                    { value: 'receipt', label: 'ใบเสร็จ' }
                  ]}
               />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 mt-0 mb-12 flex-1 flex flex-col pointer-events-auto z-10">
        <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100/50 relative overflow-hidden flex flex-col min-h-[400px]">
          <div className="px-2 sm:px-4 py-4">
            <div className="hidden md:block overflow-x-auto overflow-y-hidden">
              <table className="w-full text-left border-collapse min-w-[800px] table-auto">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 text-sm kanit-text"><th className="p-4 w-16 text-center"><button onClick={toggleSelectAll} className="flex items-center justify-center w-full">{isAllSelected ? <CheckSquare size={20} className="text-sky-500" /> : <div className="w-5 h-5 border-2 border-slate-300 rounded"></div>}</button></th><th className="p-4 font-medium w-[12%]">วันที่ / เวลา</th><th className="p-4 font-medium w-[16%]">ประเภท</th><th className="p-4 font-medium w-[18%]">รหัสอ้างอิง</th><th className="p-4 font-medium w-[46%]">ชื่อลูกค้า</th><th className="p-4 font-medium text-center w-[8%]">พิมพ์</th></tr>
                </thead>
                <tbody className="">
                  {isGlobalLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={`skel-rep-${i}`} className="border-b border-slate-50 last:border-0">
                        <td className="p-4 text-center"><div className="h-5 w-full max-w-[20px] bg-slate-200 rounded mx-auto animate-pulse"></div></td>
                        <td className="p-4"><div className="h-4 w-full max-w-[96px] bg-slate-200 rounded animate-pulse"></div></td>
                        <td className="p-4"><div className="h-4 w-full max-w-[96px] bg-slate-200 rounded animate-pulse"></div></td>
                        <td className="p-4"><div className="h-4 w-full max-w-[96px] bg-slate-200 rounded animate-pulse"></div></td>
                        <td className="p-4"><div className="h-4 w-full max-w-[128px] bg-slate-200 rounded animate-pulse"></div></td>
                        <td className="p-4 text-center"><div className="h-8 w-full max-w-[32px] bg-slate-200 rounded-lg ml-auto animate-pulse"></div></td>
                      </tr>
                    ))
                  ) : 
                visibleDocs.length > 0 ? visibleDocs.map(doc => {
                    const isSelected = selectedDocs.includes(doc.id);
                    const d = new Date(doc.timestamp);
                    return (
                      <tr key={doc.id} onClick={() => toggleSelection(doc.id)} className={`transition-colors font-data text-sm cursor-pointer hover:bg-sky-50/30 border-b border-slate-50 last:border-0 ${isSelected ? 'bg-sky-50/50' : ''}`}>
                        <td className="p-4 text-center"><div className="flex items-center justify-center">{isSelected ? <CheckSquare size={20} className="text-sky-500" /> : <div className="w-5 h-5 border-2 border-slate-300 rounded"></div>}</div></td>
                        <td className="p-4 text-slate-600 font-medium">{d.toLocaleDateString('th-TH')} <span className="text-[10px] text-slate-400 block">{d.toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})}</span></td>
                        <td className="p-4">{getDocBadge(doc.type, doc.typeLabel)}</td>
                        <td className="p-4 font-bold text-slate-700 kanit-text">{doc.refNo}</td>
                        <td className="p-4 text-slate-800 kanit-text font-medium">{doc.patientName}</td>
                        <td className="p-4 text-center"><button onClick={(e) => { e.stopPropagation(); handleSinglePrint(doc); }} className="p-2 text-slate-400 hover:text-sky-600 transition-colors"><Printer size={16}/></button></td>
                      </tr>
                    )
                }) : (<tr><td colSpan="6" className="p-20 text-center text-slate-400 italic">ไม่พบข้อมูล</td></tr>)}
                
                {isLoadingMore && Array.from({ length: 2 }).map((_, i) => (
                    <tr key={`skel-rep-more-${i}`} className="border-b border-slate-50 last:border-0">
                      <td className="p-4 text-center"><div className="h-5 w-full max-w-[20px] bg-slate-100 rounded mx-auto animate-pulse"></div></td>
                      <td className="p-4"><div className="h-4 w-full max-w-[96px] bg-slate-100 rounded animate-pulse"></div></td>
                      <td className="p-4"><div className="h-4 w-full max-w-[80px] bg-slate-100 rounded animate-pulse"></div></td>
                      <td className="p-4"><div className="h-4 w-full max-w-[96px] bg-slate-100 rounded animate-pulse"></div></td>
                      <td className="p-4"><div className="h-4 w-full max-w-[160px] bg-slate-100 rounded animate-pulse"></div></td>
                      <td className="p-4 text-center"><div className="h-8 w-full max-w-[32px] bg-slate-100 rounded-lg ml-auto animate-pulse"></div></td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="md:hidden space-y-3 mt-2">
              {isGlobalLoading ? (
                 Array.from({ length: 4 }).map((_, i) => (
                    <div key={`skel-rep-mob-${i}`} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                        <div className="flex justify-between items-center mb-1.5">
                            <div className="flex items-center gap-2.5">
                                <div className="w-5 h-5 bg-slate-200 rounded animate-pulse shrink-0"></div>
                                <div className="w-[80px] h-[20px] bg-slate-200 animate-pulse rounded-md"></div>
                            </div>
                            <div className="w-[80px] h-[16px] bg-slate-200 animate-pulse rounded-md shrink-0"></div>
                        </div>
                        <div className="mb-3 px-1">
                            <div className="w-full max-w-[160px] h-[20px] bg-slate-200 animate-pulse rounded-xl"></div>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex justify-between items-center">
                            <div className="w-[100px] h-[24px] bg-slate-200 animate-pulse rounded-full"></div>
                            <div className="w-[70px] h-[30px] bg-slate-200 animate-pulse rounded-lg"></div>
                        </div>
                    </div>
                 ))
              ) : visibleDocs.length > 0 ? visibleDocs.map(doc => {
                  const isSelected = selectedDocs.includes(doc.id);
                  const d = new Date(doc.timestamp);
                  return (
                    <div key={doc.id} onClick={() => toggleSelection(doc.id)} className={`bg-white p-4 rounded-2xl border shadow-sm flex flex-col cursor-pointer transition-all active:scale-[0.98] ${isSelected ? 'border-sky-300 ring-2 ring-sky-100 bg-sky-50/10' : 'border-slate-100 hover:border-sky-200 hover:shadow-md'}`}>
                        <div className="flex justify-between items-start mb-2.5">
                            <div className="flex items-center gap-2.5">
                                {isSelected ? <CheckSquare size={20} className="text-sky-500 shrink-0" /> : <div className="w-5 h-5 border-2 border-slate-300 rounded shrink-0"></div>}
                                <span className="font-bold text-slate-500 kanit-text text-[11px] sm:text-xs bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 truncate max-w-[120px]">{doc.refNo}</span>
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1 font-data shrink-0"><Clock size={12} className="shrink-0"/> {d.toLocaleDateString('th-TH')} {d.toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})}</div>
                        </div>
                        <div className="mb-3 px-1">
                            <div className="font-bold text-slate-800 text-sm kanit-text line-clamp-1">{doc.patientName}</div>
                        </div>
                        <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <div className="flex items-center shrink-0">
                                {getDocBadge(doc.type, doc.typeLabel)}
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleSinglePrint(doc); }} className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-sky-600 bg-white hover:bg-sky-50 rounded-lg transition-colors font-medium text-xs kanit-text shadow-sm border border-slate-200 shrink-0">
                                <Printer size={14} /> พิมพ์
                            </button>
                        </div>
                    </div>
                  )
              }) : (<div className="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl border border-slate-100 border-dashed"><Printer size={40} className="mx-auto mb-3 opacity-30" /><p className="kanit-text font-bold text-sm">ไม่มีข้อมูลเอกสาร</p></div>)}
              
              {isLoadingMore && Array.from({ length: 2 }).map((_, i) => (
                  <div key={`skel-rep-mob-more-${i}`} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                      <div className="flex justify-between items-center mb-1.5">
                          <div className="flex items-center gap-2.5">
                              <div className="w-5 h-5 bg-slate-200 rounded animate-pulse shrink-0"></div>
                              <div className="w-[80px] h-[20px] bg-slate-200 animate-pulse rounded-md"></div>
                          </div>
                          <div className="w-[80px] h-[16px] bg-slate-200 animate-pulse rounded-md shrink-0"></div>
                      </div>
                      <div className="mb-3 px-1">
                          <div className="w-full max-w-[160px] h-[20px] bg-slate-200 animate-pulse rounded-xl"></div>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex justify-between items-center">
                          <div className="w-[100px] h-[24px] bg-slate-200 animate-pulse rounded-full"></div>
                          <div className="w-[70px] h-[30px] bg-slate-200 animate-pulse rounded-lg"></div>
                      </div>
                  </div>
              ))}
            </div>
          <div className="h-10 w-full flex flex-col justify-start"></div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default ReportsManager;


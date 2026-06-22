import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { createPortal } from 'react-dom';
export const rAFThrottle = (callback) => {
  let queued = false;
  return function (...args) {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      callback.apply(this, args);
      queued = false;
    });
  };
};

export const formatDate = (dateString) => {
  if (!dateString) return '-';
  if (typeof dateString === 'object') return '-';
  if (typeof dateString === 'string' && dateString.includes('/')) return dateString;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return String(dateString);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear() + 543;
  return `${d}/${m}/${y}`;
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  if (typeof dateString === 'object') return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return String(dateString);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear() + 543;
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${d}/${m}/${y} ${h}:${min} น.`;
};

export const formatStatNumber = (val) => {
  if (val === '-' || val === undefined || val === null || isNaN(Number(val))) return val || '0';
  return Number(val).toLocaleString('th-TH');
};

export const getDynamicTextSize = (valStr) => {
  const len = String(valStr).length;
  // ยิ่งเลขยาว ฟอนต์ยิ่งเล็กลง และบีบระยะห่าง (tracking-tighter) เพื่อให้พอดีการ์ด
  if (len >= 12) return 'text-base sm:text-lg lg:text-xl tracking-tighter';
  if (len >= 9) return 'text-lg sm:text-xl lg:text-2xl tracking-tight';
  if (len >= 6) return 'text-xl sm:text-2xl lg:text-3xl tracking-tight';
  return 'text-2xl sm:text-3xl lg:text-4xl tracking-tight'; // Default ขนาดใหญ่สุด
};

export const parsePatientName = (fullName) => {
    let prefix = '';
    let gender = 'ไม่ระบุ';
    let rawName = (fullName || '').trim();
    
    const knownPrefixes = [
        { p: 'นางสาว', g: 'หญิง', match: ['นางสาว', 'น.ส.', 'นส.'] },
        { p: 'นาย', g: 'ชาย', match: ['นาย'] },
        { p: 'นาง', g: 'หญิง', match: ['นาง'] },
        { p: 'ด.ช.', g: 'ชาย', match: ['ด.ช.', 'เด็กชาย', 'ดช.'] },
        { p: 'ด.ญ.', g: 'หญิง', match: ['ด.ญ.', 'เด็กหญิง', 'ดญ.'] },
        { p: 'พระ', g: 'ชาย', match: ['พระ'] }
    ];

    for (const kp of knownPrefixes) {
        let matched = false;
        for (const m of kp.match) {
            if (rawName.startsWith(m)) {
                prefix = kp.p;
                gender = kp.g;
                rawName = rawName.substring(m.length).trim();
                matched = true;
                break;
            }
        }
        if (matched) break;
    }

    rawName = rawName.replace(/\s+/g, ' ').trim();
    const spaceIdx = rawName.indexOf(' ');
    let firstName = rawName;
    let lastName = '';
    if (spaceIdx > -1) {
        firstName = rawName.substring(0, spaceIdx);
        lastName = rawName.substring(spaceIdx + 1);
    }

    return { prefix, firstName, lastName, gender };
};

export const getPatientFullName = (p) => {
   if (!p) return '-';
   if (p.firstName || p.lastName || p.prefix) {
       return `${p.prefix || ''}${p.firstName || ''} ${p.lastName || ''}`.trim();
   }
   return p.name || '-';
};

export const generateNextHN = (patients) => {
  const currentYearTH = new Date().getFullYear() + 543;
  const yearSuffix = String(currentYearTH).slice(-2);
  
  if (!patients || patients.length === 0) return `HN${yearSuffix}-0001`;
  
  let maxNum = 0;
  patients.forEach(p => {
     const hnString = p.hn || p.id || '';
     const numMatch = hnString.match(/(\d+)$/);
     if (numMatch) {
         const num = parseInt(numMatch[1], 10);
         if (num > maxNum) maxNum = num;
     }
  });
  
  return `HN${yearSuffix}-${String(maxNum + 1).padStart(4, '0')}`;
};

export const getAgeString = (dobStr) => {
  if (!dobStr || dobStr.length < 10) return '-';
  const parts = dobStr.split('/');
  if (parts.length === 3) {
    const dobDate = new Date(parseInt(parts[2], 10) - 543, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    if (isNaN(dobDate.getTime())) return '-';
    const now = new Date();
    let years = now.getFullYear() - dobDate.getFullYear();
    let months = now.getMonth() - dobDate.getMonth();
    if (months < 0 || (months === 0 && now.getDate() < dobDate.getDate())) { years--; months += 12; }
    return `${years} ปี ${months} เดือน`;
  }
  return '-';
};

export const getPatientId = (p) => p ? (p.hn || p.id || '-') : '-';

export const useModal = (onClosedCallback) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const id = useRef('modal_' + Date.now() + '_' + Math.floor(Math.random() * 1000)).current;

    const internalClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsOpen(false);
            setIsClosing(false);
            if (onClosedCallback) onClosedCallback();
        }, 350); 
    };

    const open = () => {
        setIsOpen(true);
        setIsClosing(false);
        window.history.pushState({ modal: id }, '');
    };

    const close = () => {
        if (!isOpen) return;
        if (window.history.state && window.history.state.modal === id) {
            window.history.back();
        } else {
            internalClose();
        }
    };

    useEffect(() => {
        const handlePopState = () => {
            if (isOpen) {
                if (!window.history.state || window.history.state.modal !== id) {
                    internalClose();
                }
            }
        };

        if (isOpen) {
            window.addEventListener('popstate', handlePopState);
            return () => window.removeEventListener('popstate', handlePopState);
        }
    }, [isOpen]);

    const setIsOpenWrapper = (val) => {
        if (val) {
            if (!isOpen) open();
        } else {
            if (isOpen) close();
        }
    };

    return { isOpen, isClosing, open, close, setIsOpen: setIsOpenWrapper };
};

export const useSwipeDown = (onClose) => {
    const startY = useRef(null);
    const currentTranslateY = useRef(0);
    const ticking = useRef(false); 
    const onCloseRef = useRef(onClose);
    const listenersRef = useRef(null);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    const refCallback = React.useCallback((element) => {
        if (listenersRef.current && listenersRef.current.element) {
            const prevEl = listenersRef.current.element;
            const { ts, tm, te } = listenersRef.current;
            prevEl.removeEventListener('touchstart', ts);
            prevEl.removeEventListener('touchmove', tm);
            prevEl.removeEventListener('touchend', te);
            listenersRef.current = null;
        }

        if (!element) return;

        const handleTouchStart = (e) => {
            const scrollTarget = e.target.closest('.custom-scrollbar');
            if (scrollTarget && element.contains(scrollTarget)) return;

            const noDragTarget = e.target.closest('.no-drag-zone');
            if (noDragTarget && element.contains(noDragTarget)) return;

            if (e.touches.length === 1) {
                startY.current = e.touches[0].clientY;
                element.style.setProperty('transition', 'none', 'important');
                element.style.setProperty('will-change', 'transform', 'important');
            }
        };

        const handleTouchMove = (e) => {
            if (startY.current === null) return;
            const currentY = e.touches[0].clientY;
            const deltaY = currentY - startY.current;
            
            if (deltaY > 0) {
                if (e.cancelable) e.preventDefault();
                currentTranslateY.current = deltaY;
                
                if (!ticking.current) {
                    window.requestAnimationFrame(() => {
                        if(element) element.style.setProperty('transform', `translateY(${currentTranslateY.current}px)`, 'important');
                        ticking.current = false;
                    });
                    ticking.current = true;
                }
            } else {
                currentTranslateY.current = 0;
                if (!ticking.current) {
                    window.requestAnimationFrame(() => {
                        if(element) element.style.setProperty('transform', 'translateY(0px)', 'important');
                        ticking.current = false;
                    });
                    ticking.current = true;
                }
            }
        };

        const handleTouchEnd = () => {
            if (startY.current === null) return;

            if (currentTranslateY.current > 80) { 
                element.style.setProperty('transition', 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)', 'important');
                element.style.setProperty('transform', 'translateY(100%)', 'important');
                if (onCloseRef.current) onCloseRef.current();
            } else {
                element.style.setProperty('transition', 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)', 'important');
                element.style.setProperty('transform', 'translateY(0px)', 'important');
                
                setTimeout(() => {
                    if (element) {
                        element.style.removeProperty('transition');
                        element.style.removeProperty('transform');
                        element.style.removeProperty('will-change');
                    }
                }, 300);
            }
            
            currentTranslateY.current = 0;
            startY.current = null;
        };

        element.addEventListener('touchstart', handleTouchStart, { passive: false });
        element.addEventListener('touchmove', handleTouchMove, { passive: false });
        element.addEventListener('touchend', handleTouchEnd);

        listenersRef.current = { element, ts: handleTouchStart, tm: handleTouchMove, te: handleTouchEnd };
    }, []);

    return {
        ref: refCallback,
        style: {}
    };
};

export const getPatientLastVisitStr = (p) => {
    const dt = p.opdRecords && p.opdRecords.length > 0 ? p.opdRecords[0].datetime : (p.createdAt || p.lastVisit || '');
    if (!dt) return '000000000000';

    if (dt.includes('T')) {
        const dateObj = new Date(dt);
        if (!isNaN(dateObj.getTime())) {
            const y = dateObj.getFullYear() + 543; 
            const m = String(dateObj.getMonth() + 1).padStart(2, '0');
            const d = String(dateObj.getDate()).padStart(2, '0');
            const h = String(dateObj.getHours()).padStart(2, '0');
            const min = String(dateObj.getMinutes()).padStart(2, '0');
            return `${y}${m}${d}${h}${min}`;
        }
    }

    const parts = dt.split(' ');
    const dateStr = parts[0] || '';
    const timeStr = parts[1] ? parts[1].replace('น.', '').trim() : '00:00';

    let year = '0000', month = '00', day = '00';
    let hour = '00', minute = '00';

    if (dateStr.includes('/')) {
        const dParts = dateStr.split('/');
        if (dParts.length === 3) {
            day = dParts[0].padStart(2, '0');
            month = dParts[1].padStart(2, '0');
            year = dParts[2];
        }
    } else if (dateStr.includes('-')) { 
        const dParts = dateStr.split('-');
        if (dParts.length === 3) {
            year = dParts[0];
            if (year.startsWith('20')) {
                year = String(parseInt(year, 10) + 543);
            }
            month = dParts[1].padStart(2, '0');
            day = dParts[2].padStart(2, '0');
        }
    } else {
        return dt; 
    }

    if (timeStr.includes(':')) {
        const tParts = timeStr.split(':');
        hour = (tParts[0] || '00').padStart(2, '0');
        minute = (tParts[1] || '00').padStart(2, '0');
    }

    return `${year}${month}${day}${hour}${minute}`;
};

export const formatCurPrint = (amount) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0);

export const bahtTextPrint = (amount) => {
    if (!amount || amount === 0) return 'ศูนย์บาทถ้วน';
    const numbers = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
    let numberStr = Math.abs(amount).toFixed(2).toString();
    let [integerPart, fractionalPart] = numberStr.split('.');
    const convertToText = (str) => {
        let text = '';
        for (let i = 0; i < str.length; i++) {
            let n = parseInt(str[i]);
            let pos = str.length - i - 1;
            if (n === 0) continue;
            if (n === 1 && pos === 0 && str.length > 1 && str[i-1] !== '0') text += 'เอ็ด';
            else if (n === 2 && pos === 1) text += 'ยี่สิบ';
            else if (n === 1 && pos === 1) text += 'สิบ';
            else text += numbers[n] + positions[pos];
        }
        return text;
    };
    let result = convertToText(integerPart) + 'บาท';
    if (fractionalPart === '00') result += 'ถ้วน';
    else result += convertToText(fractionalPart) + 'สตางค์';
    return result;
};

export const globalGenerateInformedConsentHtml = (patient, branchesData = [], currentBranch = '') => {
    const branchIdToUse = (currentBranch && currentBranch !== 'all' ? currentBranch : '') || (patient && patient.branchId);
    const targetBranch = branchesData.find(b => b.id === branchIdToUse) || branchesData[0] || {};
    const clinicName = targetBranch.clinicName || targetBranch.name || "อันผิงคลินิก (Anping Clinic)";
    const clinicAddress = targetBranch.address || "ไม่มีข้อมูลที่อยู่คลินิก";
    const clinicPhone = targetBranch.phone || "ไม่มีข้อมูลเบอร์โทรคลินิก";
    const logoUrl = targetBranch.logo || '';
    
    const formattedDate = patient.informedConsentTimestamp 
        ? new Date(patient.informedConsentTimestamp).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) + ' น.'
        : '-';

    const patientFullName = getPatientFullName(patient);
    const signerName = patient.informedConsentSignerType === 'patient'
        ? patientFullName
        : patient.informedConsentRepresentativeName;
        
    const relationStr = patient.informedConsentSignerType === 'patient'
        ? 'ผู้ป่วยลงนามด้วยตนเอง'
        : `ผู้แทนโดยชอบธรรม (ความเกี่ยวข้อง: ${patient.informedConsentRepresentativeRelation || '-'})`;

    return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <title>ใบยินยอมรับการรักษาพยาบาล - ${patient.hn || patient.id}</title>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
            /* Impeccable Style Resets & Base */
            body { font-family: 'Sarabun', sans-serif; font-size: 15px; color: #111827; margin: 0; padding: 0; line-height: 1.8; font-weight: 400; }
            @page { size: A4; }
            .container { width: 100%; box-sizing: border-box; }
            
            /* Typography Hierarchy */
            .text-label { color: #111827; font-weight: 400; }
            .text-value { color: #111827; font-weight: 400; }
            .text-bold { font-weight: 700; }
            .text-heading { font-size: 24px; font-weight: 700; letter-spacing: 0.5px; text-align: center; margin: 20px 0 30px 0; }
            
            /* Layout & Grids */
            .header-block { display: flex; align-items: flex-start; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .meta-block { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; margin-bottom: 10px; font-size: 14px; }
            .content-block { padding: 0 10px; }
            .indent { text-indent: 40px; }
            
            /* Signature Section */
            .signature-section { display: flex; justify-content: space-between; margin-top: 40px; page-break-inside: avoid; align-items: flex-end; }
            .signature-box { width: 45%; text-align: center; display: flex; flex-direction: column; gap: 5px; align-items: center; }
            .signature-line { border-bottom: 1px dotted #111827; width: 80%; height: 1px; margin: 0 auto; }
            .signature-text { margin: 0; line-height: 1.4; white-space: nowrap; font-size: 13px; }
            
            @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header Section -->
            <div class="header-block">
                <div style="width: 80px; margin-right: 24px; flex-shrink: 0;">
                    ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="width: 100%; height: auto; object-fit: contain;" />` : ''}
                </div>
                <div style="flex-grow: 1; padding-top: 5px;">
                    <div class="text-bold" style="font-size: 20px; margin-bottom: 0px;">${clinicName}</div>
                    <div style="font-size: 14px; line-height: 1.4;">${clinicAddress}</div>
                    <div style="font-size: 14px; line-height: 1.4;">โทร: ${clinicPhone}</div>
                </div>
            </div>

            <!-- Title -->
            <div class="text-heading">หนังสือให้ความยินยอม</div>
            
            <!-- Document Meta -->
            <div class="meta-block">
                <div>เลขทะเบียนผู้ป่วย: ${patient.hn || patient.id || '-'}</div>
                <div>วันที่ลงนาม: ${formattedDate}</div>
            </div>
            
            <!-- Content Body -->
            <div class="content-block" style="margin-top: 15px;">
                <div class="indent" style="margin-bottom: 15px;">
                    ข้าพเจ้าได้รับทราบข้อมูลเกี่ยวกับวิธีการรักษา ความเสี่ยง และผลข้างเคียงอันไม่พึงประสงค์ที่อาจเกิดขึ้นได้จากการรักษาด้วยศาสตร์การแพทย์แผนจีน (การฝังเข็ม, การครอบแก้ว, การรมยา และยาสมุนไพรจีน) จากแพทย์แผนจีนของอันผิงคลินิก โดยละเอียดแล้ว
                </div>

                <div style="display: flex; align-items: flex-end; margin-bottom: 15px; padding-left: 40px;">
                    <span class="text-bold" style="white-space: nowrap;">ข้าพเจ้าลงนามในฐานะ:</span> 
                    <div style="flex-grow: 1; border-bottom: 1px dotted #111827; margin-left: 10px; font-size: 14px; padding-bottom: 2px; line-height: 1.2;">
                        ${patient.informedConsentSignerType === 'patient' ? `ผู้ป่วย ${patientFullName}` : `ผู้แทนโดยชอบธรรม (${patient.informedConsentRepresentativeRelation || '-'}) ของผู้ป่วยชื่อ ${patientFullName}`}
                    </div>
                </div>

                <div class="indent" style="margin-bottom: 15px;">
                    ข้าพเจ้าขอรับรองว่าได้ยินยอมเข้ารับการตรวจและรักษาพยาบาลจากอันผิงคลินิกด้วย<span class="text-bold">ความสมัครใจ ปราศจากการบังคับ ข่มขู่ หรือชักจูงใดๆ</span> และยินยอมรับความเสี่ยงในการเกิดอาการเมาเข็มและผลข้างเคียงต่างๆ และข้าพเจ้าเข้าใจดีว่าไม่มีการรับประกันผลการรักษาพยาบาลว่าจะหายขาด 100% เนื่องจากผลการรักษาขึ้นอยู่กับสภาพร่างกายและการดูแลตนเองของแต่ละบุคคลด้วย
                </div>

                <div class="indent" style="margin-bottom: 15px;">
                    ข้าพเจ้ายินยอมรับผลที่อาจเกิดขึ้นจากเหตุสุดวิสัย โดยจะไม่เรียกร้องหรือฟ้องร้องต่อแพทย์และบุคลากรของคลินิก หากได้ปฏิบัติหน้าที่โดยรอบคอบตามมาตรฐานวิชาชีพการแพทย์แผนจีนแล้ว
                </div>

                <div class="indent" style="margin-bottom: 25px;">
                    ข้าพเจ้าเข้าใจดีว่าข้อมูลการรักษาของข้าพเจ้าจะถูกเก็บไว้เป็นความลับ และข้าพเจ้ามีสิทธิ์ที่จะปฏิเสธการรักษา หรือขอความเห็นจากแพทย์ท่านอื่นได้ทุกเวลา
                </div>

                <div style="margin-bottom: 20px; text-align: center;" class="text-bold">
                    จึงลงลายมือชื่อไว้เป็นหลักฐาน
                </div>
            </div>

            <!-- Signature Section -->
            <div class="signature-section">
                <!-- Metadata box on left -->
                <div style="width: 50%; font-size: 11px; color: #4b5563; line-height: 1.5; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; background-color: #f8fafc;">
                    <div class="text-bold" style="margin-bottom: 4px; color: #1e293b;">หลักฐานการลงนามอิเล็กทรอนิกส์ (E-Signature)</div>
                    <div>วัน-เวลาลงนาม: ${formattedDate}</div>
                    <div style="word-break: break-all;">IP Address: ${patient.informedConsentIpAddress || '-'}</div>
                    <div style="word-break: break-all; font-size: 10px;">อุปกรณ์: ${patient.informedConsentUserAgent || '-'}</div>
                </div>
                <!-- Signature Box on right -->
                <div class="signature-box" style="width: 45%;">
                    <div style="position: relative; height: 70px; display: flex; align-items: flex-end; justify-content: center; margin-bottom: 5px; width: 100%;">
                        ${patient.informedConsentSignatureUrl ? `
                            <img src="${patient.informedConsentSignatureUrl}" style="position: absolute; bottom: 5px; max-height: 80px; max-width: 180px; object-fit: contain; z-index: 10;" alt="Signature" />
                        ` : ''}
                        <div class="signature-text" style="position: relative; z-index: 1;">ลงชื่อ ..............................................................</div>
                    </div>
                    <div class="signature-text" style="font-size: 14px; margin-top: 5px;">( ${signerName} )</div>
                    <div class="signature-text" style="font-size: 13px; margin-top: 2px;">ผู้ให้ความยินยอม</div>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
};

export const globalGenerateRecordHtml = (patient, branchesData = [], currentBranch = '') => {
    const branchIdToUse = (currentBranch && currentBranch !== 'all' ? currentBranch : '') || (patient && patient.branchId);
    const targetBranch = branchesData.find(b => b.id === branchIdToUse) || branchesData[0] || {};
    const clinicName = targetBranch.clinicName || targetBranch.name || "ไม่มีข้อมูลชื่อคลินิก";
    const clinicAddress = targetBranch.address || "ไม่มีข้อมูลที่อยู่คลินิก";
    const clinicPhone = targetBranch.phone || "ไม่มีข้อมูลเบอร์โทรคลินิก";
    const logoUrl = targetBranch.logo || '';

    let regDateStr = '-';
    if (patient.createdAt) {
        const cd = new Date(patient.createdAt);
        if (!isNaN(cd.getTime())) {
            const cdDay = String(cd.getDate()).padStart(2, '0');
            const cdMonth = String(cd.getMonth() + 1).padStart(2, '0');
            const cdYear = cd.getFullYear() + 543;
            regDateStr = `${cdDay}/${cdMonth}/${cdYear}`;
        }
    } else {
        const today = new Date();
        const d = String(today.getDate()).padStart(2, '0');
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const y = today.getFullYear() + 543;
        regDateStr = `${d}/${m}/${y}`;
    }

    const ageStr = patient.dob ? getAgeString(patient.dob) : '';
    const phone = Array.isArray(patient.phones) ? patient.phones[0] : (patient.phone || patient.phone1 || '');
    const hnNumberOnly = (patient.hn || '').replace(/^HN/i, '');

    return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <title>ใบเวชระเบียน - ${patient.hn}</title>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Sarabun', sans-serif; font-size: 14px; color: #000; margin: 0; padding: 0; }
            @page { size: A5 landscape; margin: 10mm; }
            .container { width: 100%; box-sizing: border-box; }
            .header { display: flex; justify-content: space-between; margin-bottom: 10px; align-items: center; }
            .clinic-info { line-height: 1.2; font-size: 12px; }
            .clinic-name { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
            .doc-info { text-align: right; line-height: 1.5; font-size: 14px; }
            .doc-info-row { display: flex; justify-content: flex-end; align-items: baseline; margin-bottom: 8px; }
            .title { text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 12px; }
            .row { display: flex; align-items: baseline; margin-bottom: 10px; width: 100%; }
            .label { white-space: nowrap; margin-right: 5px; }
            .value { 
              flex-grow: 1; 
              border: none;
              border-bottom: 1px solid transparent;
              border-image: repeating-linear-gradient(to right, #4b5563 0, #4b5563 1px, transparent 1px, transparent 4px) 1;
              text-align: center; 
              padding-bottom: 2px;
              min-width: 40px; 
              margin-right: 10px; 
            }
            .value:last-child { margin-right: 0; }
            .w-auto { flex-grow: 0; }
            @media print {
               body { -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
               .value { border-image: repeating-linear-gradient(to right, black 0, black 1px, transparent 1px, transparent 4px) 1 !important; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div style="display: flex; gap: 15px; align-items: center;">
                    ${logoUrl ? `<div style="width: 60px; height: 60px; flex-shrink: 0;"><img src="${logoUrl}" style="width: 100%; height: 100%; object-fit: contain;" /></div>` : ''}
                    <div class="clinic-info">
                        <div class="clinic-name">${clinicName}</div>
                        <div style="max-width: 350px;">${clinicAddress}</div>
                        <div>โทร. ${clinicPhone}</div>
                    </div>
                </div>
                <div class="doc-info">
                    <div class="doc-info-row">
                        <span style="width: 45px; text-align: right; margin-right: 5px; font-size: 16px;">HN</span>
                        <span class="value w-auto" style="width: 140px; margin-right: 0; font-size: 16px; text-align: left; padding-left: 8px;">${hnNumberOnly}</span>
                    </div>
                    <div class="doc-info-row">
                        <span style="width: 45px; text-align: right; margin-right: 5px;">วันที่</span>
                        <span class="value w-auto" style="width: 140px; margin-right: 0; text-align: left; padding-left: 8px;">${regDateStr}</span>
                    </div>
                </div>
            </div>
            <div class="title">ใบเวชระเบียน</div>
            <div class="row">
                <span class="label">ชื่อ</span><span class="value">${patient.prefix ? patient.prefix + ' ' : ''}${patient.firstName || ''}</span>
                <span class="label">นามสกุล</span><span class="value">${patient.lastName || ''}</span>
                <span class="label">ชื่อเล่น</span><span class="value w-auto" style="width: 150px;">${patient.nickname || ''}</span>
            </div>
            <div class="row">
                <span class="label">วันเดือนปีเกิด</span><span class="value w-auto" style="width: 150px;">${patient.dob || ''}</span>
                <span class="label">อายุ</span><span class="value w-auto" style="width: 100px;">${ageStr}</span>
                <span class="label">เลขบัตรประชาชน</span><span class="value">${patient.idCard || ''}</span>
            </div>
            <div class="row">
                <span class="label">บ้านเลขที่</span><span class="value w-auto" style="width: 250px;">${patient.address || ''}</span>
                <span class="label">หมู่ที่</span><span class="value w-auto" style="width: 80px;">${patient.moo || ''}</span>
                <span class="label">ถนน</span><span class="value">${patient.road || ''}</span>
            </div>
            <div class="row">
                <span class="label">ตำบล</span><span class="value">${patient.subDistrict || ''}</span>
                <span class="label">อำเภอ</span><span class="value">${patient.district || ''}</span>
                <span class="label">จังหวัด</span><span class="value">${patient.province || ''}</span>
                <span class="label">รหัสไปรษณีย์</span><span class="value w-auto" style="width: 100px;">${patient.zipcode || ''}</span>
            </div>
            <div class="row">
                <span class="label">เบอร์โทรศัพท์</span><span class="value w-auto" style="width: 150px;">${phone}</span>
                <span class="label">สัญชาติ</span><span class="value w-auto" style="width: 100px;">${patient.nationality || ''}</span>
                <span class="label">เชื้อชาติ</span><span class="value w-auto" style="width: 100px;">${patient.ethnicity || ''}</span>
                <span class="label">ศาสนา</span><span class="value">${patient.religion || ''}</span>
            </div>
            <div class="row">
                <span class="label">อาชีพ</span><span class="value" style="text-align: left; padding-left: 8px;">${patient.occupation || ''}</span>
            </div>
            <div class="row">
                <span class="label">ชื่อผู้ติดต่อกรณีฉุกเฉิน</span><span class="value">${patient.emName || ''}</span>
                <span class="label">เกี่ยวข้องเป็น</span><span class="value w-auto" style="width: 200px;">${patient.emRelation || ''}</span>
            </div>
            <div class="row">
                <span class="label">ที่อยู่ที่ติดต่อได้</span><span class="value" style="text-align: left; padding-left: 8px;">${patient.emAddress || ''}</span>
            </div>
            <div class="row">
                <span class="label">อาการที่จะตรวจ</span><span class="value" style="text-align: left; padding-left: 8px;">${patient.chiefComplaint || ''}</span>
            </div>
            <div class="row">
                <span class="label">หมู่เลือด</span><span class="value w-auto" style="width: 150px;">${patient.bloodGroup || ''}</span>
                <span class="label">การแพ้ยา</span><span class="value" style="text-align: left; padding-left: 8px;">${patient.allergies || ''}</span>
            </div>
            <div class="row">
                <span class="label">โรคประจำตัว</span><span class="value" style="text-align: left; padding-left: 8px;">${patient.underlyingDisease || ''}</span>
            </div>
        </div>
    </body>
    </html>
    `;
};

export const globalGenerateOpdHtml = (patient, record, visitNumber, branchesData = [], currentBranch = '') => {
    // ลำดับความสำคัญ: 1. สาขาที่บันทึกในประวัติ (record), 2. สาขาปัจจุบันที่เลือกในเมนู, 3. สาขาที่คนไข้ลงทะเบียน
    const branchIdToUse = (record && record.branchId) || (currentBranch && currentBranch !== 'all' ? currentBranch : '') || (patient && patient.branchId);
    const targetBranch = branchesData.find(b => b.id === branchIdToUse) || branchesData[0] || {};
    const clinicName = targetBranch.clinicName || targetBranch.name || "ไม่มีข้อมูลชื่อคลินิก";
    const clinicAddress = targetBranch.address || "ไม่มีข้อมูลที่อยู่คลินิก";
    const clinicPhone = targetBranch.phone || "ไม่มีข้อมูลเบอร์โทรคลินิก";
    const logoUrl = targetBranch.logo || '';

    const hnNumberOnly = (patient.hn || '').replace(/^HN/i, '');
    const fullName = `${patient.prefix || ''}${patient.firstName || ''} ${patient.lastName || ''}`.trim();
    const dateStr = record.datetime ? record.datetime.split(' ')[0] : '-';
    const ageStr = patient.dob ? getAgeString(patient.dob) : '';
    const txText = Array.isArray(record.tx) ? record.tx.filter(t => t).join(', ') : (record.tx || '-');

    // ดึงชื่อแพทย์ประจำเคส หากไม่มีหรือระบุเป็นขีดจะใช้แพทย์ตั้งต้นของคลินิก
    let doctorNameDisplay = (record && record.doctor || '').trim();
    if (!doctorNameDisplay || doctorNameDisplay === '-') {
        doctorNameDisplay = '';
    }

    return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <title>ใบ OPD - ${patient.hn}</title>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Sarabun', sans-serif; font-size: 13px; color: #000; margin: 0; padding: 0; }
            html, body { width: 100%; margin: 0; padding: 0; box-sizing: border-box; }
            @page { size: A5 landscape; margin: 10mm; }
            .container { width: 100%; height: 128mm; max-height: 128mm; box-sizing: border-box; display: flex; flex-direction: column; padding-bottom: 2px; overflow: hidden; page-break-after: avoid; page-break-inside: avoid; }
            .header { display: flex; justify-content: space-between; margin-bottom: 15px; align-items: center; }
            .clinic-info { line-height: 1.2; font-size: 12px; }
            .clinic-name { font-size: 18px; font-weight: bold; margin-bottom: 2px; }
            .doc-info { text-align: right; }
            .doc-info-row { display: flex; align-items: baseline; justify-content: flex-end; margin-bottom: 6px; font-weight: bold; }
            .row { display: flex; align-items: baseline; margin-bottom: 10px; width: 100%; }
            .label { white-space: nowrap; margin-right: 5px; font-weight: bold; }
            .value {
              flex-grow: 1;
              border: none;
              border-bottom: 1px solid transparent;
              border-image: repeating-linear-gradient(to right, #4b5563 0, #4b5563 1px, transparent 1px, transparent 4px) 1;
              text-align: center;
              padding-bottom: 1px;
              min-width: 20px;
              margin-right: 10px;
            }
            .value.left { text-align: left; padding-left: 5px; }
            .value:last-child { margin-right: 0; }
            .w-auto { flex-grow: 0; }
            .vitals { display: flex; align-items: baseline; margin-bottom: 12px; font-weight: bold; }
            .vitals .val-box {
                border: none; border-bottom: 1px solid transparent;
                border-image: repeating-linear-gradient(to right, #4b5563 0, #4b5563 1px, transparent 1px, transparent 4px) 1;
                min-width: 40px; text-align: center; margin: 0 4px; padding-bottom: 1px; font-weight: normal; display: inline-block;
            }
            .main-content { display: flex; flex-direction: row; gap: 20px; flex-grow: 1; margin-bottom: 10px; }
            .left-column { flex-grow: 1; display: flex; flex-direction: column; }
            .right-column { width: 220px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; margin-top: -35px; padding-top: 0.5cm; }
            .cc-section { flex: 1; display: flex; flex-direction: column; margin-bottom: 0px; }
            .cc-title { font-weight: bold; margin-bottom: 4px; }
            .cc-content { flex: 1; min-height: 30px; padding-left: 10px; }
            .tx-section { flex: 1.5; display: flex; flex-direction: column; margin-bottom: 0px; }
            .tx-title { font-weight: bold; margin-bottom: 4px; }
            .tx-content { flex: 1; min-height: 40px; padding-left: 10px; }
            .signature { text-align: center; font-size: 12px; width: 100%; margin-top: 25px; margin-bottom: 0px; padding-bottom: 2px; }
            .body-diagram { width: 100%; height: auto; max-height: 210px; object-fit: contain; }            
            @media print {
               body { -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
               .value, .val-box { border-image: repeating-linear-gradient(to right, black 0, black 1px, transparent 1px, transparent 4px) 1 !important; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div style="display: flex; gap: 15px; align-items: center;">
                    ${logoUrl ? `<div style="width: 60px; height: 60px; flex-shrink: 0;"><img src="${logoUrl}" style="width: 100%; height: 100%; object-fit: contain;" /></div>` : ''}
                    <div class="clinic-info">
                        <div class="clinic-name">${clinicName}</div>
                        <div style="max-width: 350px;">${clinicAddress}</div>
                        <div>โทร. ${clinicPhone}</div>
                    </div>
                </div>
                <div class="doc-info" style="width: 300px;">
                    <div class="doc-info-row" style="font-size: 20px; margin-bottom: 10px;">
                        <span style="margin-right: 15px;">HN</span>
                        <span>${hnNumberOnly}</span>
                    </div>
                    <div class="doc-info-row" style="font-size: 14px;">
                        <span>วันที่:</span>
                        <span class="value w-auto" style="width: 100px; text-align: center;">${dateStr}</span>
                        <span style="margin-left: 10px;">ครั้งที่:</span>
                        <span class="value w-auto" style="width: 40px; text-align: center;">${visitNumber}</span>
                    </div>
                </div>
            </div>
            <div class="row">
                <span class="label">ชื่อผู้ป่วย:</span><span class="value left">${fullName}</span>
                <span class="label">ชื่อเล่น:</span><span class="value w-auto" style="width: 80px;">${patient.nickname || '-'}</span>
                <span class="label">เพศ:</span><span class="value w-auto" style="width: 60px;">${patient.gender || '-'}</span>
            </div>
            <div class="row">
                <span class="label">เลขบัตรประชาชน:</span><span class="value left" style="width: 140px; flex-grow: 0;">${patient.idCard || '-'}</span>
                <span class="label">อายุ:</span><span class="value w-auto" style="width: 100px;">${ageStr}</span>
                <span class="label">โทร:</span><span class="value">${patient.phones && patient.phones[0] ? patient.phones[0] : (patient.phone || patient.phone1 || '-')}</span>
            </div>
            <div class="row">
                <span class="label">ที่อยู่:</span><span class="value left">${patient.address || ''} ม.${patient.moo || '-'} ถ.${patient.road || '-'} ต.${patient.subDistrict || '-'} อ.${patient.district || '-'} จ.${patient.province || ''} ${patient.zipcode || ''}</span>
            </div>
            <div class="row">
                <span class="label">โรคประจำตัว:</span><span class="value left">${patient.underlyingDisease || 'ไม่มี'}</span>
                <span class="label">แพ้ยา/อาหาร:</span><span class="value left">${patient.allergies || 'ไม่มี'}</span>
            </div>
            <div class="vitals">
                T: <span class="val-box">${record.temp || ''}</span> ?C &nbsp;&nbsp;&nbsp;
                P: <span class="val-box">${record.pulse || ''}</span> /min &nbsp;&nbsp;&nbsp;
                BP: <span class="val-box" style="min-width: 60px;">${record.bp || ''}</span> mmHg &nbsp;&nbsp;&nbsp;
                น้ำหนัก: <span class="val-box">${record.weight || ''}</span> kg &nbsp;&nbsp;&nbsp;
                ส่วนสูง: <span class="val-box">${record.height || ''}</span> cm
            </div>
            <div class="main-content">
                <div class="left-column">
                    <div class="cc-section">
                        <div class="cc-title">อาการสำคัญ:</div>
                        <div class="cc-content">${(record.cc || '').replace(/\n/g, '<br/>')}</div>
                    </div>
                    <div class="tx-section">
                        <div class="tx-title">การรักษาที่ให้:</div>
                        <div class="tx-content">${txText}</div>
                    </div>
                </div>
                <div class="right-column">
                    <img src="${window.location.origin}/Body Diagram.svg" class="body-diagram" alt="Body Diagram" />
                    <div class="signature">
                        <div class="value" style="width: 100%; margin: 0 auto 5px auto;"></div>
                        (${doctorNameDisplay})
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
};

export const globalGenerateMedicalCertificateHtml = (patient, record, branchesData = [], currentBranch = '', staffData = []) => {
    const branchIdToUse = (record && record.branchId) || (currentBranch && currentBranch !== 'all' ? currentBranch : '') || (patient && patient.branchId);
    const targetBranch = branchesData.find(b => b.id === branchIdToUse) || branchesData[0] || {};
    const clinicName = targetBranch.clinicName || targetBranch.name || "ไม่มีข้อมูลชื่อคลินิก";
    const clinicAddress = targetBranch.address || "ไม่มีข้อมูลที่อยู่คลินิก";
    const clinicPhone = targetBranch.phone || "ไม่มีข้อมูลเบอร์โทรคลินิก";
    const logoUrl = targetBranch.logo || '';

    const doctorName = record.doctor || '-';
    // ป้องกัน Error กรณี staffData ไม่ใช่ Array หรือถูกส่งมาเป็น undefined
    const safeStaffData = Array.isArray(staffData) ? staffData : [];
    const doctorStaff = safeStaffData.find(staff => {
      const sName = `${staff.prefix || ''}${staff.firstName || ''} ${staff.lastName || ''}`.trim();
      return sName.includes(doctorName.replace(/^(นพ\.|พญ\.|พท\.|พจ\.)\s*/, '')) || doctorName.includes(staff.firstName || '');
    }) || {};
    const licenseNumber = doctorStaff.licenseNumber || '-';
    const doctorPosition = doctorStaff.position || 'แพทย์';

    const hnNumberOnly = (patient.hn || '').replace(/^HN/i, '');
    const fullName = `${patient.prefix || ''}${patient.firstName || ''} ${patient.lastName || ''}`.trim();
    
    const recordDate = record.datetime ? record.datetime.split(' ')[0] : '';
    let displayDate = '-';
    // ดึงเลขเอกสารที่บันทึกไว้ในฐานข้อมูล ถ้าไม่มีจะเว้นว่างไว้เพื่อรอระบบสร้าง
    let docNumber = record.medCertNumber || ''; 
    // ตัวแปรสำหรับแยกวันที่ออกเป็น วัน เดือน ปี เพื่อใช้ในย่อหน้าสุดท้าย
    let printDay = '....', printMonth = '..................', printYear = '........';
    
    if (recordDate) {
        const [d, m, y] = recordDate.split('/');
        const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
        const monthName = months[parseInt(m, 10) - 1] || '';
        displayDate = `${parseInt(d, 10)} ${monthName} ${y}`;
        
        // เก็บค่าแยกไว้ใช้
        printDay = parseInt(d, 10);
        printMonth = monthName;
        printYear = y;

        // หากเป็นการกดพรีวิวดู โดยยังไม่มีการเซฟเลขลงฐานข้อมูล
        if (!docNumber) {
            const adYear = parseInt(y, 10) - 543;
            const mm = m.padStart(2, '0');
            docNumber = `DC${adYear}${mm}-TEMP`;
        }
    }

    const ageStr = patient.dob ? getAgeString(patient.dob).split(' ')[0] + ' ปี ' + (getAgeString(patient.dob).split(' ')[2] || '0') + ' เดือน' : '';

    // ฟังก์ชันคำนวณขนาดฟอนต์อัตโนมัติสำหรับชื่อที่ยาวเกินไป
    const getSigFontSize = (name) => {
        const len = (name || '').length;
        if (len >= 35) return '11px';
        if (len >= 25) return '13px';
        return '15px';
    };
    const patientFontSize = getSigFontSize(fullName);
    const doctorFontSize = getSigFontSize(doctorName);

    return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <title>ใบรับรองแพทย์ - ${patient.hn}</title>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
        <style>
            /* Impeccable Style Resets & Base */
            body { font-family: 'Sarabun', sans-serif; font-size: 15px; color: #111827; margin: 0; padding: 0; line-height: 1.8; font-weight: 400; }
            @page { size: A4; }
            .container { width: 100%; box-sizing: border-box; }
            
            /* Typography Hierarchy */
            .text-label { color: #111827; font-weight: 400; } /* Changed color to black and weight to normal */
            .text-value { color: #111827; font-weight: 400; } /* Changed weight to normal */
            .text-bold { font-weight: 700; } /* New class for bold text */
            .text-heading { font-size: 24px; font-weight: 700; letter-spacing: 0.5px; text-align: center; margin: 20px 0 30px 0; }
            
            /* Layout & Grids */
            .header-block { display: flex; align-items: flex-start; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .meta-block { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; margin-bottom: 10px; font-size: 14px; }
            .content-block { padding: 0 10px; }
            .content-line { margin: 0; }
            .indent { text-indent: 40px; }
            
            /* Signature Section */
            .signature-section { display: flex; justify-content: space-between; margin-top: 100px; page-break-inside: avoid; }
            .signature-box { width: 45%; text-align: center; display: flex; flex-direction: column; gap: 5px; align-items: center; }
            .signature-line { border-bottom: 1px dotted #111827; width: 80%; height: 1px; margin: 0 auto; }
            .signature-text { margin: 0; line-height: 1.4; white-space: nowrap; }
            
            @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header Section -->
            <div class="header-block">
                <div style="width: 80px; margin-right: 24px; flex-shrink: 0;">
                    ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="width: 100%; height: auto; object-fit: contain;" />` : ''}
                </div>
                <div style="flex-grow: 1; padding-top: 5px;">
                    <div class="text-bold" style="font-size: 20px; margin-bottom: 0px;">${clinicName}</div>
                    <div style="font-size: 14px; line-height: 1.4;">${clinicAddress}</div>
                    <div style="font-size: 14px; line-height: 1.4;">โทร: ${clinicPhone}</div>
                </div>
            </div>

            <!-- Title -->
            <div class="text-heading">ใบรับรองแพทย์</div>
            
            <!-- Document Meta -->
            <div class="meta-block">
                <div>เลขที่เอกสาร: ${docNumber}</div>
                <div>วันที่: ${displayDate}</div>
            </div>

            <!-- Content Body -->
            <div class="content-block">
                
                <!-- Doctor & Patient Info -->
                <div class="content-line indent">
                    ข้าพเจ้า ${doctorName} ตำแหน่ง ${doctorPosition}
                </div>
                <div class="content-line">
                    เลขที่ใบประกอบโรคศิลป์ ${licenseNumber}
                </div>
                <div class="content-line">
                    ได้ตรวจร่างกายของ ${fullName}
                </div>
                <div class="content-line">
                    เลขที่ผู้ป่วย HN ${hnNumberOnly}
                </div>
                <div class="content-line">
                    อายุ ${ageStr}
                </div>
                <div class="content-line">
                    อาการ ${record.cc || '-'}
                </div>
                <div class="content-line">
                    การวินิจฉัย ${record.dx || '-'}
                </div>
                <div class="content-line" style="word-break: break-word;">
                ความเห็น/ข้อแนะนำ ${record.advice || '-'}
            </div>

        </div>

        <!-- Signatures -->
        <div class="signature-section">
            <div class="signature-box">
                <div class="signature-text">ลงชื่อ ............................................. ผู้รับ</div>
                <div class="signature-text" style="font-size: ${patientFontSize};">( ${fullName} )</div>
            </div>
            <div class="signature-box">
                <div class="signature-text" style="margin-bottom: 5px;">ลงชื่อ ............................................. แพทย์ผู้ตรวจ</div>
                <div class="signature-text" style="font-size: ${doctorFontSize};">( ${doctorName} )</div>
                <div class="signature-text" style="font-size: 14px;">(ใบประกอบโรคศิลป์เลขที่ : ${licenseNumber})</div>
            </div>
        </div>
    </div>
</body>
</html>
`;
};

export const globalGenerateReceiptHtml = (txn, format, branchesData, patientsData, posProducts, currentBranch = '') => {
    const branchIdToUse = (txn.branchId && txn.branchId !== 'all') ? txn.branchId : (currentBranch !== 'all' ? currentBranch : '');
    const targetBranch = branchesData.find(b => b.id === branchIdToUse) || branchesData[0] || {};
    const clinicName = targetBranch.clinicName || targetBranch.name || "ยังไม่ได้ระบุชื่อคลินิก";
    const clinicAddress = targetBranch.address ?? "ยังไม่ได้ระบุที่อยู่";
    const clinicPhone = targetBranch.phone ?? "ยังไม่ได้ระบุเบอร์โทร";
    const taxId = targetBranch.taxId ?? "ยังไม่ได้ระบุเลขประจำตัวผู้เสียภาษี";
    const logoUrl = targetBranch.logo || '';

    const dateObj = new Date(txn.createdAt || txn.date || new Date());
    const d = String(dateObj.getDate()).padStart(2, '0');
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const y = dateObj.getFullYear() + 543;
    const timeStr = dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const dateStr = `${d}/${m}/${y} ${timeStr} น.`;

    const receiptNo = txn.id || txn.receiptNo;
    let customerName = txn.patientName || (txn.rawTx?.patientName) || 'ลูกค้าทั่วไป (ไม่ระบุ)';
    let customerHN = '-';
    
    if (customerName.includes(' - ')) {
        const parts = customerName.split(' - ');
        customerHN = parts[0];
        customerName = parts.slice(1).join(' - ');
    } else if (txn.patientId) {
        customerHN = txn.patientId;
    } else if (txn.rawTx?.patientId) {
        customerHN = txn.rawTx.patientId;
    } else if (txn.hn) {
        customerHN = txn.hn;
    }
    
    let customerAddress = '-';
    let customerTaxId = '-';
    let customerPhone = '-';

    const pInfo = patientsData.find(p => (p.id || p.hn) === customerHN);
    if (pInfo) {
        customerAddress = `${pInfo.curAddress || pInfo.address || ''} ${pInfo.curMoo || pInfo.moo ? 'ม.'+(pInfo.curMoo || pInfo.moo) : ''} ${pInfo.curRoad || pInfo.road ? 'ถ.'+(pInfo.curRoad || pInfo.road) : ''} ${pInfo.curSubDistrict || pInfo.subDistrict || ''} ${pInfo.curDistrict || pInfo.district || ''} ${pInfo.curProvince || pInfo.province || ''} ${pInfo.curZipcode || pInfo.zipcode || ''}`.trim() || '-';
        customerTaxId = pInfo.idCard || '-';
        customerPhone = Array.isArray(pInfo.phones) && pInfo.phones.length > 0 ? pInfo.phones[0] : (pInfo.phone || pInfo.phone1 || '-');
    }

    const cashierName = "Admin User";
    
    const itemsToPrint = txn.rawTx?.items || txn.items || [{name: txn.category || 'รายการ', quantity: 1, price: txn.amount, total: txn.amount}];
    const subtotal = txn.rawTx?.subtotal || txn.subtotal || txn.amount || 0;
    const discountAmount = txn.rawTx?.discountAmount || txn.discountAmount || 0;
    const taxMode = txn.rawTx?.taxMode || txn.taxMode || 'none';
    const vatRate = txn.rawTx?.vatRate || txn.vatRate || 7;
    const vatAmount = txn.rawTx?.vatAmount || txn.vatAmount || 0;
    const grandTotal = txn.rawTx?.grandTotal || txn.grandTotal || txn.amount || 0;
    const paymentMethod = txn.method || txn.paymentMethod || txn.rawTx?.paymentMethod || 'cash';
    
    const afterDiscount = Math.max(0, subtotal - discountAmount);
    const priceExcludingVat = taxMode === 'include' ? (grandTotal - vatAmount) : afterDiscount;

    let paymentMethodThai = 'เงินสด';
    if (paymentMethod === 'transfer') paymentMethodThai = 'โอนเงิน';
    if (paymentMethod === 'credit' || paymentMethod === 'credit_card') paymentMethodThai = 'บัตรเครดิต';

    let hasVatableItems = false;
    let itemsHtml = '';
    if (format === 'A4') {
        itemsHtml = itemsToPrint.map((item, index) => {
            const isVat = item.isVatable !== undefined ? !!item.isVatable : !!(posProducts && posProducts.find(p => p.name === item.name)?.isVatable);
            if (isVat) hasVatableItems = true;
            const vatMark = isVat ? ' <span style="color:#0ea5e9; font-size:10px; font-weight:bold;">(V)</span>' : '';
            return `
            <tr>
                <td class="text-center">${index + 1}</td>
                <td>${item.name}${vatMark}</td>
                <td class="text-center">${Number(item.quantity).toFixed(2)}</td>
                <td class="text-right">${formatCurPrint(item.price)}</td>
                <td class="text-right">0.00</td>
                <td class="text-right font-bold">${formatCurPrint(item.total)}</td>
            </tr>
        `}).join('');
    } else {
        itemsHtml = itemsToPrint.map(item => {
            const isVat = item.isVatable !== undefined ? !!item.isVatable : !!(posProducts && posProducts.find(p => p.name === item.name)?.isVatable);
            if (isVat) hasVatableItems = true;
            const vatMark = isVat ? ' <span style="font-size:10px;">(V)</span>' : '';
            return `
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; page-break-inside: avoid;">
                <div style="flex: 1; padding-right: 10px;">
                    <div style="font-weight: bold; margin-bottom: 2px;">${item.name}${vatMark}</div>
                    <div style="color: #64748b; font-size: 11px;">${item.quantity} x ${formatCurPrint(item.price)}</div>
                </div>
                <div style="text-align: right; font-weight: bold; white-space: nowrap; align-self: flex-end;">${formatCurPrint(item.total)}</div>
            </div>
        `}).join('');
    }

    const html = format === 'A4' ? `
        <!DOCTYPE html>
        <html lang="th">
        <head>
            <meta charset="UTF-8">
            <title>ใบเสร็จรับเงิน - ${receiptNo}</title>
            <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Sarabun', sans-serif; margin: 0; padding: 15px 20px; font-size: 13px; color: #1e293b; line-height: 1.5; }
                @page { size: A4; margin: 5mm; }
                .page-break { page-break-before: always; break-before: page; }
                .container { padding: 0; max-width: 100%; }
                .header-top { display: flex; justify-content: flex-end; align-items: flex-end; margin-bottom: 20px; }
                .doc-title-wrapper { text-align: right; }
                .doc-type { font-size: 12px; color: #64748b; margin-bottom: 2px; }
                .doc-title { font-size: 24px; font-weight: 700; color: #0ea5e9; } 
                .info-grid { display: grid; grid-template-columns: 1fr 280px; gap: 20px; margin-bottom: 20px; }
                .info-box { display: flex; flex-direction: column; gap: 4px; }
                .info-row { display: flex; align-items: baseline; }
                .info-label { width: 80px; font-weight: 600; color: #000; flex-shrink: 0; }
                .info-val { flex: 1; }
                .font-bold { font-weight: 700; }
                .doc-info-box { background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 12px 15px; border-radius: 6px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; font-size: 13px; }
                th { background-color: #f0f9ff; color: #0369a1; padding: 8px; text-align: left; border-top: 2px solid #bae6fd; border-bottom: 2px solid #bae6fd; font-weight: 600; }
                td { padding: 8px; border-bottom: 1px dashed #e2e8f0; vertical-align: top; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .summary-section { display: grid; grid-template-columns: 1fr 300px; gap: 20px; margin-bottom: 20px; margin-top: 20px; }
                .summary-left { font-size: 13px; }
                .summary-left-title { font-weight: 700; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; font-size: 14px; }
                .summary-right { display: flex; flex-direction: column; gap: 6px; }
                .sum-row { display: flex; justify-content: space-between; align-items: baseline; }
                .sum-row.grand-total { background-color: #f0f9ff; padding: 10px 15px; font-weight: 700; border-radius: 6px; font-size: 15px; align-items: center; border: 1px solid #bae6fd; color: #0f172a; margin-top: 4px; }
                .footer-info { display: flex; flex-direction: column; gap: 10px; font-size: 13px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
                .footer-row { display: flex; gap: 10px; align-items: baseline; }
                .footer-label { font-weight: 600; width: 85px; display: flex; align-items: center; gap: 6px; }
                .signature-area { margin-top: 60px; display: flex; justify-content: space-around; }
                .signature-box { text-align: center; width: 250px; }
                @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
            </style>
        </head>
        <body>
            ${['(ต้นฉบับ)', '(สำเนา)'].map(docType => `
            <div class="container">
                <div style="display: flex; justify-content: space-between; align-items: stretch; margin-bottom: 15px;">
                    <div style="display: flex; flex-direction: column; flex: 1; padding-right: 20px;">
                        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                            ${logoUrl ? `<div style="width: 90px; height: 90px; flex-shrink: 0;"><img src="${logoUrl}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 50%;" /></div>` : ''}
                            <div style="display: flex; flex-direction: column; gap: 2px;">
                                <div style="font-size: 16px; font-weight: 700; color: #1e293b;">${clinicName}</div>
                                <div style="color: #475569; font-size: 13px;">${clinicAddress}</div>
                                <div style="color: #475569; font-size: 13px; display: flex; gap: 10px; margin-top: 1px;">
                                    <span><b>เลขที่ภาษี:</b> ${taxId}</span>
                                    <span><b>โทร:</b> ${clinicPhone}</span>
                                </div>
                            </div>
                        </div>
                        <div style="font-size: 13px; line-height: 1.6; color: #0f172a; display: flex; flex-direction: column; justify-content: flex-end; flex: 1;">
                            <div style="display: flex;">
                                <div style="width: 85px; font-weight: 700; color: #1e293b;">ลูกค้า:</div>
                                <div>${customerName}</div>
                            </div>
                            <div style="display: flex;">
                                <div style="width: 85px; font-weight: 700; color: #1e293b;">ที่อยู่:</div>
                                <div>${customerAddress}</div>
                            </div>
                            <div style="display: flex;">
                                <div style="width: 85px; font-weight: 700; color: #1e293b;">เลขที่ภาษี:</div>
                                <div>${customerTaxId}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="doc-title-wrapper" style="width: 320px; text-align: right; display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <div class="doc-type">${docType}</div>
                            <div class="doc-title" style="margin-bottom: 12px; font-size: 20px; color: #0284c7;">ใบเสร็จรับเงิน/ใบกำกับภาษี</div>
                        </div>
                        <div class="doc-info-box info-box" style="text-align: left; padding: 12px 15px; width: 100%; box-sizing: border-box; margin-top: auto;">
                            <div class="info-row"><div class="info-label" style="width: 85px;">เลขที่เอกสาร:</div><div class="info-val font-bold">${receiptNo}</div></div>
                            <div class="info-row"><div class="info-label" style="width: 85px;">วันที่ออก:</div><div class="info-val">${dateStr.split(' ')[0]}</div></div>
                            <div class="info-row"><div class="info-label" style="width: 85px;">อ้างอิง:</div><div class="info-val">${customerHN}</div></div>
                        </div>
                        <div style="font-size: 13px; line-height: 1.6; color: #0f172a; display: flex; padding-left: 15px; box-sizing: border-box; margin-top: auto;">
                            <div style="width: 85px; font-weight: 700; color: #1e293b; text-align: left;">โทร:</div>
                            <div style="text-align: left;">${customerPhone}</div>
                        </div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th class="text-center" style="width: 50px;">ลำดับ</th>
                            <th>รายการสินค้า / บริการ</th>
                            <th class="text-center" style="width: 80px;">จำนวน</th>
                            <th class="text-right" style="width: 100px;">ราคาต่อหน่วย</th>
                            <th class="text-right" style="width: 80px;">ส่วนลด</th>
                            <th class="text-right" style="width: 120px;">จำนวนเงิน</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                <div class="summary-section">
                    <div class="summary-left">
                        <div class="summary-left-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            สรุป
                        </div>
                        <div class="sum-row" style="margin-bottom: 4px; padding-right: 20px;"><span>มูลค่าก่อนภาษี</span><span>${formatCurPrint(priceExcludingVat)} บาท</span></div>
                        <div class="sum-row" style="margin-bottom: 8px; padding-right: 20px;"><span>ภาษีมูลค่าเพิ่ม ${taxMode !== 'none' ? vatRate : '0'}%</span><span>${formatCurPrint(vatAmount)} บาท</span></div>
                        
                        <div style="border-top: 1px solid #cbd5e1; margin: 10px 20px 10px 0;"></div>
                        
                        <div class="sum-row font-bold" style="margin-top: 5px; padding-right: 20px;">
                            <span>จำนวนเงินทั้งสิ้น</span>
                            <span>(${bahtTextPrint(grandTotal)})</span>
                        </div>
                    </div>
                    <div class="summary-right">
                        <div class="sum-row"><span>รวมเป็นเงิน</span><span>${formatCurPrint(subtotal)} บาท</span></div>
                        <div class="sum-row"><span>ส่วนลดเพิ่มเติม</span><span>${formatCurPrint(discountAmount)} บาท</span></div>
                        <div class="sum-row" style="margin-bottom: 8px;"><span>จำนวนเงินหลังหักส่วนลด</span><span>${formatCurPrint(afterDiscount)} บาท</span></div>
                        
                        <div class="sum-row grand-total" style="margin-top: 5px;">
                            <span>จำนวนเงินทั้งสิ้น</span>
                            <span style="color: #0ea5e9;">${formatCurPrint(grandTotal)} บาท</span>
                        </div>
                    </div>
                </div>

                <div class="footer-info">
                    <div class="footer-row">
                        <div class="footer-label">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                            ชำระเงิน:
                        </div>
                        <div>วันที่ชำระ: ${dateStr.split(' ')[0]} &nbsp;&nbsp;&nbsp; ${paymentMethodThai} &nbsp;&nbsp;&nbsp; จำนวนเงินรวม: ${formatCurPrint(grandTotal)} บาท</div>
                    </div>
                    <div class="footer-row" style="margin-top: 4px;">
                        <div class="footer-label">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            หมายเหตุ:
                        </div>
                        <div>${txn.note || '-'}</div>
                    </div>
                </div>

                <div class="signature-area">
                    <div class="signature-box">
                        <div class="signature-line" style="border-bottom: 1px dotted #94a3b8; width: 100%; margin-bottom: 8px;"></div>
                        <div>(....................................................)</div>
                        <div style="margin-top: 4px;">ผู้รับบริการ</div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-line" style="border-bottom: 1px dotted #94a3b8; width: 100%; margin-bottom: 8px;"></div>
                        <div>(....................................................)</div>
                        <div style="margin-top: 4px;">เจ้าหน้าที่</div>
                    </div>
                </div>
            </div>
            `).join('<div class="page-break"></div>')}
        </body>
        </html>
    ` : `
        <!DOCTYPE html>
        <html lang="th">
        <head>
            <meta charset="UTF-8">
            <title>สลิปใบเสร็จ - ${receiptNo}</title>
            <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Sarabun', sans-serif; margin: 0; padding: 0; font-size: 13px; color: #000; width: 72mm; }
                @page { size: 80mm auto; margin: 0; }
                .slip-container { padding: 4mm; padding-bottom: 15mm; }
                .text-center { text-align: center; }
                .clinic-name { font-size: 18px; font-weight: bold; margin-bottom: 2px; }
                .divider { border-bottom: 1px dashed #666; margin: 8px 0; }
                .divider-thick { border-bottom: 2px solid #000; margin: 10px 0; }
                .summary-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
                .total { font-size: 18px; font-weight: bold; margin-top: 8px; border-top: 1px dashed #666; padding-top: 8px; }
            </style>
        </head>
        <body>
            <div class="slip-container">
                <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 8px;">
                    ${logoUrl ? `<img src="${logoUrl}" style="width: 45px; height: 45px; flex-shrink: 0; object-fit: contain; border-radius: 50%;" />` : ''}
                    <div style="${logoUrl ? 'text-align: left;' : 'text-align: center;'}">
                        <div class="clinic-name" style="margin-bottom: 0;">${clinicName}</div>
                        <div style="line-height: 1.2; font-size: 11px;">${clinicAddress}</div>
                        <div style="line-height: 1.2; font-size: 11px;">โทร: ${clinicPhone}</div>
                    </div>
                </div>
                <div class="text-center" style="margin-bottom: 4px; font-weight: bold; font-size: 14px;">ใบเสร็จรับเงิน</div>
                
                <div class="divider"></div>
                
                <div style="line-height: 1.6;">
                    <div><strong>เลขที่:</strong> ${receiptNo}</div>
                    <div><strong>วันที่:</strong> ${dateStr}</div>
                    ${customerHN !== '-' ? `<div><strong>HN:</strong> ${customerHN}</div>` : ''}
                    <div><strong>ลูกค้า:</strong> ${customerName}</div>
                    <div><strong>แคชเชียร์:</strong> ${cashierName}</div>
                </div>
                
                <div class="divider-thick"></div>
                
                <div style="font-weight: bold; margin-bottom: 8px; display: flex; justify-content: space-between;">
                    <span>รายการ</span>
                    <span>รวม</span>
                </div>
                
                ${itemsHtml}
                
                <div class="divider-thick"></div>
                
                <div class="summary-row"><span>รวมเป็นเงิน:</span><span>${formatCurPrint(subtotal)}</span></div>
                ${discountAmount > 0 ? `<div class="summary-row"><span>ส่วนลด:</span><span>-${formatCurPrint(discountAmount)}</span></div>` : ''}
                ${taxMode !== 'none' && vatAmount > 0 ? `<div class="summary-row"><span>ภาษี (${vatRate}%):</span><span>${formatCurPrint(vatAmount)}</span></div>` : ''}
                
                <div class="summary-row total"><span>ยอดสุทธิ:</span><span>${formatCurPrint(grandTotal)}</span></div>
                
                <div class="divider"></div>
                
                ${hasVatableItems ? `<div style="font-size: 11px; color: #666; margin-bottom: 8px;">(V) = รายการที่คิดภาษีมูลค่าเพิ่ม</div>` : ''}
                <div class="text-center" style="line-height: 1.6;">
                    <div>ชำระโดย: <strong>${paymentMethodThai}</strong></div>
                    <div style="margin-top: 15px; font-size: 14px; font-weight: bold;">*** ขอบคุณที่ใช้บริการ ***</div>
                </div>
            </div>
        </body>
        </html>
    `;
    return html;
};

export const getEffectiveApptStatus = (appt) => {
    if (!appt) return 'pending';
    let effStatus = appt.dealStatus || appt.status || 'pending';
    for (let i = 1; i <= 4; i++) {
        if (appt[`postpone${i}_date`] && appt[`postpone${i}_status`]) {
            effStatus = appt[`postpone${i}_status`];
        } else break;
    }
    return effStatus;
};

export const getEffectiveApptDatetimeStr = (appt) => {
    if (!appt) return '';
    for (let i = 4; i >= 1; i--) {
        const pDate = appt[`postpone${i}_date`];
        if (pDate) return pDate;
    }
    if (appt.postponedDate) return appt.postponedDate;
    return appt.datetime || '';
};

export const getEffectiveApptIsoDate = (appt) => {
    if (!appt) return '';
    for (let i = 4; i >= 1; i--) {
        const pDate = appt[`postpone${i}_date`];
        if (pDate) return parseThaiDateToISO(pDate) || '';
    }
    if (appt.rawPostponedDate) return appt.rawPostponedDate;
    return appt.rawDeliveryStart || appt.rawDateTime || parseThaiDateToISO(appt.datetime) || '';
};

export const parseThaiDateToISO = (thaiDateTimeStr) => {
    if (!thaiDateTimeStr) return null;
    try {
        const parts = thaiDateTimeStr.split(' ');
        const dateParts = parts[0].split('/');
        if (dateParts.length !== 3) return null;
        const d = parseInt(dateParts[0], 10);
        const m = parseInt(dateParts[1], 10) - 1;
        const y = parseInt(dateParts[2], 10) - 543;
        let h = 0, min = 0;
        if (parts[1]) {
            const timeParts = parts[1].replace('น.', '').trim().split(':');
            if (timeParts.length >= 2) {
                h = parseInt(timeParts[0], 10);
                min = parseInt(timeParts[1], 10);
            }
        }
        return new Date(y, m, d, h, min).toISOString();
    } catch (e) {
        return null;
    }
};

export const parseAnyDate = (dateVal) => {
    if (!dateVal) return null;
    if (dateVal instanceof Date) return dateVal;
    const str = String(dateVal).trim();
    
    // Check if it's ISO format first
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        const parsed = new Date(str);
        if (!isNaN(parsed.getTime())) return parsed;
    }
    
    // Check if slash format (could be DD/MM/YYYY or YYYY/MM/DD)
    if (str.includes('/')) {
        try {
            const parts = str.split(' ');
            const dateParts = parts[0].split('/');
            if (dateParts.length === 3) {
                let d, m, y;
                // Check if YYYY/MM/DD
                if (dateParts[0].length === 4) {
                    y = parseInt(dateParts[0], 10);
                    m = parseInt(dateParts[1], 10) - 1;
                    d = parseInt(dateParts[2], 10);
                } else {
                    // DD/MM/YYYY
                    d = parseInt(dateParts[0], 10);
                    m = parseInt(dateParts[1], 10) - 1;
                    y = parseInt(dateParts[2], 10);
                }
                if (y > 2400) y -= 543; // BE to CE
                let h = 0, min = 0;
                if (parts[1]) {
                    const timeParts = parts[1].replace('น.', '').trim().split(':');
                    if (timeParts.length >= 2) {
                        h = parseInt(timeParts[0], 10);
                        min = parseInt(timeParts[1], 10);
                    }
                }
                const parsed = new Date(y, m, d, h, min);
                if (!isNaN(parsed.getTime())) return parsed;
            }
        } catch (e) {
            // fallback
        }
    }
    
    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? null : parsed;
};

export const isSameDay = (d1, d2) => {
    const parsed1 = parseAnyDate(d1);
    const parsed2 = parseAnyDate(d2);
    if (!parsed1 || !parsed2) return false;
    return parsed1.getDate() === parsed2.getDate() &&
           parsed1.getMonth() === parsed2.getMonth() &&
           parsed1.getFullYear() === parsed2.getFullYear();
};

export const formatFinTime = (dateStr) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString('th-TH');
    } catch { return ''; }
};

export const formatFinCurrency = (amount) => {
    return new Intl.NumberFormat('th-TH', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(Number(amount) || 0);
};

export const getFinDynamicTextClass = (amountStr) => {
    if (!amountStr) return 'text-2xl sm:text-3xl lg:text-2xl xl:text-3xl tracking-tight';
    const len = String(amountStr).length;
    if (len >= 18) return 'text-lg sm:text-xl lg:text-lg xl:text-xl tracking-tighter';
    if (len >= 14) return 'text-xl sm:text-2xl lg:text-xl xl:text-2xl tracking-tighter';
    return 'text-2xl sm:text-3xl lg:text-2xl xl:text-3xl tracking-tight';
};



export const toastSubscribers = new Set();
export let globalToasts = [];

export const triggerGlobalToast = (message, type = 'success') => {
  const id = 'toast_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  const newToast = { id, message, type, isClosing: false };
  
  if (globalToasts.length >= 4) {
    globalToasts[0] = { ...globalToasts[0], isClosing: true };
  }
  globalToasts = [...globalToasts, newToast];
  
  toastSubscribers.forEach(callback => callback(globalToasts));
  
  setTimeout(() => {
    globalToasts = globalToasts.map(t => t.id === id ? { ...t, isClosing: true } : t);
    toastSubscribers.forEach(callback => callback(globalToasts));
    
    setTimeout(() => {
      globalToasts = globalToasts.filter(t => t.id !== id);
      toastSubscribers.forEach(callback => callback(globalToasts));
    }, 300);
  }, 3000);
};

export const dismissGlobalToast = (id) => {
  globalToasts = globalToasts.map(t => t.id === id ? { ...t, isClosing: true } : t);
  toastSubscribers.forEach(callback => callback(globalToasts));
  
  setTimeout(() => {
    globalToasts = globalToasts.filter(t => t.id !== id);
    toastSubscribers.forEach(callback => callback(globalToasts));
  }, 300);
};

export const ToastContainer = () => {
  const [toasts, setToasts] = React.useState([]);
  
  React.useEffect(() => {
    const handleUpdate = (newToasts) => {
      setToasts([...newToasts]);
    };
    // สมัครรับการแจ้งเตือน
    toastSubscribers.add(handleUpdate);
    setToasts([...globalToasts]);
    return () => {
      toastSubscribers.delete(handleUpdate);
    };
  }, []);
  
  // ใช้ createPortal เพื่อให้ Toast ลอยอยู่เหนือสุดของ DOM (z-index สูงสุด)
  return createPortal(
    <>
      <style>{`
        @keyframes toastSlideDown {
            from { opacity: 0; transform: translateY(-20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes toastSlideUp {
            from { opacity: 1; transform: translateY(0) scale(1); }
            to { opacity: 0; transform: translateY(-20px) scale(0.95); }
        }
        .toast-animate-in { 
            animation: toastSlideDown 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; 
        }
        .toast-animate-out { 
            animation: toastSlideUp 0.3s ease-in forwards; 
        }
        .toast-wrapper-active {
            opacity: 1;
            transform: translateY(0);
            margin-bottom: 0.5rem;
            transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .toast-wrapper-closing {
            opacity: 0 !important;
            transform: translateY(-10px);
            margin-bottom: 0px !important;
            pointer-events: none;
            transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
      <div 
        className="fixed left-1/2 -translate-x-1/2 z-[100000] w-max max-w-[90vw] sm:max-w-md flex flex-col pointer-events-none"
        style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
      >
        {toasts.map((t) => (
          <div 
            key={t.id}
            onClick={() => dismissGlobalToast(t.id)}
            className={`pointer-events-auto cursor-pointer ${t.isClosing ? 'toast-wrapper-closing' : 'toast-wrapper-active'}`}
          >
            <div 
              key={`inner_${t.id}`}
              className={`flex items-center gap-2.5 sm:gap-3 px-4 py-2.5 sm:px-6 sm:py-3.5 rounded-full sm:rounded-2xl shadow-xl border text-white ${
                t.type === 'success' ? 'bg-emerald-600 border-emerald-500 shadow-emerald-500/10' : 
                t.type === 'warning' ? 'bg-amber-600 border-amber-500 shadow-amber-500/10' : 
                'bg-rose-600 border-rose-500 shadow-rose-500/10'
              } ${t.isClosing ? 'toast-animate-out' : 'toast-animate-in'}`}
            >
              {t.type === 'success' ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" /> : 
               t.type === 'warning' ? <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" /> : 
               <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />}
              <span className="font-medium kanit-text text-xs sm:text-sm leading-tight break-words">{t.message}</span>
            </div>
          </div>
        ))}
      </div>
    </>,
    document.body
  );
};

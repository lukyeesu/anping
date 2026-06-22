import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import CalendarDay from './CalendarDay';
import { GOOGLE_SCRIPT_URL } from '../global/constants';
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

const PdpaConsentForm = ({ token, hn }) => {
    const [status, setStatus] = useState('loading'); // loading, pending, consented, declined, invalid, saving
    const [patient, setPatient] = useState(null);
    const [step, setStep] = useState(1);
    const [page1Agreed, setPage1Agreed] = useState(false);
    const [marketingConsent, setMarketingConsent] = useState(null);
    const [reviewConsent, setReviewConsent] = useState(null);
    
    // Set to true by default to read inline continuously as requested
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(true);

    // Informed Consent states
    const [signerType, setSignerType] = useState('patient'); // 'patient' or 'representative'
    const [representativeName, setRepresentativeName] = useState('');
    const [relationship, setRelationship] = useState('');
    const [riskAgreed, setRiskAgreed] = useState(false);
    const [voluntaryAgreed, setVoluntaryAgreed] = useState(false);
    
    // Set to true by default to read inline continuously as requested
    const [hasScrolledToBottomIC, setHasScrolledToBottomIC] = useState(true);
    
    // Canvas States & Snappy drawing refs
    const [isEmpty, setIsEmpty] = useState(true);
    const canvasRef = useRef(null);
    const isDrawingRef = useRef(false);
    const lastCoordsRef = useRef({ x: 0, y: 0 });

    // Scroll to top of window instantly when moving between steps
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [step]);

    const [savingStep, setSavingStep] = useState(0);

    // Dynamic step simulator for saving state
    useEffect(() => {
        if (status !== 'saving') {
            setSavingStep(0);
            return;
        }
        const interval = setInterval(() => {
            setSavingStep((prev) => (prev < 3 ? prev + 1 : prev));
        }, 900);
        return () => clearInterval(interval);
    }, [status]);

    // snappier drawing hook to bypass react state updates and prevent touch page scroll jitter
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const getCoords = (e) => {
            const rect = canvas.getBoundingClientRect();
            let clientX, clientY;
            if (e.touches && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }
            return {
                x: (clientX - rect.left) * (canvas.width / rect.width),
                y: (clientY - rect.top) * (canvas.height / rect.height)
            };
        };

        const handleStart = (e) => {
            if (!riskAgreed || !voluntaryAgreed) return;
            if (e.cancelable) e.preventDefault();
            
            const coords = getCoords(e);
            isDrawingRef.current = true;
            lastCoordsRef.current = coords;

            const ctx = canvas.getContext('2d');
            ctx.beginPath();
            ctx.moveTo(coords.x, coords.y);
            
            // Snappy feedback: draw a small point on tap
            ctx.arc(coords.x, coords.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = '#0f172a';
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(coords.x, coords.y);

            setIsEmpty(false);
        };

        const handleMove = (e) => {
            if (!isDrawingRef.current) return;
            if (e.cancelable) e.preventDefault();

            const coords = getCoords(e);
            const ctx = canvas.getContext('2d');
            
            ctx.beginPath();
            ctx.moveTo(lastCoordsRef.current.x, lastCoordsRef.current.y);
            ctx.lineTo(coords.x, coords.y);
            ctx.strokeStyle = '#0f172a'; // slate-900 color for signature ink
            ctx.lineWidth = 4.5; // slightly thicker for better readability
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
            
            lastCoordsRef.current = coords;
            setIsEmpty(false);
        };

        const handleEnd = () => {
            isDrawingRef.current = false;
        };

        // Bind raw touch/mouse events directly to prevent default mobile scroll behavior
        canvas.addEventListener('mousedown', handleStart, { passive: false });
        canvas.addEventListener('mousemove', handleMove, { passive: false });
        canvas.addEventListener('mouseup', handleEnd);
        canvas.addEventListener('mouseleave', handleEnd);

        canvas.addEventListener('touchstart', handleStart, { passive: false });
        canvas.addEventListener('touchmove', handleMove, { passive: false });
        canvas.addEventListener('touchend', handleEnd);
        canvas.addEventListener('touchcancel', handleEnd);

        return () => {
            canvas.removeEventListener('mousedown', handleStart);
            canvas.removeEventListener('mousemove', handleMove);
            canvas.removeEventListener('mouseup', handleEnd);
            canvas.removeEventListener('mouseleave', handleEnd);

            canvas.removeEventListener('touchstart', handleStart);
            canvas.removeEventListener('touchmove', handleMove);
            canvas.removeEventListener('touchend', handleEnd);
            canvas.removeEventListener('touchcancel', handleEnd);
        };
    }, [riskAgreed, voluntaryAgreed]);

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setIsEmpty(true);
    };

    // Fetch patient data on mount
    useEffect(() => {
        const fetchPatient = async () => {
            try {
                const response = await fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'GET_DATA', sheetName: 'Patients', payload: null }),
                });
                const responseText = await response.text();
                const result = JSON.parse(responseText);
                if (result.status === 'success') {
                    const found = result.data.find(p => (p.hn || p.id) === hn);
                    if (found) {
                        if (found.pdpaToken === token && found.pdpaExpires && new Date().getTime() <= found.pdpaExpires) {
                            setPatient(found);
                            setStatus('pending');
                        } else {
                            setStatus('invalid');
                        }
                    } else {
                        setStatus('invalid');
                    }
                } else {
                    setStatus('invalid');
                }
            } catch (err) {
                console.error('Error fetching patient data:', err);
                setStatus('invalid');
            }
        };
        fetchPatient();
    }, [token, hn]);

    const handleSubmit = async () => {
        if (marketingConsent === null || reviewConsent === null) {
            alert('กรุณาเลือกความยินยอมให้ครบถ้วนในหน้า 2 ก่อน');
            setStep(2);
            return;
        }

        if (signerType === 'representative' && (!representativeName.trim() || !relationship.trim())) {
            alert('กรุณากรอกข้อมูลผู้แทนโดยชอบธรรมและความเกี่ยวข้องกับผู้ป่วยให้ครบถ้วน');
            return;
        }

        if (!riskAgreed || !voluntaryAgreed) {
            alert('กรุณกดยินยอมรับทราบความเสี่ยงและสมัครใจรับการรักษาให้ครบถ้วน');
            return;
        }

        if (isEmpty) {
            alert('กรุณาลงลายมือชื่อของท่านในช่องลงนาม');
            return;
        }

        // 1. Extract E-Signature from canvas as base64 synchronously BEFORE unmounting
        let base64Data = '';
        try {
            const canvas = canvasRef.current;
            if (!canvas) {
                alert('ไม่พบช่องลงนาม กรุณาลองใหม่อีกครั้ง');
                return;
            }
            const dataUrl = canvas.toDataURL("image/png");
            base64Data = dataUrl.split(',')[1]; // Remove data url header
        } catch (canvasErr) {
            console.error('Canvas export error:', canvasErr);
            alert('เกิดข้อผิดพลาดในการประมวลผลลายเซ็น: ' + canvasErr.message);
            return;
        }
        
        setStatus('saving');
        
        try {
            // 2. Fetch IP Address
            let ipAddress = 'unknown';
            try {
                const ipRes = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipRes.json();
                ipAddress = ipData.ip;
            } catch (ipErr) {
                console.warn('Could not fetch IP', ipErr);
            }

            // 3. Upload E-Signature to Google Drive
            const fileName = `signature_${patient.hn || patient.id}_${new Date().getTime()}.png`;
            const uploadResponse = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ 
                    action: 'UPLOAD_FILE', 
                    sheetName: 'Patients', 
                    payload: {
                        folderId: '1UX-E1SB7qSEq2yK9e8gBZsNj13W2F92R',
                        fileName: fileName,
                        mimeType: 'image/png',
                        data: base64Data
                    }
                }),
            });
            const uploadResult = await uploadResponse.json();
            if (uploadResult.status !== 'success') {
                throw new Error(uploadResult.message || 'ไม่สามารถบันทึกลายเซ็นลง Google Drive ได้');
            }
            
            const signatureUrl = uploadResult.fileUrl;

            // 4. Build updated patient object containing both PDPA and Informed Consent details
            const updatedPatient = { 
                ...patient, 
                // PDPA fields
                pdpaStatus: 'green',
                pdpaTimestamp: new Date().toISOString(),
                pdpaIpAddress: ipAddress,
                pdpaUserAgent: navigator.userAgent,
                isConsentMarketing: marketingConsent === 'yes',
                isConsentReview: reviewConsent === 'yes',

                // Informed Consent fields
                informedConsentStatus: 'green',
                informedConsentTimestamp: new Date().toISOString(),
                informedConsentIpAddress: ipAddress,
                informedConsentUserAgent: navigator.userAgent,
                informedConsentSignerType: signerType,
                informedConsentRepresentativeName: signerType === 'representative' ? representativeName : '',
                informedConsentRepresentativeRelation: signerType === 'representative' ? relationship : '',
                informedConsentRiskAgreed: riskAgreed,
                informedConsentVoluntaryAgreed: voluntaryAgreed,
                informedConsentSignatureUrl: signatureUrl,
                informedConsentDocId: 'informed-consent-v1', // Document ID
                
                pdpaToken: null, 
                pdpaExpires: null 
            };

            // 5. Save Patient data
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'SAVE_DATA', sheetName: 'Patients', payload: updatedPatient }),
            });
            const responseText = await response.text();
            const result = JSON.parse(responseText);
            if (result.status === 'success') {
                setStatus('consented');
            } else {
                alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่');
                setStatus('pending');
            }
        } catch (error) {
            console.error('Submit error:', error);
            alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message);
            setStatus('pending');
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-start pt-24 sm:pt-36 bg-white p-6 font-sans">
                <div className="mb-12 animate-[pulse_2s_infinite_ease-in-out]">
                    <img src="/anpingclinic.png" alt="Anping Clinic Logo" className="w-64 sm:w-80 h-auto object-contain" />
                </div>
                <div className="flex flex-col items-center gap-4">
                    <div className="relative w-10 h-10">
                        <div className="absolute inset-0 rounded-full border-2 border-slate-100"></div>
                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-500 border-r-sky-500 animate-spin"></div>
                    </div>
                    <p className="text-slate-400 text-xs tracking-widest kanit-text animate-[pulse_1.5s_infinite_ease-in-out] mt-2">
                        กำลังดึงข้อมูลเอกสาร...
                    </p>
                </div>
            </div>
        );
    }

    if (status === 'invalid') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white p-6 font-sans">
                <div className="max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6"><XCircle size={40} /></div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-3 kanit-text">ลิงก์ไม่ถูกต้อง หรือ หมดอายุ</h2>
                    <p className="text-slate-400">กรุณาติดต่อเจ้าหน้าที่คลินิกเพื่อขอลิงก์ใหม่อีกครั้ง</p>
                </div>
            </div>
        );
    }

    if (status === 'saving') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-start pt-24 sm:pt-36 bg-white p-6 font-sans text-center animate-in fade-in duration-300">
                <div className="mb-12 animate-[pulse_2s_infinite_ease-in-out]">
                    <img src="/anpingclinic.png" alt="Anping Clinic Logo" className="w-64 sm:w-80 h-auto object-contain" />
                </div>
                
                <div className="max-w-md w-full flex flex-col items-center">
                    {/* Cool custom radar/pulse loading circle representing data transfer */}
                    <div className="relative flex items-center justify-center w-16 h-16 mb-8">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-20 animate-ping"></span>
                        <div className="relative rounded-full h-12 w-12 bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-500 shadow-sm shadow-emerald-500/10">
                            <svg className="animate-spin h-6 w-6 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                    </div>
                    
                    <h2 className="text-xl font-bold text-slate-800 kanit-text">
                        กำลังยืนยันและบันทึกข้อมูล
                    </h2>
                    
                    {/* Static status text */}
                    <div className="h-6 mt-3 flex items-center justify-center">
                        <p className="text-emerald-600 font-semibold text-sm transition-all duration-300 animate-[pulse_1.5s_infinite_ease-in-out]">
                            กำลังบันทึกเอกสารยินยอม...
                        </p>
                    </div>
                    
                    <p className="text-slate-400 mt-4 text-xs max-w-xs leading-relaxed">
                        กรุณารอสักครู่ ระบบกำลังยืนยันตัวตนและบันทึกข้อมูลการยินยอมการเก็บข้อมูลและการรักษาพยาบาล
                    </p>
                </div>
            </div>
        );
    }

    if (status === 'consented') {
        const handleCloseTab = () => {
            window.close();
            setTimeout(() => {
                alert("หากหน้าต่างไม่ปิดโดยอัตโนมัติ กรุณาปิดแท็บนี้ด้วยตนเอง");
            }, 100);
        };

        return (
            <div className="min-h-screen flex items-center justify-center bg-white p-6 font-sans">
                <div className="max-w-md w-full text-center animate-in fade-in zoom-in duration-500">
                    <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/10">
                        <CheckCircle2 size={48} />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800 mb-3 kanit-text">เรียบร้อยแล้ว</h2>
                    <p className="text-slate-500 leading-relaxed mb-8">ขอบคุณที่ให้ความยินยอมการเก็บข้อมูลและการรักษาพยาบาล<br/>อันผิงคลินิกจะดูแลข้อมูลการรักษาและการบริการอย่างปลอดภัยสูงสุด</p>
                    <button
                        onClick={handleCloseTab}
                        className="px-8 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] text-sm kanit-text"
                    >
                        ปิดหน้าต่างนี้
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-white font-sans selection:bg-sky-100">
            {/* Progress Bar Container */}
            <div className="fixed top-0 left-0 w-full h-1.5 bg-slate-50 z-50">
                <div 
                    className="h-full bg-sky-500 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(14,165,233,0.5)]" 
                    style={{ width: step === 1 ? '33.3%' : step === 2 ? '66.6%' : '100%' }}
                ></div>
            </div>

            <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 max-w-4xl mx-auto w-full">
                {step === 1 && (
                    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <header className="mb-10 text-left w-full">
                            <div className="flex justify-center w-full mb-6">
                                <div className="inline-flex items-center justify-center w-14 h-14 bg-sky-50 text-sky-500 rounded-2xl shadow-sm"><ShieldCheck size={28} /></div>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 kanit-text leading-tight">ความยินยอมและรับทราบ<br/>การเก็บรวบรวมข้อมูลส่วนบุคคล</h1>
                        </header>

                        <div className="relative group">
                            {/* Full Read Area */}
                            <div className="text-slate-600 space-y-5 mb-8 leading-relaxed py-2">
                                <p className="text-lg text-slate-700 font-medium italic">"อันผิงคลินิก ให้ความสำคัญกับความเป็นส่วนตัวของท่านเป็นอันดับหนึ่ง"</p>
                                <p>ท่านรับทราบและยินยอมให้คลินิก เก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคล เพื่อวัตถุประสงค์ในการให้บริการทางการแพทย์ การตรวจวินิจฉัย การรักษาด้วยศาสตร์แพทย์แผนจีน การจัดทำเวชระเบียน และการติดต่อนัดหมาย</p>
                                
                                <section>
                                    <h3 className="font-bold text-slate-800 mb-2">1. ข้อมูลที่เราจัดเก็บ</h3>
                                    <ul className="space-y-3">
                                        <li className="flex gap-3"><span className="w-1.5 h-1.5 rounded-full bg-sky-300 mt-2 shrink-0"></span> ชื่อ-นามสกุล, วันเกิด, เลขบัตรประชาชน หรือหนังสือเดินทาง</li>
                                        <li className="flex gap-3"><span className="w-1.5 h-1.5 rounded-full bg-sky-300 mt-2 shrink-0"></span> ที่อยู่, เบอร์โทรศัพท์, LINE ID</li>
                                        <li className="flex gap-3"><span className="w-1.5 h-1.5 rounded-full bg-sky-300 mt-2 shrink-0"></span> ประวัติสุขภาพ, อาการ, ข้อมูลแพ้ยา, ผลการวินิจฉัยและการรักษา</li>
                                    </ul>
                                </section>

                                <div className="p-5 bg-slate-50 rounded-2xl border-none text-slate-500 text-sm leading-relaxed">
                                    <strong className="text-slate-700 block mb-1">ความสำคัญ:</strong> ข้อมูลดังกล่าวเป็นพื้นฐานจำเป็นในการประเมินและวางแผนการรักษา หากท่านไม่ให้ข้อมูลที่จำเป็น คลินิกอาจไม่สามารถให้บริการทางการแพทย์ได้อย่างครบถ้วนและปลอดภัยสูงสุด
                                </div>
                                <p className="text-slate-400 text-xs text-center py-4 italic">...ขอบคุณที่ร่วมเป็นส่วนหนึ่งของการพัฒนาบริการของเรา...</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <label 
                                className={`flex items-center gap-4 p-6 rounded-3xl transition-all duration-300 select-none cursor-pointer ${
                                    page1Agreed 
                                        ? 'bg-sky-50 ring-2 ring-sky-500/20' 
                                        : 'bg-slate-50 hover:bg-slate-100'
                                }`}
                            >
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300 ${page1Agreed ? 'bg-sky-500 text-white shadow-md' : 'bg-white border-2 border-slate-200'}`}>
                                    {page1Agreed && <CheckSquare size={16} />}
                                    <input 
                                        type="checkbox" 
                                        className="hidden" 
                                        checked={page1Agreed} 
                                        onChange={(e) => setPage1Agreed(e.target.checked)} 
                                    />
                                </div>
                                <span className={`font-bold kanit-text text-lg ${page1Agreed ? 'text-sky-700' : 'text-slate-600'}`}>รับทราบและยินยอมเงื่อนไข</span>
                            </label>

                            <button 
                                onClick={() => setStep(2)} 
                                disabled={!page1Agreed}
                                className={`w-full py-5 rounded-3xl font-bold text-xl transition-all duration-500 ${
                                    page1Agreed 
                                        ? 'bg-sky-500 text-white shadow-xl shadow-sky-500/25 hover:bg-sky-600 hover:scale-[1.02] active:scale-95' 
                                        : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                }`}
                            >
                                ดำเนินการต่อ
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && patient && (
                    <div className="w-full animate-in fade-in slide-in-from-right-8 duration-700">
                        <button onClick={() => setStep(1)} className="group text-slate-400 hover:text-sky-500 mb-8 flex items-center gap-1.5 text-sm font-bold transition-colors">
                            <ChevronLeft className="group-hover:-translate-x-1 transition-transform" size={18} /> ย้อนกลับ
                        </button>

                        <header className="mb-8 text-left w-full">
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 kanit-text mb-3 leading-tight">ยืนยันตัวตนและข้อตกลง<br/>ทางอิเล็กทรอนิกส์</h1>
                            <p className="text-slate-400 text-sm leading-relaxed">การให้ความยินยอมผ่านระบบนี้ มีผลทางกฎหมายสมบูรณ์เทียบเท่าการลงนามในเอกสาร</p>
                        </header>

                        <div className="bg-slate-50/50 p-6 sm:p-8 rounded-[2.5rem] mb-10 space-y-4">
                            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                                <div><span className="text-slate-400 block mb-1">ชื่อ-นามสกุล</span> <strong className="text-slate-700 text-base">{patient.prefix || ''}{patient.firstName || ''} {patient.lastName || ''}</strong></div>
                                <div><span className="text-slate-400 block mb-1">วันเกิด</span> <strong className="text-slate-700 text-base">{patient.dob ? formatDate(patient.dob) : '-'}</strong></div>
                                <div><span className="text-slate-400 block mb-1">เลขบัตรประชาชน</span> <strong className="text-slate-700 text-base font-data tracking-wider">{patient.idCard || '-'}</strong></div>
                                <div><span className="text-slate-400 block mb-1">เบอร์โทรศัพท์</span> <strong className="text-slate-700 text-base font-data">{patient.phone || patient.phone1 || '-'}</strong></div>
                            </div>
                        </div>

                        <div className="space-y-6 mb-12">
                            <h3 className="font-bold text-slate-800 kanit-text text-xl flex items-center gap-2">
                                ความยินยอมเพิ่มเติม <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-1 rounded-full">ทางเลือก</span>
                            </h3>

                            {/* Marketing Consent */}
                            <div className="space-y-4">
                                <p className="text-sm text-slate-500 leading-relaxed">1. ให้คลินิกติดต่อเพื่อแจ้งสิทธิประโยชน์ โปรโมชั่น หรือข่าวสารทางการตลาด</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <button 
                                        onClick={() => setMarketingConsent('no')}
                                        className={`py-4 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-2 ${marketingConsent === 'no' ? 'bg-slate-800 text-white shadow-lg shadow-slate-800/20' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                    >
                                        <XCircle size={18} /> ไม่ยินยอม
                                    </button>
                                    <button 
                                        onClick={() => setMarketingConsent('yes')}
                                        className={`py-4 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-2 ${marketingConsent === 'yes' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                    >
                                        <CheckCircle2 size={18} /> ยินยอม
                                    </button>
                                </div>
                            </div>

                            {/* Review Consent */}
                            <div className="space-y-4">
                                <p className="text-sm text-slate-500 leading-relaxed">2. ให้นำข้อมูลหรือภาพถ่าย (โดยปกปิดตัวตน) ไปใช้เพื่อการศึกษาหรือรีวิวการรักษา</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <button 
                                        onClick={() => setReviewConsent('no')}
                                        className={`py-4 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-2 ${reviewConsent === 'no' ? 'bg-slate-800 text-white shadow-lg shadow-slate-800/20' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                    >
                                        <XCircle size={18} /> ไม่ยินยอม
                                    </button>
                                    <button 
                                        onClick={() => setReviewConsent('yes')}
                                        className={`py-4 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-2 ${reviewConsent === 'yes' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                    >
                                        <CheckCircle2 size={18} /> ยินยอม
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => setStep(3)} 
                            disabled={marketingConsent === null || reviewConsent === null}
                            className={`w-full py-5 rounded-3xl font-bold text-xl transition-all duration-500 ${
                                marketingConsent !== null && reviewConsent !== null
                                    ? 'bg-sky-500 text-white shadow-xl shadow-sky-500/25 hover:bg-sky-600 hover:scale-[1.02] active:scale-95' 
                                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                            }`}
                        >
                            ดำเนินการต่อ
                        </button>
                    </div>
                )}

                {step === 3 && patient && (
                    <div className="w-full animate-in fade-in slide-in-from-right-8 duration-700">
                        <button onClick={() => setStep(2)} className="group text-slate-400 hover:text-sky-500 mb-8 flex items-center gap-1.5 text-sm font-bold transition-colors">
                            <ChevronLeft className="group-hover:-translate-x-1 transition-transform" size={18} /> ย้อนกลับ
                        </button>

                        <header className="mb-6 text-left w-full">
                            <div className="flex justify-center w-full mb-6">
                                <div className="inline-flex items-center justify-center w-14 h-14 bg-sky-50 text-sky-500 rounded-2xl shadow-sm"><HeartPulse size={28} /></div>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 kanit-text leading-tight font-sans">ใบยินยอมรับการรักษาพยาบาล<br/>(Informed Consent)</h1>
                            <p className="text-slate-400 text-sm mt-2 leading-relaxed">กรุณาอ่านข้อมูลการรักษา ผลข้างเคียง และลงลายมือชื่อเพื่อยืนยันการรับการรักษาพยาบาล</p>
                        </header>

                        {/* Patient info details */}
                        <div className="bg-slate-50/50 p-4 rounded-2xl mb-6 flex flex-wrap gap-4 text-xs justify-between">
                            <div><span className="text-slate-400">ชื่อผู้รับบริการ:</span> <strong className="text-slate-700 ml-1">{patient.prefix || ''}{patient.firstName || ''} {patient.lastName || ''}</strong></div>
                            <div><span className="text-slate-400">เลขประจำตัวผู้ป่วย (HN):</span> <strong className="text-slate-700 ml-1 font-data">{patient.hn || patient.id || '-'}</strong></div>
                            <div><span className="text-slate-400">วันที่ทำรายการ:</span> <strong className="text-slate-700 ml-1">{new Date().toLocaleDateString('th-TH')} {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</strong></div>
                        </div>

                        {/* Full Read Area for Clinical details */}
                        <div className="relative group mb-6">
                            <div className="text-slate-600 space-y-5 mb-5 leading-relaxed">
                                <h3 className="font-bold text-slate-800 text-xl sm:text-2xl border-b border-slate-200 pb-2.5 mb-6 kanit-text">ข้อมูลเบื้องต้นที่ผู้รับบริการควรทราบก่อนเข้ารับการรักษา</h3>
                                
                                <div>
                                    <h4 className="font-bold text-slate-800">การฝังเข็มคืออะไร?</h4>
                                    <p className="text-slate-500">การฝังเข็มเป็นศาสตร์การรักษาแขนงหนึ่งของการแพทย์แผนจีน โดยใช้เข็มขนาดเล็กที่ผ่านการฆ่าเชื้อแล้ว ฝังลงบนตำแหน่งเฉพาะของร่างกาย (จุดฝังเข็ม) เพื่อปรับสมดุลของพลังงาน (ลมปราณ หรือ ชี่) ในร่างกาย ซึ่งจะช่วยบำบัดและรักษาโรคหรืออาการต่าง ๆ</p>
                                </div>

                                <div>
                                    <h4 className="font-bold text-slate-800">การฝังเข็มปลอดภัยหรือไม่?</h4>
                                    <p className="text-slate-500">โดยทั่วไปแล้วการฝังเข็มมีความปลอดภัยสูง อันตรายร้ายแรงที่อาจเกิดขึ้นพบได้น้อยมาก (น้อยกว่า 1 ต่อ 10,000 การรักษา) และมีงานวิจัยที่บ่งชี้ว่าการฝังเข็มมีความปลอดภัยมากกว่าการใช้ยาแก้อักเสบบางชนิด</p>
                                </div>

                                <div>
                                    <h4 className="font-bold text-slate-800">การฝังเข็มมีผลข้างเคียงหรือไม่?</h4>
                                    <p className="text-slate-500 mb-2">ผู้รับบริการอาจพบผลข้างเคียงดังต่อไปนี้ได้</p>
                                    
                                    <ul className="space-y-3 pl-2">
                                        <li>
                                            <strong className="text-slate-700 block">1. อาการเป็นลม เวียนศีรษะ หน้ามืด (เมาเข็ม)</strong>
                                            <span className="text-slate-500 block">ซึ่งจะเกิดขึ้นในขณะฝังเข็มหรือขณะที่คาเข็ม อาการเป็นลม เวียนศีรษะ หน้ามืด (เมาเข็ม) สามารถเกิดขึ้นได้ โดยเฉพาะการฝังเข็มช่วงแรก ซึ่งส่วนใหญ่จะพบในผู้ป่วยที่มีภาวะตื่นตระหนก หวาดกลัวมาก ตื่นเต้นมาก หิวหรืออิ่มมากเกินไป สภาพร่างกายอ่อนแอ เป็นต้น</span>
                                            <span className="text-slate-500 font-bold block mt-1">** ถ้ามีอาการเกิดขึ้น ควรหลีกเลี่ยงการขับขี่ยานพาหนะ</span>
                                        </li>
                                        <li>
                                            <strong className="text-slate-700 block">2. ก้อนเลือดจ้ำเลือด</strong>
                                            <span className="text-slate-500 block">เลือดซึมออกเล็กน้อยตามรูเข็มหลังการถอนเข็ม ซึ่งพบได้บ่อย ส่วนใหญ่เลือดจะหยุดเองหรือโดยการกดไว้ชั่วครู่ ไม่มีผลข้างเคียงใด ๆ หรืออาจจะมีอาการบวมชั่วคราวตรงบริเวณที่มีเลือดออก</span>
                                            <span className="text-slate-500 block mt-1">เลือดออกเล็กน้อยใต้ผิวหนังเกิดเป็นรอยช้ำ พบได้ในตำแหน่งที่มีเส้นเลือดฝอยมาก มักไม่มีอันตรายหรือผลข้างเคียงใด ๆ รอยช้ำจะจางหายไปเองภายในระยะเวลาไม่กี่วัน หากผู้ป่วยมีภาวะเลือดออกง่าย ก็จะง่ายต่อการมีรอยจ้ำเลือดตามบริเวณที่ฝังเข็ม</span>
                                        </li>
                                        <li>
                                            <strong className="text-slate-700 block">3. ภาวะลมรั่วในช่องเยื่อหุ้มปอด (Pneumothorax)</strong>
                                            <span className="text-slate-500 block">ลมรั่วจากปอด พบได้น้อยมากจากการฝังเข็ม แล้วเกิดการติดเชื้อหรือปอดทะลุ</span>
                                        </li>
                                        <li>
                                            <strong className="text-slate-700 block">4. การครอบกระปุกหรือครอบแก้ว (Cupping)</strong>
                                            <span className="text-slate-500 block">หลังทำการครอบแก้วจะเกิดรอยจ้ำเป็นปกติ และจะจางหายไปเองใน 3-7 วัน ในบางกรณีอาจเกิดตุ่มน้ำพองได้ หากเป็นตุ่มขนาดเล็กจะยุบหายไปเอง แต่หากเป็นตุ่มขนาดใหญ่ แพทย์อาจจำเป็นต้องเจาะระบายของเหลวออกและทำความสะอาดแผลเพื่อป้องกันการติดเชื้อ</span>
                                        </li>
                                        <li>
                                            <strong className="text-slate-700 block">5. การรมยาหรือโกฐุฬาลำพา (Moxibustion)</strong>
                                            <span className="text-slate-500 block">หลังจากการรมยาจะมีรอยแดงเกิดขึ้นบ้างตรงจุดที่รมยา ไปถึงการไหม้ของผิวหนังจากความร้อนจนเกิดถุงน้ำเกิดขึ้น เป็นต้น</span>
                                        </li>
                                        <li>
                                            <strong className="text-slate-700 block">6. อาการแพ้</strong>
                                            <span className="text-slate-500 block">อาจเกิดผื่นแพ้ได้ในผู้รับบริการที่มีประวัติแพ้โลหะ</span>
                                        </li>
                                    </ul>
                                    <p className="text-slate-500 mt-2">อาการดังกล่าวข้างต้นทั้งหมดนี้ สามารถหายได้หลังการรักษา (น้อยกว่าร้อยละ 3 ของผู้ป่วย) ถ้าผู้รับบริการมีอาการแย่ลงควรแจ้งต่อแพทย์แผนจีนผู้ทำการรักษาในทันที</p>
                                    <p className="text-slate-500 mt-1">นอกจากนี้ ถ้ามีความเสี่ยงอื่นในกรณีผู้ป่วยแต่ละคน แพทย์แผนจีนจะแจ้งกับผู้ป่วยในแต่ละราย</p>
                                </div>

                                <div>
                                    <h4 className="font-bold text-slate-800">ระยะเวลาในการรักษา</h4>
                                    <p className="text-slate-500">โดยทั่วไป การรักษา 1 ชุด (1 Course) จะประกอบด้วยการรักษาประมาณ 10 ครั้ง อย่างไรก็ตาม ระยะเวลาและความถี่ในการรักษาจะแตกต่างกันไปในแต่ละบุคคล ขึ้นอยู่กับชนิดของโรค ความรุนแรง และระยะเวลาของการเจ็บป่วย ซึ่งแพทย์จะเป็นผู้ประเมินและวางแผนการรักษาที่เหมาะสมให้เป็นรายบุคคล</p>
                                </div>

                                <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl text-sky-800 font-bold text-center">
                                    "เข็มที่ใช้ในการรักษาเป็นเข็มปลอดเชื้อ และเป็นชนิดใช้ครั้งเดียวแล้วทิ้งเท่านั้น"
                                </div>

                                <div>
                                    <h4 className="font-bold text-slate-800">ข้อควรปฏิบัติก่อนมารับการรักษา</h4>
                                    <p className="text-slate-500">ไม่ควรปล่อยให้ท้องว่าง หิวจัด หรือรับประทานอาหารอิ่มจัดจนเกินไปก่อนเข้ารับการรักษา เพื่อลดความเสี่ยงในการเกิดภาวะเมาเข็ม</p>
                                </div>
                            </div>
                        </div>

                        {/* หนังสือให้ความยินยอม */}
                        <div className="mb-6 space-y-5 text-slate-600">
                            <h3 className="font-bold text-slate-800 text-xl sm:text-2xl border-b border-slate-200 pb-2.5 mb-6 kanit-text">หนังสือให้ความยินยอม</h3>
                            <p className="leading-relaxed">ข้าพเจ้าได้รับทราบข้อมูลเกี่ยวกับวิธีการรักษา ความเสี่ยง และผลข้างเคียงอันไม่พึงประสงค์ที่อาจเกิดขึ้นได้จากการรักษาด้วยศาสตร์การแพทย์แผนจีน (การฝังเข็ม, การครอบแก้ว, การรมยา และยาสมุนไพรจีน) จากแพทย์แผนจีนของอันผิงคลินิก โดยละเอียดแล้ว</p>
                            
                            {/* Signer Selection UI */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-3">
                                <span className="font-bold text-slate-700 block mb-1">ข้าพเจ้าลงนามในฐานะ:</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${signerType === 'patient' ? 'border-sky-500 bg-sky-50/30' : 'border-slate-200 hover:bg-slate-50'}`}>
                                        <input 
                                            type="radio" 
                                            name="signerType" 
                                            value="patient" 
                                            checked={signerType === 'patient'} 
                                            onChange={() => setSignerType('patient')}
                                            className="accent-sky-500 w-4 h-4"
                                        />
                                        <div>
                                            <span className="font-bold text-slate-700 block">ผู้ป่วย</span>
                                            <span className="text-xs text-slate-400">{patient.prefix || ''}{patient.firstName || ''} {patient.lastName || ''}</span>
                                        </div>
                                    </label>
                                    <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${signerType === 'representative' ? 'border-sky-500 bg-sky-50/30' : 'border-slate-200 hover:bg-slate-50'}`}>
                                        <input 
                                            type="radio" 
                                            name="signerType" 
                                            value="representative" 
                                            checked={signerType === 'representative'} 
                                            onChange={() => setSignerType('representative')}
                                            className="accent-sky-500 w-4 h-4"
                                        />
                                        <div>
                                            <span className="font-bold text-slate-700 block">ผู้แทนโดยชอบธรรม</span>
                                            <span className="text-xs text-slate-400">ระบุผู้มีอำนาจลงนามแทน</span>
                                        </div>
                                    </label>
                                </div>

                                {signerType === 'representative' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 animate-in fade-in duration-300">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">ชื่อผู้แทนโดยชอบธรรม</label>
                                            <input 
                                                type="text" 
                                                value={representativeName} 
                                                onChange={(e) => setRepresentativeName(e.target.value)}
                                                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-sky-500 text-sm font-medium"
                                                placeholder="ระบุชื่อ-นามสกุล ของท่าน"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">ความเกี่ยวข้องเป็น</label>
                                            <input 
                                                type="text" 
                                                value={relationship} 
                                                onChange={(e) => setRelationship(e.target.value)}
                                                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-sky-500 text-sm font-medium"
                                                placeholder="เช่น บิดา, มารดา, บุตร"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <p className="leading-relaxed">ข้าพเจ้าขอรับรองว่าได้ยินยอมเข้ารับการตรวจและรักษาพยาบาลจากอันผิงคลินิกด้วยความสมัครใจ ปราศจากการบังคับ ข่มขู่ หรือชักจูงใดๆ และยินยอมรับความเสี่ยงในการเกิดอาการเมาเข็มและผลข้างเคียงต่างๆ และข้าพเจ้าเข้าใจดีว่าไม่มีการรับประกันผลการรักษาพยาบาลว่าจะหายขาด 100% เนื่องจากผลการรักษาขึ้นอยู่กับสภาพร่างกายและการดูแลตนเองของแต่ละบุคคลด้วย</p>
                            <p className="leading-relaxed">ข้าพเจ้ายินยอมรับผลที่อาจเกิดขึ้นจากเหตุสุดวิสัย โดยจะไม่เรียกร้องหรือฟ้องร้องต่อแพทย์และบุคลากรของคลินิก หากได้ปฏิบัติหน้าที่โดยรอบคอบตามมาตรฐานวิชาชีพการแพทย์แผนจีนแล้ว</p>
                            <p className="leading-relaxed">ข้าพเจ้าเข้าใจดีว่าข้อมูลการรักษาของข้าพเจ้าจะถูกเก็บไว้เป็นความลับ และข้าพเจ้ามีสิทธิ์ที่จะปฏิเสธการรักษา หรือขอความเห็นจากแพทย์ท่านอื่นได้ทุกเวลา</p>
                            <strong className="text-slate-800 block mt-2">จึงลงลายมือชื่อไว้เป็นหลักฐาน</strong>
                        </div>

                        {/* Checkboxes for consent validation */}
                        <div className="space-y-4 mb-6">
                            <label 
                                className={`flex items-start gap-3 p-4 rounded-2xl transition-all duration-300 select-none cursor-pointer ${
                                    riskAgreed 
                                        ? 'bg-sky-50 ring-2 ring-sky-500/10' 
                                        : 'bg-slate-50 hover:bg-slate-100/80'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded flex items-center justify-center mt-0.5 shrink-0 transition-all duration-300 ${riskAgreed ? 'bg-sky-500 text-white shadow-sm' : 'bg-white border-2 border-slate-200'}`}>
                                    {riskAgreed && <CheckSquare size={14} />}
                                    <input 
                                        type="checkbox" 
                                        className="hidden" 
                                        checked={riskAgreed} 
                                        onChange={(e) => setRiskAgreed(e.target.checked)} 
                                    />
                                </div>
                                <span className={`text-sm font-semibold leading-relaxed ${riskAgreed ? 'text-sky-800' : 'text-slate-600'}`}>
                                    ข้าพเจ้าได้รับทราบและเข้าใจความเสี่ยงจากการรักษาด้วยการฝังเข็ม ครอบแก้ว รมยาแล้ว และหัตถการทั้งหมดแล้ว
                                </span>
                            </label>

                            <label 
                                className={`flex items-start gap-3 p-4 rounded-2xl transition-all duration-300 select-none cursor-pointer ${
                                    voluntaryAgreed 
                                        ? 'bg-sky-50 ring-2 ring-sky-500/10' 
                                        : 'bg-slate-50 hover:bg-slate-100/80'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded flex items-center justify-center mt-0.5 shrink-0 transition-all duration-300 ${voluntaryAgreed ? 'bg-sky-500 text-white shadow-sm' : 'bg-white border-2 border-slate-200'}`}>
                                    {voluntaryAgreed && <CheckSquare size={14} />}
                                    <input 
                                        type="checkbox" 
                                        className="hidden" 
                                        checked={voluntaryAgreed} 
                                        onChange={(e) => setVoluntaryAgreed(e.target.checked)} 
                                    />
                                </div>
                                <span className={`text-sm font-semibold leading-relaxed ${voluntaryAgreed ? 'text-sky-800' : 'text-slate-600'}`}>
                                    ข้าพเจ้าตกลงยินยอมรับการรักษาด้วยความสมัครใจ
                                </span>
                            </label>
                        </div>

                        {/* Signature Canvas Area */}
                        <div className="space-y-2 mb-8">
                            <div className="flex justify-between items-center px-1">
                                <label className="block text-sm font-bold text-slate-700 kanit-text flex items-center gap-1.5 select-none">
                                    <Pencil size={16} className="text-sky-500" /> ลงลายมือชื่ออิเล็กทรอนิกส์
                                </label>
                                {!isEmpty && (
                                    <button 
                                        type="button" 
                                        onClick={clearCanvas}
                                        className="text-xs text-rose-500 hover:text-rose-600 font-bold transition-colors flex items-center gap-1 bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-100"
                                    >
                                        ล้างลายเซ็น
                                    </button>
                                )}
                            </div>

                            <div className="relative border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 overflow-hidden transition-all duration-300">
                                <canvas
                                    ref={canvasRef}
                                    width={600}
                                    height={300}
                                    className={`w-full h-64 sm:h-72 block cursor-crosshair touch-none ${(!riskAgreed || !voluntaryAgreed) ? 'pointer-events-none opacity-30' : ''}`}
                                />
                                {/* Overlay if locked */}
                                {(!riskAgreed || !voluntaryAgreed) && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-100/60 backdrop-blur-[1px] text-slate-500 font-bold kanit-text text-sm p-4 text-center select-none leading-relaxed">
                                        กรุณาเลือกยอมรับความยินยอมการรักษาทั้ง 2 ข้อด้านบน เพื่อเปิดการลงลายมือชื่อ
                                    </div>
                                )}
                                {/* Background pen watermark */}
                                {riskAgreed && voluntaryAgreed && isEmpty && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 pointer-events-none select-none">
                                        <Pencil size={24} className="mb-1 opacity-50" />
                                        <span className="text-xs kanit-text font-medium opacity-50">ใช้นิ้วหรือปากกาวาดลายเซ็นที่นี่</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button 
                            type="button"
                            onClick={handleSubmit} 
                            disabled={
                                !riskAgreed || 
                                !voluntaryAgreed || 
                                isEmpty || 
                                (signerType === 'representative' && (!representativeName.trim() || !relationship.trim()))
                            }
                            className={`w-full py-5 rounded-3xl font-bold text-xl transition-all duration-500 ${
                                riskAgreed && 
                                voluntaryAgreed && 
                                !isEmpty && 
                                (signerType === 'patient' || (representativeName.trim() && relationship.trim()))
                                    ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/25 hover:bg-emerald-600 hover:scale-[1.02] active:scale-95' 
                                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                            }`}
                        >
                            ยืนยันและตกลงยอมรับการรักษา
                        </button>
                    </div>
                )}
            </main>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes loading {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
            `}} />
        </div>
    );
};

export default PdpaConsentForm;


import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import CalendarDay from './CalendarDay';
import { colorPresets } from '../global/constants';
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

const SettingsManager = ({
  staffPrefixes = [],
  setStaffPrefixes,
  rolePermissions = {},
  setRolePermissions,
  roleLabels = {},
  setRoleLabels,
  staffCategories = [],
  setStaffCategories,
  appointmentStatuses = [],
  setAppointmentStatuses,
  integrationTokens = {},
  setIntegrationTokens,
  callAppScript,
  showToast,
  isGlobalLoading
}) => {
  const [activeSubTab, setActiveSubTab] = useState('prefixes'); // 'prefixes' | 'permissions' | 'categories' | 'statuses' | 'integrations' | 'logs'
  const [newPrefix, setNewPrefix] = useState('');
  const [logsData, setLogsData] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    if (activeSubTab === 'logs') {
      let isMounted = true;
      const fetchLogs = async () => {
        setIsLoadingLogs(true);
        try {
          const res = await callAppScript('GET_DATA', 'Logs');
          if (isMounted && res.status === 'success') {
            const sortedLogs = (res.data || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setLogsData(sortedLogs);
          }
        } catch (e) {
          if (isMounted) showToast('ไม่สามารถดึงข้อมูลประวัติการใช้งานได้', 'error');
        } finally {
          if (isMounted) setIsLoadingLogs(false);
        }
      };
      fetchLogs();
      return () => { isMounted = false; };
    }
  }, [activeSubTab]);
  const [newStaffCat, setNewStaffCat] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Local copies for editing
  const [localPrefixes, setLocalPrefixes] = useState([]);
  const [localPermissions, setLocalPermissions] = useState({});
  const [localRoleLabels, setLocalRoleLabels] = useState({});
  const [localStaffCats, setLocalStaffCats] = useState([]);

  // Local copies for new settings subtabs
  const [newApptStatus, setNewApptStatus] = useState('');
  const [selectedColor, setSelectedColor] = useState('sky');
  const [localApptStatuses, setLocalApptStatuses] = useState([]);
  const [localIntegrationTokens, setLocalIntegrationTokens] = useState({ line: '', telegram: '', discord: '' });

  // Sync with props
  useEffect(() => {
    if (staffPrefixes) setLocalPrefixes([...staffPrefixes]);
  }, [staffPrefixes]);

  useEffect(() => {
    if (rolePermissions) setLocalPermissions({ ...rolePermissions });
  }, [rolePermissions]);

  useEffect(() => {
    if (roleLabels) setLocalRoleLabels({ ...roleLabels });
  }, [roleLabels]);

  useEffect(() => {
    if (staffCategories) setLocalStaffCats([...staffCategories]);
  }, [staffCategories]);

  useEffect(() => {
    if (appointmentStatuses) setLocalApptStatuses([...appointmentStatuses]);
  }, [appointmentStatuses]);

  useEffect(() => {
    if (integrationTokens) setLocalIntegrationTokens({ ...integrationTokens });
  }, [integrationTokens]);

  const addPrefix = () => {
    const trimmed = newPrefix.trim();
    if (!trimmed) return;
    if (localPrefixes.includes(trimmed)) {
      showToast('คำนำหน้านี้มีอยู่แล้ว', 'warning');
      return;
    }
    setLocalPrefixes([...localPrefixes, trimmed]);
    setNewPrefix('');
  };

  const removePrefix = (p) => {
    setLocalPrefixes(localPrefixes.filter(item => item !== p));
  };

  const addStaffCat = () => {
    const trimmed = newStaffCat.trim();
    if (!trimmed) return;
    if (localStaffCats.includes(trimmed)) {
      showToast('บทบาทพนักงานนี้มีอยู่แล้ว', 'warning');
      return;
    }
    setLocalStaffCats([...localStaffCats, trimmed]);
    setNewStaffCat('');
  };

  const removeStaffCat = (c) => {
    if (['แพทย์', 'สต๊าฟ/พนักงาน'].includes(c)) {
      showToast('ไม่สามารถลบบทบาทเริ่มต้นได้', 'warning');
      return;
    }
    setLocalStaffCats(localStaffCats.filter(item => item !== c));
  };

  const handleAddRole = () => {
    const name = newRoleName.trim();
    if (!name) return;
    
    // Check for duplicates
    if (Object.values(localRoleLabels).some(label => label.toLowerCase() === name.toLowerCase())) {
      showToast('บทบาทสิทธิ์นี้มีอยู่แล้ว', 'warning');
      return;
    }

    // Generate slug
    const slug = 'custom_' + Date.now().toString().slice(-6);
    
    setLocalRoleLabels(prev => ({ ...prev, [slug]: name }));
    setLocalPermissions(prev => ({ ...prev, [slug]: ['dashboard'] })); // default permission
    setNewRoleName('');
    showToast(`เพิ่มบทบาท "${name}" สำเร็จ กรุณากำหนดสิทธิ์ใช้งานและกดบันทึกสิทธิ์เข้าระบบ`, 'success');
  };

  const handleRemoveRole = (roleKey) => {
    if (['admin', 'doctor', 'nurse', 'sale'].includes(roleKey)) {
      showToast('ไม่สามารถลบบทบาทเริ่มต้นได้', 'warning');
      return;
    }

    const updatedLabels = { ...localRoleLabels };
    delete updatedLabels[roleKey];
    setLocalRoleLabels(updatedLabels);

    const updatedPermissions = { ...localPermissions };
    delete updatedPermissions[roleKey];
    setLocalPermissions(updatedPermissions);

    showToast('ลบบทบาทสำเร็จ กรุณากดบันทึกสิทธิ์เข้าระบบเพื่อยืนยัน', 'warning');
  };

  const handlePermissionChange = (role, tabId, checked) => {
    setLocalPermissions(prev => {
      const allowed = prev[role] || [];
      const updated = checked 
        ? [...allowed, tabId]
        : allowed.filter(id => id !== tabId);
      return { ...prev, [role]: updated };
    });
  };

  const savePrefixes = async () => {
    setIsSaving(true);
    try {
      await callAppScript('SAVE_DATA', 'Settings', { id: 'staff_prefixes', values: localPrefixes });
      setStaffPrefixes(localPrefixes);
      showToast('บันทึกรายการคำนำหน้าชื่อพนักงานสำเร็จ', 'success');
    } catch (e) {
      showToast(`บันทึกไม่สำเร็จ: ${e.message}`, 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const savePermissions = async () => {
    setIsSaving(true);
    try {
      await callAppScript('SAVE_DATA', 'Settings', { 
        id: 'role_permissions', 
        values: localPermissions,
        labels: localRoleLabels
      });
      setRolePermissions(localPermissions);
      setRoleLabels(localRoleLabels);
      showToast('บันทึกสิทธิ์เข้าระบบสำเร็จ', 'success');
    } catch (e) {
      showToast(`บันทึกไม่สำเร็จ: ${e.message}`, 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const saveCategories = async () => {
    setIsSaving(true);
    try {
      await callAppScript('SAVE_DATA', 'Settings', { id: 'staff_categories', values: localStaffCats });
      setStaffCategories(localStaffCats);
      showToast('บันทึกตัวเลือกบทบาทสำเร็จ', 'success');
    } catch (e) {
      showToast(`บันทึกไม่สำเร็จ: ${e.message}`, 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const addApptStatus = () => {
    const trimmed = newApptStatus.trim();
    if (!trimmed) return;
    const exists = localApptStatuses.some(s => {
      const label = typeof s === 'string' ? s : s.label;
      return label.toLowerCase() === trimmed.toLowerCase();
    });
    if (exists) {
      showToast('สถานะนี้มีอยู่แล้ว', 'warning');
      return;
    }
    setLocalApptStatuses([...localApptStatuses, { label: trimmed, color: selectedColor }]);
    setNewApptStatus('');
  };

  const removeApptStatus = (index) => {
    const status = localApptStatuses[index];
    const label = typeof status === 'string' ? status : status.label;
    if (['รอยืนยัน', 'ยืนยันแล้ว', 'ยกเลิก'].includes(label)) {
      showToast('ไม่สามารถลบสถานะเริ่มต้นได้', 'warning');
      return;
    }
    setLocalApptStatuses(localApptStatuses.filter((_, i) => i !== index));
  };

  const moveStatusUp = (index) => {
    if (index === 0) return;
    const updated = [...localApptStatuses];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setLocalApptStatuses(updated);
  };

  const moveStatusDown = (index) => {
    if (index === localApptStatuses.length - 1) return;
    const updated = [...localApptStatuses];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setLocalApptStatuses(updated);
  };

  const updateStatusColor = (index, colorKey) => {
    const updated = [...localApptStatuses];
    const current = updated[index];
    if (typeof current === 'string') {
      updated[index] = { label: current, color: colorKey };
    } else {
      updated[index] = { ...current, color: colorKey };
    }
    setLocalApptStatuses(updated);
  };

  const saveApptStatuses = async () => {
    setIsSaving(true);
    try {
      await callAppScript('SAVE_DATA', 'Settings', { id: 'appointment_statuses', values: localApptStatuses });
      setAppointmentStatuses(localApptStatuses);
      showToast('บันทึกสถานะนัดหมายสำเร็จ', 'success');
    } catch (e) {
      showToast(`บันทึกไม่สำเร็จ: ${e.message}`, 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const saveIntegrations = async () => {
    setIsSaving(true);
    try {
      await callAppScript('SAVE_DATA', 'Settings', { id: 'integration_tokens', values: localIntegrationTokens });
      setIntegrationTokens(localIntegrationTokens);
      showToast('บันทึกการเชื่อมต่อสำเร็จ', 'success');
    } catch (e) {
      showToast(`บันทึกไม่สำเร็จ: ${e.message}`, 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const tabList = [
    { id: 'dashboard', label: 'แดชบอร์ด' },
    { id: 'exec_dashboard', label: 'แดชบอร์ดผู้บริหาร' },
    { id: 'records', label: 'เวชระเบียน' },
    { id: 'queue', label: 'นัดหมาย' },
    { id: 'pos', label: 'POS' },
    { id: 'catalog', label: 'สินค้า/บริการ' },
    { id: 'inventory', label: 'คลังสินค้า' },
    { id: 'finance', label: 'การเงิน' },
    { id: 'staff', label: 'พนักงาน' },
    { id: 'branch', label: 'สาขา' },
    { id: 'reports', label: 'รายงาน' },
    { id: 'settings', label: 'ตั้งค่า' }
  ];

  return (
    <div className="w-full bg-slate-50 min-h-screen p-4 md:p-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 kanit-text tracking-tight flex items-center gap-3">
            <span className="p-2.5 bg-sky-500 text-white rounded-2xl shadow-lg shadow-sky-500/25">
              <Settings size={28} />
            </span>
            ตั้งค่าระบบคลินิก
          </h1>
          <p className="text-slate-500 mt-1.5 text-sm font-medium kanit-text">จัดการคำนำหน้าพนักงาน, สิทธิ์เข้าระบบ และบทบาทต่าง ๆ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar inside Settings */}
        <div className="lg:col-span-1 flex flex-col gap-2.5">
          <button
            onClick={() => setActiveSubTab('prefixes')}
            className={`w-full text-left px-5 py-4 rounded-2xl font-bold kanit-text text-sm transition-all flex items-center gap-3 shadow-sm ${
              activeSubTab === 'prefixes'
                ? 'bg-sky-500 text-white shadow-sky-500/20 scale-[1.01]'
                : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 border border-slate-100'
            }`}
          >
            <User size={18} />
            คำนำหน้าชื่อพนักงาน
          </button>
          <button
            onClick={() => setActiveSubTab('permissions')}
            className={`w-full text-left px-5 py-4 rounded-2xl font-bold kanit-text text-sm transition-all flex items-center gap-3 shadow-sm ${
              activeSubTab === 'permissions'
                ? 'bg-sky-500 text-white shadow-sky-500/20 scale-[1.01]'
                : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 border border-slate-100'
            }`}
          >
            <ShieldCheck size={18} />
            จัดการสิทธิ์เข้าระบบ
          </button>
          <button
            onClick={() => setActiveSubTab('categories')}
            className={`w-full text-left px-5 py-4 rounded-2xl font-bold kanit-text text-sm transition-all flex items-center gap-3 shadow-sm ${
              activeSubTab === 'categories'
                ? 'bg-sky-500 text-white shadow-sky-500/20 scale-[1.01]'
                : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 border border-slate-100'
            }`}
          >
            <Tag size={18} />
            ตัวเลือกหมวดหมู่
          </button>
          <button
            onClick={() => setActiveSubTab('statuses')}
            className={`w-full text-left px-5 py-4 rounded-2xl font-bold kanit-text text-sm transition-all flex items-center gap-3 shadow-sm ${
              activeSubTab === 'statuses'
                ? 'bg-sky-500 text-white shadow-sky-500/20 scale-[1.01]'
                : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 border border-slate-100'
            }`}
          >
            <Clock size={18} />
            สถานะนัดหมาย
          </button>
          <button
            onClick={() => setActiveSubTab('integrations')}
            className={`w-full text-left px-5 py-4 rounded-2xl font-bold kanit-text text-sm transition-all flex items-center gap-3 shadow-sm ${
              activeSubTab === 'integrations'
                ? 'bg-sky-500 text-white shadow-sky-500/20 scale-[1.01]'
                : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 border border-slate-100'
            }`}
          >
            <Link size={18} />
            การเชื่อมต่อแจ้งเตือน
          </button>
          <button
            onClick={() => setActiveSubTab('logs')}
            className={`w-full text-left px-5 py-4 rounded-2xl font-bold kanit-text text-sm transition-all flex items-center gap-3 shadow-sm ${
              activeSubTab === 'logs'
                ? 'bg-sky-500 text-white shadow-sky-500/20 scale-[1.01]'
                : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 border border-slate-100'
            }`}
          >
            <History size={18} />
            ประวัติการใช้งาน (Logs)
          </button>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <div className={`${theme.card} border-slate-100/80`}>
            {/* SUBTAB 1: PREFIXES */}
            {activeSubTab === 'prefixes' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 kanit-text">ตั้งค่าคำนำหน้าชื่อพนักงาน</h3>
                  <p className="text-slate-400 text-xs mt-1 kanit-text">เพิ่มหรือลบตัวเลือกคำนำหน้าชื่อ เช่น นาย, นาง, นางสาว, นพ., พญ.</p>
                </div>

                <div className="flex gap-3 max-w-md">
                  <input
                    type="text"
                    placeholder="เช่น ศ., ว่าที่ ร.ต."
                    className={theme.input}
                    value={newPrefix}
                    onChange={(e) => setNewPrefix(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addPrefix()}
                  />
                  <button
                    onClick={addPrefix}
                    className={`px-6 rounded-2xl font-bold kanit-text text-sm transition-all flex items-center gap-2 ${theme.primary} shrink-0`}
                  >
                    <Plus size={18} />
                    เพิ่ม
                  </button>
                </div>

                <div className="flex flex-wrap gap-2.5 py-4">
                  {localPrefixes.map((prefix) => (
                    <span
                      key={prefix}
                      className="px-4 py-2 bg-slate-50 text-slate-700 font-data font-semibold text-sm rounded-xl border border-slate-200/60 flex items-center gap-2 hover:bg-rose-50 hover:border-rose-100 hover:text-rose-600 transition-colors group cursor-pointer"
                      onClick={() => removePrefix(prefix)}
                      title="คลิกเพื่อลบ"
                    >
                      {prefix}
                      <X size={14} className="text-slate-400 group-hover:text-rose-500 transition-colors" />
                    </span>
                  ))}
                  {localPrefixes.length === 0 && (
                    <div className="text-slate-400 text-sm py-4 kanit-text italic">ไม่มีข้อมูลคำนำหน้าชื่อ</div>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-6 flex justify-end">
                  <button
                    onClick={savePrefixes}
                    disabled={isSaving}
                    className="px-8 py-3 bg-sky-500 text-white hover:bg-sky-600 rounded-2xl font-bold kanit-text text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving && <Loader2 size={16} className="animate-spin" />}
                    บันทึกรายการคำนำหน้าชื่อ
                  </button>
                </div>
              </div>
            )}

            {/* SUBTAB 2: PERMISSIONS */}
            {activeSubTab === 'permissions' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 kanit-text">จัดการสิทธิ์เข้าระบบ (Access Permissions)</h3>
                  <p className="text-slate-400 text-xs mt-1 kanit-text">กำหนดสิทธิ์ของแต่ละบทบาทว่าสามารถเข้าใช้งานหน้า/แท็บใดในระบบได้บ้าง และสามารถเพิ่ม/ลบบทบาทแบบกำหนดเองได้</p>
                </div>

                {/* Add Custom Role form */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col sm:flex-row gap-3 items-end max-w-xl mb-6">
                  <div className="flex-1 w-full text-left">
                    <label className="block text-xs font-bold text-slate-500 kanit-text uppercase mb-1.5 ml-1">ชื่อสิทธิ์ผู้ใช้ใหม่</label>
                    <input
                      type="text"
                      placeholder="เช่น พนักงานชั่วคราว, นักศึกษาฝึกงาน"
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 outline-none text-sm text-slate-700 font-medium"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddRole()}
                    />
                  </div>
                  <button
                    onClick={handleAddRole}
                    className="px-6 py-2.5 rounded-xl font-bold kanit-text text-sm transition-all flex items-center justify-center gap-2 bg-sky-500 text-white hover:bg-sky-600 shrink-0 shadow-sm"
                  >
                    <Plus size={16} />
                    เพิ่มสิทธิ์ใหม่
                  </button>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
                  <table className="table-auto w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-100"><th className="w-[50%] p-4 font-bold text-slate-600 kanit-text">ส่วนของระบบ / แท็บการใช้งาน</th><th key={roleKey} className="w-[50%] p-4 font-bold text-slate-600 kanit-text text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <span>{roleLabel}</span>
                                {!isDefaultRole && (
                                  <button
                                    onClick={() => handleRemoveRole(roleKey)}
                                    className="p-0.5 text-slate-400 hover:text-rose-600 rounded-full hover:bg-rose-50 transition-colors"
                                    title="ลบบทบาทนี้"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </div>
                            </th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tabList.map((tab) => (
                        <tr key={tab.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="p-4 font-bold text-slate-700 kanit-text">{tab.label} ({tab.id})</td>
                          {Object.keys(localRoleLabels).map((roleKey) => {
                            const isAllowed = (localPermissions[roleKey] || []).includes(tab.id);
                            // แอดมินล็อกสิทธิ์แท็บตั้งค่าไว้เสมอ เพื่อป้องกันการล็อกตัวเอง
                            const isLocked = roleKey === 'admin' && tab.id === 'settings';
                            return (
                              <td key={roleKey} className="p-4 text-center">
                                <label className="inline-flex items-center justify-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isAllowed}
                                    disabled={isLocked}
                                    onChange={(e) => handlePermissionChange(roleKey, tab.id, e.target.checked)}
                                    className="w-5 h-5 rounded border-slate-300 text-sky-500 focus:ring-sky-500/20 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                                  />
                                </label>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-slate-100 pt-6 flex justify-end">
                  <button
                    onClick={savePermissions}
                    disabled={isSaving}
                    className="px-8 py-3 bg-sky-500 text-white hover:bg-sky-600 rounded-2xl font-bold kanit-text text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving && <Loader2 size={16} className="animate-spin" />}
                    บันทึกสิทธิ์เข้าระบบ
                  </button>
                </div>
              </div>
            )}

            {/* SUBTAB 3: CATEGORIES */}
            {activeSubTab === 'categories' && (
              <div className="space-y-8">
                {/* Staff categories */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 kanit-text">บทบาทพนักงาน</h3>
                    <p className="text-slate-400 text-xs mt-1 kanit-text">จัดการบทบาทของพนักงานเพื่อใช้แยกหน้าที่ เช่น แพทย์, สต๊าฟ, พยาบาล (ค่าเริ่มต้น: แพทย์, สต๊าฟ/พนักงาน)</p>
                  </div>

                  <div className="flex gap-3 max-w-md">
                    <input
                      type="text"
                      placeholder="เช่น เภสัชกร, หมอนวดแผนไทย"
                      className={theme.input}
                      value={newStaffCat}
                      onChange={(e) => setNewStaffCat(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addStaffCat()}
                    />
                    <button
                      onClick={addStaffCat}
                      className={`px-6 rounded-2xl font-bold kanit-text text-sm transition-all flex items-center gap-2 ${theme.primary} shrink-0`}
                    >
                      <Plus size={18} />
                      เพิ่ม
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2.5 py-2">
                    {localStaffCats.map((cat) => {
                      const isDefault = ['แพทย์', 'สต๊าฟ/พนักงาน'].includes(cat);
                      return (
                        <span
                          key={cat}
                          className={`px-4 py-2 font-data font-semibold text-sm rounded-xl border flex items-center gap-2 transition-colors ${
                            isDefault 
                              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                              : 'bg-slate-50 text-slate-700 border-slate-200/60 hover:bg-rose-50 hover:border-rose-100 hover:text-rose-600 group cursor-pointer'
                          }`}
                          onClick={() => !isDefault && removeStaffCat(cat)}
                          title={isDefault ? 'บทบาทพื้นฐาน ลบไม่ได้' : 'คลิกเพื่อลบ'}
                        >
                          {cat}
                          {!isDefault && <X size={14} className="text-slate-400 group-hover:text-rose-500 transition-colors" />}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6 flex justify-end">
                  <button
                    onClick={saveCategories}
                    disabled={isSaving}
                    className="px-8 py-3 bg-sky-500 text-white hover:bg-sky-600 rounded-2xl font-bold kanit-text text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving && <Loader2 size={16} className="animate-spin" />}
                    บันทึกตัวเลือกหมวดหมู่
                  </button>
                </div>
              </div>
            )}

            {/* SUBTAB 4: APPOINTMENT STATUSES (สถานะนัดหมาย) */}
            {activeSubTab === 'statuses' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 kanit-text">ตั้งค่าสถานะนัดหมาย</h3>
                  <p className="text-slate-400 text-xs mt-1 kanit-text">เพิ่ม ลบ เลือกสี และจัดลำดับสถานะสำหรับการนัดหมายและคิว</p>
                </div>

                {/* Form to add a new status */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4 max-w-xl text-left">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 kanit-text">ชื่อสถานะใหม่</label>
                      <input
                        type="text"
                        placeholder="เช่น กำลังรักษา, เสร็จสิ้น"
                        className={theme.input}
                        value={newApptStatus}
                        onChange={(e) => setNewApptStatus(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addApptStatus()}
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={addApptStatus}
                        className={`px-6 h-[46px] rounded-xl font-bold kanit-text text-sm transition-all flex items-center gap-2 ${theme.primary} shrink-0`}
                      >
                        <Plus size={18} />
                        เพิ่มสถานะ
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 kanit-text">เลือกสีของสถานะนี้</label>
                    <div className="flex flex-wrap gap-2">
                      {colorPresets.map((preset) => {
                        const isSelected = selectedColor === preset.key;
                        return (
                          <button
                            key={preset.key}
                            onClick={() => setSelectedColor(preset.key)}
                            type="button"
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                              isSelected
                                ? 'bg-sky-500 text-white border-sky-600 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <span className={`w-3 h-3 rounded-full ${preset.bg}`} />
                            {preset.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* List of current statuses */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 kanit-text text-left">
                    รายการสถานะและการจัดเรียง (มีทั้งหมด {localApptStatuses.length} รายการ)
                  </label>
                  
                  <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm divide-y divide-slate-100 max-w-3xl">
                    {localApptStatuses.map((status, index) => {
                      const label = typeof status === 'string' ? status : status.label;
                      const colorKey = typeof status === 'string' ? 'sky' : (status.color || 'sky');
                      const isDefault = ['รอยืนยัน', 'ยืนยันแล้ว', 'ยกเลิก'].includes(label);
                      const currentPreset = colorPresets.find(p => p.key === colorKey) || colorPresets[3];

                      return (
                        <div key={label + '_' + index} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
                          {/* Reordering column */}
                          <div className="flex items-center gap-1.5 mr-4">
                            <button
                              onClick={() => moveStatusUp(index)}
                              disabled={index === 0}
                              className={`p-1.5 rounded-lg border border-slate-100 bg-white transition-all ${
                                index === 0 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                              }`}
                              title="เลื่อนขึ้น"
                            >
                              <ChevronUp size={16} />
                            </button>
                            <button
                              onClick={() => moveStatusDown(index)}
                              disabled={index === localApptStatuses.length - 1}
                              className={`p-1.5 rounded-lg border border-slate-100 bg-white transition-all ${
                                index === localApptStatuses.length - 1 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                              }`}
                              title="เลื่อนลง"
                            >
                              <ChevronDown size={16} />
                            </button>
                          </div>

                          {/* Info & Label */}
                          <div className="flex-1 min-w-0 text-left">
                            <span className="font-semibold text-sm text-slate-800 kanit-text block truncate">{label}</span>
                            <span className="text-[10px] text-slate-400 font-data">ลำดับที่ {index + 1}</span>
                          </div>

                          {/* Quick Color Picker */}
                          <div className="flex items-center gap-1.5 px-4">
                            {colorPresets.map((preset) => {
                              const isActive = colorKey === preset.key;
                              return (
                                <button
                                  key={preset.key}
                                  onClick={() => updateStatusColor(index, preset.key)}
                                  className={`w-5 h-5 rounded-full transition-all flex items-center justify-center ${preset.bg} ${
                                    isActive ? 'ring-2 ring-offset-2 ring-sky-500 scale-110' : 'opacity-60 hover:opacity-100 hover:scale-105'
                                  }`}
                                  title={`เปลี่ยนสีเป็น ${preset.name}`}
                                >
                                  {isActive && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                </button>
                              );
                            })}
                          </div>

                          {/* Preview Badge */}
                          <div className="w-32 flex justify-center px-2">
                            <span className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${currentPreset.class}`}>
                              {label}
                            </span>
                          </div>

                          {/* Delete Action */}
                          <div className="w-12 flex justify-end">
                            {isDefault ? (
                              <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 py-1 rounded-md border border-slate-100 kanit-text cursor-not-allowed">
                                ระบบ
                              </span>
                            ) : (
                              <button
                                onClick={() => removeApptStatus(index)}
                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                                title="ลบสถานะนี้"
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6 flex justify-end">
                  <button
                    onClick={saveApptStatuses}
                    disabled={isSaving}
                    className="px-8 py-3 bg-sky-500 text-white hover:bg-sky-600 rounded-2xl font-bold kanit-text text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving && <Loader2 size={16} className="animate-spin" />}
                    บันทึกสถานะนัดหมาย
                  </button>
                </div>
              </div>
            )}

            {/* SUBTAB 5: INTEGRATIONS (การเชื่อมต่อแจ้งเตือน) */}
            {activeSubTab === 'integrations' && (
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm animate-in slide-in-from-right-4 duration-300 text-left">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-800 kanit-text">ตั้งค่าการเชื่อมต่อ และ การแจ้งเตือน (Integrations)</h3>
                  <p className="text-sm text-slate-500 kanit-text mt-1">ใส่ Token เพื่อเชื่อมต่อระบบกับแอปพลิเคชันต่างๆ</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 kanit-text">Line Notify Token / Line Messaging API Token</label>
                    <input
                      type="text"
                      value={localIntegrationTokens.line || ''}
                      onChange={(e) => setLocalIntegrationTokens({ ...localIntegrationTokens, line: e.target.value })}
                      placeholder="กรอก Line Token"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-sky-500 focus:border-sky-500 block p-3 kanit-text outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 kanit-text">Telegram Bot Token</label>
                    <input
                      type="text"
                      value={localIntegrationTokens.telegram || ''}
                      onChange={(e) => setLocalIntegrationTokens({ ...localIntegrationTokens, telegram: e.target.value })}
                      placeholder="กรอก Telegram Token"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-sky-500 focus:border-sky-500 block p-3 kanit-text outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 kanit-text">Discord Webhook URL</label>
                    <input
                      type="text"
                      value={localIntegrationTokens.discord || ''}
                      onChange={(e) => setLocalIntegrationTokens({ ...localIntegrationTokens, discord: e.target.value })}
                      placeholder="กรอก Discord Webhook URL"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-sky-500 focus:border-sky-500 block p-3 kanit-text outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6 mt-8 flex justify-end">
                  <button
                    onClick={saveIntegrations}
                    disabled={isSaving}
                    className="px-8 py-3 bg-sky-500 text-white hover:bg-sky-600 rounded-2xl font-bold kanit-text text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving && <Loader2 size={16} className="animate-spin" />}
                    บันทึกการเชื่อมต่อ
                  </button>
                </div>
              </div>
            )}

            {/* SUBTAB 6: LOGS */}
            {activeSubTab === 'logs' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 kanit-text">ประวัติการใช้งานระบบ (Logs)</h3>
                    <p className="text-slate-400 text-xs mt-1 kanit-text">ตรวจสอบการทำรายการ บันทึก ลบ หรือการเข้าสู่ระบบ</p>
                  </div>
                  <button 
                    onClick={() => {
                      setActiveSubTab('dummy'); 
                      setTimeout(() => setActiveSubTab('logs'), 10);
                    }} 
                    className="p-2 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-xl transition-colors"
                    title="รีเฟรชข้อมูล"
                  >
                    <RotateCcw size={18} />
                  </button>
                </div>

                <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="table-auto w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100"><th className="w-[18%] px-5 py-4 text-xs font-bold text-slate-500 kanit-text">เวลา (Time)</th><th className="w-[23%] px-5 py-4 text-xs font-bold text-slate-500 kanit-text">ผู้ใช้งาน (User)</th><th className="w-[12%] px-5 py-4 text-xs font-bold text-slate-500 kanit-text">การกระทำ (Action)</th><th className="w-[15%] px-5 py-4 text-xs font-bold text-slate-500 kanit-text">ชีต/เป้าหมาย</th><th className="w-[32%] px-5 py-4 text-xs font-bold text-slate-500 kanit-text">รายละเอียด (Detail)</th></tr>
                      </thead>
                      <tbody>
                        {isLoadingLogs ? (
                          <tr>
                            <td colSpan="5" className="px-5 py-12 text-center text-slate-400">
                              <Loader2 size={24} className="animate-spin mx-auto mb-2 text-sky-500" />
                              กำลังโหลดประวัติ...
                            </td>
                          </tr>
                        ) : logsData.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="px-5 py-12 text-center text-slate-400 font-medium kanit-text">
                              ไม่มีประวัติการใช้งาน
                            </td>
                          </tr>
                        ) : (
                          logsData.map((log) => (
                            <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                              <td className="px-5 py-4 text-sm font-data text-slate-600 whitespace-nowrap">
                                {new Date(log.timestamp).toLocaleString('th-TH')}
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center font-bold text-xs shrink-0">
                                    {log.user ? log.user.substring(0, 2) : '??'}
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-700 text-sm kanit-text">{log.user}</div>
                                    <div className="text-xs text-slate-400 kanit-text">{log.role}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold kanit-text ${
                                  log.action === 'LOGIN' ? 'bg-emerald-100 text-emerald-700' :
                                  log.action === 'SAVE_DATA' ? 'bg-sky-100 text-sky-700' :
                                  log.action === 'DELETE_DATA' ? 'bg-rose-100 text-rose-700' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {log.action}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-sm kanit-text font-medium text-slate-600">
                                {log.targetSheet}
                              </td>
                              <td className="px-5 py-4 text-xs font-data text-slate-500">
                                {log.detail}
                                {log.targetDataId && log.targetDataId !== 'unknown' && (
                                  <div className="text-sky-500 mt-0.5 border border-sky-100 inline-block px-1.5 py-0.5 rounded bg-sky-50">
                                    ID: {log.targetDataId}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsManager;


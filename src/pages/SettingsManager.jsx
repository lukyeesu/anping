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
  Lock, Home, Save, UserCheck, Key, RotateCcw, Cloud, Database,
  Bell, Bot, RefreshCw, Send, Eye, EyeOff, Hash, MessageSquare, Check, Copy
} from 'lucide-react';
import { clearAllLocalStores } from '../lib/offlineStore';
import { theme } from '../global/theme';
import { supabase } from '../lib/supabase';
import { normalizeIntegrationTokens, syncLineBotQuotas, sendDiscordEmbed, sendTestLinePush, sendMenuLinePush, formatDirectImageUrl } from '../lib/notificationHub';

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
  gdriveTokens = {},
  setGdriveTokens,
  callAppScript,
  showToast,
  isGlobalLoading,
  onDirtyChange
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
  const [localIntegrationTokens, setLocalIntegrationTokens] = useState(() => normalizeIntegrationTokens(integrationTokens));
  const [isSyncingQuota, setIsSyncingQuota] = useState(false);
  const [testingDiscordId, setTestingDiscordId] = useState(null);
  const [showBotTokens, setShowBotTokens] = useState({});
  const [localGdriveTokens, setLocalGdriveTokens] = useState({ generalDriveFolderId: '', pdpaDriveFolderId: '' });

  // Modal แจ้งเตือนเมื่อมีข้อมูลการเชื่อมต่อที่ยังไม่ได้บันทึกก่อนสลับแท็บย่อย
  const [subTabUnsavedModal, setSubTabUnsavedModal] = useState({ isOpen: false, targetSubTab: null });

  // ตรวจสอบว่ามีการเปลี่ยนแปลงข้อมูลการเชื่อมต่อ (LINE / Discord) ที่ยังไม่ได้กดบันทึกหรือไม่
  const isIntegrationsDirty = useMemo(() => {
    try {
      const getComparable = (tokens) => {
        const norm = normalizeIntegrationTokens(tokens);
        return {
          lineEnabled: norm.line?.enabled ?? true,
          lineEvents: norm.line?.events || {},
          lineRecipients: (norm.line?.recipients || []).map(r => ({
            name: String(r.name || '').trim(),
            chatId: String(r.chatId || '').trim()
          })),
          lineBots: (norm.line?.bots || []).map(b => ({
            name: String(b.name || '').trim(),
            token: String(b.token || '').trim(),
            customChatId: String(b.customChatId || '').trim()
          })),
          discordEnabled: norm.discord?.enabled ?? true,
          discordBotAvatarUrl: String(norm.discord?.botAvatarUrl || '').trim(),
          discordBotName: String(norm.discord?.botName || '').trim(),
          discordApplicationId: String(norm.discord?.applicationId || '').trim(),
          discordPublicKey: String(norm.discord?.publicKey || '').trim(),
          discordBotToken: String(norm.discord?.botToken || '').trim(),
          discordChannels: (norm.discord?.channels || []).map(c => ({
            name: String(c.name || '').trim(),
            event: String(c.event || '').trim(),
            webhookUrl: String(c.webhookUrl || '').trim(),
            botAvatarUrl: String(c.botAvatarUrl || '').trim()
          }))
        };
      };
      return JSON.stringify(getComparable(localIntegrationTokens)) !== JSON.stringify(getComparable(integrationTokens));
    } catch (e) {
      return false;
    }
  }, [localIntegrationTokens, integrationTokens]);

  // แจ้ง parent component (App.jsx) ทราบสถานะ unsaved เพื่อดักการเปลี่ยนหน้าหลัก
  useEffect(() => {
    onDirtyChange?.(isIntegrationsDirty);
    return () => {
      onDirtyChange?.(false);
    };
  }, [isIntegrationsDirty, onDirtyChange]);

  // ดักจับการปิดหน้าต่าง หรือรีเฟรชหน้าเว็บ (F5) ขณะที่ยังมีข้อมูลที่ยังไม่ได้บันทึก
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isIntegrationsDirty) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isIntegrationsDirty]);

  // จัดการการคลิกเปลี่ยนแท็บย่อยในหน้า Settings
  const handleSubTabClick = (targetSubTab) => {
    if (targetSubTab === activeSubTab) return;
    if (activeSubTab === 'integrations' && isIntegrationsDirty) {
      setSubTabUnsavedModal({ isOpen: true, targetSubTab });
      return;
    }
    setActiveSubTab(targetSubTab);
  };

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
    // ป้องกันไม่ให้การซิงก์ background มาทับข้อมูลที่ผู้ใช้กำลังพิมพ์แก้ไขอยู่
    if (integrationTokens && !isIntegrationsDirty) {
      setLocalIntegrationTokens(normalizeIntegrationTokens(integrationTokens));
    }
  }, [integrationTokens, isIntegrationsDirty]);

  useEffect(() => {
    if (gdriveTokens) setLocalGdriveTokens({ ...gdriveTokens });
  }, [gdriveTokens]);

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

  // --- LINE Handlers ---
  const handleToggleLine = (enabled) => {
    setLocalIntegrationTokens(prev => ({
      ...prev,
      line: { ...(prev.line || {}), enabled }
    }));
  };

  const handleToggleLineEvent = (eventKey) => {
    setLocalIntegrationTokens(prev => ({
      ...prev,
      line: {
        ...(prev.line || {}),
        events: {
          ...(prev.line?.events || {}),
          [eventKey]: !prev.line?.events?.[eventKey]
        }
      }
    }));
  };

  const handleAddLineRecipient = () => {
    const newRec = {
      id: `rec_${Date.now()}`,
      name: `กลุ่มที่ ${(localIntegrationTokens.line?.recipients || []).length + 1}`,
      chatId: ''
    };
    setLocalIntegrationTokens(prev => ({
      ...prev,
      line: {
        ...(prev.line || {}),
        recipients: [...(prev.line?.recipients || []), newRec]
      }
    }));
  };

  const handleUpdateLineRecipient = (id, field, val) => {
    setLocalIntegrationTokens(prev => ({
      ...prev,
      line: {
        ...(prev.line || {}),
        recipients: (prev.line?.recipients || []).map(r => r.id === id ? { ...r, [field]: val } : r)
      }
    }));
  };

  const handleRemoveLineRecipient = (id) => {
    setLocalIntegrationTokens(prev => ({
      ...prev,
      line: {
        ...(prev.line || {}),
        recipients: (prev.line?.recipients || []).filter(r => r.id !== id)
      }
    }));
  };

  const handleAddLineBot = () => {
    const nextNum = (localIntegrationTokens.line?.bots || []).length + 1;
    const newBot = {
      id: `bot_${Date.now()}`,
      name: `บอทตัวที่ ${nextNum}`,
      token: '',
      customChatId: '',
      usedQuota: 0,
      totalQuota: 300
    };
    setLocalIntegrationTokens(prev => ({
      ...prev,
      line: {
        ...(prev.line || {}),
        bots: [...(prev.line?.bots || []), newBot]
      }
    }));
  };

  const handleUpdateLineBot = (id, field, val) => {
    setLocalIntegrationTokens(prev => ({
      ...prev,
      line: {
        ...(prev.line || {}),
        bots: (prev.line?.bots || []).map(b => b.id === id ? { ...b, [field]: val } : b)
      }
    }));
  };

  const handleRemoveLineBot = (id) => {
    setLocalIntegrationTokens(prev => ({
      ...prev,
      line: {
        ...(prev.line || {}),
        bots: (prev.line?.bots || []).filter(b => b.id !== id)
      }
    }));
  };

  const handleSyncLineQuotas = async (silent = false) => {
    const bots = localIntegrationTokens?.line?.bots || [];
    if (bots.length === 0 || !bots.some(b => b.token)) {
      if (!silent) showToast('กรุณากรอก Channel Access Token ของบอทก่อนซิงก์โควต้า', 'warning');
      return;
    }
    if (!silent) setIsSyncingQuota(true);
    try {
      const updated = await syncLineBotQuotas(bots);
      setLocalIntegrationTokens(prev => ({
        ...prev,
        line: {
          ...(prev.line || {}),
          bots: updated
        }
      }));
      // ซิงก์ค่ากลับไปบันทึกลงตาราง settings อัตโนมัติ เฉพาะเมื่อผู้ใช้กดปุ่มซิงก์โควต้าโดยตรง (ไม่บันทึกทับใน silent background)
      if (!silent && typeof callAppScript === 'function') {
        const updatedTokens = {
          ...localIntegrationTokens,
          line: { ...(localIntegrationTokens.line || {}), bots: updated }
        };
        await callAppScript('SAVE_DATA', 'Settings', {
          id: 'integration_tokens',
          values: updatedTokens
        });
        setIntegrationTokens(updatedTokens);
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem('clinic_integration_tokens', JSON.stringify(updatedTokens));
          }
        } catch (e) {}
      }
      if (!silent) showToast('ซิงก์ข้อมูลโควต้าจริงจาก LINE สำเร็จเรียบร้อย', 'success');
    } catch (err) {
      if (!silent) showToast('ไม่สามารถซิงก์โควต้าได้ โปรดตรวจสอบ Token', 'danger');
    } finally {
      if (!silent) setIsSyncingQuota(false);
    }
  };

  // Auto-sync real-time LINE quota on subtab open
  useEffect(() => {
    if (activeSubTab === 'integrations' && !isIntegrationsDirty) {
      const bots = localIntegrationTokens?.line?.bots || [];
      if (bots.length > 0 && bots.some(b => b.token)) {
        handleSyncLineQuotas(true);
      }
    }
  }, [activeSubTab]);

  // Periodic real-time quota polling every 20s while viewing Integrations subtab (pause while editing)
  useEffect(() => {
    if (activeSubTab !== 'integrations' || isIntegrationsDirty) return;
    const interval = setInterval(() => {
      const bots = localIntegrationTokens?.line?.bots || [];
      if (bots.length > 0 && bots.some(b => b.token)) {
        handleSyncLineQuotas(true);
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [activeSubTab, isIntegrationsDirty, localIntegrationTokens?.line?.bots]);

  // --- Discord Handlers ---
  const handleToggleDiscord = (enabled) => {
    setLocalIntegrationTokens(prev => ({
      ...prev,
      discord: { ...(prev.discord || {}), enabled }
    }));
  };

  const discordAvatarInputRef = useRef(null);
  const channelAvatarInputRefs = useRef({});
  const [isUploadingDiscordAvatar, setIsUploadingDiscordAvatar] = useState(false);
  const [uploadingChannelAvatarId, setUploadingChannelAvatarId] = useState(null);

  const handleUploadDiscordAvatar = async (file, targetChannelId = null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB', 'warning');
      return;
    }

    if (targetChannelId) {
      setUploadingChannelAvatarId(targetChannelId);
    } else {
      setIsUploadingDiscordAvatar(true);
    }
    showToast('กำลังอัปโหลดรูปภาพ...', 'info');

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result.split(',')[1];
      try {
        const response = await callAppScript('UPLOAD_FILE', 'Settings', {
          fileName: `DISCORD_BOT_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`,
          mimeType: file.type,
          data: base64Data,
          folderId: gdriveTokens?.generalDriveFolderId
        });

        if (response.status === 'success' && response.fileUrl) {
          const directUrl = formatDirectImageUrl(response.fileUrl);
          if (targetChannelId) {
            handleUpdateDiscordChannel(targetChannelId, 'botAvatarUrl', directUrl);
            showToast('อัปโหลดรูปบอทเฉพาะห้องสำเร็จ (อย่าลืมกดปุ่มบันทึกด้านล่าง)', 'success');
          } else {
            setLocalIntegrationTokens(prev => ({
              ...prev,
              discord: {
                ...(prev.discord || {}),
                botAvatarUrl: directUrl
              }
            }));
            showToast('อัปโหลดรูปบอท Discord สำเร็จ (อย่าลืมกดปุ่มบันทึกด้านล่าง)', 'success');
          }
        } else {
          throw new Error(response.message || 'ไม่ได้รับ URL ของรูปภาพจากระบบ');
        }
      } catch (err) {
        console.error('Discord Avatar Upload Error:', err);
        showToast(`อัปโหลดไม่สำเร็จ: ${err.message}`, 'danger');
      } finally {
        setIsUploadingDiscordAvatar(false);
        setUploadingChannelAvatarId(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddDiscordChannel = () => {
    const nextNum = (localIntegrationTokens.discord?.channels || []).length + 1;
    const newChannel = {
      id: `dc_${Date.now()}`,
      name: `ห้องที่ ${nextNum} 💬`,
      event: 'all',
      webhookUrl: '',
      botAvatarUrl: ''
    };
    setLocalIntegrationTokens(prev => ({
      ...prev,
      discord: {
        ...(prev.discord || {}),
        channels: [...(prev.discord?.channels || []), newChannel]
      }
    }));
  };

  const handleUpdateDiscordChannel = (id, field, val) => {
    setLocalIntegrationTokens(prev => ({
      ...prev,
      discord: {
        ...(prev.discord || {}),
        channels: (prev.discord?.channels || []).map(ch => ch.id === id ? { ...ch, [field]: val } : ch)
      }
    }));
  };

  const handleRemoveDiscordChannel = (id) => {
    setLocalIntegrationTokens(prev => ({
      ...prev,
      discord: {
        ...(prev.discord || {}),
        channels: (prev.discord?.channels || []).filter(ch => ch.id !== id)
      }
    }));
  };

  const handleTestDiscordChannel = async (channel) => {
    if (!channel?.webhookUrl?.trim()) {
      showToast('กรุณากรอก Webhook URL ของห้องนี้ก่อนกดทดสอบ', 'warning');
      return;
    }
    setTestingDiscordId(channel.id);
    try {
      const channelAvatar = channel.botAvatarUrl || localIntegrationTokens.discord?.botAvatarUrl || '';
      const botName = channel.botName || localIntegrationTokens.discord?.botName || 'Anping Clinic Notifier';
      const res = await sendDiscordEmbed(channel.webhookUrl.trim(), {
        title: `🔔 ทดสอบการแจ้งเตือนห้อง #${channel.name}`,
        description: `ระบบเชื่อมต่อ Webhook ของห้องนี้สำเร็จเรียบร้อยแล้ว!\nข้อความนี้ส่งมาจากระบบบริหารคลินิก Anping Clinic`,
        color: 0x10b981,
        fields: [
          { name: '📌 ชื่อห้องใน Discord', value: channel.name, inline: true },
          { name: '🎯 หมวดหมู่การแจ้งเตือน', value: channel.event === 'all' ? 'ทุกเหตุการณ์' : channel.event, inline: true },
          { name: '⚡ สถานะการเชื่อมต่อ', value: 'ออนไลน์และพร้อมใช้งาน 100%', inline: false }
        ],
        footerText: 'Anping Clinic',
        botAvatarUrl: channelAvatar,
        botName: botName
      });

      if (res.success) {
        showToast(`ส่งข้อความทดสอบเข้าห้อง ${channel.name} สำเร็จ! กรุณาเช็กใน Discord`, 'success');
      } else {
        showToast(`ส่งไม่สำเร็จ: ${res.error || 'โปรดตรวจสอบความถูกต้องของ URL'}`, 'danger');
      }
    } catch (err) {
      showToast(`เกิดข้อผิดพลาด: ${err.message}`, 'danger');
    } finally {
      setTestingDiscordId(null);
    }
  };

  const [isRegisteringDiscordCommands, setIsRegisteringDiscordCommands] = useState(false);
  const [showDiscordBotToken, setShowDiscordBotToken] = useState(false);

  const handleRegisterDiscordCommands = async () => {
    const appId = localIntegrationTokens.discord?.applicationId?.trim();
    const botToken = localIntegrationTokens.discord?.botToken?.trim();

    if (!appId || !botToken) {
      showToast('กรุณากรอก Discord Application ID และ Bot Token ให้ครบถ้วนก่อนกดลงทะเบียนคำสั่ง', 'warning');
      return;
    }

    setIsRegisteringDiscordCommands(true);
    showToast('กำลังลงทะเบียนคำสั่ง Slash Commands ไปยัง Discord...', 'info');

    try {
      const res = await fetch(`/api/discord?action=register_commands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId, token: botToken })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showToast('🎉 ลงทะเบียนคำสั่ง Slash Commands สำเร็จ! สามารถพิมพ์ / ใน Discord เพื่อค้นหาข้อมูลได้ทันที', 'success');
      } else {
        throw new Error(json.details?.message || json.error || 'ลงทะเบียนคำสั่งไม่สำเร็จ');
      }
    } catch (err) {
      console.error('Register Discord commands error:', err);
      showToast(`ลงทะเบียนคำสั่งไม่สำเร็จ: ${err.message}`, 'danger');
    } finally {
      setIsRegisteringDiscordCommands(false);
    }
  };

  const [testingLineBotId, setTestingLineBotId] = useState(null);

  const handleTestLineBot = async (bot) => {
    if (!bot?.token?.trim()) {
      showToast('กรุณากรอก Channel Access Token ของบอทก่อนกดทดสอบ', 'warning');
      return;
    }
    const recipients = localIntegrationTokens.line?.recipients || [];
    const chatTarget = bot.customChatId?.trim() || recipients.find(r => r.chatId?.trim())?.chatId?.trim();
    if (!chatTarget) {
      showToast('กรุณาระบุ ID กลุ่ม หรือ ID ผู้รับ ในช่องเป้าหมายผู้รับด้านล่างก่อนทดสอบส่ง LINE', 'warning');
      return;
    }

    setTestingLineBotId(bot.id);
    try {
      const res = await sendTestLinePush({ token: bot.token.trim(), targetId: chatTarget });
      if (res.success) {
        showToast('ส่งข้อความทดสอบเข้า LINE สำเร็จแล้ว! กรุณาเช็กในแชท LINE', 'success');
        setTimeout(() => {
          handleSyncLineQuotas(true);
        }, 1200);
      } else {
        showToast(`ส่งไม่สำเร็จ: ${res.error || 'โปรดตรวจสอบ Token และ ID ผู้รับ'}`, 'danger');
      }
    } catch (err) {
      showToast(`เกิดข้อผิดพลาด: ${err.message}`, 'danger');
    } finally {
      setTestingLineBotId(null);
    }
  };

  const [isSendingMenu, setIsSendingMenu] = useState(false);

  const handleSendMenuFlex = async () => {
    const bots = localIntegrationTokens.line?.bots || [];
    const activeBot = bots.find(b => b.token?.trim());
    if (!activeBot) {
      showToast('กรุณากรอก Channel Access Token ของบอทก่อนส่งเมนูลัด', 'warning');
      return;
    }
    const recipients = localIntegrationTokens.line?.recipients || [];
    const chatTarget = activeBot.customChatId?.trim() || recipients.find(r => r.chatId?.trim())?.chatId?.trim();
    if (!chatTarget) {
      showToast('กรุณาระบุ ID กลุ่ม หรือ ID ผู้รับ ในช่องเป้าหมายผู้รับด้านล่างก่อนส่งเมนูเข้า LINE', 'warning');
      return;
    }

    setIsSendingMenu(true);
    try {
      const res = await sendMenuLinePush({
        token: activeBot.token.trim(),
        targetId: chatTarget
      });
      if (res.success) {
        showToast('ส่ง Flex เมนูคำสั่งลัดเข้า LINE สำเร็จเรียบร้อยแล้ว!', 'success');
        setTimeout(() => {
          handleSyncLineQuotas(true);
        }, 1200);
      } else {
        showToast(`ส่งไม่สำเร็จ: ${res.error || 'โปรดตรวจสอบ Token และ ID ผู้รับ'}`, 'danger');
      }
    } catch (err) {
      showToast(`เกิดข้อผิดพลาด: ${err.message}`, 'danger');
    } finally {
      setIsSendingMenu(false);
    }
  };

  const saveIntegrations = async () => {
    setIsSaving(true);
    try {
      if (supabase) {
        const { error: sbErr } = await supabase
          .from('settings')
          .upsert({
            id: 'integration_tokens',
            values: localIntegrationTokens,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
        if (sbErr) {
          console.error("Direct upsert settings error:", sbErr);
          throw sbErr;
        }
      }
      if (typeof callAppScript === 'function') {
        await callAppScript('SAVE_DATA', 'Settings', { id: 'integration_tokens', values: localIntegrationTokens });
      }
      setIntegrationTokens(localIntegrationTokens);
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('clinic_integration_tokens', JSON.stringify(localIntegrationTokens));
        }
      } catch (err) {}
      showToast('บันทึกการเชื่อมต่อสำเร็จ', 'success');
    } catch (e) {
      showToast(`บันทึกไม่สำเร็จ: ${e.message}`, 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const saveGdriveTokens = async () => {
    setIsSaving(true);
    try {
      if (supabase) {
        const { error: sbErr } = await supabase
          .from('settings')
          .upsert({
            id: 'gdrive_tokens',
            values: localGdriveTokens,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
        if (sbErr) {
          console.error("Direct upsert gdrive tokens error:", sbErr);
          throw sbErr;
        }
      }
      if (typeof callAppScript === 'function') {
        await callAppScript('SAVE_DATA', 'Settings', { id: 'gdrive_tokens', values: localGdriveTokens });
      }
      setGdriveTokens(localGdriveTokens);
      showToast('บันทึกการตั้งค่า GDrive สำเร็จ', 'success');
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
    <div className="w-full bg-slate-50 min-h-screen p-3 sm:p-5 md:p-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-800 kanit-text tracking-tight flex items-center gap-2.5 sm:gap-3">
            <span className="p-2 sm:p-2.5 bg-sky-500 text-white rounded-2xl shadow-lg shadow-sky-500/25">
              <Settings size={24} className="sm:w-7 sm:h-7" />
            </span>
            ตั้งค่าระบบคลินิก
          </h1>
          <p className="text-slate-500 mt-1 sm:mt-1.5 text-xs sm:text-sm font-medium kanit-text">จัดการคำนำหน้าพนักงาน, สิทธิ์เข้าระบบ และบทบาทต่าง ๆ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        {/* Navigation Sidebar inside Settings (สไลด์แนวนอนบนมือถือ เป็นแถบข้างบนจอใหญ่) */}
        <div className="lg:col-span-1 flex flex-row lg:flex-col gap-2 overflow-x-auto custom-scrollbar pb-2 lg:pb-0 shrink-0">
          <button
            onClick={() => handleSubTabClick('prefixes')}
            className={`shrink-0 whitespace-nowrap lg:whitespace-normal w-auto lg:w-full text-left px-4 sm:px-5 py-3 sm:py-4 rounded-2xl font-bold kanit-text text-xs sm:text-sm transition-all flex items-center gap-2.5 sm:gap-3 shadow-xs ${
              activeSubTab === 'prefixes'
                ? 'bg-sky-500 text-white shadow-sky-500/20 scale-[1.01]'
                : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 border border-slate-100'
            }`}
          >
            <User size={18} className="shrink-0" />
            <span>คำนำหน้าชื่อพนักงาน</span>
          </button>
          <button
            onClick={() => handleSubTabClick('permissions')}
            className={`shrink-0 whitespace-nowrap lg:whitespace-normal w-auto lg:w-full text-left px-4 sm:px-5 py-3 sm:py-4 rounded-2xl font-bold kanit-text text-xs sm:text-sm transition-all flex items-center gap-2.5 sm:gap-3 shadow-xs ${
              activeSubTab === 'permissions'
                ? 'bg-sky-500 text-white shadow-sky-500/20 scale-[1.01]'
                : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 border border-slate-100'
            }`}
          >
            <ShieldCheck size={18} className="shrink-0" />
            <span>จัดการสิทธิ์เข้าระบบ</span>
          </button>
          <button
            onClick={() => handleSubTabClick('categories')}
            className={`shrink-0 whitespace-nowrap lg:whitespace-normal w-auto lg:w-full text-left px-4 sm:px-5 py-3 sm:py-4 rounded-2xl font-bold kanit-text text-xs sm:text-sm transition-all flex items-center gap-2.5 sm:gap-3 shadow-xs ${
              activeSubTab === 'categories'
                ? 'bg-sky-500 text-white shadow-sky-500/20 scale-[1.01]'
                : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 border border-slate-100'
            }`}
          >
            <Tag size={18} className="shrink-0" />
            <span>ตัวเลือกหมวดหมู่</span>
          </button>
          <button
            onClick={() => handleSubTabClick('statuses')}
            className={`shrink-0 whitespace-nowrap lg:whitespace-normal w-auto lg:w-full text-left px-4 sm:px-5 py-3 sm:py-4 rounded-2xl font-bold kanit-text text-xs sm:text-sm transition-all flex items-center gap-2.5 sm:gap-3 shadow-xs ${
              activeSubTab === 'statuses'
                ? 'bg-sky-500 text-white shadow-sky-500/20 scale-[1.01]'
                : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 border border-slate-100'
            }`}
          >
            <Clock size={18} className="shrink-0" />
            <span>สถานะนัดหมาย</span>
          </button>
          <button
            onClick={() => handleSubTabClick('integrations')}
            className={`shrink-0 whitespace-nowrap lg:whitespace-normal w-auto lg:w-full text-left px-4 sm:px-5 py-3 sm:py-4 rounded-2xl font-bold kanit-text text-xs sm:text-sm transition-all flex items-center justify-between gap-2.5 sm:gap-3 shadow-xs ${
              activeSubTab === 'integrations'
                ? 'bg-sky-500 text-white shadow-sky-500/20 scale-[1.01]'
                : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 border border-slate-100'
            }`}
          >
            <div className="flex items-center gap-2.5 sm:gap-3">
              <Link size={18} className="shrink-0" />
              <span>การเชื่อมต่อแจ้งเตือน</span>
            </div>
            {isIntegrationsDirty && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse border shrink-0 ${
                activeSubTab === 'integrations'
                  ? 'bg-amber-300 text-slate-900 border-amber-400'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}>
                ยังไม่บันทึก
              </span>
            )}
          </button>
          <button
            onClick={() => handleSubTabClick('gdrive')}
            className={`shrink-0 whitespace-nowrap lg:whitespace-normal w-auto lg:w-full text-left px-4 sm:px-5 py-3 sm:py-4 rounded-2xl font-bold kanit-text text-xs sm:text-sm transition-all flex items-center gap-2.5 sm:gap-3 shadow-xs ${
              activeSubTab === 'gdrive'
                ? 'bg-sky-500 text-white shadow-sky-500/20 scale-[1.01]'
                : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 border border-slate-100'
            }`}
          >
            <Cloud size={18} className="shrink-0" />
            <span>เชื่อมต่อ GDrive</span>
          </button>
          <button
            onClick={() => handleSubTabClick('logs')}
            className={`shrink-0 whitespace-nowrap lg:whitespace-normal w-auto lg:w-full text-left px-4 sm:px-5 py-3 sm:py-4 rounded-2xl font-bold kanit-text text-xs sm:text-sm transition-all flex items-center gap-2.5 sm:gap-3 shadow-xs ${
              activeSubTab === 'logs'
                ? 'bg-sky-500 text-white shadow-sky-500/20 scale-[1.01]'
                : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 border border-slate-100'
            }`}
          >
            <History size={18} className="shrink-0" />
            <span>ประวัติการใช้งาน (Logs)</span>
          </button>
          <button
            onClick={() => handleSubTabClick('cache')}
            className={`shrink-0 whitespace-nowrap lg:whitespace-normal w-auto lg:w-full text-left px-4 sm:px-5 py-3 sm:py-4 rounded-2xl font-bold kanit-text text-xs sm:text-sm transition-all flex items-center gap-2.5 sm:gap-3 shadow-xs ${
              activeSubTab === 'cache'
                ? 'bg-sky-500 text-white shadow-sky-500/20 scale-[1.01]'
                : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 border border-slate-100'
            }`}
          >
            <Database size={18} className="shrink-0" />
            <span>จัดการแคช & ฐานข้อมูล</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 min-w-0">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100/80 p-3.5 sm:p-6 md:p-8 min-w-0">
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
                    data-save-btn="true"
                    onClick={savePrefixes}
                    disabled={isSaving}
                    className="px-8 py-3 bg-sky-500 text-white hover:bg-sky-600 rounded-2xl font-bold kanit-text text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2 cursor-pointer"
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
                      <tr className="bg-slate-50/70 border-b border-slate-100">
                        <th className="w-[50%] p-4 font-bold text-slate-600 kanit-text">ส่วนของระบบ / แท็บการใช้งาน</th>
                        {Object.entries(localRoleLabels).map(([roleKey, roleLabel]) => {
                          const isDefaultRole = ['r1', 'r2', 'r3'].includes(roleKey);
                          return (
                            <th key={roleKey} className="p-4 font-bold text-slate-600 kanit-text text-center">
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
                            </th>
                          );
                        })}
                      </tr>
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
                    data-save-btn="true"
                    onClick={savePermissions}
                    disabled={isSaving}
                    className="px-8 py-3 bg-sky-500 text-white hover:bg-sky-600 rounded-2xl font-bold kanit-text text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2 cursor-pointer"
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
                    data-save-btn="true"
                    onClick={saveCategories}
                    disabled={isSaving}
                    className="px-8 py-3 bg-sky-500 text-white hover:bg-sky-600 rounded-2xl font-bold kanit-text text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2 cursor-pointer"
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
                    data-save-btn="true"
                    onClick={saveApptStatuses}
                    disabled={isSaving}
                    className="px-8 py-3 bg-sky-500 text-white hover:bg-sky-600 rounded-2xl font-bold kanit-text text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {isSaving && <Loader2 size={16} className="animate-spin" />}
                    บันทึกสถานะนัดหมาย
                  </button>
                </div>
              </div>
            )}

            {/* SUBTAB 5: INTEGRATIONS (การเชื่อมต่อแจ้งเตือน LINE & DISCORD) */}
            {activeSubTab === 'integrations' && (
              <div className="space-y-6 sm:space-y-8 animate-in slide-in-from-right-4 duration-300 text-left min-w-0">
                {/* 🟢 CARD 1: LINE MESSAGING API (MULTI-BOT FAILOVER POOL) */}
                <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-slate-100 shadow-sm min-w-0">
                  {/* Header */}
                  <div className="flex items-start gap-3 sm:gap-4 mb-5 sm:mb-6">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 shadow-2xs">
                      <Bell size={22} className="sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg sm:text-xl font-bold text-slate-800 kanit-text flex items-center gap-2">
                        แจ้งเตือน (LINE Notify / Bot)
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 kanit-text mt-0.5 leading-relaxed">
                        ตั้งค่าการส่งข้อความแจ้งเตือนเข้าแชทและสรุปยอด (รองรับระบบบอทสำรองเมื่อโควต้าเต็ม)
                      </p>
                    </div>
                  </div>

                  {/* 1. สวิตช์เปิด/ปิดการแจ้งเตือน LINE */}
                  <div className="mb-6">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 kanit-text">
                      สถานะการส่งแจ้งเตือน
                    </label>
                    <div className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleLine(!localIntegrationTokens.line?.enabled)}
                          className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 focus:outline-hidden shrink-0 ${
                            localIntegrationTokens.line?.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        >
                          <div
                            className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${
                              localIntegrationTokens.line?.enabled ? 'translate-x-6' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span className="font-bold text-sm text-slate-700 kanit-text">
                          {localIntegrationTokens.line?.enabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 kanit-text">
                        {localIntegrationTokens.line?.enabled ? 'ระบบจะส่งการแจ้งเตือนตามรายการที่เลือกด้านล่าง' : 'ปิดการส่งข้อความเข้า LINE ชั่วคราว'}
                      </span>
                    </div>
                  </div>

                  {/* 2. ตัวเลือกประเภทการแจ้งเตือนเข้า LINE (ตามที่ผู้ใช้สั่ง) */}
                  <div className="mb-6">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 kanit-text">
                      เลือกรายการที่ต้องการส่งเข้า LINE:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {[
                        { key: 'queue', label: 'นัดหมายคนไข้ (Queue)', desc: 'จองคิว, ยืนยัน, เลื่อนนัด' },
                        { key: 'pos', label: 'ปิดบิล / การเงิน (POS)', desc: 'ชำระเงิน, ออกใบเสร็จ' },
                        { key: 'opd', label: 'ประวัติการรักษา (OPD)', desc: 'บันทึกการตรวจรักษา' },
                        { key: 'mr', label: 'เวชระเบียน / ตัดคอร์ส', desc: 'ลงทะเบียน, ตัดรอบคอร์ส' },
                        { key: 'dashboard', label: 'สรุปยอดประจำวัน', desc: 'ยอดขายและสถิติสิ้นวัน' }
                      ].map((item) => {
                        const isChecked = localIntegrationTokens.line?.events?.[item.key] !== false;
                        return (
                          <button
                            type="button"
                            key={item.key}
                            onClick={() => handleToggleLineEvent(item.key)}
                            className={`flex items-start gap-2.5 sm:gap-3 p-3 rounded-2xl border text-left transition-all ${
                              isChecked
                                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950 shadow-2xs'
                                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                            }`}
                          >
                            <div className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                              isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 bg-white'
                            }`}>
                              {isChecked && <Check size={14} strokeWidth={3} />}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs sm:text-sm kanit-text leading-tight">{item.label}</div>
                              <div className="text-[11px] text-slate-400 kanit-text mt-0.5">{item.desc}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. กล่อง "ID กลุ่ม หรือ ID ลูกค้าที่จะแจ้งเตือน" */}
                  <div className="mb-6 p-3.5 sm:p-5 rounded-2xl border border-slate-200/90 bg-emerald-50/20 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-800 kanit-text">
                          ID กลุ่ม หรือ ID ลูกค้าที่จะแจ้งเตือน
                        </span>
                        <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-medium kanit-text">
                          ส่งให้หลายคนพร้อมกันได้
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddLineRecipient}
                        className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 transition-colors kanit-text"
                      >
                        <Plus size={14} /> เพิ่มผู้รับ
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {(localIntegrationTokens.line?.recipients || []).map((rec, idx) => (
                        <div key={rec.id || idx} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white/80 sm:bg-transparent p-2.5 sm:p-0 rounded-xl sm:rounded-none border sm:border-0 border-slate-200/70">
                          <input
                            type="text"
                            value={rec.name || ''}
                            onChange={(e) => handleUpdateLineRecipient(rec.id, 'name', e.target.value)}
                            placeholder="ป้ายชื่อ (เช่น กลุ่ม)"
                            className="w-full sm:w-36 bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm rounded-xl px-3 py-2 sm:py-2.5 kanit-text outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shrink-0"
                          />
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <input
                              type="text"
                              value={rec.chatId || ''}
                              onChange={(e) => handleUpdateLineRecipient(rec.id, 'chatId', e.target.value)}
                              placeholder="Line Group ID (เช่น C...) หรือ User ID (เช่น U...)"
                              className="flex-1 bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm rounded-xl px-3 py-2 sm:py-2.5 font-mono outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all min-w-0"
                            />
                            {(localIntegrationTokens.line?.recipients || []).length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveLineRecipient(rec.id)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                                title="ลบผู้รับนี้"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-400 kanit-text mt-2.5 leading-relaxed">
                      💡 บอททุกตัวในรายการด้านล่างจะยิงข้อความไปที่แชทเหล่านี้ทั้งหมด
                    </p>
                  </div>

                  {/* 4. รายชื่อบอท (สำรองเมื่อโควต้าเต็ม) */}
                  <div className="space-y-4 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                      <h4 className="font-bold text-sm text-slate-700 kanit-text">
                        รายชื่อบอท (สำรองเมื่อโควต้าเต็ม)
                      </h4>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSendMenuFlex}
                          disabled={isSendingMenu}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs kanit-text transition-all disabled:opacity-50 shadow-2xs"
                          title="ส่ง Flex Menu คำสั่งลัดเข้า LINE กลุ่มทันที"
                        >
                          {isSendingMenu ? <Loader2 size={13} className="animate-spin" /> : <Bot size={13} />}
                          <span>📲 ส่งเมนูลัดเข้า LINE</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleSyncLineQuotas}
                          disabled={isSyncingQuota}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold text-xs kanit-text transition-all disabled:opacity-50"
                        >
                          <RefreshCw size={13} className={isSyncingQuota ? 'animate-spin' : ''} />
                          <span>{isSyncingQuota ? 'กำลังซิงก์...' : 'ซิงก์โควต้าจริง'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleAddLineBot}
                          className="inline-flex items-center justify-center gap-1 px-3 py-2 sm:py-1.5 rounded-xl bg-slate-800 text-white hover:bg-slate-900 font-bold text-xs kanit-text transition-all shadow-2xs"
                        >
                          <Plus size={13} /> <span>เพิ่มบอท</span>
                        </button>
                      </div>
                    </div>

                    {/* การ์ดบอทแต่ละตัว */}
                    <div className="space-y-4">
                      {(localIntegrationTokens.line?.bots || []).map((bot, index) => {
                        const used = Number(bot.usedQuota) || 0;
                        const total = Number(bot.totalQuota) || 300;
                        const isQuotaFull = used >= total;
                        const isHigh = used >= 250;
                        const isShowToken = showBotTokens[bot.id];

                        return (
                          <div
                            key={bot.id || index}
                            className={`p-3.5 sm:p-5 rounded-2xl border transition-all min-w-0 ${
                              isQuotaFull
                                ? 'bg-rose-50/30 border-rose-200 shadow-2xs'
                                : 'bg-white border-slate-200 shadow-2xs'
                            }`}
                          >
                            {/* บรรทัดหัวเรื่องบอท */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-slate-500 kanit-text shrink-0">
                                  บอทตัวที่ {index + 1}
                                </span>
                                <input
                                  type="text"
                                  value={bot.name || ''}
                                  onChange={(e) => handleUpdateLineBot(bot.id, 'name', e.target.value)}
                                  placeholder={`ชื่อบอท (เช่น บอทตัวที่ ${index + 1})`}
                                  className="font-bold text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 kanit-text outline-none focus:ring-1 focus:ring-sky-500 flex-1 sm:flex-none sm:w-44 min-w-[120px]"
                                />
                                <span
                                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full font-mono shrink-0 ${
                                    isQuotaFull
                                      ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                      : isHigh
                                      ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                      : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                  }`}
                                >
                                  โควต้า: {used}/{total}
                                </span>
                              </div>

                              <div className="flex items-center justify-end gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleTestLineBot(bot)}
                                  disabled={testingLineBotId === bot.id}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 transition-colors disabled:opacity-50 kanit-text"
                                  title="ทดสอบส่งข้อความเข้า LINE ทันที"
                                >
                                  {testingLineBotId === bot.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                                  <span>ทดสอบส่ง</span>
                                </button>

                                {(localIntegrationTokens.line?.bots || []).length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLineBot(bot.id)}
                                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                                    title="ลบบอทตัวนี้"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* ฟิลด์ Channel Access Token */}
                            <div className="space-y-3">
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <label className="text-xs font-bold text-slate-700 kanit-text">
                                    Channel Access Token
                                  </label>
                                  <a
                                    href="https://developers.line.biz/console/"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-bold text-sky-600 hover:text-sky-700 inline-flex items-center gap-1 kanit-text"
                                  >
                                    รับ Token <ExternalLink size={11} />
                                  </a>
                                </div>
                                <div className="relative">
                                  <input
                                    type={isShowToken ? 'text' : 'password'}
                                    value={bot.token || ''}
                                    onChange={(e) => handleUpdateLineBot(bot.id, 'token', e.target.value)}
                                    placeholder="วาง Channel Access Token ของ LINE Messaging API ที่นี่"
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm rounded-xl px-3 py-2.5 pr-10 font-mono outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowBotTokens(prev => ({ ...prev, [bot.id]: !prev[bot.id] }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                                  >
                                    {isShowToken ? <EyeOff size={15} /> : <Eye size={15} />}
                                  </button>
                                </div>
                              </div>

                              {/* ฟิลด์ Chat ID (เฉพาะบอทตัวนี้) */}
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 kanit-text">
                                  Chat ID (เฉพาะบอทตัวนี้)
                                </label>
                                <input
                                  type="text"
                                  value={bot.customChatId || ''}
                                  onChange={(e) => handleUpdateLineBot(bot.id, 'customChatId', e.target.value)}
                                  placeholder="ปล่อยว่างไว้เพื่อใช้ Chat ID กลาง"
                                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm rounded-xl px-3 py-2.5 font-mono outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 🟣 CARD 2: DISCORD MULTI-CHANNEL WEBHOOKS (แยกห้องแชทอัตโนมัติ - ฟรี ไม่จำกัด) */}
                <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-slate-100 shadow-sm min-w-0">
                  {/* Header */}
                  <div className="flex items-start gap-3 sm:gap-4 mb-5 sm:mb-6">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100 shadow-2xs">
                      <Hash size={22} className="sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg sm:text-xl font-bold text-slate-800 kanit-text flex items-center gap-2">
                        แจ้งเตือน Discord (แยกห้องแชทอัตโนมัติ - ฟรี 100% ไม่จำกัด)
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 kanit-text mt-0.5 leading-relaxed">
                        ส่งข้อความแยกห้องแชทอัตโนมัติ สวยงาม พร้อมบันทึกประวัติย้อนหลัง 0 บาท ไม่มีโควต้าจำกัด
                      </p>
                    </div>
                  </div>

                  {/* 1. สวิตช์เปิด/ปิดการแจ้งเตือน Discord */}
                  <div className="mb-6">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 kanit-text">
                      สถานะการส่งแจ้งเตือน Discord
                    </label>
                    <div className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleDiscord(!localIntegrationTokens.discord?.enabled)}
                          className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 focus:outline-hidden shrink-0 ${
                            localIntegrationTokens.discord?.enabled ? 'bg-indigo-600' : 'bg-slate-300'
                          }`}
                        >
                          <div
                            className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${
                              localIntegrationTokens.discord?.enabled ? 'translate-x-6' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span className="font-bold text-sm text-slate-700 kanit-text">
                          {localIntegrationTokens.discord?.enabled ? 'เปิดใช้งาน Discord' : 'ปิดใช้งาน'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 kanit-text">
                        {localIntegrationTokens.discord?.enabled ? 'พร้อมส่งข้อมูลแยกเข้าตามห้องแชทใน Discord' : 'ปิดการส่งเข้า Discord ชั่วคราว'}
                      </span>
                    </div>
                  </div>

                  {/* 2. ตั้งค่ารูปโปรไฟล์และชื่อ Bot Discord (Global) */}
                  <div className="mb-6 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/30 min-w-0">
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5">
                      {/* Left: Avatar Preview + Upload Controls */}
                      <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-100 border-2 border-indigo-200 shadow-sm flex items-center justify-center relative">
                            {localIntegrationTokens.discord?.botAvatarUrl ? (
                              <img 
                                src={formatDirectImageUrl(localIntegrationTokens.discord?.botAvatarUrl)} 
                                alt="Discord Bot Avatar"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=150';
                                }}
                              />
                            ) : (
                              <img 
                                src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=150" 
                                alt="Default Bot Avatar"
                                className="w-full h-full object-cover opacity-80"
                              />
                            )}
                            {isUploadingDiscordAvatar && (
                              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-2xs flex flex-col items-center justify-center text-white p-1">
                                <Loader2 size={20} className="animate-spin text-white mb-1" />
                                <span className="text-[10px] font-bold">อัปโหลด...</span>
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => discordAvatarInputRef.current?.click()}
                            disabled={isUploadingDiscordAvatar}
                            className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center shadow-md transition-transform active:scale-95 disabled:opacity-50"
                            title="อัปโหลดรูป"
                          >
                            <Camera size={14} />
                          </button>
                          <input 
                            type="file" 
                            ref={discordAvatarInputRef} 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleUploadDiscordAvatar(e.target.files[0]);
                                e.target.value = '';
                              }
                            }} 
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <h4 className="font-bold text-sm sm:text-base text-slate-800 kanit-text">
                              รูปโปรไฟล์และชื่อบอท Discord
                            </h4>
                            <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md font-bold bg-indigo-100 text-indigo-700 kanit-text">
                              ส่วนกลาง (Global)
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 kanit-text mt-0.5 leading-relaxed">
                            {localIntegrationTokens.discord?.botAvatarUrl 
                              ? 'ใช้รูปที่กำหนดเอง (แสดงข้างข้อความแจ้งเตือนใน Discord)' 
                              : 'กำลังใช้รูปเริ่มต้นของระบบ (สามารถเปลี่ยนรูปหรือวาง URL ได้)'}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-2.5">
                            <button
                              type="button"
                              onClick={() => discordAvatarInputRef.current?.click()}
                              disabled={isUploadingDiscordAvatar}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs kanit-text transition-all shadow-2xs disabled:opacity-50"
                            >
                              <Upload size={13} /> {isUploadingDiscordAvatar ? 'กำลังอัปโหลด...' : 'อัปโหลดรูป'}
                            </button>
                            {localIntegrationTokens.discord?.botAvatarUrl && (
                              <button
                                type="button"
                                onClick={() => {
                                  setLocalIntegrationTokens(prev => ({
                                    ...prev,
                                    discord: { ...(prev.discord || {}), botAvatarUrl: '' }
                                  }));
                                }}
                                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 font-bold text-xs kanit-text transition-all"
                              >
                                ใช้รูปเริ่มต้น
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Bot Name + URL input */}
                      <div className="w-full lg:flex-1 lg:max-w-md space-y-2.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-indigo-100/70">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 kanit-text mb-1">
                            ชื่อแสดงของบอท (Bot Display Name):
                          </label>
                          <input
                            type="text"
                            value={localIntegrationTokens.discord?.botName || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setLocalIntegrationTokens(prev => ({
                                ...prev,
                                discord: { ...(prev.discord || {}), botName: val }
                              }));
                            }}
                            placeholder="Anping Clinic Notifier (หรือชื่อคลินิก)"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-slate-800 kanit-text outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 kanit-text mb-1">
                            ลิงก์ URL รูปภาพบอท:
                          </label>
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              value={localIntegrationTokens.discord?.botAvatarUrl || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setLocalIntegrationTokens(prev => ({
                                  ...prev,
                                  discord: { ...(prev.discord || {}), botAvatarUrl: val }
                                }));
                              }}
                              placeholder="https://... (วางลิงก์รูปภาพ)"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 pr-8 text-xs font-mono text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            />
                            {localIntegrationTokens.discord?.botAvatarUrl && (
                              <button
                                type="button"
                                onClick={() => {
                                  setLocalIntegrationTokens(prev => ({
                                    ...prev,
                                    discord: { ...(prev.discord || {}), botAvatarUrl: '' }
                                  }));
                                }}
                                className="absolute right-2 text-slate-400 hover:text-slate-600 p-1"
                                title="ล้างลิงก์รูปภาพ"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. ตั้งค่า Discord Bot & คำสั่งค้นหาข้อมูล (Slash Commands) */}
                  <div className="bg-white border border-indigo-100/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-50">
                      <div className="flex items-start sm:items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0 text-base">
                          🤖
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h4 className="font-bold text-sm sm:text-base text-slate-800 kanit-text">
                              ตั้งค่าคำสั่งค้นหาข้อมูลใน Discord (Slash Commands)
                            </h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700">
                              Vercel Serverless
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 kanit-text mt-0.5 leading-relaxed">
                            ช่วยให้พิมพ์ค้นหาข้อมูลใน Discord ได้ทันที เช่น <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono text-[11px]">/search</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono text-[11px]">/patient</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono text-[11px]">/queue</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono text-[11px]">/bill</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono text-[11px]">/sales</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono text-[11px]">/stock</code>
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRegisterDiscordCommands}
                        disabled={isRegisteringDiscordCommands || !localIntegrationTokens.discord?.applicationId || !localIntegrationTokens.discord?.botToken}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm kanit-text transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:pointer-events-none shrink-0"
                      >
                        {isRegisteringDiscordCommands ? (
                          <>
                            <Loader2 size={15} className="animate-spin" />
                            <span>กำลังลงทะเบียน...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw size={15} />
                            <span>ลงทะเบียนคำสั่งไป Discord</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Interactions Endpoint URL hint with copy button */}
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-bold text-indigo-900 kanit-text block mb-0.5">
                          🌐 Interactions Endpoint URL (นำไปใส่ใน Discord Developer Portal &gt; General Information):
                        </span>
                        <code className="text-xs font-mono text-indigo-700 select-all break-all">
                          https://anpingclinic.vercel.app/api/discord
                        </code>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText('https://anpingclinic.vercel.app/api/discord');
                          showToast('คัดลอก Interactions Endpoint URL แล้ว!', 'success');
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold text-xs kanit-text shadow-2xs self-start sm:self-auto"
                      >
                        <Copy size={13} /> <span>คัดลอกลิงก์</span>
                      </button>
                    </div>

                    {/* Grid for Application ID, Public Key, Bot Token */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 kanit-text mb-1">
                          Discord Application ID (Client ID):
                        </label>
                        <input
                          type="text"
                          value={localIntegrationTokens.discord?.applicationId || ''}
                          onChange={(e) => {
                            const val = e.target.value.trim();
                            setLocalIntegrationTokens(prev => ({
                              ...prev,
                              discord: { ...(prev.discord || {}), applicationId: val }
                            }));
                          }}
                          placeholder="เช่น 123456789012345678"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 kanit-text mb-1">
                          Discord Public Key:
                        </label>
                        <input
                          type="text"
                          value={localIntegrationTokens.discord?.publicKey || ''}
                          onChange={(e) => {
                            const val = e.target.value.trim();
                            setLocalIntegrationTokens(prev => ({
                              ...prev,
                              discord: { ...(prev.discord || {}), publicKey: val }
                            }));
                          }}
                          placeholder="64 ตัวอักษร Hex (ใช้ตรวจสอบลายเซ็น)"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 kanit-text mb-1">
                          Discord Bot Token:
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type={showDiscordBotToken ? "text" : "password"}
                            value={localIntegrationTokens.discord?.botToken || ''}
                            onChange={(e) => {
                              const val = e.target.value.trim();
                              setLocalIntegrationTokens(prev => ({
                                ...prev,
                                discord: { ...(prev.discord || {}), botToken: val }
                              }));
                            }}
                            placeholder="Bot Token (สำหรับลงทะเบียนคำสั่ง)"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pr-9 text-xs font-mono text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowDiscordBotToken(!showDiscordBotToken)}
                            className="absolute right-2 text-slate-400 hover:text-slate-600 p-1"
                            title={showDiscordBotToken ? "ซ่อน Token" : "แสดง Token"}
                          >
                            {showDiscordBotToken ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 kanit-text bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-1">
                      <span className="font-bold text-slate-700">💡 ขั้นตอนการเชื่อมต่อบอทค้นหาข้อมูล Discord:</span>
                      <span>1. เข้าไปที่ <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-bold">Discord Developer Portal</a> แล้วเลือกหรือกด New Application</span>
                      <span>2. คัดลอก <b>Application ID</b> และ <b>Public Key</b> ในหน้า General Information มาใส่ในช่องด้านบน</span>
                      <span>3. คัดลอก <b>Interactions Endpoint URL</b> ด้านบน ไปวางในช่อง Interactions Endpoint URL แล้วกด Save Changes</span>
                      <span>4. ไปที่เมนู <b>Bot</b> ด้านซ้าย คัดลอก <b>Token</b> มาใส่ในช่อง Bot Token แล้วกดปุ่ม <b>"ลงทะเบียนคำสั่งไป Discord"</b> และกดปุ่ม <b>"บันทึกการเชื่อมต่อ"</b> ด้านล่าง</span>
                    </div>
                  </div>

                  {/* 4. รายชื่อห้องแชทใน Discord (เพิ่มห้องได้ไม่จำกัด ตามที่ผู้ใช้สั่ง) */}
                  <div className="space-y-4 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                      <div>
                        <h4 className="font-bold text-sm text-slate-700 kanit-text">
                          รายชื่อห้องแชทใน Discord (แยกตามหมวดหมู่)
                        </h4>
                        <p className="text-xs text-slate-400 kanit-text mt-0.5">
                          ใส่ Webhook URL ของห้องใน Discord ที่ต้องการให้ยิงข้อความเข้าไป
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddDiscordChannel}
                        className="inline-flex items-center justify-center gap-1 px-3.5 py-2 sm:py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs kanit-text transition-all shadow-2xs shrink-0 self-start sm:self-auto"
                      >
                        <Plus size={13} /> <span>เพิ่มห้อง Discord</span>
                      </button>
                    </div>

                    {/* รายการห้อง Discord */}
                    <div className="space-y-3.5">
                      {(localIntegrationTokens.discord?.channels || []).map((channel) => {
                        const isTesting = testingDiscordId === channel.id;
                        return (
                          <div
                            key={channel.id}
                            className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all space-y-3 min-w-0"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                                <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-sm">
                                  #
                                </span>
                                <input
                                  type="text"
                                  value={channel.name || ''}
                                  onChange={(e) => handleUpdateDiscordChannel(channel.id, 'name', e.target.value)}
                                  placeholder="ชื่อห้อง (เช่น นัดหมาย 🗓️)"
                                  className="flex-1 sm:w-44 sm:flex-none min-w-[110px] bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-xs sm:text-sm text-slate-800 kanit-text outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                                <select
                                  value={channel.event || 'all'}
                                  onChange={(e) => handleUpdateDiscordChannel(channel.id, 'event', e.target.value)}
                                  className="w-full sm:w-auto bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 kanit-text outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                >
                                  <option value="queue">🗓️ นัดหมายคนไข้ (Queue)</option>
                                  <option value="pos">💵 ปิดบิล / การเงิน (POS)</option>
                                  <option value="opd">🩺 ประวัติการรักษา (OPD)</option>
                                  <option value="mr">📁 เวชระเบียน & ตัดคอร์ส (MR)</option>
                                  <option value="dashboard">🌻 แดชบอร์ด & สรุปยอด (Dashboard)</option>
                                  <option value="all">💬 ทุกเหตุการณ์ (All Events)</option>
                                </select>
                              </div>

                              <div className="flex items-center justify-end gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleTestDiscordChannel(channel)}
                                  disabled={isTesting || !channel.webhookUrl}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-xs kanit-text transition-all disabled:opacity-40"
                                  title="ส่งข้อความทดสอบเข้าห้อง Discord นี้"
                                >
                                  <Send size={12} className={isTesting ? 'animate-pulse text-indigo-500' : ''} />
                                  <span>{isTesting ? 'กำลังส่ง...' : 'ทดสอบส่ง'}</span>
                                </button>
                                {(localIntegrationTokens.discord?.channels || []).length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveDiscordChannel(channel.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="ลบห้องนี้"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div>
                              <input
                                type="text"
                                value={channel.webhookUrl || ''}
                                onChange={(e) => handleUpdateDiscordChannel(channel.id, 'webhookUrl', e.target.value)}
                                placeholder="วาง Discord Webhook URL (เช่น https://discord.com/api/webhooks/...)"
                                className="w-full bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm rounded-xl px-3 py-2 font-mono outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                              />
                            </div>

                            {/* Option: รูปบอทเฉพาะห้องนี้ (ถ้าต้องการกำหนดแยก) */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-slate-200/60">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg overflow-hidden bg-white border border-slate-200 shrink-0 flex items-center justify-center relative shadow-2xs">
                                  {channel.botAvatarUrl ? (
                                    <img 
                                      src={formatDirectImageUrl(channel.botAvatarUrl)} 
                                      alt="Channel Bot Avatar" 
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = formatDirectImageUrl(localIntegrationTokens.discord?.botAvatarUrl) || 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=150';
                                      }}
                                    />
                                  ) : (
                                    <img 
                                      src={formatDirectImageUrl(localIntegrationTokens.discord?.botAvatarUrl) || 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=150'} 
                                      alt="Inherited Bot Avatar" 
                                      className="w-full h-full object-cover opacity-60"
                                      title="ใช้รูปหลักส่วนกลางของบอท"
                                    />
                                  )}
                                  {uploadingChannelAvatarId === channel.id && (
                                    <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white">
                                      <Loader2 size={12} className="animate-spin text-white" />
                                    </div>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-500 kanit-text sm:hidden font-medium">รูปเฉพาะห้อง:</span>
                              </div>

                              <div className="flex-1 min-w-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                <div className="relative flex-1 min-w-0">
                                  <input
                                    type="text"
                                    value={channel.botAvatarUrl || ''}
                                    onChange={(e) => handleUpdateDiscordChannel(channel.id, 'botAvatarUrl', e.target.value)}
                                    placeholder="รูปบอทเฉพาะห้อง (เว้นว่างเพื่อใช้รูปหลัก)"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 pr-7 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono transition-all"
                                  />
                                  {channel.botAvatarUrl && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateDiscordChannel(channel.id, 'botAvatarUrl', '')}
                                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                      title="ล้างรูปเฉพาะห้อง (กลับไปใช้รูปหลักส่วนกลาง)"
                                    >
                                      <X size={12} />
                                    </button>
                                  )}
                                </div>

                                <input
                                  type="file"
                                  ref={(el) => { if (el) channelAvatarInputRefs.current[channel.id] = el; }}
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                      handleUploadDiscordAvatar(e.target.files[0], channel.id);
                                      e.target.value = '';
                                    }
                                  }}
                                />

                                <button
                                  type="button"
                                  onClick={() => channelAvatarInputRefs.current[channel.id]?.click()}
                                  disabled={uploadingChannelAvatarId === channel.id}
                                  className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold text-xs kanit-text transition-all shrink-0 disabled:opacity-50"
                                  title="อัปโหลดรูปเฉพาะห้อง"
                                >
                                  <Upload size={12} /> {uploadingChannelAvatarId === channel.id ? 'อัปโหลด...' : 'อัปโหลดรูป'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* คำแนะนำวิธีสร้าง Webhook */}
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-900 kanit-text space-y-1.5">
                      <div className="font-bold flex items-center gap-1.5 text-indigo-700">
                        💡 วิธีสร้าง Discord Webhook URL (ใช้เวลาไม่ถึง 10 วินาที):
                      </div>
                      <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1 leading-relaxed">
                        <li>ในโปรแกรม Discord ให้ <b>คลิกขวาที่ชื่อห้องแชท</b> ที่ต้องการ (เช่น #pos)</li>
                        <li>เลือก <b>แก้ไขช่อง (Edit Channel)</b> &gt; เมนู <b>การผสานการทำงาน (Integrations)</b></li>
                        <li>กด <b>สร้าง Webhook (Create Webhook)</b> แล้วกด <b>คัดลอก URL ของ Webhook</b> นำมาวางในช่องด้านบน</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* 💾 ปุ่มบันทึกการตั้งค่าทั้งหมด */}
                <div className="flex flex-col sm:flex-row justify-end pt-2">
                  <button
                    data-save-btn="true"
                    onClick={saveIntegrations}
                    disabled={isSaving}
                    className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white hover:opacity-95 rounded-2xl font-bold kanit-text text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSaving && <Loader2 size={16} className="animate-spin" />}
                    <Save size={16} /> บันทึกการตั้งค่าการแจ้งเตือนทั้งหมด
                  </button>
                </div>
              </div>
            )}

            {activeSubTab === 'gdrive' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 kanit-text">เชื่อมต่อ Google Drive</h3>
                  <p className="text-slate-400 text-xs mt-1 kanit-text">ตั้งค่ารหัสโฟลเดอร์สำหรับเก็บไฟล์ภาพและเอกสารต่างๆ</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 kanit-text">Google Drive Folder ID (ทั่วไป)</label>
                    <input
                      type="text"
                      value={localGdriveTokens.generalDriveFolderId || ''}
                      onChange={(e) => setLocalGdriveTokens({ ...localGdriveTokens, generalDriveFolderId: e.target.value })}
                      placeholder="ตัวอย่าง: 1WwPiD2WQLbHK7xnFPW-GnJQj16-NrNb4"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-sky-500 focus:border-sky-500 block p-3 kanit-text outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 kanit-text">Google Drive Folder ID (เอกสาร PDPA)</label>
                    <input
                      type="text"
                      value={localGdriveTokens.pdpaDriveFolderId || ''}
                      onChange={(e) => setLocalGdriveTokens({ ...localGdriveTokens, pdpaDriveFolderId: e.target.value })}
                      placeholder="ตัวอย่าง: 1UX-E1SB7qSEq2yK9e8gBZsNj13W2F92R"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-sky-500 focus:border-sky-500 block p-3 kanit-text outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6 mt-8 flex justify-end">
                  <button
                    data-save-btn="true"
                    onClick={saveGdriveTokens}
                    disabled={isSaving}
                    className="px-8 py-3 bg-sky-500 text-white hover:bg-sky-600 rounded-2xl font-bold kanit-text text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {isSaving && <Loader2 size={16} className="animate-spin" />}
                    บันทึกการตั้งค่า GDrive
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

            {/* SUBTAB 7: CACHE & STORAGE */}
            {activeSubTab === 'cache' && (
              <div className="space-y-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 kanit-text flex items-center gap-2">
                    <Database size={20} className="text-sky-500" />
                    จัดการแคชข้อมูลในเครื่อง (IndexedDB Local Storage)
                  </h3>
                  <p className="text-slate-500 text-xs mt-1 kanit-text leading-relaxed">
                    ระบบจะทำการบันทึกข้อมูลไว้ในเครื่องของคุณอัตโนมัติ เพื่อให้เปิดหน้าเว็บได้เร็วทันใจใน 0.05 วินาที หากคุณต้องการล้างแคชในเครื่องทั้งหมดและดึงข้อมูลใหม่สดๆ จาก Supabase สามารถกดปุ่มล้างแคชด้านล่างนี้ได้ทันที
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200/60 text-amber-900 text-xs font-medium space-y-2">
                  <div className="font-bold flex items-center gap-2 text-amber-800 text-sm">
                    <AlertTriangle size={16} /> หมายเหตุเกี่ยวกับการล้างแคช
                  </div>
                  <p>• การล้างแคชในเครื่องจะทำการลบข้อมูลสำรองชั่วคราวใน IndexedDB ออกทั้งหมด</p>
                  <p>• ข้อมูลจริงบนฐานข้อมูล Supabase จะไม่สูญหาย ระบบจะทำการยิงขอโหลดข้อมูลใหม่สดๆ ทั้งหมดทันทีเมื่อรีโหลดหน้าเว็บ</p>
                </div>

                <div className="pt-2 flex justify-start">
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm('คุณต้องการล้างแคชในเครื่องทั้งหมด และรีโหลดหน้าเว็บเพื่อดึงข้อมูลใหม่สดๆ ใช่หรือไม่?')) {
                        await clearAllLocalStores();
                        showToast('ล้างแคชในเครื่องเรียบร้อยแล้ว กำลังรีโหลดระบบ...', 'success');
                        setTimeout(() => window.location.reload(), 1200);
                      }
                    }}
                    className="px-6 py-3.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold kanit-text text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2.5 active:scale-95"
                  >
                    <RotateCcw size={18} />
                    ล้างแคชในเครื่องทั้งหมด (Force Purge & Full Re-sync)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal แจ้งเตือนเมื่อมีข้อมูลการเชื่อมต่อที่ยังไม่บันทึกก่อนสลับแท็บย่อย */}
      {subTabUnsavedModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-4 border border-amber-200/60 shadow-xs">
              <AlertTriangle size={26} />
            </div>
            <h3 className="text-lg font-black text-slate-800 text-center kanit-text mb-2">
              มีข้อมูลที่ยังไม่ได้บันทึก!
            </h3>
            <p className="text-slate-600 text-xs sm:text-sm text-center kanit-text leading-relaxed mb-6">
              คุณมีการแก้ไขการตั้งค่าการแจ้งเตือน (บอท LINE หรือ Webhook Discord) ที่ยังไม่ได้กดบันทึก หากสลับแท็บย่อยตอนนี้ ข้อมูลที่คุณแก้ไขจะหายไป
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSubTabUnsavedModal({ isOpen: false, targetSubTab: null })}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-sm kanit-text transition-colors"
              >
                อยู่หน้านี้ต่อ
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = subTabUnsavedModal.targetSubTab;
                  setLocalIntegrationTokens(normalizeIntegrationTokens(integrationTokens));
                  setSubTabUnsavedModal({ isOpen: false, targetSubTab: null });
                  if (target) setActiveSubTab(target);
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm kanit-text transition-colors shadow-sm"
              >
                สลับแท็บ (ไม่บันทึก)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(SettingsManager);


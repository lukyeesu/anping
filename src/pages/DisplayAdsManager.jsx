import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Megaphone, Plus, Trash2, Edit3, MoveUp, MoveDown, Eye, CheckCircle2, 
  AlertCircle, Upload, Film, Image as ImageIcon, Play, Pause, 
  ExternalLink, Save, Smartphone, Monitor, Clock, 
  Sliders, RefreshCw, X, Check, Volume2, VolumeX, Building2, Copy, Sparkles, Star
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDirectImageUrl } from '../lib/notificationHub';
import { formatMediaUrl, preloadAllAdsMedia, isYouTubeUrl, getYouTubeVideoId } from '../lib/customerDisplayMediaCache';
import { createAdsSyncHub } from '../lib/customerDisplaySync';
import { rAFThrottle } from '../global/helpers';
import { formatThaiTypography, TAG_STYLE_CATEGORIES, ALL_TAG_SHADES, getTagBadgeStyle, getTagBadgeClass, TAG_TEXT_COLOR_SWATCHES, TAG_TEXT_STROKE_OPTIONS, TAG_TEXT_SHADOW_OPTIONS } from '../utils/thaiTypography';

// iOS-style Smooth Toggle Switch Component
const ToggleSwitch = ({ checked, onChange, disabled = false, size = 'md', activeColor = 'bg-sky-500' }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) onChange(!checked);
    }}
    className={`relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
      size === 'sm' ? 'h-5 w-9' : 'h-6 w-11'
    } ${checked ? activeColor : 'bg-slate-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <span
      aria-hidden="true"
      className={`pointer-events-none inline-block rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
        size === 'sm' 
          ? `h-4 w-4 mt-0.5 transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}` 
          : `h-5 w-5 mt-0.5 transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`
      }`}
    />
  </button>
);

// Default curated promotional set for Anping Clinic
export const DEFAULT_CLINIC_ADS = [
  {
    id: 'ad_default_1',
    type: 'image',
    title: 'ฝังเข็มปรับสมดุลร่างกาย & คลายปวดเรื้อรัง',
    subtitle: 'ศาสตร์การแพทย์แผนจีนดูแลลึกถึงต้นเหตุ ปรับสมดุลหยิน-หยาง หลับสบาย ไร้กังวล',
    tag: 'ยอดนิยม (POPULAR)',
    tagColor: 'minimal_crystal_frost',
    url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1600&q=80',
    duration: 8,
    autoVideoEnd: true,
    objectFit: 'cover',
    showBottomOverlay: true,
    showBrandHeader: true,
    showClock: true,
    isSpecial: false,
    isActive: true,
    order: 1
  },
  {
    id: 'ad_default_2',
    type: 'image',
    title: 'ครอบแก้ว กระตุ้นการไหลเวียนโลหิต (Cupping Therapy)',
    subtitle: 'ขับพิษ ขับลม คลายกล้ามเนื้อตึงสะสม จากการทำงาน Office Syndrome',
    tag: 'โปรโมชั่นพิเศษ',
    tagColor: 'gold_metallic_gleam',
    url: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1600&q=80',
    duration: 8,
    autoVideoEnd: true,
    objectFit: 'cover',
    showBottomOverlay: true,
    showBrandHeader: true,
    showClock: true,
    isSpecial: true,
    isActive: true,
    order: 2
  },
  {
    id: 'ad_default_3',
    type: 'image',
    title: 'ยาสมุนไพรจีนคัดเกรดพรีเมียม (Herbal Medicine)',
    subtitle: 'จัดยาเฉพาะบุคคลโดยแพทย์แผนจีนผู้เชี่ยวชาญ บำรุงร่างกายและฟื้นฟูอวัยวะภายใน',
    tag: 'เกรดการแพทย์',
    tagColor: 'gold_imperial_24k',
    url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1600&q=80',
    duration: 8,
    autoVideoEnd: true,
    objectFit: 'cover',
    showBottomOverlay: true,
    showBrandHeader: true,
    showClock: true,
    isSpecial: true,
    isActive: true,
    order: 3
  },
  {
    id: 'ad_default_4',
    type: 'image',
    title: 'นวดทุยหนา & จัดกระดูกกล้ามเนื้อ (Tuina Therapy)',
    subtitle: 'คลายพังผืด ปรับแนวโครงสร้างร่างกาย คลายจุดปวดกล้ามเนื้อโดยแพทย์แผนจีน',
    tag: 'แนะนำสำหรับวัยทำงาน',
    tagColor: 'promo_fire_red',
    url: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&w=1600&q=80',
    duration: 8,
    autoVideoEnd: true,
    objectFit: 'cover',
    showBottomOverlay: true,
    showBrandHeader: true,
    showClock: true,
    isSpecial: false,
    isActive: true,
    order: 4
  }
];

export default function DisplayAdsManager({
  gdriveTokens = {},
  callAppScript,
  showToast,
  showGlobalAlert,
  branchesData = [],
  currentBranch = 'b1'
}) {
  // Branch Selection & Isolation
  const [selectedBranch, setSelectedBranch] = useState(() => {
    if (currentBranch && currentBranch !== 'all') return currentBranch;
    if (Array.isArray(branchesData) && branchesData.length > 0) return branchesData[0].id;
    return 'b1';
  });

  const [branchAds, setBranchAds] = useState({});
  const [ads, setAds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const adsSyncHubRef = useRef(null);

  // Sync selectedBranch when currentBranch prop changes
  useEffect(() => {
    if (currentBranch && currentBranch !== 'all') {
      setSelectedBranch(currentBranch);
    }
  }, [currentBranch]);

  // Current active branch object
  const currentBranchObj = useMemo(() => {
    return (branchesData || []).find(b => String(b.id) === String(selectedBranch)) || branchesData?.[0] || null;
  }, [branchesData, selectedBranch]);

  const activeBranchLogo = currentBranchObj?.logo;
  const activeBranchName = currentBranchObj?.name || (selectedBranch === 'b1' ? 'สาขาหลัก' : `สาขา ${selectedBranch}`);
  const activeClinicName = currentBranchObj?.clinicRegName || currentBranchObj?.clinic_reg_name || 'อันผิงคลินิกแพทย์แผนจีน';

  // Display general settings
  const [generalSettings, setGeneralSettings] = useState({
    transitionDuration: 0.8,
    chimeEnabled: true,
    defaultDisplayMode: 'cover'
  });

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [activeStyleTab, setActiveStyleTab] = useState('luxury_gold');
  const [adFilter, setAdFilter] = useState('all'); // 'all' | 'special'
  const [modalForm, setModalForm] = useState({
    type: 'image',
    title: '',
    subtitle: '',
    tag: 'โปรโมชั่น',
    tagColor: 'gold_royal_metallic',
    customTextColor: '',
    customTextStroke: 'none',
    customTextShadow: 'none',
    url: '',
    duration: 8,
    autoVideoEnd: true,
    objectFit: 'cover',
    showBottomOverlay: true,
    showBrandHeader: true,
    showLogo: true,
    showClinicName: true,
    showClock: true,
    enableAudio: false,
    isActive: true,
    applyToAllBranches: false
  });

  // Live Preview States
  const [previewAspect, setPreviewAspect] = useState('4:3'); // '4:3' (iPad) or '16:9' (Widescreen)
  const [previewCurrentIndex, setPreviewCurrentIndex] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);
  const [previewMuted, setPreviewMuted] = useState(true);
  const [slideTimerProgress, setSlideTimerProgress] = useState(0);

  const fileInputRef = useRef(null);
  const previewTimerRef = useRef(null);
  const previewVideoRef = useRef(null);
  const headerRef = useRef(null);

  // Sticky header scroll listener
  useEffect(() => {
    const mainElement = document.getElementById('main-scroll-container');

    const handleScroll = rAFThrottle((e) => {
      if (!headerRef.current) return;
      const target = e?.target || mainElement;
      const scrollTop = target?.scrollTop ?? window?.scrollY ?? 0;
      
      if (scrollTop > 20) {
        headerRef.current.classList.add('is-scrolled');
      } else {
        headerRef.current.classList.remove('is-scrolled');
      }
    });

    if (mainElement) {
      mainElement.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (mainElement) mainElement.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Load Ads from Supabase or LocalStorage & Subscribe to Realtime Sync Hub
  useEffect(() => {
    let isCancelled = false;

    const loadAdsData = async () => {
      setIsLoading(true);
      let loadedBranchAds = {};
      let loadedSettings = generalSettings;

      try {
        // 1. Try LocalStorage for instant 0ms render
        if (typeof window !== 'undefined' && window.localStorage) {
          const cached = localStorage.getItem('clinic_customer_display_ads');
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (parsed?.branchAds && typeof parsed.branchAds === 'object') {
                loadedBranchAds = parsed.branchAds;
              } else if (parsed?.ads && Array.isArray(parsed.ads)) {
                loadedBranchAds = { [selectedBranch]: parsed.ads, 'b1': parsed.ads };
              }
              if (parsed?.generalSettings) {
                loadedSettings = parsed.generalSettings;
                setGeneralSettings(parsed.generalSettings);
              }
            } catch (e) {}
          }
        }

        // 2. Fetch from Supabase settings table (id: 'customer_display_ads')
        if (supabase) {
          const { data, error } = await supabase
            .from('settings')
            .select('values')
            .eq('id', 'customer_display_ads')
            .maybeSingle();

          if (!error && data?.values) {
            const vals = data.values;
            if (vals.branchAds && typeof vals.branchAds === 'object') {
              loadedBranchAds = vals.branchAds;
            } else if (Array.isArray(vals.ads) && vals.ads.length > 0) {
              loadedBranchAds = { [selectedBranch]: vals.ads, 'b1': vals.ads };
            }

            if (vals.generalSettings) {
              setGeneralSettings(vals.generalSettings);
            }
          }
        }

        // If no ads for b1, populate defaults
        if (!loadedBranchAds['b1'] || loadedBranchAds['b1'].length === 0) {
          loadedBranchAds['b1'] = DEFAULT_CLINIC_ADS;
        }

        if (!isCancelled) {
          setBranchAds(loadedBranchAds);
          const currentList = loadedBranchAds[selectedBranch] || loadedBranchAds['b1'] || DEFAULT_CLINIC_ADS;
          setAds(currentList);

          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem('clinic_customer_display_ads', JSON.stringify({
              branchAds: loadedBranchAds,
              generalSettings: loadedSettings
            }));
            localStorage.setItem(`clinic_customer_display_ads_${selectedBranch}`, JSON.stringify(currentList));
          }
        }
      } catch (err) {
        console.error('Error loading ads data:', err);
        if (!isCancelled) {
          setBranchAds({ b1: DEFAULT_CLINIC_ADS });
          setAds(DEFAULT_CLINIC_ADS);
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    loadAdsData();

    // 3. Connect to Realtime Ads Sync Hub (BroadcastChannel + Supabase Realtime WebSocket)
    adsSyncHubRef.current = createAdsSyncHub((event) => {
      if (isCancelled || !event) return;

      if (event.allBranchAds && typeof event.allBranchAds === 'object') {
        setBranchAds(event.allBranchAds);
        if (event.allBranchAds[selectedBranch]) {
          setAds(event.allBranchAds[selectedBranch]);
        }
      } else if (event.branchId && Array.isArray(event.ads)) {
        setBranchAds(prev => ({
          ...prev,
          [event.branchId]: event.ads
        }));
        if (event.branchId === selectedBranch) {
          setAds(event.ads);
        }
      }
    });

    return () => {
      isCancelled = true;
      if (adsSyncHubRef.current) {
        adsSyncHubRef.current.close();
      }
    };
  }, []);

  // Switch Branch
  const handleSelectBranch = (bId) => {
    setSelectedBranch(bId);
    setPreviewCurrentIndex(0);
    const targetList = branchAds[bId] || branchAds['b1'] || DEFAULT_CLINIC_ADS;
    setAds(targetList);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(`clinic_customer_display_ads_${bId}`, JSON.stringify(targetList));
    }
  };

  // Filter active ads for preview
  const activeAds = useMemo(() => {
    return ads.filter(ad => ad.isActive);
  }, [ads]);

  // Displayed ads list
  const displayedAds = ads;

  // Live preview carousel ticker
  useEffect(() => {
    if (!isPreviewPlaying || activeAds.length <= 1) {
      setSlideTimerProgress(0);
      return;
    }

    const currentAd = activeAds[previewCurrentIndex] || activeAds[0];
    if (!currentAd) return;

    const durationSec = currentAd.duration || 8;
    const intervalMs = 100;
    const totalSteps = (durationSec * 1000) / intervalMs;
    let currentStep = 0;

    setSlideTimerProgress(0);

    const timer = setInterval(() => {
      currentStep++;
      const progress = Math.min(100, (currentStep / totalSteps) * 100);
      setSlideTimerProgress(progress);

      if (currentStep >= totalSteps) {
        setPreviewCurrentIndex(prev => (prev + 1) % activeAds.length);
        setSlideTimerProgress(0);
        currentStep = 0;
      }
    }, intervalMs);

    previewTimerRef.current = timer;

    return () => {
      clearInterval(timer);
    };
  }, [isPreviewPlaying, previewCurrentIndex, activeAds]);

  // Handle Save All Settings for selectedBranch with Real-Time Broadcast
  const handleSaveAds = async (updatedAds = ads, updatedSettings = generalSettings, applyToAllBranches = false) => {
    setIsSaving(true);

    let nextBranchAds;
    if (applyToAllBranches) {
      nextBranchAds = { ...branchAds };
      (branchesData.length > 0 ? branchesData : [{ id: 'b1' }]).forEach(b => {
        nextBranchAds[b.id] = updatedAds;
      });
    } else {
      nextBranchAds = {
        ...branchAds,
        [selectedBranch]: updatedAds
      };
    }

    setBranchAds(nextBranchAds);
    setAds(updatedAds);

    const payload = {
      branchAds: nextBranchAds,
      ads: updatedAds,
      generalSettings: updatedSettings,
      updated_at: new Date().toISOString()
    };

    try {
      // 1. LocalStorage (0ms immediate)
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('clinic_customer_display_ads', JSON.stringify(payload));
        localStorage.setItem(`clinic_customer_display_ads_${selectedBranch}`, JSON.stringify(updatedAds));
        if (applyToAllBranches) {
          Object.keys(nextBranchAds).forEach(bId => {
            localStorage.setItem(`clinic_customer_display_ads_${bId}`, JSON.stringify(nextBranchAds[bId]));
          });
        }
      }

      // 2. Real-Time Broadcast to all Customer Displays & Display Manager tabs
      if (adsSyncHubRef.current) {
        adsSyncHubRef.current.broadcastAdsUpdate(
          applyToAllBranches ? 'all' : selectedBranch,
          updatedAds,
          nextBranchAds
        );
      }

      // 3. Supabase Settings Table
      if (supabase) {
        const { error } = await supabase
          .from('settings')
          .upsert({
            id: 'customer_display_ads',
            values: payload,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });

        if (error) console.error('Supabase error saving ads:', error);
      }

      // 4. Google Apps Script backup
      if (typeof callAppScript === 'function') {
        callAppScript('SAVE_DATA', 'Settings', {
          id: 'customer_display_ads',
          values: payload
        }).catch(err => console.warn('AppScript save error:', err));
      }

      // 5. Preload in CacheStorage in background
      preloadAllAdsMedia(updatedAds).catch(() => {});

      showToast?.('บันทึกการตั้งค่าสื่อโฆษณาเรียบร้อยแล้ว', 'success');
    } catch (err) {
      console.error('Error saving ads:', err);
      showToast?.('เกิดข้อผิดพลาดในการบันทึกสื่อ', 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  // Quick copy from another branch
  const handleCopyFromBranch = (fromBranchId) => {
    const sourceAds = branchAds[fromBranchId] || [];
    if (sourceAds.length === 0) {
      showToast?.('ไม่พบสื่อในสาขาต้นทาง', 'warning');
      return;
    }
    const cloned = sourceAds.map(a => ({
      ...a,
      id: `ad_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    }));
    setAds(cloned);
    handleSaveAds(cloned);
    showToast?.(`คัดลอกสื่อ ${cloned.length} รายการมายังสาขานี้เรียบร้อย`, 'success');
  };

  // Open modal to add new ad
  const handleOpenAddModal = () => {
    setEditingAd(null);
    setModalForm({
      type: 'image',
      title: '',
      subtitle: '',
      tag: 'โปรโมชั่น',
      tagColor: 'gold_royal_metallic',
      customTextColor: '',
      customTextStroke: 'none',
      customTextShadow: 'none',
      url: '',
      duration: 8,
      autoVideoEnd: true,
      objectFit: 'cover',
      showBottomOverlay: true,
      showBrandHeader: true,
      showLogo: true,
      showClinicName: true,
      showClock: true,
      enableAudio: false,
      isActive: true,
      applyToAllBranches: false
    });
    setActiveStyleTab('luxury_gold');
    setModalOpen(true);
  };

  // Open modal to edit existing ad
  const handleOpenEditModal = (ad) => {
    setEditingAd(ad);
    const chosenTagColor = ad.tagColor || 'gold_royal_metallic';
    setModalForm({
      type: ad.type || 'image',
      title: ad.title || '',
      subtitle: ad.subtitle || '',
      tag: ad.tag || '',
      tagColor: chosenTagColor,
      customTextColor: ad.customTextColor || '',
      customTextStroke: ad.customTextStroke || 'none',
      customTextShadow: ad.customTextShadow || 'none',
      url: ad.url || '',
      duration: ad.duration || 8,
      autoVideoEnd: ad.autoVideoEnd ?? true,
      objectFit: ad.objectFit || 'cover',
      showBottomOverlay: ad.showBottomOverlay ?? true,
      showBrandHeader: ad.showBrandHeader ?? true,
      showLogo: ad.showLogo ?? (ad.showBrandHeader ?? true),
      showClinicName: ad.showClinicName ?? (ad.showBrandHeader ?? true),
      showClock: ad.showClock ?? true,
      enableAudio: ad.enableAudio ?? false,
      isActive: ad.isActive ?? true,
      applyToAllBranches: false
    });
    // Sync category tab with the ad's tagColor
    const parentCat = TAG_STYLE_CATEGORIES.find(c => c.shades.some(s => s.id === chosenTagColor));
    setActiveStyleTab(parentCat?.id || 'luxury_gold');
    setModalOpen(true);
  };

  // File Upload to Google Drive (General folder)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      showToast?.('กรุณาเลือกไฟล์รูปภาพ (JPG/PNG/WEBP) หรือคลิปวิดีโอ (MP4/WebM)', 'warning');
      return;
    }

    // Size limit check: 25MB for video, 8MB for image
    const maxSizeBytes = isVideo ? 25 * 1024 * 1024 : 8 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      showToast?.(`ขนาดไฟล์ใหญ่เกินไป (จำกัดไม่เกิน ${isVideo ? '25MB' : '8MB'})`, 'warning');
      return;
    }

    const folderId = gdriveTokens?.generalDriveFolderId;
    if (!folderId) {
      showToast?.('ยังไม่ได้ระบุ Google Drive Folder ID (ทั่วไป) ในหน้าตั้งค่าระบบ', 'warning');
    }

    setIsUploading(true);
    setUploadProgressText(`กำลังเตรียมไฟล์ ${file.name}...`);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result?.split(',')[1];
      if (!base64Data) {
        setIsUploading(false);
        showToast?.('ไม่สามารถอ่านไฟล์ได้', 'warning');
        return;
      }

      setUploadProgressText('กำลังอัปโหลดไปยัง Google Drive (Zero-Egress)...');

      try {
        if (typeof callAppScript === 'function') {
          const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
          const fileName = `ADS_${Date.now()}_${sanitizedName}`;

          const response = await callAppScript('UPLOAD_FILE', 'Settings', {
            fileName,
            mimeType: file.type,
            data: base64Data,
            folderId: folderId || undefined
          });

          if (response?.status === 'success' && response.fileUrl) {
            const directUrl = isVideo 
              ? formatMediaUrl(response.fileUrl, 'video')
              : formatDirectImageUrl(response.fileUrl);
            setModalForm(prev => ({
              ...prev,
              url: directUrl,
              type: isVideo ? 'video' : 'image'
            }));
            showToast?.('อัปโหลดไฟล์ขึ้น Google Drive สำเร็จ!', 'success');
          } else {
            throw new Error(response?.message || 'ไม่ได้รับ URL จาก Google Apps Script');
          }
        } else {
          // Fallback: create data URL for demo/offline preview
          setModalForm(prev => ({
            ...prev,
            url: reader.result,
            type: isVideo ? 'video' : 'image'
          }));
          showToast?.('โหลดไฟล์ในเครื่องเรียบร้อย (ระบบออฟไลน์)', 'info');
        }
      } catch (err) {
        console.error('Upload error:', err);
        showToast?.(`เกิดข้อผิดพลาดในการอัปโหลด: ${err.message || 'กรุณาลองใหม่'}`, 'warning');
      } finally {
        setIsUploading(false);
        setUploadProgressText('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      setIsUploading(false);
      showToast?.('เกิดข้อผิดพลาดในการอ่านไฟล์', 'warning');
    };

    reader.readAsDataURL(file);
  };

  // Submit Ad Modal Form
  const handleSaveModalForm = () => {
    if (!modalForm.url || !modalForm.url.trim()) {
      showToast?.('กรุณาอัปโหลดไฟล์สื่อ หรือใส่ลิงก์ URL สื่อโฆษณา', 'warning');
      return;
    }

    let updatedList;
    if (editingAd) {
      updatedList = ads.map(a => a.id === editingAd.id ? {
        ...a,
        ...modalForm,
        url: modalForm.url.trim(),
        title: modalForm.title.trim(),
        subtitle: modalForm.subtitle.trim(),
        tagColor: modalForm.tagColor || 'gold_royal_metallic',
        customTextColor: modalForm.customTextColor || '',
        customTextStroke: modalForm.customTextStroke || 'none',
        customTextShadow: modalForm.customTextShadow || 'none',
        showBottomOverlay: modalForm.showBottomOverlay ?? true,
        showBrandHeader: modalForm.showBrandHeader ?? true,
        showLogo: modalForm.showLogo ?? true,
        showClinicName: modalForm.showClinicName ?? true,
        showClock: modalForm.showClock ?? true,
        enableAudio: modalForm.type === 'video' ? (modalForm.enableAudio ?? false) : false
      } : a);
      showToast?.('แก้ไขสื่อโฆษณาสำเร็จ', 'success');
    } else {
      const newAd = {
        id: `ad_${Date.now()}`,
        ...modalForm,
        url: modalForm.url.trim(),
        title: modalForm.title.trim(),
        subtitle: modalForm.subtitle.trim(),
        tagColor: modalForm.tagColor || 'gold_royal_metallic',
        customTextColor: modalForm.customTextColor || '',
        customTextStroke: modalForm.customTextStroke || 'none',
        customTextShadow: modalForm.customTextShadow || 'none',
        showBottomOverlay: modalForm.showBottomOverlay ?? true,
        showBrandHeader: modalForm.showBrandHeader ?? true,
        showLogo: modalForm.showLogo ?? true,
        showClinicName: modalForm.showClinicName ?? true,
        showClock: modalForm.showClock ?? true,
        enableAudio: modalForm.type === 'video' ? (modalForm.enableAudio ?? false) : false,
        order: ads.length + 1
      };
      updatedList = [...ads, newAd];
      showToast?.('เพิ่มสื่อโฆษณาใหม่สำเร็จ', 'success');
    }

    setAds(updatedList);
    setModalOpen(false);
    handleSaveAds(updatedList, generalSettings, Boolean(modalForm.applyToAllBranches));
  };

  // Delete Ad
  const handleDeleteAd = (ad) => {
    const performDelete = () => {
      const updatedList = ads.filter(a => a.id !== ad.id);
      setAds(updatedList);
      handleSaveAds(updatedList);
      showToast?.('ลบสื่อโฆษณาเรียบร้อย', 'info');
    };

    if (typeof showGlobalAlert === 'function') {
      showGlobalAlert({
        type: 'danger',
        title: 'ยืนยันการลบสื่อโฆษณา',
        text: `คุณต้องการลบ "${ad.title || 'สื่อนี้'}" ออกจากจอแสดงผลหรือไม่?`,
        onConfirm: performDelete
      });
    } else {
      if (window.confirm(`ยืนยันการลบ "${ad.title || 'สื่อนี้'}" หรือไม่?`)) {
        performDelete();
      }
    }
  };

  // Toggle Active Status
  const handleToggleActive = (id) => {
    const updated = ads.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a);
    setAds(updated);
    handleSaveAds(updated);
  };

  // Move Order
  const handleMoveOrder = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= ads.length) return;

    const updated = [...ads];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // re-assign orders
    const reordered = updated.map((item, idx) => ({ ...item, order: idx + 1 }));
    setAds(reordered);
    handleSaveAds(reordered);
  };

  return (
    <div className="fade-in pb-10 relative flex flex-col h-full w-full kanit-text">
      {/* 1. Sticky Header Bar */}
      <div 
        ref={headerRef} 
        className="sticky z-30 w-full pointer-events-none transition-all duration-300 ease-in-out flex flex-col" 
        style={{ top: 'var(--mobile-header-offset, 0px)' }}
      >
        <div className="w-full pointer-events-auto sticky-header-bg shrink-0">
          <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 flex flex-wrap justify-between items-center gap-3 sticky-header-inner py-3 sm:py-4">
            <div className="flex flex-col items-start min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 kanit-text tracking-tight flex items-center gap-2 leading-none sticky-header-title">
                <Megaphone className="w-5 h-5 sm:w-6 sm:h-6 text-sky-500 shrink-0" />
                <span>จัดการสื่อโฆษณาบนจอลูกค้า</span>
                {/* แสดงผลแนวนอนบน Desktop */}
                <span className="hidden sm:inline-flex text-xs sm:text-sm font-medium text-slate-400 ml-2 bg-slate-100 px-2 py-1 rounded-lg">Digital Signage</span>
              </h1>
              {/* แสดงผลบรรทัดล่างบน Mobile */}
              <span className="sm:hidden text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md mt-1.5 ml-7">Digital Signage</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Branch Selector Tabs */}
              {branchesData && branchesData.length > 1 && (
                <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100/90 border border-slate-200/80 mr-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-500 ml-1.5 shrink-0" />
                  <span className="text-[11px] font-semibold text-slate-500 mr-1 hidden sm:inline">สาขา:</span>
                  {branchesData.map(b => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleSelectBranch(b.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        selectedBranch === b.id 
                          ? 'bg-white text-sky-700 shadow-2xs border border-slate-200/80 font-bold' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      {b.logo && (
                        <img src={formatDirectImageUrl(b.logo) || b.logo} alt="" className="w-3.5 h-3.5 rounded-full object-cover shrink-0" />
                      )}
                      <span>{b.name || b.id}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedBranch === b.id ? 'bg-sky-100 text-sky-700' : 'bg-slate-200/70 text-slate-500'}`}>
                        {(branchAds[b.id] || (b.id === 'b1' ? ads : []))?.length || 0}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => window.open(`/customer-display?station=station_1&branch=${selectedBranch}`, '_blank')}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-sky-600 hover:bg-sky-50 hover:border-sky-200 shadow-2xs text-xs sm:text-sm font-medium transition-all"
                title="เปิดหน้าจอลูกค้าจริงบนแท็บใหม่"
              >
                <ExternalLink className="w-4 h-4 text-sky-500" />
                <span>เปิดหน้าจอลูกค้า</span>
              </button>

              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 active:scale-95 text-white shadow-sm shadow-sky-500/25 text-xs sm:text-sm font-medium transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มสื่อโฆษณา</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full mx-auto px-4 md:px-8 2xl:px-12 mt-5 mb-0 relative z-20 pointer-events-auto">
        {/* Two-Column Layout: Left (Ad Cards) & Right (Live iPad Preview) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Ads Management Cards (7 Cols on large screen) */}
        <div className="lg:col-span-7 space-y-4 order-2 lg:order-1">
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-sm sm:text-base font-bold text-slate-700 flex items-center gap-2">
              <span>รายการสื่อประชาสัมพันธ์</span>
              {branchesData && branchesData.length > 1 && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200/80">
                  {activeBranchName}
                </span>
              )}
              <span className="text-xs font-normal text-slate-400">({ads.length} รายการ • กำลังแสดงผล {activeAds.length} รายการ)</span>
            </h2>

            {/* Quick copy from another branch if multiple branches exist */}
            {branchesData && branchesData.length > 1 && (
              <div className="flex items-center gap-2">
                {branchesData.filter(b => b.id !== selectedBranch).map(sourceBranch => (
                  <button
                    key={sourceBranch.id}
                    type="button"
                    onClick={() => handleCopyFromBranch(sourceBranch.id)}
                    className="text-[11px] text-slate-500 hover:text-sky-600 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-sky-50 flex items-center gap-1 transition-all"
                    title={`คัดลอกสื่อจาก ${sourceBranch.name}`}
                  >
                    <Copy className="w-3 h-3 text-slate-400" />
                    <span>คัดลอกจาก {sourceBranch.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-500" />
              <span>กำลังโหลดข้อมูลสื่อ...</span>
            </div>
          ) : ads.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center">
              <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-700 text-base mb-1">ยังไม่มีสื่อโฆษณาใน {activeBranchName}</h3>
              <p className="text-xs text-slate-400 mb-5 max-w-sm mx-auto">
                สาขานี้ยังไม่มีการเพิ่มสื่อโฆษณา คุณสามารถเริ่มสร้างสื่อใหม่ หรือคัดลอกจากสาขาอื่นได้ทันที
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-500/20 hover:bg-sky-600 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> เพิ่มสื่อใหม่ของสาขานี้
                </button>
                {branchesData.filter(b => b.id !== selectedBranch).map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleCopyFromBranch(b.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium transition-all cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>คัดลอกจาก {b.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedAds.map((ad) => {
                const originalIndex = ads.findIndex(a => a.id === ad.id);
                const isVideo = ad.type === 'video';
                const formattedUrl = formatMediaUrl(ad.url, ad.type);

                return (
                  <div
                    key={ad.id || originalIndex}
                    className={`group bg-white rounded-2xl border transition-all p-3.5 sm:p-4 shadow-sm hover:shadow-md ${
                      ad.isSpecial ? 'border-amber-300/80 ring-1 ring-amber-300/40 bg-amber-50/10' :
                      ad.isActive ? 'border-slate-200/90' : 'border-slate-200/50 opacity-60 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                      {/* Order Controls */}
                      <div className="flex flex-col items-center justify-center gap-0.5 shrink-0">
                        <button
                          onClick={() => handleMoveOrder(originalIndex, -1)}
                          disabled={originalIndex <= 0}
                          className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center transition-colors"
                          title="เลื่อนขึ้น"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold text-slate-500 font-mono">#{originalIndex + 1}</span>
                        <button
                          onClick={() => handleMoveOrder(originalIndex, 1)}
                          disabled={originalIndex >= ads.length - 1}
                          className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center transition-colors"
                          title="เลื่อนลง"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Thumbnail Preview */}
                      <div className="w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden bg-slate-100 relative shrink-0 border border-slate-100">
                        {isYouTubeUrl(ad.url) ? (
                          <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white relative">
                            <img
                              src={`https://img.youtube.com/vi/${getYouTubeVideoId(ad.url)}/hqdefault.jpg`}
                              alt={ad.title || 'YouTube Video'}
                              className="w-full h-full object-cover opacity-80"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Play className="w-5 h-5 text-rose-500 fill-rose-500 drop-shadow" />
                            </div>
                            <span className="absolute bottom-1 right-1 text-[9px] font-bold bg-rose-600 px-1 py-0.2 rounded text-white font-mono">
                              YT
                            </span>
                          </div>
                        ) : isVideo ? (
                          <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white relative">
                            <video
                              src={formattedUrl}
                              className="w-full h-full object-cover opacity-60"
                              muted
                              playsInline
                              preload="none"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Film className="w-5 h-5 text-white/90 drop-shadow" />
                            </div>
                            <span className="absolute bottom-1 right-1 text-[9px] font-bold bg-black/75 px-1 py-0.2 rounded text-white font-mono">
                              MP4
                            </span>
                          </div>
                        ) : (
                          <img
                            src={formattedUrl}
                            alt={ad.title || 'Ad Image'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=300&q=80';
                            }}
                          />
                        )}
                        <span className="absolute top-1 left-1">
                          {isVideo ? (
                            <span className="w-4 h-4 rounded-md bg-purple-600 text-white flex items-center justify-center text-[10px]">
                              🎬
                            </span>
                          ) : (
                            <span className="w-4 h-4 rounded-md bg-sky-600 text-white flex items-center justify-center text-[10px]">
                              🖼️
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Info & Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          {ad.tag && (() => {
                            const badge = getTagBadgeStyle(ad);
                            return (
                              <span 
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md inline-block shadow-xs transition-all ${badge.className}`}
                                style={badge.style}
                              >
                                {ad.tag}
                              </span>
                            );
                          })()}
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            {isVideo && ad.autoVideoEnd ? 'เล่นตามความยาวคลิป' : `${ad.duration || 8} วินาที`}
                          </span>
                          <span className="text-[10px] text-slate-400 capitalize">
                            • สัดส่วน: {ad.objectFit || 'cover'}
                          </span>
                          {isVideo && (
                            ad.enableAudio ? (
                              <span className="text-[10px] text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200/60 font-medium flex items-center gap-0.5">
                                <Volume2 className="w-3 h-3" /> มีเสียง
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 font-medium flex items-center gap-0.5">
                                <VolumeX className="w-3 h-3" /> ปิดเสียง
                              </span>
                            )
                          )}
                          {ad.showBottomOverlay === false && (
                            <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 font-medium">
                              ปิดเงาดำ
                            </span>
                          )}
                          {ad.showBrandHeader === false || (ad.showLogo === false && ad.showClinicName === false) ? (
                            <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200/60 font-medium">
                              ซ่อนแบรนด์
                            </span>
                          ) : ad.showLogo === false ? (
                            <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200/60 font-medium">
                              ซ่อนเฉพาะโลโก้
                            </span>
                          ) : ad.showClinicName === false ? (
                            <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200/60 font-medium">
                              ซ่อนเฉพาะชื่อ
                            </span>
                          ) : null}
                          {ad.showClock === false && (
                            <span className="text-[10px] text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/60 font-medium flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" /> ซ่อนนาฬิกา
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-slate-800 text-xs sm:text-sm truncate">
                          {ad.title || '(ไม่มีหัวข้อสื่อ)'}
                        </h3>
                        {ad.subtitle && (
                          <p className="text-[11px] sm:text-xs text-slate-500 truncate mt-0.5 font-normal">
                            {ad.subtitle}
                          </p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        {/* Toggle Active */}
                        <button
                          onClick={() => handleToggleActive(ad.id)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                            ad.isActive 
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                          }`}
                          title={ad.isActive ? 'คลิกเพื่อปิดใช้งาน' : 'คลิกเพื่อเปิดใช้งาน'}
                        >
                          <div className={`w-2 h-2 rounded-full ${ad.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          <span className="hidden sm:inline">{ad.isActive ? 'เปิดอยู่' : 'ปิด'}</span>
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenEditModal(ad)}
                          className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-sky-50 text-slate-600 hover:text-sky-600 flex items-center justify-center transition-colors"
                          title="แก้ไขสื่อนี้"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteAd(ad)}
                          className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 flex items-center justify-center transition-colors"
                          title="ลบสื่อนี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Live iPad / Screen Simulator Preview (5 Cols on large screen, 1st on mobile/portrait) */}
        <div className="lg:col-span-5 order-1 lg:order-2 lg:sticky lg:top-6 mb-2 lg:mb-0">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-800">Live Preview</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              {/* Aspect Ratio Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setPreviewAspect('4:3')}
                  className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                    previewAspect === '4:3' ? 'bg-white text-sky-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="สัดส่วนจอ iPad / Tablet (4:3)"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>iPad 4:3</span>
                </button>
                <button
                  onClick={() => setPreviewAspect('16:9')}
                  className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                    previewAspect === '16:9' ? 'bg-white text-sky-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="สัดส่วนจอคอมพิวเตอร์ / มอนิเตอร์ HDMI (16:9)"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>PC 16:9</span>
                </button>
              </div>
            </div>

            {/* iPad Chassis Frame */}
            <div className="relative mx-auto rounded-[2rem] bg-slate-900 p-3 shadow-2xl border-4 border-slate-800">
              {/* Front Camera dot */}
              <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-slate-700/80 z-20" />

              {/* Screen Area with Dynamic Aspect Ratio */}
              <div 
                className={`relative w-full rounded-[1.5rem] overflow-hidden bg-black select-none ${
                  previewAspect === '4:3' ? 'aspect-[4/3]' : 'aspect-[16/9]'
                }`}
              >
                {activeAds.length === 0 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                    <Megaphone className="w-10 h-10 mb-2 opacity-50" />
                    <span className="text-xs">ไม่มีสื่อที่เปิดใช้งาน</span>
                  </div>
                ) : (
                  <>
                    {/* Media Layer */}
                    {(() => {
                      const currentAd = activeAds[previewCurrentIndex] || activeAds[0];
                      const isVideo = currentAd?.type === 'video';
                      const formattedUrl = formatMediaUrl(currentAd?.url, currentAd?.type);

                      return (
                        <div className="w-full h-full relative">
                          {isVideo ? (
                            <video
                              key={formattedUrl}
                              ref={previewVideoRef}
                              src={formattedUrl}
                              className={`w-full h-full transition-all duration-700 ${
                                currentAd?.objectFit === 'contain' ? 'object-contain' : 'object-cover'
                              }`}
                              autoPlay
                              muted={previewMuted}
                              loop
                              playsInline
                            />
                          ) : (
                            <img
                              key={formattedUrl}
                              src={formattedUrl}
                              alt={currentAd?.title || 'Slide'}
                              className={`w-full h-full transition-all duration-700 ${
                                currentAd?.objectFit === 'contain' ? 'object-contain' : 'object-cover'
                              }`}
                            />
                          )}

                          {/* Subtle Top Header Edge Shadow */}
                          <div className="pointer-events-none absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-black/40 to-transparent z-10" />

                          {/* Dynamic Bottom Gradient Overlay (Auto-height strictly covering content + 5% above) */}
                          {(() => {
                            const hasText = !!(currentAd?.title || currentAd?.subtitle || currentAd?.tag);
                            const isOverlayEnabled = currentAd?.showBottomOverlay !== false;

                            if (!hasText || !isOverlayEnabled) return null;

                            // Height calculation strictly proportional to text in preview + 5% above
                            let contentEstimate = 0;
                            if (currentAd?.tag) contentEstimate += 20;
                            if (currentAd?.title) contentEstimate += 28;
                            if (currentAd?.subtitle) contentEstimate += 22;
                            const previewBottomOffset = 14;
                            const previewOverlayH = Math.round((contentEstimate + previewBottomOffset) * 1.05);

                            return (
                              <div 
                                className="pointer-events-none absolute bottom-0 left-0 right-0 transition-all duration-300 z-10"
                                style={{
                                  height: `${previewOverlayH}px`,
                                  background: 'linear-gradient(to top, rgba(0, 0, 0, 0.88) 0%, rgba(0, 0, 0, 0.72) 40%, rgba(0, 0, 0, 0.35) 75%, rgba(0, 0, 0, 0.10) 92%, rgba(0, 0, 0, 0) 100%)'
                                }}
                              />
                            );
                          })()}

                          {/* Top Header Mockup */}
                          <div className="absolute top-3 left-4 right-4 flex items-center justify-between text-white/90 z-20">
                            {currentAd?.showBrandHeader !== false && (currentAd?.showLogo !== false || currentAd?.showClinicName !== false) ? (
                              <div className="flex items-center gap-2.5">
                                {currentAd?.showLogo !== false && activeBranchLogo ? (
                                  <img 
                                    src={formatDirectImageUrl(activeBranchLogo) || activeBranchLogo} 
                                    alt="" 
                                    className="w-7 h-7 sm:w-8 sm:h-8 object-contain drop-shadow-sm shrink-0" 
                                  />
                                ) : null}
                                {currentAd?.showClinicName !== false ? (
                                  <div>
                                    <span className="text-xs sm:text-sm font-extrabold tracking-wide block leading-tight text-white drop-shadow-sm kanit-text">
                                      {activeClinicName}
                                    </span>
                                    <span className="text-[10px] text-white/80 block font-normal kanit-text">
                                      {activeBranchName}
                                    </span>
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <div className="flex-1" />
                            )}
                            <div className="flex items-center gap-1.5">
                              {isVideo && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewMuted(prev => !prev)}
                                  className="px-2 py-0.5 rounded-md bg-black/60 hover:bg-black/80 border border-white/20 text-[10px] text-white flex items-center gap-1 transition-all"
                                  title={previewMuted ? 'คลิกเพื่อลองฟังเสียง' : 'คลิกเพื่อปิดเสียง'}
                                >
                                  {previewMuted ? (
                                    <>
                                      <VolumeX className="w-3 h-3 text-white/70" />
                                      <span className="text-[9px]">ปิดเสียง</span>
                                    </>
                                  ) : (
                                    <>
                                      <Volume2 className="w-3 h-3 text-emerald-300 animate-pulse" />
                                      <span className="text-[9px] text-emerald-300">เปิดเสียง</span>
                                    </>
                                  )}
                                </button>
                              )}
                              {currentAd?.showClock !== false && (
                                <div className="px-2 py-0.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-white flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5 text-white/80" />
                                  <span className="text-[11px] font-bold font-mono text-white/90">
                                    {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Bottom Promotional Text Overlay */}
                          <div className="absolute bottom-3.5 left-4 right-4 text-white z-20" lang="th">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                              {currentAd?.tag && (() => {
                                const badge = getTagBadgeStyle(currentAd);
                                return (
                                  <span 
                                    className={`text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full inline-block kanit-text shadow-sm transition-all ${badge.className}`}
                                    style={badge.style}
                                  >
                                    {currentAd.tag}
                                  </span>
                                );
                              })()}
                            </div>
                            {currentAd?.title && (
                              <h4 
                                lang="th"
                                className="text-xs sm:text-sm font-black text-white drop-shadow-md leading-tight line-clamp-2 kanit-text"
                                style={{ textWrap: 'balance' }}
                              >
                                {formatThaiTypography(currentAd.title)}
                              </h4>
                            )}
                            {currentAd?.subtitle && (
                              <p 
                                lang="th"
                                className="text-[10px] sm:text-[11px] text-white/95 line-clamp-2 mt-0.5 font-medium leading-relaxed drop-shadow-sm kanit-text"
                                style={{ textWrap: 'pretty' }}
                              >
                                {formatThaiTypography(currentAd.subtitle)}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Slide Progress Timer Bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
                      <div 
                        className="h-full bg-sky-400 transition-all duration-100 ease-linear"
                        style={{ width: `${slideTimerProgress}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Playback Controls & Slide Indicators */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsPreviewPlaying(!isPreviewPlaying)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
                  title={isPreviewPlaying ? 'หยุดชั่วคราว' : 'เล่นต่อ'}
                >
                  {isPreviewPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>

                <span className="text-xs font-mono text-slate-500 ml-1">
                  สไลด์ {activeAds.length > 0 ? previewCurrentIndex + 1 : 0} / {activeAds.length}
                </span>
              </div>

              {/* Dots Indicator */}
              <div className="flex items-center gap-1.5">
                {activeAds.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setPreviewCurrentIndex(idx);
                      setSlideTimerProgress(0);
                    }}
                    className={`transition-all rounded-full ${
                      idx === previewCurrentIndex 
                        ? 'w-5 h-2 bg-sky-500' 
                        : 'w-2 h-2 bg-slate-200 hover:bg-slate-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Hint Notice */}
            <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span>ภาพจำลองนี้จะแสดงอัตโนมัติบนจอ iPad เมื่อไม่มีรายการชำระเงินค้างอยู่</span>
            </div>
          </div>
        </div>

      </div>
      </div>

      {/* Add / Edit Ad Modal */}
      {modalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-3 sm:p-5 md:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-6xl overflow-hidden max-h-[92vh] sm:max-h-[88vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-600 flex items-center justify-center shadow-2xs">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base sm:text-lg kanit-text">
                    {editingAd ? 'แก้ไขสื่อโฆษณา' : 'เพิ่มสื่อโฆษณาใหม่'}
                  </h3>
                  <p className="text-xs text-slate-400 font-light">
                    กำหนดไฟล์สื่อ ข้อความประชาสัมพันธ์ สไตล์ป้าย และการแสดงผลบนจอแสดงผลลูกค้า
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-9 h-9 rounded-xl hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body - 2 Columns on PC (lg:), Stacks on Mobile */}
            <div className="p-5 sm:p-6 md:p-7 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Column: Media File, Live Preview & Placement (5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Media Type Switcher */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">ประเภทของสื่อ</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setModalForm(prev => ({ ...prev, type: 'image' }))}
                        className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-all cursor-pointer ${
                          modalForm.type === 'image' 
                            ? 'border-sky-500 bg-sky-50/60 text-sky-700 shadow-sm' 
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <ImageIcon className="w-4 h-4 text-sky-500" />
                        <span>🖼️ รูปภาพ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalForm(prev => ({ ...prev, type: 'video' }))}
                        className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-all cursor-pointer ${
                          modalForm.type === 'video' && !isYouTubeUrl(modalForm.url)
                            ? 'border-purple-500 bg-purple-50/60 text-purple-700 shadow-sm' 
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Film className="w-4 h-4 text-purple-500" />
                        <span>🎬 วิดีโอ MP4</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalForm(prev => ({ ...prev, type: 'video' }))}
                        className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-all cursor-pointer ${
                          isYouTubeUrl(modalForm.url)
                            ? 'border-rose-500 bg-rose-50/60 text-rose-700 shadow-sm' 
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Play className="w-4 h-4 text-rose-500 fill-rose-500" />
                        <span>▶️ YouTube</span>
                      </button>
                    </div>
                  </div>

                  {/* Upload to Google Drive Section */}
                  <div className="p-4 rounded-2xl bg-sky-50/50 border border-sky-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5 text-sky-600" />
                        <span>อัปโหลดขึ้น Google Drive (Zero-Egress)</span>
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {modalForm.type === 'video' ? 'จำกัด 25MB' : 'จำกัด 8MB'}
                      </span>
                    </div>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept={modalForm.type === 'video' ? 'video/mp4,video/webm' : 'image/png,image/jpeg,image/webp'}
                      className="hidden"
                    />

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-white border border-sky-200 text-sky-700 hover:bg-sky-50 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isUploading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
                            <span>{uploadProgressText || 'กำลังอัปโหลด...'}</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 text-sky-600" />
                            <span>เลือกไฟล์จากเครื่องคอมพิวเตอร์</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Direct URL input fallback */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        หรือระบุ URL สื่อโดยตรง (รองรับ YouTube Unlisted, Google Drive, MP4)
                      </label>
                      <input
                        type="text"
                        value={modalForm.url}
                        onChange={(e) => {
                          const val = e.target.value;
                          setModalForm(prev => ({ 
                            ...prev, 
                            url: val,
                            type: isYouTubeUrl(val) ? 'video' : prev.type 
                          }));
                        }}
                        placeholder="https://youtu.be/... หรือ https://drive.google.com/..."
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-sky-500 font-mono text-slate-700"
                      />
                    </div>
                  </div>

                  {/* Live Media Preview Card */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-sky-600" />
                        <span>ตัวอย่างภาพสด (Live Preview)</span>
                      </span>
                      {modalForm.url && (
                        <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {isYouTubeUrl(modalForm.url) ? 'YouTube 60fps' : 'พร้อมแสดงผล'}
                        </span>
                      )}
                    </label>

                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-inner flex items-center justify-center">
                      {modalForm.url ? (
                        <>
                          {isYouTubeUrl(modalForm.url) ? (
                            <iframe
                              key={modalForm.url}
                              src={`https://www.youtube-nocookie.com/embed/${getYouTubeVideoId(modalForm.url)}?autoplay=1&mute=1&controls=1&playsinline=1`}
                              title="YouTube Preview"
                              className="w-full h-full border-0"
                              allow="autoplay; encrypted-media"
                            />
                          ) : modalForm.type === 'video' ? (
                            <video
                              key={modalForm.url}
                              src={formatMediaUrl(modalForm.url, 'video')}
                              autoPlay
                              loop
                              muted={!modalForm.enableAudio}
                              playsInline
                              className={`w-full h-full ${modalForm.objectFit === 'contain' ? 'object-contain' : 'object-cover'}`}
                            />
                          ) : (
                            <img
                              src={formatMediaUrl(modalForm.url)}
                              alt="Live Preview"
                              className={`w-full h-full ${modalForm.objectFit === 'contain' ? 'object-contain' : 'object-cover'}`}
                            />
                          )}

                          {/* Brand header preview if enabled */}
                          {(modalForm.showBrandHeader ?? true) && (modalForm.showLogo !== false || modalForm.showClinicName !== false) && (
                            <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 bg-black/40 backdrop-blur-xs px-2 py-1 rounded-lg">
                              {modalForm.showLogo !== false && (
                                activeBranchLogo ? (
                                  <img src={activeBranchLogo} alt="Logo" className="w-4 h-4 object-contain" />
                                ) : (
                                  <div className="w-4 h-4 rounded bg-sky-500 text-white text-[9px] flex items-center justify-center font-bold">AP</div>
                                )
                              )}
                              {modalForm.showClinicName !== false && (
                                <span className="text-[10px] text-white font-medium drop-shadow-xs kanit-text">{activeClinicName}</span>
                              )}
                            </div>
                          )}

                          {/* Clock preview if enabled */}
                          {modalForm.showClock !== false && (
                            <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-lg text-white text-[9px] font-mono font-bold">
                              <Clock className="w-2.5 h-2.5 text-white/80" />
                              <span>12:00</span>
                            </div>
                          )}

                          {/* Gradient overlay preview if enabled */}
                          {modalForm.showBottomOverlay && (
                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/45 to-transparent pointer-events-none" />
                          )}

                          {/* Floating text & tag badge preview */}
                          <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10">
                            {modalForm.tag?.trim() && (() => {
                              const liveBadge = getTagBadgeStyle(modalForm);
                              return (
                                <div className="mb-1">
                                  <span 
                                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block kanit-text shadow-sm ${liveBadge.className}`}
                                    style={liveBadge.style}
                                  >
                                    {modalForm.tag.trim()}
                                  </span>
                                </div>
                              );
                            })()}
                            {modalForm.title?.trim() && (
                              <p className="text-white text-xs font-bold truncate drop-shadow-xs kanit-text">
                                {modalForm.title}
                              </p>
                            )}
                            {modalForm.subtitle?.trim() && (
                              <p className="text-white/80 text-[10px] line-clamp-1 drop-shadow-xs kanit-text">
                                {modalForm.subtitle}
                              </p>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-4">
                          <div className="w-10 h-10 rounded-2xl bg-white/10 text-white/40 flex items-center justify-center mx-auto mb-2">
                            {modalForm.type === 'video' ? <Film className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                          </div>
                          <p className="text-xs text-white/60 kanit-text font-medium">ยังไม่มีไฟล์สื่อ</p>
                          <p className="text-[10px] text-white/40 mt-0.5">อัปโหลดไฟล์หรือวาง URL ด้านบนเพื่อดูตัวอย่าง</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Display Fit & Immediate Activation Switch */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">การเกลี่ยภาพ (Object Fit)</label>
                      <select
                        value={modalForm.objectFit}
                        onChange={(e) => setModalForm(prev => ({ ...prev, objectFit: e.target.value }))}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-sky-500 text-slate-800"
                      >
                        <option value="cover">เต็มจอสวยงาม (Cover)</option>
                        <option value="contain">คงสัดส่วนเดิม (Contain)</option>
                      </select>
                    </div>

                    <div className="flex flex-col justify-end">
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-xs font-bold text-slate-700">เปิดใช้งานทันที</span>
                        <ToggleSwitch
                          checked={modalForm.isActive}
                          onChange={(val) => setModalForm(prev => ({ ...prev, isActive: val }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Apply to All Branches option (if clinic has multiple branches) */}
                  {branchesData && branchesData.length > 1 && (
                    <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 transition-all flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5 kanit-text">
                          <Building2 className="w-4 h-4 text-amber-600" />
                          <span>นำไปใช้กับทุกสาขาด้วย</span>
                        </span>
                        <p className="text-[11px] text-amber-700/80 font-light leading-relaxed kanit-text">
                          เปิดเพื่อให้สื่อนี้แสดงในทุกสาขาพร้อมกัน หรือปิดเพื่อแสดงเฉพาะใน {activeBranchName}
                        </p>
                      </div>
                      <ToggleSwitch
                        checked={modalForm.applyToAllBranches ?? false}
                        onChange={(val) => setModalForm(prev => ({ ...prev, applyToAllBranches: val }))}
                        activeColor="bg-amber-500"
                      />
                    </div>
                  )}
                </div>

                {/* Right Column: Typography, Tag Styles & Display Settings (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Title & Subtitle */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">หัวข้อสื่อโฆษณา (Title)</label>
                      <input
                        type="text"
                        value={modalForm.title}
                        onChange={(e) => setModalForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="เช่น ฝังเข็มปรับสมดุล & คลายปวดเรื้อรัง"
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-sky-500 text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">คำบรรยาย / รายละเอียด (Subtitle)</label>
                      <textarea
                        rows={2}
                        value={modalForm.subtitle}
                        onChange={(e) => setModalForm(prev => ({ ...prev, subtitle: e.target.value }))}
                        placeholder="รายละเอียดโปรโมชั่น หรือจุดเด่นการรักษา..."
                        className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-sky-500 text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Tag & Duration Settings */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ป้ายกำกับ (Tag)</label>
                      <input
                        type="text"
                        value={modalForm.tag}
                        onChange={(e) => setModalForm(prev => ({ ...prev, tag: e.target.value }))}
                        placeholder="เช่น โปรโมชั่น, แนะนำ"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-sky-500 text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ระยะเวลาแสดงผล (วินาที)</label>
                      <input
                        type="number"
                        min={3}
                        max={60}
                        value={modalForm.duration}
                        onChange={(e) => setModalForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 8 }))}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-sky-500 text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Tag Badge Style & Gradient Preset Selector (3 Styles x 8 Shades = 24 Curated Shades) */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 kanit-text">
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          <span>เฉดสีและสไตล์ป้ายกำกับ (Tag Badge Style)</span>
                        </span>
                        <p className="text-[11px] text-slate-500 font-light mt-0.5">
                          เลือกจาก 3 สไตล์หลัก • แต่ละสไตล์มี 8 เฉดสีคัดสรรพิเศษ (รวม 24 เฉดสี)
                        </p>
                      </div>

                      {/* Live Badge Preview */}
                      <div className="shrink-0">
                        {(() => {
                          const liveBadge = getTagBadgeStyle(modalForm);
                          return (
                            <span 
                              className={`text-xs font-bold px-3 py-1 rounded-full inline-block kanit-text shadow-sm transition-all ${liveBadge.className}`}
                              style={liveBadge.style}
                            >
                              {modalForm.tag?.trim() || 'ป้ายตัวอย่าง'}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* 3 Style Category Tabs */}
                    <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl overflow-x-auto">
                      {TAG_STYLE_CATEGORIES.map(cat => {
                        const isActive = activeStyleTab === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setActiveStyleTab(cat.id)}
                            className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 kanit-text cursor-pointer whitespace-nowrap ${
                              isActive
                                ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                            }`}
                          >
                            <span>{cat.icon}</span>
                            <span>{cat.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${isActive ? 'bg-sky-100 text-sky-700' : 'bg-slate-200/80 text-slate-500'}`}>8</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Active Category 8 Shades Grid */}
                    {(() => {
                      const currentCategory = TAG_STYLE_CATEGORIES.find(c => c.id === activeStyleTab) || TAG_STYLE_CATEGORIES[0];
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px] text-slate-500 px-0.5">
                            <span>{currentCategory.desc}</span>
                            <span className="font-mono text-[10px] text-sky-600 font-medium">8 เฉดสีพรีเมียม</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {currentCategory.shades.map((shade) => {
                              const isSelected = (modalForm.tagColor || 'gold_royal_metallic') === shade.id;
                              return (
                                <button
                                  key={shade.id}
                                  type="button"
                                  onClick={() => setModalForm(prev => ({ ...prev, tagColor: shade.id }))}
                                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 group relative cursor-pointer ${
                                    isSelected 
                                      ? 'border-sky-500 bg-sky-50/70 ring-2 ring-sky-400/40 shadow-xs' 
                                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-100/50'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-1">
                                    <span className="text-[11px] font-bold text-slate-800 line-clamp-2 min-h-[28px] leading-tight kanit-text" title={shade.name}>
                                      {shade.name}
                                    </span>
                                    {isSelected ? (
                                      <div className="w-3.5 h-3.5 mt-0.5 rounded-full bg-sky-500 text-white flex items-center justify-center shrink-0">
                                        <Check className="w-2 h-2" />
                                      </div>
                                    ) : (
                                      <span className="text-[9px] text-slate-300 group-hover:text-slate-400 mt-0.5">●</span>
                                    )}
                                  </div>
                                  
                                  {/* Realistic gradient preview pill */}
                                  <div className="py-0.5 flex justify-center">
                                    <span 
                                      className={`w-full text-center text-[10px] font-bold px-1.5 py-0.5 rounded-md truncate transition-transform ${shade.badgeClass || ''}`}
                                      style={shade.style}
                                    >
                                      {modalForm.tag?.trim() || shade.name}
                                    </span>
                                  </div>

                                  <span className="text-[9.5px] text-slate-400 font-light line-clamp-1 leading-normal" title={shade.desc}>
                                    {shade.desc}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Typography & Text Style Customization (ขอบตัวหนังสือ, สีตัวหนังสือ, เงาตัวหนังสือ) */}
                    <div className="pt-3 border-t border-slate-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 kanit-text">
                          <Sliders className="w-3.5 h-3.5 text-sky-600" />
                          <span>ปรับแต่งตัวหนังสือเพิ่มเติม (Typography & Effects)</span>
                        </span>
                        {(modalForm.customTextColor || (modalForm.customTextStroke && modalForm.customTextStroke !== 'none') || (modalForm.customTextShadow && modalForm.customTextShadow !== 'none')) && (
                          <button
                            type="button"
                            onClick={() => setModalForm(prev => ({
                              ...prev,
                              customTextColor: '',
                              customTextStroke: 'none',
                              customTextShadow: 'none'
                            }))}
                            className="text-[11px] text-rose-500 hover:text-rose-600 font-medium cursor-pointer"
                          >
                            คืนค่าเริ่มต้นของสไตล์
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* 1. Text Color */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                            สีตัวหนังสือ (Text Color)
                          </label>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {TAG_TEXT_COLOR_SWATCHES.map((swatch, idx) => {
                              const isSelected = (modalForm.customTextColor || '') === swatch.value;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setModalForm(prev => ({ ...prev, customTextColor: swatch.value }))}
                                  title={swatch.label}
                                  className={`h-6 px-2 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                                    isSelected 
                                      ? 'border-sky-500 ring-2 ring-sky-400/40 shadow-xs' 
                                      : 'border-slate-200 hover:border-slate-300'
                                  }`}
                                  style={{
                                    backgroundColor: swatch.value || '#f1f5f9',
                                    color: swatch.value ? (swatch.value === '#000000' || swatch.value === '#2E1700' ? '#ffffff' : '#0f172a') : '#64748b'
                                  }}
                                >
                                  {swatch.value ? (
                                    <span>{swatch.label}</span>
                                  ) : (
                                    <span>เริ่มต้น</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 2. Text Stroke */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                            ขอบตัวหนังสือ (Stroke / Outline)
                          </label>
                          <select
                            value={modalForm.customTextStroke || 'none'}
                            onChange={(e) => setModalForm(prev => ({ ...prev, customTextStroke: e.target.value }))}
                            className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-white border border-slate-200 text-slate-700 focus:outline-none focus:border-sky-500 font-medium"
                          >
                            {TAG_TEXT_STROKE_OPTIONS.map(opt => (
                              <option key={opt.id} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 3. Text Shadow */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                            เงาตัวหนังสือ (Drop Shadow)
                          </label>
                          <select
                            value={modalForm.customTextShadow || 'none'}
                            onChange={(e) => setModalForm(prev => ({ ...prev, customTextShadow: e.target.value }))}
                            className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-white border border-slate-200 text-slate-700 focus:outline-none focus:border-sky-500 font-medium"
                          >
                            {TAG_TEXT_SHADOW_OPTIONS.map(opt => (
                              <option key={opt.id} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Display Presentation Options */}
                  <div className="space-y-2.5">
                    {/* Bottom Gradient Overlay Toggle */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 kanit-text">
                          <span>เงาดำไล่ระดับด้านล่าง (Bottom Gradient Overlay)</span>
                        </span>
                        <p className="text-[11px] text-slate-500 font-light leading-relaxed kanit-text">
                          เปิดเพื่อไล่ระดับเงาสีดำจากล่างขึ้นบนพอดีกับข้อความ (+5%) ช่วยให้อ่านหัวข้อชัดเจนขึ้นบนภาพสว่าง หรือปิดได้หากต้องการโชว์ภาพเต็ม 100% โดยไม่มีเงาดำ
                        </p>
                      </div>
                      <ToggleSwitch
                        checked={modalForm.showBottomOverlay ?? true}
                        onChange={(val) => setModalForm(prev => ({ ...prev, showBottomOverlay: val }))}
                      />
                    </div>

                    {/* Show/Hide Brand Header (Logo & Clinic Name) Toggle with Sub-options */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 kanit-text">
                            <Building2 className="w-4 h-4 text-emerald-600" />
                            <span>แสดง LOGO และชื่อคลินิกมุมซ้ายบน</span>
                          </span>
                          <p className="text-[11px] text-slate-500 font-light leading-relaxed kanit-text">
                            เปิดเพื่อแสดงแถบแบรนด์มุมซ้ายบน หรือเลือกปิดเฉพาะส่วนด้านล่าง
                          </p>
                        </div>
                        <ToggleSwitch
                          checked={modalForm.showBrandHeader ?? true}
                          onChange={(val) => {
                            setModalForm(prev => ({
                              ...prev,
                              showBrandHeader: val,
                              showLogo: val ? (prev.showLogo ?? true) : false,
                              showClinicName: val ? (prev.showClinicName ?? true) : false
                            }));
                          }}
                        />
                      </div>

                      {/* Sub-toggles: Selectively Toggle LOGO and Clinic Name */}
                      {(modalForm.showBrandHeader ?? true) && (
                        <div className="pt-2.5 border-t border-slate-200/70 space-y-2.5 pl-2 sm:pl-3 bg-white/60 p-2.5 rounded-xl border border-slate-100">
                          {/* Sub-toggle 1: LOGO */}
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-medium text-slate-700 flex items-center gap-2 kanit-text">
                              <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                              <span>แสดง LOGO (รูปโลโก้คลินิก)</span>
                            </span>
                            <ToggleSwitch
                              size="sm"
                              checked={modalForm.showLogo ?? true}
                              onChange={(val) => {
                                setModalForm(prev => {
                                  const newLogo = val;
                                  const newName = prev.showClinicName ?? true;
                                  return {
                                    ...prev,
                                    showLogo: newLogo,
                                    showBrandHeader: newLogo || newName
                                  };
                                });
                              }}
                            />
                          </div>

                          {/* Sub-toggle 2: Clinic Name */}
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-medium text-slate-700 flex items-center gap-2 kanit-text">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                              <span>แสดง ชื่อคลินิกและสาขา</span>
                            </span>
                            <ToggleSwitch
                              size="sm"
                              checked={modalForm.showClinicName ?? true}
                              onChange={(val) => {
                                setModalForm(prev => {
                                  const newLogo = prev.showLogo ?? true;
                                  const newName = val;
                                  return {
                                    ...prev,
                                    showClinicName: newName,
                                    showBrandHeader: newLogo || newName
                                  };
                                });
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Show/Hide Clock Toggle */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 kanit-text">
                          <Clock className="w-4 h-4 text-sky-600" />
                          <span>แสดงนาฬิกามุมขวาบน</span>
                        </span>
                        <p className="text-[11px] text-slate-500 font-light leading-relaxed kanit-text">
                          เปิดเพื่อแสดงนาฬิกาที่มุมขวาบน หรือปิดหากสื่อโฆษณานี้มีโลโก้หรือเนื้อหาสำคัญอยู่ที่มุมขวาบน เพื่อไม่ให้บังเนื้อหา
                        </p>
                      </div>
                      <ToggleSwitch
                        checked={modalForm.showClock ?? true}
                        onChange={(val) => setModalForm(prev => ({ ...prev, showClock: val }))}
                      />
                    </div>

                    {/* Video Audio Sound Toggle (Only for Video) */}
                    {modalForm.type === 'video' && (
                      <div className="p-3.5 rounded-2xl bg-sky-50/60 border border-sky-200/80 transition-all flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 kanit-text">
                            <Volume2 className="w-4 h-4 text-sky-600" />
                            <span>เปิดเสียงวิดีโอ (Video Audio)</span>
                          </span>
                          <p className="text-[11px] text-slate-500 font-light leading-relaxed kanit-text">
                            เปิดเพื่อให้วิดีโอเล่นเสียงออกลำโพงเมื่อเริ่มฉายบนหน้าจอ หรือปิดเพื่อเล่นแบบไม่มีเสียงเงียบๆ สบายๆ ในคลินิก
                          </p>
                        </div>
                        <ToggleSwitch
                          checked={modalForm.enableAudio ?? false}
                          onChange={(val) => setModalForm(prev => ({ ...prev, enableAudio: val }))}
                        />
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveModalForm}
                disabled={isUploading}
                className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 active:scale-95 text-white text-xs font-medium shadow-md shadow-sky-500/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                {editingAd ? 'บันทึกการแก้ไข' : 'เพิ่มสื่อ'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

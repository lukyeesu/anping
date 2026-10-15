// Utility functions for VIP Membership and Coupon Management

/**
 * คำนวณวันหมดอายุ VIP
 * ตามเงื่อนไข: สมัคร 1 ครั้ง จะอยู่ได้ 1 เดือน
 * เช่น สมัครวันที่ 1 ก็จะหมดวันที่ 30 หรือ 31 เที่ยงคืนก่อนถึงวันที่ 1 ของเดือนถัดไป
 * หากสมัครระหว่างเดือน จะอยู่ได้ 1 เดือนปฏิทิน
 * หากคนไข้เป็น VIP อยู่แล้วและยังไม่หมดอายุ จะต่ออายุเพิ่ม 1 เดือนจากวันหมดอายุเดิม
 */
export function calculateVipExpiry(currentExpireDate = null, months = 1) {
  let baseDate = new Date();
  
  if (currentExpireDate) {
    let cleanExpStr = currentExpireDate;
    if (typeof currentExpireDate === 'object' && currentExpireDate !== null) {
      cleanExpStr = currentExpireDate.expireDateStr || currentExpireDate.expireDate || '';
    }
    if (cleanExpStr && String(cleanExpStr).trim() !== '' && String(cleanExpStr) !== 'ตลอดชีพ' && String(cleanExpStr) !== 'ไม่มีวันหมดอายุ') {
      const existingExp = new Date(cleanExpStr);
      if (!isNaN(existingExp.getTime()) && existingExp.getTime() > baseDate.getTime()) {
        baseDate = new Date(existingExp);
      }
    }
  }

  const startDay = baseDate.getDate();
  const startMonth = baseDate.getMonth();
  const startYear = baseDate.getFullYear();

  let targetDate;

  if (startDay === 1) {
    // สมัครวันที่ 1: หมดวันสุดท้ายของเดือนนั้นพอดี (เที่ยงคืนก่อนถึงวันที่ 1 ของเดือนถัดไป)
    // new Date(year, month + months, 0) จะคืนวันสุดท้ายของเดือน
    targetDate = new Date(startYear, startMonth + months, 0, 23, 59, 59, 999);
  } else {
    // สมัครระหว่างเดือน เช่น วันที่ 15: อยู่ได้ 1 เดือน ลบ 1 วัน เช่น 15 ต.ค. -> 14 พ.ย.
    const tempMonth = startMonth + months;
    targetDate = new Date(startYear, tempMonth, startDay - 1, 23, 59, 59, 999);
    
    // ตรวจสอบกรณีเดือนเป้าหมายไม่มีวันนั้น (เช่น 31 มี.ค. -> เม.ย. มี 30 วัน)
    if (isNaN(targetDate.getTime()) || targetDate.getMonth() > (tempMonth % 12)) {
      targetDate = new Date(startYear, tempMonth + 1, 0, 23, 59, 59, 999);
    }
  }

  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;
  const thaiStr = `${dd}/${mm}/${yyyy + 543}`;

  return {
    expireDateStr: dateStr,
    expireThaiStr: thaiStr,
    expireTimestamp: targetDate.toISOString(),
    expireDateObj: targetDate,
    toString: () => dateStr,
    valueOf: () => dateStr
  };
}

/**
 * ตรวจสอบว่าคนไข้มีสถานะ VIP ที่ยังใช้งานได้อยู่หรือไม่
 */
export function isPatientVipActive(patient) {
  if (!patient) return false;
  const isVip = Boolean(patient.isVip ?? patient.is_vip);
  if (!isVip) return false;

  let expireDate = patient.vipExpireDate || patient.vip_expire_date;
  if (!expireDate) {
    // ไม่มีวันหมดอายุ ถือว่าเป็น VIP ตลอดชีพ
    return true;
  }

  if (typeof expireDate === 'object' && expireDate !== null) {
    expireDate = expireDate.expireDateStr || expireDate.expireDate || '';
  }

  const expStr = String(expireDate).trim();
  if (!expStr || expStr === 'ตลอดชีพ' || expStr === 'ไม่มีวันหมดอายุ' || expStr.toLowerCase() === 'lifetime' || expStr.startsWith('2099')) {
    return true;
  }

  try {
    const exp = new Date(expStr);
    if (isNaN(exp.getTime())) return true;
    
    // สิ้นสุดวันหมดอายุ (23:59:59)
    exp.setHours(23, 59, 59, 999);
    return exp.getTime() >= Date.now();
  } catch (e) {
    return true;
  }
}

/**
 * ดึงสถานะสรุป VIP ของคนไข้
 */
export function getPatientVipStatus(patient) {
  if (!patient) {
    return { isActive: false, label: 'ทั่วไป', color: 'slate', remainingDays: 0 };
  }

  const isActive = isPatientVipActive(patient);
  let expireDate = patient.vipExpireDate || patient.vip_expire_date;
  if (typeof expireDate === 'object' && expireDate !== null) {
    expireDate = expireDate.expireDateStr || '';
  }

  if (!isActive) {
    const wasVip = Boolean((patient.isVip ?? patient.is_vip) || expireDate);
    if (wasVip) {
      return {
        isActive: false,
        label: 'VIP หมดอายุแล้ว',
        color: 'rose',
        expireDate: expireDate || '',
        remainingDays: 0
      };
    }
    return { isActive: false, label: 'ทั่วไป', color: 'slate', remainingDays: 0 };
  }

  if (!expireDate || String(expireDate).startsWith('2099') || expireDate === 'ตลอดชีพ' || expireDate === 'ไม่มีวันหมดอายุ') {
    return {
      isActive: true,
      isLifetime: true,
      label: 'VIP ตลอดชีพ',
      color: 'amber',
      remainingDays: Infinity
    };
  }

  const exp = new Date(expireDate);
  exp.setHours(23, 59, 59, 999);
  const diffDays = Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const yyyy = exp.getFullYear();
  const mm = String(exp.getMonth() + 1).padStart(2, '0');
  const dd = String(exp.getDate()).padStart(2, '0');
  const thaiStr = `${dd}/${mm}/${yyyy + 543}`;

  return {
    isActive: true,
    isLifetime: false,
    label: `VIP (เหลือ ${diffDays} วัน)`,
    expireDate: expireDate,
    expireThaiStr: thaiStr,
    color: diffDays <= 7 ? 'amber' : 'emerald',
    remainingDays: diffDays
  };
}

/**
 * สุ่มรหัสคูปองเฉพาะ
 */
export function generateCouponCode(prefix = 'CP', hn = '') {
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  const timestamp = Date.now().toString().slice(-4);
  
  if (hn) {
    const cleanHn = hn.replace(/[^a-zA-Z0-9]/g, '').slice(-4);
    return `${prefix}-${cleanHn}-${randomChars}`;
  }
  return `${prefix}-${timestamp}-${randomChars}`;
}

/**
 * คำนวณส่วนลดจากคูปองกับยอดเงินในบิล
 */
export function calculateCouponDiscount(coupon, subtotal = 0) {
  if (!coupon || subtotal <= 0) return 0;
  
  const minSpend = Number(coupon.minSpend ?? coupon.min_spend ?? 0);
  if (minSpend > 0 && subtotal < minSpend) {
    return 0;
  }

  const discountType = coupon.discountType || coupon.discount_type || 'percent';
  const discountValue = Number(coupon.discountValue ?? coupon.discount_value ?? 0);

  if (discountType === 'percent') {
    let discount = subtotal * (discountValue / 100);
    const maxDiscount = Number(coupon.maxDiscount ?? coupon.max_discount ?? 0);
    if (maxDiscount > 0 && discount > maxDiscount) {
      discount = maxDiscount;
    }
    return Math.min(subtotal, Math.round(discount));
  } else {
    return Math.min(subtotal, discountValue);
  }
}

/**
 * ตรวจสอบความพร้อมใช้งานของคูปอง
 */
export function isCouponUsable(coupon, subtotal = 0, patientId = '', branchId = '') {
  if (!coupon || coupon.isDeleted || coupon.is_deleted) return false;
  
  const status = coupon.status || 'active';
  if (status !== 'active') return false;

  // ตรวจสอบวันหมดอายุ (ถ้าไม่ใช่ตลอดชีพ)
  const isLifetime = Boolean(coupon.isLifetime ?? coupon.is_lifetime);
  if (!isLifetime) {
    const expireDate = coupon.expireDate || coupon.expire_date;
    if (expireDate) {
      const exp = new Date(expireDate);
      exp.setHours(23, 59, 59, 999);
      if (exp.getTime() < Date.now()) {
        return false;
      }
    }
  }

  // ตรวจสอบยอดซื้อขั้นต่ำ
  const minSpend = Number(coupon.minSpend ?? coupon.min_spend ?? 0);
  if (minSpend > 0 && subtotal > 0 && subtotal < minSpend) {
    return false;
  }

  // ตรวจสอบการผูกกับคนไข้ (ถ้ามีการระบุ patientId)
  if (patientId) {
    const targetPatientId = coupon.patientId || coupon.patient_id;
    if (targetPatientId) {
      const cleanTarget = String(targetPatientId).trim().toLowerCase();
      const cleanCurrent = String(patientId).trim().toLowerCase();
      if (cleanTarget !== cleanCurrent) {
        return false;
      }
    }
  }

  // ตรวจสอบสาขาที่อนุญาต (ถ้ามีการระบุ branchId)
  if (branchId && branchId !== 'all') {
    const targetBranch = coupon.branchScope || coupon.branch_scope || coupon.branchId || coupon.branch_id || 'all';
    const allowed = Array.isArray(targetBranch) ? targetBranch : String(targetBranch).split(',').map(s => s.trim()).filter(Boolean);
    if (!allowed.includes('all') && !allowed.includes(branchId)) {
      return false;
    }
  }

  return true;
}

/**
 * ฟังก์ชันช่วยแปลงวันหมดอายุของคูปองเป็น Timestamp เพื่อเปรียบเทียบ
 * คูปองตลอดชีพจะคืนค่า Infinity (หมดอายุหลังสุด)
 */
export function getCouponExpiryTimestamp(coupon) {
  if (!coupon) return Infinity;
  if (coupon.isLifetime || coupon.is_lifetime) return Infinity;
  const exp = coupon.expireDate || coupon.expire_date;
  if (!exp || exp === 'ตลอดชีพ' || exp === 'ไม่มีวันหมดอายุ') return Infinity;
  const t = new Date(exp).getTime();
  return isNaN(t) ? Infinity : t;
}

/**
 * จัดเรียงคูปองตามลำดับความคุ้มค่าและวันหมดอายุ (Best Value First)
 * 1. คูปองที่ผ่านยอดซื้อขั้นต่ำจะอยู่ก่อน
 * 2. มูลค่าส่วนลดจริงในบิลนี้มากที่สุด (Max Savings in Baht Descending)
 * 3. หากลดเท่ากัน -> ใกล้หมดอายุมากที่สุดก่อน (Expiring Soonest Ascending)
 * 4. หากวันหมดอายุเท่ากัน -> คูปองที่สร้างก่อน (FIFO)
 */
export function sortCouponsByBestValue(couponsList = [], subtotal = 0, patientId = '', branchId = '') {
  if (!Array.isArray(couponsList) || couponsList.length === 0) return [];

  return [...couponsList].sort((a, b) => {
    // 1. ตรวจสอบเงื่อนไขยอดซื้อขั้นต่ำ
    const minA = Number(a.minSpend ?? a.min_spend ?? 0);
    const minB = Number(b.minSpend ?? b.min_spend ?? 0);
    const validMinA = subtotal <= 0 || minA <= 0 || subtotal >= minA;
    const validMinB = subtotal <= 0 || minB <= 0 || subtotal >= minB;

    if (validMinA && !validMinB) return -1;
    if (!validMinA && validMinB) return 1;

    // 2. คำนวณส่วนลดจริงในบิลปัจจุบัน
    const discA = subtotal > 0 ? calculateCouponDiscount(a, subtotal) : Number(a.discountValue ?? a.discount_value ?? 0);
    const discB = subtotal > 0 ? calculateCouponDiscount(b, subtotal) : Number(b.discountValue ?? b.discount_value ?? 0);

    if (discB !== discA) {
      return discB - discA; // ลดเยอะสุดอยู่บน
    }

    // 3. หากลดเท่ากัน -> ใบที่ใกล้หมดอายุมากที่สุดก่อน (Expiring Soonest)
    const expA = getCouponExpiryTimestamp(a);
    const expB = getCouponExpiryTimestamp(b);

    if (expA !== expB) {
      return expA - expB; // วันหมดอายุใกล้กว่าอยู่ก่อน
    }

    // 4. หากเท่ากันอีก -> ใบที่สร้างก่อนมาก่อน (FIFO)
    const createdA = new Date(a.createdAt || a.created_at || 0).getTime() || 0;
    const createdB = new Date(b.createdAt || b.created_at || 0).getTime() || 0;
    return createdA - createdB;
  });
}

/**
 * ค้นหาคูปองที่ดีที่สุดที่ลดได้เยอะที่สุดอัตโนมัติ (พร้อม Tie-breaker คูปองที่ใกล้หมดอายุที่สุด)
 */
export function findBestCoupon(couponsList = [], subtotal = 0, patientId = '', branchId = '') {
  if (!Array.isArray(couponsList) || couponsList.length === 0 || subtotal <= 0) {
    return null;
  }

  // กรองเฉพาะคูปองที่ใช้ได้จริงในบิลนี้
  const usable = couponsList.filter(coupon => isCouponUsable(coupon, subtotal, patientId, branchId));
  if (usable.length === 0) return null;

  // จัดเรียงตามลำดับความคุ้มค่าสูงสุด และใกล้หมดอายุที่สุด
  const sorted = sortCouponsByBestValue(usable, subtotal, patientId, branchId);
  const best = sorted[0];

  const discount = calculateCouponDiscount(best, subtotal);
  if (discount <= 0) return null;

  return best;
}

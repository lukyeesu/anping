/**
 * Notification Hub for Anping Clinic
 * Supports:
 * 1. LINE Messaging API Multi-Bot Failover Pool with Quota Management
 * 2. Discord Multi-Channel Webhooks (Unlimited)
 * 3. Dual Broadcast Strategy (Simultaneous / Filtered)
 */

import { supabase } from './supabase.js';

let cachedIntegrationTokens = null;

export function getCachedIntegrationTokens() {
  if (cachedIntegrationTokens) return cachedIntegrationTokens;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = localStorage.getItem('clinic_integration_tokens');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && (parsed.line || parsed.discord)) {
          cachedIntegrationTokens = parsed;
          return parsed;
        }
      }
    } catch (e) {}
  }
  return null;
}

export function setCachedIntegrationTokens(tokens) {
  if (tokens && typeof tokens === 'object') {
    cachedIntegrationTokens = tokens;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem('clinic_integration_tokens', JSON.stringify(tokens));
      } catch (e) {}
    }
  }
}

export function formatDirectImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  const gdMatch = trimmed.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)|lh3\.googleusercontent\.com\/d\/)([a-zA-Z0-9_-]+)/);
  if (gdMatch && gdMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${gdMatch[1]}`;
  }
  return trimmed;
}

export const DEFAULT_INTEGRATION_SETTINGS = {
  line: {
    enabled: true,
    recipients: [
      { id: 'rec_1', name: 'กลุ่มหลัก', chatId: '' }
    ],
    bots: [
      { id: 'bot_1', name: 'บอทตัวที่ 1', token: '', customChatId: '', usedQuota: 0, totalQuota: 300 }
    ],
    events: {
      queue: true,
      pos: true,
      opd: true,
      mr: true,
      dashboard: true
    }
  },
  discord: {
    enabled: true,
    botName: 'Anping Clinic Notifier',
    botAvatarUrl: '',
    applicationId: '',
    publicKey: '',
    botToken: '',
    channels: [
      { id: 'dc_queue', name: 'นัดหมาย 🗓️', event: 'queue', webhookUrl: '', botAvatarUrl: '' },
      { id: 'dc_pos', name: 'pos 💵', event: 'pos', webhookUrl: '', botAvatarUrl: '' },
      { id: 'dc_opd', name: 'opd 🩺', event: 'opd', webhookUrl: '', botAvatarUrl: '' },
      { id: 'dc_mr', name: 'mr 📁', event: 'mr', webhookUrl: '', botAvatarUrl: '' },
      { id: 'dc_dashboard', name: 'dashboard 🌻', event: 'dashboard', webhookUrl: '', botAvatarUrl: '' }
    ]
  }
};

export function normalizeIntegrationTokens(raw) {
  if (!raw) return DEFAULT_INTEGRATION_SETTINGS;

  // New structured format
  if (raw.line && typeof raw.line === 'object' && raw.discord && typeof raw.discord === 'object') {
    return {
      line: {
        enabled: raw.line.enabled !== false,
        recipients: Array.isArray(raw.line.recipients) && raw.line.recipients.length > 0
          ? raw.line.recipients
          : [{ id: 'rec_1', name: 'กลุ่มหลัก', chatId: raw.line.lineGroupId || raw.lineGroupId || '' }],
        bots: Array.isArray(raw.line.bots) && raw.line.bots.length > 0
          ? raw.line.bots
          : [{ id: 'bot_1', name: 'บอทตัวที่ 1', token: raw.line.token || raw.line || '', customChatId: '', usedQuota: 0, totalQuota: 300 }],
        events: {
          queue: raw.line.events?.queue !== false,
          pos: raw.line.events?.pos !== false,
          opd: raw.line.events?.opd !== false,
          mr: raw.line.events?.mr !== false,
          dashboard: raw.line.events?.dashboard !== false
        }
      },
      discord: {
        enabled: raw.discord.enabled !== false,
        botName: raw.discord.botName || 'Anping Clinic Notifier',
        botAvatarUrl: raw.discord.botAvatarUrl || '',
        applicationId: raw.discord.applicationId || '',
        publicKey: raw.discord.publicKey || '',
        botToken: raw.discord.botToken || '',
        channels: Array.isArray(raw.discord.channels) && raw.discord.channels.length > 0
          ? raw.discord.channels.map(ch => ({
              ...ch,
              botAvatarUrl: ch.botAvatarUrl || ''
            }))
          : DEFAULT_INTEGRATION_SETTINGS.discord.channels
      }
    };
  }

  // Legacy format migration
  return {
    line: {
      enabled: Boolean(raw.line),
      recipients: [
        { id: 'rec_1', name: 'กลุ่มหลัก', chatId: raw.lineGroupId || '' }
      ],
      bots: [
        { id: 'bot_1', name: 'บอทตัวที่ 1', token: raw.line || '', customChatId: '', usedQuota: 0, totalQuota: 300 }
      ],
      events: {
        queue: true,
        pos: true,
        opd: true,
        mr: true,
        dashboard: true
      }
    },
    discord: {
      enabled: Boolean(raw.discord),
      botName: 'Anping Clinic Notifier',
      botAvatarUrl: '',
      applicationId: '',
      publicKey: '',
      botToken: '',
      channels: DEFAULT_INTEGRATION_SETTINGS.discord.channels.map((ch, idx) => ({
        ...ch,
        webhookUrl: idx === 0 ? (raw.discord || '') : '',
        botAvatarUrl: ''
      }))
    }
  };
}

/**
 * Clean phone numbers to first digits-only string for tel: link
 */
export function cleanDigitsPhone(phoneStr) {
  if (!phoneStr || phoneStr === '-') return '';
  const str = String(phoneStr);
  const parts = str.split(/[,/]|หรือ|และ|and|&/);
  const digits = parts[0].replace(/\D/g, '');
  return digits.length >= 9 ? digits : '';
}

/**
 * Clean HN string for LINE search query
 */
export function cleanHnSearch(hnStr) {
  if (!hnStr || hnStr === '-') return '';
  return String(hnStr).trim();
}

/**
 * Split Date and Time cleanly from datetime string
 */
export function splitDateTime(datetimeStr, timeStr) {
  let finalDate = '-';
  let finalTime = '-';

  if (timeStr && timeStr !== '-') {
    finalTime = timeStr.includes('น.') ? timeStr : `${timeStr} น.`;
  }

  if (datetimeStr && datetimeStr !== '-') {
    const raw = String(datetimeStr).trim();
    if (raw.includes('/')) {
      const parts = raw.split(' ');
      finalDate = parts[0];
      if (parts.length > 1 && finalTime === '-') {
        const t = parts.slice(1).join(' ').replace('น.', '').trim();
        finalTime = `${t} น.`;
      }
    } else {
      try {
        const d = new Date(raw);
        if (!isNaN(d.getTime())) {
          const thai = new Date(d.getTime() + (7 * 60 * 60 * 1000));
          const day = String(thai.getUTCDate()).padStart(2, '0');
          const month = String(thai.getUTCMonth() + 1).padStart(2, '0');
          const year = thai.getUTCFullYear() + 543;
          finalDate = `${day}/${month}/${year}`;
          if (finalTime === '-' && (raw.includes('T') || raw.includes(' '))) {
            const h = String(thai.getUTCHours()).padStart(2, '0');
            const m = String(thai.getUTCMinutes()).padStart(2, '0');
            finalTime = `${h}:${m} น.`;
          }
        }
      } catch (e) {}
    }
  }

  return { date: finalDate, time: finalTime };
}

/**
 * Format current notification timestamp in Thai format (พ.ศ.)
 * e.g. "Anping Clinic • วันที่ 30/09/2569 12:01 น."
 */
export function formatThaiNotificationTimestamp(d = new Date()) {
  try {
    const dateObj = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
    const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj;
    const thai = new Date(validDate.getTime() + (7 * 60 * 60 * 1000));
    const day = String(thai.getUTCDate()).padStart(2, '0');
    const month = String(thai.getUTCMonth() + 1).padStart(2, '0');
    const year = thai.getUTCFullYear() + 543;
    const hours = String(thai.getUTCHours()).padStart(2, '0');
    const minutes = String(thai.getUTCMinutes()).padStart(2, '0');
    return `Anping Clinic • วันที่ ${day}/${month}/${year} ${hours}:${minutes} น.`;
  } catch (e) {
    return 'Anping Clinic';
  }
}

/**
 * 📊 Calculate Daily Sales Summary from POS Transactions (UTC+7 Thailand)
 */
export function calculateDailySalesSummary(posTransactions = [], targetDate = new Date()) {
  const dateObj = typeof targetDate === 'string' || typeof targetDate === 'number' ? new Date(targetDate) : targetDate;
  const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj;
  const thai = new Date(validDate.getTime() + (7 * 60 * 60 * 1000));
  const todayYMD = thai.toISOString().split('T')[0];
  const day = String(thai.getUTCDate()).padStart(2, '0');
  const month = String(thai.getUTCMonth() + 1).padStart(2, '0');
  const year = thai.getUTCFullYear() + 543;
  const dateStrThai = `${day}/${month}/${year}`;

  const validTxns = (posTransactions || []).filter(tx => {
    if (tx.status === 'cancelled' || tx.isDeleted || tx.is_deleted) return false;
    const rawTime = tx.created_at || tx.createdAt || tx.date || tx.timestamp_date;
    if (!rawTime) return false;
    try {
      const d = new Date(rawTime);
      if (isNaN(d.getTime())) return false;
      const txThai = new Date(d.getTime() + (7 * 60 * 60 * 1000));
      return txThai.toISOString().split('T')[0] === todayYMD;
    } catch (e) {
      return false;
    }
  });

  let totalAmount = 0;
  let cashAmount = 0;
  let cashCount = 0;
  let transferAmount = 0;
  let transferCount = 0;
  let creditAmount = 0;
  let creditCount = 0;
  const uniquePatients = new Set();

  for (const tx of validTxns) {
    const amount = Number(tx.net_amount ?? tx.netAmount ?? tx.grandTotal ?? tx.total_amount ?? tx.totalAmount ?? 0);
    totalAmount += amount;

    const method = String(tx.payment_method || tx.paymentMethod || 'cash').toLowerCase();
    if (method === 'cash' || method.includes('สด')) {
      cashAmount += amount;
      cashCount++;
    } else if (method === 'transfer' || method.includes('โอน')) {
      transferAmount += amount;
      transferCount++;
    } else if (method === 'credit' || method.includes('บัตร')) {
      creditAmount += amount;
      creditCount++;
    } else {
      cashAmount += amount;
      cashCount++;
    }

    const pName = String(tx.patient_name || tx.patientName || tx.hn || '').trim();
    if (pName) uniquePatients.add(pName);
  }

  return {
    date: dateStrThai,
    rawDate: todayYMD,
    totalAmount,
    billsCount: validTxns.length,
    patientsCount: uniquePatients.size,
    cashAmount,
    cashCount,
    transferAmount,
    transferCount,
    creditAmount,
    creditCount,
    transactions: validTxns
  };
}

/**
 * 🎨 Universal LINE Flex Message Generator
 * Creates high-fidelity, clean Flex Bubbles matching clinic UX/UI standard (Screenshot 114551, 114556, 114539)
 */
export function buildLineFlexMessage({
  eventType = 'queue', // 'queue' | 'pos' | 'opd' | 'mr' | 'dashboard' | 'test'
  title = '',
  message = '',
  fields = [],
  rawPayload = {},
  webappUrl = 'https://anpingclinic.vercel.app'
}) {
  let patientName = rawPayload.patientName || rawPayload.name || rawPayload.customerName || (fields.find(f => f.name && f.name.includes('คนไข้'))?.value?.split('(')[0]?.trim()) || 'คนไข้';
  const prefix = (rawPayload.prefix || '').trim();
  if (prefix && !patientName.startsWith(prefix)) {
    patientName = `${prefix}${patientName}`;
  }
  const hn = rawPayload.hn || rawPayload.patientId || (fields.find(f => f.name && f.name.includes('คนไข้'))?.value?.match(/\(([^)]+)\)/)?.[1]?.replace('HN:', '')?.trim()) || '';
  const phone = rawPayload.phone || (fields.find(f => f.name && f.name.includes('เบอร์'))?.value) || '';
  const cleanPhone = cleanDigitsPhone(phone);
  const searchHn = cleanHnSearch(hn || patientName);

  // 1. QUEUE / APPOINTMENT FLEX (ตรงตาม Screenshot 114551 100%)
  if (eventType === 'queue') {
    const isPostpone = Boolean(rawPayload.isPostpone || (title && title.includes('เลื่อน')));
    const isCancel = Boolean(rawPayload.status?.includes('ยกเลิก') || (title && title.includes('ยกเลิก')));
    const isConfirm = Boolean(rawPayload.status?.includes('ยืนยัน') || rawPayload.status === 'confirmed');

    let headerBg = "#0284c7"; // Blue default
    let headerTitle = "นัดหมายใหม่";
    if (isCancel) {
      headerBg = "#f43f5e";
      headerTitle = "ยกเลิกนัดหมาย";
    } else if (isPostpone) {
      headerBg = "#f59e0b";
      headerTitle = "เลื่อนนัดหมาย";
    } else if (isConfirm) {
      headerBg = "#10b981";
      headerTitle = "ยืนยันแล้ว";
    } else if (rawPayload.status) {
      headerTitle = rawPayload.status.replace(/[^\u0E00-\u0E7Fa-zA-Z0-9\s]/g, '').trim() || "นัดหมายคนไข้";
    }

    const { date: dateStr, time: timeStr } = splitDateTime(rawPayload.datetime || (fields.find(f => f.name && f.name.includes('วัน'))?.value), rawPayload.time);
    const doctor = rawPayload.doctor || (fields.find(f => f.name && f.name.includes('แพทย์'))?.value) || '-';
    const rawService = rawPayload.serviceType || rawPayload.service || (fields.find(f => f.name && (f.name.includes('ประเภทบริการ') || f.name.includes('บริการ')) && !f.name.includes('สาเหตุ'))?.value) || '';
    const rawReason = rawPayload.reason || (fields.find(f => f.name && (f.name.includes('อาการ') || f.name.includes('สาเหตุ')) && !f.name.includes('ประเภทบริการ'))?.value) || '';
    const serviceType = (rawService && rawService !== '-') ? rawService : (rawReason && rawReason !== '-' ? rawReason : '-');
    const reason = (rawService && rawService !== '-' && rawReason && rawReason !== rawService) ? rawReason : (rawReason && rawReason !== serviceType ? rawReason : '');

    const infoContents = [
      {
        type: "box",
        layout: "horizontal",
        contents: [
          { type: "text", text: "วันที่", size: "sm", color: "#64748b", flex: 4 },
          { type: "text", text: dateStr, size: "sm", color: "#0f172a", weight: "bold", flex: 6 }
        ]
      },
      {
        type: "box",
        layout: "horizontal",
        contents: [
          { type: "text", text: "เวลา", size: "sm", color: "#64748b", flex: 4 },
          { type: "text", text: timeStr, size: "sm", color: "#0f172a", weight: "bold", flex: 6 }
        ]
      },
      {
        type: "box",
        layout: "horizontal",
        contents: [
          { type: "text", text: "ประเภทบริการ", size: "sm", color: "#64748b", flex: 4 },
          { type: "text", text: serviceType, size: "sm", color: "#334155", flex: 6, wrap: true }
        ]
      },
      ...(reason && reason !== '-' ? [{
        type: "box",
        layout: "horizontal",
        contents: [
          { type: "text", text: "อาการ", size: "sm", color: "#64748b", flex: 4 },
          { type: "text", text: reason, size: "sm", color: "#334155", flex: 6, wrap: true }
        ]
      }] : []),
      {
        type: "box",
        layout: "horizontal",
        contents: [
          { type: "text", text: "แพทย์", size: "sm", color: "#64748b", flex: 4 },
          { type: "text", text: doctor, size: "sm", color: "#334155", flex: 6, wrap: true }
        ]
      },
      ...(phone && phone !== '-' ? [{
        type: "box",
        layout: "horizontal",
        contents: [
          { type: "text", text: "เบอร์โทร", size: "sm", color: "#64748b", flex: 4 },
          { type: "text", text: String(phone), size: "sm", color: "#0ea5e9", weight: "bold", flex: 6 }
        ]
      }] : [])
    ];

    if (isPostpone && rawPayload.postponedCount) {
      infoContents.push({
        type: "box",
        layout: "horizontal",
        contents: [
          { type: "text", text: "เลื่อนแล้ว", size: "sm", color: "#f59e0b", flex: 4 },
          { type: "text", text: `${rawPayload.postponedCount} ครั้ง`, size: "sm", color: "#f59e0b", weight: "bold", flex: 6 }
        ]
      });
    }

    return {
      type: "flex",
      altText: `${headerTitle}: ${patientName} (${dateStr} ${timeStr})`,
      contents: {
        type: "bubble",
        size: "kilo",
        header: {
          type: "box",
          layout: "vertical",
          backgroundColor: headerBg,
          paddingAll: "md",
          contents: [
            {
              type: "text",
              text: headerTitle,
              color: "#ffffff",
              weight: "bold",
              size: "md"
            }
          ]
        },
        body: {
          type: "box",
          layout: "vertical",
          paddingAll: "lg",
          contents: [
            {
              type: "text",
              text: patientName,
              weight: "bold",
              size: "xl",
              color: "#0f172a",
              wrap: true
            },
            {
              type: "text",
              text: hn ? (hn.startsWith('HN') ? hn : `HN: ${hn}`) : "คนไข้ทั่วไป",
              size: "sm",
              color: "#64748b",
              margin: "xs"
            },
            {
              type: "separator",
              margin: "md"
            },
            {
              type: "box",
              layout: "vertical",
              margin: "md",
              spacing: "sm",
              contents: infoContents
            }
          ]
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          paddingAll: "14px",
          paddingTop: "0px",
          contents: [
            {
              type: "button",
              style: "secondary",
              color: "#e0f2fe",
              height: "sm",
              action: {
                type: "message",
                label: "ดูประวัติ",
                text: `ค้นหา ${searchHn}`
              }
            },
            {
              type: "button",
              style: "primary",
              color: "#0ea5e9",
              height: "sm",
              action: {
                type: "uri",
                label: "โทร",
                uri: cleanPhone ? `tel:${cleanPhone}` : webappUrl
              }
            },
            {
              type: "text",
              text: formatThaiNotificationTimestamp(),
              size: "xxs",
              color: "#94a3b8",
              align: "center",
              margin: "sm",
              wrap: true
            }
          ]
        }
      }
    };
  }

  // 2. POS / CHECKOUT FLEX (ตรงตาม Screenshot 114539 100%)
  if (eventType === 'pos') {
    const totalAmount = Number(
      rawPayload.net_amount ??
      rawPayload.total_amount ??
      rawPayload.grandTotal ??
      rawPayload.grand_total ??
      rawPayload.totalAmount ??
      rawPayload.total ??
      rawPayload.amount ??
      (fields.find(f => f.name && f.name.includes('ยอดชำระ'))?.value?.replace(/[^\d.]/g, '')) ??
      (fields.find(f => f.name && f.name.includes('ยอดสุทธิ'))?.value?.replace(/[^\d.]/g, '')) ??
      0
    );
    const receiptNo = rawPayload.receipt_no || rawPayload.receiptId || rawPayload.receiptNo || rawPayload.id || (fields.find(f => f.name && f.name.includes('เลขที่บิล'))?.value) || '-';
    
    // Payment method translation
    let rawPay = String(rawPayload.payment_method || rawPayload.paymentMethod || (fields.find(f => f.name && f.name.includes('ช่องทาง'))?.value) || 'เงินสด').toLowerCase();
    let payMethod = '💵 เงินสด';
    if (rawPay.includes('transfer') || rawPay.includes('โอน')) {
      payMethod = '📲 โอนเงิน (QR Code)';
    } else if (rawPay.includes('credit') || rawPay.includes('card') || rawPay.includes('บัตร')) {
      payMethod = '💳 บัตรเครดิต';
    } else if (rawPay.includes('cash') || rawPay.includes('สด')) {
      payMethod = '💵 เงินสด';
    } else if (rawPay && rawPay !== '-') {
      payMethod = rawPayload.payment_method || rawPayload.paymentMethod || rawPay;
    }

    const staff = rawPayload.staff_name || rawPayload.staff || rawPayload.seller_name || rawPayload.cashier || (fields.find(f => f.name && f.name.includes('ผู้ทำรายการ'))?.value) || 'เจ้าหน้าที่';
    
    // Thai Date formatting
    let dateStr = '-';
    const rawTime = rawPayload.created_at || rawPayload.datetime || rawPayload.date;
    if (rawTime) {
      try {
        const d = new Date(rawTime);
        if (!isNaN(d.getTime())) {
          const thai = new Date(d.getTime() + (7 * 60 * 60 * 1000));
          const day = String(thai.getUTCDate()).padStart(2, '0');
          const month = String(thai.getUTCMonth() + 1).padStart(2, '0');
          const year = thai.getUTCFullYear() + 543;
          const hours = String(thai.getUTCHours()).padStart(2, '0');
          const minutes = String(thai.getUTCMinutes()).padStart(2, '0');
          dateStr = `${day}/${month}/${year} ${hours}:${minutes} น.`;
        } else {
          dateStr = String(rawTime);
        }
      } catch (_e) {
        dateStr = String(rawTime);
      }
    }

    // Items list
    const rawItems = rawPayload.items || [];
    let itemContents = [];
    if (Array.isArray(rawItems) && rawItems.length > 0) {
      itemContents = rawItems.slice(0, 10).map((it) => {
        const p = it.product || it;
        const itName = p.name || p.courseName || p.product_name || p.productName || it.name || 'รายการสินค้า/บริการ';
        const itQty = Number(it.quantity ?? it.qty ?? 1);
        const unitPrice = Number(p.price ?? p.sellingPrice ?? it.price ?? 0);
        const itPrice = Number(it.total ?? (unitPrice * itQty));
        return {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: `• ${itName} x${itQty}`, size: "xs", color: "#334155", flex: 7, wrap: true },
            { type: "text", text: `฿${Number(itPrice).toLocaleString()}`, size: "xs", color: "#0f172a", weight: "bold", flex: 3, align: "end" }
          ]
        };
      });
    }

    return {
      type: "flex",
      altText: `🧾 ใบเสร็จรับเงิน/บิล POS: ฿${Number(totalAmount).toLocaleString()} (${receiptNo})`,
      contents: {
        type: "bubble",
        size: "kilo",
        header: {
          type: "box",
          layout: "vertical",
          backgroundColor: "#0284c7",
          paddingAll: "md",
          contents: [
            {
              type: "text",
              text: "🧾 ใบเสร็จรับเงิน / บิล POS",
              color: "#ffffff",
              weight: "bold",
              size: "md"
            },
            {
              type: "text",
              text: `เลขที่: ${String(receiptNo)}`,
              color: "#e0f2fe",
              size: "xs",
              margin: "xs"
            }
          ]
        },
        body: {
          type: "box",
          layout: "vertical",
          paddingAll: "lg",
          contents: [
            {
              type: "box",
              layout: "vertical",
              spacing: "sm",
              contents: [
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: "ลูกค้า", size: "sm", color: "#64748b", flex: 4 },
                    { type: "text", text: patientName, size: "sm", color: "#0f172a", weight: "bold", flex: 6, wrap: true }
                  ]
                },
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: "วันเวลา", size: "sm", color: "#64748b", flex: 4 },
                    { type: "text", text: dateStr, size: "sm", color: "#334155", flex: 6 }
                  ]
                },
                ...(phone ? [{
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: "เบอร์โทร", size: "sm", color: "#64748b", flex: 4 },
                    { type: "text", text: String(phone), size: "sm", color: "#0284c7", weight: "bold", flex: 6 }
                  ]
                }] : []),
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: "ช่องทางชำระ", size: "sm", color: "#64748b", flex: 4 },
                    { type: "text", text: payMethod, size: "sm", color: "#334155", flex: 6 }
                  ]
                },
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: "ผู้บันทึก", size: "sm", color: "#64748b", flex: 4 },
                    { type: "text", text: String(staff), size: "sm", color: "#334155", flex: 6, wrap: true }
                  ]
                }
              ]
            },
            ...(itemContents.length > 0 ? [
              { type: "separator", margin: "md" },
              {
                type: "box",
                layout: "vertical",
                margin: "md",
                spacing: "xs",
                contents: [
                  { type: "text", text: "รายการสินค้า / บริการ:", size: "xs", color: "#64748b", weight: "bold" },
                  ...itemContents
                ]
              }
            ] : []),
            {
              type: "separator",
              margin: "md"
            },
            {
              type: "box",
              layout: "horizontal",
              margin: "md",
              contents: [
                { type: "text", text: "ยอดสุทธิ", size: "md", color: "#0f172a", weight: "bold", flex: 4 },
                { type: "text", text: `฿${Number(totalAmount).toLocaleString()}`, size: "xl", color: "#0284c7", weight: "bold", flex: 6, align: "end" }
              ]
            }
          ]
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          paddingAll: "14px",
          paddingTop: "0px",
          contents: [
            {
              type: "button",
              style: "primary",
              color: "#0ea5e9",
              height: "sm",
              action: {
                type: "uri",
                label: "📄 ดู/พิมพ์ใบเสร็จ ↗",
                uri: `${webappUrl}?print_pos=${encodeURIComponent(receiptNo)}`
              }
            },
            {
              type: "text",
              text: formatThaiNotificationTimestamp(),
              size: "xxs",
              color: "#94a3b8",
              align: "center",
              margin: "sm",
              wrap: true
            }
          ]
        }
      }
    };
  }

  // 3. MEDICAL RECORDS / COURSE USAGE FLEX
  if (eventType === 'mr') {
    const courseName = rawPayload.courseName || (fields.find(f => f.name && f.name.includes('คอร์ส'))?.value) || 'คอร์สการรักษา';
    const usage = rawPayload.newUsed 
      ? `ครั้งที่ ${rawPayload.newUsed}/${rawPayload.currentTotal}` 
      : (fields.find(f => f.name && f.name.includes('การใช้งาน'))?.value || '-');
    const remaining = rawPayload.newRem !== undefined 
      ? `${rawPayload.newRem} ครั้ง` 
      : (fields.find(f => f.name && f.name.includes('คงเหลือ'))?.value || '-');
    const staff = rawPayload.staff || (fields.find(f => f.name && f.name.includes('ผู้ทำรายการ'))?.value) || 'เจ้าหน้าที่';
    const usageDate = rawPayload.date || rawPayload.datetime || (fields.find(f => f.name && (f.name.includes('วัน') || f.name.includes('เวลา'))))?.value || new Date().toLocaleDateString('th-TH');

    return {
      type: "flex",
      altText: `ตัดรอบคอร์ส: ${patientName} (${courseName})`,
      contents: {
        type: "bubble",
        size: "kilo",
        header: {
          type: "box",
          layout: "vertical",
          backgroundColor: "#d97706",
          paddingAll: "md",
          contents: [
            {
              type: "text",
              text: "ตัดรอบคอร์สคนไข้",
              color: "#ffffff",
              weight: "bold",
              size: "md"
            }
          ]
        },
        body: {
          type: "box",
          layout: "vertical",
          paddingAll: "lg",
          contents: [
            {
              type: "text",
              text: patientName,
              weight: "bold",
              size: "xl",
              color: "#0f172a",
              wrap: true
            },
            {
              type: "text",
              text: hn ? (hn.startsWith('HN') ? hn : `HN: ${hn}`) : "คนไข้ทั่วไป",
              size: "sm",
              color: "#64748b",
              margin: "xs"
            },
            {
              type: "separator",
              margin: "md"
            },
            {
              type: "box",
              layout: "vertical",
              margin: "md",
              spacing: "sm",
              contents: [
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: "วันที่ใช้งาน", size: "sm", color: "#64748b", flex: 4 },
                    { type: "text", text: usageDate, size: "sm", color: "#0f172a", weight: "bold", flex: 6, wrap: true }
                  ]
                },
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: "รายการคอร์ส", size: "sm", color: "#64748b", flex: 4 },
                    { type: "text", text: courseName, size: "sm", color: "#92400e", weight: "bold", flex: 6, wrap: true }
                  ]
                },
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: "การใช้งาน", size: "sm", color: "#64748b", flex: 4 },
                    { type: "text", text: usage, size: "sm", color: "#334155", flex: 6 }
                  ]
                },
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: "จำนวนคงเหลือ", size: "sm", color: "#64748b", flex: 4 },
                    { type: "text", text: remaining, size: "sm", color: "#d97706", weight: "bold", flex: 6 }
                  ]
                },
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: "ผู้บันทึก", size: "sm", color: "#64748b", flex: 4 },
                    { type: "text", text: staff, size: "sm", color: "#334155", flex: 6 }
                  ]
                },
                ...(phone && phone !== '-' ? [{
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: "เบอร์โทร", size: "sm", color: "#64748b", flex: 4 },
                    { type: "text", text: String(phone), size: "sm", color: "#0ea5e9", weight: "bold", flex: 6 }
                  ]
                }] : [])
              ]
            }
          ]
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          paddingAll: "14px",
          paddingTop: "0px",
          contents: [
            {
              type: "button",
              style: "secondary",
              color: "#fef3c7",
              height: "sm",
              action: {
                type: "message",
                label: "ดูประวัติ",
                text: `ค้นหา ${searchHn}`
              }
            },
            {
              type: "button",
              style: "primary",
              color: "#d97706",
              height: "sm",
              action: {
                type: "uri",
                label: "เปิดดูเวชระเบียน",
                uri: webappUrl
              }
            },
            {
              type: "text",
              text: formatThaiNotificationTimestamp(),
              size: "xxs",
              color: "#94a3b8",
              align: "center",
              margin: "sm",
              wrap: true
            }
          ]
        }
      }
    };
  }

  // 4. OPD / TREATMENT FLEX
  if (eventType === 'opd') {
    const doctor = rawPayload.doctor || (fields.find(f => f.name && f.name.includes('แพทย์'))?.value) || '-';
    const diagnosis = (rawPayload.diagnosis && rawPayload.diagnosis !== '-') 
      ? rawPayload.diagnosis 
      : (rawPayload.chiefComplaint || rawPayload.cc || (fields.find(f => f.name && (f.name.includes('วินิจฉัย') || f.name.includes('อาการสำคัญ') || f.name.includes('อาการ')))?.value) || '-');
    const treatment = rawPayload.treatment || rawPayload.treatments || rawPayload.prescription || (fields.find(f => f.name && (f.name.includes('รักษา') || f.name.includes('หัตถการ') || f.name.includes('ยา'))))?.value || '-';
    const visitDate = rawPayload.date || rawPayload.datetime || (fields.find(f => f.name && (f.name.includes('วัน') || f.name.includes('เวลา'))))?.value || new Date().toLocaleDateString('th-TH');

    return {
      type: "flex",
      altText: `บันทึกการรักษา OPD: ${patientName} (แพทย์: ${doctor})`,
      contents: {
        type: "bubble",
        size: "kilo",
        header: {
          type: "box",
          layout: "vertical",
          backgroundColor: "#7c3aed",
          paddingAll: "md",
          contents: [
            {
              type: "text",
              text: "บันทึกการรักษา (OPD)",
              color: "#ffffff",
              weight: "bold",
              size: "md"
            }
          ]
        },
        body: {
          type: "box",
          layout: "vertical",
          paddingAll: "lg",
          contents: [
            {
              type: "text",
              text: patientName,
              weight: "bold",
              size: "xl",
              color: "#0f172a",
              wrap: true
            },
            {
              type: "text",
              text: hn ? (hn.startsWith('HN') ? hn : `HN: ${hn}`) : "คนไข้ทั่วไป",
              size: "sm",
              color: "#64748b",
              margin: "xs"
            },
            {
              type: "separator",
              margin: "md"
            },
            {
              type: "box",
              layout: "vertical",
              margin: "md",
              spacing: "sm",
              contents: [
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: "วันที่รักษา", size: "sm", color: "#64748b", flex: 4 },
                    { type: "text", text: visitDate, size: "sm", color: "#0f172a", weight: "bold", flex: 6, wrap: true }
                  ]
                },
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: "ผลวินิจฉัย", size: "sm", color: "#64748b", flex: 4 },
                    { type: "text", text: diagnosis, size: "sm", color: "#581c87", weight: "bold", flex: 6, wrap: true }
                  ]
                },
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: "การรักษา/ยา", size: "sm", color: "#64748b", flex: 4 },
                    { type: "text", text: treatment, size: "sm", color: "#334155", flex: 6, wrap: true }
                  ]
                },
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: "แพทย์", size: "sm", color: "#64748b", flex: 4 },
                    { type: "text", text: doctor, size: "sm", color: "#334155", flex: 6, wrap: true }
                  ]
                },
                ...(phone && phone !== '-' ? [{
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: "เบอร์โทร", size: "sm", color: "#64748b", flex: 4 },
                    { type: "text", text: String(phone), size: "sm", color: "#0ea5e9", weight: "bold", flex: 6 }
                  ]
                }] : [])
              ]
            }
          ]
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          paddingAll: "14px",
          paddingTop: "0px",
          contents: [
            {
              type: "button",
              style: "secondary",
              color: "#f3e8ff",
              height: "sm",
              action: {
                type: "message",
                label: "ดูประวัติ",
                text: `ค้นหา ${searchHn}`
              }
            },
            {
              type: "button",
              style: "primary",
              color: "#7c3aed",
              height: "sm",
              action: {
                type: "uri",
                label: "เปิดดูประวัติการรักษา",
                uri: webappUrl
              }
            },
            {
              type: "text",
              text: formatThaiNotificationTimestamp(),
              size: "xxs",
              color: "#94a3b8",
              align: "center",
              margin: "sm",
              wrap: true
            }
          ]
        }
      }
    };
  }

  // 5. DASHBOARD / DAILY SALES SUMMARY FLEX (สรุปยอดขายประจำวัน)
  if (eventType === 'dashboard') {
    const totalAmount = rawPayload.totalAmount || rawPayload.grandTotal || (fields.find(f => f.name && f.name.includes('ยอดขายรวม'))?.value?.replace(/[^\d.]/g, '')) || 0;
    const billsCount = rawPayload.billsCount || (fields.find(f => f.name && f.name.includes('จำนวนบิล'))?.value?.replace(/[^\d.]/g, '')) || 0;
    const patientsCount = rawPayload.patientsCount || (fields.find(f => f.name && f.name.includes('คนไข้'))?.value?.replace(/[^\d.]/g, '')) || 0;
    const cashAmount = rawPayload.cashAmount !== undefined ? rawPayload.cashAmount : (fields.find(f => f.name && f.name.includes('เงินสด'))?.value?.replace(/[^\d.]/g, '') || 0);
    const transferAmount = rawPayload.transferAmount !== undefined ? rawPayload.transferAmount : (fields.find(f => f.name && f.name.includes('เงินโอน'))?.value?.replace(/[^\d.]/g, '') || 0);
    const creditAmount = rawPayload.creditAmount !== undefined ? rawPayload.creditAmount : (fields.find(f => f.name && f.name.includes('บัตรเครดิต'))?.value?.replace(/[^\d.]/g, '') || 0);
    const branchName = rawPayload.branch || rawPayload.branchName || 'สาขาหลัก';
    const dateStr = rawPayload.date || rawPayload.datetime || new Date().toLocaleDateString('th-TH');

    return {
      type: "flex",
      altText: `📊 สรุปยอดขายประจำวัน: ฿${Number(totalAmount).toLocaleString()} (${dateStr})`,
      contents: {
        type: "bubble",
        size: "kilo",
        header: {
          type: "box",
          layout: "vertical",
          backgroundColor: "#1e40af",
          paddingAll: "md",
          contents: [
            {
              type: "text",
              text: "📊 สรุปยอดขายประจำวัน",
              color: "#ffffff",
              weight: "bold",
              size: "md"
            },
            {
              type: "text",
              text: `ประจำวันที่ ${dateStr} • ${branchName}`,
              color: "#bfdbfe",
              size: "xs",
              margin: "xs"
            }
          ]
        },
        body: {
          type: "box",
          layout: "vertical",
          paddingAll: "lg",
          contents: [
            {
              type: "box",
              layout: "vertical",
              backgroundColor: "#eff6ff",
              cornerRadius: "md",
              paddingAll: "md",
              contents: [
                {
                  type: "text",
                  text: "ยอดขายรวมสุทธิ",
                  size: "xs",
                  color: "#1e40af",
                  weight: "bold"
                },
                {
                  type: "text",
                  text: `฿${Number(totalAmount).toLocaleString()}`,
                  size: "xxl",
                  color: "#1e3a8a",
                  weight: "bold",
                  margin: "xs"
                },
                {
                  type: "text",
                  text: `ทั้งหมด ${billsCount} บิล • คนไข้ ${patientsCount} ท่าน`,
                  size: "xs",
                  color: "#64748b",
                  margin: "xs"
                }
              ]
            },
            {
              type: "separator",
              margin: "md"
            },
            {
              type: "box",
              layout: "vertical",
              margin: "md",
              spacing: "sm",
              contents: [
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: "💵 เงินสด", size: "sm", color: "#64748b", flex: 5 },
                    { type: "text", text: `฿${Number(cashAmount).toLocaleString()}`, size: "sm", color: "#0f172a", weight: "bold", flex: 5, align: "end" }
                  ]
                },
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: "📲 เงินโอน", size: "sm", color: "#64748b", flex: 5 },
                    { type: "text", text: `฿${Number(transferAmount).toLocaleString()}`, size: "sm", color: "#0284c7", weight: "bold", flex: 5, align: "end" }
                  ]
                },
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: "💳 บัตรเครดิต", size: "sm", color: "#64748b", flex: 5 },
                    { type: "text", text: `฿${Number(creditAmount).toLocaleString()}`, size: "sm", color: "#7c3aed", weight: "bold", flex: 5, align: "end" }
                  ]
                }
              ]
            }
          ]
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          paddingAll: "14px",
          paddingTop: "0px",
          contents: [
            {
              type: "button",
              style: "primary",
              color: "#1e40af",
              height: "sm",
              action: {
                type: "uri",
                label: "🌐 ดูรายงานบัญชีและการเงิน",
                uri: webappUrl
              }
            },
            {
              type: "text",
              text: formatThaiNotificationTimestamp(),
              size: "xxs",
              color: "#94a3b8",
              align: "center",
              margin: "sm",
              wrap: true
            }
          ]
        }
      }
    };
  }

  // 5.5 MENU FLEX CARD (เมนูคำสั่งลัดระบบคลินิก)
  if (eventType === 'menu') {
    return {
      type: "flex",
      altText: "📋 เมนูคำสั่งลัดระบบคลินิก (Anping Clinic)",
      contents: {
        type: "bubble",
        size: "kilo",
        header: {
          type: "box",
          layout: "vertical",
          backgroundColor: "#1e40af",
          paddingAll: "16px",
          contents: [
            {
              type: "text",
              text: "🏥 ANPING CLINIC",
              color: "#bfdbfe",
              size: "xs",
              weight: "bold"
            },
            {
              type: "text",
              text: "📋 เมนูคำสั่งลัดระบบคลินิก",
              color: "#ffffff",
              size: "md",
              weight: "bold",
              margin: "xs"
            },
            {
              type: "text",
              text: "แตะปุ่มเพื่อดูข้อมูลหรือสั่งงานบอทได้ทันที",
              color: "#e0e7ff",
              size: "xxs",
              margin: "xs"
            }
          ]
        },
        body: {
          type: "box",
          layout: "vertical",
          paddingAll: "16px",
          spacing: "md",
          contents: [
            {
              type: "text",
              text: "📊 สรุปยอดและการเงิน",
              size: "xs",
              color: "#64748b",
              weight: "bold"
            },
            {
              type: "box",
              layout: "horizontal",
              spacing: "sm",
              contents: [
                {
                  type: "button",
                  style: "primary",
                  color: "#1e40af",
                  height: "sm",
                  flex: 1,
                  action: {
                    type: "message",
                    label: "📊 สรุปยอดวันนี้",
                    text: "สรุปยอดขายประจำวัน"
                  }
                },
                {
                  type: "button",
                  style: "secondary",
                  color: "#eff6ff",
                  height: "sm",
                  flex: 1,
                  action: {
                    type: "message",
                    label: "⏮️ ยอดเมื่อวาน",
                    text: "สรุปยอดเมื่อวาน"
                  }
                }
              ]
            },
            {
              type: "separator"
            },
            {
              type: "text",
              text: "📅 ตารางคิวนัดหมาย",
              size: "xs",
              color: "#64748b",
              weight: "bold"
            },
            {
              type: "box",
              layout: "horizontal",
              spacing: "sm",
              contents: [
                {
                  type: "button",
                  style: "primary",
                  color: "#0ea5e9",
                  height: "sm",
                  flex: 1,
                  action: {
                    type: "message",
                    label: "📅 นัดหมายวันนี้",
                    text: "นัดหมายวันนี้"
                  }
                },
                {
                  type: "button",
                  style: "secondary",
                  color: "#f0f9ff",
                  height: "sm",
                  flex: 1,
                  action: {
                    type: "message",
                    label: "🗓️ นัดพรุ่งนี้",
                    text: "นัดหมายพรุ่งนี้"
                  }
                }
              ]
            },
            {
              type: "separator"
            },
            {
              type: "text",
              text: "🧾 บิล & ยา & คนไข้",
              size: "xs",
              color: "#64748b",
              weight: "bold"
            },
            {
              type: "box",
              layout: "horizontal",
              spacing: "sm",
              contents: [
                {
                  type: "button",
                  style: "primary",
                  color: "#059669",
                  height: "sm",
                  flex: 1,
                  action: {
                    type: "message",
                    label: "🧾 บิลล่าสุด",
                    text: "บิลล่าสุด"
                  }
                },
                {
                  type: "button",
                  style: "secondary",
                  color: "#ecfdf5",
                  height: "sm",
                  flex: 1,
                  action: {
                    type: "message",
                    label: "📦 คลังยา/สต็อก",
                    text: "เช็คสต็อก"
                  }
                }
              ]
            },
            {
              type: "button",
              style: "secondary",
              color: "#f8fafc",
              height: "sm",
              action: {
                type: "message",
                label: "🔍 วิธีค้นหาคนไข้ / HN",
                text: "ค้นหาคนไข้"
              }
            }
          ]
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          paddingAll: "14px",
          paddingTop: "0px",
          contents: [
            {
              type: "button",
              style: "primary",
              color: "#0284c7",
              height: "sm",
              action: {
                type: "uri",
                label: "🌐 เปิดดูในระบบ Anping Clinic ↗",
                uri: webappUrl
              }
            },
            {
              type: "text",
              text: formatThaiNotificationTimestamp(),
              size: "xxs",
              color: "#94a3b8",
              align: "center",
              margin: "sm",
              wrap: true
            }
          ]
        }
      }
    };
  }

  // 6. GENERAL / FALLBACK
  return {
    type: "flex",
    altText: title || "แจ้งเตือนระบบ Anping Clinic",
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0284c7",
        paddingAll: "md",
        contents: [
          {
            type: "text",
            text: title || "ระบบแจ้งเตือน",
            color: "#ffffff",
            weight: "bold",
            size: "md"
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "lg",
        contents: [
          {
            type: "text",
            text: message || title || "แจ้งเตือนจากระบบ",
            size: "sm",
            color: "#334155",
            wrap: true
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "14px",
        paddingTop: "0px",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#0284c7",
            height: "sm",
            action: {
              type: "uri",
              label: "เปิดระบบคลินิก ↗",
              uri: webappUrl
            }
          },
          {
            type: "text",
            text: formatThaiNotificationTimestamp(),
            size: "xxs",
            color: "#94a3b8",
            align: "center",
            margin: "sm",
            wrap: true
          }
        ]
      }
    }
  };
}

/**
 * Build Modern Discord Flex-Style Embed Payload
 * Matches LINE Flex Card UX/UI exactly (Screenshot 114551, 114556, 114539)
 */
export function buildDiscordFlexPayload({
  eventType = 'queue',
  title = '',
  message = '',
  fields = [],
  rawPayload = {},
  discordColor,
  footerText = 'Anping Clinic',
  webappUrl = 'https://anpingclinic.vercel.app',
  botName = '',
  botAvatarUrl = ''
}) {
  let patientName = rawPayload.patientName || rawPayload.name || rawPayload.customerName || (fields.find(f => f.name && f.name.includes('คนไข้'))?.value?.split('(')[0]?.trim()) || 'คนไข้ทั่วไป';
  const prefix = (rawPayload.prefix || '').trim();
  if (prefix && !patientName.startsWith(prefix)) {
    patientName = `${prefix}${patientName}`;
  }
  const rawHn = rawPayload.hn || rawPayload.patientId || (fields.find(f => f.name && f.name.includes('คนไข้'))?.value?.match(/HN[^\s)]+/)?.[0]) || '';
  const phone = rawPayload.phone || (fields.find(f => f.name && f.name.includes('เบอร์'))?.value) || '';
  const cleanPhone = cleanDigitsPhone(phone);
  const searchKey = rawHn || patientName;

  let color = 0x0284c7; // Sky Blue
  let embedTitle = title || '[ แจ้งเตือนคลินิก ]';
  let desc = '';

  if (eventType === 'queue') {
    const isPostpone = Boolean(rawPayload.isPostpone || (title && title.includes('เลื่อน')));
    const isCancel = Boolean(rawPayload.status?.includes('ยกเลิก') || (title && title.includes('ยกเลิก')));
    const isConfirm = Boolean(rawPayload.status?.includes('ยืนยัน') || rawPayload.status === 'confirmed');
    
    let statusLabel = 'นัดหมายใหม่';
    let statusEmoji = '🗓️';
    if (isCancel) {
      statusLabel = 'ยกเลิกนัดหมาย';
      statusEmoji = '❌';
      color = 0xe11d48; // Rose Red
    } else if (isPostpone) {
      statusLabel = 'เลื่อนนัดหมาย';
      statusEmoji = '🔄';
      color = 0xf59e0b; // Amber
    } else if (isConfirm) {
      statusLabel = 'ยืนยันนัดหมาย';
      statusEmoji = '✅';
      color = 0x10b981; // Emerald Green
    }

    const headerTitle = rawPayload.actionTitle || (title && !title.includes('[') ? title : statusLabel);
    const formattedStatus = `${statusEmoji} ${rawPayload.status || statusLabel}`;

    embedTitle = `🗓️ ${headerTitle} • [ ${formattedStatus} ]`;

    const { date: dateStr, time: timeStr } = splitDateTime(rawPayload.datetime || (fields.find(f => f.name && f.name.includes('วัน'))?.value), rawPayload.time);
    const doctor = rawPayload.doctor || (fields.find(f => f.name && f.name.includes('แพทย์'))?.value) || '-';
    const rawService = rawPayload.serviceType || rawPayload.service || (fields.find(f => f.name && (f.name.includes('ประเภทบริการ') || f.name.includes('บริการ')) && !f.name.includes('สาเหตุ'))?.value) || '';
    const rawReason = rawPayload.reason || (fields.find(f => f.name && (f.name.includes('อาการ') || f.name.includes('สาเหตุ')) && !f.name.includes('ประเภทบริการ'))?.value) || '';
    const serviceType = (rawService && rawService !== '-') ? rawService : (rawReason && rawReason !== '-' ? rawReason : '-');
    const reason = (rawService && rawService !== '-' && rawReason && rawReason !== rawService) ? rawReason : (rawReason && rawReason !== serviceType ? rawReason : '');

    const hasTitle = patientName.startsWith('คุณ') || patientName.startsWith('นาย') || patientName.startsWith('นาง') || patientName.startsWith('ด.ช.') || patientName.startsWith('ด.ญ.');
    const displayName = hasTitle ? patientName : `คุณ${patientName}`;
    const hnDisplay = rawHn ? (rawHn.startsWith('HN') ? rawHn : `HN${rawHn}`) : '';
    const patientLine = hnDisplay ? `👤 **${displayName}** (${hnDisplay})` : `👤 **${displayName}**`;

    let serviceOrReason = '-';
    if (serviceType && serviceType !== '-' && reason && reason !== '-') {
      serviceOrReason = serviceType === reason ? serviceType : `${serviceType} / ${reason}`;
    } else if (serviceType && serviceType !== '-') {
      serviceOrReason = serviceType;
    } else if (reason && reason !== '-') {
      serviceOrReason = reason;
    }

    const phoneDisplay = cleanPhone 
      ? `[${phone}](${webappUrl}/api/call?tel=${cleanPhone})` 
      : (phone || '-');

    desc = `${patientLine}\n` +
           `📅 **วันเวลานัด:** ${dateStr} ${timeStr}\n` +
           `👩‍⚕️ **แพทย์:** ${doctor}\n` +
           `📋 **บริการ:** ${serviceOrReason}\n` +
           `📞 **เบอร์ติดต่อ:** ${phoneDisplay}`;
  } else if (eventType === 'pos') {
    color = 0x0284c7; // Sky Blue
    const receiptNo = rawPayload.receiptId || rawPayload.receiptNo || (fields.find(f => f.name && f.name.includes('เลขที่'))?.value) || '-';
    const totalAmount = rawPayload.grandTotal || rawPayload.total || (fields.find(f => f.name && f.name.includes('ยอดชำระ'))?.value?.replace(/[^\d.]/g, '')) || 0;
    const dateStr = rawPayload.datetime || rawPayload.date || (fields.find(f => f.name && f.name.includes('วัน'))?.value) || new Date().toLocaleDateString('th-TH');
    const payMethod = rawPayload.paymentMethod || (fields.find(f => f.name && f.name.includes('ช่องทาง'))?.value) || 'เงินสด';
    const staff = rawPayload.staff || (fields.find(f => f.name && f.name.includes('ผู้ทำรายการ'))?.value) || 'เจ้าหน้าที่';
    const hasTitle = patientName.startsWith('คุณ') || patientName.startsWith('นาย') || patientName.startsWith('นาง') || patientName.startsWith('ด.ช.') || patientName.startsWith('ด.ญ.');
    const displayName = hasTitle ? patientName : `คุณ${patientName}`;
    const phoneDisplay = cleanPhone 
      ? `[${phone}](${webappUrl}/api/call?tel=${cleanPhone})` 
      : (phone || '-');

    embedTitle = `💵 ชำระเงิน POS • [ ${receiptNo} ]`;

    desc = `👤 **${displayName}**${receiptNo && receiptNo !== '-' ? ` (${receiptNo})` : ''}\n` +
           `📅 **วันที่:** ${dateStr}\n` +
           `📞 **เบอร์ติดต่อ:** ${phoneDisplay}\n` +
           `💳 **ช่องทาง:** ${payMethod}\n` +
           `👨‍💼 **ผู้บันทึก:** ${staff}\n` +
           `💰 **ยอดรวมทั้งสิ้น:** ฿${Number(totalAmount).toLocaleString()}`;
  } else if (eventType === 'opd') {
    color = 0x10b981; // Emerald Green
    const rawDoctor = rawPayload.doctor || (fields.find(f => f.name && f.name.includes('แพทย์'))?.value) || '-';
    const doctorDisplay = (!rawDoctor || rawDoctor === '-') 
      ? '-' 
      : (rawDoctor.startsWith('หมอ') || rawDoctor.startsWith('พญ.') || rawDoctor.startsWith('นพ.') || rawDoctor.startsWith('ทพ.') || rawDoctor.startsWith('ดร.') 
          ? rawDoctor 
          : (rawDoctor.includes('หมอ') ? rawDoctor : `หมอ${rawDoctor}`));
    const dateStr = rawPayload.date || (fields.find(f => f.name && f.name.includes('วัน'))?.value) || new Date().toLocaleDateString('th-TH');
    const diagnosis = (rawPayload.diagnosis && rawPayload.diagnosis !== '-') 
      ? rawPayload.diagnosis 
      : (rawPayload.chiefComplaint || rawPayload.cc || (fields.find(f => f.name && (f.name.includes('วินิจฉัย') || f.name.includes('อาการสำคัญ') || f.name.includes('อาการ')))?.value) || '-');
    const treatments = rawPayload.treatment || rawPayload.treatments || rawPayload.prescription || (fields.find(f => f.name && (f.name.includes('หัตถการ') || f.name.includes('รักษา'))))?.value || '-';
    const medications = rawPayload.medications || (fields.find(f => f.name && f.name.includes('ยา') && !f.name.includes('รักษา'))?.value) || '';
    const hasTitle = patientName.startsWith('คุณ') || patientName.startsWith('นาย') || patientName.startsWith('นาง') || patientName.startsWith('ด.ช.') || patientName.startsWith('ด.ญ.');
    const displayName = hasTitle ? patientName : `คุณ${patientName}`;
    const hnDisplay = rawHn ? (rawHn.startsWith('HN') ? rawHn : `HN${rawHn}`) : '';
    const phoneDisplay = cleanPhone 
      ? `[${phone}](${webappUrl}/api/call?tel=${cleanPhone})` 
      : (phone || '-');

    embedTitle = `🩺 บันทึกตรวจรักษา OPD • [ ${displayName} ]`;

    desc = `👤 **${displayName}** (${hnDisplay || 'ทั่วไป'})\n` +
           `📅 **วันที่ตรวจ:** ${dateStr}\n` +
           `👩‍⚕️ **แพทย์ผู้ตรวจ:** ${doctorDisplay}\n` +
           `📞 **เบอร์ติดต่อ:** ${phoneDisplay}\n` +
           `🩺 **ผลการวินิจฉัย:** ${diagnosis}\n` +
           `💉 **การรักษา/หัตถการ:** ${treatments}` +
           (medications && medications !== '-' ? `\n💊 **รายการยา:** ${medications}` : '');
  } else if (eventType === 'mr') {
    color = 0x8b5cf6; // Purple
    const actionDesc = rawPayload.actionDesc || (fields.find(f => f.name && (f.name.includes('รายการ') || f.name.includes('การกระทำ')))?.value) || 'อัปเดตข้อมูลเวชระเบียน';
    const staff = rawPayload.staff || (fields.find(f => f.name && f.name.includes('เจ้าหน้าที่'))?.value) || 'เจ้าหน้าที่';
    const displayName = patientName.startsWith('คุณ') ? patientName : `คุณ${patientName}`;
    const hnDisplay = rawHn ? (rawHn.startsWith('HN') ? rawHn : `HN${rawHn}`) : '';

    embedTitle = `📁 เวชระเบียนผู้ป่วย • [ ${displayName} ]`;

    desc = `👤 **${displayName}** (${hnDisplay || 'ทั่วไป'})\n` +
           `📝 **รายการ:** ${actionDesc}\n` +
           `👨‍💼 **ผู้ดำเนินการ:** ${staff}`;
  } else if (eventType === 'dashboard') {
    color = 0x059669; // Forest Green
    const branchName = rawPayload.branchName || 'ทุกสาขารวม';
    const dateStr = rawPayload.date || new Date().toLocaleDateString('th-TH');
    const totalRev = rawPayload.totalRevenue || 0;
    const totalPatients = rawPayload.patientCount || 0;
    const cashAmount = rawPayload.cashTotal || 0;
    const transferAmount = rawPayload.transferTotal || 0;
    const creditAmount = rawPayload.creditTotal || 0;

    embedTitle = `🌻 สรุปยอดคลินิกประจำวัน • [ ${dateStr} ]`;

    desc = `💰 **ยอดรายรับรวม:** ฿${Number(totalRev).toLocaleString()}\n` +
           `👥 **จำนวนผู้รับบริการ:** ${totalPatients} ราย\n` +
           `• 💵 **เงินสด:** ฿${Number(cashAmount).toLocaleString()}\n` +
           `• 📲 **เงินโอน:** ฿${Number(transferAmount).toLocaleString()}\n` +
           `• 💳 **บัตรเครดิต:** ฿${Number(creditAmount).toLocaleString()}\n\n` +
           `🏥 **สาขา:** ${branchName}`;
  } else {
    color = discordColor || 0x0284c7;
    embedTitle = `[ ${title || 'แจ้งเตือนคลินิก'} ]`;

    let fieldsText = '';
    if (Array.isArray(fields) && fields.length > 0) {
      fieldsText = fields.map(f => `**${f.name}:** ${f.value}`).join('\n') + '\n';
    }

    desc = `>>> ## **${title || 'แจ้งเตือนคลินิก'}**\n` +
           (message ? `${message}\n` : '') +
           (fieldsText ? `${fieldsText}` : '');
  }

  const defaultAvatar = 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=150';
  const finalAvatar = formatDirectImageUrl(botAvatarUrl) || defaultAvatar;
  const finalUsername = botName?.trim() || 'Anping Clinic Notifier';

  return {
    username: finalUsername,
    avatar_url: finalAvatar,
    embeds: [
      {
        author: {
          name: '🏥 ANPING CLINIC • MEDICAL SYSTEM',
          icon_url: finalAvatar
        },
        title: embedTitle,
        description: desc,
        color: color,
        footer: {
          text: formatThaiNotificationTimestamp()
        }
      }
    ]
  };
}

/**
 * Send Discord Webhook with Rich Embed and Interactive Link Buttons
 */
export async function sendDiscordEmbed(webhookUrl, { 
  title, 
  description, 
  color = 0x0284c7, 
  fields = [], 
  footerText = 'Anping Clinic',
  linkUrl = 'https://anpingclinic.vercel.app',
  linkButtonLabel = '🌐 เปิดดูในระบบ Anping Clinic ↗',
  rawPayload = {},
  eventType = null,
  botName = '',
  botAvatarUrl = ''
}) {
  if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.trim().startsWith('http')) {
    return { success: false, error: 'Missing or invalid Webhook URL' };
  }

  const defaultAvatar = 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=150';
  const finalAvatar = formatDirectImageUrl(botAvatarUrl) || defaultAvatar;
  const finalUsername = botName?.trim() || 'Anping Clinic Notifier';

  // Format with blockquote Flex Card container if fields or eventType exists
  let payload;
  if (eventType || (fields && fields.length > 0) || rawPayload.patientName) {
    payload = buildDiscordFlexPayload({
      eventType: eventType || 'general',
      title,
      message: description,
      fields,
      rawPayload,
      discordColor: color,
      footerText,
      webappUrl: linkUrl,
      botName: finalUsername,
      botAvatarUrl: finalAvatar
    });
  } else {
    payload = {
      username: finalUsername,
      avatar_url: finalAvatar,
      embeds: [
        {
          author: {
            name: '🏥 ANPING CLINIC • MEDICAL SYSTEM',
            icon_url: finalAvatar
          },
          title: title,
          description: description ? (description.startsWith('>>>') ? description : `>>> ${description}`) : '',
          color: color,
          fields: fields,
          footer: {
            text: formatThaiNotificationTimestamp()
          }
        }
      ]
    };
  }

  try {
    const res = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return { success: res.ok, status: res.status };
  } catch (err) {
    console.error('[Discord Webhook Send Error]:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Sync quota usage for all LINE bots
 */
export async function syncLineBotQuotas(bots) {
  if (!Array.isArray(bots) || bots.length === 0) return bots;

  // 1. Try /api/line
  try {
    const res = await fetch('/api/line?action=sync_quotas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sync_quotas', tokens: bots.map(b => ({ id: b.id, token: b.token })) })
    });
    const ct = res.headers.get('content-type') || '';
    if (res.ok && ct.includes('application/json')) {
      const data = await res.json();
      if (data && data.quotas) {
        return bots.map(b => ({
          ...b,
          usedQuota: data.quotas[b.id] !== undefined ? data.quotas[b.id] : b.usedQuota
        }));
      }
    }
  } catch (e) {
    console.warn('Sync quotas /api/line fallback:', e);
  }

  // 2. Try Supabase Edge Function
  try {
    const edgeRes = await fetch('https://mjgdafabuzguofknhxvv.supabase.co/functions/v1/line-messaging', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sync_quotas', tokens: bots.map(b => ({ id: b.id, token: b.token })) })
    });
    if (edgeRes.ok) {
      const data = await edgeRes.json().catch(() => ({}));
      if (data && data.quotas) {
        return bots.map(b => ({
          ...b,
          usedQuota: data.quotas[b.id] !== undefined ? data.quotas[b.id] : b.usedQuota
        }));
      }
    }
  } catch (edgeErr) {
    console.warn('Sync quotas Edge Function fallback:', edgeErr);
  }

  // 3. Direct fetch fallback
  const updatedBots = await Promise.all(bots.map(async (bot) => {
    if (!bot.token) return bot;
    try {
      const res = await fetch('https://api.line.me/v2/bot/message/quota/consumption', {
        headers: { 'Authorization': `Bearer ${bot.token.trim()}` }
      });
      if (res.ok) {
        const json = await res.json();
        return { ...bot, usedQuota: Number(json.totalUsage || 0) };
      }
    } catch (err) {}
    return bot;
  }));

  return updatedBots;
}

/**
 * Dispatch Clinic Notification to both LINE and Discord
 */
export async function dispatchClinicNotification({
  eventType = 'queue', // 'queue' | 'pos' | 'opd' | 'mr' | 'dashboard'
  settings,
  title,
  message = '',
  fields = [],
  rawPayload = {},
  discordColor,
  lineFlex = null,
  callAppScript = null
}) {
  // 🛡️ Multi-layer self-healing token resolution:
  // 1. settings argument -> 2. in-memory cache -> 3. localStorage -> 4. Supabase DB
  let effectiveSettings = settings;

  const hasUsableTokens = (s) => {
    if (!s || typeof s !== 'object') return false;
    const hasLine = Boolean(s.line?.bots?.some(b => Boolean(b.token && b.token.trim())) || s.line);
    const hasDiscord = Boolean(s.discord?.channels?.some(c => Boolean(c.webhookUrl && c.webhookUrl.trim())) || s.discord);
    return Boolean(hasLine || hasDiscord);
  };

  if (!hasUsableTokens(effectiveSettings)) {
    const cached = getCachedIntegrationTokens();
    if (hasUsableTokens(cached)) {
      effectiveSettings = cached;
    } else {
      // Direct live fetch from Supabase if not yet in cache
      try {
        if (supabase) {
          const { data: dbSetting } = await supabase
            .from('settings')
            .select('values')
            .eq('id', 'integration_tokens')
            .single();
          if (dbSetting?.values && hasUsableTokens(dbSetting.values)) {
            effectiveSettings = dbSetting.values;
            setCachedIntegrationTokens(dbSetting.values);
          }
        }
      } catch (dbErr) {
        console.warn('[NotificationHub] Direct Supabase fetch fallback note:', dbErr?.message);
      }
    }
  } else {
    setCachedIntegrationTokens(effectiveSettings);
  }

  const normalized = normalizeIntegrationTokens(effectiveSettings);
  const results = { line: null, discord: [] };

  // Determine standard color palette per event type
  const eventColorMap = {
    queue: 0x0284c7, // Sky Blue
    pos: 0x059669,   // Emerald Green
    mr: 0xd97706,    // Amber Orange
    opd: 0x7c3aed,   // Violet / Purple
    dashboard: 0x2563eb // Royal Blue
  };
  const finalDiscordColor = discordColor !== undefined ? discordColor : (eventColorMap[eventType] || 0x0284c7);

  // 1. Dispatch to Discord (Multi-Channel Webhooks)
  if (normalized.discord.enabled && Array.isArray(normalized.discord.channels)) {
    let matchingChannels = normalized.discord.channels.filter(ch => 
      Boolean(ch.webhookUrl && ch.webhookUrl.trim()) &&
      (ch.event === eventType || ch.event === 'all' || !ch.event)
    );

    // Fallback: If no channel explicitly matched this event, but active webhook(s) exist
    if (matchingChannels.length === 0) {
      const allValidChannels = normalized.discord.channels.filter(ch => Boolean(ch.webhookUrl && ch.webhookUrl.trim()));
      if (allValidChannels.length > 0) {
        matchingChannels = allValidChannels;
      }
    }

    for (const channel of matchingChannels) {
      try {
        const channelAvatar = channel.botAvatarUrl || normalized.discord.botAvatarUrl || '';
        const channelBotName = channel.botName || normalized.discord.botName || 'Anping Clinic Notifier';
        const res = await sendDiscordEmbed(channel.webhookUrl, {
          eventType,
          title: title || `แจ้งเตือนจากระบบ Anping Clinic`,
          description: message,
          color: finalDiscordColor,
          fields: fields,
          rawPayload: rawPayload,
          footerText: `Anping Clinic • ห้อง ${channel.name}`,
          linkUrl: 'https://anpingclinic.vercel.app',
          linkButtonLabel: '🌐 เปิดดูในระบบ Anping Clinic ↗',
          botAvatarUrl: channelAvatar,
          botName: channelBotName
        });
        results.discord.push({ channelId: channel.id, channelName: channel.name, success: res.success });
      } catch (err) {
        results.discord.push({ channelId: channel.id, channelName: channel.name, success: false, error: err.message });
      }
    }
  }

  // 2. Dispatch to LINE (Multi-Bot Failover Pool with 100% Flex Messages)
  if (normalized.line.enabled && normalized.line.events[eventType] !== false) {
    const bots = normalized.line.bots || [];
    const recipients = normalized.line.recipients || [];

    // Find first bot with quota available
    let activeBot = bots.find(b => Boolean(b.token) && (Number(b.usedQuota || 0) < Number(b.totalQuota || 300)));
    if (!activeBot && bots.length > 0 && bots[0].token) {
      activeBot = bots[0]; // fallback to first bot
    }

    if (activeBot) {
      const targetChatIds = activeBot.customChatId 
        ? [activeBot.customChatId] 
        : recipients.map(r => r.chatId).filter(Boolean);

      if (targetChatIds.length > 0) {
        try {
          // Generate rich Flex Message if not provided
          const finalLineFlex = lineFlex || buildLineFlexMessage({
            eventType,
            title,
            message,
            fields,
            rawPayload,
            webappUrl: 'https://anpingclinic.vercel.app'
          });

          const linePayload = {
            action: 'send_push',
            token: activeBot.token,
            to: targetChatIds,
            messages: [finalLineFlex]
          };

          let resOk = false;

          // Attempt 1: /api/line
          try {
            const res = await fetch('/api/line', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(linePayload)
            });
            const ct = res.headers.get('content-type') || '';
            if (res.ok && ct.includes('application/json')) {
              const data = await res.json();
              if (data.status === 'OK' || data.success) resOk = true;
            }
          } catch (e) {
            console.warn('/api/line push failed, trying edge fallback', e);
          }

          // Attempt 2: Supabase Edge Function line-messaging
          if (!resOk) {
            try {
              const edgeRes = await fetch('https://mjgdafabuzguofknhxvv.supabase.co/functions/v1/line-messaging', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(linePayload)
              });
              if (edgeRes.ok) {
                const data = await edgeRes.json().catch(() => ({}));
                if (data.success || data.status === 'OK') resOk = true;
              }
            } catch (edgeErr) {
              console.warn('Supabase Edge Function push failed:', edgeErr);
            }
          }

          results.line = { success: resOk, botName: activeBot.name };

          // Optimistically increment bot quota if sent
          if (resOk) {
            activeBot.usedQuota = (Number(activeBot.usedQuota) || 0) + targetChatIds.length;
            if (typeof callAppScript === 'function') {
              callAppScript('SAVE_DATA', 'Settings', { id: 'integration_tokens', values: normalized }).catch(() => {});
            }
          }
        } catch (err) {
          console.warn('[LINE Push Error]:', err);
          results.line = { success: false, error: err.message };
        }
      }
    }
  }

  console.log(`[NotificationHub] Dispatched "${eventType}" notification:`, results);
  return results;
}

/**
 * Send a test push message to LINE (Delivered as a rich Flex Card with Action Buttons)
 */
export async function sendTestLinePush({ token, targetId }) {
  if (!token || !targetId) {
    return { success: false, error: 'กรุณาระบุ Channel Access Token และ ID ผู้รับ / กลุ่ม' };
  }

  const testFlex = {
    type: "flex",
    altText: "🔔 ทดสอบระบบแจ้งเตือน Anping Clinic สำเร็จ",
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0284c7",
        paddingAll: "16px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            alignItems: "center",
            contents: [
              { type: "text", text: "ANPING CLINIC", weight: "bold", color: "#ffffff", size: "xxs", flex: 1 },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#ffffff2b",
                cornerRadius: "10px",
                paddingStart: "8px",
                paddingEnd: "8px",
                paddingTop: "2px",
                paddingBottom: "2px",
                contents: [
                  { type: "text", text: "ทดสอบสำเร็จ ✅", color: "#ffffff", size: "xxs", weight: "bold" }
                ]
              }
            ]
          },
          {
            type: "text",
            text: "🔔 ทดสอบการแจ้งเตือน LINE Bot",
            color: "#ffffff",
            weight: "bold",
            size: "md",
            margin: "sm"
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        spacing: "md",
        contents: [
          {
            type: "text",
            text: "ระบบแจ้งเตือน LINE Flex Message ของ Anping Clinic เชื่อมต่อสมบูรณ์แล้ว!",
            size: "sm",
            color: "#334155",
            wrap: true
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#f0f9ff",
            borderColor: "#bae6fd",
            borderWidth: "1px",
            cornerRadius: "8px",
            paddingAll: "10px",
            contents: [
              {
                type: "text",
                text: "✨ รองรับการแจ้งเตือน นัดหมาย, การเงิน POS, ตัดรอบคอร์ส และ OPD แบบ Real-time",
                size: "xs",
                color: "#0369a1",
                wrap: true
              }
            ]
          },
          {
            type: "box",
            layout: "vertical",
            spacing: "xs",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "🕒 เวลาทดสอบ", size: "xs", color: "#64748b", flex: 3 },
                  { type: "text", text: `${new Date().toLocaleTimeString('th-TH')} น.`, size: "xs", color: "#1e293b", weight: "bold", flex: 7 }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "⚡ ระบบคู่ขนาน", size: "xs", color: "#64748b", flex: 3 },
                  { type: "text", text: "LINE Flex + Discord", size: "xs", color: "#0284c7", weight: "bold", flex: 7 }
                ]
              }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "xs",
        paddingAll: "14px",
        paddingTop: "0px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            contents: [
              {
                type: "button",
                style: "secondary",
                color: "#f1f5f9",
                height: "sm",
                action: {
                  type: "message",
                  label: "📋 เมนูลัดคลินิก",
                  text: "เมนู"
                }
              },
              {
                type: "button",
                style: "primary",
                color: "#0284c7",
                height: "sm",
                action: {
                  type: "uri",
                  label: "🌐 เปิดระบบคลินิก ↗",
                  uri: "https://anpingclinic.vercel.app"
                }
              }
            ]
          },
          {
            type: "text",
            text: formatThaiNotificationTimestamp(),
            size: "xxs",
            color: "#94a3b8",
            align: "center",
            margin: "sm",
            wrap: true
          }
        ]
      }
    }
  };

  const payload = {
    action: 'send_push',
    token: token.trim(),
    to: [targetId.trim()],
    messages: [testFlex]
  };

  try {
    const res = await fetch('/api/line', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const ct = res.headers.get('content-type') || '';
    if (res.ok && ct.includes('application/json')) {
      const data = await res.json();
      if (data.status === 'OK' || data.success) return { success: true };
    }
  } catch (e) {}

  try {
    const edgeRes = await fetch('https://mjgdafabuzguofknhxvv.supabase.co/functions/v1/line-messaging', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (edgeRes.ok) {
      const data = await edgeRes.json().catch(() => ({}));
      if (data.success) return { success: true };
    }
  } catch (e) {}

  return { success: false, error: 'ไม่สามารถส่งข้อความได้ กรุณาตรวจสอบ Token และ ID ผู้รับ' };
}

/**
 * Send interactive Flex Menu directly into LINE chat / group
 */
export async function sendMenuLinePush({ token, targetId }) {
  if (!token || !targetId) {
    return { success: false, error: 'Token or Target Chat ID is missing' };
  }

  const menuFlex = buildLineFlexMessage({ eventType: 'menu' });
  const payload = {
    action: 'send_push',
    token: token.trim(),
    to: [targetId.trim()],
    messages: [menuFlex]
  };

  try {
    const res = await fetch('/api/line', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const ct = res.headers.get('content-type') || '';
    if (res.ok && ct.includes('application/json')) {
      const data = await res.json();
      if (data.status === 'OK' || data.success) return { success: true };
    }
  } catch (e) {}

  try {
    const edgeRes = await fetch('https://mjgdafabuzguofknhxvv.supabase.co/functions/v1/line-messaging', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (edgeRes.ok) {
      const data = await edgeRes.json().catch(() => ({}));
      if (data.success) return { success: true };
    }
  } catch (e) {}

  return { success: false, error: 'ไม่สามารถส่งเมนูลัดได้ กรุณาตรวจสอบ Token และ ID ผู้รับ' };
}

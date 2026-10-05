import React from 'react';

/**
 * Smart Thai Typography & Word Wrap Engine
 * Adheres to Royal Institute of Thailand typographic conventions and modern web typography:
 * 1. Prevents orphan splits of compound nouns / medical terminology (e.g. การไหลเวียนโลหิต, ปรับสมดุลหยิน-หยาง)
 * 2. Treats parenthetical phrases as atomic non-breaking units: (Cupping Therapy), (Herbal Medicine)
 * 3. Keeps multi-word Latin medical / technical terms atomic: Office Syndrome, Tuina Therapy
 * 4. Wraps semantic grammatical chunks in <span className="inline-block"> so lines wrap naturally without breaking mid-word
 */
export function formatThaiTypography(text) {
  if (!text || typeof text !== 'string') return text;
  
  const clean = text.trim();
  if (!clean) return '';

  // Match:
  // 1. Parentheses / brackets: (Cupping Therapy), [ ... ]
  // 2. Multi-word Latin phrases: Office Syndrome, Tuina Therapy, etc.
  // 3. Thai segments with deliberate space boundaries or punctuation
  const regex = /(\([^)]+\)|\[[^\]]+\]|[A-Za-z0-9#\-_.]+(?:\s+[A-Za-z0-9#\-_.]+)*|[^\s()\[\]]+)/g;
  const rawTokens = [];
  let match;
  while ((match = regex.exec(clean)) !== null) {
    rawTokens.push(match[1]);
  }

  // Refine Thai compound words that shouldn't be awkwardly severed
  const refined = [];
  for (const tok of rawTokens) {
    if (tok.startsWith('ครอบแก้วกระตุ้นการไหลเวียนโลหิต')) {
      refined.push('ครอบแก้ว', 'กระตุ้นการไหลเวียนโลหิต');
    } else if (tok.includes('การไหลเวียนโลหิต') && tok !== 'การไหลเวียนโลหิต' && !tok.startsWith('(')) {
      const parts = tok.split('การไหลเวียนโลหิต');
      if (parts[0]) refined.push(parts[0]);
      refined.push('การไหลเวียนโลหิต');
      if (parts[1]) refined.push(parts[1]);
    } else {
      refined.push(tok);
    }
  }

  return refined.map((token, i) => (
    <React.Fragment key={i}>
      <span className="inline-block">{token}</span>
      {i < refined.length - 1 ? ' ' : ''}
    </React.Fragment>
  ));
}

/**
 * Master Tag Badge Gradient Styles Architecture
 * 3 Distinct Styles x 8 Curated Shades = 24 Signature Gradients
 * 
 * Category 1: สไตล์ทองหรูหรา (Luxury Gold) - 8 เฉดสีทองเมทัลลิกแท้ตามภาพอ้างอิง
 * Category 2: สไตล์มินิมอล (Minimal Glass) - 8 เฉดกระจกฝ้าคลีนโมเดิร์น
 * Category 3: สไตล์ตะโกนโปรโมชั่น (High-Impact Promo) - 8 เฉดสีเพลิงดึงดูดสายตา
 */

export const TAG_STYLE_CATEGORIES = [
  {
    id: 'luxury_gold',
    name: 'สไตล์ทองหรูหรา',
    desc: 'ทองเมทัลลิกประกายหรูหรา เลอค่า พรีเมียม เกรดการแพทย์',
    icon: '👑',
    themeColor: '#D49B35',
    shades: [
      {
        id: 'gold_royal_metallic',
        name: 'ทองรอยัลเมทัลลิก',
        desc: 'ทองเมทัลลิกประกายแวววาวไล่เฉดเข้ม-สว่าง สมบูรณ์แบบตามภาพอ้างอิง',
        style: {
          background: 'linear-gradient(90deg, #B57E10 0%, #DCA019 22%, #FFF49E 48%, #DCA019 74%, #9E6502 100%)',
          border: '1px solid rgba(255, 244, 158, 0.95)',
          color: '#2E1700',
          boxShadow: '0 4px 18px rgba(181, 126, 16, 0.55)',
          textShadow: '0 1px 0 rgba(255, 255, 255, 0.5)'
        }
      },
      {
        id: 'gold_metallic_gleam',
        name: 'ประกายเมทัลลิก',
        desc: 'ทองสะท้อนแสงเมทัลลิกแวววาว ดึงดูดสายตาสูงสุด',
        style: {
          background: 'linear-gradient(105deg, #9B6700 0%, #C98800 18%, #FFFCA0 46%, #FFFFFF 52%, #D09300 76%, #8A5800 100%)',
          border: '1px solid rgba(255, 255, 200, 0.95)',
          color: '#341A00',
          boxShadow: '0 4px 18px rgba(201, 136, 0, 0.55)',
          textShadow: '0 1px 0 rgba(255, 255, 255, 0.4)'
        }
      },
      {
        id: 'gold_imperial_24k',
        name: 'ทองคำแท้ 24K',
        desc: 'ทองคำแท้บริสุทธิ์ สไตล์ราชสำนักจีน เลอค่า',
        style: {
          background: 'linear-gradient(110deg, #A16D19 0%, #D49B35 25%, #FFF6C5 50%, #D49B35 75%, #A16D19 100%)',
          border: '1px solid rgba(255, 238, 160, 0.9)',
          color: '#381E02',
          boxShadow: '0 4px 16px rgba(161, 109, 25, 0.48)',
          textShadow: '0 1px 0 rgba(255, 255, 255, 0.4)'
        }
      },
      {
        id: 'gold_champagne',
        name: 'ทองแชมเปญ',
        desc: 'ทองแชมเปญประกายอบอุ่น นุ่มนวล สง่างาม',
        style: {
          background: 'linear-gradient(115deg, #8E6527 0%, #BA893D 30%, #FBE596 55%, #D4A34F 80%, #9B6F2B 100%)',
          border: '1px solid rgba(251, 229, 150, 0.85)',
          color: '#3C2203',
          boxShadow: '0 4px 14px rgba(142, 101, 39, 0.4)'
        }
      },
      {
        id: 'gold_silk',
        name: 'ทองคำสว่างบริสุทธิ์',
        desc: 'ทองไหมสว่างประกาย เรียบเนียนตา',
        style: {
          background: 'linear-gradient(110deg, #B5843C 0%, #D8A555 35%, #FFF0B8 55%, #CCA054 85%, #A67530 100%)',
          border: '1px solid rgba(255, 240, 184, 0.85)',
          color: '#3A2004',
          boxShadow: '0 4px 14px rgba(181, 132, 60, 0.4)'
        }
      },
      {
        id: 'gold_brushed_brass',
        name: 'ทองเหลืองขัดเงา',
        desc: 'ทองขัดเงาหนักแน่น คลาสสิกร่วมสมัย',
        style: {
          background: 'linear-gradient(110deg, #A56C1D 0%, #CD8E2D 35%, #FFE99E 58%, #C28424 85%, #8F5812 100%)',
          border: '1px solid rgba(255, 233, 158, 0.85)',
          color: '#341901',
          boxShadow: '0 4px 14px rgba(165, 108, 29, 0.45)'
        }
      },
      {
        id: 'gold_rose',
        name: 'ทองชมพูกุหลาบ',
        desc: 'โรสโกลด์อ่อนหวาน หรูหราทันสมัย',
        style: {
          background: 'linear-gradient(110deg, #A45347 0%, #D67A66 30%, #FFE2D4 55%, #CF7260 80%, #9B483D 100%)',
          border: '1px solid rgba(255, 226, 212, 0.85)',
          color: '#3D1510',
          boxShadow: '0 4px 14px rgba(164, 83, 71, 0.4)'
        }
      },
      {
        id: 'gold_antique',
        name: 'ทองบรอนซ์โบราณ',
        desc: 'ทองโบราณเข้มขลัง มนต์เสน่ห์ศาสตร์แพทย์แผนจีน',
        style: {
          background: 'linear-gradient(110deg, #6B4916 0%, #996B27 30%, #E0B46A 55%, #A8762F 80%, #5E3E10 100%)',
          border: '1px solid rgba(224, 180, 106, 0.8)',
          color: '#261502',
          boxShadow: '0 4px 14px rgba(107, 73, 22, 0.45)'
        }
      }
    ]
  },
  {
    id: 'minimal',
    name: 'สไตล์มินิมอล',
    desc: 'กระจกฝ้าโปร่งแสง เรียบหรู คลีนโมเดิร์น',
    icon: '💎',
    themeColor: '#94A3B8',
    shades: [
      {
        id: 'minimal_crystal_frost',
        name: 'คริสตัลฝ้าใส',
        desc: 'กระจกฝ้าใส โมเดิร์นเข้ากับทุกภาพ',
        style: {
          background: 'linear-gradient(135deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.10) 100%)',
          border: '1px solid rgba(255,255,255,0.45)',
          color: '#ffffff',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
        }
      },
      {
        id: 'minimal_smoky_graphite',
        name: 'สโมคกี้กราไฟต์',
        desc: 'กระจกรมควันมืด ตัดกับตัวหนังสือขาวคมชัด',
        style: {
          background: 'linear-gradient(135deg, rgba(30,41,59,0.85) 0%, rgba(15,23,42,0.92) 100%)',
          border: '1px solid rgba(255,255,255,0.22)',
          color: '#f8fafc',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 14px rgba(0,0,0,0.35)'
        }
      },
      {
        id: 'minimal_pearl_white',
        name: 'ขาวมุกประกาย',
        desc: 'ขาวมุกนวลตา สดใส โดดเด่นบนภาพมืด',
        style: {
          background: 'linear-gradient(135deg, rgba(255,255,255,0.94) 0%, rgba(241,245,249,0.88) 100%)',
          border: '1px solid rgba(203,213,225,0.85)',
          color: '#0f172a',
          boxShadow: '0 4px 14px rgba(0,0,0,0.18)'
        }
      },
      {
        id: 'minimal_sage_mint',
        name: 'เขียวเสจมินิมอล',
        desc: 'เขียวเสจสบายตา สื่อถึงธรรมชาติและการบำบัด',
        style: {
          background: 'linear-gradient(135deg, rgba(6,78,59,0.75) 0%, rgba(4,120,87,0.75) 100%)',
          border: '1px solid rgba(167,243,208,0.5)',
          color: '#ecfdf5',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 14px rgba(4,120,87,0.3)'
        }
      },
      {
        id: 'minimal_pastel_sky',
        name: 'ฟ้าพาสเทลโปร่ง',
        desc: 'ฟ้าโปร่งสบายตา ผ่อนคลาย สะอาดบริสุทธิ์',
        style: {
          background: 'linear-gradient(135deg, rgba(12,74,110,0.75) 0%, rgba(2,132,199,0.75) 100%)',
          border: '1px solid rgba(186,230,253,0.5)',
          color: '#f0f9ff',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 14px rgba(2,132,199,0.3)'
        }
      },
      {
        id: 'minimal_warm_cream',
        name: 'ครีมอบอุ่น',
        desc: 'ครีมโทนอุ่น ละมุนตา สบายใจ',
        style: {
          background: 'linear-gradient(135deg, rgba(120,53,15,0.75) 0%, rgba(180,83,9,0.75) 100%)',
          border: '1px solid rgba(253,230,138,0.5)',
          color: '#fefce8',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 14px rgba(180,83,9,0.3)'
        }
      },
      {
        id: 'minimal_deep_slate',
        name: 'กรมท่าสุขุม',
        desc: 'กรมท่าสุขุม น่าเชื่อถือ มาตรฐานระดับสากล',
        style: {
          background: 'linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(30,41,59,0.85) 100%)',
          border: '1px solid rgba(148,163,184,0.4)',
          color: '#f1f5f9',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
        }
      },
      {
        id: 'minimal_charcoal',
        name: 'ชาร์โคลโมเดิร์น',
        desc: 'ดำถ่านชาร์โคลเข้ม ลุ่มลึก ทันสมัย',
        style: {
          background: 'linear-gradient(135deg, rgba(24,24,27,0.90) 0%, rgba(9,9,11,0.95) 100%)',
          border: '1px solid rgba(255,255,255,0.18)',
          color: '#e4e4e7',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 14px rgba(0,0,0,0.35)'
        }
      }
    ]
  },
  {
    id: 'vibrant_promo',
    name: 'สไตล์ตะโกนโปรโมชั่น',
    desc: 'สีเพลิงดึงดูดสายตา โดดเด่นเห็นชัดดึงดูดใจจากระยะไกล',
    icon: '🔥',
    themeColor: '#FF1E56',
    shades: [
      {
        id: 'promo_fire_red',
        name: 'แดงเพลิงไฟแรง',
        desc: 'แดงสดสะท้อนเปลวเพลิง ตะโกนว่าโปรโมชั่นด่วน!',
        style: {
          background: 'linear-gradient(110deg, #E11D48 0%, #FF1E56 35%, #FF6B00 100%)',
          border: '1px solid rgba(255, 255, 255, 0.55)',
          color: '#ffffff',
          boxShadow: '0 4px 20px rgba(255, 30, 86, 0.65)',
          textShadow: '0 1px 2px rgba(0,0,0,0.4)'
        }
      },
      {
        id: 'promo_electric_orange',
        name: 'ส้มนีออนสะท้อนแสง',
        desc: 'ส้มพลังงานสูง สดใส กระตุ้นการตัดสินใจ',
        style: {
          background: 'linear-gradient(110deg, #EA580C 0%, #FF6A00 45%, #FFA726 100%)',
          border: '1px solid rgba(255, 255, 255, 0.55)',
          color: '#ffffff',
          boxShadow: '0 4px 18px rgba(255, 106, 0, 0.6)',
          textShadow: '0 1px 2px rgba(0,0,0,0.4)'
        }
      },
      {
        id: 'promo_hot_fuchsia',
        name: 'ชมพูฟูเชียดึงดูด',
        desc: 'ชมพูฟูเชียนีออน จัดจ้าน สดใหม่ สะดุดตาทันที',
        style: {
          background: 'linear-gradient(110deg, #BE185D 0%, #EC4899 45%, #F43F5E 100%)',
          border: '1px solid rgba(255, 255, 255, 0.55)',
          color: '#ffffff',
          boxShadow: '0 4px 18px rgba(236, 72, 153, 0.6)'
        }
      },
      {
        id: 'promo_cyber_yellow',
        name: 'เหลืองนีออนเตือนใจ',
        desc: 'เหลืองสะท้อนแสง เด่นชัดสุดขีด มองเห็นได้ไกลสุดตา',
        style: {
          background: 'linear-gradient(110deg, #CA8A04 0%, #FACC15 45%, #FEF08A 100%)',
          border: '1px solid rgba(254, 240, 138, 0.85)',
          color: '#3A1F02',
          boxShadow: '0 4px 18px rgba(250, 204, 21, 0.55)',
          textShadow: '0 1px 0 rgba(255,255,255,0.4)'
        }
      },
      {
        id: 'promo_electric_violet',
        name: 'ม่วงนีออนสะดุดตา',
        desc: 'ม่วงนีออนไฮเปอร์ โดดเด่น มีเสน่ห์ ล้ำสมัย',
        style: {
          background: 'linear-gradient(110deg, #6D28D9 0%, #8B5CF6 45%, #D946EF 100%)',
          border: '1px solid rgba(255, 255, 255, 0.55)',
          color: '#ffffff',
          boxShadow: '0 4px 18px rgba(139, 92, 246, 0.6)'
        }
      },
      {
        id: 'promo_neon_lime',
        name: 'เขียวสะท้อนแสงจัดจ้าน',
        desc: 'เขียวนีออนสดใส ดึงดูดสายตาฉับพลัน',
        style: {
          background: 'linear-gradient(110deg, #15803D 0%, #22C55E 40%, #A3E635 100%)',
          border: '1px solid rgba(255, 255, 255, 0.55)',
          color: '#052e16',
          boxShadow: '0 4px 18px rgba(34, 197, 94, 0.55)'
        }
      },
      {
        id: 'promo_ruby_crimson',
        name: 'แดงทับทิมหยุดสายตา',
        desc: 'แดงทับทิมหรูหรา ดุดัน น่าเกรงขาม',
        style: {
          background: 'linear-gradient(110deg, #9F1239 0%, #E11D48 45%, #FB7185 100%)',
          border: '1px solid rgba(255, 255, 255, 0.55)',
          color: '#ffffff',
          boxShadow: '0 4px 18px rgba(225, 29, 72, 0.6)'
        }
      },
      {
        id: 'promo_sunburst',
        name: 'แสดพระอาทิตย์เปล่งประกาย',
        desc: 'สีส้มแสดพลังงานแสงอาทิตย์ เจิดจรัส',
        style: {
          background: 'linear-gradient(110deg, #C2410C 0%, #F97316 40%, #FDE047 100%)',
          border: '1px solid rgba(255, 255, 255, 0.55)',
          color: '#ffffff',
          boxShadow: '0 4px 18px rgba(249, 115, 22, 0.6)'
        }
      }
    ]
  }
];

// Flat registry for fast lookup
export const ALL_TAG_SHADES = TAG_STYLE_CATEGORIES.flatMap(cat => cat.shades);

/**
 * Resolves full badge style object ({ className, style }) for any given tagColor key
 */
export function getTagBadgeStyle(tagColor) {
  const safe = String(tagColor || 'gold_royal_metallic').toLowerCase().trim();

  // 1. Direct match with 24 curated shades
  const exact = ALL_TAG_SHADES.find(s => s.id === safe);
  if (exact) {
    return {
      className: 'font-black tracking-wide kanit-text select-none',
      style: exact.style
    };
  }

  // 2. Legacy or category alias mapping
  switch (safe) {
    case 'luxury_gold':
    case 'gold':
    case 'amber':
    case 'yellow':
    case 'gold_royal':
      return getTagBadgeStyle('gold_royal_metallic');
    case 'minimal':
    case 'glass':
    case 'mono':
      return getTagBadgeStyle('minimal_crystal_frost');
    case 'vibrant_promo':
    case 'promo':
    case 'rose':
    case 'red':
      return getTagBadgeStyle('promo_fire_red');
    case 'special':
    case 'special_edition':
      return getTagBadgeStyle('gold_royal_metallic');
    case 'emerald_nature':
    case 'emerald':
    case 'green':
    case 'teal':
      return getTagBadgeStyle('minimal_sage_mint');
    case 'ocean_sapphire':
    case 'blue':
    case 'sky':
    case 'cyan':
      return getTagBadgeStyle('minimal_pastel_sky');
    case 'royal_amethyst':
    case 'purple':
    case 'indigo':
    case 'violet':
    case 'fuchsia':
      return getTagBadgeStyle('promo_hot_fuchsia');
    default:
      return getTagBadgeStyle('gold_royal_metallic');
  }
}

/**
 * Backward compatibility fallback: returns Tailwind class string
 */
export function getTagBadgeClass(tagColor) {
  const { style } = getTagBadgeStyle(tagColor);
  // Return a safe base class; components should prefer using getTagBadgeStyle for exact rendering
  return 'font-black tracking-wide kanit-text shadow-sm';
}

// Keep TAG_STYLE_PRESETS pointing to the 4 categories for backward compatibility
export const TAG_STYLE_PRESETS = TAG_STYLE_CATEGORIES;


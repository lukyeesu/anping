-- ============================================================
-- 1. สร้างตารางระบบคูปองส่วนลด (Coupons System)
-- รองรับทั้งคูปองที่เจนจากระบบ, คูปองอัปโหลดรูปเอง, คูปองสมาชิก VIP และคูปองตลอดชีพ
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coupons (
    id VARCHAR PRIMARY KEY,
    code VARCHAR UNIQUE NOT NULL,                          -- รหัสคูปอง (เช่น CP-2026-001, VIP-690001-A1)
    batch_id VARCHAR,                                       -- รหัสชุดคูปองที่ผลิตพร้อมกัน (เช่น BATCH-179204...)
    batch_name VARCHAR,                                     -- ชื่อชุดคูปอง
    batch_total INT DEFAULT 1,                              -- จำนวนคูปองทั้งหมดในชุด
    title VARCHAR NOT NULL,                                 -- หัวข้อคูปอง / ชื่อโปรโมชั่น
    description TEXT,                                       -- รายละเอียดเงื่อนไข
    discount_type VARCHAR NOT NULL DEFAULT 'percent',       -- 'percent' (เปอร์เซ็นต์) หรือ 'amount' (จำนวนเงินบาท)
    discount_value NUMERIC NOT NULL DEFAULT 0,              -- มูลค่าส่วนลด เช่น 10 (%) หรือ 100 (บาท)
    min_spend NUMERIC DEFAULT 0,                            -- ยอดซื้อขั้นต่ำ (0 = ไม่มีขั้นต่ำ)
    max_discount NUMERIC,                                   -- จำกัดส่วนลดสูงสุด (บาท) กรณีเป็นเปอร์เซ็นต์
    patient_id VARCHAR,                                     -- ผูกกับคนไข้ เช่น 'HN69-0001' (NULL หรือ ว่าง = คูปองทั่วไป/Walk-in)
    patient_name VARCHAR,                                   -- ชื่อคนไข้เจ้าของสิทธิ์
    branch_id VARCHAR DEFAULT 'all',                        -- สาขาที่ออกคูปอง หรือ 'all' (ใช้ได้ทุกสาขา)
    bg_image TEXT,                                          -- รูปภาพคูปอง (URL หรือ Data URL กรณีอัปโหลดรูปเอง)
    logo_url TEXT,                                          -- URL หรือ Data URL โลโก้บนคูปอง
    template_type VARCHAR DEFAULT 'standard',               -- 'standard' (ดีไซน์ระบบ) หรือ 'custom_image' (ภาพคูปองอัปโหลดเอง)
    theme_color VARCHAR DEFAULT 'emerald',                  -- 'emerald', 'sky', 'rose', 'gold', 'purple', 'slate'
    qr_config JSONB,                                        -- การตั้งค่า QR Code
    is_lifetime BOOLEAN DEFAULT FALSE,                      -- คูปองตลอดชีพ หรือไม่มีวันหมดอายุ
    expire_date DATE,                                       -- วันหมดอายุ (ถ้าไม่ใช่ตลอดชีพ)
    status VARCHAR DEFAULT 'active',                        -- 'active' (พร้อมใช้), 'used' (ใช้แล้ว), 'expired' (หมดอายุ), 'cancelled' (ยกเลิก)
    is_used BOOLEAN DEFAULT FALSE,                          -- สถานะถูกใช้งานแล้วหรือไม่
    used_at TIMESTAMPTZ,                                    -- วันเวลาที่นำไปใช้ตัดส่วนลด
    used_in_branch VARCHAR,                                 -- สาขาที่นำไปใช้
    used_in_receipt VARCHAR,                                -- เลขที่บิล POS ที่ใช้คูปอง
    used_by_patient_id VARCHAR,                             -- HN ผู้ที่นำคูปองไปใช้
    source VARCHAR DEFAULT 'manual',                        -- 'manual' (สร้างเอง), 'vip_auto' (ได้จากการสมัครสมาชิก VIP), 'campaign'
    notes TEXT,                                             -- บันทึกเพิ่มเติม
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- ปรับปรุงตารางกรณีที่เคยรัน SQL ไปแล้วก่อนหน้า (Safe Alter)
ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS batch_id VARCHAR,
ADD COLUMN IF NOT EXISTS batch_name VARCHAR,
ADD COLUMN IF NOT EXISTS batch_total INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS qr_config JSONB,
ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT FALSE;

-- สร้าง Indexes เพื่อความรวดเร็วในการค้นหาและสแกนคูปอง
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_batch_id ON public.coupons(batch_id);
CREATE INDEX IF NOT EXISTS idx_coupons_patient_id ON public.coupons(patient_id);
CREATE INDEX IF NOT EXISTS idx_coupons_status ON public.coupons(status);
CREATE INDEX IF NOT EXISTS idx_coupons_expire_date ON public.coupons(expire_date);
CREATE INDEX IF NOT EXISTS idx_coupons_is_deleted ON public.coupons(is_deleted);

-- ============================================================
-- 2. เพิ่มคอลัมน์ระบบสมาชิก VIP ในตาราง patients
-- ============================================================
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS vip_start_date DATE,
ADD COLUMN IF NOT EXISTS vip_expire_date DATE,
ADD COLUMN IF NOT EXISTS vip_tier VARCHAR DEFAULT 'VIP',
ADD COLUMN IF NOT EXISTS vip_always_discount_type VARCHAR DEFAULT 'percent',
ADD COLUMN IF NOT EXISTS vip_always_discount_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS vip_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_patients_is_vip ON public.patients(is_vip);
CREATE INDEX IF NOT EXISTS idx_patients_vip_expire_date ON public.patients(vip_expire_date);

-- ============================================================
-- 3. เพิ่มคอลัมน์ตั้งค่าแพ็กเกจสมาชิก VIP ในตารางสินค้า/บริการ (setting_pos)
-- เพื่อให้ตั้งค่าการแจกคูปอง, มูลค่า, จำนวนใบ และเงื่อนไขโปรโมชั่นได้ที่หน้าสินค้า
-- ============================================================
ALTER TABLE public.setting_pos 
ADD COLUMN IF NOT EXISTS is_membership BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS membership_months INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS vip_benefit_type VARCHAR DEFAULT 'coupon', -- 'coupon' | 'always_discount' | 'both'
ADD COLUMN IF NOT EXISTS vip_always_discount_type VARCHAR DEFAULT 'percent', -- 'percent' | 'amount'
ADD COLUMN IF NOT EXISTS vip_always_discount_value NUMERIC DEFAULT 10,
ADD COLUMN IF NOT EXISTS vip_discount_type VARCHAR DEFAULT 'percent', -- 'percent' | 'amount'
ADD COLUMN IF NOT EXISTS vip_discount_value NUMERIC DEFAULT 10,
ADD COLUMN IF NOT EXISTS vip_coupon_count INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS vip_coupon_title VARCHAR DEFAULT 'คูปองส่วนลดสมาชิก VIP';

-- ============================================================
-- 4. เพิ่มคอลัมน์การตัดคูปองในตารางประวัติการขาย pos_transactions
-- ============================================================
ALTER TABLE public.pos_transactions 
ADD COLUMN IF NOT EXISTS coupon_id VARCHAR,
ADD COLUMN IF NOT EXISTS coupon_code VARCHAR,
ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC DEFAULT 0;

-- ============================================================
-- 5. ตั้งค่า Row Level Security (RLS) สำหรับตาราง coupons
-- ============================================================
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access coupons" ON public.coupons;
CREATE POLICY "Allow authenticated full access coupons" ON public.coupons 
FOR ALL TO authenticated 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon full access coupons" ON public.coupons;
CREATE POLICY "Allow anon full access coupons" ON public.coupons 
FOR ALL TO anon 
USING (true) 
WITH CHECK (true);

-- ============================================================
-- 6. เปิดใช้งาน Supabase Realtime สำหรับตาราง coupons
-- (เพื่อให้หน้าต่างคูปองและระบบ POS ทุกเครื่องเห็นการใช้/ตัดคูปองทันที)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'coupons'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.coupons;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

ALTER TABLE public.coupons REPLICA IDENTITY FULL;

-- ============================================================
-- 7. ตารางคลังแม่แบบพรีเซ็ตคูปอง (Coupon Templates Library)
-- จัดเก็บเป็นก้อน JSON สำหรับโหลดแบบแบ่งหน้า (Pagination 10 รายการ)
-- ประหยัดโควตา Egress Supabase อย่างยั่งยืน
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coupon_templates (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_coupon_templates_created_at ON public.coupon_templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coupon_templates_is_deleted ON public.coupon_templates(is_deleted);

ALTER TABLE public.coupon_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access coupon_templates" ON public.coupon_templates;
CREATE POLICY "Allow authenticated full access coupon_templates" ON public.coupon_templates 
FOR ALL TO authenticated 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon full access coupon_templates" ON public.coupon_templates;
CREATE POLICY "Allow anon full access coupon_templates" ON public.coupon_templates 
FOR ALL TO anon 
USING (true) 
WITH CHECK (true);

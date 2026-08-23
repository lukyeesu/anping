-- ============================================================
-- 1. สร้างตารางเก็บคอร์ส/แพ็กเกจของคนไข้ (Patient Courses)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.patient_courses (
    id VARCHAR PRIMARY KEY,
    patient_id VARCHAR NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    patient_name VARCHAR,
    product_id VARCHAR,
    course_name VARCHAR NOT NULL,
    total_sessions INT NOT NULL DEFAULT 1,
    used_sessions INT NOT NULL DEFAULT 0,
    remaining_sessions INT NOT NULL DEFAULT 1,
    price NUMERIC DEFAULT 0,
    pos_transaction_id VARCHAR,
    receipt_no VARCHAR,
    branch_id VARCHAR,
    status VARCHAR DEFAULT 'active', -- 'active' (ยังเหลือรอบ), 'completed' (ใช้หมดแล้ว), 'expired' (หมดอายุ), 'cancelled' (ยกเลิก)
    is_shareable BOOLEAN DEFAULT TRUE, -- อนุญาตให้แชร์คอร์สกับผู้อื่นได้หรือไม่
    shared_patient_ids JSONB DEFAULT '[]'::jsonb, -- รายชื่อคนไข้ที่ได้รับสิทธิ์แชร์ (ถ้ามี)
    expire_date DATE,
    notes TEXT,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- ============================================================
-- 2. สร้าง Indexes เพื่อให้ค้นหาข้อมูลได้อย่างรวดเร็ว
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_patient_courses_patient_id ON public.patient_courses(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_courses_status ON public.patient_courses(status);
CREATE INDEX IF NOT EXISTS idx_patient_courses_branch_id ON public.patient_courses(branch_id);
CREATE INDEX IF NOT EXISTS idx_patient_courses_is_deleted ON public.patient_courses(is_deleted);

-- ============================================================
-- 3. อัปเดตตาราง pos_transactions เพื่อรองรับบิลตัดคอร์ส (0 บาท)
-- ============================================================
ALTER TABLE public.pos_transactions 
ADD COLUMN IF NOT EXISTS transaction_type VARCHAR DEFAULT 'sale'; 
-- 'sale' = บิลขายสินค้า/บริการทั่วไป, 'course_redeem' = บิลตัดรอบคอร์ส

CREATE INDEX IF NOT EXISTS idx_pos_transactions_tx_type ON public.pos_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_hn ON public.pos_transactions(hn);

-- ============================================================
-- 4. ตั้งค่าความปลอดภัย Row Level Security (RLS)
-- ============================================================
ALTER TABLE public.patient_courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all" ON public.patient_courses;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.patient_courses;
CREATE POLICY "Allow authenticated full access" ON public.patient_courses 
FOR ALL TO authenticated 
USING (true) 
WITH CHECK (true);

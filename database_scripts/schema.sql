-- ============================================================
-- SCHEMAS FOR ANPING CLINIC (Supabase PostgreSQL - Strict SQL Columns, No JSONB)
-- ============================================================

-- 1. Patients Table
CREATE TABLE IF NOT EXISTS public.patients (
    id VARCHAR PRIMARY KEY,
    prefix VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR,
    name VARCHAR,
    nickname VARCHAR,
    id_card VARCHAR,
    phone VARCHAR,
    gender VARCHAR,
    dob VARCHAR,
    age INT,
    blood_group VARCHAR,
    religion VARCHAR,
    nationality VARCHAR,
    ethnicity VARCHAR,
    occupation VARCHAR,
    address TEXT,
    moo VARCHAR,
    sub_district VARCHAR,
    district VARCHAR,
    province VARCHAR,
    zipcode VARCHAR,
    road VARCHAR,
    em_name VARCHAR,
    em_phone VARCHAR,
    em_relation VARCHAR,
    em_address TEXT,
    allergies TEXT,
    drug_allergy TEXT,
    underlying_disease TEXT,
    medical_history TEXT,
    chief_complaint TEXT,
    pdpa_status VARCHAR,
    pdpa_token VARCHAR,
    pdpa_expires BIGINT,
    branch_id VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.patients DROP COLUMN IF EXISTS hn CASCADE;
ALTER TABLE public.patients DROP COLUMN IF EXISTS data CASCADE;
ALTER TABLE public.patients DROP COLUMN IF EXISTS cur_address CASCADE;
ALTER TABLE public.patients DROP COLUMN IF EXISTS cur_moo CASCADE;
ALTER TABLE public.patients DROP COLUMN IF EXISTS cur_sub_district CASCADE;
ALTER TABLE public.patients DROP COLUMN IF EXISTS cur_district CASCADE;
ALTER TABLE public.patients DROP COLUMN IF EXISTS cur_province CASCADE;
ALTER TABLE public.patients DROP COLUMN IF EXISTS cur_zipcode CASCADE;
ALTER TABLE public.patients DROP COLUMN IF EXISTS cur_road CASCADE;

-- 2. Treatments Table
CREATE TABLE IF NOT EXISTS public.treatments (
    id VARCHAR PRIMARY KEY,
    patient_id VARCHAR NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    datetime VARCHAR,
    date VARCHAR,
    time VARCHAR,
    doctor VARCHAR,
    chief_complaint TEXT,
    diagnosis TEXT,
    treatment_detail TEXT,
    prescription JSONB DEFAULT '[]'::jsonb,
    vital_signs JSONB DEFAULT '{}'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    cost NUMERIC DEFAULT 0,
    branch_id VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.treatments DROP COLUMN IF EXISTS data CASCADE;

-- 3. Branches Table
CREATE TABLE IF NOT EXISTS public.branches (
    id VARCHAR PRIMARY KEY,
    name VARCHAR,
    clinic_name VARCHAR,
    license_number VARCHAR,
    tax_id VARCHAR,
    address TEXT,
    phone VARCHAR,
    email VARCHAR,
    manager VARCHAR,
    logo TEXT,
    rooms JSONB DEFAULT '[]'::jsonb,
    status VARCHAR DEFAULT 'active',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.branches DROP COLUMN IF EXISTS data CASCADE;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS clinic_name VARCHAR;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS license_number VARCHAR;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS tax_id VARCHAR;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS email VARCHAR;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS manager VARCHAR;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS rooms JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active';

-- 4. Queue / Appointments Table
CREATE TABLE IF NOT EXISTS public.queue (
    id VARCHAR PRIMARY KEY,
    hn VARCHAR,
    patient_name VARCHAR,
    phone VARCHAR,
    date VARCHAR,
    time VARCHAR,
    raw_date_time VARCHAR,
    datetime VARCHAR,
    doctor VARCHAR,
    service VARCHAR,
    reason TEXT,
    status VARCHAR,
    deal_status VARCHAR,
    branch_id VARCHAR,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.queue DROP COLUMN IF EXISTS data CASCADE;

-- 5. POS Transactions Table
CREATE TABLE IF NOT EXISTS public.pos_transactions (
    id VARCHAR PRIMARY KEY,
    receipt_no VARCHAR,
    hn VARCHAR,
    patient_name VARCHAR,
    branch_id VARCHAR,
    branch_name VARCHAR,
    total_amount NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    net_amount NUMERIC DEFAULT 0,
    payment_method VARCHAR,
    items JSONB DEFAULT '[]'::jsonb,
    staff_name VARCHAR,
    date VARCHAR,
    time VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.pos_transactions DROP COLUMN IF EXISTS data CASCADE;

-- 6. Inventory Table
CREATE TABLE IF NOT EXISTS public.inventory (
    id VARCHAR PRIMARY KEY,
    code VARCHAR,
    product_id VARCHAR,
    name VARCHAR,
    category VARCHAR,
    unit VARCHAR,
    cost_price NUMERIC DEFAULT 0,
    selling_price NUMERIC DEFAULT 0,
    stock_quantity INT DEFAULT 0,
    min_stock INT DEFAULT 0,
    lot_no VARCHAR,
    expire_date VARCHAR,
    receive_date VARCHAR,
    branch_id VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.inventory DROP COLUMN IF EXISTS data CASCADE;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS lot_no VARCHAR;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS expire_date VARCHAR;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS receive_date VARCHAR;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS product_id VARCHAR;

-- 7. Inventory Logs Table
CREATE TABLE IF NOT EXISTS public.inventory_logs (
    id VARCHAR PRIMARY KEY,
    item_id VARCHAR,
    product_id VARCHAR,
    item_name VARCHAR,
    change_type VARCHAR,
    type VARCHAR,
    quantity INT DEFAULT 0,
    amount NUMERIC DEFAULT 0,
    balance NUMERIC DEFAULT 0,
    staff_name VARCHAR,
    reason TEXT,
    notes TEXT,
    lot_no VARCHAR,
    expire_date VARCHAR,
    receive_date VARCHAR,
    branch_id VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.inventory_logs DROP COLUMN IF EXISTS data CASCADE;
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS lot_no VARCHAR;
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS expire_date VARCHAR;
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS receive_date VARCHAR;
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS product_id VARCHAR;
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS branch_id VARCHAR;
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS type VARCHAR;
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS amount NUMERIC;
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS balance NUMERIC;
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS reason TEXT;

-- 8. Setting POS / Product Catalog Table
CREATE TABLE IF NOT EXISTS public.setting_pos (
    id VARCHAR PRIMARY KEY,
    code VARCHAR,
    name VARCHAR,
    category VARCHAR,
    price NUMERIC DEFAULT 0,
    unit VARCHAR,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.setting_pos DROP COLUMN IF EXISTS data CASCADE;

-- 9. Finance Revenue Table
CREATE TABLE IF NOT EXISTS public.finance_revenue (
    id VARCHAR PRIMARY KEY,
    date VARCHAR,
    amount NUMERIC DEFAULT 0,
    category VARCHAR,
    description TEXT,
    branch_id VARCHAR,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal NUMERIC DEFAULT 0,
    discount_value NUMERIC DEFAULT 0,
    discount_type VARCHAR,
    discount_amount NUMERIC DEFAULT 0,
    tax_mode VARCHAR,
    vat_rate NUMERIC DEFAULT 0,
    vat_amount NUMERIC DEFAULT 0,
    method VARCHAR,
    status VARCHAR,
    is_auto BOOLEAN DEFAULT false,
    patient_id VARCHAR,
    patient_name VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.finance_revenue DROP COLUMN IF EXISTS data CASCADE;

-- 10. Finance Expenses Table
CREATE TABLE IF NOT EXISTS public.finance_expenses (
    id VARCHAR PRIMARY KEY,
    date VARCHAR,
    amount NUMERIC DEFAULT 0,
    category VARCHAR,
    description TEXT,
    branch_id VARCHAR,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal NUMERIC DEFAULT 0,
    discount_value NUMERIC DEFAULT 0,
    discount_type VARCHAR,
    discount_amount NUMERIC DEFAULT 0,
    tax_mode VARCHAR,
    vat_rate NUMERIC DEFAULT 0,
    vat_amount NUMERIC DEFAULT 0,
    method VARCHAR,
    status VARCHAR,
    is_auto BOOLEAN DEFAULT false,
    patient_id VARCHAR,
    patient_name VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.finance_expenses DROP COLUMN IF EXISTS data CASCADE;

-- 11. Staff Table
CREATE TABLE IF NOT EXISTS public.staff (
    id VARCHAR PRIMARY KEY,
    username VARCHAR,
    password VARCHAR,
    prefix VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR,
    name VARCHAR,
    role VARCHAR,
    category VARCHAR,
    phone VARCHAR,
    email VARCHAR,
    branch_id VARCHAR,
    salary NUMERIC DEFAULT 0,
    commission_rate NUMERIC DEFAULT 0,
    ot_rate NUMERIC DEFAULT 0,
    employment_type VARCHAR,
    bank_name VARCHAR,
    bank_account VARCHAR,
    schedule JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.staff DROP COLUMN IF EXISTS data CASCADE;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS schedule JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 0;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS ot_rate NUMERIC DEFAULT 0;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS employment_type VARCHAR;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS bank_name VARCHAR;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS bank_account VARCHAR;

-- เพิ่มคอลัมน์ข้อมูลที่อยู่และข้อมูลส่วนตัวสำหรับตาราง staff
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS id_card VARCHAR;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS dob VARCHAR;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS gender VARCHAR;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS nationality VARCHAR DEFAULT 'ไทย';
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS ethnicity VARCHAR DEFAULT 'ไทย';
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS religion VARCHAR DEFAULT 'พุทธ';
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS license_number VARCHAR;

ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS moo VARCHAR;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS road VARCHAR;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS sub_district VARCHAR;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS district VARCHAR;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS province VARCHAR;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS zipcode VARCHAR;

ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS cur_address TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS cur_moo VARCHAR;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS cur_road VARCHAR;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS cur_sub_district VARCHAR;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS cur_district VARCHAR;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS cur_province VARCHAR;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS cur_zipcode VARCHAR;

ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS em_name VARCHAR;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS em_relation VARCHAR;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS em_phone VARCHAR;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS em_address TEXT;

-- 12. Staff Schedules Table (ตารางปฏิทินกะการทำงานพนักงานแยกต่างหาก)
CREATE TABLE IF NOT EXISTS public.staff_schedules (
    id VARCHAR PRIMARY KEY,
    staff_id VARCHAR NOT NULL,
    staff_name VARCHAR,
    date DATE NOT NULL,
    day_of_week INT,
    shift_type VARCHAR DEFAULT 'normal',
    start_time VARCHAR DEFAULT '09:00',
    end_time VARCHAR DEFAULT '20:00',
    is_active BOOLEAN DEFAULT TRUE,
    branch_id VARCHAR,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_staff_id ON public.staff_schedules(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_date ON public.staff_schedules(date);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_branch_id ON public.staff_schedules(branch_id);

-- 13. Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    id VARCHAR PRIMARY KEY,
    values JSONB DEFAULT '{}'::jsonb,
    labels JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.settings DROP COLUMN IF EXISTS data CASCADE;

-- 13. Logs Table
CREATE TABLE IF NOT EXISTS public.logs (
    id VARCHAR PRIMARY KEY,
    user_name VARCHAR,
    user_id VARCHAR,
    role VARCHAR,
    action VARCHAR,
    target_sheet VARCHAR,
    target_data_id VARCHAR,
    detail TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.logs DROP COLUMN IF EXISTS data CASCADE;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setting_pos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- Policies for AUTHENTICATED users only (TO authenticated)
DROP POLICY IF EXISTS "Allow public all" ON public.patients;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.patients;
CREATE POLICY "Allow authenticated full access" ON public.patients FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all" ON public.treatments;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.treatments;
CREATE POLICY "Allow authenticated full access" ON public.treatments FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all" ON public.branches;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.branches;
CREATE POLICY "Allow authenticated full access" ON public.branches FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all" ON public.queue;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.queue;
CREATE POLICY "Allow authenticated full access" ON public.queue FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all" ON public.pos_transactions;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.pos_transactions;
CREATE POLICY "Allow authenticated full access" ON public.pos_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all" ON public.inventory;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.inventory;
CREATE POLICY "Allow authenticated full access" ON public.inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all" ON public.inventory_logs;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.inventory_logs;
CREATE POLICY "Allow authenticated full access" ON public.inventory_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all" ON public.setting_pos;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.setting_pos;
CREATE POLICY "Allow authenticated full access" ON public.setting_pos FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all" ON public.finance_revenue;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.finance_revenue;
CREATE POLICY "Allow authenticated full access" ON public.finance_revenue FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all" ON public.finance_expenses;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.finance_expenses;
CREATE POLICY "Allow authenticated full access" ON public.finance_expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all" ON public.staff;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.staff;
CREATE POLICY "Allow authenticated full access" ON public.staff FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all" ON public.staff_schedules;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.staff_schedules;
CREATE POLICY "Allow authenticated full access" ON public.staff_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all" ON public.settings;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.settings;
CREATE POLICY "Allow authenticated full access" ON public.settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all" ON public.logs;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.logs;
CREATE POLICY "Allow authenticated full access" ON public.logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

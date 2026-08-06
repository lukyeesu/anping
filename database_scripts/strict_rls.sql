-- ============================================================
-- SQL สำหรับยกระดับความปลอดภัยขั้นสูงสุด (Strict RLS Security - Safe Version)
-- สามารถก็อบปี้ทั้งหมดนี้ไปวางใน SQL Editor ของ Supabase แล้วกด RUN ได้ทันที!
-- ============================================================

-- 1. เปิดใช้งาน Row Level Security (RLS) ครบทุกตาราง
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setting_pos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- 2. ลบนโยบายสาธารณะเดิม (Allow Public) ออกทั้งหมด
DROP POLICY IF EXISTS "Allow public select" ON public.patients;
DROP POLICY IF EXISTS "Allow public insert" ON public.patients;
DROP POLICY IF EXISTS "Allow public update" ON public.patients;
DROP POLICY IF EXISTS "Allow public delete" ON public.patients;

DROP POLICY IF EXISTS "Allow public select" ON public.staff;
DROP POLICY IF EXISTS "Allow public insert" ON public.staff;
DROP POLICY IF EXISTS "Allow public update" ON public.staff;
DROP POLICY IF EXISTS "Allow public delete" ON public.staff;

DROP POLICY IF EXISTS "Allow public select" ON public.queue;
DROP POLICY IF EXISTS "Allow public insert" ON public.queue;
DROP POLICY IF EXISTS "Allow public update" ON public.queue;
DROP POLICY IF EXISTS "Allow public delete" ON public.queue;

-- 3. ปฏิเสธการเข้าถึงตรงๆ จาก Anon Key ในเบราว์เซอร์ 100% (Safe Re-run)
DROP POLICY IF EXISTS "Strict Service Role Only" ON public.patients;
CREATE POLICY "Strict Service Role Only" ON public.patients FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Strict Service Role Only" ON public.staff;
CREATE POLICY "Strict Service Role Only" ON public.staff FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Strict Service Role Only" ON public.queue;
CREATE POLICY "Strict Service Role Only" ON public.queue FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Strict Service Role Only" ON public.pos_transactions;
CREATE POLICY "Strict Service Role Only" ON public.pos_transactions FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Strict Service Role Only" ON public.finance_revenue;
CREATE POLICY "Strict Service Role Only" ON public.finance_revenue FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Strict Service Role Only" ON public.finance_expenses;
CREATE POLICY "Strict Service Role Only" ON public.finance_expenses FOR ALL USING (auth.role() = 'service_role');

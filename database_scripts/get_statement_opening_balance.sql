-- ==============================================================================
-- SQL RPC Function: get_statement_opening_balance
-- สำหรับคำนวณยอดยกมา (Opening Balance) ของรายการเดินบัญชี (Statement)
-- ==============================================================================
-- ประสิทธิภาพ:
-- 1. รวมยอด SUM(รายรับ) - SUM(รายจ่าย) บน Postgres Database Server โดยตรง
-- 2. ส่งกลับผลลัพธ์เพียงตัวเลขตัวเดียว (ขนาดเพียง ~8 Bytes)
-- 3. ประหยัด Egress แบนด์วิดท์มหาศาล 100% แม้ข้อมูลจะมีหลายแสนหรือหลายล้านแถว
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_statement_opening_balance(
    p_start_date text,
    p_branch_id text DEFAULT 'all'
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance numeric := 0;
    v_clean_date text;
    v_start_day text;
BEGIN
    -- ทำความสะอาด input วันที่เริ่มต้น
    v_clean_date := TRIM(COALESCE(p_start_date, ''));
    IF v_clean_date = '' THEN
        RETURN 0;
    END IF;

    -- สกัดเฉพาะ 10 ตัวอักษรแรก (YYYY-MM-DD)
    v_start_day := SUBSTRING(v_clean_date FROM 1 FOR 10);

    -- คำนวณผลรวมรายรับลบรายจ่ายของทุกรายการที่เกิดขึ้นก่อนวันที่เริ่มต้น
    SELECT COALESCE(
        SUM(
            CASE 
                WHEN type = 'expense' OR id ILIKE 'EXP%' OR category = 'รายจ่าย' THEN -COALESCE(amount, 0)
                ELSE COALESCE(amount, 0)
            END
        ), 0
    )
    INTO v_balance
    FROM public.finance_all_transactions
    WHERE (
        -- 1. รายการทั้งหมดที่เกิดขึ้นในวันก่อนหน้าวันที่เริ่มต้น
        SUBSTRING(timestamp_date FROM 1 FOR 10) < v_start_day
        OR (
            -- 2. กรณีส่งเวลาเริ่มต้นแบบละเอียดมา (เช่น ISO Timestamp) ให้เทียบเวลาเฉพาะในวันเดียวกัน
            LENGTH(v_clean_date) > 10 
            AND SUBSTRING(timestamp_date FROM 1 FOR 10) = v_start_day 
            AND timestamp_date < v_clean_date
        )
    )
      AND (status IS NULL OR status != 'cancelled')
      AND (is_deleted IS NULL OR is_deleted = false)
      AND (p_branch_id IS NULL OR p_branch_id = 'all' OR p_branch_id = '' OR branch_id = p_branch_id);

    RETURN ROUND(COALESCE(v_balance, 0), 2);
END;
$$;

-- ให้สิทธิ์การเรียกใช้งาน RPC แก่ Client ทุกระดับ (anon, authenticated, service_role)
GRANT EXECUTE ON FUNCTION public.get_statement_opening_balance(text, text) TO anon, authenticated, service_role;

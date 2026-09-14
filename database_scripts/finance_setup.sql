-- 1. สร้าง View รวมรายการการเงินทั้งหมด (ทั้งแบบ Manual และ Auto จาก POS)
CREATE OR REPLACE VIEW public.finance_all_transactions AS
SELECT 
    id, 
    date as timestamp_date, 
    amount, 
    category, 
    description as note, 
    branch_id, 
    items, 
    method, 
    COALESCE(status, 'completed') as status, 
    is_auto, 
    patient_name, 
    'income' as type,
    subtotal,
    discount_amount,
    vat_amount,
    is_deleted,
    null::text as doctor_name,
    null::text as doctor_id,
    null::text as seller_name,
    null::text as seller_id,
    null::text as staff_name,
    null::text as staff_id
FROM public.finance_revenue
WHERE is_deleted IS NULL OR is_deleted = false

UNION ALL

SELECT 
    id, 
    date as timestamp_date, 
    amount, 
    category, 
    description as note, 
    branch_id, 
    items, 
    method, 
    COALESCE(status, 'completed') as status, 
    is_auto, 
    patient_name, 
    'expense' as type,
    subtotal,
    discount_amount,
    vat_amount,
    is_deleted,
    null::text as doctor_name,
    null::text as doctor_id,
    null::text as seller_name,
    null::text as seller_id,
    null::text as staff_name,
    null::text as staff_id
FROM public.finance_expenses
WHERE is_deleted IS NULL OR is_deleted = false

UNION ALL

SELECT 
    id, 
    created_at::varchar as timestamp_date, 
    net_amount as amount, 
    'รายได้จาก POS'::varchar as category, 
    patient_name as note, 
    branch_id, 
    items, 
    payment_method as method, 
    COALESCE(status, 'completed')::varchar as status, 
    true as is_auto, 
    patient_name, 
    'income' as type,
    total_amount as subtotal,
    discount as discount_amount,
    0::numeric as vat_amount,
    is_deleted,
    doctor_name,
    doctor_id,
    seller_name,
    seller_id,
    staff_name,
    staff_id
FROM public.pos_transactions
WHERE is_deleted IS NULL OR is_deleted = false;

-- 2. สร้างฟังก์ชันดึงยอดสรุปบัญชี (ยกเว้นรายการที่โดนยกเลิก หรือโดนลบ)
CREATE OR REPLACE FUNCTION get_finance_stats(
    start_date text,
    end_date text,
    branch_filter text,
    type_filter text,
    search_query text,
    category_filter text DEFAULT 'all'
) RETURNS json AS $$
DECLARE
    total_income numeric := 0;
    total_expense numeric := 0;
    count_income int := 0;
    count_expense int := 0;
BEGIN
    SELECT 
        COALESCE(SUM(amount) FILTER (WHERE type = 'income' AND status != 'cancelled' AND (is_deleted IS NULL OR is_deleted = false)), 0),
        COALESCE(SUM(amount) FILTER (WHERE type = 'expense' AND status != 'cancelled' AND (is_deleted IS NULL OR is_deleted = false)), 0),
        COUNT(*) FILTER (WHERE type = 'income' AND status != 'cancelled' AND (is_deleted IS NULL OR is_deleted = false)),
        COUNT(*) FILTER (WHERE type = 'expense' AND status != 'cancelled' AND (is_deleted IS NULL OR is_deleted = false))
    INTO total_income, total_expense, count_income, count_expense
    FROM public.finance_all_transactions
    WHERE timestamp_date >= start_date AND timestamp_date <= end_date
      AND (branch_filter = 'all' OR branch_id = branch_filter)
      AND (
          category_filter = 'all' OR
          (category_filter = 'รายได้จาก POS' AND (category = 'รายได้จาก POS' OR is_auto = true)) OR
          (category = category_filter)
      )
      AND (
          search_query = '' OR 
          note ILIKE '%' || search_query || '%' OR 
          category ILIKE '%' || search_query || '%' OR 
          patient_name ILIKE '%' || search_query || '%' OR
          id ILIKE '%' || search_query || '%'
      )
      AND (
          type_filter = 'all' OR
          (type_filter = 'income' AND type = 'income') OR
          (type_filter = 'expense' AND type = 'expense') OR
          (type_filter = 'pos' AND is_auto = true) OR
          (type_filter = 'manual' AND is_auto = false)
      );

    RETURN json_build_object(
        'total_income', total_income,
        'total_expense', total_expense,
        'count_income', count_income,
        'count_expense', count_expense
    );
END;
$$ LANGUAGE plpgsql;

-- 3. สร้างฟังก์ชันดึงรายชื่อหมวดหมู่ทั้งหมดแบบตัดรายการซ้ำ (DISTINCT) โดยตรงจากฐานข้อมูล Supabase
CREATE OR REPLACE FUNCTION get_finance_categories()
RETURNS TABLE (category text) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT f.category::text
    FROM public.finance_all_transactions f
    WHERE f.category IS NOT NULL 
      AND TRIM(f.category) != ''
      AND (f.is_deleted IS NULL OR f.is_deleted = false)
      AND (f.status IS NULL OR f.status != 'cancelled')
    ORDER BY 1 ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_finance_categories() TO anon, authenticated, service_role;

-- 4. ฟังก์ชันตัดสต็อกอัตโนมัติสำหรับ POS แบบ Atomic Transaction (FEFO + Row Locking ป้องกันสต็อกชนกันข้ามสาขา)
CREATE OR REPLACE FUNCTION deduct_pos_stock(
    p_items jsonb,
    p_branch_id text,
    p_receipt_id text
)
RETURNS jsonb AS $$
DECLARE
    item_record jsonb;
    v_prod_id text;
    v_prod_name text;
    v_qty_needed numeric;
    v_remaining numeric;
    v_inv_row record;
    v_deduct numeric;
    v_new_qty numeric;
    v_results jsonb := '[]'::jsonb;
    v_log_id text;
    v_clean_target text;
BEGIN
    -- วนลูปตามสินค้าแต่ละชิ้นในตะกร้า
    FOR item_record IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_prod_id := COALESCE(item_record->'product'->>'id', item_record->>'productId', item_record->>'id');
        v_prod_name := COALESCE(item_record->'product'->>'name', item_record->>'productName', item_record->>'name');
        v_qty_needed := COALESCE((item_record->>'quantity')::numeric, 1);
        v_remaining := v_qty_needed;
        v_clean_target := lower(regexp_replace(COALESCE(v_prod_id, ''), '^INV_', '', 'i'));

        -- ค้นหาล็อตสินค้าในคลังของสาขานี้ เรียงตามวันหมดอายุ (FEFO) พร้อมล็อคแถว (FOR UPDATE)
        FOR v_inv_row IN 
            SELECT id, product_id, code, name, stock_quantity, lot_no, expire_date, branch_id
            FROM public.inventory
            WHERE (is_deleted IS NULL OR is_deleted = false)
              AND (branch_id = p_branch_id OR p_branch_id = 'all' OR branch_id IS NULL)
              AND (
                  (v_clean_target != '' AND lower(regexp_replace(id::text, '^INV_', '', 'i')) = v_clean_target) OR
                  (v_clean_target != '' AND lower(regexp_replace(COALESCE(product_id::text, ''), '^INV_', '', 'i')) = v_clean_target) OR
                  (v_clean_target != '' AND lower(regexp_replace(COALESCE(code::text, ''), '^INV_', '', 'i')) = v_clean_target) OR
                  (v_prod_name IS NOT NULL AND lower(name) = lower(v_prod_name))
              )
              AND stock_quantity > 0
            ORDER BY 
              CASE WHEN expire_date IS NULL OR expire_date = '' THEN '9999-12-31' ELSE expire_date END ASC,
              id ASC
            FOR UPDATE
        LOOP
            IF v_remaining <= 0 THEN
                EXIT;
            END IF;

            v_deduct := LEAST(v_inv_row.stock_quantity, v_remaining);
            IF v_deduct <= 0 THEN
                CONTINUE;
            END IF;

            v_new_qty := v_inv_row.stock_quantity - v_deduct;
            v_remaining := v_remaining - v_deduct;

            -- 1. อัปเดตยอดคงเหลือในล็อต
            UPDATE public.inventory
            SET stock_quantity = v_new_qty,
                updated_at = NOW()
            WHERE id = v_inv_row.id;

            -- 2. สร้างประวัติ Inventory Log
            v_log_id := 'LOG' || floor(extract(epoch from now()) * 1000)::text || '-' || substr(md5(random()::text), 1, 5);
            INSERT INTO public.inventory_logs (
                id,
                product_id,
                item_id,
                product_name,
                item_name,
                branch_id,
                type,
                change_type,
                amount,
                quantity,
                balance,
                reason,
                notes,
                lot_no,
                expire_date,
                created_at,
                updated_at
            ) VALUES (
                v_log_id,
                v_prod_id,
                v_prod_id,
                v_prod_name,
                v_prod_name,
                p_branch_id,
                'SALE',
                'SALE',
                v_deduct,
                v_deduct,
                v_new_qty,
                'ขายสินค้า (บิล: ' || p_receipt_id || ')',
                'ล็อต: ' || COALESCE(v_inv_row.lot_no, 'N/A'),
                COALESCE(v_inv_row.lot_no, ''),
                COALESCE(v_inv_row.expire_date, ''),
                NOW(),
                NOW()
            );

            v_results := v_results || jsonb_build_object(
                'stock_id', v_inv_row.id,
                'lot_no', v_inv_row.lot_no,
                'deducted', v_deduct,
                'new_quantity', v_new_qty
            );
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object('status', 'success', 'deductions', v_results);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION deduct_pos_stock(jsonb, text, text) TO anon, authenticated, service_role;


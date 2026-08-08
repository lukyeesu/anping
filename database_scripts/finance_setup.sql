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
    is_deleted
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
    is_deleted
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
    is_deleted
FROM public.pos_transactions
WHERE is_deleted IS NULL OR is_deleted = false;

-- 2. สร้างฟังก์ชันดึงยอดสรุปบัญชี (ยกเว้นรายการที่โดนยกเลิก หรือโดนลบ)
CREATE OR REPLACE FUNCTION get_finance_stats(
    start_date text,
    end_date text,
    branch_filter text,
    type_filter text,
    search_query text
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

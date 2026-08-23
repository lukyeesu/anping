-- ============================================================
-- SQL RPC Function for Executive Dashboard (Single Source of Truth)
-- Fixed: Uses only verified columns from pos_transactions with Asia/Bangkok Timezone
-- ============================================================

CREATE OR REPLACE FUNCTION get_executive_dashboard_data(
    start_date text,
    end_date text,
    branch_filter text DEFAULT 'all'
) RETURNS json AS $$
DECLARE
    v_pos_income numeric := 0;
    v_manual_income numeric := 0;
    v_total_income numeric := 0;
    v_total_expense numeric := 0;
    v_pos_count int := 0;
    v_cash numeric := 0;
    v_transfer numeric := 0;
    v_card numeric := 0;
    v_qr numeric := 0;
    v_other numeric := 0;
    v_queue_total int := 0;
    v_queue_completed int := 0;
    v_queue_pending int := 0;
    v_queue_cancelled int := 0;
    v_new_patients int := 0;
    v_top_products json := '[]'::json;
    v_staff_stats json := '[]'::json;
    v_top_doctors json := '[]'::json;
    v_branch_summary json := '[]'::json;
    v_daily_trend json := '[]'::json;
    v_net_profit numeric := 0;
    v_profit_margin numeric := 0;
    v_average_ticket numeric := 0;
    v_start_day text;
    v_end_day text;
BEGIN
    v_start_day := SUBSTRING(start_date FROM 1 FOR 10);
    v_end_day := SUBSTRING(end_date FROM 1 FOR 10);

    -- 1. Financial: POS Transactions
    SELECT 
        COALESCE(SUM(COALESCE(net_amount, total_amount - COALESCE(discount, 0), 0)), 0),
        COUNT(*),
        COALESCE(SUM(CASE WHEN LOWER(payment_method) LIKE '%cash%' OR LOWER(payment_method) LIKE '%สด%' THEN COALESCE(net_amount, total_amount - COALESCE(discount, 0), 0) ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_method) LIKE '%transfer%' OR LOWER(payment_method) LIKE '%โอน%' OR LOWER(payment_method) LIKE '%promptpay%' THEN COALESCE(net_amount, total_amount - COALESCE(discount, 0), 0) ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_method) LIKE '%card%' OR LOWER(payment_method) LIKE '%เครดิต%' THEN COALESCE(net_amount, total_amount - COALESCE(discount, 0), 0) ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_method) LIKE '%qr%' THEN COALESCE(net_amount, total_amount - COALESCE(discount, 0), 0) ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN (LOWER(payment_method) NOT LIKE '%cash%' AND LOWER(payment_method) NOT LIKE '%สด%' AND LOWER(payment_method) NOT LIKE '%transfer%' AND LOWER(payment_method) NOT LIKE '%โอน%' AND LOWER(payment_method) NOT LIKE '%promptpay%' AND LOWER(payment_method) NOT LIKE '%card%' AND LOWER(payment_method) NOT LIKE '%เครดิต%' AND LOWER(payment_method) NOT LIKE '%qr%') THEN COALESCE(net_amount, total_amount - COALESCE(discount, 0), 0) ELSE 0 END), 0)
    INTO v_pos_income, v_pos_count, v_cash, v_transfer, v_card, v_qr, v_other
    FROM public.pos_transactions
    WHERE (status IS NULL OR status != 'cancelled')
      AND (is_deleted IS NULL OR is_deleted = false)
      AND (branch_filter = 'all' OR branch_id = branch_filter)
      AND TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') >= v_start_day
      AND TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') <= v_end_day;

    -- 2. Financial: Manual Revenue
    SELECT 
        COALESCE(SUM(COALESCE(amount, 0)), 0),
        COALESCE(SUM(CASE WHEN LOWER(method) LIKE '%cash%' OR LOWER(method) LIKE '%สด%' THEN COALESCE(amount, 0) ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(method) LIKE '%transfer%' OR LOWER(method) LIKE '%โอน%' OR LOWER(method) LIKE '%promptpay%' THEN COALESCE(amount, 0) ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(method) LIKE '%card%' OR LOWER(method) LIKE '%เครดิต%' THEN COALESCE(amount, 0) ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(method) LIKE '%qr%' THEN COALESCE(amount, 0) ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN (LOWER(method) NOT LIKE '%cash%' AND LOWER(method) NOT LIKE '%สด%' AND LOWER(method) NOT LIKE '%transfer%' AND LOWER(method) NOT LIKE '%โอน%' AND LOWER(method) NOT LIKE '%promptpay%' AND LOWER(method) NOT LIKE '%card%' AND LOWER(method) NOT LIKE '%เครดิต%' AND LOWER(method) NOT LIKE '%qr%') THEN COALESCE(amount, 0) ELSE 0 END), 0)
    INTO v_manual_income, v_cash, v_transfer, v_card, v_qr, v_other
    FROM public.finance_revenue
    WHERE (status IS NULL OR status != 'cancelled')
      AND (is_deleted IS NULL OR is_deleted = false)
      AND (is_auto IS NULL OR is_auto = false)
      AND (branch_filter = 'all' OR branch_id = branch_filter)
      AND TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') >= v_start_day
      AND TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') <= v_end_day;

    v_total_income := v_pos_income + v_manual_income;

    -- 3. Financial: Expenses
    SELECT COALESCE(SUM(COALESCE(amount, 0)), 0)
    INTO v_total_expense
    FROM public.finance_expenses
    WHERE (status IS NULL OR status != 'cancelled')
      AND (is_deleted IS NULL OR is_deleted = false)
      AND (branch_filter = 'all' OR branch_id = branch_filter)
      AND TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') >= v_start_day
      AND TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') <= v_end_day;

    v_net_profit := v_total_income - v_total_expense;
    IF v_total_income > 0 THEN 
        v_profit_margin := ROUND((v_net_profit / v_total_income * 100)::numeric, 2); 
    END IF;
    IF v_pos_count > 0 THEN 
        v_average_ticket := ROUND((v_pos_income / v_pos_count)::numeric, 2); 
    END IF;

    -- 4. Queue / Operational Stats
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'completed' OR status = 'treated'),
        COUNT(*) FILTER (WHERE status = 'pending' OR status = 'waiting'),
        COUNT(*) FILTER (WHERE status = 'cancelled')
    INTO v_queue_total, v_queue_completed, v_queue_pending, v_queue_cancelled
    FROM public.queue
    WHERE (branch_filter = 'all' OR branch_id = branch_filter)
      AND TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') >= v_start_day
      AND TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') <= v_end_day;

    -- 5. New Patients Count
    SELECT COUNT(*) INTO v_new_patients
    FROM public.patients
    WHERE (branch_filter = 'all' OR branch_id = branch_filter)
      AND TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') >= v_start_day
      AND TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') <= v_end_day;

    -- 6. Top Selling Products & Services (JSON List)
    SELECT COALESCE(json_agg(p), '[]'::json) INTO v_top_products
    FROM (
        SELECT 
            COALESCE(item->>'id', item->>'productId', item->>'name') as id,
            COALESCE(item->>'name', 'สินค้าทั่วไป') as name,
            COALESCE(item->>'category', item->>'type', '') as category,
            SUM(COALESCE((item->>'quantity')::numeric, (item->>'qty')::numeric, 1)) as quantity,
            SUM(
                CASE 
                    WHEN COALESCE(t.net_amount, t.total_amount - COALESCE(t.discount, 0), 0) = 0 THEN 0
                    ELSE COALESCE((item->>'total')::numeric, (COALESCE((item->>'quantity')::numeric, 1) * COALESCE((item->>'price')::numeric, 0)))
                END
            ) as revenue
        FROM public.pos_transactions t,
             jsonb_array_elements(CASE WHEN jsonb_typeof(t.items) = 'array' THEN t.items ELSE '[]'::jsonb END) AS item
        WHERE (t.status IS NULL OR t.status != 'cancelled')
          AND (t.is_deleted IS NULL OR t.is_deleted = false)
          AND (branch_filter = 'all' OR t.branch_id = branch_filter)
          AND TO_CHAR(t.created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') >= v_start_day
          AND TO_CHAR(t.created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') <= v_end_day
          AND (item->>'name') NOT LIKE '%ตัดรอบ%'
          AND (item->>'name') NOT LIKE '%หมายเหตุ%'
        GROUP BY 1, 2, 3
        HAVING SUM(COALESCE((item->>'quantity')::numeric, 1)) > 0 OR SUM(COALESCE((item->>'total')::numeric, 0)) > 0
        ORDER BY revenue DESC, quantity DESC
    ) p;

    -- 7. Top Doctors (JSON List)
    SELECT COALESCE(json_agg(d), '[]'::json) INTO v_top_doctors
    FROM (
        SELECT 
            COALESCE(doctor, 'ไม่ระบุแพทย์') as name,
            COUNT(*) as count
        FROM public.queue
        WHERE (branch_filter = 'all' OR branch_id = branch_filter)
          AND (status IS NULL OR status != 'cancelled')
          AND TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') >= v_start_day
          AND TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') <= v_end_day
        GROUP BY doctor
        ORDER BY count DESC
        LIMIT 5
    ) d;

    -- 8. Staff Performance & Sales (JSON List)
    SELECT COALESCE(json_agg(s), '[]'::json) INTO v_staff_stats
    FROM (
        WITH staff_agg AS (
            SELECT 
                COALESCE(t.staff_name, 'ไม่ระบุ') as staff_name,
                COUNT(*) as checkouts,
                SUM(COALESCE(t.net_amount, t.total_amount - COALESCE(discount, 0), 0)) as total_sales
            FROM public.pos_transactions t
            WHERE (t.status IS NULL OR t.status != 'cancelled')
              AND (t.is_deleted IS NULL OR t.is_deleted = false)
              AND (branch_filter = 'all' OR t.branch_id = branch_filter)
              AND TO_CHAR(t.created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') >= v_start_day
              AND TO_CHAR(t.created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') <= v_end_day
              AND t.staff_name IS NOT NULL AND t.staff_name != ''
            GROUP BY t.staff_name
        )
        SELECT 
            COALESCE(st.id, staff_agg.staff_name) as id,
            COALESCE(st.name, staff_agg.staff_name) as name,
            st.photo,
            st.role,
            st.position,
            staff_agg.checkouts,
            0::numeric as commission
        FROM staff_agg
        LEFT JOIN public.staff st ON (st.name = staff_agg.staff_name OR st.id = staff_agg.staff_name)
        ORDER BY staff_agg.checkouts DESC
    ) s;

    -- 9. Branch Summary (JSON List)
    SELECT COALESCE(json_agg(b), '[]'::json) INTO v_branch_summary
    FROM (
        WITH branch_income AS (
            SELECT 
                COALESCE(branch_id, 'main') as branch_id,
                SUM(COALESCE(net_amount, total_amount - COALESCE(discount, 0), 0)) as income
            FROM public.pos_transactions
            WHERE (status IS NULL OR status != 'cancelled')
              AND (is_deleted IS NULL OR is_deleted = false)
              AND TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') >= v_start_day
              AND TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') <= v_end_day
            GROUP BY 1
            UNION ALL
            SELECT 
                COALESCE(branch_id, 'main') as branch_id,
                SUM(COALESCE(amount, 0)) as income
            FROM public.finance_revenue
            WHERE (status IS NULL OR status != 'cancelled')
              AND (is_deleted IS NULL OR is_deleted = false)
              AND (is_auto IS NULL OR is_auto = false)
              AND TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') >= v_start_day
              AND TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') <= v_end_day
            GROUP BY 1
        ),
        branch_expense AS (
            SELECT 
                COALESCE(branch_id, 'main') as branch_id,
                SUM(COALESCE(amount, 0)) as expense
            FROM public.finance_expenses
            WHERE (status IS NULL OR status != 'cancelled')
              AND (is_deleted IS NULL OR is_deleted = false)
              AND TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') >= v_start_day
              AND TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') <= v_end_day
            GROUP BY 1
        ),
        branches_merged AS (
            SELECT branch_id FROM branch_income
            UNION
            SELECT branch_id FROM branch_expense
        )
        SELECT 
            m.branch_id,
            COALESCE((SELECT SUM(income) FROM branch_income WHERE branch_id = m.branch_id), 0) as income,
            COALESCE((SELECT SUM(expense) FROM branch_expense WHERE branch_id = m.branch_id), 0) as expense,
            (COALESCE((SELECT SUM(income) FROM branch_income WHERE branch_id = m.branch_id), 0) - 
             COALESCE((SELECT SUM(expense) FROM branch_expense WHERE branch_id = m.branch_id), 0)) as profit
        FROM branches_merged m
        ORDER BY m.branch_id
    ) b;

    -- 10. Daily Trend (JSON List)
    SELECT COALESCE(json_agg(dt), '[]'::json) INTO v_daily_trend
    FROM (
        WITH days_income AS (
            SELECT 
                TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') as day_str,
                SUM(COALESCE(net_amount, total_amount - COALESCE(discount, 0), 0)) as income
            FROM public.pos_transactions
            WHERE (status IS NULL OR status != 'cancelled')
              AND (is_deleted IS NULL OR is_deleted = false)
              AND (branch_filter = 'all' OR branch_id = branch_filter)
              AND TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') >= v_start_day
              AND TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') <= v_end_day
            GROUP BY 1
            UNION ALL
            SELECT 
                TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') as day_str,
                SUM(COALESCE(amount, 0)) as income
            FROM public.finance_revenue
            WHERE (status IS NULL OR status != 'cancelled')
              AND (is_deleted IS NULL OR is_deleted = false)
              AND (is_auto IS NULL OR is_auto = false)
              AND (branch_filter = 'all' OR branch_id = branch_filter)
              AND TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') >= v_start_day
              AND TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') <= v_end_day
            GROUP BY 1
        ),
        days_expense AS (
            SELECT 
                TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') as day_str,
                SUM(COALESCE(amount, 0)) as expense
            FROM public.finance_expenses
            WHERE (status IS NULL OR status != 'cancelled')
              AND (is_deleted IS NULL OR is_deleted = false)
              AND (branch_filter = 'all' OR branch_id = branch_filter)
              AND TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') >= v_start_day
              AND TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') <= v_end_day
            GROUP BY 1
        ),
        all_days AS (
            SELECT day_str FROM days_income WHERE day_str IS NOT NULL AND day_str != ''
            UNION
            SELECT day_str FROM days_expense WHERE day_str IS NOT NULL AND day_str != ''
        )
        SELECT 
            d.day_str as date,
            COALESCE((SELECT SUM(income) FROM days_income WHERE day_str = d.day_str), 0) as income,
            COALESCE((SELECT SUM(expense) FROM days_expense WHERE day_str = d.day_str), 0) as expense,
            (COALESCE((SELECT SUM(income) FROM days_income WHERE day_str = d.day_str), 0) - 
             COALESCE((SELECT SUM(expense) FROM days_expense WHERE day_str = d.day_str), 0)) as profit
        FROM all_days d
        ORDER BY d.day_str ASC
    ) dt;

    -- Return Consolidated Dashboard Payload
    RETURN json_build_object(
        'summary', json_build_object(
            'total_income', v_total_income,
            'pos_total_income', v_pos_income,
            'manual_revenue_income', v_manual_income,
            'total_expense', v_total_expense,
            'net_profit', v_net_profit,
            'profit_margin', v_profit_margin,
            'pos_count', v_pos_count,
            'average_ticket', v_average_ticket,
            'payment_methods', json_build_object(
                'cash', v_cash,
                'transfer', v_transfer,
                'card', v_card,
                'qr', v_qr,
                'other', v_other
            )
        ),
        'queue_stats', json_build_object(
            'total', v_queue_total,
            'completed', v_queue_completed,
            'pending', v_queue_pending,
            'cancelled', v_queue_cancelled,
            'new_patients_count', v_new_patients
        ),
        'top_products', v_top_products,
        'top_doctors', v_top_doctors,
        'staff_stats', v_staff_stats,
        'branch_summary', v_branch_summary,
        'daily_trend', v_daily_trend
    );
END;
$$ LANGUAGE plpgsql;

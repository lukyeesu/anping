-- ==============================================================================
-- 🚀 High-Performance Server-Side Reconciliation Function (reconcile_sync v4)
-- ==============================================================================
-- ถ้าไม่มีอะไรเปลี่ยนแปลงเลย ฟังก์ชันจะส่งค่า NULL กลับไปทันที (Response = 0 Bytes ว่างเปล่า)
-- ปล่อยให้เครื่องใช้ IndexedDB ต่อไปโดยไม่ต้องเสียโควตา Egress เลยแม้แต่ไบต์เดียว!
-- ==============================================================================

CREATE OR REPLACE FUNCTION reconcile_sync(
  p_table_name text,
  p_client_items jsonb DEFAULT '[]'::jsonb,
  p_scope_column text DEFAULT NULL,
  p_scope_value text DEFAULT NULL,
  p_scope_values jsonb DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_has_updated_at boolean;
  v_has_is_deleted boolean;
  v_time_col text;
  v_result jsonb;
BEGIN
  IF p_table_name NOT IN (
    'patients', 'treatments', 'branches', 'queue', 'pos_transactions', 
    'inventory', 'inventory_logs', 'setting_pos', 'finance_revenue', 
    'finance_expenses', 'staff', 'staff_schedules', 'settings', 'logs'
  ) THEN
    RAISE EXCEPTION 'Invalid table name for reconcile: %', p_table_name;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = p_table_name AND column_name = 'updated_at'
  ) INTO v_has_updated_at;

  v_time_col := CASE WHEN v_has_updated_at THEN 'updated_at' ELSE 'created_at' END;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = p_table_name AND column_name = 'is_deleted'
  ) INTO v_has_is_deleted;

  EXECUTE format('
    WITH client_data AS (
      SELECT 
        (elem->>''id'')::text AS id,
        COALESCE((elem->>''updated_at'')::timestamptz, ''1970-01-01''::timestamptz) AS client_updated_at
      FROM jsonb_array_elements($1) AS elem
    ),
    server_data AS (
      SELECT *
      FROM %I
      WHERE (
        ($2 IS NULL AND $4 IS NULL)
        OR ($2 IS NOT NULL AND $3 IS NOT NULL AND %I::text = $3)
        OR ($2 IS NOT NULL AND $4 IS NOT NULL AND %I::text IN (SELECT jsonb_array_elements_text($4)))
      )
    ),
    active_server_data AS (
      SELECT *
      FROM server_data
      WHERE (%s)
    ),
    deleted_items AS (
      SELECT c.id
      FROM client_data c
      LEFT JOIN active_server_data s ON c.id = s.id::text
      WHERE s.id IS NULL
    ),
    changed_items AS (
      SELECT s.*
      FROM active_server_data s
      LEFT JOIN client_data c ON s.id::text = c.id
      WHERE c.id IS NULL 
         OR s.%I > (c.client_updated_at + interval ''500 milliseconds'')
    )
    SELECT 
      CASE 
        WHEN NOT EXISTS (SELECT 1 FROM deleted_items) AND NOT EXISTS (SELECT 1 FROM changed_items)
        THEN NULL
        ELSE jsonb_build_object(
          ''deleted_ids'', COALESCE((SELECT jsonb_agg(id) FROM deleted_items), ''[]''::jsonb),
          ''updated_rows'', COALESCE((SELECT jsonb_agg(row_to_json(changed_items.*)) FROM changed_items), ''[]''::jsonb)
        )
      END;
  ', 
    p_table_name, 
    COALESCE(p_scope_column, 'id'), 
    COALESCE(p_scope_column, 'id'),
    CASE WHEN v_has_is_deleted THEN 'COALESCE(is_deleted, false) = false' ELSE 'true' END,
    v_time_col
  )
  INTO v_result
  USING p_client_items, p_scope_column, p_scope_value, p_scope_values;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

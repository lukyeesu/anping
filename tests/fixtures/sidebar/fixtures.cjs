// Mock fixtures generator for sidebar QA automation (reproducible for 200 and 1000 rows)
function createSidebarFixtures(rowCount = 1000) {
  const totalPatients = Number(rowCount || 1000);
  const now = new Date('2026-10-28T12:00:00Z');
  const year = now.getFullYear();
  const month = now.getMonth();
  const dayKey = day => `${year}-${String(month + 1).padStart(2, '0')}-${String((day % 28) + 1).padStart(2, '0')}`;

  const branches = [
    { id: 'b1', name: 'สาขาหลัก สาทร', code: 'B01', address: 'กรุงเทพมหานคร' },
    { id: 'b2', name: 'สาขาอารีย์', code: 'B02', address: 'กรุงเทพมหานคร' }
  ];

  const staff = [
    { id: 'fixture-user', name: 'ทีมทดสอบระบบ', username: 'fixture', role: 'superadmin', branch_id: 'b1' },
    { id: 'fixture-doc', name: 'พญ. ทดสอบ ใจดี', username: 'doctor1', role: 'doctor', branch_id: 'b1' }
  ];

  const patients = Array.from({ length: totalPatients }, (_, i) => ({
    id: `HN69-${String(i + 1).padStart(4, '0')}`,
    prefix: i % 2 ? 'นางสาว' : 'นาย',
    first_name: `คนไข้ทดสอบ${String(i + 1).padStart(4, '0')}`,
    last_name: 'อันผิง',
    nickname: `เดโม${i + 1}`,
    gender: i % 2 ? 'หญิง' : 'ชาย',
    dob: '1992-05-15',
    phone: `080${String(i).padStart(7, '0')}`,
    created_at: `${dayKey(1)}T03:00:00Z`,
    branch_id: i % 2 ? 'b2' : 'b1',
    informed_consent_status: 'green',
    pdpa_status: 'green',
    is_deleted: false,
    vital_signs: { bp: '120/80', pulse: '72', temp: '36.5', weight: '60', height: '170' }
  }));

  const queue = patients.slice(0, Math.min(200, totalPatients)).map((p, i) => ({
    id: `Q-${i + 1}`,
    hn: p.id,
    patient_name: `${p.prefix} ${p.first_name} ${p.last_name}`,
    phone: p.phone,
    raw_date_time: `${dayKey(i + 1)}T10:00:00`,
    status: ['pending', 'confirmed', 'completed', 'cancelled'][i % 4],
    doctor: 'พญ. ทดสอบ ใจดี',
    service: 'ฝังเข็มรักษาอาการ',
    branch_id: p.branch_id,
    room: `ห้อง ${((i % 3) + 1)}`
  }));

  const treatments = patients.slice(0, Math.min(200, totalPatients)).map((p, i) => ({
    id: `TX-${i + 1}`,
    patient_id: p.id,
    datetime: `${dayKey(i + 1)}T09:30:00`,
    diagnosis: 'ปวดสะบักเรื้อรัง (Office Syndrome)',
    treatment_detail: 'ฝังเข็มรมยาและกระตุ้นไฟฟ้า 30 นาที',
    branch_id: p.branch_id,
    doctor_name: 'พญ. ทดสอบ ใจดี'
  }));

  const posProducts = [
    { id: 'PROD-1', name: 'ฝังเข็มปรับสมดุล', price: 1200, category: 'การรักษา', is_stock: false, icon: 'Package' },
    { id: 'PROD-2', name: 'กัวซาล้างพิษ', price: 800, category: 'การรักษา', is_stock: false, icon: 'Package' },
    { id: 'PROD-3', name: 'ยาสมุนไพรจีนบำรุงไต', price: 450, category: 'ยาสมุนไพร', is_stock: true, stock: 85, minStock: 10, icon: 'Pill' },
    { id: 'PROD-4', name: 'ชารางจืดชงดื่ม', price: 250, category: 'เครื่องดื่มเพื่อสุขภาพ', is_stock: true, stock: 40, minStock: 5, icon: 'Package' }
  ];

  const pos_transactions = Array.from({ length: 120 }, (_, i) => ({
    id: `POS-${i + 1}`,
    total_amount: 1500 + (i % 10) * 100,
    net_amount: 1400 + (i % 10) * 100,
    discount: 100,
    payment_method: i % 2 ? 'cash' : 'transfer',
    patient_name: `คนไข้ทดสอบ${String((i % 50) + 1).padStart(4, '0')}`,
    date: `${dayKey(i + 1)}T11:00:00`,
    created_at: `${dayKey(i + 1)}T11:00:00`,
    branch_id: i % 2 ? 'b2' : 'b1',
    status: 'completed',
    items: [{ id: 'PROD-1', name: 'ฝังเข็มปรับสมดุล', quantity: 1, price: 1200 }]
  }));

  const finance_revenue = [
    { id: 'REV-1', amount: 5000, date: dayKey(1), description: 'เงินโอนรับค่าบริการสปา', branch_id: 'b1', category: 'รายได้เสริม' }
  ];

  const finance_expenses = Array.from({ length: 40 }, (_, i) => ({
    id: `EXP-${i + 1}`,
    amount: 300 + (i % 8) * 120,
    date: dayKey(i + 1),
    category: 'ค่าเวชภัณฑ์และอุปกรณ์',
    description: `จัดซื้อเข็มและอุปกรณ์ปลอดเชื้อ ล็อต ${i + 1}`,
    branch_id: 'b1'
  }));

  const finance_all_transactions = [
    ...pos_transactions.map(t => ({ ...t, type: 'income', is_auto: true, category: 'รายได้จาก POS' })),
    ...finance_revenue.map(t => ({ ...t, type: 'income', is_auto: false })),
    ...finance_expenses.map(t => ({ ...t, type: 'expense', is_auto: false }))
  ].map(t => ({
    ...t,
    timestamp_date: t.created_at || t.date,
    amount: t.net_amount ?? t.amount ?? t.total_amount,
    method: t.payment_method || 'cash',
    status: t.status || 'completed',
    note: t.description || t.category || 'รายการจำลอง',
    items: t.items || []
  }));

  const coupons = [
    { id: 'CPN-1', title: 'ส่วนลดสมาชิกใหม่ 10%', code: 'WELCOME10', discount_type: 'percent', discount_value: 10, status: 'active', expire_date: '2027-12-31' },
    { id: 'CPN-2', title: 'คูปองฝังเข็มฟรี 1 ครั้ง', code: 'FREEACU', discount_type: 'amount', discount_value: 1200, status: 'active', expire_date: '2027-12-31' }
  ];

  const ads = [
    { id: 'AD-1', title: 'โปรโมชั่นเปิดสาขาใหม่', type: 'image', url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=600&q=80', status: 'active', branch_id: 'b1' }
  ];

  return {
    patients,
    staff,
    branches,
    queue,
    treatments,
    inventory: posProducts,
    posProducts,
    pos_transactions,
    finance_revenue,
    finance_expenses,
    finance_all_transactions,
    coupons,
    ads
  };
}

module.exports = { createSidebarFixtures };

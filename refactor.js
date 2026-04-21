const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Create CatalogManager string
const catalogCode = `
// --- ระบบฐานข้อมูลรายการ (Catalog Manager) ---
const CatalogManager = ({ products = [], setProducts, callAppScript, showToast, isGlobalLoading }) => {
  const [search, setSearch] = useState('');
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isProcessingProduct, setIsProcessingProduct] = useState(false);
  const initialProductForm = { id: '', name: '', type: '', price: '', stockManaged: false, icon: 'Package', isCourse: false, courseSessions: 1 };
  const [productForm, setProductForm] = useState(initialProductForm);
  const [sweetAlert, setSweetAlert] = useState({ isOpen: false, type: '', title: '', text: '', onConfirm: null });

  const closeAlert = () => setSweetAlert(prev => ({...prev, isOpen: false}));

  const handleOpenAddProduct = () => {
      setProductForm({ ...initialProductForm });
      setIsEditFormOpen(true);
  };

  const handleOpenEditProduct = (prod) => {
      setProductForm({ 
        ...initialProductForm, 
        ...prod, 
        isCourse: !!prod.isCourse, 
        courseSessions: prod.courseSessions || 1 
      });
      setIsEditFormOpen(true);
  };

  const handleSaveProduct = async (e) => {
      e.preventDefault();
      setIsProcessingProduct(true);
      
      const payload = {
          ...productForm,
          id: productForm.id || \`ITM\${Date.now()}\`,
          price: Number(productForm.price),
          courseSessions: Number(productForm.courseSessions) || 1
      };

      try {
          await callAppScript('SAVE_DATA', 'setting_pos', payload);
          if (productForm.id) {
              setProducts(products.map(p => p.id === productForm.id ? payload : p));
              showToast('อัปเดตรายการสำเร็จ', 'success');
          } else {
              setProducts([payload, ...products]);
              showToast('เพิ่มรายการใหม่สำเร็จ', 'success');
          }
          setIsEditFormOpen(false);
      } catch (error) {
          showToast('บันทึกไม่สำเร็จ กรุณาลองใหม่', 'warning');
      }
      setIsProcessingProduct(false);
  };

  const handleDeleteProduct = (prod) => {
      setSweetAlert({
          isOpen: true, type: 'warning', title: 'ยืนยันการลบรายการ?',
          text: \`คุณต้องการลบ "\${prod.name}" ใช่หรือไม่?\`,
          onConfirm: async () => {
              closeAlert();
              setIsProcessingProduct(true);
              try {
                  await callAppScript('DELETE_DATA', 'setting_pos', { id: prod.id });
                  setProducts(products.filter(p => p.id !== prod.id));
                  showToast('ลบรายการสำเร็จ', 'danger');
              } catch (error) {
                  showToast('ลบไม่สำเร็จ กรุณาลองใหม่', 'warning');
              }
              setIsProcessingProduct(false);
          }
      });
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.type.toLowerCase().includes(search.toLowerCase()));
  }, [products, search]);

  const categories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.type)));
  }, [products]);

  return (
    <div className="flex flex-col h-full fade-in pb-20 md:pb-0 px-4 sm:px-6 md:px-8 pt-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 kanit-text tracking-tight flex items-center gap-2">
            <Tag className="text-sky-500" /> ฐานข้อมูลรายการ (Catalog)
          </h2>
          <p className="text-sm text-slate-500 kanit-text mt-1">จัดการสินค้า, บริการ, คอร์ส และแพ็กเกจ ทั้งหมดในคลินิก</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          {!isEditFormOpen && (
            <button onClick={handleOpenAddProduct} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-sky-500 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-sky-600 transition-all shadow-md shadow-sky-500/20 active:scale-95 kanit-text">
              <Plus size={18} /> เพิ่มรายการใหม่
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 mb-6">
        {!isEditFormOpen ? (
          <>
            <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0 z-10">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="ค้นหาชื่อ หรือหมวดหมู่..." 
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all font-data shadow-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="text-sm font-bold text-slate-500 kanit-text whitespace-nowrap bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm">
                ทั้งหมด {filteredProducts.length} รายการ
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 bg-slate-50/30">
              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredProducts.map((prod) => {
                    const PIcon = typeof prod.icon === 'string' ? (POS_ICONS[prod.icon] || Package) : (prod.icon || Package);
                    return (
                      <div key={prod.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4 hover:border-sky-300 hover:shadow-md transition-all group">
                        <div className="flex items-start justify-between">
                          <div className="w-14 h-14 bg-sky-50/50 text-sky-500 rounded-xl flex items-center justify-center shrink-0 border border-sky-100">
                            <PIcon size={28} />
                          </div>
                          <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleOpenEditProduct(prod)} className="p-2 bg-slate-50 text-slate-500 hover:text-sky-600 hover:bg-sky-100 rounded-lg transition-colors"><Pencil size={16} /></button>
                            <button onClick={() => handleDeleteProduct(prod)} className="p-2 bg-slate-50 text-slate-500 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"><Trash2 size={16} /></button>
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-1.5 mb-2">
                             <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] font-bold kanit-text truncate uppercase border border-slate-200">{prod.type}</span>
                             {prod.stockManaged && <span className="px-2 py-0.5 bg-indigo-50 text-indigo-500 rounded-md text-[10px] font-bold kanit-text uppercase border border-indigo-100">ตัดสต็อก</span>}
                             {prod.isCourse && <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-md text-[10px] font-bold kanit-text uppercase border border-amber-100">คอร์ส ({prod.courseSessions})</span>}
                          </div>
                          <h4 className="font-bold text-slate-800 text-base kanit-text line-clamp-2 leading-tight">{prod.name}</h4>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                             <span className="text-xl font-black text-sky-600 font-data">฿{Number(prod.price).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-2"><Search size={32} className="text-slate-300" /></div>
                  <p className="kanit-text font-medium text-lg">ไม่พบรายการที่ค้นหา</p>
                  <p className="text-sm font-data">"{search}"</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-8 bg-slate-50/50">
            <form id="catalog-form" onSubmit={handleSaveProduct} className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-100 shadow-xl max-w-3xl mx-auto flex flex-col relative z-10">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-5 mb-6">
                    <button type="button" onClick={() => setIsEditFormOpen(false)} className="p-2 sm:p-2.5 text-slate-400 bg-slate-50 border border-slate-200 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"><ChevronLeft size={20}/></button>
                    <h4 className="font-bold text-slate-800 text-xl kanit-text">{productForm.id ? 'แก้ไขข้อมูลรายการ' : 'เพิ่มข้อมูลรายการใหม่'}</h4>
                </div>
                
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-600 ml-1 kanit-text uppercase tracking-wide">ชื่อรายการ <span className="text-rose-500">*</span></label>
                            <input required type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 transition-all font-data" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} placeholder="เช่น เลเซอร์ฝ้า, ครีมกันแดด" />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-600 ml-1 kanit-text uppercase tracking-wide">ราคา (บาท) <span className="text-rose-500">*</span></label>
                            <input required type="number" min="0" step="0.01" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 transition-all font-data font-bold text-sky-600 text-lg" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} placeholder="0.00" />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-600 ml-1 kanit-text uppercase tracking-wide">หมวดหมู่ <span className="text-rose-500">*</span></label>
                        <input required type="text" list="category-options" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 transition-all font-data" value={productForm.type} onChange={e => setProductForm({...productForm, type: e.target.value})} placeholder="พิมพ์หมวดหมู่ หรือเลือกจากรายการ" />
                        <datalist id="category-options">
                            {categories.filter(c => c !== 'ทั้งหมด').map((cat, idx) => <option key={idx} value={cat} />)}
                        </datalist>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-600 ml-1 kanit-text uppercase tracking-wide">เลือกไอคอน <span className="text-rose-500">*</span></label>
                        <div className="grid grid-cols-5 sm:grid-cols-8 gap-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            {Object.keys(POS_ICONS).map(iconKey => {
                                const CurrentIcon = POS_ICONS[iconKey];
                                const isSelected = productForm.icon === iconKey;
                                return (
                                    <button 
                                        key={iconKey} type="button" 
                                        onClick={() => setProductForm({...productForm, icon: iconKey})}
                                        className={\`aspect-square flex items-center justify-center rounded-xl transition-all \${isSelected ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30 scale-110 z-10' : 'bg-white text-slate-500 hover:bg-sky-50 border border-slate-200 hover:border-sky-200'}\`}
                                    >
                                        <CurrentIcon size={24} />
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div onClick={() => setProductForm({...productForm, stockManaged: !productForm.stockManaged})} className={\`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-colors \${productForm.stockManaged ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}\`}>
                            <input type="checkbox" className="w-5 h-5 mt-0.5 accent-indigo-500 rounded cursor-pointer pointer-events-none" checked={productForm.stockManaged} readOnly />
                            <div>
                                <label className="font-bold text-slate-800 kanit-text cursor-pointer block leading-tight">จัดการสต็อก (สินค้า)</label>
                                <p className="text-xs text-slate-500 mt-1 kanit-text">รายการนี้เป็นสิ่งของที่ต้องนับจำนวน มีการรับเข้า และตัดจ่าย</p>
                            </div>
                        </div>
                        <div onClick={() => setProductForm({...productForm, isCourse: !productForm.isCourse})} className={\`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-colors \${productForm.isCourse ? 'bg-amber-50/50 border-amber-200 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}\`}>
                            <input type="checkbox" className="w-5 h-5 mt-0.5 accent-amber-500 rounded cursor-pointer pointer-events-none" checked={productForm.isCourse} readOnly />
                            <div>
                                <label className="font-bold text-slate-800 kanit-text cursor-pointer block leading-tight">คอร์ส / แพ็กเกจ</label>
                                <p className="text-xs text-slate-500 mt-1 kanit-text">รายการนี้มีจำนวนครั้งที่ต้องตัดเมื่อมาใช้บริการ</p>
                            </div>
                        </div>
                    </div>

                    {productForm.isCourse && (
                        <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-200/60 animate-in fade-in slide-in-from-top-2">
                            <label className="block text-sm font-bold text-amber-700 mb-2 kanit-text">จำนวนครั้งทั้งหมด (Total Sessions) <span className="text-rose-500">*</span></label>
                            <div className="flex items-center gap-3">
                                <input required type="number" min="1" className="w-full max-w-[200px] px-4 py-3 bg-white border border-amber-200 rounded-xl outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-data font-bold text-amber-700 text-lg text-center" value={productForm.courseSessions} onChange={e => setProductForm({...productForm, courseSessions: e.target.value})} placeholder="1" />
                                <span className="font-bold text-amber-600 kanit-text">ครั้ง</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex gap-4">
                    <button type="button" onClick={() => setIsEditFormOpen(false)} className="flex-[1] py-4 bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl font-bold kanit-text hover:bg-slate-200 transition-colors">ยกเลิก</button>
                    <button type="submit" disabled={isProcessingProduct} className="flex-[2] py-4 bg-sky-500 text-white rounded-2xl font-bold shadow-xl shadow-sky-500/30 kanit-text hover:bg-sky-600 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 text-lg">
                        {isProcessingProduct ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />} ยืนยันการบันทึก
                    </button>
                </div>
            </form>
          </div>
        )}
      </div>

      {sweetAlert.isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm fade-in">
          <div className="bg-white rounded-[1.5rem] sm:rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center modal-animate-in">
            <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mb-4"><AlertTriangle size={40} /></div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2 kanit-text">{sweetAlert.title}</h3><p className="text-slate-500 mb-8 kanit-text">{sweetAlert.text}</p>
            <div className="flex gap-3 w-full"><button onClick={closeAlert} className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-semibold transition-colors kanit-text">ยกเลิก</button><button onClick={sweetAlert.onConfirm} className="flex-1 py-3.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-semibold transition-colors shadow-lg shadow-rose-500/30 kanit-text">ยืนยัน</button></div>
          </div>
        </div>
      )}
    </div>
  );
};
\`;

// 2. Locate POSSystem block
let mIdx = code.indexOf('{/* --- Modal ตั้งค่ารายการสินค้า (POS Management) --- */}');
if (mIdx !== -1) {
  let endIdx = code.indexOf('{/* Alert Component สำหรับ POS Settings */}', mIdx);
  if (endIdx !== -1) {
    code = code.slice(0, mIdx) + code.slice(endIdx);
  }
}

let aIdx = code.indexOf('{/* Alert Component สำหรับ POS Settings */}');
if (aIdx !== -1) {
  let endIdx = code.indexOf('</>', aIdx);
  if (endIdx !== -1) {
    code = code.slice(0, aIdx) + code.slice(endIdx);
  }
}

// Remove button
const btnMatch = code.match(/<button[\\s\\S]*?onClick=\{\\(\\) => setIsManageModalOpen\\(true\\)\}[\\s\\S]*?<\\/button>/);
if (btnMatch) {
  code = code.replace(btnMatch[0], '');
}

// 3. Inject CatalogManager
code = code.replace('// --- ระบบจัดการสาขา (Branch Manager) ---', catalogCode + '\\n// --- ระบบจัดการสาขา (Branch Manager) ---');

// 4. Inject Tab Render
const posRenderIdx = code.indexOf('<div style={{ display: currentTab === \\'pos\\' ? \\'flex\\' : \\'none\\' }} className="flex-1 w-full relative">');
if (posRenderIdx !== -1) {
    const catalogRenderStr = \`            <div style={{ display: currentTab === 'catalog' ? 'block' : 'none' }} className="w-full h-full bg-[#f8fafc]">
                <CatalogManager products={posProducts} setProducts={setPosProducts} callAppScript={callAppScript} showToast={showToast} isGlobalLoading={isGlobalLoading} />
            </div>\\n\`;
    code = code.slice(0, posRenderIdx) + catalogRenderStr + code.slice(posRenderIdx);
}

fs.writeFileSync('src/App.jsx', code);

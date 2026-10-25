# แผนแก้อาการจอกระตุกเมื่อย่อ–ขยาย Sidebar

## เป้าหมายหลัก — Primary goal

ให้การกดและลากย่อ–ขยาย sidebar บน tablet ที่ใช้ AnpingClinic.apk ลื่นขึ้น โดย sidebar ยังดันเนื้อหาเข้า–ออกตามเดิม ผู้ใช้ยังอ่านรายการเดิมต่อได้โดยตำแหน่งไม่กระโดด และเลื่อนขึ้น–ลงแล้วพบข้อมูลครบถ้วนตามปกติ

สถานะ: เอกสารแผนงาน ยังไม่ได้แก้ implementation หรือตรวจวัด FPS บน tablet จริง ตัวเลข 15–20 FPS เป็นอาการที่ผู้ใช้อธิบาย ไม่ใช่ผลจาก profiler

## แนวทางที่เลือก

ใช้ **virtualization**: สร้างองค์ประกอบบนหน้าจอเฉพาะรายการที่มองเห็นและรายการใกล้จอ ส่วนที่อยู่นอกช่วงนี้ใช้พื้นที่ว่างแทนความสูง เพื่อให้ scrollbar และตำแหน่งเลื่อนยังทำงานเหมือนรายการยาวปกติ

ตัวอย่าง หากเห็น 8 แถว อาจเริ่มทดลองด้วยแถวเผื่อด้านบนและล่างด้านละ 5 แถว รวมประมาณ 18 แถวที่ต้องจัดวางจริง ค่าเผื่อเรียกว่า overscan และต้องปรับจากผลทดสอบ ไม่ใช่กำหนดจำนวนนี้ตายตัวทุกเครื่อง

ขณะ sidebar เปลี่ยนความกว้าง ระบบยังจัดวางแถวที่มองเห็นตามความกว้างใหม่ แต่ไม่ต้องจัดวางเนื้อหาของทุกแถวที่เคยเลื่อนผ่าน เมื่อเลื่อนกลับไปหาแถวอื่น จึงสร้างและวัดแถวนั้นด้วยความกว้างล่าสุด ไม่ต้องมีงานเบื้องหลังไล่จัดหน้าทั้งรายการ

Virtualization ลดจำนวนองค์ประกอบที่ browser ต้องจัดวาง ส่วน pagination ควบคุมการโหลดข้อมูลจาก server ทั้งสองอย่างต้องทำงานร่วมกัน ข้อมูลที่โหลดแล้วไม่ต้องถูกลบเพียงเพราะเลื่อนออกนอกจอ

### เงื่อนไขที่ต้องรักษา

- คงพฤติกรรม sidebar แบบดันเนื้อหา รวมทั้งการกด การลากตามนิ้ว การปล่อยให้ย่อ/ขยายจนสุด และการยุบเมื่อเลือกเมนู
- คงรูปแบบตารางและการ์ดตามขนาดจอ รวมถึงหัวตาราง ตัวกรอง และการเลื่อนแนวนอนเดิม
- การค้นหา เรียงลำดับ เปลี่ยนสาขา เปิดรายละเอียด แก้ไข เลือกข้อมูล พิมพ์ และโหลดหน้าถัดไปต้องได้ข้อมูลถูกต้อง
- ไม่เปลี่ยน sidebar เป็นเมนูทับเนื้อหา ไม่ยืดภาพข้อความด้วย scale และไม่ถ่ายภาพตารางมาทับระหว่างแอนิเมชัน
- ปฏิบัติตาม AGENTS.md: ใช้ Git แบบอ่านอย่างเดียว ห้าม git add, git commit และ git push ผู้ใช้เป็นผู้จัดการการนำขึ้นระบบ

## ข้อเท็จจริงจากโค้ดปัจจุบัน

ตำแหน่งบรรทัดต่อไปนี้เป็นจุดเริ่มค้นหา อาจเปลี่ยนได้หลังแก้ไฟล์ ให้ค้นชื่อฟังก์ชันประกอบเสมอ

| ส่วน | หลักฐาน | ผลต่อแผน |
| --- | --- | --- |
| ย่อ/ขยาย sidebar | `src/App.jsx:891` และ `:915`, `expandSidebarSmoothly` / `collapseSidebarSmoothly` เปลี่ยน width ระหว่าง 80 และ 256px ใน 260ms | มีการเปลี่ยนขนาด layout ระหว่างแอนิเมชัน ต้องวัดต้นทุนจริง |
| ลาก sidebar | `src/App.jsx:940`, `handleSidebarDragStart` เขียน width ผ่าน requestAnimationFrame | ต้องทดสอบทั้งลากต่อเนื่องและกด ไม่ใช่เฉพาะ transition |
| Scroll container | `src/App.jsx:4320`, `#main-scroll-container` และ `overflowAnchor: 'none'` | ใช้ container นี้เป็นฐานคำนวณช่วงที่มองเห็น และจัดการตำแหน่งอ้างอิงเอง |
| คืนตำแหน่งแต่ละหน้า | `src/App.jsx:1195`, useLayoutEffect คืน scrollTop ตาม currentTab | ต้องทำงานร่วมกับความสูงจำลองและ cache เมื่อกลับเข้าหน้า |
| Tablet มีทั้งตารางและการ์ด | sidebar ใช้ `md` แต่หลายตารางใช้ `hidden lg:block` และการ์ดใช้ `lg:hidden` | ช่วงประมาณ 768–1023 CSS px มี sidebar พร้อมการ์ด ต้องแก้ทั้งสองรูปแบบ; ตรวจ breakpoint ที่ build ใช้จริง |
| นัดหมาย | `src/pages/AppointmentManager.jsx:102`, `:924`, `:1007`, `:1082` เริ่ม visibleCount 20 แล้วเพิ่มครั้งละ 10 พร้อม slice จากต้นรายการ | เป็นการเพิ่มแถวสะสม ยังไม่ได้ถอดแถวที่พ้นจอออก |
| ผู้ป่วย | `src/pages/MedicalRecords.jsx:2513` และ `:2553` map sortedPatients ทั้งหมดเป็นตารางและการ์ด; `:1537` โหลดเพิ่ม | ข้อมูลที่โหลดเพิ่มทำให้จำนวนองค์ประกอบสะสม |
| การเงิน | `src/pages/FinancePage.jsx:893` เก็บ financeTransactions, PAGE_SIZE 30 และโหลดเพิ่มที่ `:2078`; ตารางจริงอยู่ที่ `:2363` | รักษาการโหลดข้อมูลและยอดรวมเดิม แล้วจำกัดเฉพาะส่วนที่แสดง |
| ตารางมี min-width | นัดหมาย table-fixed/min-w-900, ผู้ป่วย table-fixed/min-w-1100, การเงิน table-auto/min-w-900 | บางขนาดจอตารางอาจไม่เปลี่ยนความกว้างเลย ต้องดู measured width ก่อนสรุปว่า reflow ของแถวเป็นต้นเหตุหลัก |
| Component การเงินอีกชุด | `FinanceTableSection.jsx` และ `TransactionRow.jsx` มีอยู่ แต่จากการค้นปัจจุบันพบ FinanceTableSection เป็น import ใน App และยังไม่พบจุด render | ตรวจ call site ก่อนแก้ ไม่เลือกไฟล์จากชื่อเพียงอย่างเดียว |
| แอนิเมชันแถว | `src/App.jsx:4976`, `.space-row-animation` เริ่ม opacity 0 แล้วเล่น 0.5s | เมื่อ virtualization สร้างแถวกลับมา อาจเล่นซ้ำและเห็นข้อมูลกระพริบ |
| ฝั่ง Android | `AndroidManifest.xml:42` เปิด hardwareAccelerated; `MainActivity.kt:277` ใช้ LAYER_TYPE_NONE; `:50` / `:492` โหลดเว็บผ่าน CLINIC_URL | เริ่มวัดหน้าเว็บก่อน ไม่เปลี่ยน layer type โดยไม่มีหลักฐาน และแยก build ทดสอบออกจาก URL production |
| เครื่องมือในโปรเจกต์ | package.json มี build/lint แต่ไม่มี test script หรือ virtualization dependency | ไม่อ้างว่า npm test ใช้งานได้ ต้องเลือกวิธีทดสอบและ dependency ให้ชัดในช่วงทดลอง |

ข้อสังเกตเหล่านี้เป็นหลักฐานจาก source code ยังไม่ยืนยันสัดส่วนต้นทุน Layout, Paint, React หรือ native WebView บนเครื่องที่มีปัญหา

## Phase 0 — ตรวจเอกสารและกำหนดขอบเขต implementation

**ความเชื่อมโยงกับเป้าหมายหลัก:** เลือกวิธีลดงานนอกจอที่รองรับรูปแบบตารางและการ์ดจริง เพื่อรักษาการดันเนื้อหาและไม่สร้างปัญหาตำแหน่งเลื่อนใหม่

### งานที่ต้องทำ

1. อ่าน AGENTS.md, package.json และจุดอ้างอิงในตารางด้านบนอีกครั้งเมื่อเริ่มลงมือ ตรวจ caller ของหน้าที่จะแก้ รวมถึงเงื่อนไขซ่อนตาราง/การ์ด
2. ใช้ `@tanstack/react-virtual` เป็นตัวเลือกหลักสำหรับการทดลอง เนื่องจากต้องรองรับแถวสูงไม่เท่ากัน ตรวจเวอร์ชันที่ติดตั้งได้จริง, peer dependencies ของ React 19 และเอกสารของเวอร์ชันนั้นก่อนเพิ่ม dependency ลง package.json/package-lock.json
3. นำรูปแบบ useVirtualizer และการวัดแถวจาก [React adapter](https://tanstack.com/virtual/latest/docs/framework/react/react-virtual) และ [Dynamic example](https://tanstack.com/virtual/latest/docs/framework/react/examples/dynamic) มาใช้เฉพาะส่วนจำเป็น ไม่ต้องเพิ่ม `@tanstack/react-table` เพื่อทำ virtualization
4. ใช้ [Table example](https://tanstack.com/virtual/latest/docs/framework/react/examples/table) เป็นตัวอย่างโครงสร้าง แล้วตรวจให้เข้ากับแถวสูงไม่เท่ากันของแอป อย่าคัดสูตรสำหรับแถวสูงคงที่มาใช้ตรง ๆ
5. กำหนดวิธีวางแถวให้ชัดก่อนเขียน: เริ่มทดลอง native table ที่มี spacer rows บน/ล่าง และ render เฉพาะช่วงที่เลือก โดยคงหัวตาราง/ความกว้างคอลัมน์ร่วมกัน; การ์ดใช้ block spacers ใช้ความสูงสะสมจาก virtualizer ไม่คูณ index ด้วยความสูงเดา

### APIs ที่อนุญาตให้ใช้เป็นฐาน

| API / option | วัตถุประสงค์ | เอกสาร |
| --- | --- | --- |
| `useVirtualizer(options)` | สร้าง virtualizer ที่ผูกกับ scroll element ของแอป | [React adapter](https://tanstack.com/virtual/latest/docs/framework/react/react-virtual) |
| `count`, `getScrollElement`, `estimateSize`, `getItemKey`, `overscan` | ระบุจำนวนรายการ ขนาดประมาณ ID คงที่ และช่วงเผื่อ | [Virtualizer API](https://tanstack.com/virtual/latest/docs/api/virtualizer) |
| `getVirtualItems()`, `getTotalSize()` | อ่านรายการที่ต้องสร้างและพื้นที่รวมโดยประมาณ | [Virtualizer API](https://tanstack.com/virtual/latest/docs/api/virtualizer) |
| instance `measureElement(element)` พร้อม `data-index` | วัดขนาดแถว/การ์ดที่ mount อยู่; แตกต่างจาก option measureElement ที่เป็น callback คืนขนาด | [Dynamic example](https://tanstack.com/virtual/latest/docs/framework/react/examples/dynamic) |
| `scrollMargin`, `scrollToOffset()`, `scrollToIndex()`, `measure()` | รองรับระยะก่อนรายการ การคืนตำแหน่ง และการล้าง measurement เมื่อจำเป็น | [Virtualizer API](https://tanstack.com/virtual/latest/docs/api/virtualizer) |
| `ResizeObserver`, `observe()`, `disconnect()` | ติดตามความกว้าง container และ cleanup เมื่อเลิกใช้งาน | [MDN ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) |
| `requestAnimationFrame`, `transitionend`, `transitioncancel` | จัดจังหวะงานและติดตามการจบ/ยกเลิก transition เฉพาะกรณีที่ต้องเชื่อมกับ sidebar | [MDN requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame), [transitionend](https://developer.mozilla.org/en-US/docs/Web/API/Element/transitionend_event), [transitioncancel](https://developer.mozilla.org/en-US/docs/Web/API/Element/transitioncancel_event) |

เอกสาร `/latest/` อาจมีตัวเลือกใหม่กว่า package ที่เลือก ต้องบันทึกเวอร์ชันและตรวจ API ของเวอร์ชันนั้นก่อนนำตัวอย่างมาใช้ ไม่เพิ่ม directDomUpdates หรือปรับ flush/scroll internals เป็นค่าเริ่มต้น

### ตรวจรับ

- [ ] ระบุไฟล์ที่ render จริง, scroll container, breakpoint และทางเดินโหลดข้อมูลของแต่ละหน้าครบ
- [ ] ระบุเวอร์ชัน dependency และตัวอย่างที่นำรูปแบบมาใช้ได้จริง
- [ ] ทดลอง table spacer กับ border-collapse, ความสูงไม่เท่ากัน และหัวตารางแล้ว ไม่มีช่องว่างซ้อนหรือความสูงนับสองครั้ง
- [ ] ถ้าใช้ scrollMargin ต้องแยกระยะก่อนรายการออกจากความสูงรายการ และพิสูจน์การคำนวณ spacer ไม่รวม margin ซ้ำ

**สิ่งที่ต้องหลีกเลี่ยง:** ใช้ window เป็น scroll root โดยไม่ตรวจโครงสร้าง, เพิ่ม table framework ทั้งชุด, สมมติว่า content-visibility บน tr แก้ได้ทันที, แต่งชื่อ API หรือคัดสูตร translate สำหรับแถวสูงเท่ากันมาใช้กับข้อมูลจริง

## Phase 1 — สร้าง baseline และพิสูจน์จุดที่หนัก

**ความเชื่อมโยงกับเป้าหมายหลัก:** ทำให้ทราบว่าการลดแถวนอกจอช่วยอาการที่ผู้ใช้เจอจริง และมีหลักฐานเปรียบเทียบก่อน–หลังบนเครื่องเดียวกัน

### งานที่ต้องทำ

1. บันทึกรุ่น tablet, Android, Android System WebView, เวอร์ชัน APK, viewport เป็น CSS px, อัตรารีเฟรช และหน้าที่กระตุก ก่อนสรุปผล
2. ใช้ข้อมูลจำลองที่มีชื่อยาว/หลายบรรทัด/สถานะ VIP จำนวน 20, 200 และ 1,000 รายการในสภาพแวดล้อมทดสอบ ไม่ใช้ข้อมูลคนไข้จริงใน trace หรือภาพประกอบ ใช้โหมด simulation เดิมได้หลังตรวจว่าหน้านั้นไม่เรียกฐานข้อมูลจริงโดยตรง
3. ใช้ production web build สำหรับเทียบ performance; dev build ใช้ตรวจฟังก์ชันได้ แต่ห้ามนำตัวเลข dev กับ production มาเทียบกัน
4. เตรียม debug APK หรือการตั้งค่าทดสอบที่โหลดเว็บ build ก่อนและหลังได้บน tablet ตัวเดียวกัน โดยไม่เปลี่ยน CLINIC_URL ของ release ไปเป็นเครื่องพัฒนา หากต้องเปิด WebView debugging ให้จำกัดเฉพาะ build ทดสอบ
5. เก็บ Performance trace ผ่าน remote debugging ตาม [Chrome WebViews](https://developer.chrome.com/docs/devtools/remote-debugging/webviews) และตรวจพฤติกรรม debugging ปัจจุบันจาก [Android WebView API](https://developer.android.com/reference/android/webkit/WebView#setWebContentsDebuggingEnabled(boolean))
6. กดเปิด–ปิด 20 รอบ และลากไป–กลับต่อเนื่อง 10 วินาที ที่ต้น/กลาง/ท้ายรายการ หลังเลื่อนโหลดข้อมูลหลายรอบแล้ว ทำซ้ำอย่างน้อย 3 รอบต่อกรณี
7. บันทึก frame time p95, สัดส่วนเฟรมเกิน 33.3ms, เฟรมยาวเกิน 100ms, Layout/Paint/Scripting duration, จำนวน data rows/cards ที่ mount อยู่ และ React commits ระหว่างเหตุการณ์

### สมมติฐานที่ต้องแยกทดสอบ

| สมมติฐาน | หลักฐานที่จะสนับสนุน | ผลต่อแนวทาง |
| --- | --- | --- |
| แถวที่สะสมทำให้ layout หนัก | จำนวนข้อมูลเพิ่มแล้ว Layout duration เพิ่มขณะ resize; prototype ที่มีแถวเฉพาะช่วงจอลดต้นทุน | เดินหน้าทดลอง virtualization |
| Paint/effect เป็นภาระหลัก | ตารางถูก min-width ตรึงแต่ Paint ยังหนัก; ปิด effect เฉพาะจุดใน build ทดลองแล้วดีขึ้น | ลด effect ตาม trace โดยรักษาหน้าตาและพฤติกรรมหลัก |
| React ทำงานซ้ำมาก | กด sidebar แล้วพบ render/คำนวณรายการขนาดใหญ่ แม้ geometry ไม่เปลี่ยนมาก | ปรับขอบเขต state/props หรือ computation เฉพาะจุดที่วัดพบ |
| ปัญหาเฉพาะ WebView/เครื่อง | build และข้อมูลเดียวกันต่างจาก Chrome มาก | ตรวจ native/WebView ต่อ ไม่สรุปว่า virtualization เพียงอย่างเดียวพอ |

### ตรวจรับ

- [ ] มีขั้นตอนทำซ้ำและ baseline ที่อธิบายช่วงที่กระตุกได้จริง รวมทั้งกดและลาก
- [ ] รู้ว่าหน้า tablet ที่ทดสอบแสดงตารางหรือการ์ด และ measured width ของรายการเปลี่ยนหรือถูก min-width ตรึง
- [ ] มี control case รายการสั้น และเคสหลังโหลดสะสม เพื่อแยกต้นทุนตามจำนวนรายการ
- [ ] ถ้ายังไม่มี tablet ให้บันทึกผลบน desktop ว่าเป็นผลเบื้องต้นเท่านั้น ห้ามระบุว่าแก้ปัญหา APK ผ่านแล้ว

**อ้างอิงใน repo:** sidebar และ main-scroll-container ใน App.jsx, การเพิ่ม visibleCount ใน AppointmentManager.jsx, server pagination ใน MedicalRecords.jsx/FinancePage.jsx

**สิ่งที่ต้องหลีกเลี่ยง:** วัด FPS ด้วยความรู้สึก, นับเฉพาะ requestAnimationFrame แล้วถือว่าเท่ากับเฟรมที่แสดงจริง, เปลี่ยนหลายตัวแปรพร้อมกัน, ทำ trace กับข้อมูลจริงหรือคนละ build/config แล้วเทียบกัน

## Phase 2 — ทดลอง virtualization ในหน้านัดหมายและรักษาตำแหน่งอ่าน

**ความเชื่อมโยงกับเป้าหมายหลัก:** ลดงานจัดวางระหว่าง sidebar ดันเนื้อหาจริง พร้อมพิสูจน์ว่าข้อความไม่กระพริบ แถวไม่หาย และหน้าจอไม่กระโดดก่อนนำไปใช้หลายหน้า

### งานที่ต้องทำ

1. เริ่มที่ `src/pages/AppointmentManager.jsx` ใน viewMode table ซึ่งมีทั้งตารางและการ์ด ใช้รูปแบบ virtualizer จาก Phase 0 แทน slice ที่เพิ่มแถวสะสม ไม่เพิ่มเวลาหน่วงจำลองเพื่อรอแสดงข้อมูลที่อยู่ใน memory แล้ว
2. ผูก getScrollElement กับ `#main-scroll-container` เดิม โดยส่ง DOM ref จาก App ผ่านรูปแบบที่เหมาะสม คงพื้นที่เลื่อนหลักเพียงชุดเดิม ไม่สร้าง vertical scroll ซ้อนเพิ่ม
3. คำนวณจุดเริ่มรายการเทียบกับ container รวมส่วนหัว/filter ที่อยู่ก่อนหน้า และวัดใหม่เมื่อ layout ส่วนนั้นเปลี่ยน แยกการเลื่อนแนวนอนของตารางออกจากการเลื่อนแนวตั้ง
4. ใช้ ID รายการที่คงที่เป็น key แทน index หรือ ID ผสม index ตรวจ uniqueness ของ ID จริงก่อนใช้ เก็บ state การเลือก/แก้ไข/modal ไว้กับข้อมูลระดับหน้าเพื่อไม่ให้หายเมื่อแถวถูกถอดจาก DOM
5. Render เฉพาะ virtual items พร้อม spacer บน/ล่าง เก็บโครงสร้าง HTML ตารางให้ถูกต้อง และทำให้ spacer ไม่มีข้อความ ปุ่ม เส้นคั่น หรือพื้นที่รับ focus
6. รองรับแถว/การ์ดสูงต่างกันด้วย measureElement; กำหนด estimate จากข้อมูลตัวอย่างจริง อย่าบังคับความสูงจนชื่อหรือข้อมูลสำคัญถูกตัด
7. Mount เฉพาะชุดตารางหรือการ์ดที่ใช้งานจริง อย่าให้ทั้งสองชุดสร้างรายการครบแล้วซ่อนด้วย CSS อย่างเดียว ตรวจการสลับ breakpoint/หมุนจอและ cleanup observer ของชุดเก่า
8. ตัดการเล่น `.space-row-animation` ซ้ำเมื่อแถวเดิมกลับเข้าช่วง render โดยจำกัดการแก้เฉพาะรายการที่ virtualize ห้ามแก้ global animation ทุกหน้าโดยไม่มีเหตุผล

### การเปลี่ยนความกว้างและ scroll anchor

- ก่อนเปลี่ยน layout เก็บ ID ของแถวอ้างอิงที่อ่านอยู่ พร้อม offset ภายในแถวเทียบขอบพื้นที่อ่านใต้ sticky header
- ระหว่างลาก/transition ให้แถวที่ mount อยู่ปรับความกว้างและวัดความสูงจริง ส่วนแถวนอกจอใช้ค่าประมาณ/ค่าที่จำไว้ โดยไม่ mount กลับมาทั้งหมดเพื่อวัด
- ระบุว่า cache ความสูงสัมพันธ์กับความกว้างและรูปแบบ table/card ค่าเดิมอาจใช้ไม่ได้หลังข้อความตัดบรรทัดใหม่
- เมื่อความกว้างนิ่ง ใช้การ invalidate/reconcile cache ที่เหมาะกับเวอร์ชัน library โดยรักษา anchor ก่อน/หลัง; ถ้าใช้ measure() ห้ามเรียกทุกเฟรม และห้ามคาดว่าจะวัดแถวที่ไม่อยู่ใน DOM ให้ทันที
- ให้มีผู้รับผิดชอบ scroll compensation เพียงทางเดียว ตรวจการชดเชยของ library ก่อนเพิ่มโค้ดเอง เพื่อไม่ให้เลื่อนซ้ำกับ `overflowAnchor: none` และการคืน scrollTop ของ App
- หากใช้ transitionend ให้กรอง target/propertyName เป็น width ของ sidebar และรองรับ transitioncancel, กดสวนทิศ, ไม่มี transition และ unmount; การจบแอนิเมชันต้องไม่ผูกกับ timeout อย่างเดียว
- ถ้าผู้ใช้เริ่ม scroll เอง ให้ update anchor ตามการอ่านล่าสุดและไม่ดึงกลับไปตำแหน่งเก่า หากแถวอ้างอิงถูกลบให้เลือกแถวใกล้เคียงอย่างชัดเจน
- กลับเข้าหน้าเดิมต้องคืนตำแหน่งหลังพื้นที่จำลองพร้อมแล้ว ไม่ตั้ง scrollTop ขณะรายการยังเตี้ยจน browser clamp ไปตำแหน่งอื่น

### ตรวจรับ

- [ ] จำนวน data rows/cards ใน DOM จำกัดตาม viewport + overscan + รายการ focus ที่จำเป็น ไม่โตตามข้อมูล 200 → 1,000 รายการ
- [ ] Sidebar ยังดันเนื้อหาตามนิ้ว ทั้งเปิด ปิด ลากค้าง และสลับทิศเร็ว
- [ ] Anchor ID คงเดิม และ offset ต่างไม่เกิน 4 CSS px หลัง layout นิ่ง ในกรณีที่แถวยังอยู่และไม่ได้ชนขอบ scroll
- [ ] เลื่อนขึ้น–ลงเร็วไม่มีช่องว่างค้างหรือแถวกระพริบจาก entrance animation
- [ ] กดแถว/ปุ่มได้รายการตรงกับ ID จริง; keyboard focus ไม่หายเมื่อแถวยังมี interaction อยู่
- [ ] สลับ table/card และกลับหน้าเดิมได้ ไม่มี scroll กระโดดไปต้นหน้าโดยไม่ตั้งใจ
- [ ] Performance trace เทียบกับ Phase 1 ดีขึ้นจริงก่อนขยายไปหน้าอื่น ถ้าไม่ดีขึ้นให้ทบทวนต้นเหตุ ไม่ติดตั้งแพตเทิร์นนี้ทั่วแอปทันที

**อ้างอิง:** AppointmentManager.jsx:876–936, :1004 เป็นต้นไป, :1327; App.jsx:1195 และ :4320; [Dynamic example](https://tanstack.com/virtual/latest/docs/framework/react/examples/dynamic), [Virtualizer API](https://tanstack.com/virtual/latest/docs/api/virtualizer), [ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver)

**สิ่งที่ต้องหลีกเลี่ยง:** วัดทุกแถวทุกเฟรม, ใช้ smooth scroll เพื่อชดเชยความสูงที่ยังเปลี่ยน, อ่าน geometry สลับกับเขียน style วนทุกแถว, setState ใน App ทุก scroll tick, ใช้ resizeItem และ measureElement จัดการ index เดียวกันพร้อมกัน

## Phase 3 — ใช้กับหน้าผู้ป่วยและการเงิน พร้อมตรวจภาระที่เหลือ

**ความเชื่อมโยงกับเป้าหมายหลัก:** ทำให้หน้ารายการหลักได้ผลแบบเดียวกันโดยรักษาข้อมูล การโหลดเพิ่ม และการทำงานประจำของคลินิก

### งานที่ต้องทำ

1. นำเฉพาะพฤติกรรม virtualizer/measurement/anchor ที่พิสูจน์แล้วใน Phase 2 มาใช้ร่วมกัน เช่น `src/hooks/useVirtualRows.js` ซึ่งเป็นชื่อไฟล์เสนอใหม่ เก็บ JSX และคำสั่งของแต่ละหน้าไว้ที่หน้าเดิม ไม่สร้างระบบตารางใหม่ทั้งชุด
2. ใช้กับ MedicalRecords.jsx ทั้ง `memoizedPatientTableRows` และ `memoizedPatientMobileCards` โดยคง `fetchPatientsPaginated`, ตัวกรอง และข้อมูลผู้ป่วยที่โหลดไว้
3. ใช้กับตาราง/การ์ดที่ render จริงใน FinancePage.jsx โดยคง PAGE_SIZE, hasMore, server stats และการรวมรายการหลายประเภท ตรวจ ID ไม่ชนกันระหว่างแหล่งข้อมูล
4. เปลี่ยน trigger โหลดหน้าถัดไปให้สัมพันธ์กับปลายช่วงที่แสดง/ระยะถึงท้ายรายการที่โหลดแล้ว มีตัวกัน request ซ้ำขณะ loading และหยุดเมื่อ hasMore=false; resize/measurement ต้องไม่ทำให้ fetch วนซ้ำ
5. ใช้ count ตามข้อมูลที่โหลดแล้ว พร้อม loader sentinel ตามจำเป็น ไม่สร้าง scrollbar เสมือนโหลดครบทั้งฐานข้อมูลโดยไม่มีข้อมูลรองรับ และไม่ขอโหลดทุกหน้าล่วงหน้าเพื่อ virtualization
6. ตารางการเงินที่ใช้ table-auto ต้องกำหนดนโยบายความกว้างคอลัมน์ร่วมกัน เช่น colgroup/table-fixed หลังทดสอบข้อความยาวแล้ว เพื่อให้คอลัมน์ไม่ส่ายตามแถวที่เข้า–ออกจอ รักษาการเลื่อนแนวนอนและการอ่านข้อมูลครบ
7. ตรวจ filter/sort/เปลี่ยนสาขา/refresh ให้ยกเลิกหรือไม่รับผล request เก่าที่ไม่ตรงชุดข้อมูล และ reset ตำแหน่งตามพฤติกรรมเดิม; การ append หน้าถัดไปต้องรักษาตำแหน่งปัจจุบัน
8. ข้อมูลสำหรับยอดรวม การค้นหา การพิมพ์ และ export ต้องอิง model/query เดิม ไม่อิงเฉพาะรายการที่ mount อยู่ หากมีการพิมพ์ DOM ทั้งตารางให้จัดเส้นทางพิมพ์ที่รวมรายการตามขอบเขตเดิม
9. วัดผลอีกครั้ง หากยังหนักให้แก้เฉพาะสิ่งที่ trace ชี้ เช่น React computation, blur/shadow หรือส่วนเนื้อหาขนาดใหญ่ที่อยู่ไกลจอ
10. สำหรับ block/card นอก virtual list อาจทดลอง `content-visibility: auto` ร่วมกับ `contain-intrinsic-size` แบบจำกัดขอบเขต หลังตรวจ [CSS containment](https://www.w3.org/TR/css-contain-2/) และ [แนวทาง content-visibility](https://web.dev/articles/content-visibility) แล้ว ไม่ใช้ซ้อนกับ dynamic measurement โดยไม่มีการทดสอบ เพราะ placeholder อาจรบกวนขนาดที่วัด

### ตรวจรับ

- [ ] ทั้งสามหน้ารักษาขอบเขตจำนวนแถวใน DOM หลังเลื่อนโหลดหลายรอบ
- [ ] ค้นหา เรียงลำดับ เปิดรายละเอียด แก้ไข เลือกข้อมูล พิมพ์ และยอดรวมให้ผลเหมือนเดิม
- [ ] โหลดเพิ่มครบ ไม่ซ้ำ ไม่ข้ามหน้า ไม่ติด loading และไม่ยิง request เพิ่มจากการย่อ/ขยายอย่างเดียว
- [ ] คอลัมน์ไม่เปลี่ยนตำแหน่งตามข้อความของแถวใหม่; popup/dropdown ไม่ถูก clip
- [ ] ข้อมูลน้อย/ว่าง/โหลดล้มเหลวมีหน้าตาและการลองใหม่ตามเดิม
- [ ] ไม่แก้ FinanceTableSection/TransactionRow ที่ไม่ได้ถูกเรียกเพียงเพราะชื่อคล้ายส่วนที่ต้องแก้

**อ้างอิง:** MedicalRecords.jsx:302, :1537, :2513, :2553, :2828; FinancePage.jsx:893, :944, :2078, :2363; [MDN table-layout](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/table-layout), [Virtualizer API](https://tanstack.com/virtual/latest/docs/api/virtualizer)

**สิ่งที่ต้องหลีกเลี่ยง:** เปลี่ยน schema/API หรือยอดรวมเพื่อให้ virtualization ง่ายขึ้น, virtualize calendar/dashboard/POS ทั้งหมดโดยไม่มี trace, ใช้ content-visibility กับ main ทั้งก้อนแล้วคาดว่าจะแยกแถวนอกจอให้, ถอด focused/edited row โดยไม่มีการรักษาสถานะ

## Phase 4 — ตรวจรับบน browser และ tablet พร้อมส่งมอบ

**ความเชื่อมโยงกับเป้าหมายหลัก:** ยืนยันว่าอาการกระตุกลดลงบน APK จริงพร้อมพฤติกรรมเดิมครบ และแยกผลที่พิสูจน์แล้วออกจากข้อจำกัดที่ยังเหลือ

### การตรวจฟังก์ชัน

| กลุ่ม | กรณีที่ต้องตรวจ |
| --- | --- |
| ขนาดจอ | ต่ำกว่า 768, 768–1023, 1024 ขึ้นไป, หมุน portrait/landscape; ใช้ breakpoint จริงของ build |
| ข้อมูล | ว่าง, 1 รายการ, 20, 200, 1,000; ชื่อยาว หลายบรรทัด badge และรูปภาพที่โหลดช้า |
| Sidebar | กดเปิด/ปิด, ลากช้า/เร็ว, ปล่อยกลางทาง, สวนทิศ, เลือกเมนูระหว่างแอนิเมชัน |
| Scroll | ต้น/กลาง/ท้าย, เลื่อนเร็ว, แนวนอน, กลับหน้าเดิม, sticky header/filter เปลี่ยนขนาด |
| ข้อมูลเปลี่ยน | โหลดหน้าถัดไป, ค้นหา, sort, เปลี่ยนสาขา, แก้/ลบแถวที่อยู่ในหรือก่อน viewport |
| Interaction | คลิกแถวถูก ID, ปุ่มในแถว, dropdown/modal, keyboard focus, รายการที่กำลังแก้ไข |
| ผลลัพธ์ | จำนวนรายการและยอดรวม, รายละเอียด, พิมพ์/export ไม่เหลือแค่แถวที่อยู่บนจอ |

### การตรวจอัตโนมัติและคำสั่ง

1. สร้าง browser regression checks แบบเล็กที่ขับ component จริงด้วยข้อมูลจำลอง สำหรับ DOM count ที่มีขอบเขต, anchor หลัง resize, โหลดเพิ่มครั้งเดียว และ ID หลัง sort/scroll ใช้เครื่องมือที่มีอยู่ก่อน; ถ้าต้องเพิ่มเครื่องมือทดสอบให้ระบุ dependency/คำสั่งจริงในผลส่งมอบ
2. การทดสอบ performance อาศัย browser trace; unit test ตรวจได้เฉพาะตรรกะ เช่นคำนวณ anchor/ช่วงข้อมูล ไม่ใช้แทนหลักฐานความลื่นบน tablet
3. รัน `npm run build` และ `npm run lint` เปรียบเทียบ lint กับ baseline ก่อนแก้ แก้ข้อผิดพลาดที่เพิ่มจากงานนี้ และรายงานข้อผิดพลาดเดิมแยกกัน
4. ใช้ `git diff --check`, `git diff --stat` และ `git diff` ตรวจขอบเขตการเปลี่ยนแปลง ไม่รันคำสั่ง Git ที่เขียนประวัติหรือ stage
5. ตรวจหารูปแบบเสี่ยงด้วย rg: full-list map ที่ยังอยู่ใน render path, key แบบ index, measure() ทุกเฟรม, content-visibility บน tr, แอนิเมชันเข้าแถวที่เล่นซ้ำ และ listener/observer ที่ไม่มี cleanup แล้วอ่านบริบทก่อนตัดสิน
6. ไม่มี test script ใน package.json ปัจจุบัน จึงห้ามรายงานว่า `npm test` ผ่านถ้ายังไม่ได้เพิ่มและรันคำสั่งทดสอบจริง

### เป้าหมาย performance และเกณฑ์เสร็จ

- ใช้เครื่อง/build/data/viewport แบบเดียวกับ baseline และเทียบอย่างน้อย 3 รอบ ไม่เปรียบเทียบ dev build กับ production build
- เป้าหมายเบื้องต้นสำหรับเครื่อง 60Hz: p95 frame time ไม่เกิน 20ms, เฟรมเกิน 33.3ms ไม่เกิน 5% และไม่มีเฟรมเกิน 100ms ที่เกิดซ้ำจาก sidebar หลังโหลดข้อมูลพร้อมแล้ว ทั้งหมดเป็นเป้าหมายตรวจรับ ไม่ใช่ผลที่รับรองล่วงหน้า
- Layout/Paint/Scripting ระหว่าง sidebar ต้องลดลงอย่างมีนัยจาก baseline และหลังเลื่อนโหลดหลายรอบต้องไม่เสื่อมตามจำนวนแถวที่ mount สะสม; หากเครื่องมีรีเฟรชต่างออกไปให้บันทึกและระบุ frame budget ที่ใช้
- จำนวน data rows/cards ใน DOM สอดคล้องกับจำนวนที่เห็น + overscan + ข้อยกเว้น focus ที่บันทึกไว้ ไม่เพิ่มตามจำนวนข้อมูลทั้งหมด
- Anchor หลัง resize ผ่านเกณฑ์ Phase 2 และผ่านการทดสอบเส้นทางใช้งานหลักทุกข้อ
- หากข้อมูลจริงมีแถวสูงเปลี่ยนมาก การประมาณความสูงนอกจออาจทำให้ขนาด scrollbar เปลี่ยนได้ ต้องวัดและรายงาน โดยเฉพาะใกล้ท้ายรายการ ห้ามอ้างว่าตำแหน่งจะคงที่สมบูรณ์โดยไม่ทดสอบ
- หากยังไม่ผ่าน ให้แสดง trace และสาเหตุที่เหลือ แล้วแก้จุดนั้นตามหลักฐาน ไม่ปิดงานเพียงเพราะเพิ่ม virtualization สำเร็จ

### สิ่งส่งมอบและการนำไปใช้งาน

- รายการไฟล์ที่แก้ dependency/version ที่เพิ่ม และเหตุผลของค่าประมาณความสูง/overscan ที่เลือก
- ผลก่อน–หลังแยกตามหน้าและรูปแบบ table/card พร้อมอุปกรณ์ build ขนาดข้อมูล และวิธีทำซ้ำ
- ผล build/lint/browser checks และข้อจำกัดที่ยังไม่ได้พิสูจน์บน tablet
- ลบ instrumentation ชั่วคราว ปิด WebView debugging ใน release และคง production URL ตามเดิม ตรวจ cleanup listener, rAF, timer และ ResizeObserver
- หากแก้เฉพาะเว็บ เนื่องจาก APK โหลดเว็บจาก CLINIC_URL การใช้งานจริงต้องได้รับเว็บ build ใหม่หลังผู้ใช้นำขึ้นระบบ ไม่ต้องสรุปว่าจำเป็นต้องติดตั้ง APK ใหม่เสมอ; หากแก้ native ให้ระบุว่า APK ส่วนไหนต้อง build ใหม่
- ผู้ใช้เป็นผู้ stage/commit/push/นำขึ้นระบบ งานตามแผนนี้ไม่ทำขั้นตอนเหล่านั้นอัตโนมัติ

**อ้างอิง:** package.json, eslint.config.js, AGENTS.md, [WebView remote debugging](https://developer.chrome.com/docs/devtools/remote-debugging/webviews), เอกสาร APIs และตัวอย่างที่เลือกใน Phase 0

**สิ่งที่ต้องหลีกเลี่ยง:** รับรอง 60 FPS จาก build ผ่านอย่างเดียว, ใช้ผล desktop แทน tablet, ทิ้ง debug URL ใน release, รายงานการทดสอบที่ยังไม่ได้รัน หรือขยายงานไปปรับทั้งแอปโดยไม่มีหลักฐาน

## ขอบเขตไฟล์ที่คาดว่าจะเกี่ยวข้อง

| ไฟล์ | ขอบเขตที่คาดไว้ |
| --- | --- |
| `src/App.jsx` | ส่ง scroll ref/รองรับการคืนตำแหน่งและจังหวะ sidebar เท่าที่จำเป็น รักษาการดันเนื้อหา |
| `src/pages/AppointmentManager.jsx` | หน้าทดลอง virtualization ทั้ง table/card |
| `src/pages/MedicalRecords.jsx` | จำกัดรายการที่ render พร้อม pagination เดิม |
| `src/pages/FinancePage.jsx` | จำกัดรายการที่ render พร้อม server stats และ pagination เดิม |
| `src/hooks/useVirtualRows.js` — เสนอใหม่ | รวมเฉพาะ logic ที่พิสูจน์ว่าใช้ร่วมกันได้หลังทดลองหน้าแรก |
| `src/index.css` หรือ style ใกล้ component | spacer/column sizing/animation เฉพาะรายการที่แก้ |
| `package.json`, `package-lock.json` | virtualizer และเครื่องมือทดสอบเฉพาะที่จำเป็น |
| browser fixture/regression script — ระบุชื่อเมื่อเลือกเครื่องมือ | ตรวจการใช้งานจริงด้วยข้อมูลจำลองและเปรียบเทียบก่อน–หลัง |
| Android config / MainActivity.kt — เฉพาะเมื่อจำเป็นต่อการวัด | เปิด URL/debugging ใน build ทดสอบ ไม่ถือเป็นการแก้ native production โดยอัตโนมัติ |

ลำดับดำเนินงาน: ตรวจเอกสาร → วัด baseline → พิสูจน์หน้านัดหมายพร้อม anchor → ใช้กับผู้ป่วย/การเงิน → ตรวจรับและส่งผลให้ผู้ใช้นำขึ้นระบบ

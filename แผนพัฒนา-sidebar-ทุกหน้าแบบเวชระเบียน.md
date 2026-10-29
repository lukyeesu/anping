# แผนพัฒนา sidebar ทุกหน้าให้ทำงานแบบหน้าเวชระเบียน

## เป้าหมายหลัก

ทุกหน้าภายใน sidebar ของ anping ต้องย่อ–ขยายเนื้อหาทั้งก้อนพร้อม sidebar ได้เหมือนหน้าเวชระเบียนที่ทดลองแล้ว ลากช้าติดตามนิ้ว สะบัดแล้วเคลื่อนอัตโนมัติ และเลือกหน้าใหม่หลังปล่อยนิ้วได้ทันที โดยข้อมูล ตาราง กราฟ แบบฟอร์ม และตำแหน่งกดทำงานถูกต้อง

**สถานะเอกสาร:** แผนส่งต่อให้ agent อื่นดำเนินงาน ยังไม่ได้เปิดความสามารถนี้เพิ่มให้หน้าอื่นในรอบเขียนแผน

- Workspace: `D:\Webapp Clinic\anping clinic\anping` — ใช้ React/Vite ใน `src/` และ Android WebView ใน `android-card-agent/`
- ฐานที่ตรวจ: APK 1.6.25 / versionCode 48 วันที่ 27/10/2026; ตรวจ source และสถานะ workspace อีกครั้งก่อนเริ่ม เพราะยังมีงานที่ผู้ใช้ไม่ได้ commit
- ต้นแบบ: `records`, `queue`, `exec_dashboard`; ตอนนี้เปิด whole-content scaling เพียงสาม tab นี้ที่ `src/App.jsx:1178`
- ขอบเขต “ทุกหน้า”: 15 tab ที่อยู่ใน authenticated sidebar shell ตามตารางด้านล่าง รวม `profile` แม้ไม่ได้อยู่ใน `NAV_ITEMS`
- Android WebView ใช้ uniform scale แบบต้นแบบ ส่วน browser ปกติรักษาเส้นทาง fallback เดิมของหน้าเวชระเบียน พร้อมตรวจว่า interaction ทุกหน้าไม่ถดถอย การนำ uniform scale ไปเปิดบน browser ด้วยเป็นงานแยกจากการขยายหน้าในแผนนี้
- โทรศัพท์ที่ใช้ sidebar แบบ drawer ยังคงรูปแบบเดิม ไม่เปลี่ยนให้เป็น sidebar ดันเนื้อหาแบบแท็บเล็ต
- คงหน้าตา สี และกติกาการทำงานของแต่ละโมดูล งานนี้ขยายกลไก sidebar ไม่ใช่ออกแบบระบบคนไข้/การเงินหรือหน้ากล้องใหม่

**กฎ workspace:** ใช้ `git status`, `git diff`, `git log` ได้ ห้าม `git add`, `git commit`, `git push` ผู้ใช้จัดการ Git เอง รัน npm/node/build/test ได้โดยไม่ต้องถามซ้ำ เก็บงานเดิมและ comments ที่ยังตรงกับพฤติกรรมไว้

## อ่านก่อนเริ่ม และลำดับแหล่งอ้างอิง

1. `AGENTS.md` และ source ที่ระบุในเอกสารนี้เป็นหลัก ตรวจด้วยชื่อ function/selector หากเลขบรรทัดเปลี่ยน
2. `android-card-agent/WEBVIEW-TRIAL.md` และ `DEVICE-PERFORMANCE.md` เป็นประวัติผลทดลอง อ่านหัวข้อ sidebar 1.6.12–1.6.23 ควบคู่ source ปัจจุบัน ไม่ใช้ผลของรุ่นเก่าแทนการทดสอบรอบใหม่
3. `แผนพัฒนา-React-Native-อันผิงคลินิก.md` เป็นอีกแนวทาง ไม่ใช่แผนที่ต้องนำมาดำเนินงานรอบนี้; ไม่ย้ายไป React Native หรือแก้ `demoanping/` เป็นตัวแอปหลัก
4. `.work` เป็นหลักฐานและเครื่องมือส่วนตัวที่ถูก ignore ไม่ใช่สิ่งที่รับประกันว่ามีอยู่ใน checkout ของ agent คนถัดไป

## แผนที่หน้าที่ต้องทำให้ครบ

Route mapping และเมนูจริงอยู่ใน `src/App.jsx:260–278`, `830–849`; conditional render อยู่ `4505–4761` ไม่มี `<Routes>` registry แยกให้เติมเอง

| Tab / route | Component | ปัจจุบัน | เฟสเปิดเพิ่ม | จุดตรวจเฉพาะหน้า |
|---|---|---|---|---|
| `records` — `/records`, `/records/:recordKey` | `MedicalRecords` | ต้นแบบ | ทดสอบซ้ำทุกเฟส | virtual table/card, pagination, sticky header/filter, deep link, OPD/modal, อ่านบัตร |
| `queue` — `/queue` | `AppointmentManager` | ต้นแบบ | ทดสอบซ้ำทุกเฟส | ตาราง/ปฏิทิน, ลากนัดหมาย, portal/calendar, คำค้นและตำแหน่งเมื่อกลับหน้า |
| `exec_dashboard` — `/exec_dashboard` | `ExecutiveDashboard` | ต้นแบบ | ทดสอบซ้ำทุกเฟส | กราฟ SVG, tooltip, ตาราง, ช่วงวันที่, modal เปรียบเทียบ |
| `finance` — `/finance` | `FinancePage` | ยังไม่เปิด | 2 | virtual table/card, pagination, sticky, รายละเอียดรายการและตัวเลขยอดเงิน |
| `dashboard` — `/`, `/dashboard` | `Dashboard` | ยังไม่เปิด | 3 | กราฟ, รายการภายใน, timeline แนวนอน, room modal |
| `catalog` — `/catalog` | `CatalogManager` | ยังไม่เปิด | 3 | หน้า flex/h-full, ranking bars, sticky, editor/dropdown |
| `coupons` — `/coupons` | `CouponManager` | ยังไม่เปิด | 3 | batch/card, ตัวออกแบบคูปอง, preview, picker คนไข้และ nested modal |
| `inventory` — `/inventory` | `InventoryManager` | ยังไม่เปิด | 3 | ตารางกว้าง, tabs, sticky, form/calendar portal |
| `reports` — `/reports` | `ReportsManager` | ยังไม่เปิด | 3 | ตาราง/card, ค้นหา/กรอง, พิมพ์รายงานโดยผลพิมพ์ไม่ถูก scale ตาม sidebar |
| `staff` — `/staff` | `StaffManager` | ยังไม่เปิด | 4 | ตารางเวลา month/week, drag clone/drop target, timeline และ schedule modal |
| `branch` — `/branch` | `BranchManager` | ยังไม่เปิด | 4 | card grid, รูปโลโก้, modal/form เลื่อนภายใน |
| `settings` — `/settings` | `SettingsManager` | ยังไม่เปิด | 4 | subnav, permissions/logs table, integrations/QR, unsaved confirmation และ fixed modal ที่ยัง render inline |
| `profile` — `/profile` | `ProfileManager` | ยังไม่เปิด | 4 | ฟอร์ม, avatar/upload, responsive grids และค่าที่ยังไม่บันทึก |
| `pos` — `/pos` | `POSSystem` | ยังไม่เปิด | 5 | main overflow-hidden, product/cart scroller แยก, checkout/history, สแกน, หน้าลูกค้าและพิมพ์ |
| `display_ads` — `/display_ads` | `DisplayAdsManager` | ยังไม่เปิด | 5 | video, sticky preview, editor/modal, iframe และ playback controls |

หน้าที่ไม่มี sidebar อยู่นอกการเปิด scaling: customer display (`/customer-display`, `/display`, query `customer_display`), PDPA, reset password, login/loading และ print-preparation/output ตรวจว่าเข้า–ออกหน้าเหล่านี้แล้วไม่เหลือ style/overlay ของ sidebar

### ตำแหน่ง source สำหรับจุดเสี่ยง

- Shared main: `src/App.jsx:4452–4462`; POS เปลี่ยน main เป็น `overflow-hidden` ที่ `4455` และใช้ wrapper `flex-1 min-h-0` ที่ `4580`
- เวชระเบียน: `src/components/PatientVirtualList.jsx`; `src/hooks/usePatientPagination.js`; `MedicalRecords.jsx:2861,2931`
- การเงิน: `src/components/FinanceVirtualList.jsx`; `FinancePage.jsx:2544–2610` — มี virtualization อยู่แล้ว ไม่เริ่มเขียนตารางใหม่
- POS: `POSSystem.jsx:3130,3267,3368,4076,4398` — product/cart scroller, anchored dropdown และ portals
- Settings: `SettingsManager.jsx:1200–1296` เป็นรายการ subtabs; fixed modal inline ที่ `3008` ต่างจาก body portal QR ที่ `3045`
- Staff/calendar: `StaffManager.jsx:176,213,248,1978,1981,2906`; `CalendarView.jsx:146–192` มี client coordinates และ drag clone บน body
- Coupon editor: `CouponManager.jsx:1155–1162,1390,2002,3982,8336` มีการวัดตำแหน่ง/ขนาดและ portal
- Video/iframe: `DisplayAdsManager.jsx:1008,1208,1613`; อ่าน `VideoJSPlayer` ก่อนแก้ lifecycle
- Dropdown: `CustomSelect.jsx:29–50,68–91,148`; `PortalDropdown.jsx:20–57` วัด rect ในพิกัดจอ แต่ sidebar motion ไม่ใช่ window resize

## สัญญาการเคลื่อนไหวที่ต้องรักษา

ใช้ระบบกลางที่มีอยู่ ไม่คัดลอก controller ไปใส่ในทุก page

| ส่วน | Source ที่ต้องอ่าน | พฤติกรรมที่ต้องรักษา |
|---|---|---|
| ทั้งก้อนเนื้อหา | `src/hooks/useSidebarBlocks.js:3–145` | ย่อ–ขยาย `main` รวมข้อความ ตาราง และกราฟในสัดส่วน X/Y เดียวกัน |
| การเคลื่อนอัตโนมัติ | hook `57–82`; `App.jsx:917–953` | ใช้ keyframes/timing/startTime เดียวกับ sidebar; 260ms linear; timer 270ms เริ่มตรวจการจบ ไม่ตัด animation ทิ้ง |
| ลากตามนิ้ว | `App.jsx:959–1164` | ค้าง/ช้าเป็น manual; สะบัดสั้นเป็น automatic; ยกนิ้วแล้วไม่เริ่มคำสั่งเดิมใหม่ |
| ปล่อยแล้ว | hook `92–102` | ใช้ CSS zoom ที่ geometry ตรงกับ transform แล้วคืน moving styles; ไม่มีการเด้ง จัดข้อความรอบสอง หรือ crossfade ตามหลัง |
| เลือกหน้าเร็ว | `App.jsx:1110–1135,1283–1313,4182–4185` | release ปลด drag lock; pointerdown ใหม่ถอน click blocker; clean touchend เลือกเมนูได้แม้ WebView ไม่สร้าง synthetic click |
| พื้นที่รับคลิก | `src/index.css:238–258,335–361` | `has-sidebar-blocks` ใช้ body overlay z51; sidebar z52 ยังกดได้ และ portal ต้องไม่ถูกบัง |
| Sticky | `src/hooks/useStickyHeader.js` | ใช้ logical scrollTop กับ threshold ที่ cache แล้ว อ่าน geometry เมื่อ layout เปลี่ยน ไม่คำนวณ layout ทุก scroll |
| Scroll restoration | `src/hooks/usePageScrollRestoration.js` | คง semantics ปัจจุบัน; anchor/scroll แปลงด้วย scale ถูกต้อง; ผู้ใช้เลื่อนเองแล้วหยุดการคืนตำแหน่ง |

Geometry ปัจจุบัน: sidebar 80px/256px; logical width = parentWidth − 80; scale = (parentWidth − sidebarWidth) / logical width ระหว่าง motion ใช้ transform ที่หาร baseZoom และจบด้วย CSS zoom ค่าที่ตรงกัน ขนาดเหล่านี้เขียนซ้ำอยู่ใน App/hook/test หากรวมเป็น constant ให้มีแหล่งเดียวโดยคงค่าและพฤติกรรมเดิม

### API ที่มีจริงและใช้เป็นต้นแบบได้

- `useSidebarBlocks(mainRef, sidebarRef, enabled)` ไม่คืนค่า; guard ภายในใช้ `CSS.supports('zoom', '0.9')` และ `html.anping-webview`
- `useStickyHeader(mainRef, page, enabled)` และ `usePageScrollRestoration(mainRef, page, scope, enabled)` ซึ่งคืน `{ capture, reset }`
- `useVirtualRows({ count, estimateSize, overscan, getItemKey, getScrollElement, enabled, measureElement, scrollMargin, gap, paddingStart, paddingEnd, initialMeasurementsCache, initialOffset })` จาก `src/hooks/useVirtualRows.js:15–55`
- WAAPI ที่ source ใช้จริง: `getAnimations()`, `effect.getKeyframes()`, `effect.getTiming()`, `animate()`, `ready`, `startTime`, `finished`, `cancel()`; observer ใช้ `ResizeObserver` และ `MutationObserver`
- รักษาการจัดการ promise ของ animation ที่ถูก cancel; ไม่สมมติว่ามี option หรือ method สำหรับ “sync” ที่ source ไม่ได้ใช้

## เฟส 0 — ยืนยันต้นแบบและเตรียมหลักฐานก่อนแก้

**ช่วยให้ถึงเป้าหมาย:** ยืนยันว่ากำลังขยายผลจากพฤติกรรมที่ผู้ใช้ยอมรับจริง และวัดจำนวนรายการที่แสดงจริงก่อนอ้างความลื่น

**งาน**

1. อ่านกฎ/แหล่งอ้างอิงและยืนยันตาราง 15 tab กับ source ล่าสุด บันทึกสภาพ workspace โดยไม่ล้างงานเดิม
2. เก็บ baseline release เดิมบนแท็บเล็ตเครื่องเดิม และ baseline แต่ละหน้าที่ยังไม่ได้เปิด scaling: บนสุด กลางรายการ ใกล้ท้าย รวมกรณีข้อมูลน้อย/มาก
3. อ่านและแยก harness ที่ใช้ได้จริงจาก branch ทดลองเก่า ตามหัวข้อเครื่องมือด้านล่าง; สร้าง route coverage matrix ไว้กับผลทดสอบ
4. แก้ความน่าเชื่อถือของ stress fixture ก่อนใช้ตัวเลข: `DEMO_ROWS=1000` เป็นจำนวนข้อมูลใน fixture ไม่ยืนยันว่าหน้าโหลดครบ 1,000 รายการแล้ว

**ช่องว่างที่ยืนยันจาก source:** harness เก่า `LOAD_ALL_PATIENTS` ตั้งเพียง global patientsData แต่ `usePatientPagination` มี query IDs แยกและโหลดทีละ 35 แถว จึงอาจวัด virtualizer ที่มีเพียง 35 แถว ต้องโหลด pages จนครบหรือสร้าง test seam ที่ตั้ง query IDs อย่างสอดคล้อง แล้ว assert `actual virtual count === target` ก่อนเริ่มวัด กรณีตรวจไม่ครบให้ test fail

**อ้างอิง:** `usePatientPagination.js:10,62,75,113–116`; `MedicalRecords.jsx:297–341`; private `check-webview.cjs` ส่วน `LOAD_ALL_PATIENTS`/`CHECK_FLING` และ `virtualCount`

**ผ่านเฟสเมื่อ:** มี baseline ของต้นแบบสามหน้าและรายการหน้าใหม่ครบทุก tab, ยืนยันจำนวนข้อมูลจริง 200/1,000 สำหรับชุด stress ที่จะวัด และมีคำสั่งสร้าง fixture ซ้ำได้

**จุดกันพลาด:** ไม่ใช้ผลของเฟสนี้ยืนยันว่าหน้าใหม่ผ่านแล้ว; ไม่ทดสอบด้วยการสร้าง/แก้คนไข้หรือรายการเงินจริงใน production

## เฟส 1 — เตรียม shell กลางและชุดทดสอบที่ส่งต่อได้

**ช่วยให้ถึงเป้าหมาย:** ให้ทุกหน้าใช้ controller เดียว และให้ agent คนอื่นตรวจผลได้โดยไม่ต้องมีไฟล์ชั่วคราวจากเครื่องนี้

**งาน**

1. รักษา main/scroll root เดิมและการเรียก hook ที่ App ไม่เพิ่ม hook แยกตาม page
2. กำหนด eligibility จากการมี authenticated sidebar shell จริง รวมเงื่อนไข public/print/login/loading/mobile โดยใช้เงื่อนไขชุดเดียวกับ render
3. ข้อควรระวัง: hooks อยู่ก่อน early returns แต่ `isCustomerDisplayRoute` ปัจจุบันประกาศทีหลังที่ `App.jsx:3898` หากใช้กับ hook ให้ย้าย pure derived condition มาอยู่ก่อนจุดใช้และให้ render อ้างค่าชุดเดียวกัน อย่าเรียก hooks แบบมีเงื่อนไขหรืออ้างตัวแปรก่อนประกาศ
4. ทดสอบเข้า–ออก public/print และกลับ shell เมื่อ boolean เปลี่ยน/refs mount ใหม่: effect ของ hook ขึ้นกับ refs และ `enabled` เท่านั้น การคืนจาก `mainRef === null` โดย enabled ยัง true อาจไม่ตั้ง observers ใหม่
5. ย้ายเฉพาะ fixture/assertions ที่เกี่ยวข้องไป path ที่ track ได้ เช่น `scripts/qa/sidebar-pages.cjs` และ `tests/fixtures/sidebar/` — **ชื่อเหล่านี้คือไฟล์ที่ต้องสร้าง ยังไม่มีในฐานงานนี้**
6. ประกาศเครื่องมือทดสอบใน devDependencies/lockfile ของ root แทน require Playwright จาก `demoanping/.expo/...`; เก็บ generator ข้อมูลจำลองใน repo และ mock การอ่าน/เขียนเครือข่ายให้รันโดยไม่ส่งข้อมูลจริง
7. เปลี่ยน harness จาก loop สามหน้ากับ selector เฉพาะ SVG ตัวแรกเป็น registry 15 tab + probe ตามประเภทหน้า รายการ/กราฟ/ฟอร์ม/วิดีโอใช้ตัววัดที่เหมาะกับ DOM จริง
8. ตรวจและแก้ cleanup เฉพาะที่ test พบว่าไม่ครบ: observers, RAF, pending animation, active gesture listeners, click blocker, body markers, native refresh และ inline styles เมื่อออก shell/logout/resize กลาง gesture

**กรณี true → true ที่ต้องพิสูจน์ในเฟสนี้:** เปลี่ยนหน้าขณะ animation วิ่งจากหน้ารายการยาวไปหน้าสั้น/POS โดย enabled ยัง true แล้ว hook จะไม่ตั้งตัวใหม่ และ frozen height เดิมอาจเป็นค่าของหน้าก่อน หากพบปัญหาให้ refresh geometry/cache จาก lifecycle กลางที่เหมาะสมโดยรักษา clock เดิม ไม่ใช้การเปลี่ยน key ของ main หรือ remount ทุก page เพื่อบังคับเริ่ม animation ใหม่

**อ้างอิง:** `App.jsx:1178,3898–4001,4452–4462`; `useSidebarBlocks.js:7–8,105–145`; gesture/controller และ CSS ตามตารางสัญญาข้างต้น

**ผ่านเฟสเมื่อ:** เครื่องมือรันจาก root โดยไม่มี dependency ต่อ `.work`/`.expo`, ต้นแบบสามหน้ายังผ่าน, public/mobile ไม่มี marker/overlay ค้าง และ login กลับเข้า shell แล้ว controller ทำงาน

**จุดกันพลาด:** ยังไม่ลบ allowlist แล้วประกาศว่าเสร็จทุกหน้า ใช้ allowlist เป็นขั้น rollout ได้ชั่วคราว แต่ปลายงานต้องไม่มีหน้าใดถูกทิ้งไว้เพียงเพื่อให้ผลรวมผ่าน

## เฟส 2 — เปิด Finance เป็นหน้าใหม่หน้าแรก

**ช่วยให้ถึงเป้าหมาย:** พิสูจน์ว่าการขยายผลใช้กับตารางหนักและ virtualization อีกระบบได้จริง ก่อนเปิดเพิ่มพร้อมกันหลายหน้า

**งาน**

1. ใช้ระบบกลางเพิ่ม `finance` โดยคง `FinanceVirtualList` และ pagination ของหน้านี้
2. ทดสอบ table/card ด้วยข้อมูลที่โหลดจริง 200/1,000 รายการ ตำแหน่งบน/กลาง/ใกล้ท้าย และรายการสั้นจนไม่เต็มจอ
3. ตรวจ overscan/spacers, scrollMargin ที่แปลงจาก visual เป็น logical, คลิกแถวได้ตรง transaction, ตัวเลขและรายละเอียดตรงกันหลังปล่อย
4. ตรวจ header/filter, horizontal scroll, date picker, transaction modal และการเลือกหน้าอื่นทันทีหลังลาก
5. วัดก่อน/หลังกับ Finance เอง รวมต้นแบบสามหน้า ถ้าปัญหาที่รายงานยังไม่ดีขึ้นให้ profile สาเหตุของหน้า ไม่ซ่อนด้วยการลดจำนวนรายการทดสอบ

**อ้างอิง:** `FinanceVirtualList.jsx`; `FinancePage.jsx:2286,2377,2544–2703`; `useVirtualRows.js`; อ้างอิง PatientVirtualList เฉพาะ pattern ไม่แทน domain transaction ด้วย patient

**ผ่านเฟสเมื่อ:** Finance ผ่านเกณฑ์กลางด้านล่างครบ ไม่มีแถวว่าง/คลิกผิด/หน้าเด้ง และต้นแบบสามหน้าไม่ถดถอย

**จุดกันพลาด:** ไม่ปิด pagination, ไม่เปลี่ยน key ทุกครั้งที่ scroll, ไม่อ้างว่ามี 1,000 แถวจากจำนวน fixture เพียงอย่างเดียว

## เฟส 3 — Dashboard, Catalog, Coupons, Inventory และ Reports

**ช่วยให้ถึงเป้าหมาย:** ครอบคลุมหน้าข้อมูลทั่วไป กราฟ ตาราง และตัวออกแบบที่ใช้ร่วมกับ sidebar เดียวกัน

**งาน**

1. เปิดเพิ่มทีละหน้าในห้าหน้านี้ และลงผลแยกตาม route ไม่ใช้ผลหน้าเดียวแทนทั้งกลุ่ม
2. Dashboard: ตรวจ SVG/labels/tooltip/timeline และ room modal กราฟไม่ remount หรือเริ่ม entrance animation ใหม่เพราะลาก sidebar
3. Catalog/Inventory/Reports: ตรวจ table/card, คำค้น/กรอง, pagination ที่มีจริง, ตารางกว้าง และ modal หลัง scale
4. Coupons: ตรวจ batch/card/template editor, ResizeObserver, pointer coordinates, preview, picker คนไข้ และ nested dialogs โดยใช้ข้อมูลจำลอง
5. Dropdown/tooltip ที่อิง body portal ต้องเกาะ anchor ถูกระหว่าง motion เลือกวิธี reposition หรือปิดตาม interaction เดิมอย่างสอดคล้องกับหน้า ห้ามปล่อยลอยผิดตำแหน่ง
6. ตรวจพิมพ์ด้วย mock/preview ว่าขนาดเอกสารและรายการถูกต้อง ไม่ส่ง style zoom ของแอปไปยัง print document

**อ้างอิง:** ตารางหน้ากับตำแหน่ง source, `CustomSelect.jsx`, `PortalDropdown.jsx`, `useStickyHeader.js` และตัวอย่าง body portals ใน MedicalRecords

**ผ่านเฟสเมื่อ:** ทั้งห้าหน้ามีผลตรวจแยกครบ และ baseline + Finance ยังผ่านการย่อ/ขยาย/คลิก/เลื่อน

**จุดกันพลาด:** ไม่แก้ระบบออกแบบคูปองใหม่ทั้งชุด และไม่เพิ่ม virtualization ทุกหน้าโดยไม่มีผลวัดชี้ว่าจำเป็น

## เฟส 4 — Staff, Branch, Settings และ Profile

**ช่วยให้ถึงเป้าหมาย:** ให้หน้าจัดการและฟอร์มใช้ sidebar แบบเดียวกันโดยไม่เสียพิกัดลากหรือข้อมูลที่กำลังกรอก

**งาน**

1. Staff: ตรวจ month/week, timeline แนวนอน, ghost clone บน body, resize/drag/drop และการคลิกเซลล์หลังย่อขยาย
2. Branch/Profile: ตรวจฟอร์ม รูป/avatar/dropdown ข้อความยาว และค่าที่ยังไม่บันทึกก่อน/หลัง motion โดยใช้ fixture
3. Settings: ไล่ subtabs จากรายการจริง รวม permissions, logs, integrations และ QR; ตรวจทั้งตารางยาวและฟอร์มสั้น
4. ตรวจ fixed modal ที่อยู่ใต้ main โดยเฉพาะ Settings หากถูก transform เปลี่ยน containing block ให้ใช้ portal ตาม pattern ของโปรเจกต์ พร้อมรักษาพิกัด anchor ของ dropdown
5. แตะเลือกหน้าอื่นหลังลากขณะ Settings มี unsaved changes ต้องแสดง confirmation เดิม ปิด/ยกเลิกครั้งเดียว และข้อมูลยังอยู่

**อ้างอิง:** `StaffManager.jsx`/`CalendarView.jsx` พิกัดลาก, `SettingsManager.jsx:1200–1296,3008,3045`, `BranchManager.jsx:245`, `ProfileManager.jsx:227` และ `App.jsx:1283–1313`

**ผ่านเฟสเมื่อ:** ทั้งสี่หน้าผ่าน ไม่มี drop target คลาด ไม่มีฟอร์มถูก reset เพราะ sidebar และไม่มี overlay/confirmation ค้าง

**จุดกันพลาด:** ใช้การแปลง visual/logical ที่ตรงกับ element จริง ไม่หาร scale ซ้ำกับ body portal และไม่เปลี่ยนสิทธิ์ผู้ใช้เพื่อให้ทดสอบเข้า route ได้

## เฟส 5 — POS และ Display Ads

**ช่วยให้ถึงเป้าหมาย:** ปิดช่องว่างของหน้าที่ไม่ได้เลื่อนแบบตารางทั่วไป เพื่อให้คำว่า “ทุกหน้า” ครบจริง

**งาน**

1. POS ต้องคง main overflow-hidden กับ product/cart scrollers แยก ทดสอบ pane heights, ปุ่มคิดเงิน, cart, dropdown, checkout/history และสถานะตะกร้าหลัง resize/scale
2. ตรวจ 0/น้อย/มากรายการ และ cart ยาว ไม่เกิดสอง scrollbar ที่แย่งการเลื่อนหรือส่วนล่างถูกตัด
3. ตรวจ modal สแกน/กล้อง/QR เปิด–ปิดและ Back โดยไม่บันทึกผู้ป่วยหรือขายจริง; อย่าให้ portal เต็มจอถูกย่อไปกับ main
4. หน้าลูกค้าแยกและหน้าพิมพ์ยังเป็น layout ของตนเอง ไม่ถูกเอาเข้า scaling เพียงเพราะเปิดจาก POS
5. Display Ads: ตรวจ video aspect/playback/control hit targets, preview sticky, editor, iframe และ cleanup; sidebar ต้องไม่ reload iframe/restart video ทุก frame
6. ถ้าพบข้อจำกัดเฉพาะหน้า แก้ adapter/การวัดที่จุดนั้นก่อน ไม่เปลี่ยน animation ทั้งแอปเพื่อกลบอาการหนึ่งหน้า

**อ้างอิง:** POS/main/scroll และ DisplayAdsManager/VideoJSPlayer ในตาราง source ข้างต้น; pattern modal บน body จากต้นแบบ

**ผ่านเฟสเมื่อ:** POS และ Display Ads ผ่านทั้ง interaction และ geometry พร้อมหลักฐาน รวมแล้ว 15 tab สามารถเข้าสู่ระบบเดียวกันได้

**จุดกันพลาด:** ไม่เปลี่ยน POS ให้เลื่อนด้วย main แทนสอง pane และไม่ใช้การขาย/ชำระเงินจริงเป็น automated test

## เฟส 6 — เปิดครบ ทดสอบเครื่องจริง และส่งมอบ

**ช่วยให้ถึงเป้าหมาย:** ยืนยันการใช้จริงข้ามทุกหน้า และส่งงานที่ผู้ใช้กับ agent คนถัดไปตรวจซ้ำได้

**งาน**

1. เมื่อทุกกลุ่มผ่านแล้วจึงเอา allowlist เฉพาะสามหน้าออก ใช้ eligibility ของ sidebar shell กลาง ครอบคลุมทั้ง 15 tab; คง feature guards ของ WebView/CSS zoom และ mobile drawer
2. ทดสอบตาราง gesture ทุกหน้า รวมสลับหน้าระหว่าง animation ที่ enabled=true ไป true และข้ามหน้าเนื้อหายาว/สั้น/POS ซึ่งใช้ scroller ต่างกัน
3. ใช้บัญชี fixture ที่มีสิทธิ์ครบเพื่อตรวจ coverage และบัญชีสิทธิ์จำกัดเพื่อยืนยัน redirect/menu เดิม ไม่ถือว่าทดสอบ route ผ่านถ้าถูกพากลับ dashboard
4. ทดสอบบน browser PC และ Android WebView release บนแท็บเล็ตเครื่องเดิม ไม่ใช้ debug build แทนผล release สุดท้าย
5. หากใช้ diagnostic APK เพื่อเก็บ CDP ให้แยกจากไฟล์ส่งมอบ จากนั้นติดตั้ง release ปกติและยืนยัน non-debuggable, ไม่มี forward ตรวจวัดค้าง, แอปเปิดได้
6. อัปเดต `WEBVIEW-TRIAL.md`/`DEVICE-PERFORMANCE.md` ตามผลจริง และบันทึกคำสั่งรัน dependency/data size/device/build/result ของแต่ละหน้าไว้กับชุดทดสอบที่ track ได้
7. ถ้าส่ง APK ให้เพิ่ม version ตามฐานล่าสุดในขณะทำจริง ตรวจ package/signature/hash และคัดลอกไฟล์เดียวกันไป public/dist โดยผู้ใช้เป็นผู้จัดการการเผยแพร่ Git/production

**อ้างอิง:** กฎ workspace, สัญญาการเคลื่อนไหว, `scripts/build-webview.mjs`, `vite.webview.config.js`, `android-card-agent/app/build.gradle` และหลักฐาน baseline

**ผ่านเฟสเมื่อ:** checklist ทุกหน้าเป็นผ่านพร้อมหลักฐาน ไม่มีหน้า excluded ชั่วคราวตกค้าง ไม่มี known blocker และ agent คนถัดไปรันชุดตรวจหลักได้จาก checkout ปกติ

**จุดกันพลาด:** ไม่ใช้ผล rAF/HWUI ไปอ้างว่า WebView แสดงภาพ 60/90 FPS จริง และไม่สรุปว่าไม่มีเฟรมตกหากยังมี sample ที่ขัดแย้ง

## ตารางทดสอบกลางและเกณฑ์ผ่าน

### Interaction ที่ต้องตรวจทุก tab

- เปิด/ปิดจากปุ่ม; กดลากค้างแล้วค่อยขยับ; ลากช้า; ลากเร็ว; สะบัดสั้นเสี้ยววินาที; กลับทิศกลางทาง; down/up ที่ไม่มี move; touchcancel/เมาส์ปล่อยนอกพื้นที่
- ทำทั้งขยายและย่อ ด้วยเมาส์และ touch ที่บนสุด/กลาง/ใกล้ท้าย; หน้า list ใช้ข้อมูลน้อยและ 200/1,000 ที่โหลดจริง หน้ากราฟ/วิดีโอใช้ workload ที่เหมาะกับเนื้อหาจริง
- ปล่อยแล้วแตะเมนูอื่นทันทีครั้งเดียว ระหว่าง animation ยังวิ่ง; gesture ลากเองต้องไม่เลือกหน้า และ Settings unsaved confirmation ยังทำงาน
- สะบัดขึ้น/ลงผ่าน sticky header/filter แล้วลาก sidebar, เลื่อนแนวนอน, เปิด dropdown/calendar/modal ก่อนและหลัง motion
- resize/หมุนจอ และข้าม breakpoint 768px ระหว่าง motion; กลับจาก drawer แล้วไม่เหลือ width/height/transform หรือการบล็อก refresh
- อ่านบัตรจำลอง/เปิด inspector/keyboard ขณะ motion; รับข้อมูลใหม่โดยไม่หยุด clinical subscriptions หรือทำข้อมูลค้างเพื่อเพิ่มคะแนน performance

### เกณฑ์ตรวจผล

| ด้าน | เกณฑ์ |
|---|---|
| Geometry ของ WebView uniform path | เนื้อหาพอดีกับพื้นที่ข้าง sidebar คลาดเคลื่อนไม่เกิน 1px; scale X/Y ตรงกันตาม tolerance เดิม 0.015; logical width คลาดไม่เกิน 1px; ไม่มี endpoint bounce เกิน 1px |
| จบ animation | ปลายทาง sidebar 80/256px ถูกต้อง ไม่มีจังหวะจัดตาราง/ข้อความซ้ำหลังปล่อย และไม่มี class/style/listener ที่ตรึงหน้าค้าง |
| Interaction | คลิก/แตะใหม่หลัง release เลือกหน้าได้ครั้งเดียว ไม่รอ timeout 1–3 วินาที; hit target ตรงข้อมูลที่เห็น; input/drag/drop/modal ยังถูกต้อง |
| ข้อมูล | ไม่สูญหาย ไม่สลับคนไข้/transaction ไม่มี duplicate/skip pagination จาก motion; ไม่ทำ network fetch หรือ remount ทั้งหน้าเพราะ frame ของ sidebar เพียงอย่างเดียว |
| Scroll/sticky | ไม่มีแถวหาย/ช่องว่าง ตารางไม่โดน clamp ไปต้น/ท้ายผิดจังหวะ; restore semantics ของแต่ละหน้ายังคงเดิมและไม่ไหลต่อหลังผู้ใช้เริ่มเลื่อน |
| เสถียรภาพ | runtime error, ANR, blank surface, overlay ค้าง และการเขียนข้อมูลจริงในการทดสอบ = 0 |
| Performance | วัดก่อน/หลังแยกแต่ละหน้า ภาระ/เครื่อง/WebView/refresh rate/build เดียวกันอย่างน้อย 3 รอบ รายงาน median p95/p99 และ outlier; gate เสนอสำหรับงานนี้คือ p95 ไม่ถดถอยเกิน 10% ซ้ำในอย่างน้อย 2 จาก 3 รอบ หากเกินให้วิเคราะห์ก่อนเปิดกลุ่มถัดไป |

หน้าเดิมที่มีอาการกระตุกต้องมีหลักฐานว่าปัญหาลดลง ไม่ถือว่าขยาย whitelist สำเร็จเท่ากับแก้ความลื่นแล้ว แยกผล rAF, long tasks, HWUI และภาพที่เห็นจริง ไม่ปนเป็นตัวเลข FPS เดียวกัน ตรวจ/บันทึก refresh interval ของเครื่อง ไม่สมมติว่าเป็น 60Hz ทุกเครื่อง

## เครื่องมือเดิมที่หยิบ pattern มาใช้ได้

`android-card-agent/.work/check-webview.cjs` เป็น private harness: อิง Playwright จาก `demoanping/.expo/...`, fixture generator ภายนอกตำแหน่งทดสอบหลัก และ built `asset-manifest.json` จึงต้องทำให้ portable ตามเฟส 1 ก่อนอ้างว่าผู้รับงานรันได้ทันที

| ชุดเดิม | ใช้เป็นต้นแบบตรวจอะไร |
|---|---|
| `ASSERT_SIDEBAR_UNIFORM`, `ASSERT_SIDEBAR_CONTINUOUS`, `ASSERT_STABLE_VIEWPORT` | uniform geometry/ไม่มี release phase รอบสอง/viewport ของเนื้อหายาว; near-bottom ต้องทดสอบ live height แยก |
| `CHECK_AUTOMATIC_FLICK`, `CHECK_AUTOMATIC_PACKET_GAP`, `CHECK_MOUSE_FLICKS`, `CHECK_SIDEBAR_LINEAR`, `CHECK_SIDEBAR_COMPLETION` | automatic/manual, delayed input, reversal, coalesced/no-move, timing/completion |
| `CHECK_SIDEBAR_FAST_NAV`, `CHECK_UNIFORM_LIFECYCLE` | เลือกหน้าทันที, modal/card signal/resize/rapid reversal |
| `ASSERT_PASSIVE_DRAG`, `ASSERT_STABLE_STYLES`, `ASSERT_CALENDAR_STABLE`, `CHECK_TOUCH_SCROLL` | touch listener, ไม่เขียน stylesheet ทุก frame, calendar callback/render และ vertical menu scroll |
| `CHECK_FINANCE_SCROLL`, `ASSERT_FINANCE_ISOLATED`, `CHECK_FINANCE_FETCH` | จำนวน transaction จริง, isolation/overscan/click และ offsets ของ Finance; ต้องเพิ่ม sidebar lifecycle ให้หน้านี้ด้วย |
| `CHECK_PAGE_MORE`, `CHECK_LIST_RETURN` | pagination และกลับตำแหน่งเวชระเบียน; ไม่ใช่หลักฐานว่าโหลดครบ 1,000 แถวแล้ว |

อย่านำ `ASSERT_SIDEBAR_BLOCKS`/`CHECK_BLOCK_LIFECYCLE` มารวมกับเกณฑ์ uniform ปัจจุบัน: เป็น branch เก่าที่ต้องการเนื้อหาคงขนาดและรอ `is-sidebar-content-settling` ซึ่งขัดกับต้นแบบที่ผู้ใช้เลือก

Device scripts เดิมใน `.work/device/measure-sidebar-modes.cjs`, `probe-sidebar19.cjs`, `assert-sidebar19.cjs`, `check-sidebar23.cjs` ใช้เป็นตัวอย่าง ไม่ใช่ dependency ส่งมอบ: ยัง hardcode สามหน้า, ADB `-d`, port 9228, DPR/offset statusbar 53px หรือพิกัดของเครื่องเดิม ต้องเลือก serial/วัดพิกัดใหม่ และแยก trusted Android input ออกจาก synthetic event ในรายงาน

## คำสั่งตรวจพื้นฐานเมื่อเริ่มลงมือจริง

รันจาก workspace root คำสั่งนี้เป็นแนวทาง build ที่มีใน source แล้ว ชุด QA ใหม่ให้บันทึกคำสั่งจริงหลังสร้าง ไม่อ้างชื่อไฟล์ที่ยังไม่มีเป็นเครื่องมือพร้อมใช้

```powershell
git status --short
git diff --check
npm run build
node scripts/build-webview.mjs
```

```powershell
Push-Location -LiteralPath '.\android-card-agent'
try {
  .\gradlew.bat --project-cache-dir .work/gradle :app:assembleRelease -x :app:prepareBundledWeb --console=plain
} finally {
  Pop-Location
}
```

Gradle ข้างบนใช้ bundled web ที่สร้างสำเร็จแล้ว; APK ออกที่ `android-card-agent/.work/app-build/outputs/apk/release/app-release.apk` ตรวจว่ารุ่นส่งมอบไม่ใช่ diagnostic APK ก่อนคัดลอก `public/AnpingClinic.apk` และรัน web build อีกครั้งเพื่อให้ `dist` ได้ไฟล์เดียวกัน ไม่เปลี่ยน release metadata ของ production โดยไม่ได้รับมอบหมาย

## Checklist ส่งต่อ/รับงาน

- [ ] เฟส 0: ยืนยัน source/baseline/ข้อมูลที่แสดงจริงและข้อจำกัด harness
- [ ] เฟส 1: shell eligibility, portable QA และ cleanup ผ่าน
- [ ] เฟส 2: Finance ผ่านและต้นแบบสามหน้าไม่ถดถอย
- [ ] เฟส 3: Dashboard/Catalog/Coupons/Inventory/Reports ผ่านครบ
- [ ] เฟส 4: Staff/Branch/Settings/Profile ผ่านครบ
- [ ] เฟส 5: POS/Display Ads ผ่านครบ
- [ ] เฟส 6: เปิดครบ 15 tab, browser/mobile/public regression และ release เครื่องจริงผ่าน
- [ ] ส่งตารางผลรายหน้า พร้อม build/device/จำนวนข้อมูลจริง/คำสั่งทดสอบ/ข้อจำกัดที่ยังมี
- [ ] ส่ง source diff, วิธีรัน QA, hash/version APK ถ้ามี และรายการงานค้างที่ชัดเจน; ไม่ commit/push แทนผู้ใช้

**คำสั่งเริ่มสำหรับ agent ถัดไป:** อ่านเอกสารนี้กับ `AGENTS.md` ตรวจ workspace ปัจจุบัน แล้วเริ่มเฟส 0 ก่อน อย่าเริ่มจากลบ allowlist สามหน้าอย่างเดียว งานสำเร็จเมื่อพฤติกรรมและผลทดสอบครบทุกหน้า ไม่ใช่เมื่อ boolean เปิดครบเท่านั้น

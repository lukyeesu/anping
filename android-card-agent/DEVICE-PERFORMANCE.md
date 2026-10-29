# ผลตรวจบนแท็บเล็ตจริง

## Finance: เริ่มแก้ตามคำขอเพิ่มเติม 27/10/2026

- ผู้ใช้แจ้งว่าหน้าระบบการเงิน (Finance) กระตุกทั้งหน้าขณะเลื่อนขึ้นและลง ยังไม่ทราบสาเหตุ
- เดิมผู้ใช้ให้พักไว้ก่อน ต่อมาระบุในรอบนี้ให้แก้อาการเลื่อน Finance โดยตรง จึงเริ่มวัดและแก้แล้ว ผลอยู่ในหัวข้อ 1.6.16 ด้านล่าง
- ใช้ผลวัด Finance เอง ไม่ใช้ผลเวชระเบียนแทน และยังต้องตรวจเฟรมช้าบนเครื่องจริงต่อ

สถานะล่าสุด: ผู้ใช้เลือกให้เนื้อหาทั้งก้อน รวมตัวอักษรและกราฟ ย่อ–ขยายตาม sidebar ในสัดส่วนเดียวกันทั้งสองแกน
รุ่น 1.6.13 คง transform ขณะเคลื่อนและ CSS zoom ที่มี geometry เดียวกันเมื่อจบจาก 1.6.12 ลด height reflow ระหว่างลากและตรึงความกว้างข้อความ sidebar
รุ่นล่าสุด 1.6.25 / versionCode 48 จัดกึ่งกลางกรอบเล็งเฉพาะแนวนอน; หัวข้อรุ่นก่อนหน้าเป็นประวัติ

## 1.6.25: กึ่งกลางกรอบแนวนอน

ผู้ใช้ระบุเพิ่มเติมว่าแนวตั้งถูกต้องแล้ว จึงแก้เพียง media query แนวนอน ให้ aim ครอบวิดีโอทั้งหมดและไม่มี padding ที่เลื่อนศูนย์กลาง พร้อมจำกัดความกว้างอย่างสมมาตรไม่ให้กรอบชนแผงปุ่ม
ก่อนแก้ fixture แนวนอน 568×320 มี center offset X=-56px/Y=5.992px หลังแก้ทั้ง 6 ขนาดแนวนอน offset X=0px/Y=0 ถึง -0.0078125px ผ่านการตรวจขอบจอ ข้อความ และปุ่ม
PNG แนวตั้ง 320×568, 390×844, 792×1316 เทียบกับรุ่น 1.6.24 เหมือนกันทุก byte; Back ซ้ำ/Back ระหว่าง OCR หมุนจอ สลับกล้อง ไฟแฟลช error/retry และ OCR จำลองผ่าน รอบนี้วัด layout ผ่าน Chromium fixture
หลักฐาน `.work/review/camera25-before.log`, `camera25-after.log`, `build25.log`, `gradle-release25.log` และภาพ `camera25-*.png`
Release APK 1.6.25 / code 48 ตรวจ bundled asset hashes 19 ไฟล์ ลายเซ็นเดิมและ non-debuggable ผ่าน SHA-256 `bc0c5fde5774eb711351bca6eabb0f0da900c90dd029a29436741ceb0e8a2c0e`

## 1.6.24: กล้องโทรศัพท์เมื่อมีแถบ Chrome

ผู้ใช้ส่งภาพใช้งานจริงที่เห็นแถบสีขาวของหน้ากล้องกินพื้นที่ โดยเฉพาะแนวนอน จึงเปลี่ยนจอเล็กเป็น preview เต็มพื้นที่พร้อมแถวควบคุมโปร่งใสทับภาพ และลดแผงชัตเตอร์แนวนอนจาก 208px เหลือ 112px คงปุ่มสัมผัสอย่างน้อย 44px
เกณฑ์เพิ่มจากเดิมที่ตรวจเพียงไม่ทับกัน: หัวมือถือไม่เกิน 56px/ไม่มีพื้นขาว วิดีโอสูงเต็มพื้นที่หน้าเว็บ และกรอบบัตรแนวนอนสูงอย่างน้อย 55% ของ viewport; fixture ก่อนแก้ไม่ผ่านเกณฑ์หัวมือถือ
หลังแก้ผ่าน 9 ขนาด ทั้ง 320×568, 568×320, 390×844, 792×1316, 1316×792, 844×390 และ viewport สั้นตาม Chrome 853×305, 740×260, 568×240 ตรวจภาพที่เรนเดอร์แล้วทั้งสองแนว โทรศัพท์ใช้แถว overlay 56px แนวตั้ง/48px แนวนอน แท็บเล็ตขนาดใหญ่คงหัวเดิม
Back/ปุ่มซ้ายบนซ้ำ 3 รอบ Back ระหว่าง OCR ทิ้งผลตอบกลับที่ค้าง หมุนจอ สลับกล้อง ไฟแฟลช การปฏิเสธสิทธิ์/ลองใหม่ และ OCR จำลองผ่าน; ESLint component ผ่าน ไม่มี design finding นอก advisory
หลักฐาน `.work/review/camera24-before.log`, `camera24-after.log`, `camera24-lint.log`, `camera24-design.json`, `build24-final.log`, `gradle-release24.log` และภาพ `camera24-*.png` รอบนี้ใช้ fixture จำลองขนาดโทรศัพท์ ไม่ได้อ้างการวัดกล้องหรือเฟรมบนโทรศัพท์จริง
Release APK 1.6.24 / code 47 ตรวจ bundled asset hashes 19 ไฟล์ ลายเซ็นเดิมและ non-debuggable ผ่าน SHA-256 `8da71d3f194a7d2797fd379c8ddb0d58094d45147bbcf30ec8bb3bee379f5c10`

## 1.6.23: Back กล้องและการแตะเมนูหลังย่อขยาย

ก่อนแก้ fixture กด Back แล้วกล้องยังอยู่ ส่วน native callback คืน canGoBack=false ทั้งที่ JavaScript history มีฟอร์มและกล้องซ้อนอยู่ แก้กล้องใช้ useModal และให้ Android ตรวจ modal ใน JavaScript history ก่อน fallback เดิม
Fixture ผ่าน Back และปุ่มซ้ายบนสลับกัน 3 รอบ ฟอร์มยังอยู่ Back ระหว่าง OCR ไม่เติมผลเก่าหลังปิด และ Back ครั้งถัดไปปิดฟอร์มโดยไม่ติด history กล้องเกิน
เครื่องจริงใช้ Android KEYCODE_BACK ปิดกล้อง 1920×1080 กลับฟอร์มและ tracks เป็น ended ครบ จากนั้น Back อีกครั้งปิดฟอร์มทดสอบได้ ไม่มี OCR upload หรือบันทึกคนไข้

โทรศัพท์ตรวจ 320×568, 390×844, 568×320, 844×390 และแท็บเล็ต 792×1316, 1316×792 พบจอเล็กแนวตั้งข้อความชน control bar จึงเพิ่มระยะกรอบ/ข้อความ ย้ายไฟแฟลชขึ้น header และย่อ controls เฉพาะแนวนอนที่เตี้ยกว่า 380px ตรวจภาพที่เรนเดอร์และ geometry ผ่านครบ

Sidebar ก่อนแก้ touch manual ทันทีหลังลากถูกตัวกันคลิกกิน หลังปลดบล็อกใหม่ยังพบ touch automatic ไม่มี compatibility click จาก WebView จึงรับ clean touchend ของเมนูโดยตรงและกัน gesture ลากจากระยะจริง
หลังแก้ fixture ทั้ง WebView styling และ browser styling ผ่าน mouse/touch × manual/automatic รวม regression สะบัดอัตโนมัติ ลากช้า และลากค้าง เครื่องจริงผ่าน 4 กรณีเลือกหน้าทันทีเช่นกัน ไม่เปลี่ยนหน้าเพราะ gesture ลากเอง
หลักฐาน `.work/review/camera23-before.log`, `camera23-layout-before.log`, `camera23-final.log`, `camera23-native.log`, `sidebar23-before.log`, `sidebar23-probe.log`, `sidebar23-final.log`, `sidebar23-browser.log`, `sidebar23-native.log`
Release APK 1.6.23 / code 46 ตรวจ bundled asset hashes 19 ไฟล์ ลายเซ็นเดิมและ non-debuggable ผ่าน SHA-256 `a8e9a7ed01ae030f0b571b5f609dd531014069d08b425276a088b2c743416e55`

## 1.6.22: หน้ากล้องสแกนบัตร

หัวหน้าสีขาว ภาพกล้องเต็มพื้นที่พร้อมกรอบบัตรมุมสีขาวและพื้นรอบกรอบมืด ปุ่มถ่ายวงกลมสีฟ้าอยู่ด้านล่างในแนวตั้งและด้านขวาในแนวนอน
Fixture ตรวจ phone 390×844, tablet portrait 792×1316, tablet landscape 1316×792 และ phone landscape 844×390: กรอบและปุ่มอยู่ในจอ ข้อความไม่ชนปุ่ม และหมุนจอไม่ขอ stream ใหม่
ผ่านการสลับกล้องครั้งเดียวต่อกด ไฟแฟลช keyboard focus/Escape การคืน tracks ปฏิเสธสิทธิ์/ลองใหม่ และ capture/OCR ด้วยข้อมูลจำลอง ไม่บันทึกข้อมูลคนไข้
แท็บเล็ตจริงเปิดกล้องได้ 1920×1080 หัวสีขาว กรอบและปุ่มอยู่ในจอ ปิดกล้องแล้วฟอร์มยังเปิดและ tracks เป็น ended ครบ จากนั้นยกเลิกฟอร์มทดสอบ ไม่ส่งภาพจริงไป OCR
ESLint เฉพาะ component ผ่านไม่มี error/warning; mechanical design detector ไม่มี finding นอก advisory และตรวจภาพที่เรนเดอร์แล้วทั้งแนวตั้ง/แนวนอน
หลักฐาน `.work/review/camera22-test.log`, `camera22-native.log`, `camera22-lint.log`, `camera22-design.json` และภาพ `camera22-*.png`
Release APK 1.6.22 / code 45 ตรวจ bundled asset hashes 19 ไฟล์ ลายเซ็นเดิมและ non-debuggable ผ่าน SHA-256 `12c769192eedfbebe35b82656ec026d7d7d24461eae6b44b5c8f3e0a072ce178`

## 1.6.21: คืนรายการเดิมและแก้ infinite scroll หยุดโหลด

ก่อนแก้ fixture พบสถิติ total=0 ทำให้รายชื่อหยุดที่ 35 รายการ และสลับกลับหน้าเวชระเบียนแล้วแคชถูกตัดจาก 70 เหลือ 35 รายการ ตำแหน่งเลื่อนจาก 1100 เหลือ 118px
หลังแก้แยก query IDs/cursor จากแคชคนไข้กลาง ใช้ผลหน้าข้อมูลแทนสถิติกำหนด hasMore และ re-arm IntersectionObserver หลังปลดล็อกคำขอ ไม่ตีความแคชออฟไลน์ว่าโหลดครบเซิร์ฟเวอร์
Fixture ผ่าน: สถิติศูนย์ยังโหลด 35→70, ลองใหม่ที่ offset 35 เดิมหลังโหลดล้มเหลว, หน้าซ้ำยังเรียก offset 70 ต่อ, คำค้นเก่าไม่ทับผลใหม่, เปลี่ยนคำค้น/เรียงกลับบนสุด และโหลดจนหมดจริง
เก็บข้อมูลมุมมองในหน่วยความจำของ session เท่านั้น พร้อม cache ขนาดแถวและ anchor ที่มองเห็น; การคืนตำแหน่งมีขอบเขตและยกเลิกทันทีเมื่อผู้ใช้แตะ/เลื่อนเอง
แท็บเล็ตจริงทดสอบอ่านรายการโดยไม่บันทึกข้อมูลคนไข้: pagination โตขึ้นจนถึงท้ายเซิร์ฟเวอร์ และสลับนัดหมาย→เวชระเบียนกลับคนไข้เดิม คลาดเคลื่อนตำแหน่ง 0px ไม่ไหลต่อใน 500ms
ทดสอบ sticky ด้วยการปัดช้า/เร็ว/สั้นขึ้นลง 8 ท่า รวม 829 samples: missed dock 0 และรอยต่อ -0.9958px
หลักฐาน `.work/review/page-after21.log`, `retry21.log`, `duplicate21.log`, `query21.log`, `return21-final.log`, `page21-browser.log`, `native-list21.log`, `native-sticky21.log`
Release APK 1.6.21 / code 44 ตรวจ bundled asset hashes 19 ไฟล์ ลายเซ็นเดิมและ non-debuggable ผ่าน SHA-256 `2d594dcad52931f7b509a477eb7e79fdeb9920004831b57119d029ad30425102`

## 1.6.20: header ไม่ครอบ filter เมื่อ dock

ผู้ใช้ไม่ต้องการให้ header ครอบหรือพา filter เคลื่อนตามขณะชน จึงลบ Web Animation ที่แปลตำแหน่ง filter ทั้งกลุ่ม และใช้ `has-docked-filter` ให้ header เข้าท่า compact ก่อน filter ขยาย โดยคง linear 120ms ของ header เมื่อยังไม่ dock กับ linear 200ms ของ filter
ก่อนแก้ fixture พบ filter เคลื่อนจาก 125.59px ลงไป 64px พร้อม header หลังแก้ทั้ง 10 frame อยู่ที่ 64px และไม่มี vertical follow animation
ชุด fast crossing 50 จังหวะ / CPU throttling 4 เท่า, single surface, ขอบ filter, header surface และ linear reversal ก่อนชน ผ่าน ครอบคลุมการเข้าหน้า/กลับขึ้นบนและขอบในเวชระเบียน นัดหมาย และการเงิน
หลักฐาน `.work/review/stationary-before20.log`, `stationary-after20.log`, `header20.log`
เพิ่ม regression กรณี header เริ่ม animation แล้วก่อน filter ชน: การเปลี่ยน duration อย่างเดียวไม่หยุด transition เดิม จึงสั่ง finish เฉพาะ CSS transitions ของ header เมื่อ dock
เครื่องจริง source สุดท้ายผ่าน 8 trusted scroll gestures / 548 samples: missed dock 0 และรอยต่อคงที่ -0.9958px; header surface assertions ผ่าน ทั้ง linear 120ms ก่อนชนและ compact pose เมื่อชน
หลักฐาน `.work/review/stationary-final20.log`, `native-sticky20-before-finish.log`, `native-header20-final.log`, `native-sticky20-final.log` และ `.work/device/sticky-burst-final20.json`
Release APK 1.6.20 / code 43 ตรวจ bundled asset hashes 19 ไฟล์ ลายเซ็นเดิมและ non-debuggable ผ่าน SHA-256 `cd753cb08a98bee07a327a0dcfe5d20b5a33680d0d6820e8e1e2a72f830efc61`
ส่งมอบ: เว็บ/Android build ผ่าน ติดตั้ง release ปกติทับบนแท็บเล็ต เปิดหน้าคลินิกได้ ไม่มี diagnostic forward 9228; APK ใน `public` กับ `dist` ตรงกัน ไม่ได้ deploy production

## 1.6.19: จบ animation ที่ปลายทางจริงและคืน pull-to-refresh

ผู้ใช้รายงานว่าดึง refresh ไม่ได้, filter ยังเว้นขอบระหว่างขยาย และสะบัด sidebar เห็นหลายจังหวะ
ข้อจำกัดเริ่มดึงเฉพาะแถบ 96dp ของ 1.6.18 ไม่ตรงกับการใช้งาน จึงยกเลิกข้อจำกัดนี้ แต่ยังกันการเปลี่ยนท่าปัดขึ้น/แนวนอนเป็น refresh กลางทาง

### หลักฐาน sidebar บน SM-X520

เก็บ trusted Android input สะบัด 6 ครั้งก่อนแก้ พบ timer จบงานขณะ sidebar ยังอยู่ที่ 222.32/237.40px แทน 256px และ 98.49–98.71px แทน 80px โดย CSS width animation ยังเดินอยู่
เนื้อหาใช้ transform ที่อัปเดตตาม ResizeObserver จึงคลาดจาก sidebar สูงสุด 29.98px ใน rAF snapshots ชุดเดียวกัน
หลังใช้ keyframes/timing/startTime ร่วมกับ width transition และรอ animations เสร็จจริง จุดจบทั้ง 6 ครั้งครบ 256/80px ความคลาดสูงสุด 0.4285px จำนวน style mutations บน main ลดจาก 30–36 เหลือ 13 ต่อ gesture
ชุดตรวจ endpoint และ per-frame alignment ไม่ผ่านก่อนแก้และผ่านหลังแก้ ข้อมูลนี้เป็น geometry/style measurements; ไม่ใช่การรับรอง FPS หรือว่าไม่มีเฟรมช้า

ทดสอบซ้ำ 48 gestures ครบเวชระเบียน/นัดหมาย/บอร์ดผู้บริหาร: hold/slow/fast/flick เปิด–ปิดอย่างละ 4 ครั้ง ผ่านโหมดและปลายทาง ยังมี HWUI jank บางช่วง
หลักฐาน `.work/device/sidebar-phases-before19.json`, `sidebar-phases-after19.json`, `assert-sidebar19.cjs` และ `.work/device/sidebar-source19-final/report.json`

### Refresh และขอบ filter

ก่อนแก้ deliberate pull จากเนื้อหาถูกบล็อก หลังแก้ทดสอบ 7 ท่าบนเครื่องจริงโดยไม่บังคับค่า native scroll: ปัดเนื้อหาขึ้นปกติ/ช้า/เร็วและปัดขึ้นจาก header เลื่อนได้ ดึงจากเนื้อหาและ header บนสุดส่งให้ refresh ส่วนดึงเมื่อหน้าเลื่อนค้างไม่เรียก refresh
ทดสอบดึงยาวจริงจากเนื้อหา พบ main-frame navigation 1 ครั้ง, performance.timeOrigin เปลี่ยน และหน้าคลินิกกลับมาพร้อมใช้งาน (`reload-after19.log`)
Fixture เพิ่มเติมยืนยันว่า scroll ของ panel อื่นไม่บล็อกหน้าหลัก, touchstart แก้ native state ที่ค้าง และ modal ที่ยังไม่ได้เลื่อนบล็อก refresh (`pull-sync19.log`)

เพิ่มพื้นหลังเต็มขอบด้านหลัง filter ที่ dock เพื่อไม่ให้เห็นเนื้อหาผ่านซ้าย–ขวาขณะกล่องด้านในยังขยายไม่สุด Fixture ตรวจระหว่าง animation ไม่ผ่านก่อนแก้และผ่านหลังแก้ คงมุมมนล่าง 24px
ตรวจ automatic flick, packet delay, กลับทิศเมาส์ 13 กรณี, continuous scroll, header surface, uniform scale, overlay และ resize ผ่าน โดยใช้ข้อมูลจำลองและบล็อกการเขียน API ใน fixture
หลักฐาน `.work/review/automatic19.log`, `edges-before19.log`, `edges-after19.log`, `sticky19-browser.log`, `coalesced19.log`, `pull-after19.log`, `reload-after19.log` และ `native19-matrix.log`

### แก้เพิ่มเติม: filter ซ้อนสองชั้นและปัดข้ามแล้วไม่ขยาย

ผู้ใช้เห็นพื้นหลังเต็มขอบกับ card เดิมเคลื่อนไหวซ้อนกัน จึงให้ card ด้านในโปร่งใส/ไม่มีกรอบหรือเงาเมื่อ dock แล้วขยับพื้นหลังกับ controls ทั้งกลุ่มตาม startTime ของ header surface
เพิ่ม clip-path ที่ header ตามความสูงพื้นหลังเพื่อไม่ให้คำอธิบายล้นมาปรากฏบน filter ระหว่างย่อ
ก่อนแก้เมื่อจำลองส่ง sticky observer ช้า 200ms แล้วปัดลง 340px พบทั้ง header/filter ยังไม่เปลี่ยนสถานะที่ 60ms; surface test ยังพบ card ทึบพร้อมเงาและกรอบอีกชั้น
รุ่นสุดท้ายเปลี่ยน sticky ทั้งคู่มาเทียบ scrollTop กับ threshold ที่ cache ไว้ในรอบเดียว อ่าน geometry เฉพาะตอน layout เปลี่ยน และใช้ hysteresis เดิมของ header กับ hysteresis 2px ของ filter ไม่อ่าน layout ทุก scroll และไม่ใช้ deferred observer เป็นผู้ตัดสินสถานะอีก

หลังแก้ผ่าน 50 fast crossings ภายใต้ CPU throttling 4 เท่า ไม่มี state ผิดหรือแยกรอยต่อ และ single-surface test ผ่าน
เครื่องจริงปัดช้า/เร็ว/สะบัดขึ้น–ลง 8 ท่า เก็บ 379 rAF samples: missed dock 0, gap -0.9958 ถึง -0.9913px
ตรวจ sidebar alignment ซ้ำบน source สุดท้ายยังผ่าน max mismatch 0.4285px และ 13 main style mutations ต่อ gesture
หลักฐาน `.work/review/ownership-before-final19.log`, `surface-before-final19.log`, `fast-final19.log`, `sticky-controls-final19.log`, `sticky-owner-final19.log`, `sticky-geometry-final19.log`, `native-sticky-final19.log` และ `.work/review/native-sticky-final19.log`
`coalesced19.log` เป็นผลก่อนเปลี่ยน sticky ownership ไม่ใช่ผลของ sticky สุดท้าย; ชุดใหม่ตรวจการไม่ขึ้นกับ deferred observer แทนการบังคับให้เกิด callback หลายรายการ

Release 1.6.19 / code 42: bundled asset hash 19 ไฟล์ ลายเซ็นเดิมและ non-debuggable ผ่าน SHA-256 `1c896e3de1643523f1f1835cb0aba0462eeaad6ae6ed73ed8eb79771a31fb7bd`
ผลส่งมอบ source สุดท้าย: เว็บ/Android build ผ่าน ติดตั้ง release ปกติทับบน SM-X520 แล้ว ตรวจ process และหน้าคลินิกพร้อมใช้ ไม่มี diagnostic forward 9228 และ APK ใน `public`/`dist` มี hash ตรงกัน ไม่ได้ deploy production หรือเปลี่ยน `clinic-version.json`

## 1.6.18: ขอบ sticky, filter ระหว่างปัดยาว และ pull-to-refresh

ช่องว่างเดิมเกิดจากกรอบโปร่งใส 1px ที่เว้นรอบพื้นหลัง header ตรวจ regression ก่อนแก้ไม่ผ่าน และหลังแก้ผ่านในเบราว์เซอร์กว้าง 1910px กับ WebView fixture กว้าง 1316px ครบเวชระเบียน/นัดหมาย/การเงิน
พบเพิ่มว่าหน้านัดหมายมี filter เริ่มอยู่นอกจอและไม่ผ่าน threshold แบบเดิม จึงใช้ marker บางกับขอบเขต observer ที่ครอบคลุมตำแหน่งนอกจอ โดยไม่ reset observer ทุกครั้งที่ตารางเปลี่ยนความสูง

เครื่องจริง SM-X520 ทดสอบปัดเวชระเบียนต่อเนื่อง 6 ท่า ทั้งช้าและสะบัดเร็ว: 244 samples, scroll สูงสุด 5233px, ไม่พบ filter หดกลับหรือหลุด dock ในตัวทดสอบนี้
ก่อนแก้รอยต่อมีช่องว่างประมาณ 0.0042 CSS px หลังให้ filter ซ้อน header 1px วัดได้ประมาณ -0.996px และ regression ผ่าน หลักฐาน `.work/review/native18-filter-final.log` กับ `.work/device/filter-fling-native18-final.json`

Pull-to-refresh เดิมสามารถยึด gesture ที่เริ่มกลางเนื้อหาเมื่ออยู่บนสุดได้ ทดสอบก่อนแก้โดยตั้ง native scroll state ให้ตรงกับหน้าอยู่บนสุดแล้วพบ trusted touchcancel
หลังแก้ ทดสอบบนเครื่องจริงผ่าน 7 กรณี: ปัดเนื้อหาขึ้นปกติ/เร็ว/ช้า, ลากเนื้อหาลงที่บนสุด, ปัดขึ้นจาก header, ลากลงจาก header เมื่อเลื่อนค้างอยู่ และดึงลงจาก header บนสุด กรณีสุดท้ายยังส่งท่าให้ refresh ตามเดิม การลากทดสอบไม่ไกลถึงจุดสั่ง reload
การทดสอบนี้ยืนยันการแบ่งเจ้าของ gesture; ไม่ได้ยืนยันว่าทุกอาการที่ผู้ใช้พบมีสาเหตุเดียวกัน และยังต้องสังเกตการใช้งานจริงหลังอัปเดต

ตรวจ sidebar เวชระเบียนซ้ำ 8 gestures: hold/slow/fast/flick เปิด–ปิด ผ่านการเลือกโหมดและจุดจบ 80/256px ยังพบ HWUI jank บางช่วง จึงไม่รับรองว่าไม่มีเฟรมช้า
Header surface บนเครื่องจริงผ่าน; fixture coalesced observer, scroll ต่อเนื่อง, uniform scale, virtual rows, overlay และ resize ผ่านแยกชุด
แก้ harness ที่เคยเทียบขนาด overlay กับ 1280px ตายตัวให้เทียบ viewport ที่ตั้งจริง 1316px และแยกชุดจำลอง observer ช้า 100ms ออกจากชุดตรวจ surface ทุก 50ms

หลักฐานส่วนตัว: `.work/review/gaps18-browser-final.log`, `sticky18-lifecycle.log`, `sticky18-coalesced.log`, `pull-before18.log`, `pull-final18.log`, `native18-header-final.log`, `native18-sidebar-final.log`
APK release 1.6.18 / code 41 ตรวจ bundled assets 19 ไฟล์ ลายเซ็นเดิมและ non-debuggable ผ่าน: SHA-256 `3b8d0e6b4576b34ba04b7cc0a5f56fe767beaee8463fd6e6079c5c5d3fce6cfe`
ติดตั้ง release ปกติทับบนแท็บเล็ตแล้ว ตรวจ process ทำงานและไม่มี diagnostic forward 9228; ไฟล์ APK ใน `public` และ `dist` มี hash ตรงกัน เว็บ production และ `clinic-version.json` ยังไม่ได้เปลี่ยนในรอบนี้

## 1.6.17: automatic short swipe

ผลตรวจ release สุดท้าย 27/10/2026: เว็บและ Android build ผ่าน ตรวจ integrity ของ bundled assets 19 ไฟล์ ลายเซ็นเดิม และ non-debuggable ผ่าน
ติดตั้ง release ปกติ 1.6.17 / code 40 ทับบน SM-X520 แล้ว เปิดหน้าคลินิกได้ และไม่มี diagnostic forward 9228
SHA-256 ของ APK ใน `public` และ `dist` ตรงกัน: `d03553127d4aea40813b5759e8414ae535b7f7c5030c3190d3cb932038ae2f95`

รอบยืนยันเฉพาะ gesture ใน `automatic17-confirm.log` ผ่านทั้ง packet gap, touch/mouse สองทิศ, ไม่ restart เมื่อปล่อย, ค้างจนจบ, ลากช้า และเมาส์ 13 กรณี ไม่มี runtime error หรือเขียนข้อมูลจริง
ชุด lifecycle แยกใน `automatic17-lifecycle.log` ผ่าน ส่วนรันรวม `automatic17-final.log` หยุดที่ assertion ซึ่งคาดว่าจะยังมี animation หลังรอ 35ms แต่ snapshot ได้ปลายทาง 80px และไม่มี animation จึงไม่นับรันรวมนั้นว่าผ่าน ไม่ใช้ผลนี้รับรอง frame time; รอบยืนยันแยกและการทดสอบ gesture 48 ครั้งบนเครื่องจริงเป็นหลักฐานการทำงานของรุ่นนี้

ผู้ใช้ยังเห็นสะดุดตอนปัดสั้นเร็ว และขอลองให้ animation วิ่งเอง ปัญหาที่เปลี่ยนรอบนี้คือการตามพิกัดขณะนิ้วเคลื่อนกับการส่งต่อเข้า animation ไม่ได้เปลี่ยนเครื่องมือจัดวางหรืออ้างว่า linear ทำให้ FPS สูงขึ้นเอง

- จับทิศแนวนอนเกิน 8px ภายใน 160ms แรก เมื่อเร็วกว่า 0.22px/ms ให้เริ่ม linear 260ms ทันที แล้วหยุดเขียน width ตามแต่ละ input sample
- ยกนิ้วแล้วไม่สั่ง animation เดิมซ้ำ; หากกลับทิศจริงยังสั่งเปลี่ยนปลายทางจากตำแหน่งภาพปัจจุบันได้ กดค้างก่อนลาก/ลากช้ายังคง manual
- ใช้ event.timeStamp ทั้งการเลือกโหมดและตัวอย่างความเร็ว เพราะเวลาที่ handler ได้ทำงานอาจห่างจากเวลาที่ผู้ใช้ปัดจริง
- มี gesture-active ref ป้องกันคืน native refresh ก่อนยกนิ้วเมื่อ animation จบก่อน และป้องกัน timer ของท่าปัดเก่าล้างสถานะท่าปัดใหม่

### Regression และผลตรวจ

ก่อนแก้ `automatic-before17.log` ปัดเร็วแล้ว width หยุดที่ 98px, manual=true, ไม่มี width animation ระหว่าง pointer ยังลง หลังแก้ไม่มี input เพิ่ม 70ms แต่ width ยังเคลื่อนด้วย CSS transition เดิม และตอนปล่อยไม่ restart
`packet-gap-before17.log` ใช้ native CDP timestamp ปัดจริงห่าง 15ms แต่ส่งถึง handler ห่างประมาณ 126ms แล้วเลือก manual ผิด หลังใช้ timestamp ของ event ผ่านกรณีนี้
ผ่าน touch/mouse ทั้งเปิดและปิด, automatic จบขณะยังแตะค้างแล้วปล่อยไม่เริ่มใหม่, คืน refresh ถูกจังหวะ, 13 กรณีเมาส์รวมกลับทิศกลาง automatic, กรณีพิกัดยกนิ้วชดเชยของ Android และการลากช้า/กดค้าง

เครื่องจริง SM-X520: `.work/device/sidebar-source17-automatic/report.json` มี 48 gestures ครบเวชระเบียน/นัดหมาย/บอร์ดผู้บริหาร และ hold/slow/fast/flick อย่างละเปิด–ปิด 4 ครั้ง
ทุก flick มี automatic=true และ manual=false; hold/slow มี manual=true; ทุกครั้งจบ 80/256px และไม่ค้าง motion flags ตรวจ asset path ของ WebView ตรงกับ bundle ล่าสุดก่อนทดสอบ
ยังมี HWUI frames เกินกำหนดบางช่วง จึงไม่สรุปว่าภาพแสดงจริงไม่มีเฟรมตก เป้าของรุ่นนี้คือให้การวิ่งต่อเนื่องไม่ขึ้นกับจำนวน touchmove ที่มาถึง

ปรับ harness ให้อ่าน geometry ของ sidebar/main/เนื้อหา/icon ใน snapshot เฟรมเดียวหลัง ResizeObserver เนื่องจาก automatic ยังวิ่งต่อระหว่างคำสั่งวัด ไม่ใช้ค่าคนละเวลามาเทียบกัน
ตรวจ near-bottom height ตาม scale ปัจจุบันแทนสมมติว่าต้องอยู่กลาง animation เสมอ ชุด uniform/release, live sizing ใกล้ท้าย, อ่านบัตรจำลอง, overlay, resize และกลับทิศผ่านใน `automatic17-lifecycle.log`

หลักฐานส่วนตัว: `.work/review/automatic-after17.log`, `packet-gap-before17.log`, `automatic17-lifecycle.log`, `native-sidebar17.log` และ `.work/device/sidebar-source17-automatic/report.json`

## 1.6.16: queue ของ sticky, เมาส์ PC และ Finance (ประวัติรุ่นก่อน)

### Header/filter

พื้นหลัง header ใน 1.6.15 เป็น opacity 0 ทุกครั้งที่คืนขนาดใหญ่ ยืนยันได้ทั้ง PC และแท็บเล็ตที่ scrollTop≈25 จึงเห็นแถวข้อมูลลอดระหว่างเลื่อนกลับขึ้น
แยก `has-header-background` จาก `is-header-collapsed`: โปร่งใสเมื่อ marker 50px กลับเข้า viewport ครบทั้งชิ้น และขาวทึบเมื่อเริ่มเลื่อน คงพื้นหลังไว้ระหว่างคืนขนาด เปลี่ยน header เป็น linear 120ms และคง filter linear 200ms
Filter ที่จอดมีมุมบน 0px และมุมล่าง 24px ตามข้อแก้ไขล่าสุด ไม่ใช้มุมบนโค้งหรือพื้นหลังโปร่งใสจนเห็นข้อมูลด้านหลัง

พบช่องโหว่ที่จำลองภาพซ้อนได้: observer callback เดิมอ่าน `[entry]` ทิ้งรายการถัดไป เมื่อรวมสถานะกลับขึ้น/ลงสองครั้งใน delivery เดียว header ค้างขยายที่ scrollTop 340, พื้นหลังสูง 127.59px แต่ filter จอด y=64
แก้ให้วนทุก entry ทั้ง header/filter ผล regression ก่อนแก้ไม่ผ่าน หลังแก้ผ่าน การรวมหลาย entry สอดคล้องกับ [เอกสาร IntersectionObserver ของ MDN](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API#intersection_change_callbacks)
คำนวณสถานะครบทั้งชุดก่อนอัปเดต DOM ครั้งเดียวด้วย เพราะการสั่งขยายแล้วสั่งย่อกลับใน callback เดียวทำให้ header ไม่ได้เคลื่อนจริงแต่ filter เริ่ม animation แยก พบใน regression ว่า filter เด้งไป y≈74.6 ทั้งที่ header จบ y=64; หลังรวมการอัปเดตภาพไม่พบการเด้งนี้ในชุดทดสอบ
ชุดทดสอบจำลองหน่วง delivery 100ms เพื่อรวม entry จริงจาก browser ไม่ได้เพิ่ม delay นี้ในโค้ดแอป และไม่ได้ยืนยันจากภาพอย่างเดียวว่าเหตุการณ์ของผู้ใช้ทุกครั้งมีสาเหตุนี้

### Sidebar และเมาส์

Sidebar/ข้อความเปลี่ยนจาก cubic-bezier เป็น linear 260ms; ขณะจับลากยังเป็น transition:none เพื่อให้ติดนิ้ว
เดิมใช้ระยะรวมจาก mousedown และเกณฑ์ 20px ร่วมกับความกว้างเก่า ทำให้สะบัดสั้น/กดค้าง/กลับทิศถูกตัดสินกลับด้าน อีกทั้ง mouseup อาจมีพิกัดใหม่ที่ยังไม่เข้า mousemove หรือ rAF
แก้การตัดสินจากช่วงท้าย 100ms ให้ทิศสะบัดมีผลก่อนเกณฑ์ความกว้าง แยกช่วงหยุดนิ่งและเริ่มนับทิศใหม่เมื่อกลับทาง ใช้ตำแหน่งปล่อยจริงและความกว้างเริ่มจับจริง
Trusted CDP mouse ผ่าน 11 กรณี: short expand/collapse, hold แล้ว expand/collapse, reverse ซ้าย/ขวา, slow short drag ที่ต้องคงย่อ, down/up โดยไม่มี move ทั้งสองทิศ และพิกัดก่อนปล่อยสั่นกลับ 1px ทั้งสองทิศ
Regression ก่อนแก้ short expand 18px จบที่ 80px ผิดทิศ หลังแก้ทุกกรณีจบถูกด้าน

บนเครื่องจริงยังพบกรณีคำสั่งสะบัด 40ms จบผิดด้าน จับ event ได้ว่าลากย่อเริ่ม x249.71 → 190.31 → 64.71 แต่ touchend กลับ x73.71 โค้ดจึงคิดว่าท้ายสุดสะบัดขวา 9px
แก้ให้การปล่อย touch ที่มี move แล้วไม่เปลี่ยนทิศความเร็วด้วยการชดเชยปลายนี้ ส่วนตำแหน่งปล่อยยังใช้คำนวณความกว้างและรองรับ touch ไม่มี move ได้ตามเดิม
Replay พิกัดที่จับได้ผ่านทั้งขยาย/ย่อ และสะบัดจริงซ้ำ 20 ครั้งจบที่ 80/256px ถูกด้านทั้งหมด คำสั่ง ADB 40ms ให้ช่วง touchstart→touchend ที่จับได้ประมาณ 49–124ms จึงไม่เรียกว่าเวลาสัมผัสจริง 40ms ทุกครั้ง

### Finance

เพิ่ม fixture ของ view `finance_all_transactions` รวม POS/รายรับ/รายจ่ายจำลอง 111 แถว ชุด smoke เดิมเปิด Finance ได้แต่ไม่มีข้อมูล view นี้ จึงไม่ใช้ผลเปิดหน้าเก่าเป็นหลักฐานประสิทธิภาพ Finance
จากนั้นฉีดข้อมูลจำลองที่ผ่าน normalization เข้า state ของ Finance จริงครบ 1,000 แถว เพื่อวัดรายการยาว

| ตรวจระหว่างสะบัด wheel 8 จังหวะ, CPU 4x | ก่อนแก้ | หลังแยกรายการ |
| --- | ---: | ---: |
| FinancePage render | 13 | 0 |
| transaction key callback เปลี่ยน | 13 | 0 |
| แถวที่ mount หลังเลื่อนหยุด | — | 18 |
| แถวแรกที่ render ที่ scrollTop 2,000 | — | y=-545px |

ย้าย virtualizer ไป FinanceVirtualList, memo แถวโดยคง transaction identity, ใช้ estimate จากขนาดจริงและ scrollMargin แทนให้ virtualizer คิดว่ารายการเริ่มบนสุดของ main
หยุดการอ่าน offsetHeight/scrollHeight/clientHeight ทุก scroll ในเส้นทาง sticky ใหม่ ใช้ sentinel rootMargin 100px โหลดหน้าถัดไป มี guard หน้าซ้ำ และรอการเข้าขอบรอบใหม่หรือจำนวนรายการเพิ่มก่อนโหลดซ้ำ เพื่อไม่วนยิงเมื่อ offline แล้วตำแหน่ง sentinel ไม่เปลี่ยน
สูตรคำนวณเงิน renderers เดิม ปุ่มพิมพ์/แก้ไข/ลบ สิทธิ์และเส้นทางบันทึกยังใช้โค้ดเดิม

rAF p95 ในชุดก่อน/หลังประมาณ 133/50ms, max 183/83ms ภายใต้ CPU 4x แต่ภาระ host มีความแปรปรวน จึงไม่อ้างเป็นเปอร์เซ็นต์ FPS ที่ดีขึ้น สิ่งที่ยืนยันได้คือไม่มี render ทั้งหน้าระหว่างเลื่อน ไม่มี key เปลี่ยน และมีแถวสำรองด้านบน
กดเปิดหลังสะบัดได้ transaction ตรงกับแถวที่เลือก ใช้เวลารวม automation ประมาณ 444ms ในชุด CPU 4x ไม่ใช่ค่าหน่วงที่รับรองบนเครื่องจริงทุกครั้ง

ไฟล์หลักฐานส่วนตัว: `.work/review/finance-before16.log`, `finance-after16.log`, `mouse-flick-before16.log`, `mouse-flick-after16.log`, `coalesced-before16.log`, `coalesced-after16.log`

### ผลตรวจสุดท้ายบน PC และเครื่องจริง

- PC ทดสอบด้วย Playwright/CDP ทั้ง bundle และ source จาก Vite dev server ใน browser แยกที่ mock API ไม่มี production writes ตรวจ wheel ลง/ขึ้นจากกลางและท้ายรายการครบ 9 หน้ามาตรฐาน รวม Finance ที่มี view fixture จริง; สถานะ header/filter, ระยะชิดซ้าย–ขวา, มุมบน 0px และมุมล่าง 24px ผ่าน
- Finance โหลดเพิ่มครบ 30 → 60 → 90 → 111 แถวด้วย offset 0/30/60/90 อย่างละครั้ง ไม่ยิงหน้าซ้ำหรือข้ามหน้าในชุดทดสอบ
- ชุด fixture sidebar 3 หน้า, uniform scale, viewport คงตัวระหว่างลาก, passive touch, near-bottom sizing, rapid reversal, calendar, อ่านบัตรจำลอง, เพิ่ม OPD และ modal เปิดใหม่ปิดครั้งเดียว ผ่าน
- SM-X520 ทดสอบ slow touch 1,600ms ขึ้น/ลงทั้งเมนูเปิด/ปิด 4 ครั้ง พื้นหลังปิดข้อมูลขณะเลื่อนและ title อยู่ในพื้นที่ header ตลอดตัวอย่าง
- Sidebar เครื่องจริง 48 gestures = 3 หน้า × hold/slow/fast/flick × เปิด/ปิด 4 ครั้ง จบที่ 80/256px ถูกด้าน มี trusted touch และไม่เหลือ motion flags
- สะบัดสั้น header/filter จริงอีก 48 ครั้ง ตรวจทั้งสองทิศและเมนูทั้งสองขนาด ผ่านการตรวจสถานะหลังหยุดเลื่อนและไม่มี touchcancel
- Finance เครื่องจริง 16 swipes: คำสั่ง 40ms และ 120ms อย่างละ 8 ครั้ง จบที่ header/filter ถูกสถานะ ไม่ซ้อนทับ และไม่พบ long task ≥50ms ในช่วงที่เก็บตัวอย่าง แต่ rAF p95 ยังประมาณ 66/33ms และ max≈122ms ส่วน HWUI p95≈17/18ms ค่าทั้งสองไม่ใช่หลักฐานว่า WebView แสดงภาพได้กี่ FPS และยังไม่รับรองว่าภาพจะไม่มีเฟรมตกทุกจังหวะ

| HWUI p95 (ms), ชุด sidebar ล่าสุด | hold | slow | fast | flick |
| --- | ---: | ---: | ---: | ---: |
| เวชระเบียน | 44 | 18 | 46 | 46 |
| นัดหมาย | 18 | 17 | 26 | 29 |
| บอร์ดผู้บริหาร | 34 | 31 | 38 | 44 |

ไฟล์เครื่องจริง: `.work/device/sidebar-source16-complete/report.json`, `finance-source16-final/report.json`, `tiny-source16-final/report.json`, `slow-header16-report.json` และ `header-surface-final16-complete.json` เป็นข้อมูลตรวจส่วนตัว ไม่เผยแพร่สื่อที่มีข้อมูลคนไข้

### ส่ง APK 1.6.16

`public/AnpingClinic.apk`, versionCode 39, SHA-256 `5b653bac9042a21a39c6d7f15569a6bf7ad50ca8fed4a024a5d895ebba84e173`
ตรวจ asset hashes 19 ไฟล์ ลายเซ็นเดิม และไม่มี DEBUGGABLE ติดตั้ง `-r --no-incremental` ทับบนแท็บเล็ตสำเร็จ ตรวจ installed version/code และนำ forward tcp:9228 ออกแล้ว โดยไม่ถอนแอปหรือล้างข้อมูล
`dist/AnpingClinic.apk` hash ตรงกับ public; `npm run build` และ Gradle release ผ่าน มีคำเตือน bundle ใหญ่เดิม; ESLint hook/component ใหม่และ `git diff --check` ผ่าน
ไม่มี git add/commit/push หรือ deploy production

## 1.6.15: linear สองทิศ, virtual list และ modal (ประวัติรุ่นก่อน)

### สิ่งที่ตรวจพบและแก้

- งาน scroll ของ virtualizer เคยอยู่ใน MedicalRecords ทำให้ฟอร์มและส่วนอื่นของหน้าถูก render ตามการเลื่อน แยกเป็น PatientVirtualList และคง key ของคนไข้ตามรหัสจริง ไม่ใช้การนำแถวเดิมไปแสดงคนละคน
- Virtualizer ไม่ได้รู้ offset ที่รายการเริ่มหลัง header/filter: ที่ scrollTop 2,000 แถวแรกที่ render อยู่ประมาณ y=-1.5px ทำให้เหลือระยะสำรองขึ้นบนเพียงราว 140px หลังเพิ่ม scrollMargin แถวแรกอยู่ y=-466.5px มีสำรองมากกว่าสองแถวตาม regression เดิมที่เคยไม่ผ่าน
- ใช้ค่าประมาณความสูงจากแถวที่วัดได้จริง ไม่ hardcode 96px เพราะแถวบนแท็บเล็ตและ PC สูงต่างกัน และคงการ render รายการแบบ synchronous ตาม upstream หลังทดลอง asynchronous แล้วไม่พบประโยชน์แน่นอน
- หยุด geometry reads ของ App/เวชระเบียนทุก scroll ในเส้นทาง sticky ใหม่ และใช้ IO sentinel สำหรับ pagination
- Header เลิกผูกกับ ScrollTimeline/clip-path เปลี่ยนเป็น transform/opacity linear 200ms, ย่อที่ 50px คืนที่ 35px Filter ใช้ linear เช่นกัน และตรวจการจอดไม่ให้ชั้นภาพบังกันเมื่อสะบัดเร็วจากด้านบน
- Modal เดิมมี history entry ซ้ำ/ค้างเมื่อปิด confirmation พร้อม modal คนไข้ ทำ regression ยกเลิก OPD → เปิดคนไข้ใหม่ → ยกเลิกครั้งเดียวให้เห็นไม่ผ่านก่อนแก้ แก้ token ต่อการเปิดและป้องกันปิดซ้ำ พร้อมล้าง nested state และยก confirmation ไว้เหนือ modal

### ผลตรวจ PC

Playwright/CDP ใน Chromium แยก ใช้ข้อมูลจำลองและบล็อก production writes ไม่มี Browser MCP tool ใน session นี้

| ข้อมูลที่โหลดเข้า state จริง | MedicalRecords render ระหว่างเลื่อน | เปลี่ยน key | แถว virtual ที่ mount หลังหยุด | เปิดคนไข้หลังสะบัด (CPU 4x) |
| --- | ---: | ---: | ---: | ---: |
| 1,000 | 0 | 0 | 19 | 157ms |
| 10,000 | 0 | 0 | 19 | 149ms |

ผ่านการตรวจว่าเปิด HN ตรงกับแถวที่คลิก, มีแถวสำรองด้านบน, runtime error 0 และไม่มีการเขียนข้อมูลคนไข้จริง ค่า rAF p95 รอบนี้ประมาณ 50ms ภายใต้ CPU slowdown 4 เท่า ยังมี long task ประมาณ 56–73ms; ไม่ใช้ตัวเลขนี้อ้างว่าแสดงผลได้กี่ FPS หรือรับรองว่าการสะบัดไม่กระตุก
ชุด regression header/filter linear, กลับทิศกลาง animation, คืน header เมื่อเลื่อนขึ้น, เพิ่ม OPD จาก view โดย demographics ยัง readonly, ยกเลิก OPD/แก้ไข → เปิดใหม่ → ปิดครั้งเดียว, Back/Escape และไม่มี modal history ตกค้าง ผ่าน
ผ่าน fixture sidebar เวชระเบียน/นัดหมาย/บอร์ดผู้บริหาร รวม stable viewport, passive touch, calendar, navigation cleanup และ pagination; UI สมาชิก/สิทธิประโยชน์ตรวจ desktop และมือถือ 360px ทั้งสถานะว่างและมี VIP/คอร์ส/คูปอง ไม่มี horizontal overflow

### ผลตรวจแท็บเล็ต

SM-X520 เครื่องเดิม, WebView เดิม, ไม่เปลี่ยน refresh rate/renderer ระบบ ใช้ APK ตรวจวัด 1.6.15 ชั่วคราว
ชุด `tiny-source15-final-recorded` ใช้ 48 trusted touch: ระยะ 30/45/55 physical px, เวลา 16/20/25/32/40ms สลับขึ้นลง เว้นช่วง 0/7/13ms ตรวจใกล้ขอบ header และ filter ทั้งเมนูเปิด/ปิด
พบการย่อและคืน header ทั้งสองทิศในเมนูทั้งสองขนาด และ dock/undock filter ทั้งสองทิศ ไม่มี touchcancel หรือเปิด modal คนไข้จากการลากผิดตำแหน่ง
ชุด `tiny-source15-final-consistency` เพิ่มตรวจหลังแรงเฉื่อยหยุดอีก 500ms ว่าตำแหน่ง marker สอดคล้องกับสถานะ header ผ่านทั้งสี่กรณี การอ่านหลัง 400ms อย่างเดียวอาจยังอยู่ระหว่าง inertia จึงไม่ถือ geometry ณ จุดนั้นเป็นผลหลังหยุด

rAF p95 ราว 33–44ms และ outlier สูงสุดราว 99ms ในชุดตรวจเหล่านี้ การบันทึกวิดีโอและเครื่อง host ที่ทำงานอื่นมีผล ไม่ใช่การเปรียบเทียบ FPS ที่ควบคุมภาระ และยังไม่ใช่ผลยืนยันว่าปัญหา intermittent ทุกจังหวะหายหมด
วิดีโอ/ข้อมูลตรวจเครื่องจริงเก็บใน `.work/device/` ส่วนตัว อาจมีข้อมูลผู้ป่วย ไม่ใช้เป็นไฟล์เผยแพร่ ส่วน screenshot fixture เป็นข้อมูลจำลอง
Finance ยังรอตรวจแยกหลังงานนี้ตามที่ผู้ใช้ระบุ

### ไฟล์ส่งทดสอบและตรวจ build

- `public/AnpingClinic.apk`: 1.6.15 / versionCode 38, SHA-256 `ce7852302650831954359b824d97a30c071f4406b4f395c6e2a5a7001e63d794`
- ลายเซ็นเดิม SHA-256 `17d1cd7d8b359b3178945dd6ec4d7c407aba597e4f1e2b5c64412cce86896542`; ติดตั้ง `-r --no-incremental` ทับบนเครื่องสำเร็จโดยไม่ถอนหรือล้างข้อมูล ตรวจ installed version/code และไม่มี DEBUGGABLE แล้ว นำ adb forward สำหรับ CDP ออกแล้ว
- Gradle release build และ asset integrity 19 ไฟล์ผ่าน ไม่มี env/source map/APK ซ้อนหรือ server credential ใน web assets
- `npm run build` ผ่าน มีคำเตือน bundle ใหญ่ตามโครงสร้างเดิม; ESLint เฉพาะ hook/list ที่เกี่ยวข้อง 0 errors และ 1 warning ของ React Compiler กับ TanStack Virtual ซึ่งมีอยู่เดิม
- `git diff --check` ผ่าน ไม่ stage/commit/push หรือ deploy เว็บ production

## 1.6.14: header/filter และรูปแบบการลากเพิ่มเติม (ประวัติรุ่นก่อน)

ผู้ใช้พบอาการเดียวกันในเบราว์เซอร์บนคอม จึงย้ายการแก้ไปยังชุด sticky ร่วมของเว็บด้วย
ก่อนแก้ header เปลี่ยนความสูงใน flow ประมาณ 131 → 64px ระหว่างเลื่อน และ filter สลับตำแหน่ง absolute/relative พร้อมเปลี่ยน width/padding
`--header-p` ถูกเขียนบน main ซึ่งส่งผลถึงสไตล์ลูกทั้งตาราง และ listener อ่าน geometry หลังเขียนคลาสซ้ำระหว่าง scroll
หลังแก้ header จองความสูงเดิมแล้วใช้ clip/transform/opacity กับ scroll timeline; filter เคลื่อนและขยายเป็นชั้นภาพ โดยไม่สลับโครงตำแหน่ง
ใช้กับ header แบบมาตรฐาน 9 หน้า บน desktop/tablet ที่รองรับ API; บอร์ดผู้บริหารใช้ header อีกชุด จึงไม่ได้เปลี่ยนรูปแบบ header ของหน้านั้น
แนวทาง API อ้างอิง [Chrome scroll-driven animations](https://developer.chrome.com/docs/css-ui/scroll-driven-animations)

Regression ที่จับปัญหาเดิม: `.work/check-webview.cjs` พร้อม `CHECK_MEDICAL_STICKY=1` ตรวจว่า logical header height ไม่เปลี่ยนเมื่อ scroll ผ่าน 10/25/40/60/220/340px
ชุดก่อนแก้ (`WEB_DIR=web-before-1.6.13`, APK 1.6.12) ไม่ผ่าน assertion ความสูงคงตัว; รุ่นใหม่ผ่าน พร้อมตรวจย่อครึ่งระยะ, filter ที่ y=64, focus search, เปิด/ปิดฟอร์มเพิ่มคนไข้โดยไม่บันทึก
Chromium ผ่านทั้ง HTML แบบ APK และเว็บปกติ (ถอด anping-webview), 9 หน้าร่วม, ข้อมูล 200/1,000 คนไข้
ตรวจวงจร sidebar uniform scale, แถวกลางรายการ, near-bottom, modal portal, สัญญาณอ่านบัตรจำลอง, resize ไป–กลับมือถือ และลากกลับเร็วผ่าน ไม่มี runtime exception หรือเขียนข้อมูลจริง
เพิ่ม short flick ระยะ 40 CSSpx ปล่อยทันทีหลัง touchmove ใน fixture: เปิด/ปิดถูกต้องแม้ยังไม่ถึงเฟรมถัดไป

### Sticky เวชระเบียน: Android input จริง

ใช้ 4 gesture ต่อแบบ (ไป/กลับ) ส่งผ่าน Android input และยืนยัน trusted touch events
กดค้างใช้ draganddrop พบช่วงค้างก่อน move ประมาณ 550ms, ลากช้า 1,600ms, เร็ว 180ms และสะบัด 40ms
ช่วงสัมผัสจริงของสะบัดรุ่นใหม่ประมาณ 37ms; ไม่ใช้ animation หลังปล่อยแทนเวลานิ้วสัมผัส

| รูปแบบ | Layout count ก่อน → หลัง | คำนวณสไตล์ก่อน → หลัง | เขียนคลาส header/filter ก่อน → หลัง |
| --- | ---: | ---: | ---: |
| ค้างก่อนลาก | 28 → 8 | 290 → 24 ms | 294 → 0 |
| ลากช้า | 113 → 16 | 474 → 44 ms | 884 → 0 |
| ลากเร็ว | 110 → 48 | 185 → 66 ms | 322 → 0 |
| สะบัด | 118 → 19 | 191 → 49 ms | 184 → 0 |

ค่าจาก APK ตรวจวัด 1.6.13 เทียบ source 1.6.14 บนเครื่องเดิม; เป็นต้นทุนงานใน renderer ไม่ใช่ FPS ที่เห็นจริง
ระยะ inertia และจำนวนเฟรมของสะบัดต่างกันตามเวลาส่ง event จึงไม่ใช้สัดส่วน HWUI หรือจำนวน layout เพียงอย่างเดียวรับรองว่าภาพลื่นขึ้นกี่เปอร์เซ็นต์
ยังพบ rAF outlier ถึงประมาณ 144ms ในรุ่นใหม่ และ HWUI ยังมีเฟรมเกินกำหนด; การลดงาน sticky ไม่ได้แก้ทุกต้นทุนของ virtual rows/GPU
ตรวจ geometry บนเครื่องจริง: header logical height คง 131px, title ย่อจาก 38.88 เป็น 28.51px, ปุ่มอยู่ y≈10–54 และ filter จอด y=64 โดยไม่ซ้อน header
ไฟล์ดิบส่วนตัว: `.work/device/sticky-before113/`, `.work/device/sticky-source114/`

### Sidebar: ครบค้าง/ช้า/เร็ว/สะบัด

48 gesture = 3 หน้า × 4 รูปแบบ × 4 เปิด/ปิด ตรวจชื่อหน้าจริงก่อนแต่ละชุด
ผ่านทุกครั้ง: ปลายทาง 80/256px, trusted touch บน aside และไม่ค้าง is-dragging-sidebar/is-sidebar-animating
คำสั่งสะบัด 40ms พบเวลาสัมผัสจริง 52–128ms ตามภาระในแต่ละหน้า

| หน้า | ค้าง p95 | ช้า p95 | เร็ว p95 | สะบัด p95 |
| --- | ---: | ---: | ---: | ---: |
| เวชระเบียน | 40 ms | 18 ms | 40 ms | 48 ms |
| นัดหมาย | 20 ms | 17 ms | 24 ms | 28 ms |
| บอร์ดผู้บริหาร | 36 ms | 30 ms | 36 ms | 46 ms |

ผล APK ตรวจวัด: `.work/device/sidebar-source114/report.json`; การสะบัดยังหนักกว่าลากช้าในบางหน้า
รอบ release ปกติไม่มี debugging ลาก 450ms จำนวน 10 ครั้ง/หน้า และเพิ่มการอ่านตำแหน่งเมนูใหม่กับยืนยัน heading หลังเปลี่ยนหน้า:

| หน้า | HWUI เฟรมเกินกำหนด | p95 |
| --- | ---: | ---: |
| เวชระเบียน | 43/559 (7.69%) | 38 ms |
| นัดหมาย | 31/732 (4.23%) | 23 ms |
| บอร์ดผู้บริหาร | 82/623 (13.16%) | 44 ms |

ผลดิบ `.work/device/release-1.6.14/`; ไม่เทียบกับไฟล์วิดีโอรอบก่อนที่เลือกหน้าผิด และไม่ใช้ encoder FPS เป็น display FPS
APK ปกติ 1.6.14 / code 37: SHA-256 `06684d97abdc94fe8907ba8054c72e77fbbd9d1b8214cce2db0b23a7e077cdbe`
ตรวจ hash 19 assets และลายเซ็นเดิมผ่าน ปิด DEBUGGABLE ติดตั้งแบบรักษาข้อมูล และนำ debug forward ออก
ยังไม่ได้ทดสอบอ่านบัตร USB จริงระหว่างลาก ไม่ได้เผยแพร่เว็บหรือเปลี่ยน clinic-version.json และไม่ได้ stage/commit/push

เครื่อง Samsung SM-X520 (Tab S10 FE), Android 16 / API 36, WebView 155.0.8059.43, หน้าจอแนวนอน 2304×1440 ที่ 90 Hz, DPR 1.75
ระหว่างตรวจไม่เปิดโหมดประหยัดพลังงาน และ thermal status เป็น 0
เครื่องติดตั้ง 1.6.9 ตอนเริ่มตรวจ จึงเก็บ baseline ก่อนอัปเดตเป็น 1.6.10 แบบรักษาข้อมูลแอป

## Android HWUI

รีเซ็ต gfxinfo ก่อนแต่ละหน้า ลากเปิด–ปิด sidebar 10 ครั้ง ครั้งละ 450 ms และรอให้จบระหว่างครั้ง
ตัวเลขเป็นสถิติหน้าต่างแอป ไม่ใช่ FPS ของ JavaScript และไม่แยกต้นทุนของ WebView renderer

| หน้า | 1.6.9 เฟรมพลาดกำหนด / p95 | 1.6.10 เฟรมพลาดกำหนด / p95 | Native demo อ้างอิง |
| --- | --- | --- | --- |
| เวชระเบียน | 40.39% / 81 ms | 41.07% / 89 ms | 2.15% / 14 ms |
| นัดหมาย | 32.45% / 69 ms | 32.60% / 73 ms | 14.39% / 32 ms |
| บอร์ดผู้บริหาร | 42.24% / 89 ms | 42.86% / 97 ms | 88.60% / 117 ms |

Native เป็นข้อมูลอ้างอิงตามหน้าที่ทดสอบเท่านั้น ฟังก์ชัน รายละเอียด UI และขอบเขตข้อมูลยังต่างจากเว็บ จึงไม่ใช้สรุปว่า framework ใดเร็วกว่าโดยทั่วไป
ผลยืนยันว่าบนเครื่องนี้ 1.6.10 ยังไม่ต่างจาก 1.6.9 ชัดเจนตามที่ผู้ใช้รายงาน

## ตรวจแยก WebView

ใช้ APK ตรวจวัดส่วนตัวที่เปิด local debugging เพื่อเก็บ CDP metrics โดยไม่เปลี่ยน public APK
การลากผ่าน Android input 6 ครั้งพบ rAF median ประมาณ 22 ms และ p95 ประมาณ 44–66 ms ตามหน้า
ในบอร์ดผู้บริหาร style/layout มีต้นทุนสูงระหว่างลาก ส่วนข้อมูล HWUI ช่วงท้ายพบ RenderThread p95 ประมาณ 50 ms ขณะที่ UI thread ราว 4 ms
การบังคับ hardware layer ไม่ทำให้ผลดีขึ้นชัดเจน: ข้อมูล rAF และ style/layout ใกล้กับ baseline จึงลบโค้ดเลือก layer ทดลองออกจาก source
การปิด SwipeRefresh, เปลี่ยนแอนิเมชันข้อความ, ลดกฎ CSS ช่วงลาก, พักขนาดเนื้อหา และ containment ของ panel ยังไม่ให้ผลดีสม่ำเสมอพอสำหรับออก APK รุ่นถัดไป

รายละเอียดและ raw frame tables อยู่ใน `.work/device/` เฉพาะในเครื่องทำงาน ไม่มีการแก้ไขเวชระเบียน/นัดหมายระหว่างวัด

## การตรวจเพิ่มเติมหลังเชื่อมต่อกลับ 27 ต.ค. 2026

ตรวจยืนยันการคืน 1.6.10 ปกติสำเร็จและไม่มี DEBUGGABLE ก่อนเริ่มรอบใหม่
การแยกเลเยอร์ตาราง, กราฟ SVG, main, sidebar, panel และ containment ยังไม่ทำให้เฟรมดีขึ้นสม่ำเสมอ
การซ่อนเนื้อหาเฉพาะเพื่อวินิจฉัยทำให้เฟรมดีขึ้น จึงแยกได้ว่าต้นทุนวาดเนื้อหามีส่วนสำคัญ
Trace พบ RenderThread รอ WaitSyncToken ขณะ GPU ทำ raster แต่ยังสรุปว่าเป็นบั๊ก driver ไม่ได้
ทดสอบ OpenGL ชั่วคราวแล้วไม่ดีขึ้นสม่ำเสมอ: คืน debug.hwui.renderer เป็นค่าว่างเดิมทันทีหลังเปิดแอป และเปิดแอปใหม่ให้กลับมาใช้ Vulkan แล้ว
ทดสอบ preferredRefreshRate 60 Hz เฉพาะหน้าต่างแอป ระบบยอมเปลี่ยนเป็น 60 Hz จริง แต่ไม่ลดอาการมากพอ จึงนำโค้ดทดลองออก

การตรึงก้อนเนื้อหาแล้ว scale ให้พอดีขณะลากทำให้เฟรมดีขึ้นมาก แต่ผู้ใช้เห็นเนื้อหาถูกบีบและเด้งเมื่อคืน layout จึงปฏิเสธวิธีนี้ ไม่ใส่ใน APK แจก

## รุ่นทดลอง 1.6.11: ก้อนเนื้อหาคงขนาดระหว่างลาก

ตามภาพกรอบแดงสองก้อนของผู้ใช้ ให้ sidebar ดันก้อนเนื้อหาทั้งหน้าโดยคงความกว้างเดิมระหว่างเคลื่อน ไม่ scale ตัวอักษร/กราฟ
เมื่อจบจึงคืน layout ให้พอดีพื้นที่ พร้อม crossfade ของ main viewport 140 ms ขนาด viewport ของภาพก่อน/หลังเท่ากัน จึงไม่ยืดภาพ
View Transition ใช้ snapshot ในหน่วยความจำตาม [เอกสาร Chrome](https://developer.chrome.com/docs/web-platform/view-transitions/same-document) ไม่มีการบันทึก snapshot ลงไฟล์ในแอป

วัดด้วย APK ตรวจวัดของ source 1.6.11, Android input 6 gestures × 450 ms ต่อหน้า, จอ 90 Hz เดิม
แยกช่วงลาก/แอนิเมชัน sidebar ออกจากช่วง crossfade หลังปล่อย เพื่อไม่ให้เฟรมเพิ่มจาก crossfade ทำให้ตัวเลขช่วงลากดูดีขึ้นเกินจริง

| หน้า | 1.6.10 ช่วงลาก p50 / p95 (ms) | 1.6.11 ช่วงลาก p50 / p95 (ms) | หลังปล่อย p95 (ms) |
| --- | ---: | ---: | ---: |
| เวชระเบียน | 22.2 / 55.4 | 11.1 / 22.3 | 33.3 |
| นัดหมาย | 22.1 / 44.5 | 11.1 / 22.2 | 33.3 |
| บอร์ดผู้บริหาร | 22.3 / 66.4 | 11.1 / 33.2 | 44.3 |

นี่คือ rAF interval ระหว่างการเคลื่อนไหวบนแท็บเล็ต ไม่ใช่ FPS ที่จอแสดงจริงทุกเฟรม
ยังมี outlier เช่นเวชระเบียนช่วงเริ่ม/ลากสูงสุด 100 ms และช่วงคืน layout นัดหมายสูงสุดประมาณ 80 ms จึงยังไม่รับรองว่าไม่สะดุดเลย
ต้องให้ผู้ใช้ประเมินรอยต่อหลังปล่อยและพื้นที่ขอบขวาระหว่างย่อ sidebar ด้วยตาอีกครั้ง
ผลดิบอยู่ใน `.work/device/cdp-blocks111-adb.json` และ frame tables ของแต่ละหน้า

ตรวจ fixture 200/1,000 คนไข้ผ่าน: ก้อนคงความกว้างระหว่างลาก, transform scale = 1, คืน responsive width หลังปล่อย, กราฟ/ข้อมูลอยู่ครบ, touch cancel/ลากจากตัวเมนู/scroll เมนูแนวตั้ง และไม่ refetch บอร์ดหรือ render ปฏิทินจากการลาก
ตรวจฟอร์มคนไข้เปิดอยู่, resize และ smartcard-read จำลองระหว่างลาก, ลากกลับขณะ crossfade และเปลี่ยนหน้าระหว่าง crossfade ผ่าน ไม่มี runtime exception หรือการเขียนข้อมูลจริง
ยังไม่ได้เสียบเครื่องอ่านบัตร USB เพื่อทดสอบอ่านบัตรจริงพร้อมลาก

## ไฟล์ติดตั้ง 1.6.11 (เก่า)

public APK เป็น release 1.6.11 / versionCode 34 / SHA-256 `2d05f1a71ae9dc1ab73b56455f6f0585b4780641626badc73eae8631c428706f`
ลายเซ็นตรงกับรุ่นเดิม และตรวจ manifest ว่าไม่มี debuggable; ไม่มีโค้ดบังคับ layer/refresh rate/renderer ใน source
ยังไม่แก้ `public/clinic-version.json` หรือ deploy เว็บ

ติดตั้ง release นี้บนแท็บเล็ตสำเร็จด้วย `adb install -r --no-incremental` โดยไม่ล้างข้อมูล ตรวจ package flags ไม่มี DEBUGGABLE และนำ adb forward สำหรับตรวจวัดออกแล้ว
ตรวจ pipeline กลับเป็น Skia Vulkan, debug.hwui.renderer เป็นค่าว่างเดิม และ thermal status 0

## ยืนยันด้วย release 1.6.11

ใช้วิธี HWUI เดิม ลาก 10 ครั้ง × 450 ms และเว้น 380 ms ต่อครั้งบนแต่ละหน้า พร้อมเก็บหลังรีเซ็ต gfxinfo

| หน้า | 1.6.10 เฟรมพลาดกำหนด / p95 | release 1.6.11 เฟรมพลาดกำหนด / p95 | เฟรมทั้งหมดก่อน → หลัง |
| --- | ---: | ---: | ---: |
| เวชระเบียน | 41.07% / 89 ms | 15.01% / 38 ms | 487 → 713 |
| นัดหมาย | 32.60% / 73 ms | 8.94% / 30 ms | 592 → 861 |
| บอร์ดผู้บริหาร | 42.86% / 97 ms | 15.25% / 36 ms | 504 → 741 |

รุ่นใหม่มีเฟรมจาก crossfade เพิ่มด้วย จึงไม่ใช้เปอร์เซ็นต์ HWUI เพียงตัวเดียวเพื่อสรุปความลื่นช่วงลาก; ใช้ rAF ที่แยกช่วงลากและช่วงคืน layout ด้านบนประกอบ
ผล release เก็บใน `.work/device/gfx-1.6.11.json` กับ frame tables รายหน้า ไม่ใช่การรับรองว่าทุกการลากจะไม่มีเฟรมสะดุด

## 1.6.12: ย่อ–ขยายทั้งก้อนพร้อม sidebar

ผู้ใช้ยืนยันแบบที่ 1 ให้ scale รวมตัวอักษรและกราฟ จึงรักษา logical width ไว้เท่าพื้นที่เมื่อ sidebar ย่อ และเปลี่ยน visual scale ตามความกว้างที่เหลือทุกเฟรม
scale เท่ากันทั้งสองแกน ไม่มีการบีบเฉพาะแนวนอน เมื่อจบคง geometry ด้วย CSS zoom ตาม [มาตรฐาน CSS Viewport](https://drafts.csswg.org/css-viewport/#zoom-property) และคืน flex layout
main ยังคงเป็น scroller เดิม ทำให้ clientWidth/clientHeight/scrollTop และ ResizeObserver ของ TanStack Virtual ใช้หน่วย layout เดิม ไม่ใช้ getBoundingClientRect ที่รวม scale เป็นความสูงแถว
ฟอร์มนัดหมายและ overlay ของหน้านัดหมายย้ายไป body portal เพื่อแสดงเต็ม viewport โดยไม่รับ scale; modal ของเวชระเบียนและบอร์ดใช้ portal อยู่แล้ว

วัด APK ตรวจวัดจาก source 1.6.12, จอเดิม 90 Hz, ลาก Android input 6 ครั้ง × 450 ms ต่อหน้า แยกเฟรมช่วง sidebar เคลื่อน ไม่มีเฟส fade หลังปล่อย

| หน้า | rAF p50 / p95 (ms) | เฟรมตัวอย่าง | ช่วงเฟรมสูงสุด (ms) |
| --- | ---: | ---: | ---: |
| เวชระเบียน | 11.1 / 33.2 | 294 | 77.8 |
| นัดหมาย | 11.1 / 22.2 | 326 | 55.3 |
| บอร์ดผู้บริหาร | 11.1 / 33.3 | 273 | 144.1 |

ยังมีช่วงสะดุดเริ่ม gesture/เปลี่ยนเลเยอร์ จึงไม่อ้างว่าได้ 90 FPS ต่อเนื่อง ตัวเลขไม่ได้เร็วกว่า 1.6.11 ทุกหน้า แต่พฤติกรรมเปลี่ยนขนาดพร้อม sidebar ตามที่ผู้ใช้เลือก
ทดลองคง will-change ไว้ล่วงหน้าบนบอร์ดหนึ่งรอบ: p95 ยัง 33.3 ms และงานรวมไม่ลด จึงไม่ใส่การเปลี่ยนนี้ใน source

Regression 200/1,000 คนไข้ผ่าน: icon/กราฟ scale กว้าง–สูงตามอัตราส่วนเดียวกับ main ตั้งแต่กลางการลาก, logical width คงเดิมในขอบเขต pixel rounding, main สูงเต็ม viewport, ไม่มี View Transition และ geometry ของ icon ไม่เด้งที่ปลายทาง
รายการเสมือนกลางรายการยังเห็นผู้ป่วยที่ anchor เดิม มีการปรับ scrollTop เล็กน้อยจากการปัดเศษพิกเซล/วัดแถวหลัง zoom (พบประมาณ 3.5 logical px); ตรวจว่าไม่ย้ายไปคนไข้อื่นที่จุดอ้างอิงและไม่เกิดพื้นที่ตารางว่าง
ตรวจ smartcard-read จำลองระหว่างลาก, touch cancel, ลากจากตัวเมนู, scroll เมนูแนวตั้ง, ลากกลับเร็วระหว่าง animation, resize ไปมือถือแล้วกลับแท็บเล็ต และฟอร์มนัดหมายบน body portal ผ่าน ไม่มี runtime exception หรือการเขียนข้อมูลจริง
ตรวจภาพจาก Android screencap จริงด้วย: Page.captureScreenshot ของ CDP แสดงช่องว่างที่ไม่ตรงกับภาพบนจอเมื่อใช้ CSS zoom จึงไม่ใช้ screenshot CDP ตัดสินภาพจริง
ยังไม่ได้อ่านบัตร USB จริงพร้อมลาก

APK ปัจจุบัน `public/AnpingClinic.apk`: release 1.6.12 / versionCode 35 / SHA-256 `a9795199b40dc56de3d3d568ebbf410ee45cb683f4be2dd5523265a4c91e865d`
ตรวจ asset hash 19 ไฟล์, manifest native HTML, ไม่มี APK/ZIP ซ้อนใน assets, signing fingerprint ตรงเดิม และไม่มี debuggable
ไม่เปลี่ยน `public/clinic-version.json`, ไม่ deploy และไม่ใช้ git add/commit/push

### ยืนยัน release 1.6.12 บนแท็บเล็ต

ใช้วิธีเดิม 10 gestures × 450 ms ต่อหน้า เว้น 380 ms และรีเซ็ต gfxinfo รายหน้า

| หน้า | เฟรมทั้งหมด | เฟรมพลาดกำหนด | p50 / p95 (ms) |
| --- | ---: | ---: | ---: |
| เวชระเบียน | 466 | 119 (25.54%) | 17 / 53 |
| นัดหมาย | 732 | 91 (12.43%) | 16 / 40 |
| บอร์ดผู้บริหาร | 563 | 140 (24.87%) | 15 / 53 |

ยังมีเฟรมสะดุด และ HWUI p95 สูงกว่า 1.6.11 ที่ตรึงความกว้างไว้ ขณะที่ต่ำกว่า 1.6.10 เดิม (89 / 73 / 97 ms)
1.6.12 ไม่มีเฟรม crossfade เพิ่ม จึงไม่ใช้เปอร์เซ็นต์ HWUI มาเปรียบกับ 1.6.11 โดยตรง จุดที่แก้รอบนี้คือให้ขนาดเนื้อหาเปลี่ยนพร้อม sidebar และคงสัดส่วนที่ปล่อยตามความต้องการ
ผล release อยู่ใน `.work/device/gfx-1.6.12.json` และ frame tables รายหน้า
ตรวจ browser fallback ด้วย fixture 200 คนไข้ผ่านทั้งสามหน้าและฟอร์มเวชระเบียน โดย main ไม่มี CSS zoom และไม่มี runtime exception

### ทดสอบลากซ้ำตามคำขอผู้ใช้ 27 ต.ค. 2026

ใช้ release 1.6.12 ที่ติดตั้งอยู่ ไม่มี debugging ไม่เปลี่ยน source หรือ APK ระหว่างทดสอบ จอ 90 Hz / thermal status 0
ลากเปิด–ปิด 10 ครั้งต่อหน้า ครั้งละ 450 ms เว้น 380 ms และเก็บ HWUI แยกแต่ละหน้าโดยไม่อัดวิดีโอพร้อมวัด

| หน้า | เฟรมพลาดกำหนด | p50 / p95 (ms) |
| --- | ---: | ---: |
| เวชระเบียน | 133 / 423 (31.44%) | 18 / 53 |
| นัดหมาย | 90 / 742 (12.13%) | 16 / 42 |
| บอร์ดผู้บริหาร | 131 / 563 (23.27%) | 15 / 48 |

ยังสะดุดอยู่ โดยเวชระเบียนมีสัดส่วนเฟรมพลาดกำหนดสูงสุดในรอบนี้ ไม่สรุปว่าลื่นเท่า Native
หลังวัดจึงอัด Android screenrecord เฉพาะบอร์ดผู้บริหาร แยกเป็นลากช้า 1,500 ms, ปกติ 450 ms และเร็ว 180 ms รวมอีก 8 gestures
ตรวจภาพช่วงลากและปล่อย: เนื้อหาขยาย/ย่อพร้อม sidebar โดยไม่มีการสลับหน้าแบบ fade; ไม่พบการเด้งกลับขนาดใหญ่อย่างวิธีเดิมในภาพที่ตรวจ
ตรวจ green KPI card ในวิดีโอพบครบ 1,241/1,241 เฟรม ไม่มีช่วงที่การ์ดหายทั้งหมด ส่วน bounding box มีความต่างของอัตราส่วนจาก median สูงสุดประมาณ 1.41% ซึ่งรวม pixel rounding และการบีบอัดวิดีโอ จึงไม่ใช่หลักฐานว่า geometry ของทุกองค์ประกอบถูกต้องทุกเฟรม
การบันทึกวิดีโอเพิ่มภาระเครื่อง จึงไม่ใช้ FPS ของไฟล์วิดีโอแทน FPS ของจอหรือผล HWUI
ผลและวิดีโอเก็บเฉพาะในเครื่องที่ `.work/device/retest-20261027/` ไม่เขียนข้อมูลคนไข้/นัดหมาย และยังไม่ได้ทดสอบอ่านบัตร USB จริงพร้อมลาก

## 1.6.13: ลด layout และ raster ระหว่างลาก

ตั้งสมมติฐานว่าการเปลี่ยน main.height ทุกเฟรมทำให้ virtualizer และเนื้อหาคำนวณ viewport ซ้ำ แม้ความกว้าง layout ของเนื้อหาคงตัวแล้ว
ทดลองใน 1.6.12 บนเครื่องจริงก่อนแก้ source: ตรึงความสูงเฉพาะตอนเคลื่อนร่วมกับตรึงความกว้างข้อความ sidebar ได้ HWUI เวชระเบียน 34/304 เฟรม (11.18%), p95 42 ms เทียบกับรอบ baseline คู่กัน 80/266 (30.08%), p95 53 ms
ตรึง viewport อย่างเดียวได้ 23.53% / p95 48 ms ในอีกคู่ baseline 31.43% / p95 61 ms จึงเลือกแก้ทั้งสองจุด

ใน source ตรึง height ได้เฉพาะเมื่อ main.scrollHeight มากกว่าความสูงสูงสุดที่ต้องใช้และมีระยะเลื่อนเหลือพอ ส่วนใกล้ท้ายรายการหรือรายการสั้นใช้ความสูงปรับตาม scale เดิมเพื่อไม่ให้ scrollTop ถูก clamp
ขณะลาก main อาจมี bounding rect สูงกว่า parent แต่ parent ยัง clip เต็ม viewport เดิม เนื้อหาย่อทั้งสองแกนตามนิ้ว และคืน flex/zoom ด้วย geometry เดิมเมื่อจบ
เพิ่ม regression ตรวจ visible intersection ของ main กับ parent, logical height คงตัวเมื่อเข้าเงื่อนไข, uniform scale และ near-bottom live sizing; ชุดก่อนแก้จาก APK 1.6.12 ไม่ผ่าน stable-height assertion ส่วน source 1.6.13 ผ่าน
ตรวจข้อมูลจำลอง 200/1,000 คนไข้, ตำแหน่งผู้ป่วยกลางรายการ, สัญญาณอ่านบัตรจำลอง, ฟอร์มนัดหมาย, resize มือถือกลับแท็บเล็ต, ลากกลับเร็ว และ browser fallback ผ่าน ไม่มี runtime exception หรือการเขียนข้อมูลจริง

ผล APK ตรวจวัดจาก source 1.6.13 ลาก Android input 6 ครั้งต่อหน้า:

| หน้า | HWUI เฟรมพลาดกำหนด | HWUI p95 | rAF p95 ช่วงลากต่อเนื่อง |
| --- | ---: | ---: | ---: |
| เวชระเบียน | 10.77% | 38 ms | 11.4 ms |
| นัดหมาย | 2.88% | 22 ms | 11.2 ms |
| บอร์ดผู้บริหาร | 6.64% | 40 ms | 22.1 ms |

rAF ไม่ใช่เฟรมที่แสดงจริงทั้งหมด จึงใช้ HWUI ประกอบ และแยก start / move / snap / after เพื่อไม่กลบช่วงปล่อยด้วยเฟรมแอนิเมชันที่งานน้อย
ยังพบ outlier เช่นบอร์ดหลังปล่อยสูงสุด 144 ms และเวชระเบียนระหว่างเคลื่อนสูงสุด 100 ms ในรอบตรวจวัด จึงไม่รับรองว่าไม่มีเฟรมสะดุด
ไฟล์ดิบอยู่ใน `.work/device/cdp-source113-adb.json`, `cdp-before113b-adb.json` และ `cdp-fixedViewportLabels113-adb.json` พร้อม frame tables รายหน้า

APK ปัจจุบัน `public/AnpingClinic.apk`: release 1.6.13 / versionCode 36 / SHA-256 `4aa88c98c46a044557f3ed540242e9f91ada10d1fc0980795bacc86ca44a6128`
ตรวจ asset hash 19 ไฟล์, ลายเซ็นตรงเดิม, ไม่มี debuggable และไม่เปลี่ยน public/clinic-version.json หรือ deploy
ยังไม่ได้อ่านบัตร USB จริงพร้อมลาก

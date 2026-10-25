# ผลวิเคราะห์อาการกระตุกจากวิดีโอ AnpingClinic

ตรวจวันที่ 25 ตุลาคม 2026 จาก `Screen_Recording_20261025_163728_AnpingClinic.mp4`, แผน `แก้ไขอาการจอกระตุกเมื่อเลื่อน sildebar.md` และ source ที่ HEAD `0e519eb`

## ข้อสรุป

หลักฐานยังไม่เพียงพอให้ระบุฟังก์ชันต้นเหตุเดียว แต่แสดงว่าอาการมีมากกว่าภาระจากรายการยาว: มีทั้ง Android แจ้งแอปไม่ตอบสนอง และองค์ประกอบบางส่วนหายระหว่างย่อ–ขยาย sidebar บนหน้าแดชบอร์ดที่ไม่ได้ใช้ virtualization

ควรให้ความสำคัญกับการวาดภาพของ WebView ระหว่างเปลี่ยนความกว้าง และตรวจ native touch/scroll bridge ควบคู่กัน การเพิ่ม virtualization ในสามหน้าเพียงอย่างเดียวยังไม่ครอบคลุมอาการในคลิป ไม่ควรรับรองว่าแก้ได้จาก build ผ่านหรือการทดสอบ desktop

สถานะงานนี้: วิเคราะห์และตรวจโค้ด ไม่มีการแก้ implementation หรือสร้าง APK ใหม่

## หลักฐานจากคลิป

วิดีโอขนาด 1728 × 1080 ประมาณ 59.35 วินาที มี 3,520 เฟรม ค่า frame rate เฉลี่ยของไฟล์ประมาณ 59.31 ไม่ใช่ผลวัด FPS ของแอป

| เวลาโดยประมาณ | สิ่งที่เห็น | สิ่งที่สรุปได้ |
| --- | --- | --- |
| 6–7 วินาที | หน้ารายการผู้ป่วยมี dialog ระบบ “AnpingClinic ไม่ตอบสนอง” พร้อมปิดแอป/รอ | มี ANR จริง ต้องตรวจข้อมูล Android เพิ่ม; ภาพอย่างเดียวระบุ thread หรือ stack ต้นเหตุไม่ได้ |
| 8–11 วินาที | กลับหน้าหลัก Android แล้วเปิดแอปใหม่ ผ่าน splash/loading | พื้นที่ขาวช่วงนี้เป็นส่วนของการเริ่มแอป ไม่ใช้เป็นหลักฐานภาพหายระหว่าง sidebar |
| 24.4–24.5 วินาที | เมื่อ sidebar ขยาย พื้นการ์ด KPI ข้อความ และพื้นกล่องกราฟหาย แต่เส้นกราฟ SVG, sidebar และหัวหน้ายังอยู่ | น่าสงสัยงาน paint/raster/compositing หรือการซ้อนชั้นภาพ มากกว่าการถอดแถวของ virtual list; ยังต้องตรวจ DOM/computed style ขณะเกิดจริง |
| 25.0 วินาที | เมื่อ sidebar กลับมายุบ เกิดภาพหายลักษณะเดียวกัน แล้วกลับมาที่ตัวอย่าง 25.1 วินาที | พบซ้ำสัมพันธ์กับการเปลี่ยนความกว้าง ไม่ใช่เฉพาะตอนโหลดข้อมูลใหม่ |

ตรวจภาพช่วง 23.8–25.7 วินาทีทุก 0.1 วินาทีด้วย OpenCV: พื้นที่การ์ด KPI ที่กำหนดไว้มีพิกเซลสีอิ่มตัวประมาณ 190,000–202,000 เมื่อแสดงปกติ ลดเหลือ 0 ที่ 24.4, 24.5 และ 25.0 ขณะที่บริเวณกราฟยังมีพิกเซลสีอยู่ สอดคล้องกับการดูภาพโดยตรง การตรวจนี้ยืนยันอาการในไฟล์บันทึกเท่านั้น ไม่ใช่ profiler และไม่พิสูจน์สาเหตุทาง GPU

ANR กับภาพหายอาจมีต้นเหตุร่วมกันหรือเป็นคนละปัญหา ต้องแยกเก็บหลักฐาน

## สิ่งที่พบในโค้ด

### 1. Sidebar ยังเปลี่ยน layout ของเนื้อหาทุกจังหวะ

- `src/App.jsx:891`: เปิด/ปิดโดย transition `width` ระหว่าง 80 และ 256px เป็นเวลา 260ms
- `src/App.jsx:1001`: ระหว่างลากเขียน width ผ่าน requestAnimationFrame
- `src/App.jsx:4320`: main เป็น flex sibling ที่รับความกว้างที่เหลือ

Virtualization ลดจำนวนรายการที่สร้าง แต่ไม่ได้ยกเลิกการจัดวางใหม่ของหน้า ปุ่ม กราฟ หรือองค์ประกอบที่แสดงอยู่ จึงยังมีงาน layout/paint เมื่อ sidebar เปลี่ยนความกว้าง

### 2. มี effect และการบังคับสร้างชั้นภาพที่ควรแยกทดสอบ

- `src/index.css:98`: ทุก class ที่ชื่อมี `backdrop-blur` ได้ `backface-visibility: hidden` และ `transform: translateZ(0)`
- `src/App.jsx:3883`: มีพื้นหลัง fixed สองจุด ใช้ `blur-[100px]`
- `src/App.jsx:5032`: sticky header มี backdrop-filter; ส่วน filter มี effect เพิ่มในบริเวณบรรทัด 5236
- `src/pages/ExecutiveDashboard.jsx:3162`: ไอคอนบนการ์ดมี backdrop blur; กราฟหลักเป็น SVG ที่บรรทัด 3416

รูปแบบภาพที่หายเป็นบางกลุ่มทำให้เส้นทางวาดและประกอบภาพเป็นสมมติฐานอันดับต้น แต่ยังไม่มีผล A/B ที่ยืนยันว่า blur หรือ translateZ เป็นตัวต้นเหตุ อย่าเปลี่ยน layer type หรือปิด GPU ทั้งแอปโดยอาศัยภาพอย่างเดียว

### 3. มีผู้เขียนสถานะ native scroll ซ้ำ และให้คำตอบต่างกัน

- `src/App.jsx:3051`: effect ติดตั้ง touchstart/scroll/touchend และส่ง `AndroidCardBridge.setCanScrollUp`
- `android-card-agent/app/src/main/java/com/anping/cardagent/MainActivity.kt:495`: inject listener อีกชุด รวม touchmove และส่ง bridge เดียวกัน
- ฝั่ง injected script ตรวจว่าแตะ sidebar หรือกำลังลาก/animate แล้วคืน true
- ฝั่ง React ไม่มีเงื่อนไขดังกล่าว เมื่อทุก scrollTop อยู่ที่ 0 จึงคืน false
- ทั้งสองชุดมี cache ค่าส่งล่าสุดของตัวเอง

ทดสอบโดยดึงตัวฟังก์ชันจาก source จริงมารันด้วย Node VM และ DOM จำลองชุดเดียวกัน:

| สถานการณ์ | React | Injected script |
| --- | --- | --- |
| แตะ sidebar ขณะเนื้อหาอยู่บนสุด | false | true |
| sidebar กำลัง animate | false | true |
| กำลังลาก sidebar | false | true |

นี่เป็นความขัดแย้งของตรรกะที่พิสูจน์ได้จาก source สถานะสุดท้ายยังขึ้นกับลำดับ callback และ cache ของแต่ละชุด มีโอกาสให้ SwipeRefreshLayout ตัดสินใจรับ gesture ไม่ตรงกับเว็บ แต่การทดสอบนี้ยังไม่พิสูจน์ว่าเกิด ANR หรือภาพหายจากจุดนี้

`activity_main.xml:11` ครอบ WebView ด้วย SwipeRefreshLayout และ `MainActivity.kt:272` ใช้สถานะนี้ตัดสินว่า child เลื่อนขึ้นได้หรือไม่ เป็นเส้นทางเพิ่มเติมที่ไม่มีใน browser ปกติ

### 4. Virtualization ที่ลงไปยังไม่ครบเงื่อนไขในแผน

- ทั้งสามหน้ายังสร้าง virtualizer สองตัว และ mount ทั้งตารางกับการ์ด แล้วซ่อนด้วย `hidden lg:block` / `lg:hidden` เช่น `MedicalRecords.jsx:2511`, `:2521`, `:2851`, `:2938` ไม่ตรงข้อกำหนดให้ mount เฉพาะรูปแบบที่ใช้งาน
- `src/hooks/useVirtualRows.js` ยังไม่มีการชดเชยตำแหน่งเริ่มรายการหลังส่วนหัว/ตัวกรอง (`scrollMargin` หรือกลไกเทียบเท่า)
- การ์ดใช้ `space-y-*` แต่ hook ไม่รับ `gap` หรือรวมระยะห่างเข้าขนาดรายการ
- ยังไม่พบกลไกเก็บ anchor ID และ offset สำหรับ resize ตามแผน; sidebar จบด้วย timeout 270ms เช่นเดิม

ประเด็นเหล่านี้ควรแก้และตรวจการเลื่อน/การวัดขนาด แต่ไม่อธิบายภาพหายบน ExecutiveDashboard ด้วยตัวเอง เพราะหน้านั้นไม่ได้ใช้ hook นี้

### 5. Hardware acceleration เปิดอยู่ใน source แล้ว

- `AndroidManifest.xml:42`: `android:hardwareAccelerated="true"`
- `MainActivity.kt:169`: ตั้ง `FLAG_HARDWARE_ACCELERATED`
- `MainActivity.kt:277`: ใช้ `LAYER_TYPE_NONE`

`LAYER_TYPE_NONE` หมายถึงไม่สร้าง offscreen layer เฉพาะ View ไม่ใช่สั่งปิด hardware acceleration จึงยังไม่มีเหตุผลให้สรุปว่าแอปช้าเพราะลืมเปิด GPU

## เหตุใด browser อาจลื่นกว่า APK

APK ใช้ Android WebView พร้อม SwipeRefreshLayout และ JavaScript bridge ส่วน browser ปกติไม่มี wrapper และ bridge ชุดนี้ รวมถึงอาจใช้ engine คนละเวอร์ชัน/การตั้งค่า viewport ต่างกัน ต้องเทียบบนเครื่องเดียวกัน URL/build/data เดียวกันจึงแยกผลของ wrapper ได้

ผู้ใช้แจ้งว่า browser ลื่น แต่ขณะเขียนบันทึกยังไม่ได้ยืนยันว่าเป็น browser บนแท็บเล็ตเครื่องเดียวกันหรือคอมพิวเตอร์ จึงยังไม่ถือเป็นการทดลองควบคุม

เว็บ production ที่ตรวจขณะวิเคราะห์มี `getVirtualItems` และ `measureElement` ใน bundle แล้ว จึงมีหลักฐานว่า production ปัจจุบันรวม virtualization อย่างไรก็ตามไม่ได้ยืนยันว่า WebView ในช่วงอัดคลิปโหลด bundle เดียวกัน

## ลำดับพิสูจน์สาเหตุรอบถัดไป

1. เก็บรุ่นเครื่อง Android, WebView provider/version, Chrome version, APK version, viewport และ build เว็บจริง พร้อม Android ANR/logcat/Perfetto และ WebView Performance trace ของจังหวะเดิม
2. ทำ baseline บนเครื่องเดียวกัน: Chrome เทียบ APK ที่หน้า ExecutiveDashboard แล้วกดเปิด–ปิด/ลาก sidebar แบบเดิม ตรวจทั้งภาพหาย frame time และ main-thread stalls
3. ทดลองแยกทีละตัวใน build ทดสอบ: ปิด backdrop blur, ปิดกฎ forced translateZ/backface, ปิด fixed background blur แล้วกลับค่าเดิมทุกครั้ง ถ้าภาพหายหายไปและ DOM/ข้อมูลไม่เปลี่ยน จะสนับสนุนปัญหาการวาดภาพ
4. ทดลองปิด native pull-to-refresh/scroll bridge ชั่วคราวโดยคง CSS เดิม ถ้าอาการรับนิ้วผิดหรือค้างดีขึ้น จะสนับสนุนปัญหา wrapper; จากนั้นรวมผู้รับผิดชอบสถานะ gesture ให้เหลือชุดเดียว
5. ใช้ ANR stack/Perfetto ระบุงานหรือการรอที่ทำให้แอปไม่ตอบสนอง แยกจากการวิเคราะห์เฟรมที่ภาพหาย
6. แก้ช่องว่างของ virtualization และตรวจจำนวน DOM, offset, gap, anchor บนสามหน้าที่เกี่ยวข้อง แล้ววัดก่อน–หลังบนแท็บเล็ตซ้ำ

เกณฑ์แยกสมมติฐาน: ถ้าปิด effect แล้วภาพยังหาย สมมติฐาน effect จะอ่อนลง; ถ้าปิด bridge แล้ว ANR ยังเกิด ต้องตรวจ stack ต่อ; ถ้าอาการยังเกิดใน ExecutiveDashboard ย่อมยังไม่สามารถปิดงานด้วยการแก้ virtual list เพียงอย่างเดียว

## ขอบเขตการตรวจครั้งนี้

- แยกภาพตามเวลา ตรวจช่วงเกิดปัญหา และวัดการหายของพื้นที่สีในคลิป
- ตรวจ source, แผนเดิม, Git diff/log แบบอ่านอย่างเดียว และ asset เว็บ production แบบอ่านอย่างเดียว
- ทดสอบความต่างของสอง scroll predicate จาก source จริงด้วย DOM จำลอง
- เรียก `C:\Android\sdk\platform-tools\adb.exe devices -l` แล้วไม่พบอุปกรณ์ จึงยังไม่มี live reproduction, ANR stack หรือ performance trace ของเครื่องที่มีปัญหา
- ไม่ได้รัน build/lint เพราะไม่ได้แก้โค้ดผลิตภัณฑ์ และผลเหล่านั้นไม่ยืนยันอาการบนแท็บเล็ต
- ไม่คัดข้อมูลคนไข้จากภาพลงรายงาน

## เอกสารประกอบ

- [Android: Diagnose and fix ANRs](https://developer.android.com/topic/performance/anrs/diagnose-and-fix-anrs)
- [Android: Hardware acceleration และ View layers](https://developer.android.com/develop/ui/views/graphics/hardware-accel)
- [Chrome: Remote debugging WebViews](https://developer.chrome.com/docs/devtools/remote-debugging/webviews/)
- [TanStack Virtual: Virtualizer API — enabled, scrollMargin, gap](https://tanstack.com/virtual/latest/docs/api/virtualizer)

# Gemini CLI Session Progress & Context Log

**Project Name:** Anping Clinic (ระบบจัดการคลินิกอัญพิง)
**Last Updated:** วันอังคารที่ 21 เมษายน 2569
**Tech Stack:** React 19, Vite, Tailwind CSS 4, Google Apps Script (GAS), Thai Smart Card Integration (via WebSocket).

---

## 🚀 สถานะปัจจุบัน (Current State)
- ระบบจัดการคลินิกประกอบด้วย 4 ส่วนหลัก:
    1. **Dashboard:** สรุปภาพรวมและคิวประจำวัน
    2. **Appointment Manager:** ระบบนัดหมายคนไข้ ค้นหาด้วย HN และสร้างประวัติใหม่อัตโนมัติหากไม่พบข้อมูล
    3. **Medical Records (OPD):** ระบบเวชระเบียน เก็บประวัติการรักษา อาการเบื้องต้น และบันทึก OPD
    4. **Catalog Manager:** ระบบจัดการรายการสินค้า, หัตถการ, และคอร์ส (ตัดสต็อก/นับครั้ง)
- **การเชื่อมต่อ Backend:** ใช้ Google Apps Script (`GOOGLE_SCRIPT_URL` ใน `App.jsx`) เพื่อบันทึกข้อมูลลงใน Google Sheets (Sheets: `Patients`, `Queue`, `setting_pos`).
- **Smart Card:** มีระบบ `thai-card-agent/server.cjs` สำหรับอ่านบัตรประชาชนผ่าน WebSocket (Port 8080).

---

## 🛠️ การแก้ไขล่าสุด (Last Improvements)
- **Refactoring:** มีการพยายามแยก `CatalogManager` ออกจากไฟล์หลัก `App.jsx` เพื่อลดขนาดไฟล์ (ดูไฟล์ `catalog.txt` และ `refactor.js`).
- **UI/UX:** ปรับแต่ง CSS ให้เป็นสไตล์ Glassmorphism, มี Sticky Header ที่ย่อขนาดได้เมื่อ Scroll และ Sticky Filter สำหรับตารางนัดหมาย.
- **Optimization:** ใช้ `useMemo` และ `React.memo` ในส่วนที่คำนวณบ่อย (เช่น การรวมข้อมูล Queue กับ Patient Data).

---

## 📂 โครงสร้างไฟล์สำคัญ
- `src/App.jsx`: ไฟล์หลักของระบบ (ปัจจุบันมีขนาดใหญ่มาก ~3,600+ บรรทัด)
- `src/App.txt`: ไฟล์สำรองของโค้ดหลักก่อนการแก้ไขครั้งใหญ่
- `catalog.txt`: โค้ดของ Component Catalog Manager ที่แยกออกมาแล้ว
- `refactor.js`: สคริปต์ Node.js สำหรับแยกโค้ด `App.jsx` โดยอัตโนมัติ
- `thai-card-agent/server.cjs`: Backend สำหรับอ่านบัตรประชาชน
- `inject.cjs`: สคริปต์ช่วย Inject โค้ดหรือจัดการไฟล์

---

## 📝 สิ่งที่ต้องทำต่อ (Next Tasks)
- [ ] **Finish Refactoring:** นำโค้ดที่แยกไว้ใน `catalog.txt` มาใช้งานจริงในโปรเจกต์อย่างเต็มตัว และลบโค้ดส่วนเกินออกจาก `App.jsx`.
- [ ] **Component Separation:** แยก Component อื่นๆ (Appointment, MedicalRecords) ออกจาก `App.jsx` ไปไว้ในไฟล์ย่อยเพื่อความง่ายในการดูแล.
- [ ] **Error Handling:** ปรับปรุงส่วนการแจ้งเตือน (Toast) และการรับมือข้อผิดพลาดเมื่อ GAS API ตอบสนองช้า.
- [ ] **Data Sync:** ตรวจสอบความถูกต้องของการ Sync ข้อมูลระหว่างแอปพลิเคชันกับ Google Sheets ในทุกฟังก์ชัน.

---

## 💡 แนวทางการคุย (Prompt Guidance for Gemini)
หากเปลี่ยนบัญชี Gemini CLI ให้บอก Gemini ว่า:
> "อ่านไฟล์ `GEMINI_SESSION.md` เพื่อรับทราบสถานะล่าสุดของโปรเจกต์ Anping Clinic และสานต่องานจากส่วน 'Next Tasks' ได้เลย"

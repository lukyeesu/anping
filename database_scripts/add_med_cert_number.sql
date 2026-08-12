-- เพิ่มคอลัมน์ med_cert_number ในตาราง treatments สำหรับเก็บเลขที่ใบรับรองแพทย์
ALTER TABLE public.treatments ADD COLUMN IF NOT EXISTS med_cert_number VARCHAR;

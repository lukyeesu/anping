import {
  Stethoscope, Package, Pill, Briefcase, Users, Clock, CalendarDays, FileText, CreditCard, Tag,
  Activity, Plus, List, ShoppingCart, Truck
} from 'lucide-react';

export const POS_ICONS = {
  Stethoscope, Package, Pill, Briefcase, Users, Clock, CalendarDays, FileText, CreditCard, Tag, 
  Heart: Activity, Syringe: Plus, Scissors: Plus, 
  List, ShoppingCart, Truck
};

export const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL || "/api/db"; 

export const LOCAL_VISION_API_KEY = import.meta.env.DEV ? import.meta.env.VITE_VISION_API_KEY : null;

export const monthsTH = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
export const monthsShortTH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
export const daysTH = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
export const daysShortTH = ['อา','จ','อ','พ','พฤ','ศ','ส'];

export const systemStatusTypes = [
    { value: 'confirmed', label: 'ยืนยันแล้ว', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { value: 'pending', label: 'รอยืนยัน', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { value: 'cancelled', label: 'ยกเลิก', color: 'bg-rose-100 text-rose-700 border-rose-200' },
    { value: 'postponed', label: 'เลื่อนนัด', color: 'bg-violet-100 text-violet-700 border-violet-200' }
];

export const colorPresets = [
    { key: 'amber', name: 'ส้ม/เหลือง', bg: 'bg-amber-500', class: 'bg-amber-100 text-amber-700 border-amber-200', value: 'amber' },
    { key: 'emerald', name: 'เขียว', bg: 'bg-emerald-500', class: 'bg-emerald-100 text-emerald-700 border-emerald-200', value: 'emerald' },
    { key: 'rose', name: 'แดง', bg: 'bg-rose-500', class: 'bg-rose-100 text-rose-700 border-rose-200', value: 'rose' },
    { key: 'sky', name: 'ฟ้า', bg: 'bg-sky-500', class: 'bg-sky-100 text-sky-700 border-sky-200', value: 'sky' },
    { key: 'violet', name: 'ม่วง', bg: 'bg-violet-500', class: 'bg-violet-100 text-violet-700 border-violet-200', value: 'violet' },
    { key: 'indigo', name: 'น้ำเงิน', bg: 'bg-indigo-500', class: 'bg-indigo-100 text-indigo-700 border-indigo-200', value: 'indigo' },
    { key: 'teal', name: 'เขียวอมฟ้า', bg: 'bg-teal-500', class: 'bg-teal-100 text-teal-700 border-teal-200', value: 'teal' },
    { key: 'fuchsia', name: 'ชมพู', bg: 'bg-fuchsia-500', class: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200', value: 'fuchsia' },
    { key: 'slate', name: 'เทา', bg: 'bg-slate-500', class: 'bg-slate-100 text-slate-700 border-slate-200', value: 'slate' }
];

export const EMPTY_ARRAY = [];

export default function handler(req, res) {
  const { tel, phone } = req.query;
  const target = tel || phone || '';
  const cleanDigits = String(target).replace(/\D/g, '');

  if (!cleanDigits) {
    res.writeHead(302, { Location: 'https://anpingclinic.vercel.app' });
    res.end();
    return;
  }

  // HTTP 302 Header Redirect ตรงไปที่ tel: ทันที ไม่ต้องโหลดหน้าเว็บหรือประมวลผล DOM
  res.writeHead(302, {
    'Location': `tel:${cleanDigits}`,
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Content-Type': 'text/html; charset=utf-8'
  });
  // Fallback ขนาดเล็กมากระดับไบต์ รองรับเบราว์เซอร์ทุกรุ่น
  res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=tel:${cleanDigits}"><script>location.replace("tel:${cleanDigits}");</script></head><body></body></html>`);
}

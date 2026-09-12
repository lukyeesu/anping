export default function handler(req, res) {
  const { tel, phone } = req.query;
  const target = tel || phone || '';
  const cleanDigits = String(target).replace(/\D/g, '');
  
  if (!cleanDigits) {
    res.writeHead(302, { Location: 'https://anpingclinic.vercel.app' });
    res.end();
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>โทรออก: ${cleanDigits}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script>
    window.location.href = "tel:${cleanDigits}";
  </script>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #0f172a;">
  <div style="background: white; padding: 28px; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); text-align: center; max-width: 320px; width: 90%;">
    <div style="font-size: 40px; margin-bottom: 12px;">📞</div>
    <h2 style="margin: 0 0 8px 0; font-size: 20px; color: #0284c7;">กำลังโทรออกหาคนไข้</h2>
    <p style="color: #334155; font-size: 22px; font-weight: bold; margin: 8px 0 20px 0; letter-spacing: 0.5px;">${target}</p>
    <a href="tel:${cleanDigits}" style="display: block; background: #0284c7; color: white; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: bold; font-size: 16px;">
      กดตรงนี้หากไม่โทรออกอัตโนมัติ
    </a>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.writeHead(200);
  res.end(html);
}

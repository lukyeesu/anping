export default async function handler(req, res) {
  // รับ Request จากเบราว์เซอร์
  const requestData = req.body;

  // ใช้ URL จาก Vercel Environment Variables
  // (ต้องไปตั้งค่า GOOGLE_SCRIPT_URL ในหน้า Vercel Settings -> Environment Variables)
  const googleScriptUrl = process.env.GOOGLE_SCRIPT_URL;

  if (!googleScriptUrl) {
      return res.status(500).json({ status: 'error', message: 'Missing GOOGLE_SCRIPT_URL in Vercel Environment Variables' });
  }

  try {
    const response = await fetch(googleScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      // แอบส่งข้อมูลต่อไปยัง Google Apps Script
      body: typeof requestData === 'string' ? requestData : JSON.stringify(requestData)
    });

    const responseText = await response.text();

    // ดักจับกรณี Google ส่ง HTML กลับมา (Error)
    if (responseText.trim().startsWith('<') || responseText.includes('<!DOCTYPE html>')) {
      return res.status(500).json({ status: 'error', message: 'สิทธิ์การเข้าถึงฐานข้อมูลไม่ถูกต้อง หรือติดหน้า HTML' });
    }

    const result = JSON.parse(responseText);
    
    // ส่งข้อมูลที่ได้กลับไปให้หน้าเว็บ React
    return res.status(200).json(result);

  } catch (error) {
    console.error('DB Proxy Error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch data from Google Apps Script' });
  }
}

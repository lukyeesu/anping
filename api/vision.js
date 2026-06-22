export default async function handler(req, res) {
  const requestData = req.body;
  
  // ต้องไปตั้งค่า VISION_API_KEY ใน Vercel Environment Variables
  const visionApiKey = process.env.VISION_API_KEY;

  if (!visionApiKey) {
      return res.status(500).json({ status: 'error', message: 'Missing VISION_API_KEY in Vercel Environment Variables' });
  }

  const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`;

  try {
    const response = await fetch(visionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      // แอบส่งภาพต่อไปให้ Google Vision
      body: typeof requestData === 'string' ? requestData : JSON.stringify(requestData)
    });

    const result = await response.json();
    return res.status(200).json(result);

  } catch (error) {
    console.error('Vision Proxy Error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch data from Google Vision API' });
  }
}


export default async function handler(req, res) {
  const { text, lang = 'th' } = req.query;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  // URL ของ Google Translate TTS (client=tw-ob เป็น client สำหรับ browser/extension ที่เสถียร)
  const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;

  try {
    const response = await fetch(googleTtsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://translate.google.com/'
      }
    });

    if (!response.ok) {
      throw new Error(`Google TTS responded with ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ส่งไฟล์เสียงกลับไปที่ Frontend
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200'); // Cache 24 ชม.
    return res.send(buffer);

  } catch (error) {
    console.error('TTS Proxy Error:', error);
    return res.status(500).json({ error: 'Failed to fetch audio from Google' });
  }
}

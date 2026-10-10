// Vercel Serverless Function — Proxy ke amfinder.web.id/api/find
// Menangani Server-Sent Events (SSE)

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
};

export default async function handler(req, res) {
  // Izinkan CORS dari domain manapun (atau ganti jadi domain kamu sendiri)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url = req.query.url;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Parameter url wajib diisi' });
  }

  try {
    const target = `https://amfinder.web.id/api/find?url=${encodeURIComponent(url)}`;
    const upstream = await fetch(target, {
      headers: {
        'User-Agent': 'AMFinder-Proxy/1.0',
        Accept: 'text/event-stream',
      },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: `Upstream error: ${upstream.status}`,
      });
    }

    // Stream SSE ke client
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      res.write(chunk);
    }

    res.end();
  } catch (err) {
    console.error('[api/find]', err);
    // Kalau header belum dikirim, balas JSON error
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Proxy error' });
    } else {
      res.end();
    }
  }
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Query tidak boleh kosong' });
  }

  try {
    const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Gagal fetch Deezer');
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('Deezer error:', err.message);
    return res.status(500).json({ error: 'Gagal menghubungi Deezer' });
  }
}

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Serve static files (HTML)
app.use(express.static('.'));

// ============================================================
// 🎵 PROXY DEEZER — /api/search?q=judul+artis
// ============================================================
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Query tidak boleh kosong' });

  try {
    const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Gagal fetch Deezer');
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Deezer error:', err.message);
    res.status(500).json({ error: 'Gagal menghubungi Deezer' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server jalan di http://localhost:${PORT}`);
});

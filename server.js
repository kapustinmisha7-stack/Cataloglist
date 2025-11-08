// server.js
// Tiny proxy to avoid browser CORS when calling Roblox APIs.
// Run: npm i express cors node-fetch && node server.js

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 8787;

app.use(cors()); // In production, restrict origin
app.use(express.json({ limit: '512kb' }));

// Proxy to Roblox Catalog item details
app.post('/roblox/catalog/items/details', async (req, res) => {
  try {
    const upstream = 'https://catalog.roblox.com/v1/items/details';
    const r = await fetch(upstream, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req.body || {}),
    });
    const text = await r.text();
    res.status(r.status).type(r.headers.get('content-type') || 'application/json').send(text);
  } catch (e) {
    res.status(502).json({ error: 'Upstream error', detail: String(e?.message || e) });
  }
});

// Lightweight Rolimons filter endpoint
// Accepts ?ids=comma,separated list, returns { [id]: { name, rap, value, price } }
app.get('/rolimons/itemdetails', async (req, res) => {
  try {
    const ids = String(req.query.ids || '')
      .split(',')
      .map(s => Number(s.trim()))
      .filter(n => Number.isFinite(n) && n > 0);
    if (!ids.length) return res.json({});

    const upstream = 'https://www.rolimons.com/itemapi/itemdetails';
    const r = await fetch(upstream);
    if (!r.ok) return res.status(r.status).json({ error: 'Rolimons upstream failed' });
    const all = await r.json();

    const out = {};
    for (const id of ids) {
      const arr = all.items?.[id];
      if (!arr) continue;
      // arr layout: [name, rap, value, demand, trend, projected, hyped, rare, itemType, ...]
      const row = {
        name: arr[0],
        rap: Number(arr[1] ?? 0),
        value: Number(arr[2] ?? 0),
      };
      row.price = row.value || row.rap || 0;
      out[id] = row;
    }
    res.json(out);
  } catch (e) {
    res.status(502).json({ error: 'Upstream error', detail: String(e?.message || e) });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy listening on http://localhost:${PORT}`);
});

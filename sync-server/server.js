const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PORT = process.env.PORT || 3500;

fs.mkdirSync(DATA_DIR, { recursive: true });

let cache = { data: null, updated_at: 0 };
if (fs.existsSync(DB_FILE)) {
  try { cache = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch (e) { console.error('db.json unreadable, starting fresh:', e); }
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));

app.get('/api/db', (req, res) => res.json(cache));

app.post('/api/db', (req, res) => {
  const data = req.body && req.body.data;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'expected { data: {...} }' });
  }
  cache = { data, updated_at: Date.now() };
  try {
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(cache), 'utf8');
    fs.renameSync(tmp, DB_FILE);
  } catch (e) {
    console.error('persist failed:', e);
    return res.status(500).json({ error: 'failed to persist' });
  }
  res.json({ ok: true, updated_at: cache.updated_at });
});

app.use(express.static(ROOT));
app.get('/', (req, res) => res.sendFile(path.join(ROOT, 'نظام_الراجع.html')));

app.listen(PORT, () => {
  console.log(`Sync server running on port ${PORT}`);
  console.log(`On this PC:   http://localhost:${PORT}`);
  console.log(`Find your LAN IP with "ipconfig" and share http://<that-ip>:${PORT} with other PCs`);
});

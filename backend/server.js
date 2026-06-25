const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const { getDb, initDb } = require('./db');

const app = express();
const PORT = 3001;
const JWT_SECRET = 'refund-system-jwt-secret-2024';

app.use(cors());
app.use(express.json());

initDb();

// ─── Auth Middleware ───────────────────────────────────────────────────────────
const auth = (roles = []) => (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'غير مصرح' });
  try {
    const user = jwt.verify(token, JWT_SECRET);
    if (roles.length && !roles.includes(user.role)) {
      return res.status(403).json({ error: 'ليس لديك صلاحية' });
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'توكن غير صالح' });
  }
};

// ─── Problem Type Routing Logic ────────────────────────────────────────────────
const PROBLEM_ROUTING = {
  'warranty_working_after_inspection': { dest: 'working', auto: true },
  'warranty_writing_error':            { dest: 'working', auto: true },
  'warranty_high_price':               { dest: 'working', auto: true },
  'warranty_prep_error':               { dest: 'working', auto: true },
  'warranty_factory_defect':           { dest: 'damaged', auto: true },
  'not_ours':                          { dest: 'customer_return', auto: true },
  'out_warranty_working':              { dests: ['working','customer_return','damaged'], auto: false },
  'out_warranty_broken':               { dests: ['damaged','customer_return'], auto: false },
  'out_warranty_damaged':              { dests: ['damaged','customer_return'], auto: false, needsNote: true },
  'out_warranty_used':                 { dests: ['damaged','customer_return'], auto: false, needsNote: true },
  'out_warranty_expired':              { dests: ['damaged','customer_return'], auto: false, needsNote: true },
  'out_warranty_factory_fault':        { dests: ['damaged','customer_return'], auto: false, needsNote: true },
  'return_damaged':                    { dest: 'damaged', auto: true },
  'pending':                           { dest: 'pending', auto: true },
};

// ─── AUTH ROUTES ───────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }
  const token = jwt.sign(
    { id: user.id, username: user.username, full_name: user.full_name, role: user.role },
    JWT_SECRET, { expiresIn: '24h' }
  );
  res.json({ token, user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role } });
});

app.get('/api/auth/me', auth(), (req, res) => res.json(req.user));

// ─── USER MANAGEMENT ───────────────────────────────────────────────────────────
app.get('/api/users', auth(['admin']), (req, res) => {
  const users = getDb().prepare('SELECT id, username, full_name, role, created_at FROM users ORDER BY id').all();
  res.json(users);
});

app.post('/api/users', auth(['admin']), (req, res) => {
  const { username, password, full_name, role } = req.body;
  try {
    const hashed = bcrypt.hashSync(password, 10);
    const r = getDb().prepare('INSERT INTO users (username, password, full_name, role) VALUES (?,?,?,?)').run(username, hashed, full_name, role);
    res.json({ id: r.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: 'اسم المستخدم موجود مسبقاً' });
  }
});

app.put('/api/users/:id', auth(['admin']), (req, res) => {
  const { full_name, role, password } = req.body;
  const db = getDb();
  if (password) {
    db.prepare('UPDATE users SET full_name=?, role=?, password=? WHERE id=?').run(full_name, role, bcrypt.hashSync(password, 10), req.params.id);
  } else {
    db.prepare('UPDATE users SET full_name=?, role=? WHERE id=?').run(full_name, role, req.params.id);
  }
  res.json({ ok: true });
});

app.delete('/api/users/:id', auth(['admin']), (req, res) => {
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: 'لا يمكن حذف حسابك' });
  getDb().prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ─── CUSTOMERS ─────────────────────────────────────────────────────────────────
app.get('/api/customers', auth(), (req, res) => {
  res.json(getDb().prepare('SELECT * FROM customers ORDER BY name').all());
});

app.post('/api/customers', auth(['admin','manager']), (req, res) => {
  const { customer_code, name, default_price } = req.body;
  try {
    const r = getDb().prepare('INSERT INTO customers (customer_code, name, default_price) VALUES (?,?,?)').run(customer_code, name, default_price || 0);
    res.json({ id: r.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: 'رمز الزبون موجود مسبقاً' });
  }
});

app.put('/api/customers/:id', auth(['admin','manager']), (req, res) => {
  const { name, default_price } = req.body;
  getDb().prepare('UPDATE customers SET name=?, default_price=? WHERE id=?').run(name, default_price, req.params.id);
  res.json({ ok: true });
});

// ─── STAGE 1: RECEPTION ────────────────────────────────────────────────────────
app.get('/api/reception', auth(), (req, res) => {
  const { customer_code, date_from, date_to } = req.query;
  let q = 'SELECT * FROM receptions WHERE 1=1';
  const params = [];
  if (customer_code) { q += ' AND customer_code=?'; params.push(customer_code); }
  if (date_from) { q += ' AND receipt_date >= ?'; params.push(date_from); }
  if (date_to) { q += ' AND receipt_date <= ?'; params.push(date_to); }
  q += ' ORDER BY created_at DESC';
  res.json(getDb().prepare(q).all(...params));
});

app.post('/api/reception', auth(['admin','reception','inventory']), (req, res) => {
  const { customer_code, customer_name, receiver_name, receipt_date, carton_qty, piece_qty } = req.body;
  const db = getDb();
  // Auto-generate list sequence: LS-YYYYMMDD-XXXX
  const dateStr = (receipt_date || new Date().toISOString().slice(0,10)).replace(/-/g,'');
  const count = db.prepare("SELECT COUNT(*) as c FROM receptions WHERE list_sequence LIKE ?").get(`LS-${dateStr}-%`).c;
  const list_sequence = `LS-${dateStr}-${String(count + 1).padStart(4,'0')}`;
  try {
    db.prepare(`INSERT INTO receptions (list_sequence,customer_code,customer_name,receiver_name,receipt_date,carton_qty,piece_qty,created_by) VALUES (?,?,?,?,?,?,?,?)`)
      .run(list_sequence, customer_code, customer_name, receiver_name, receipt_date, carton_qty||0, piece_qty||0, req.user.id);
    res.json({ list_sequence });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/reception/sequences/:customer_code', auth(), (req, res) => {
  const rows = getDb().prepare('SELECT list_sequence, receipt_date FROM receptions WHERE customer_code=? ORDER BY receipt_date DESC').all(req.params.customer_code);
  res.json(rows);
});

// ─── STAGE 2: INVENTORY (COUNTING) ────────────────────────────────────────────
app.get('/api/inventory', auth(), (req, res) => {
  const { list_sequence, customer_code } = req.query;
  let q = 'SELECT * FROM inventory_items WHERE 1=1';
  const params = [];
  if (list_sequence) { q += ' AND list_sequence=?'; params.push(list_sequence); }
  if (customer_code) { q += ' AND customer_code=?'; params.push(customer_code); }
  q += ' ORDER BY id ASC';
  res.json(getDb().prepare(q).all(...params));
});

app.post('/api/inventory/item', auth(['admin','inventory']), (req, res) => {
  const { list_sequence, customer_code, customer_name, item_name, qty, barcode, price, receipt_date, note } = req.body;
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as c FROM inventory_items WHERE list_sequence=?').get(list_sequence).c;
  try {
    const r = db.prepare(`INSERT INTO inventory_items (list_sequence,customer_code,customer_name,item_name,qty,qty_remaining,barcode,price,receipt_date,count_date,note,created_by) VALUES (?,?,?,?,?,?,?,?,?,date('now'),?,?)`)
      .run(list_sequence, customer_code, customer_name, item_name, qty, qty, barcode||null, price||0, receipt_date||null, note||null, req.user.id);
    res.json({ id: r.lastInsertRowid, sr: count + 1 });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/inventory/item/:id', auth(['admin','inventory']), (req, res) => {
  const { item_name, qty, price, note } = req.body;
  getDb().prepare('UPDATE inventory_items SET item_name=?, qty=?, qty_remaining=qty_remaining+(? - qty), price=?, note=? WHERE id=?')
    .run(item_name, qty, qty, price||0, note||null, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/inventory/item/:id', auth(['admin','inventory']), (req, res) => {
  getDb().prepare('DELETE FROM inventory_items WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// Move inventory items to audit stage
app.post('/api/inventory/send-to-audit', auth(['admin','inventory']), (req, res) => {
  const { list_sequence, customer_code, inspector_name } = req.body;
  const db = getDb();
  const items = db.prepare('SELECT * FROM inventory_items WHERE list_sequence=? AND customer_code=? AND status=?').all(list_sequence, customer_code, 'audit');
  if (!items.length) return res.status(400).json({ error: 'لا توجد عناصر للإرسال' });
  const insertAudit = db.prepare(`INSERT INTO audit_items (inventory_item_id,list_sequence,customer_code,customer_name,item_name,qty_original,qty_remaining,price,receipt_date,count_date,inspector_name,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  const updateInv = db.prepare('UPDATE inventory_items SET status=? WHERE id=?');
  const tx = db.transaction(() => {
    for (const item of items) {
      insertAudit.run(item.id, item.list_sequence, item.customer_code, item.customer_name, item.item_name, item.qty_remaining, item.qty_remaining, item.price, item.receipt_date, item.count_date, inspector_name||null, req.user.id);
      updateInv.run('sent_to_audit', item.id);
    }
  });
  tx();
  res.json({ ok: true, count: items.length });
});

// ─── STAGE 3: AUDIT ────────────────────────────────────────────────────────────
app.get('/api/audit', auth(), (req, res) => {
  const { list_sequence, customer_code } = req.query;
  let q = "SELECT * FROM audit_items WHERE status='pending'";
  const params = [];
  if (list_sequence) { q += ' AND list_sequence=?'; params.push(list_sequence); }
  if (customer_code) { q += ' AND customer_code=?'; params.push(customer_code); }
  q += ' ORDER BY id ASC';
  res.json(getDb().prepare(q).all(...params));
});

app.put('/api/audit/item/:id', auth(['admin','auditor']), (req, res) => {
  const { item_name, qty, note } = req.body;
  getDb().prepare('UPDATE audit_items SET item_name=?, note=? WHERE id=?').run(item_name, note||null, req.params.id);
  res.json({ ok: true });
});

// Transfer item from audit to a destination
app.post('/api/audit/transfer', auth(['admin','auditor']), (req, res) => {
  const { audit_item_id, qty, problem_type, destination, note, compensation_type, price } = req.body;
  const db = getDb();
  const item = db.prepare('SELECT * FROM audit_items WHERE id=?').get(audit_item_id);
  if (!item) return res.status(404).json({ error: 'العنصر غير موجود' });
  if (qty > item.qty_remaining) return res.status(400).json({ error: 'الكمية المحددة أكبر من الكمية المتبقية' });

  const tx = db.transaction(() => {
    // Reduce remaining qty
    const newRemaining = item.qty_remaining - qty;
    db.prepare('UPDATE audit_items SET qty_remaining=?, problem_type=?, status=? WHERE id=?')
      .run(newRemaining, problem_type, newRemaining === 0 ? 'done' : 'pending', audit_item_id);

    const base = [audit_item_id, item.list_sequence, item.customer_code, item.customer_name, item.item_name, qty, problem_type, req.user.full_name, note||null, req.user.id];

    if (destination === 'working') {
      db.prepare(`INSERT INTO working_returns (audit_item_id,list_sequence,customer_code,customer_name,item_name,qty,problem_type,inspector_name,note,created_by,price) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
        .run(...base, price || item.price);
    } else if (destination === 'damaged') {
      db.prepare(`INSERT INTO damaged_returns (audit_item_id,list_sequence,customer_code,customer_name,item_name,qty,problem_type,inspector_name,note,created_by,price,compensation_type) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(...base, price || item.price, compensation_type || 'full');
    } else if (destination === 'customer_return') {
      db.prepare(`INSERT INTO customer_returns (audit_item_id,list_sequence,customer_code,customer_name,item_name,qty,problem_type,inspector_name,note,created_by) VALUES (?,?,?,?,?,?,?,?,?,?)`)
        .run(...base);
    } else if (destination === 'pending') {
      db.prepare(`INSERT INTO pending_items (audit_item_id,list_sequence,customer_code,customer_name,item_name,qty,inspector_name,note,created_by) VALUES (?,?,?,?,?,?,?,?,?)`)
        .run(audit_item_id, item.list_sequence, item.customer_code, item.customer_name, item.item_name, qty, req.user.full_name, note||null, req.user.id);
    }
  });
  tx();
  res.json({ ok: true });
});

// Restore item back to audit from any sub-stage
app.post('/api/audit/restore', auth(['admin','auditor']), (req, res) => {
  const { source, record_id } = req.body;
  const db = getDb();
  const tables = { working: 'working_returns', damaged: 'damaged_returns', customer: 'customer_returns', pending: 'pending_items' };
  const tbl = tables[source];
  if (!tbl) return res.status(400).json({ error: 'مصدر غير صحيح' });
  const record = db.prepare(`SELECT * FROM ${tbl} WHERE id=?`).get(record_id);
  if (!record) return res.status(404).json({ error: 'السجل غير موجود' });
  const tx = db.transaction(() => {
    db.prepare(`UPDATE audit_items SET qty_remaining=qty_remaining+?, status='pending' WHERE id=?`).run(record.qty, record.audit_item_id);
    db.prepare(`DELETE FROM ${tbl} WHERE id=?`).run(record_id);
  });
  tx();
  res.json({ ok: true });
});

// ─── WORKING RETURNS ──────────────────────────────────────────────────────────
app.get('/api/working-returns', auth(), (req, res) => {
  const { list_sequence, customer_code, date_from, date_to } = req.query;
  let q = 'SELECT * FROM working_returns WHERE 1=1';
  const params = [];
  if (list_sequence) { q += ' AND list_sequence=?'; params.push(list_sequence); }
  if (customer_code) { q += ' AND customer_code=?'; params.push(customer_code); }
  if (date_from) { q += ' AND added_date >= ?'; params.push(date_from); }
  if (date_to) { q += ' AND added_date <= ?'; params.push(date_to); }
  q += ' ORDER BY id ASC';
  res.json(getDb().prepare(q).all(...params));
});

app.put('/api/working-returns/:id', auth(['admin','auditor']), (req, res) => {
  const { price, note } = req.body;
  getDb().prepare('UPDATE working_returns SET price=?, note=? WHERE id=?').run(price, note||null, req.params.id);
  res.json({ ok: true });
});

// ─── DAMAGED RETURNS ──────────────────────────────────────────────────────────
app.get('/api/damaged-returns', auth(), (req, res) => {
  const { list_sequence, customer_code, date_from, date_to } = req.query;
  let q = 'SELECT * FROM damaged_returns WHERE 1=1';
  const params = [];
  if (list_sequence) { q += ' AND list_sequence=?'; params.push(list_sequence); }
  if (customer_code) { q += ' AND customer_code=?'; params.push(customer_code); }
  if (date_from) { q += ' AND added_date >= ?'; params.push(date_from); }
  if (date_to) { q += ' AND added_date <= ?'; params.push(date_to); }
  q += ' ORDER BY id ASC';
  res.json(getDb().prepare(q).all(...params));
});

app.put('/api/damaged-returns/:id', auth(['admin','auditor']), (req, res) => {
  const { price, compensation_type, note } = req.body;
  getDb().prepare('UPDATE damaged_returns SET price=?, compensation_type=?, note=? WHERE id=?').run(price, compensation_type, note||null, req.params.id);
  res.json({ ok: true });
});

// ─── CUSTOMER RETURNS ─────────────────────────────────────────────────────────
app.get('/api/customer-returns', auth(), (req, res) => {
  const { list_sequence, customer_code, date_from, date_to } = req.query;
  let q = 'SELECT * FROM customer_returns WHERE 1=1';
  const params = [];
  if (list_sequence) { q += ' AND list_sequence=?'; params.push(list_sequence); }
  if (customer_code) { q += ' AND customer_code=?'; params.push(customer_code); }
  if (date_from) { q += ' AND added_date >= ?'; params.push(date_from); }
  if (date_to) { q += ' AND added_date <= ?'; params.push(date_to); }
  q += ' ORDER BY id ASC';
  res.json(getDb().prepare(q).all(...params));
});

// ─── PENDING ITEMS ────────────────────────────────────────────────────────────
app.get('/api/pending-items', auth(), (req, res) => {
  const { list_sequence, customer_code, date_from, date_to } = req.query;
  let q = 'SELECT * FROM pending_items WHERE 1=1';
  const params = [];
  if (list_sequence) { q += ' AND list_sequence=?'; params.push(list_sequence); }
  if (customer_code) { q += ' AND customer_code=?'; params.push(customer_code); }
  if (date_from) { q += ' AND added_date >= ?'; params.push(date_from); }
  if (date_to) { q += ' AND added_date <= ?'; params.push(date_to); }
  q += ' ORDER BY id ASC';
  res.json(getDb().prepare(q).all(...params));
});

// Transfer pending item to another stage
app.post('/api/pending-items/transfer', auth(['admin','auditor']), (req, res) => {
  const { pending_id, destination, price, compensation_type, note } = req.body;
  const db = getDb();
  const item = db.prepare('SELECT * FROM pending_items WHERE id=?').get(pending_id);
  if (!item) return res.status(404).json({ error: 'العنصر غير موجود' });
  const tx = db.transaction(() => {
    const base = [item.audit_item_id, item.list_sequence, item.customer_code, item.customer_name, item.item_name, item.qty, null, item.inspector_name, note||item.note, req.user.id];
    if (destination === 'working') {
      db.prepare(`INSERT INTO working_returns (audit_item_id,list_sequence,customer_code,customer_name,item_name,qty,problem_type,inspector_name,note,created_by,price) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
        .run(...base, price||0);
    } else if (destination === 'damaged') {
      db.prepare(`INSERT INTO damaged_returns (audit_item_id,list_sequence,customer_code,customer_name,item_name,qty,problem_type,inspector_name,note,created_by,price,compensation_type) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(...base, price||0, compensation_type||'full');
    } else if (destination === 'customer_return') {
      db.prepare(`INSERT INTO customer_returns (audit_item_id,list_sequence,customer_code,customer_name,item_name,qty,problem_type,inspector_name,note,created_by) VALUES (?,?,?,?,?,?,?,?,?,?)`)
        .run(...base);
    }
    db.prepare('DELETE FROM pending_items WHERE id=?').run(pending_id);
  });
  tx();
  res.json({ ok: true });
});

// ─── EXPORT TO EXCEL ──────────────────────────────────────────────────────────
app.get('/api/export/:table', auth(), (req, res) => {
  const allowed = ['receptions','inventory_items','audit_items','working_returns','damaged_returns','customer_returns','pending_items'];
  if (!allowed.includes(req.params.table)) return res.status(400).json({ error: 'جدول غير مسموح' });
  const data = getDb().prepare(`SELECT * FROM ${req.params.table}`).all();
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.table}.xlsx"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// ─── DASHBOARD STATS ──────────────────────────────────────────────────────────
app.get('/api/stats', auth(), (req, res) => {
  const db = getDb();
  res.json({
    receptions: db.prepare('SELECT COUNT(*) as c FROM receptions').get().c,
    inventory: db.prepare('SELECT COUNT(*) as c FROM inventory_items').get().c,
    audit_pending: db.prepare("SELECT COUNT(*) as c FROM audit_items WHERE status='pending'").get().c,
    working: db.prepare('SELECT COUNT(*) as c FROM working_returns').get().c,
    damaged: db.prepare('SELECT COUNT(*) as c FROM damaged_returns').get().c,
    customer_return: db.prepare('SELECT COUNT(*) as c FROM customer_returns').get().c,
    pending: db.prepare('SELECT COUNT(*) as c FROM pending_items').get().c,
  });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

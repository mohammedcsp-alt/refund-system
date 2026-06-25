const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'refund_system.db');
let db;

function getDb() {
  if (!db) db = new Database(DB_PATH);
  return db;
}

function initDb() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','reception','inventory','auditor','manager')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      default_price REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS receptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_sequence TEXT UNIQUE NOT NULL,
      customer_code TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      receiver_name TEXT NOT NULL,
      receipt_date DATE NOT NULL,
      carton_qty INTEGER DEFAULT 0,
      piece_qty INTEGER DEFAULT 0,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_sequence TEXT NOT NULL,
      customer_code TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      item_name TEXT NOT NULL,
      qty INTEGER NOT NULL,
      qty_remaining INTEGER NOT NULL,
      barcode TEXT,
      price REAL DEFAULT 0,
      receipt_date DATE,
      count_date DATE DEFAULT (date('now')),
      note TEXT,
      status TEXT DEFAULT 'audit',
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inventory_item_id INTEGER,
      list_sequence TEXT NOT NULL,
      customer_code TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      item_name TEXT NOT NULL,
      qty_original INTEGER NOT NULL,
      qty_remaining INTEGER NOT NULL,
      price REAL DEFAULT 0,
      receipt_date DATE,
      count_date DATE,
      audit_date DATE DEFAULT (date('now')),
      problem_type TEXT,
      note TEXT,
      inspector_name TEXT,
      status TEXT DEFAULT 'pending',
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS working_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      audit_item_id INTEGER,
      list_sequence TEXT NOT NULL,
      customer_code TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      item_name TEXT NOT NULL,
      qty INTEGER NOT NULL,
      price REAL DEFAULT 0,
      problem_type TEXT,
      inspector_name TEXT,
      note TEXT,
      added_date DATE DEFAULT (date('now')),
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS damaged_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      audit_item_id INTEGER,
      list_sequence TEXT NOT NULL,
      customer_code TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      item_name TEXT NOT NULL,
      qty INTEGER NOT NULL,
      price REAL DEFAULT 0,
      compensation_type TEXT DEFAULT 'full' CHECK(compensation_type IN ('full','half')),
      problem_type TEXT,
      inspector_name TEXT,
      note TEXT,
      added_date DATE DEFAULT (date('now')),
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customer_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      audit_item_id INTEGER,
      list_sequence TEXT NOT NULL,
      customer_code TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      item_name TEXT NOT NULL,
      qty INTEGER NOT NULL,
      problem_type TEXT,
      inspector_name TEXT,
      note TEXT,
      added_date DATE DEFAULT (date('now')),
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pending_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      audit_item_id INTEGER,
      list_sequence TEXT NOT NULL,
      customer_code TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      item_name TEXT NOT NULL,
      qty INTEGER NOT NULL,
      inspector_name TEXT,
      note TEXT,
      added_date DATE DEFAULT (date('now')),
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default admin user
  const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!admin) {
    const hashed = bcrypt.hashSync('admin123', 10);
    db.prepare(`INSERT INTO users (username, password, full_name, role) VALUES (?,?,?,?)`).run('admin', hashed, 'مدير النظام', 'admin');
    db.prepare(`INSERT INTO users (username, password, full_name, role) VALUES (?,?,?,?)`).run('reception', bcrypt.hashSync('123456', 10), 'موظف الاستلام', 'reception');
    db.prepare(`INSERT INTO users (username, password, full_name, role) VALUES (?,?,?,?)`).run('inventory', bcrypt.hashSync('123456', 10), 'موظف الجرد', 'inventory');
    db.prepare(`INSERT INTO users (username, password, full_name, role) VALUES (?,?,?,?)`).run('auditor', bcrypt.hashSync('123456', 10), 'المدقق', 'auditor');
    db.prepare(`INSERT INTO users (username, password, full_name, role) VALUES (?,?,?,?)`).run('manager', bcrypt.hashSync('123456', 10), 'المدير', 'manager');

    // Seed sample customers
    db.prepare(`INSERT INTO customers (customer_code, name, default_price) VALUES (?,?,?)`).run('C001', 'شركة الأمل للتجارة', 150);
    db.prepare(`INSERT INTO customers (customer_code, name, default_price) VALUES (?,?,?)`).run('C002', 'مؤسسة النجاح', 200);
    db.prepare(`INSERT INTO customers (customer_code, name, default_price) VALUES (?,?,?)`).run('C003', 'شركة البيان', 175);
  }

  console.log('Database initialized');
}

module.exports = { getDb, initDb };

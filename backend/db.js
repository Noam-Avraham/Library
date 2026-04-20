const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const familyConfig = require('../family.config.json');

const DB_PATH = path.join(__dirname, 'library.db');

let _db = null;

// ── Persistence ───────────────────────────────────────────────────────────────
function save() {
  fs.writeFileSync(DB_PATH, Buffer.from(_db.export()));
}

// ── Query helpers (synchronous after init) ────────────────────────────────────
function run(sql, params = []) {
  _db.run(sql, params);
  save();
  const res = _db.exec('SELECT last_insert_rowid() as id');
  return res[0]?.values[0][0] ?? null;
}

function get(sql, params = []) {
  const stmt = _db.prepare(sql);
  stmt.bind(params);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

function all(sql, params = []) {
  const rows = [];
  const stmt = _db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// ── Init (async once at startup) ──────────────────────────────────────────────
async function init() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    _db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    _db = new SQL.Database();
  }

  _db.run(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT DEFAULT '',
      translator TEXT DEFAULT '',
      thumbnailUrl TEXT DEFAULT '',
      isbn TEXT DEFAULT '',
      owner TEXT DEFAULT '',
      current_holder TEXT DEFAULT '',
      location TEXT DEFAULT 'בית',
      status TEXT DEFAULT 'זמין',
      genre TEXT DEFAULT '',
      description TEXT DEFAULT '',
      created_at DATETIME DEFAULT (datetime('now'))
    )
  `);

  // Migration: add translator column to existing DBs
  const hasTranslator = get("SELECT COUNT(*) as c FROM pragma_table_info('books') WHERE name='translator'");
  if (!hasTranslator?.c) {
    _db.run("ALTER TABLE books ADD COLUMN translator TEXT DEFAULT ''");
  }

  _db.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      user_name TEXT NOT NULL,
      rating INTEGER,
      review_text TEXT DEFAULT '',
      is_read INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now')),
      UNIQUE(book_id, user_name)
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS family_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `);

  // Seed from family.config.json
  const NEW_MEMBERS = familyConfig.owners.map(o => o.name);
  const oldNames = get("SELECT COUNT(*) as c FROM family_members WHERE name IN ('אברהם','שרה','יצחק','רבקה')");
  if (oldNames?.c > 0) _db.run('DELETE FROM family_members');

  const memberCount = get('SELECT COUNT(*) as c FROM family_members');
  if (!memberCount?.c) {
    NEW_MEMBERS.forEach(name => _db.run('INSERT OR IGNORE INTO family_members (name) VALUES (?)', [name]));
  }

  // Migration: merge שייקה + מיקי → משפחת אברהם
  const hasOldNames = get("SELECT COUNT(*) as c FROM family_members WHERE name IN ('שייקה','מיקי')");
  if (hasOldNames?.c > 0) {
    _db.run("INSERT OR IGNORE INTO family_members (name) VALUES ('משפחת אברהם')");
    _db.run("UPDATE books SET owner='משפחת אברהם'         WHERE owner         IN ('שייקה','מיקי')");
    _db.run("UPDATE books SET current_holder='משפחת אברהם' WHERE current_holder IN ('שייקה','מיקי')");
    _db.run("DELETE FROM family_members WHERE name IN ('שייקה','מיקי')");
  }

  save();
  console.log('✅ Database ready:', DB_PATH);
}

module.exports = { init, run, get, all };

const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'data', 'users.db'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email_hash    TEXT NOT NULL UNIQUE,   -- HMAC-SHA256 lookup value
    email_enc     TEXT NOT NULL,          -- AES-256-GCM  iv.tag.ciphertext
    password_hash TEXT NOT NULL,          -- bcrypt hash (salt included)
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);
module.exports = db;

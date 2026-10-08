// Shows what is REALLY stored in the database (for report screenshots)
const db = require('better-sqlite3')('data/users.db');
console.table(db.prepare('SELECT id, email_hash, email_enc, password_hash, created_at FROM users').all());

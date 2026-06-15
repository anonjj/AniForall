const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/animepahe.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// Migrations: Add missing columns if they don't exist
const columns = db.prepare("PRAGMA table_info(progress)").all();
const hasTitle = columns.some(c => c.name === 'title');
const hasPoster = columns.some(c => c.name === 'poster');

if (!hasTitle) {
  try { db.prepare("ALTER TABLE progress ADD COLUMN title TEXT").run(); } catch(e){}
}
if (!hasPoster) {
  try { db.prepare("ALTER TABLE progress ADD COLUMN poster TEXT").run(); } catch(e){}
}

module.exports = db;

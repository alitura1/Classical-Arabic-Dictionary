/**
 * mufradat-to-sql.js  →  mufradat_import.sql
 * Yükle: wrangler d1 execute mufradat --file=mufradat_import.sql --remote
 */
const fs = require('fs');
// Normalize + kok cikarimi TEK KAYNAK — bkz. kok-cikar.js
const { normalizeArabic, extractRoot } = require('./kok-cikar');
const path = require('path');

const JSON_PATH = path.join(__dirname, 'data', 'mufradat.json');
const OUT_PATH  = path.join(__dirname, 'mufradat_import.sql');

if (!fs.existsSync(JSON_PATH)) {
  console.error('HATA: data/mufradat.json bulunamadı. Önce: node scripts/extract-mufradat.js');
  process.exit(1);
}


function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}


const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
console.log(`${data.length} kayıt bulundu.`);

const lines = [];
lines.push('DROP TABLE IF EXISTS entries;');
lines.push('');
lines.push('CREATE TABLE IF NOT EXISTS entries (');
lines.push('  id              INTEGER PRIMARY KEY,');
lines.push('  word            TEXT,');
lines.push('  normalized_word TEXT,');
lines.push('  root            TEXT,');
lines.push('  meanings        TEXT');
lines.push(');');
lines.push('');
lines.push('CREATE INDEX IF NOT EXISTS idx_normalized_word ON entries(normalized_word);');
lines.push('CREATE INDEX IF NOT EXISTS idx_root ON entries(root);');
lines.push('');
lines.push('DELETE FROM entries;');
lines.push('');

const BATCH = 10;
let total = 0;
for (let i = 0; i < data.length; i += BATCH) {
  const chunk = data.slice(i, i + BATCH);
  const values = chunk.map(row => {
    const id       = parseInt(row.id) || (i + 1);
    const word     = escapeSql(row.word);
    const normWord = escapeSql(normalizeArabic(row.word));
    const root     = escapeSql(extractRoot(row.word));
    const meanings = escapeSql(row.meanings ? String(row.meanings).slice(0, 2000) : '');
    return `(${id}, ${word}, ${normWord}, ${root}, ${meanings})`;
  });
  lines.push('INSERT INTO entries (id, word, normalized_word, root, meanings) VALUES');
  lines.push(values.join(',\n') + ';');
  lines.push('');
  total += chunk.length;
}

fs.writeFileSync(OUT_PATH, lines.join('\n'), 'utf8');
const sizeMB = (fs.statSync(OUT_PATH).size / 1024 / 1024).toFixed(1);
console.log(`✅ mufradat_import.sql (${sizeMB} MB, ${total} kayıt)`);
console.log('Yükle: wrangler d1 execute mufradat --file=mufradat_import.sql --remote');

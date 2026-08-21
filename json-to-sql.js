/**
 * json-to-sql.js
 * lisanularab.json → lisan_import.sql (D1'e import için)
 *
 * Kullanım:
 *   node json-to-sql.js
 *
 * Çıktı: lisan_import.sql (bu dosyayı D1'e import edeceksin)
 */

const fs = require('fs');
// Normalize + kok cikarimi TEK KAYNAK — bkz. kok-cikar.js
const { normalizeArabic, extractRoot } = require('./kok-cikar');
const path = require('path');

const JSON_PATH = path.join(__dirname, 'data', 'lisanularab.json');
const OUT_PATH  = path.join(__dirname, 'lisan_import.sql');

if (!fs.existsSync(JSON_PATH)) {
  // data/ klasöründe yoksa yanında ara
  const alt = path.join(__dirname, 'lisanularab.json');
  if (fs.existsSync(alt)) {
    console.log('data/ klasöründe bulunamadı, yanında arandı: lisanularab.json');
    process.chdir(__dirname);
  } else {
    console.error('HATA: lisanularab.json bulunamadı.');
    console.error('Dosyayı data/lisanularab.json olarak koy veya script ile aynı klasöre koy.');
    process.exit(1);
  }
}


function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}


console.log('JSON okunuyor...');
const raw  = fs.readFileSync(JSON_PATH, 'utf8');
const data = JSON.parse(raw);
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

// D1 tek seferde çok büyük INSERT sevmez — 500'lük batch'ler
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
  if (total % 10000 === 0) console.log(`  ${total} / ${data.length} işlendi...`);
}

fs.writeFileSync(OUT_PATH, lines.join('\n'), 'utf8');
const sizeMB = (fs.statSync(OUT_PATH).size / 1024 / 1024).toFixed(1);
console.log(`\n✅ Tamamlandı: lisan_import.sql (${sizeMB} MB, ${total} kayıt)`);
console.log('\nSıradaki adım:');
console.log('  wrangler d1 execute lisan-ul-arab --file=lisan_import.sql --remote');
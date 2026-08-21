/**
 * ayn-to-sql.js
 * kitabulayn.json → ayn_import.sql (D1'e import için)
 *
 * Kullanım:
 *   node ayn-to-sql.js
 *
 * Çıktı: ayn_import.sql
 * Yükle: wrangler d1 execute kitabul-ayn --file=ayn_import.sql --remote
 */
const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, 'data', 'kitabulayn.json');
const OUT_PATH  = path.join(__dirname, 'ayn_import.sql');

if (!fs.existsSync(JSON_PATH)) {
  console.error('HATA: data/kitabulayn.json bulunamadı.');
  console.error('Önce: node scripts/extract-ayn-source.js');
  process.exit(1);
}

function normalizeArabic(text = '') {
  return text
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .trim();
}

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

// Headword'den klasik triliteral kök tahmini.
// "التصليب" → "تصل" değil — biz "ال" prefix'ini sıyırıp ilk 3 harfi alıyoruz.
// Ama bu Ayn için aslında zaten kökü gösterir (headword'ler genelde 3-harfli kök).
// Multi-word headword'lerde sadece ilk kelimeyi kullan.
function extractRoot(word) {
  if (!word) return null;
  const first = String(word).split(/\s+/)[0];
  const norm  = normalizeArabic(first);
  const stripped = norm.replace(/^ال/, '').replace(/[ءؤئ]/g, '');
  const chars = [...stripped];
  if (chars.length === 0) return null;
  if (chars.length <= 3) return chars.join('');
  return chars.slice(0, 3).join('');
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

/**
 * ── BAYT TABANLI BÖLME (sabit satır sayısı DEĞİL) ────────────────────────
 * Eskiden `BATCH = 10` sabit satırdı ve `meanings` 2000 karakterde KESİLİYORDU.
 * Kesme ölçüldü: sözlüğün en uzun — ve genelde en değerli — maddeleri yarım
 * kalıyordu. Kesme kalkınca tek bir madde on binlerce karaktere çıkabiliyor,
 * yani sabit 10'luk parti D1'in 100 KB'lık ifade sınırını aşabilir.
 *
 * Desen `akilkuran-worker/scripts/seed-quran-d1.mjs`ten alındı: 60 KB hedef,
 * 100 KB sert sınır, yani %40 emniyet payı.
 */
const HEDEF_BAYT = 60_000;
const SERT_SINIR = 100_000;
let total = 0;
let tampon = [];
let tamponBayt = 0;
let asiriSatir = 0;

const partiYaz = () => {
  if (!tampon.length) return;
  lines.push('INSERT INTO entries (id, word, normalized_word, root, meanings) VALUES');
  lines.push(tampon.join(',\n') + ';');
  lines.push('');
  tampon = [];
  tamponBayt = 0;
};

data.forEach((row, i) => {
  const id       = parseInt(row.id) || (i + 1);
  const word     = escapeSql(row.word);
  const normWord = escapeSql(normalizeArabic(row.word));
  const root     = escapeSql(extractRoot(row.word));
  // ⛔ `.slice(0, 2000)` KALDIRILDI — kesme sessiz veri kaybıydı.
  const meanings = escapeSql(row.meanings ? String(row.meanings) : '');
  const satir = `(${id}, ${word}, ${normWord}, ${root}, ${meanings})`;

  // Tek satır sert sınırı aşarsa bölme onu KURTARAMAZ; sessizce geçmesin.
  if (Buffer.byteLength(satir, 'utf8') > SERT_SINIR) {
    console.error(`  ! id=${id} tek başına ${SERT_SINIR} baytı aşıyor (${Buffer.byteLength(satir, 'utf8')})`);
    asiriSatir++;
  }

  const bayt = Buffer.byteLength(satir, 'utf8') + 2;
  if (tamponBayt + bayt > HEDEF_BAYT && tampon.length) partiYaz();
  tampon.push(satir);
  tamponBayt += bayt;
  total++;
  if (total % 2000 === 0) console.log(`  ${total} / ${data.length} işlendi...`);
});
partiYaz();

if (asiriSatir) {
  console.error(`\n✗ ${asiriSatir} satır D1 ifade sınırını tek başına aşıyor — yükleme başarısız olur.`);
  process.exit(1);
}

fs.writeFileSync(OUT_PATH, lines.join('\n'), 'utf8');
const sizeMB = (fs.statSync(OUT_PATH).size / 1024 / 1024).toFixed(1);
console.log(`\n✅ Tamamlandı: ayn_import.sql (${sizeMB} MB, ${total} kayıt)`);
console.log('\nSıradaki adım:');
console.log('  wrangler d1 execute kitabul-ayn --file=ayn_import.sql --remote');

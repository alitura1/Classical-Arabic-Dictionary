/**
 * merge-ayn-sources.js
 *
 * archive.org (kitabalain) ve OpenITI Shamela kaynaklarını birleştirir.
 *
 * Girdi:
 *   data/_kitabulayn_archive.json — archive.org parser çıktısı
 *   data/_kitabulayn_openiti.json — OpenITI Shamela parser çıktısı
 *
 * Çıktı:
 *   data/kitabulayn.json — final birleşik [{ id, word, meanings }, ...]
 *
 * ── ÖNCELİK TERSİNE ÇEVRİLDİ (2026-08-21) ────────────────────────────────
 * Eskiden archive.org BİRİNCİL kaynaktı; OpenITI yalnız boşluk dolduruyor ya
 * da %20 daha uzunsa devreye giriyordu. Sonuç ölçüldü: birleşik verinin
 * %20,5'i bozuktu (8.591 maddenin 1.762'si), diğer üç sözlükte bu oran %0,1.
 *
 * Sebep: archive.org kaynağı TARANMIŞ KİTAP OCR'ı. Ham dosyada 6.307 Fars
 * rakamı var ve ilk kaydın baş kelimesi "قال الخليل" — bir sözlük maddesi
 * değil, metnin içinden düşmüş bir cümle. OpenITI Shamela kaynağında ise
 * 2,17 milyon karakterde SIFIR Fars rakamı var.
 *
 * ⚠️ AMA archive'ı TAMAMEN ATMAK da yanlış — ölçüldü: yalnız OpenITI ile
 * 1641 Kuran kökünün kapsaması %91,1'den %57,6'ya düşüyor (550 kök kaybı).
 * Çünkü OpenITI ayrıştırıcısı kaynağın yarısını okuyamıyor (bab başlıklarının
 * %13,8'inden kök çıkaramıyor ve o bapların maddeleri tümden düşüyor).
 * Yani temiz kaynak eksik değil, ONDAN OKUMAMIZ eksik.
 *
 * Bu yüzden strateji "birini seç" değil, ÖNCELİK:
 *   1) OpenITI (temiz) BİRİNCİL — archive asla üstüne yazamaz.
 *      Uzunluk kıyası YOK: OCR metni daha uzun olabilir ama fazlalık içerik
 *      değil gürültüdür.
 *   2) archive.org yalnız OpenITI'de HİÇ OLMAYAN maddeyi ekler.
 *
 * Böylece elimizde temiz karşılığı olan her madde temiz gelir, kapsama
 * korunur. Ayrıştırıcı iyileştikçe archive payı kendiliğinden azalır.
 */
const fs = require('fs');
const path = require('path');

const ARCHIVE = path.join(__dirname, '..', 'data', '_kitabulayn_archive.json');
const OPENITI = path.join(__dirname, '..', 'data', '_kitabulayn_openiti.json');
const OUT     = path.join(__dirname, '..', 'data', 'kitabulayn.json');

// Worker ve build-ayn-db ile birebir aynı normalize fonksiyonu
function normalizeArabic(text = '') {
  return text
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .trim();
}

const archive = JSON.parse(fs.readFileSync(ARCHIVE, 'utf8'));
const openiti = JSON.parse(fs.readFileSync(OPENITI, 'utf8'));
console.log(`archive.org ham : ${archive.length} madde`);
console.log(`OpenITI ham     : ${openiti.length} madde`);

// Map<normalized_word, {word, meanings, source}>
const byNorm = new Map();
let openitiAdded = 0, archiveAdded = 0, archiveSkipped = 0;

// 1) OpenITI (TEMİZ Shamela) BİRİNCİL — sonradan hiçbir şey üstüne yazamaz.
for (const e of openiti) {
  const norm = normalizeArabic(e.word);
  if (!norm || norm.length < 2) continue;
  const ex = byNorm.get(norm);
  // Kendi içinde çakışma olursa uzun olanı tut — ikisi de aynı temiz kaynaktan.
  if (!ex) {
    byNorm.set(norm, { word: e.word, meanings: e.meanings, source: 'openiti' });
    openitiAdded++;
  } else if (e.meanings.length > ex.meanings.length) {
    byNorm.set(norm, { word: e.word, meanings: e.meanings, source: 'openiti' });
  }
}

// 2) archive.org yalnız BOŞLUK DOLDURUR. Uzunluk kıyası bilerek yok: OCR
//    metninin daha uzun olması daha çok içerik değil, daha çok gürültüdür.
for (const e of archive) {
  const norm = normalizeArabic(e.word);
  if (!norm || norm.length < 2) continue;
  if (byNorm.has(norm)) { archiveSkipped++; continue; }
  byNorm.set(norm, { word: e.word, meanings: e.meanings, source: 'archive' });
  archiveAdded++;
}

// id ata, final dizi. `source` ÇIKTIDA KALIR: hangi maddenin taramadan
// geldiğini bilmeden bozulma oranı ölçülemez ve ayrıştırıcı iyileştikçe
// archive payının düşüşü izlenemez. `ayn-to-sql.js` bu alanı okumaz.
const final = Array.from(byNorm.values()).map((e, i) => ({
  id: i + 1,
  word: e.word,
  meanings: e.meanings,
  source: e.source,
}));

fs.writeFileSync(OUT, JSON.stringify(final), 'utf8');
const sizeKB = (fs.statSync(OUT).size / 1024).toFixed(1);

// Bozulma göstergesi — kapı (`kuranforum/scripts/kok-kapsam.mjs`) ile aynı ölçüt.
const FARS = /[۰-۹]/g, LATIN = /[A-Za-z]/g;
const bozukMu = (t) => (String(t).match(FARS) || []).length > 0 || (String(t).match(LATIN) || []).length > 3;
const bozuk = final.filter((e) => bozukMu(e.meanings)).length;

console.log(`\nBirleştirme (OpenITI birincil):`);
console.log(`  OpenITI (temiz)   → ${openitiAdded} madde`);
console.log(`  archive (boşluk)  → ${archiveAdded} madde eklendi`);
console.log(`  archive atlandı   → ${archiveSkipped} (temiz karşılığı zaten var)`);
console.log(`\n✅ Final: ${final.length} madde → ${OUT} (${sizeKB} KB)`);
console.log(`   bozuk kayıt: ${bozuk} = %${(100 * bozuk / final.length).toFixed(1)}`);

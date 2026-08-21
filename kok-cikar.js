/**
 * NORMALİZE + KÖK ÇIKARIMI — dört sözlük üreticisinin tek kaynağı.
 *
 * Önce `json-to-sql.js`, `ayn-to-sql.js`, `mufradat-to-sql.js` ve
 * `maqayis-to-sql.js` içinde DÖRT BİREBİR KOPYA hâlinde yaşıyordu. Dördü de
 * `akilkuran-worker/lib/dict-search.js`teki normalize ile aynı olmak
 * ZORUNDA — sapması aramayı sessizce bozar.
 *
 * ── ⛔ ÖLÇÜLEN KUSUR: uydurma kök etiketi (2026-08-21) ────────────────────
 * `extractRoot` kelimenin İLK ÜÇ HARFİNİ kök diye yazıyordu. Üç harflik bir
 * başlık için bu doğru (kelimenin kendisi köktür), ama türemiş kelime için
 * düpedüz TAHMİN — ve tahmin sık sık yanlış:
 *
 *   صليب (haç, gerçek kökü ص ل ب)  →  "صلي" diye etiketleniyordu
 *
 * Sonuç canlıda görüldü (sahibin bildirimi): namaz kökü `صلو` araması
 * Kitâbü'l-Ayn'da HAÇ maddesini getiriyordu. Sorgu doğruydu, veri yanlış
 * etiketliydi.
 *
 * Tahminin ne kadar yaygın olduğu ölçüldü — başlığı üç harften uzun olan,
 * yani kökü BİLİNMEYEN kayıtlar:
 *   Kitâbü'l-Ayn %38 · Lisân %30 · Müfredât %5 · Mekâyîs %2
 *
 * Yeni kural: **kök olduğu bilinmiyorsa kök etiketi konmaz** (null). O
 * kayıtlar aramanın çapalı ön-ek aşamasına kalır — orası yaklaşık olduğunu
 * zaten biliyor ve uzunluk sınırı taşıyor.
 *
 * Kapsama bedeli ölçüldü ve neredeyse sıfır: Lisân 0, Ayn -8, Müfredât -1,
 * Mekâyîs 0 kök. Karşılığında ~6.200 uydurma kök iddiası kalkıyor.
 *
 * > Sözlükte yanlış cevap, cevapsızlıktan kötüdür.
 */

/** `akilkuran-worker/lib/dict-search.js` ile BİREBİR aynı olmak zorunda. */
function normalizeArabic(text) {
  return (text || '')
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .trim();
}

/**
 * Başlığın kökü — YALNIZ kesin olduğunda.
 * Üç harf veya daha kısaysa kelimenin kendisi köktür. Daha uzunsa kök
 * çıkarımı morfolojik analiz ister; tahmin yerine `null` döner.
 */
function extractRoot(word) {
  if (!word) return null;
  const first = String(word).split(/\s+/)[0];
  const norm = normalizeArabic(first);
  const stripped = norm.replace(/^ال/, '').replace(/[ءؤئ]/g, '');
  const chars = [...stripped];
  if (chars.length === 0) return null;
  // ⛔ `chars.slice(0, 3)` YOK: bilinmeyen kök tahmin edilmez.
  return chars.length <= 3 ? chars.join('') : null;
}

module.exports = { normalizeArabic, extractRoot };

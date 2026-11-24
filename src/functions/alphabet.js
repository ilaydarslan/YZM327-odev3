// Alfabe yardımcıları.
//
// Atomlar metni ve desenleri karakter kodu dizisi (Uint16Array) olarak işler.
// Böylece konumlar doğrudan JavaScript string indeksi (UTF-16 kod birimi) olur.

const A = 65; // 'A'
const Z = 90; // 'Z'
const CASE_GAP = 32; // 'a' - 'A'

/**
 * Bir string'i UTF-16 kod birimi dizisine çevirir.
 * ignoreCase açıksa YALNIZCA ASCII A–Z küçük harfe çevrilir (sözleşme 4.2).
 * (String.prototype.toLowerCase kullanılmaz: 'İ' gibi harfleri de değiştirir.)
 */
export function toCodes(text, ignoreCase) {
  const n = text.length;
  const codes = new Uint16Array(n);
  for (let i = 0; i < n; i++) {
    let c = text.charCodeAt(i);
    if (ignoreCase && c >= A && c <= Z) c += CASE_GAP;
    codes[i] = c;
  }
  return codes;
}

/**
 * Alfabe küçültme: desenlerde geçen her karaktere 1..size arası küçük bir numara verir.
 * Desenlerde hiç geçmeyen karakterlerin numarası 0'dır.
 * Böylece kayma tabloları 65 536 yerine (size + 1) eleman tutar.
 *
 * @param {Uint16Array[]} keys  desenlerin kod dizileri
 * @returns {{ map: Uint16Array, size: number }}
 */
export function reduceAlphabet(keys) {
  const map = new Uint16Array(65536);
  let size = 0;
  for (const key of keys) {
    for (let j = 0; j < key.length; j++) {
      const c = key[j];
      if (map[c] === 0) map[c] = ++size;
    }
  }
  return { map, size };
}

/** Metinde geçen farklı karakter sayısı (σ). */
export function countDistinct(codes) {
  const seen = new Uint8Array(65536);
  let sigma = 0;
  for (let i = 0; i < codes.length; i++) {
    const c = codes[i];
    if (seen[c] === 0) {
      seen[c] = 1;
      sigma++;
    }
  }
  return sigma;
}

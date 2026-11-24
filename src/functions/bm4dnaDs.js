// bm4DNADS (Allmer 2016, "Boyer-Moore for DNA, Double Shift table"): kısa desenler için.
//
// İki tablo kullanır:
//   d1: Horspool kötü karakter kayması (geçerli kayma değerleri),
//   d0: d1'in kopyası, yalnızca desenin SON karakterinin değeri 0.
// "Atlama döngüsü" (skip loop) d0 ile koşar: pencerenin son karakteri desenin son karakteri
// olmadıkça hiç karşılaştırma yapmadan atlar; d0 = 0 olunca durur. Döngü 3 kez açılmıştır
// (Hume & Sunday): her turda üç arama yapılır, döngü koşulu üç adımda bir denetlenir.
// Durunca önce "sentinel" (desenin ilk karakteri) denetlenir, tutarsa bütün desen karşılaştırılır.
// Sonra desen, son karakterin d1'deki geçerli kayması kadar ilerletilir ("suffix shift").
//
// Sınır denetimi olmadan güvenle koşmak için desen metnin sonuna eklenir (makaledeki gibi):
// atlama döngüsü en geç bu eklenmiş kopyanın sonunda durur.
//
// MAKALEDEN SAPMALAR (docs/sapmalar.md):
//  1) Makale deseni metnin kendisine ekler; biz metni değiştirmemek için bir kopya tamponda
//     (n + m) ekliyoruz. Sonuç aynıdır.
//  2) Makaledeki bmFast, d0'da son karakter için "2n gibi büyük bir değer" kullanır ve döngüden
//     çıkışı i > n ile anlar; bm4DNADS'teki gibi 0 kullanıyoruz (açılmış döngü 0 ile güvenle durur).
//  3) Sözde kodda tam eşleşmeden sonra kayma belirsiz; biz d1[son karakter] kullanıyoruz.
//     Bu, son karakterin desende bir önceki geçişine hizalar ve örtüşen eşleşmeleri kaçırmaz.

import { buildHorspoolShift } from './horspool.js';

/** d1 (geçerli kaymalar), d0 (son karakter 0) ve sonek kayması. */
export function buildDsTables(pattern, alphabet) {
  const d1 = buildHorspoolShift(pattern, alphabet);
  const d0 = Int32Array.from(d1);
  const last = alphabet.map[pattern[pattern.length - 1]];
  d0[last] = 0;
  return { d0, d1, suffixShift: d1[last] };
}

/**
 * @param {Uint16Array} buf  metin + sonuna eklenmiş desen (uzunluk ≥ n + m)
 * @param {number} n         gerçek metin uzunluğu
 */
export function searchBm4DnaDs(buf, n, pattern, tables, map, report) {
  const m = pattern.length;
  if (m > n) return;
  const { d0, suffixShift } = tables;
  const first = pattern[0];
  let i = m - 1; // pencerenin SON karakterinin konumu
  for (;;) {
    // Atlama döngüsü, 3 kez açılmış. d0 = 0 olduğunda i yerinde kalır.
    let k = d0[map[buf[i]]];
    while (k !== 0) {
      i += k;
      k = d0[map[buf[i]]];
      i += k;
      k = d0[map[buf[i]]];
      i += k;
      k = d0[map[buf[i]]];
    }
    if (i >= n) return; // metnin sonuna eklenen desene ulaştık
    const s = i - m + 1;
    if (buf[s] === first) {
      // sentinel tuttu: geri kalanı karşılaştır (son karakter zaten eşit)
      let j = 1;
      while (j < m - 1 && buf[s + j] === pattern[j]) j++;
      if (j >= m - 1) report(s);
    }
    i += suffixShift;
  }
}

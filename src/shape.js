// Veri şekli: molekülün karar verirken baktığı sayılar.
//   n      metin uzunluğu
//   sigma  metinde geçen farklı karakter sayısı (alfabe büyüklüğü σ)
//   k      desen sayısı
//   mMin, mMax, mAvg  desen uzunlukları

import { toCodes, countDistinct } from './functions/alphabet.js';

/**
 * @param {{ seq: string }} entry  ilk kayıt
 * @param {string[]} patterns
 * @param {boolean} ignoreCase
 */
export function computeShape(entry, patterns, ignoreCase = false) {
  const text = toCodes(entry.seq, ignoreCase);
  const lengths = patterns.map((p) => p.length);
  const total = lengths.reduce((a, b) => a + b, 0);
  return {
    n: text.length,
    sigma: countDistinct(text),
    k: patterns.length,
    mMin: Math.min(...lengths),
    mMax: Math.max(...lengths),
    mAvg: total / lengths.length,
  };
}

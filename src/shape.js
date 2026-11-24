// Veri şekli: molekülün karar verirken baktığı sayılar.
//   n      metin uzunluğu
//   sigma  metinde geçen farklı karakter sayısı (alfabe büyüklüğü σ)
//   sigmaP desenlerde geçen farklı karakter sayısı (σ_p): atomların tabloları bu alfabeyle kurulur
//          (alphabet.js, reduceAlphabet), bu yüzden tablo boyunun maliyeti σ değil σ_p ile büyür
//   k      desen sayısı
//   mMin, mMax, mAvg  desen uzunlukları

import { toCodes, countDistinct } from './functions/alphabet.js';

/**
 * @param {{ seq: string }} entry  ilk kayıt (FASTA.Entry)
 * @param {string[]} patterns
 * @param {boolean} ignoreCase
 */
export function computeShape(entry, patterns, ignoreCase = false) {
  const text = toCodes(entry.seq, ignoreCase);
  const lengths = patterns.map((p) => p.length);
  const total = lengths.reduce((a, b) => a + b, 0);
  const patternCodes = toCodes(patterns.join(''), ignoreCase);
  return {
    n: text.length,
    sigma: countDistinct(text),
    sigmaP: countDistinct(patternCodes),
    k: patterns.length,
    mMin: Math.min(...lengths),
    mMax: Math.max(...lengths),
    mAvg: total / lengths.length,
  };
}

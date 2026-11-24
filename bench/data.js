// Tohumlu (seed'li) sentetik veri üretici. Aynı tohum → hep aynı veri.
// Hem testlerde hem ölçümlerde kullanılır.

/** Mulberry32: küçük, hızlı, tohumlu rastgele sayı üretici. [0, 1) döndürür. */
export function makeRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const ALPHABETS = {
  binary: 'ab',
  dna: 'ACGT',
  protein: 'ACDEFGHIKLMNPQRSTVWY',
  text: 'abcdefghijklmnopqrstuvwxyz ',
  // Kalibrasyonda kullanılmayan, doğrulama için ek alfabe:
  rna: 'ACGU',
  mixedCase: 'acgtACGT',
};

export function randomInt(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

/** Verilen alfabeden rastgele metin. */
export function randomText(random, alphabet, length) {
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[Math.floor(random() * alphabet.length)];
  return out;
}

/** Çok tekrarlı metin: ör. "AT" tohumundan ATATAT... */
export function repetitiveText(unit, length) {
  let out = '';
  while (out.length < length) out += unit;
  return out.slice(0, length);
}

/**
 * Desen listesi: bir kısmı metinden kesilir (kesin eşleşme olsun),
 * bir kısmı rastgele üretilir (çoğu eşleşmesin).
 */
export function randomPatterns(random, text, alphabet, count, minLen, maxLen) {
  const patterns = [];
  for (let i = 0; i < count; i++) {
    const m = randomInt(random, minLen, maxLen);
    if (text.length >= m && random() < 0.6) {
      const start = randomInt(random, 0, text.length - m);
      patterns.push(text.slice(start, start + m));
    } else {
      patterns.push(randomText(random, alphabet, m));
    }
  }
  return patterns;
}

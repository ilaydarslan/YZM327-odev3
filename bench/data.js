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

/** Unicode'da ardışık `count` karakter (ör. token kimliklerini karaktere eşlemek için). */
function charRange(from, count) {
  let out = '';
  for (let i = 0; i < count; i++) out += String.fromCharCode(from + i);
  return out;
}

export const ALPHABETS = {
  // Kalibrasyon ızgarasının üç alfabesi: küçük, orta ve büyük σ.
  labels: 'ABCD', // σ = 4: etiket / eylem dizileri (ör. sınıf etiketleri, ajan eylemleri)
  normalized: 'abcdefghijklmnopqrstuvwxyz0123456789 ', // σ = 37: normalize metin (kirlenme taramasının alfabesi)
  printable: charRange(32, 95), // σ = 95: ham metin ve kaynak kod (yazdırılabilir ASCII)
  // Kalibrasyonda kullanılmayan, doğrulama için ek alfabeler:
  binary: 'ab', // σ = 2
  turkish: 'abcçdefgğhıijklmnoöprsştuüvyz ', // σ = 30: normalize Türkçe metin
  tokens: charRange(0x4e00, 1000), // σ = 1000: token kimlikleri (her token bir UTF-16 karakteri)
  mixedCase: 'abcxyzABCXYZ', // ignoreCase testleri için
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

/** Çok tekrarlı metin: ör. "AB" tohumundan ABABAB... */
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

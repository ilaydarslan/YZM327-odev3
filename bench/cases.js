// Ölçüm vakaları: kalibrasyon ızgarası ve ondan AYRI doğrulama kümesi.
//
// Desen sayısı k, yapay zekâ iş yükünü kapsayacak şekilde seçildi: tek bir sorgu (k = 1) ile
// kirlenme taraması (soru başına onlarca n-gram, toplamda yüzlerce/binlerce desen) arası.

import { makeRandom, ALPHABETS, randomText, randomPatterns, randomInt } from './data.js';

export const GRID = {
  alphabets: ['labels', 'normalized', 'printable'],
  n: [1e4, 1e5, 1e6],
  m: [4, 8, 16, 32, 64],
  k: [1, 8, 64, 512],
};

/** Bir vakanın verisini üretir: tek kayıtlı metin (FASTA.Entry) + desenler (bir kısmı metinden kesilmiş). */
export function buildCase({ alphabet, n, m, k, seed, mSpread = 0 }) {
  const random = makeRandom(seed);
  const letters = ALPHABETS[alphabet] ?? alphabet;
  const seq = randomText(random, letters, n);
  const minLen = Math.max(1, Math.round(m * (1 - mSpread)));
  const maxLen = Math.max(minLen, Math.round(m * (1 + mSpread)));
  const patterns = randomPatterns(random, seq, letters, k, minLen, maxLen);
  return { entries: [{ header: `>${alphabet}-${n}`, seq }], patterns };
}

/** Kalibrasyon ızgarası: 3 alfabe × 3 n × 5 m × 4 k = 180 vaka, tohum 1000'den. */
export function calibrationCases() {
  const cases = [];
  let seed = 1000;
  for (const alphabet of GRID.alphabets)
    for (const n of GRID.n)
      for (const m of GRID.m)
        for (const k of GRID.k) cases.push({ id: `cal-${cases.length}`, alphabet, n, m, k, seed: seed++ });
  return cases;
}

/**
 * Doğrulama kümesi: 120 vaka, kalibrasyondan farklı tohumlar, değerler ızgara noktalarının ARASINDAN ve dışından,
 * kalibrasyonda olmayan alfabeler (ikili, Türkçe, 1000 sembollü token alfabesi) ve karışık desen uzunlukları.
 *
 * Küme 2 (varsayılan, raporlanan): tohum 20261125, vaka tohumları 19000'den.
 * Küme 1 (tohum 20261124, vaka tohumları 9000'den) ilk modelin hatalarını bulmak için kullanıldı
 * (bench/results/validation_v1.md); model düzeltildikten sonra sonuçların dürüst kalması için
 * düzeltilmiş model hiç görülmemiş küme 2'de ölçüldü.
 */
export function validationCases(count = 120, { seed = 20261125, base = 19000 } = {}) {
  const random = makeRandom(seed);
  const alphabets = ['labels', 'normalized', 'printable', 'binary', 'turkish', 'tokens'];
  const nChoices = [2e4, 3e4, 5e4, 2e5, 3e5, 5e5, 7e5];
  const mChoices = [3, 6, 10, 12, 20, 24, 40, 48, 50, 80, 100, 150];
  const kChoices = [1, 2, 3, 6, 12, 24, 32, 100, 200, 1000];
  const cases = [];
  for (let i = 0; i < count; i++) {
    cases.push({
      id: `val-${i}`,
      alphabet: alphabets[i % alphabets.length],
      n: nChoices[randomInt(random, 0, nChoices.length - 1)],
      m: mChoices[randomInt(random, 0, mChoices.length - 1)],
      k: kChoices[randomInt(random, 0, kChoices.length - 1)],
      mSpread: random() < 0.4 ? 0.5 : 0, // vakaların %40'ında desen uzunlukları karışık
      seed: base + i,
    });
  }
  return cases;
}

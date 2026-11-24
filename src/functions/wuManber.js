// Wu-Manber (Wu & Manber 1994): çok desen, blok kayması.
//
// Bütün desenler en kısa desen uzunluğu (lmin) kadar kesilmiş gibi düşünülür. Pencerenin son B
// karakteri (blok) bir SHIFT tablosunda aranır:
//   - blok hiçbir desende yoksa pencere lmin − B + 1 kayar,
//   - varsa, blok en sağdaki geçişine hizalanacak kadar kayar,
//   - kayma 0 ise blok bazı desenlerin (ilk lmin karakterinin) sonudur: o desenler (HASH listesi)
//     metinde tam olarak doğrulanır, sonra pencere 1 kayar.
// Çok desende Horspool'u desen sayısı kadar tekrar etmek yerine metni bir kez atlayarak geçer.

import { makeQgramHasher, hashAt } from './qgram.js';
import { chooseQ } from './shiftModel.js';

export function buildWuManber(keys, alphabet, maxTable) {
  const k = keys.length;
  let lmin = Infinity;
  for (const key of keys) if (key.length < lmin) lmin = key.length;
  const B = chooseQ(lmin, alphabet.size, k);
  const hasher = makeQgramHasher(alphabet.size, B, maxTable);
  const defaultShift = lmin - B + 1;
  const shift = new Int32Array(hasher.size).fill(defaultShift);
  const buckets = new Map(); // tablo yeri → o blokla biten desenlerin sıra numaraları

  keys.forEach((key, patternIndex) => {
    for (let e = B - 1; e <= lmin - 1; e++) {
      const h = hashAt(hasher, key, e, alphabet.map);
      const s = lmin - 1 - e;
      if (s < shift[h]) shift[h] = s;
      if (s === 0) {
        if (!buckets.has(h)) buckets.set(h, []);
        buckets.get(h).push(patternIndex);
      }
    }
  });
  return { lmin, B, hasher, shift, buckets };
}

export function searchWuManber(text, keys, table, map, report) {
  const n = text.length;
  const { lmin, hasher, shift, buckets } = table;
  let i = lmin - 1; // pencerenin (lmin uzunluğunda) son karakteri
  while (i < n) {
    const h = hashAt(hasher, text, i, map);
    const s = shift[h];
    if (s > 0) {
      i += s;
      continue;
    }
    const start = i - lmin + 1;
    const candidates = buckets.get(h);
    if (candidates) {
      for (let c = 0; c < candidates.length; c++) {
        const patternIndex = candidates[c];
        const key = keys[patternIndex];
        const m = key.length;
        if (start + m > n) continue;
        let j = 0;
        while (j < m && text[start + j] === key[j]) j++;
        if (j === m) report(start, patternIndex);
      }
    }
    i += 1;
  }
}

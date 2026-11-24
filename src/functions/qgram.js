// q-gram (kelime / blok) özet tablosu yardımcıları: bm4DNAHMbs ve Wu-Manber kullanır.
//
// Bir q-gram, küçültülmüş alfabe kodlarıyla S = size + 1 tabanında bir sayıya çevrilir.
// S^q küçükse (≤ 65 536) bu sayı birebir tablodaki yerdir; çakışma olmaz.
// Büyükse sayı 2^16'lık tabloya katlanır; farklı q-gramlar aynı yere düşebilir (çakışma).
// Çakışma güvenlidir: tabloda en KÜÇÜK kayma tutulur ve her aday ayrıca karakter karakter doğrulanır.

export const MAX_TABLE = 1 << 16;

/** maxTable: tablonun en büyük boyu (2'nin kuvveti). Testler çakışmayı zorlamak için küçültebilir. */
export function makeQgramHasher(alphabetSize, q, maxTable = MAX_TABLE) {
  const base = alphabetSize + 1;
  const exactSize = Math.pow(base, q);
  const exact = exactSize <= maxTable;
  const size = exact ? exactSize : maxTable;
  const mask = maxTable - 1;
  return { base, q, size, exact, mask };
}

/** buf[end − q + 1 .. end] bloğunun tablo yeri. map: karakter kodu → küçük alfabe numarası. */
export function hashAt(hasher, buf, end, map) {
  const { base, q, exact, mask } = hasher;
  let h = 0;
  if (exact) {
    for (let j = end - q + 1; j <= end; j++) h = h * base + map[buf[j]];
  } else {
    for (let j = end - q + 1; j <= end; j++) h = (Math.imul(h, base) + map[buf[j]]) & mask;
  }
  return h;
}

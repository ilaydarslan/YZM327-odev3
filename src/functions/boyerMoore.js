// Boyer-Moore (Boyer & Moore 1977): kötü karakter + iyi sonek kuralları.
//
// Desen sağdan sola karşılaştırılır. Uyumsuzlukta iki kuralın verdiği kaymanın büyüğü alınır:
//  - kötü karakter: uyumsuz metin karakterini desendeki son geçişiyle hizala,
//  - iyi sonek: zaten eşleşen soneki desende tekrar geçtiği yere (ya da en uzun sınıra) hizala.
// Ortalama alt-doğrusal, en kötü O(n·m) (bu sürümde Galil kuralı yok).

/** Her karakterin desendeki son konumu; desende yoksa −1. */
export function buildLastOccurrence(pattern, alphabet) {
  const occ = new Int32Array(alphabet.size + 1).fill(-1);
  for (let j = 0; j < pattern.length; j++) occ[alphabet.map[pattern[j]]] = j;
  return occ;
}

/**
 * İyi sonek tablosu: goodSuffix[j+1] = desen[j+1..] eşleşip desen[j]'de uyumsuzluk olunca kayma.
 * goodSuffix[0] = tam eşleşmeden sonraki kayma.
 */
export function buildGoodSuffix(pattern) {
  const m = pattern.length;
  const shift = new Int32Array(m + 1);
  const border = new Int32Array(m + 1);
  let i = m;
  let j = m + 1;
  border[i] = j;
  while (i > 0) {
    while (j <= m && pattern[i - 1] !== pattern[j - 1]) {
      if (shift[j] === 0) shift[j] = j - i;
      j = border[j];
    }
    i--;
    j--;
    border[i] = j;
  }
  j = border[0];
  for (i = 0; i <= m; i++) {
    if (shift[i] === 0) shift[i] = j;
    if (i === j) j = border[j];
  }
  return shift;
}

export function searchBoyerMoore(text, pattern, occ, goodSuffix, map, report) {
  const n = text.length;
  const m = pattern.length;
  let s = 0;
  while (s <= n - m) {
    let j = m - 1;
    while (j >= 0 && pattern[j] === text[s + j]) j--;
    if (j < 0) {
      report(s);
      s += goodSuffix[0];
    } else {
      const badChar = j - occ[map[text[s + j]]];
      const good = goodSuffix[j + 1];
      s += badChar > good ? badChar : good;
    }
  }
}

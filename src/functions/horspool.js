// Boyer-Moore-Horspool (Horspool 1980).
//
// Fikir: desen metnin üzerine konur, SAĞDAN sola karşılaştırılır.
// Pencerenin en sağındaki metin karakterine (c) bakılır ve desen,
// c'nin desendeki son geçtiği yere hizalanacak kadar kaydırılır ("kötü karakter kayması").
// c desende hiç yoksa desen boyu kadar atlanır. Uzun desende ve büyük alfabede çok hızlıdır.
// Ortalama O(n / m), en kötü O(n·m).

/**
 * Kayma tablosu. Alfabe küçültülmüş olduğu için tablo (size + 1) elemanlıdır;
 * 0. eleman "desenlerde hiç geçmeyen karakter" içindir ve kayma m'dir.
 * @param {Uint16Array} pattern
 * @param {{ map: Uint16Array, size: number }} alphabet
 */
export function buildHorspoolShift(pattern, alphabet) {
  const m = pattern.length;
  const shift = new Int32Array(alphabet.size + 1).fill(m);
  for (let j = 0; j < m - 1; j++) {
    shift[alphabet.map[pattern[j]]] = m - 1 - j;
  }
  return shift;
}

/**
 * @param {Uint16Array} text
 * @param {Uint16Array} pattern
 * @param {Int32Array} shift
 * @param {Uint16Array} map  alfabe eşlemesi
 * @param {(position: number) => void} report
 */
export function searchHorspool(text, pattern, shift, map, report) {
  const n = text.length;
  const m = pattern.length;
  if (m > n) return;
  const last = pattern[m - 1];
  let i = 0;
  while (i <= n - m) {
    const c = text[i + m - 1];
    if (c === last) {
      let j = m - 2;
      while (j >= 0 && text[i + j] === pattern[j]) j--;
      if (j < 0) report(i);
    }
    i += shift[map[c]];
  }
}

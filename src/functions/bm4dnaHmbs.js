// bm4DNAHMbs (Allmer 2016, "Boyer-Moore-HM best solution"): uzun desenler için.
//
// Tek karakter yerine pencerenin son q karakterine (q-gram, "kelime") bakarak kayar
// (Wu & Manber 1994 fikri). Desendeki her q-gram için "bu blok pencerenin sonuna gelirse ne kadar
// kaydırılabilir" tablosu tutulur. Desenin SONEK q-gramının kayması 0'dır: atlama döngüsü yalnızca
// pencerenin sonu desenin sonekine benzediğinde durur ("best solution" farkı budur, bu yüzden döngüde
// uzun kalır). Döngü 3 kez açılmıştır. Durunca sentinel (ilk karakter) ve tam karşılaştırma yapılır,
// sonra desen "sonek kayması" kadar ilerler: sonekin desende içeride bir önceki geçişine hizalanır.
//
// MAKALEDEN SAPMALAR (docs/sapmalar.md):
//  1) Desende HİÇ geçmeyen bir q-gram için makale m − w kaydırır. Güvenli en büyük kayma
//     m − q + 1'dir: blok desende yoksa, desenin hiçbir hizalaması bu bloğu kapsayamaz; desenin başı
//     bloğun son karakterinin hemen sonrasına gelebilir. m − w doğru sonuç verir ama her atlamada
//     bir konum kaybeder.
//  2) Makaledeki özet döngüsü 0..w aralığında koşar (w + 1 karakter: bir eksik/fazla hatası);
//     biz tam q karakter kullanıyoruz.
//  3) Makale özet için value·128 + karakter kodu kullanır; büyük q'da taşar ve UTF-16 metinde
//     karakterler 128'den büyük olabilir. Biz küçültülmüş alfabe tabanında birebir özet kullanıyoruz;
//     tablo çok büyürse 2^16'ya katlıyoruz. Çakışmada tabloda en küçük kayma tutulur ve her aday
//     karakter karakter doğrulanır; bu yüzden çakışma yanlış sonuç üretmez.
//  4) q (makalede w), Wu & Manber'in önerdiği q ≈ log_σ(2m) ile seçilir; makale formülü vermez.
//  5) bm4DNADS'teki gibi desen metnin sonuna bir kopya tamponda eklenir.

import { makeQgramHasher, hashAt } from './qgram.js';
import { chooseQ } from './shiftModel.js';

export function buildHmbsTables(pattern, alphabet, maxTable) {
  const m = pattern.length;
  const q = chooseQ(m, alphabet.size);
  const hasher = makeQgramHasher(alphabet.size, q, maxTable);
  const defaultShift = m - q + 1; // SAPMA 1
  const shift = new Int32Array(hasher.size).fill(defaultShift);
  // Sonek hariç bütün bloklar: blok desen[e−q+1..e] pencerenin sonuna gelirse kayma m−1−e.
  for (let e = q - 1; e <= m - 2; e++) {
    const h = hashAt(hasher, pattern, e, alphabet.map);
    const s = m - 1 - e;
    if (s < shift[h]) shift[h] = s;
  }
  const suffixHash = hashAt(hasher, pattern, m - 1, alphabet.map);
  const suffixShift = shift[suffixHash]; // sonekin içerideki bir önceki geçişi (yoksa m−q+1)
  shift[suffixHash] = 0; // atlama döngüsünü durduran tek değer
  return { q, hasher, shift, suffixShift };
}

export function searchBm4DnaHmbs(buf, n, pattern, tables, map, report) {
  const m = pattern.length;
  if (m > n) return;
  const { hasher, shift, suffixShift } = tables;
  const first = pattern[0];
  let i = m - 1;
  for (;;) {
    let k = shift[hashAt(hasher, buf, i, map)];
    while (k !== 0) {
      i += k;
      k = shift[hashAt(hasher, buf, i, map)];
      i += k;
      k = shift[hashAt(hasher, buf, i, map)];
      i += k;
      k = shift[hashAt(hasher, buf, i, map)];
    }
    if (i >= n) return;
    const s = i - m + 1;
    if (buf[s] === first) {
      // Özet çakışabileceği için bütün desen doğrulanır.
      let j = 1;
      while (j < m && buf[s + j] === pattern[j]) j++;
      if (j === m) report(s);
    }
    i += suffixShift;
  }
}

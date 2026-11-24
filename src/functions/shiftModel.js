// Beklenen kayma modeli: molekülün maliyet tahmini için.
//
// Atlama yapan algoritmalar (Horspool, Boyer-Moore, bm4DNA*, Wu-Manber) metni ortalama
// "beklenen kayma" kadar adımlarla geçer. Adım sayısı ≈ n / beklenen kayma.
// Hesaplar, metnin σ farklı karakterden düzgün (rastgele) oluştuğunu varsayar.

/**
 * Horspool tipi kötü karakter kaymasının beklenen değeri.
 * Pencerenin son karakteri c, desende (son karakter hariç) en sağdan d. konumda geçiyorsa kayma d,
 * hiç geçmiyorsa m olur. Rastgele metinde: E = Σ_{d=1}^{m-1} d·p·(1-p)^{d-1} + m·(1-p)^{m-1}, p = 1/σ.
 */
export function expectedCharShift(m, sigma) {
  if (m <= 1) return 1;
  if (sigma <= 1) return 1;
  const p = 1 / sigma;
  let expected = 0;
  let notYet = 1; // (1-p)^{d-1}
  for (let d = 1; d < m; d++) {
    expected += d * p * notYet;
    notYet *= 1 - p;
  }
  expected += m * notYet;
  return Math.max(1, expected);
}

/**
 * q-gram (blok) boyu. Wu & Manber (1994) önerisi: q ≈ log_σ(2·k·m), yani desenlerdeki blok sayısının
 * iki katından fazla farklı blok olabilsin ki rastgele bir blok desende nadiren bulunsun.
 * En az 1, en fazla m.
 */
export function chooseQ(m, sigma, k = 1) {
  const s = Math.max(2, sigma);
  const q = Math.ceil(Math.log(2 * k * m) / Math.log(s));
  return Math.max(1, Math.min(m, q));
}

/**
 * q-gram kaymasının beklenen değeri (bm4DNAHMbs, Wu-Manber).
 * Varsayılan (desende olmayan blok) kayma D = lmin − q + 1. Desenlerde W = k·D farklı blok konumu var.
 * Rastgele bir bloğun bunlardan birine denk gelme olasılığı P ≈ 1 − (1 − σ^{-q})^W; denk gelirse
 * kayma ortalama D/2 civarındadır.
 */
export function expectedQgramShift(lmin, q, sigma, k = 1) {
  const D = Math.max(1, lmin - q + 1);
  const s = Math.max(2, sigma);
  const W = k * D;
  const hit = 1 - Math.pow(1 - Math.pow(s, -q), W);
  return Math.max(1, (1 - hit) * D + hit * Math.max(1, D / 2));
}

/**
 * Beklenen eşleşme sayısı: rastgele metinde bir desenin her konumda eşleşme olasılığı σ^-m.
 * Her eşleşme bir sonuç nesnesi ve sıralama maliyeti getirir (bütün atomlarda ortak).
 */
export function expectedMatches(shape) {
  const s = Math.max(2, shape.sigma);
  return shape.k * Math.max(0, shape.n - shape.mMin + 1) * Math.pow(s, -shape.mAvg);
}

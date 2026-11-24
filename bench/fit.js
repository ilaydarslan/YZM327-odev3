// Katsayı uydurma: süre ≈ Σ katsayı_f × özellik_f, katsayılar ≥ 0.
//
// Göreli hata en küçüklenir: Σ ((tahmin − ölçülen) / ölçülen)². Böylece 0,05 ms'lik ve 500 ms'lik
// vakalar aynı ağırlıkta sayılır (molekül için önemli olan atomların SIRASIdır, mutlak süre değil).
// Özellik sayısı az (≤ 4) olduğu için negatif olmayan en küçük kareler, özelliklerin bütün alt
// kümeleri denenerek kesin çözülür.

function solve(A, b) {
  // Gauss eliminasyonu (kısmi pivotlama), küçük kare sistemler için
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-300) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

/**
 * @param {{ features: Record<string, number>, ms: number }[]} samples
 * @returns {{ coefficients: Record<string, number>, medianRelError: number }}
 */
export function fitCoefficients(samples) {
  const names = Object.keys(samples[0].features);
  // Ölçekleme: her özellik kendi ortalamasına bölünür (sayısal kararlılık)
  const scale = names.map((f) => samples.reduce((s, x) => s + x.features[f], 0) / samples.length || 1);
  const rows = samples.map((s) => names.map((f, j) => s.features[f] / scale[j] / s.ms)); // göreli: /ölçülen
  const target = samples.map(() => 1);

  let best = null;
  for (let mask = 1; mask < 1 << names.length; mask++) {
    const idx = names.map((_, j) => j).filter((j) => mask & (1 << j));
    const A = idx.map((a) => idx.map((b) => rows.reduce((s, r) => s + r[a] * r[b], 0)));
    const y = idx.map((a) => rows.reduce((s, r, i) => s + r[a] * target[i], 0));
    const x = solve(A, y);
    if (!x || x.some((v) => !(v >= 0))) continue;
    const coef = new Array(names.length).fill(0);
    idx.forEach((j, t) => (coef[j] = x[t]));
    const err = rows.reduce((s, r) => {
      const pred = r.reduce((a, v, j) => a + v * coef[j], 0);
      return s + (pred - 1) ** 2;
    }, 0);
    if (!best || err < best.err) best = { err, coef };
  }

  const coefficients = {};
  names.forEach((f, j) => (coefficients[f] = best ? best.coef[j] / scale[j] : 0));
  const relErrors = samples.map((s) => {
    const pred = names.reduce((a, f) => a + coefficients[f] * s.features[f], 0);
    return Math.abs(pred - s.ms) / s.ms;
  });
  relErrors.sort((a, b) => a - b);
  return { coefficients, medianRelError: relErrors[relErrors.length >> 1] };
}

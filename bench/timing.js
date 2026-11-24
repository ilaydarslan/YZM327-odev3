// Süre ölçümü (Görev 4 ölçüm kuralları):
//  - her ölçümden önce bir ısınma turu (JIT derlesin, önbellekler dolsun),
//  - en az 3 tekrar, MEDYAN alınır,
//  - çok kısa işlerde bir "tekrar", toplam en az MIN_BATCH_MS sürecek kadar çalıştırmanın ortalamasıdır
//    (ölçüm çözünürlüğünün altında kalmamak için).

import os from 'node:os';

const MIN_BATCH_MS = 15;

export function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * fn'yi ölçer. Dönüş: { ms (medyan), samples, inner (tekrar başına çalıştırma sayısı) }.
 * @param {() => void} fn
 */
export function measure(fn, { reps = 3 } = {}) {
  // Isınma turu + bir tek çalıştırmanın kabaca süresi
  let t0 = performance.now();
  fn();
  const rough = Math.max(performance.now() - t0, 1e-3);
  const inner = Math.max(1, Math.ceil(MIN_BATCH_MS / rough));
  const samples = [];
  for (let r = 0; r < reps; r++) {
    t0 = performance.now();
    for (let i = 0; i < inner; i++) fn();
    samples.push((performance.now() - t0) / inner);
  }
  return { ms: median(samples), samples, inner };
}

/** Bir atomun bütün işini (ön işleme + bütün kayıtlar) ölçer. */
export function measureAtom(AtomClass, params, entries, options) {
  let sink = 0;
  const result = measure(() => {
    const atom = new AtomClass(params);
    for (const entry of entries) for (const match of atom.process(entry)) sink += match.position & 1;
  }, options);
  result.sink = sink; // sonuç kullanılmış olsun, JIT işi atmasın
  return result;
}

export function machineInfo() {
  const cpus = os.cpus();
  return {
    cpu: cpus[0]?.model ?? 'bilinmiyor',
    cores: cpus.length,
    memoryGB: Math.round(os.totalmem() / 2 ** 30),
    platform: `${os.platform()} ${os.release()}`,
    node: process.version,
    date: new Date().toISOString(),
  };
}

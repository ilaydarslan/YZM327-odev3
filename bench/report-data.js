#!/usr/bin/env node
// Rapor şekilleri için veri: kalibrasyon ızgarasında her hücrede ölçülen en hızlı atom ve
// (kalibre edilmiş) molekülün seçimi. Çıktı: bench/results/figdata.json

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ExactMatch } from '../src/molecules/ExactMatch.js';

const RESULTS = fileURLToPath(new URL('./results/', import.meta.url));
const { rows } = JSON.parse(readFileSync(RESULTS + 'calibration.json', 'utf8'));
const em = new ExactMatch({ patterns: ['A'] });
const byCase = new Map();
for (const r of rows) {
  if (!byCase.has(r.case)) byCase.set(r.case, { ...r, times: {} });
  byCase.get(r.case).times[r.atom] = r.ms;
}
const cells = [];
for (const c of byCase.values()) {
  const est = em.estimate(c.shape);
  const chosen = Object.entries(est).filter(([, e]) => e.applicable).sort((a, b) => a[1].cost - b[1].cost)[0][0];
  const fastest = Object.entries(c.times).sort((a, b) => a[1] - b[1])[0][0];
  const predicted = Object.fromEntries(Object.entries(est).filter(([, e]) => e.applicable).map(([n, e]) => [n, e.cost]));
  cells.push({ alphabet: c.alphabet, n: c.n, m: c.m, k: c.k, fastest, chosen, times: c.times, predicted,
    slowdown: c.times[chosen] / c.times[fastest] });
}
writeFileSync(RESULTS + 'figdata.json', JSON.stringify(cells));
console.log(`${cells.length} hücre yazıldı`);

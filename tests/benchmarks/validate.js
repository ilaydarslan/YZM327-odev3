#!/usr/bin/env node
// Doğrulama (Görev 4.2–4.4): kalibrasyonda kullanılmayan vakalarda bütün atomları ölçer ve
// politikaları karşılaştırır:
//   - ExactMatch (auto, kalibre edilmiş maliyet modeli)
//   - "her zaman aynı atom" (her atom için ayrı)
//   - Allmer 2016 kuralı: m < 50 ise bm4DNADS, değilse bm4DNAHMbs (m = ortalama desen uzunluğu)
// Ölçütler: en hızlıyı seçme oranı, %10 içinde kalma oranı, yavaşlamanın geometrik ortalaması,
// en kötü yavaşlama, toplam sürenin en iyiye oranı.
//
//   npm run bench           → küme 2 (raporlanan): bench/results/validation.json ve validation.md
//   npm run bench -- --set1 → küme 1 (ilk modelin hatalarını bulmak için kullanılan küme): validation_v1.*

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { registry } from '../../src/registry.js';
import { ExactMatch } from '../../src/molecules/ExactMatch.js';
import { computeShape } from '../../src/shape.js';
import { validationCases, buildCase } from '../../bench/cases.js';
import { measureAtom, measure, machineInfo } from '../../bench/timing.js';

const RESULTS = fileURLToPath(new URL('../../bench/results/', import.meta.url));
const ATOMS = registry.atoms().filter((A) => A.manifest.name !== 'NaiveSearch');

const POLICIES = {
  'ExactMatch (auto)': (c) => c.chosen.auto,
  'Allmer 2016 kuralı': (c) => (c.shape.mAvg < 50 ? 'Bm4DnaDsSearch' : 'Bm4DnaHmbsSearch'),
  ...Object.fromEntries(ATOMS.map((A) => [`hep ${A.manifest.name}`, () => A.manifest.name])),
};

function runCases(cases) {
  const out = [];
  const started = Date.now();
  cases.forEach((c, i) => {
    const { docs, patterns } = buildCase(c);
    const shape = computeShape(docs[0], patterns, false);
    const times = {};
    for (const AtomClass of ATOMS) {
      const name = AtomClass.manifest.name;
      if (AtomClass.selection.applicable(shape) !== true) continue;
      times[name] = measureAtom(AtomClass, { patterns }, docs).ms;
    }
    const em = new ExactMatch({ patterns });
    const record = em.decide(docs[0]);
    const decisionMs = measure(() => new ExactMatch({ patterns }).decide(docs[0])).ms;
    const fastest = Object.entries(times).sort((a, b) => a[1] - b[1])[0][0];
    out.push({ ...c, shape, times, fastest, decisionMs, chosen: { auto: record.selected },
      estimates: Object.fromEntries(Object.entries(record.estimates).map(([n, e]) => [n, e.applicable ? e.cost : null])) });
    if ((i + 1) % 10 === 0 || i + 1 === cases.length) process.stderr.write(`[doğrulama] ${i + 1}/${cases.length} vaka, ${((Date.now() - started) / 1000).toFixed(0)} sn\n`);
  });
  process.stderr.write('\n');
  return out;
}

function evaluate(results) {
  const table = [];
  for (const [policy, pick] of Object.entries(POLICIES)) {
    let fastestHits = 0, within10 = 0, logSum = 0, worst = 1, total = 0, best = 0, worstCase = null, counted = 0;
    for (const c of results) {
      const choice = pick(c);
      const bestMs = c.times[c.fastest];
      // Uygulanamaz atomu zorla seçen politika (ör. hep Shift-Or, m > 32): o vaka en kötü atomla sayılır
      const ms = c.times[choice] ?? Math.max(...Object.values(c.times));
      const slowdown = ms / bestMs;
      counted++;
      if (choice === c.fastest) fastestHits++;
      if (slowdown <= 1.1) within10++;
      logSum += Math.log(slowdown);
      if (slowdown > worst) { worst = slowdown; worstCase = c.id; }
      total += ms;
      best += bestMs;
    }
    table.push({
      policy,
      fastestRate: fastestHits / counted,
      within10Rate: within10 / counted,
      geoMeanSlowdown: Math.exp(logSum / counted),
      worstSlowdown: worst,
      worstCase,
      totalRatio: total / best,
    });
  }
  return table;
}

function pct(x) { return `${(x * 100).toFixed(1)}%`; }
function num(x) { return x.toFixed(3); }

function markdown(info, results, table, label) {
  const lines = [];
  lines.push(`# Doğrulama sonuçları`, '');
  lines.push(`Makine: ${info.cpu} (${info.cores} çekirdek), ${info.platform}, Node ${info.node}, ${info.date}.`);
  lines.push(`Vaka sayısı: ${results.length}, ${label} (kalibrasyonda kullanılmayan tohumlar, ızgara arası ve dışı değerler, yeni alfabeler).`, '');
  lines.push('| Politika | En hızlıyı seçme | %10 içinde | Geometrik ort. yavaşlama | En kötü yavaşlama | Toplam / en iyi |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const r of [...table].sort((a, b) => a.geoMeanSlowdown - b.geoMeanSlowdown)) {
    lines.push(`| ${r.policy} | ${pct(r.fastestRate)} | ${pct(r.within10Rate)} | ${num(r.geoMeanSlowdown)} | ${num(r.worstSlowdown)} (${r.worstCase}) | ${num(r.totalRatio)} |`);
  }
  const wrong = results
    .map((c) => ({ c, slowdown: c.times[c.chosen.auto] / c.times[c.fastest] }))
    .filter((x) => x.slowdown > 1.1)
    .sort((a, b) => b.slowdown - a.slowdown);
  lines.push('', `## ExactMatch'in %10'dan fazla yavaş kaldığı vakalar (${wrong.length})`, '');
  lines.push('| Vaka | Alfabe | n | k | m (ort.) | σ | Seçilen | En hızlı | Yavaşlama |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const { c, slowdown } of wrong) {
    lines.push(`| ${c.id} | ${c.alphabet} | ${c.n} | ${c.k} | ${c.shape.mAvg.toFixed(1)} | ${c.shape.sigma} | ${c.chosen.auto} | ${c.fastest} | ${num(slowdown)} |`);
  }
  const avgDecision = results.reduce((s, c) => s + c.decisionMs, 0) / results.length;
  lines.push('', `Karar süresi (veri şekli + tahminler) ortalaması: ${avgDecision.toFixed(3)} ms.`);
  return lines.join('\n') + '\n';
}

function main() {
  const set1 = process.argv.includes('--set1');
  const label = set1 ? 'küme 1 (tohum 20261124)' : 'küme 2 (tohum 20261125)';
  const suffix = set1 ? '_v1' : '';
  mkdirSync(RESULTS, { recursive: true });
  const info = machineInfo();
  const results = runCases(set1 ? validationCases(120, { seed: 20261124, base: 9000 }) : validationCases());
  const table = evaluate(results);
  writeFileSync(`${RESULTS}validation${suffix}.json`, JSON.stringify({ machine: info, set: label, results, table }, null, 1));
  const md = markdown(info, results, table, label);
  writeFileSync(`${RESULTS}validation${suffix}.md`, md);
  console.log(md);
}

main();

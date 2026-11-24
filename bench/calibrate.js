#!/usr/bin/env node
// Kalibrasyon (Görev 4.1): ızgaradaki her vakada bütün atomları ölçer, maliyet modelinin
// katsayılarını ölçümlerden uydurur ve src/calibration.js dosyasını yeniden yazar.
//
//   npm run calibrate             ölç + uydur + yaz (birkaç dakika sürer)
//   npm run calibrate -- --fit    yalnızca bench/results/calibration.json'dan yeniden uydur
//   npm run calibrate -- --quick  hızlı deneme: yalnızca n = 10⁴ vakaları (sonuçları yazmaz)

import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { registry } from '../src/registry.js';
import { computeShape } from '../src/shape.js';
import { calibrationCases, buildCase, GRID } from './cases.js';
import { measureAtom, machineInfo } from './timing.js';
import { fitCoefficients } from './fit.js';

const RESULTS = fileURLToPath(new URL('./results/', import.meta.url));
const CALIBRATION_MODULE = fileURLToPath(new URL('../src/calibration.js', import.meta.url));
const args = new Set(process.argv.slice(2));
const ATOMS = registry.atoms().filter((A) => A.manifest.name !== 'NaiveSearch');

function measureGrid(cases) {
  const rows = [];
  const started = Date.now();
  cases.forEach((c, i) => {
    const { entries, patterns } = buildCase(c);
    const shape = computeShape(entries[0], patterns, false);
    for (const AtomClass of ATOMS) {
      const name = AtomClass.manifest.name;
      const verdict = AtomClass.selection.applicable(shape);
      if (verdict !== true) continue;
      const { ms, samples, inner } = measureAtom(AtomClass, { patterns }, entries);
      rows.push({ case: c.id, alphabet: c.alphabet, n: c.n, m: c.m, k: c.k, atom: name, ms, samples, inner,
        shape, features: AtomClass.selection.features(shape) });
    }
    const elapsed = ((Date.now() - started) / 1000).toFixed(0);
    if ((i + 1) % 10 === 0 || i + 1 === cases.length) process.stderr.write(`[kalibrasyon] ${i + 1}/${cases.length} vaka, ${elapsed} sn\n`);
  });
  process.stderr.write('\n');
  return rows;
}

function fitAll(rows) {
  const result = {};
  for (const AtomClass of ATOMS) {
    const name = AtomClass.manifest.name;
    const samples = rows.filter((r) => r.atom === name);
    if (samples.length === 0) continue;
    result[name] = { ...fitCoefficients(samples), samples: samples.length };
  }
  return result;
}

function writeCalibrationModule(fits, info) {
  const coefficients = Object.fromEntries(Object.entries(fits).map(([n, f]) => [n, f.coefficients]));
  const body =
    `// Kalibrasyondan çıkan katsayılar (ms / özellik birimi). \`npm run calibrate\` bu dosyayı yeniden yazar.\n` +
    `// Ölçüm: ${info.cpu}, Node ${info.node}, ${info.date}.\n` +
    `// Bir atomun burada katsayısı yoksa atomun kendi selection.defaults değeri kullanılır.\n` +
    `export const coefficients = ${JSON.stringify(coefficients, null, 2)};\n`;
  writeFileSync(CALIBRATION_MODULE, body);
}

function main() {
  mkdirSync(RESULTS, { recursive: true });
  let rows;
  let info;
  if (args.has('--fit')) {
    const saved = JSON.parse(readFileSync(RESULTS + 'calibration.json', 'utf8'));
    info = saved.machine;
    // Özellikler, kaydedilmiş veri şeklinden GÜNCEL selection.features ile yeniden hesaplanır
    // (model değişince yeniden ölçmek gerekmesin).
    rows = saved.rows.map((r) => ({ ...r, features: registry.get(r.atom).selection.features(r.shape) }));
  } else {
    info = machineInfo();
    const cases = calibrationCases().filter((c) => !args.has('--quick') || c.n === 1e4);
    rows = measureGrid(cases);
    if (!args.has('--quick')) {
      writeFileSync(RESULTS + 'calibration.json', JSON.stringify({ machine: info, grid: GRID, rows }, null, 1));
    }
  }
  const fits = fitAll(rows);
  for (const [name, f] of Object.entries(fits)) {
    const coef = Object.entries(f.coefficients).map(([k, v]) => `${k}=${v.toExponential(2)}`).join(' ');
    console.log(`${name.padEnd(18)} ${coef}  medyan göreli hata ${(f.medianRelError * 100).toFixed(1)}%`);
  }
  if (!args.has('--quick')) {
    writeFileSync(RESULTS + 'coefficients.json', JSON.stringify({ machine: info, fits }, null, 2));
    writeCalibrationModule(fits, info);
    console.log('src/calibration.js ve bench/results/coefficients.json yazıldı.');
  }
}

main();

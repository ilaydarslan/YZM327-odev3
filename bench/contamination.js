#!/usr/bin/env node
// Gerçek iş yükü deneyi: GSM8K kirlenme taraması.
//   1) Repodaki veride (200 test sorusu × 1000 eğitim kaydı), iki yöntemle (13-gram, 3 × 50 karakter):
//      kirli sorular + bütün atomların arama süresi → molekül gerçek iş yükünde en hızlıyı seçiyor mu?
//   2) İsteğe bağlı: TAM GSM8K (1319 soru × 7473 kayıt). Tek desenli atomlar burada saatler süreceği
//      için yalnızca dedektörün (molekülün seçtiği atomla) toplam süresi ve bulgular yazılır.
//
//   npm run contamination
//   node bench/contamination.js --full <test.jsonl> <train.jsonl>
//   → bench/results/contamination.json ve bench/results/contamination.md

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseJsonl } from '../src/corpus.js';
import { registry } from '../src/registry.js';
import { ExactMatch } from '../src/molecules/ExactMatch.js';
import { ContaminationDetector, joinCorpus } from '../src/contamination/ContaminationDetector.js';
import { createExtractor } from '../src/contamination/extractors.js';
import { computeShape } from '../src/shape.js';
import { measureAtom, machineInfo } from './timing.js';
import { loadGsm8k } from './gsm8k.js';

const RESULTS = fileURLToPath(new URL('./results/', import.meta.url));
const DATA = (name) => fileURLToPath(new URL(`../tests/data/${name}`, import.meta.url));
const ATOMS = registry.atoms().filter((A) => A.manifest.name !== 'NaiveSearch');
const METHODS = [['ngram', { n: 13 }], ['substring', { length: 50, samples: 3 }]];

const contaminatedOf = (result) => result.items.filter((r) => r.contaminated)
  .map((r) => ({ id: r.id, matched: r.matchedPatterns, patterns: r.patterns, docs: r.docs }));

function repoExperiment(benchmark, corpus) {
  const out = [];
  for (const [method, options] of METHODS) {
    const detector = new ContaminationDetector({ extractor: createExtractor(method, options) });
    const result = detector.detect(benchmark, corpus);
    const { patterns } = detector.buildPatterns(benchmark);
    const docs = [{ id: 'korpus', text: joinCorpus(corpus).text }];
    const shape = computeShape(docs[0], patterns, false);
    const times = {};
    for (const AtomClass of ATOMS) {
      const name = AtomClass.manifest.name;
      if (AtomClass.selection.applicable(shape) !== true) continue;
      times[name] = measureAtom(AtomClass, { patterns }, docs).ms;
      process.stderr.write(`[kirlenme] ${method} ${name}: ${times[name].toFixed(1)} ms\n`);
    }
    const selected = new ExactMatch({ patterns }).decide(docs[0]).selected;
    const fastest = Object.entries(times).sort((a, b) => a[1] - b[1])[0][0];
    out.push({
      method: result.method, summary: result.summary, shape, selected, fastest,
      slowdown: times[selected] / times[fastest], times, contaminated: contaminatedOf(result),
    });
  }
  return out;
}

function fullExperiment(testPath, trainPath) {
  const benchmark = loadGsm8k(testPath, 'test');
  const corpus = loadGsm8k(trainPath, 'train');
  const out = [];
  for (const [method, options] of METHODS) {
    const t0 = performance.now();
    const result = new ContaminationDetector({ extractor: createExtractor(method, options) }).detect(benchmark, corpus);
    const ms = performance.now() - t0;
    out.push({ method: result.method, summary: result.summary, selected: result.record.selected,
      shape: result.record.shape, totalMs: ms, contaminated: contaminatedOf(result) });
    process.stderr.write(`[kirlenme] tam GSM8K ${method}: ${result.summary.contaminated} kirli, ${ms.toFixed(0)} ms\n`);
  }
  return out;
}

const fmt = (x, d = 1) => x.toFixed(d).replace('.', ',');

function markdown(info, repo, full) {
  const L = ['# Kirlenme taraması: GSM8K', ''];
  L.push(`Makine: ${info.cpu} (${info.cores} çekirdek), ${info.platform}, Node ${info.node}, ${info.date}.`, '');
  L.push('## Repodaki veri (200 test sorusu × 1000 eğitim kaydı)', '');
  for (const r of repo) {
    L.push(`### ${r.method}`, '');
    L.push(`${r.summary.patterns} desen, korpus ${r.summary.corpusChars} karakter (σ = ${r.shape.sigma}, m = ${r.shape.mMin}–${r.shape.mMax}). ` +
      `Kirli soru: ${r.summary.contaminated} / ${r.summary.items}.`, '');
    L.push(`Molekülün seçimi: **${r.selected}**; ölçülen en hızlı: **${r.fastest}** (yavaşlama ${fmt(r.slowdown, 2)}×).`, '');
    L.push('| Atom | Süre (ms) | En hızlıya oran |', '| --- | --- | --- |');
    const best = r.times[r.fastest];
    for (const [name, ms] of Object.entries(r.times).sort((a, b) => a[1] - b[1])) {
      L.push(`| ${name}${name === r.selected ? ' (seçilen)' : ''} | ${fmt(ms)} | ${fmt(ms / best, 2)}× |`);
    }
    L.push('', '| Kirli soru | Eşleşen desen | Eğitim kaydı |', '| --- | --- | --- |');
    for (const c of r.contaminated) L.push(`| ${c.id} | ${c.matched} / ${c.patterns} | ${c.docs.join(', ')} |`);
    L.push('');
  }
  if (full) {
    L.push('## Tam GSM8K (1319 test sorusu × 7473 eğitim kaydı)', '');
    L.push('| Yöntem | Desen | Kirli soru | Oran | Seçilen atom | Toplam süre |', '| --- | --- | --- | --- | --- | --- |');
    for (const r of full) {
      L.push(`| ${r.method} | ${r.summary.patterns} | ${r.summary.contaminated} | %${fmt(r.summary.rate * 100, 2)} | ${r.selected} | ${fmt(r.totalMs / 1000, 2)} sn |`);
    }
    for (const r of full) {
      L.push('', `${r.method}: ${r.contaminated.map((c) => `${c.id} ↔ ${c.docs.join(', ')} (${c.matched}/${c.patterns})`).join('; ')}`);
    }
    L.push('');
  }
  return L.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  mkdirSync(RESULTS, { recursive: true });
  const info = machineInfo();
  const benchmark = parseJsonl(readFileSync(DATA('gsm8k_test_200.jsonl'), 'utf8'));
  const corpus = parseJsonl(readFileSync(DATA('gsm8k_train_1000.jsonl'), 'utf8'));
  const repo = repoExperiment(benchmark, corpus);
  const fullIndex = args.indexOf('--full');
  const full = fullIndex >= 0 ? fullExperiment(args[fullIndex + 1], args[fullIndex + 2]) : null;
  writeFileSync(RESULTS + 'contamination.json', JSON.stringify({ machine: info, repo, full }, null, 1));
  const md = markdown(info, repo, full);
  writeFileSync(RESULTS + 'contamination.md', md);
  console.log(md);
}

main();

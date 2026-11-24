#!/usr/bin/env node
// Komut satırı — FACADE deseni: korpusu okuma, molekülü/dedektörü kurma, karar ve çıktı yazma
// işlerini birkaç basit komutun arkasına saklar.
//
//   node bin/ios.js run ExactMatch --patterns P1,P2 [--ignoreCase] [--strategy auto] < korpus.jsonl > eslesmeler.jsonl
//   node bin/ios.js explain --patterns P1,P2 [--ignoreCase] < korpus.jsonl
//   node bin/ios.js contamination --benchmark sorular.jsonl [--method ngram|substring] [--n 13]
//                                 [--length 50] [--samples 3] [--strategy auto] < korpus.jsonl

import { readFileSync } from 'node:fs';
import { parseJsonl } from '../src/corpus.js';
import { ExactMatch } from '../src/molecules/ExactMatch.js';
import { ContaminationDetector } from '../src/contamination/ContaminationDetector.js';
import { createExtractor } from '../src/contamination/extractors.js';

const USAGE = `Kullanım:
  node bin/ios.js run ExactMatch --patterns P1,P2 [--ignoreCase] [--strategy auto|<atom>] < korpus.jsonl
  node bin/ios.js explain --patterns P1,P2 [--ignoreCase] [--strategy auto|<atom>] < korpus.jsonl
  node bin/ios.js contamination --benchmark sorular.jsonl [--method ngram|substring] [--n 13]
                                [--length 50] [--samples 3] [--strategy auto|<atom>] < korpus.jsonl`;

const VALUE_OPTIONS = new Set(['--patterns', '--strategy', '--benchmark', '--method', '--n', '--length', '--samples']);

function parseArgs(argv) {
  const options = { ignoreCase: false, strategy: 'auto', patterns: null };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (VALUE_OPTIONS.has(arg)) options[arg.slice(2)] = argv[++i];
    else if (arg === '--ignoreCase') options.ignoreCase = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else positional.push(arg);
  }
  if (typeof options.patterns === 'string') options.patterns = options.patterns.split(',');
  return { positional, options };
}

function toInt(value, name) {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n)) throw new Error(`--${name} bir tam sayı olmalı`);
  return n;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function runMolecule(options, docs) {
  if (!options.patterns) throw new Error('--patterns gerekli');
  const molecule = new ExactMatch({ patterns: options.patterns, ignoreCase: options.ignoreCase, strategy: options.strategy });
  let buffer = [];
  for (const match of molecule.run(docs)) {
    buffer.push(JSON.stringify(match));
    if (buffer.length >= 10000) {
      process.stdout.write(buffer.join('\n') + '\n');
      buffer = [];
    }
  }
  if (buffer.length) process.stdout.write(buffer.join('\n') + '\n');
  if (molecule.record.selected) {
    console.error(`[ExactMatch] seçilen: ${molecule.record.selected} — ${molecule.record.why}`);
  }
}

function explain(options, docs) {
  if (!options.patterns) throw new Error('--patterns gerekli');
  if (docs.length === 0) throw new Error('Girdide belge yok');
  const molecule = new ExactMatch({ patterns: options.patterns, ignoreCase: options.ignoreCase, strategy: options.strategy });
  process.stdout.write(JSON.stringify(molecule.decide(docs[0]), null, 2) + '\n');
}

function contamination(options, corpus) {
  if (!options.benchmark) throw new Error('--benchmark gerekli (test soruları, JSONL)');
  const benchmark = parseJsonl(readFileSync(options.benchmark, 'utf8'));
  const method = options.method ?? 'ngram';
  const extractor = createExtractor(method, {
    n: toInt(options.n, 'n'),
    length: toInt(options.length, 'length'),
    samples: toInt(options.samples, 'samples'),
  });
  const detector = new ContaminationDetector({ extractor, strategy: options.strategy });
  const result = detector.detect(benchmark, corpus);
  const { summary, record } = result;

  const report = {
    method: result.method,
    summary,
    decision: record && { selected: record.selected, why: record.why, shape: record.shape },
    contaminated: result.items.filter((r) => r.contaminated),
  };
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  console.error(
    `[Kirlenme] ${summary.items} sorunun ${summary.contaminated} tanesi (%${(summary.rate * 100).toFixed(1).replace('.', ',')}) ` +
      `korpusta geçiyor; ${summary.patterns} desen, ${summary.corpusDocs} belge` +
      (record ? `; seçilen atom: ${record.selected}` : ''),
  );
}

async function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const [command, component] = positional;

  if (options.help || !command) {
    console.error(USAGE);
    process.exitCode = command ? 0 : 1;
    return;
  }

  // Eksik parametre, girdi beklenmeden bildirilsin
  if ((command === 'run' || command === 'explain') && !options.patterns) throw new Error('--patterns gerekli');
  if (command === 'contamination' && !options.benchmark) throw new Error('--benchmark gerekli (test soruları, JSONL)');

  const docs = parseJsonl(await readStdin());
  if (command === 'run') {
    if (component !== 'ExactMatch') throw new Error(`Bilinmeyen bileşen "${component}". Geçerli: ExactMatch`);
    runMolecule(options, docs);
  } else if (command === 'explain') {
    explain(options, docs);
  } else if (command === 'contamination') {
    contamination(options, docs);
  } else {
    throw new Error(`Bilinmeyen komut "${command}"\n${USAGE}`);
  }
}

main().catch((err) => {
  console.error(`Hata: ${err.message}`);
  process.exitCode = 1;
});

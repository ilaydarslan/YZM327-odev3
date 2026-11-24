#!/usr/bin/env node
// Komut satırı — FACADE deseni: girdiyi okuma, molekülü/dedektörü kurma, karar ve çıktı yazma
// işlerini birkaç basit komutun arkasına saklar.
//
// Girdi iki biçimde olabilir; ilk karaktere bakılarak anlaşılır:
//   FASTA (">" ile başlar)  docx'teki sözleşme; çıktı Sequence.Match { header, pattern, position, length }
//   JSONL ("{" ile başlar)  dil modeli eğitim verisi { id, text }; JsonlFastaAdapter ile çekirdeğe bağlanır,
//                           çıktı { id, pattern, position, length }
//
//   node bin/ios.js run ExactMatch --patterns ACGT,GGCC [--ignoreCase] [--strategy auto] < girdi.fasta > cikti.jsonl
//   node bin/ios.js explain --patterns ACGT,GGCC < girdi.fasta
//   node bin/ios.js contamination --benchmark sorular.jsonl [--method ngram|substring] [--n 13]
//                                 [--length 50] [--samples 3] [--strategy auto] < korpus.jsonl

import { readFileSync } from 'node:fs';
import { parseFasta } from '../src/fasta.js';
import { parseJsonl, JsonlFastaAdapter } from '../src/corpus.js';
import { ExactMatch } from '../src/molecules/ExactMatch.js';
import { ContaminationDetector } from '../src/contamination/ContaminationDetector.js';
import { createExtractor } from '../src/contamination/extractors.js';

const USAGE = `Kullanım:
  node bin/ios.js run ExactMatch --patterns P1,P2 [--ignoreCase] [--strategy auto|<atom>] < girdi.fasta|girdi.jsonl
  node bin/ios.js explain --patterns P1,P2 [--ignoreCase] [--strategy auto|<atom>] < girdi.fasta|girdi.jsonl
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

/** Girdiyi okur: FASTA ise kayıtlar olduğu gibi, JSONL ise Adapter'dan geçirilerek FASTA.Entry olur. */
function readInput(content) {
  const first = content.trimStart()[0];
  if (first === undefined) return { format: 'fasta', entries: [] };
  if (first === '>') return { format: 'fasta', entries: parseFasta(content) };
  return { format: 'jsonl', entries: JsonlFastaAdapter.toEntries(parseJsonl(content)) };
}

function runMolecule(options, { format, entries }) {
  const molecule = new ExactMatch({ patterns: options.patterns, ignoreCase: options.ignoreCase, strategy: options.strategy });
  const shown = format === 'jsonl' ? JsonlFastaAdapter.toMatch : (match) => match;
  let buffer = [];
  for (const match of molecule.run(entries)) {
    buffer.push(JSON.stringify(shown(match)));
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

function explain(options, { entries }) {
  if (entries.length === 0) throw new Error('Girdide kayıt yok');
  const molecule = new ExactMatch({ patterns: options.patterns, ignoreCase: options.ignoreCase, strategy: options.strategy });
  process.stdout.write(JSON.stringify(molecule.decide(entries[0]), null, 2) + '\n');
}

function contamination(options, { entries }) {
  const corpus = entries.map((entry) => JsonlFastaAdapter.toDoc(entry));
  const benchmarkInput = readInput(readFileSync(options.benchmark, 'utf8'));
  const benchmark = benchmarkInput.entries.map((entry) => JsonlFastaAdapter.toDoc(entry));
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

  const input = readInput(await readStdin());
  if (command === 'run') {
    if (component !== 'ExactMatch') throw new Error(`Bilinmeyen bileşen "${component}". Geçerli: ExactMatch`);
    runMolecule(options, input);
  } else if (command === 'explain') {
    explain(options, input);
  } else if (command === 'contamination') {
    contamination(options, input);
  } else {
    throw new Error(`Bilinmeyen komut "${command}"\n${USAGE}`);
  }
}

main().catch((err) => {
  console.error(`Hata: ${err.message}`);
  process.exitCode = 1;
});

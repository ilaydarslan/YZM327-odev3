#!/usr/bin/env node
// Komut satırı — FACADE deseni: FASTA okuma, molekülü kurma, karar ve çıktı yazma
// işlerini tek basit komutun arkasına saklar.
//
//   node bin/ios.js run ExactMatch --patterns ACGT,GGCC [--ignoreCase] [--strategy auto] < girdi.fasta > cikti.jsonl
//   node bin/ios.js explain --patterns ACGT,GGCC [--ignoreCase] < girdi.fasta

import { parseFasta } from '../src/fasta.js';
import { ExactMatch } from '../src/molecules/ExactMatch.js';

const USAGE = `Kullanım:
  node bin/ios.js run ExactMatch --patterns P1,P2 [--ignoreCase] [--strategy auto|<atom>] < girdi.fasta
  node bin/ios.js explain --patterns P1,P2 [--ignoreCase] [--strategy auto|<atom>] < girdi.fasta`;

function parseArgs(argv) {
  const options = { ignoreCase: false, strategy: 'auto', patterns: null };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--patterns') options.patterns = argv[++i]?.split(',') ?? [];
    else if (arg === '--ignoreCase') options.ignoreCase = true;
    else if (arg === '--strategy') options.strategy = argv[++i];
    else if (arg === '--help' || arg === '-h') options.help = true;
    else positional.push(arg);
  }
  return { positional, options };
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const [command, component] = positional;

  if (options.help || !command) {
    console.error(USAGE);
    process.exitCode = command ? 0 : 1;
    return;
  }
  if (!options.patterns) throw new Error('--patterns gerekli');

  const entries = parseFasta(await readStdin());
  const molecule = new ExactMatch({
    patterns: options.patterns,
    ignoreCase: options.ignoreCase,
    strategy: options.strategy,
  });

  if (command === 'explain') {
    if (entries.length === 0) throw new Error('Girdide FASTA kaydı yok');
    process.stdout.write(JSON.stringify(molecule.decide(entries[0]), null, 2) + '\n');
    return;
  }

  if (command === 'run') {
    if (component !== 'ExactMatch') throw new Error(`Bilinmeyen bileşen "${component}". Geçerli: ExactMatch`);
    let buffer = [];
    for (const match of molecule.run(entries)) {
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
    return;
  }

  throw new Error(`Bilinmeyen komut "${command}"\n${USAGE}`);
}

main().catch((err) => {
  console.error(`Hata: ${err.message}`);
  process.exitCode = 1;
});

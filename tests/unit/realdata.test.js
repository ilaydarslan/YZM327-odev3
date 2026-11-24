// Gerçek veri testleri (Görev 2): lambda faj genomu ve 126 E. coli proteini.
// Her atom ve molekül, NaiveSearch ile ELEMAN ELEMAN aynı sonucu vermeli.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseFasta } from '../../src/fasta.js';
import { NaiveSearch } from '../../src/atomic/NaiveSearch.js';
import { ExactMatch } from '../../src/molecules/ExactMatch.js';
import { REAL_ATOMS, runAtom } from './helpers.js';
import { makeRandom, randomInt } from '../../bench/data.js';

const dataPath = (name) => fileURLToPath(new URL(`../data/${name}`, import.meta.url));
const lambda = parseFasta(readFileSync(dataPath('lambda_NC_001416.fa'), 'utf8'));
const ecoli = parseFasta(readFileSync(dataPath('ecoli_k12_126_proteins.fasta'), 'utf8'));

/** Metinden kesilmiş desenler (kesin eşleşme olsun) + birkaç rastgele (eşleşmesin). */
function cut(random, seq, count, minLen, maxLen) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const m = randomInt(random, minLen, maxLen);
    const start = randomInt(random, 0, seq.length - m);
    out.push(seq.slice(start, start + m));
  }
  return out;
}

function checkAll(entries, params) {
  const expected = runAtom(new NaiveSearch(params), entries);
  for (const AtomClass of REAL_ATOMS) {
    const mMax = Math.max(...params.patterns.map((p) => p.length));
    if (AtomClass.selection.applicable({ mMax }) !== true) continue;
    const got = runAtom(new AtomClass(params), entries);
    assert.deepEqual(got, expected, AtomClass.manifest.name);
  }
  const em = new ExactMatch(params);
  assert.deepEqual([...em.run(entries)], expected, `ExactMatch (${em.record.selected})`);
  return expected.length;
}

describe('Gerçek veri: lambda faj genomu (NC_001416.1)', () => {
  const random = makeRandom(1416);
  const seq = lambda[0].seq;

  it('veri beklendiği gibi: 1 kayıt, 48 502 baz', () => {
    assert.equal(lambda.length, 1);
    assert.equal(seq.length, 48502);
  });

  it('kısa desenler (1–12 baz)', () => {
    const patterns = [...cut(random, seq, 20, 1, 12), 'A', 'GATC', 'GGATCC'];
    assert.ok(checkAll(lambda, { patterns }) > 0);
  });

  it('uzun desenler (50–500 baz)', () => {
    const patterns = cut(random, seq, 12, 50, 500);
    assert.ok(checkAll(lambda, { patterns }) >= 12);
  });

  it('çok sayıda desen (300, karışık uzunluk, tekrar eden desen dahil)', () => {
    const patterns = cut(random, seq, 300, 4, 40);
    patterns.push(patterns[0], patterns[1]);
    assert.ok(checkAll(lambda, { patterns }) >= 302);
  });

  it('ignoreCase: küçük harfli genom, karışık harfli desenler', () => {
    const lower = [{ header: lambda[0].header, seq: seq.toLowerCase() }];
    const patterns = cut(random, seq, 10, 5, 60).map((p, i) => (i % 2 ? p.toLowerCase() : p));
    assert.ok(checkAll(lower, { patterns, ignoreCase: true }) >= 10);
  });
});

describe('Gerçek veri: 126 E. coli K-12 proteini', () => {
  const random = makeRandom(83333);

  it('veri beklendiği gibi: 126 kayıt', () => {
    assert.equal(ecoli.length, 126);
  });

  it('birden çok kayıtlı akış, protein desenleri (3–30 amino asit)', () => {
    const patterns = [];
    for (let i = 0; i < 40; i++) {
      const entry = ecoli[randomInt(random, 0, ecoli.length - 1)];
      patterns.push(...cut(random, entry.seq, 1, 3, 30));
    }
    patterns.push('M', 'KK', 'WW');
    assert.ok(checkAll(ecoli, { patterns }) >= 40);
  });

  it('uzun protein desenleri (40–150 amino asit)', () => {
    const patterns = ecoli.slice(0, 10).map((e) => e.seq.slice(5, 5 + Math.min(150, e.seq.length - 5)));
    assert.ok(checkAll(ecoli, { patterns }) >= 10);
  });
});

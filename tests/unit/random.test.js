// Tohumlu rastgele testler: her atom ve molekül, NaiveSearch ile ELEMAN ELEMAN aynı sonucu vermeli.
// 420 rastgele vaka: farklı alfabeler, çok tekrarlı metinler, karışık uzunlukta desenler,
// aynı desenin iki kez verilmesi, birden çok kayıt, ignoreCase.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { REAL_ATOMS, runAtom } from './helpers.js';
import { NaiveSearch } from '../../src/atomic/NaiveSearch.js';
import { ExactMatch } from '../../src/molecules/ExactMatch.js';
import {
  makeRandom, ALPHABETS, randomInt, randomText, repetitiveText, randomPatterns,
} from '../../bench/data.js';

const CASES = 420;
const SEED = 20261124;

function makeCase(random, index) {
  const alphabetNames = Object.keys(ALPHABETS);
  const alphabet = ALPHABETS[alphabetNames[index % alphabetNames.length]];
  const entryCount = randomInt(random, 1, 3);
  const entries = [];
  for (let e = 0; e < entryCount; e++) {
    const n = randomInt(random, 0, 600);
    let seq;
    const kind = random();
    if (kind < 0.15) seq = repetitiveText(randomText(random, alphabet, randomInt(random, 1, 3)), n);
    else seq = randomText(random, alphabet, n);
    entries.push({ header: `>rec${e} case${index}`, seq });
  }
  const sample = entries[0].seq;
  const k = randomInt(random, 1, random() < 0.2 ? 40 : 6);
  const patterns = randomPatterns(random, sample, alphabet, k, 1, random() < 0.2 ? 60 : 12);
  if (random() < 0.15) patterns.push(patterns[0]); // aynı desen iki kez
  const ignoreCase = random() < 0.3;
  if (ignoreCase) {
    // desenlerin harflerini karıştır ki ignoreCase gerçekten sınansın
    for (let i = 0; i < patterns.length; i++) {
      patterns[i] = [...patterns[i]].map((ch) => (random() < 0.5 ? ch.toUpperCase() : ch.toLowerCase())).join('');
    }
  }
  return { entries, patterns, ignoreCase };
}

describe(`Rastgele vakalar (${CASES}, tohum ${SEED})`, () => {
  const random = makeRandom(SEED);
  const cases = Array.from({ length: CASES }, (_, i) => makeCase(random, i));

  for (const AtomClass of REAL_ATOMS) {
    it(`${AtomClass.manifest.name} = NaiveSearch`, () => {
      let compared = 0;
      for (const [i, c] of cases.entries()) {
        const verdict = AtomClass.selection.applicable({ mMax: Math.max(...c.patterns.map((p) => p.length)) });
        if (verdict !== true) continue; // ör. Shift-Or uzun desende uygulanamaz
        const expected = runAtom(new NaiveSearch(c), c.entries);
        const got = runAtom(new AtomClass(c), c.entries);
        assert.deepEqual(got, expected, `vaka ${i} farklı: ${JSON.stringify(c.patterns)}`);
        compared++;
      }
      assert.ok(compared >= 300, `en az 300 vaka karşılaştırılmalı, ${compared} oldu`);
    });
  }

  it('ExactMatch (auto) = NaiveSearch', () => {
    for (const [i, c] of cases.entries()) {
      const expected = runAtom(new NaiveSearch(c), c.entries);
      const molecule = new ExactMatch({ ...c, strategy: 'auto' });
      const got = [...molecule.run(c.entries)];
      assert.deepEqual(got, expected, `vaka ${i}, seçilen ${molecule.record.selected}`);
    }
  });
});

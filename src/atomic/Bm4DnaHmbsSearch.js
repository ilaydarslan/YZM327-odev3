// Atom: bm4DNAHMbs (Allmer 2016; Wu & Manber 1994). Çekirdek: src/functions/bm4dnaHmbs.js

import { ExactSearchAtom, TASK } from './ExactSearchAtom.js';
import { buildHmbsTables, searchBm4DnaHmbs } from '../functions/bm4dnaHmbs.js';
import { chooseQ, expectedQgramShift, expectedMatches } from '../functions/shiftModel.js';
import { withSentinel } from '../functions/sentinel.js';

export class Bm4DnaHmbsSearch extends ExactSearchAtom {
  static manifest = {
    name: 'Bm4DnaHmbsSearch',
    version: '0.1.0',
    kind: 'atom',
    task: TASK,
    title: 'Exact match (bm4DNAHMbs: q-gram shift table, suffix-only stop, 3-fold unrolled skip loop)',
    references: ['Allmer 2016', 'Wu & Manber 1994'],
  };

  static selection = {
    // Adım sayısı ≈ k · n / (beklenen q-gram kayması). Her adımın sabit bir maliyeti (probe: tablo
    // okuma, döngü) ve q ile orantılı bir maliyeti (hash: q karakterlik özet) vardır; ayrı ölçülür.
    features(shape) {
      const q = chooseQ(shape.mAvg, shape.sigma);
      const steps = (shape.k * shape.n) / expectedQgramShift(shape.mAvg, q, shape.sigma);
      const table = Math.min(65536, Math.pow(shape.sigma + 1, q));
      return { probe: steps, hash: steps * q, prep: shape.k * (table + shape.mAvg * q), text: shape.n, out: expectedMatches(shape) };
    },
    defaults: { probe: 2e-6, hash: 2e-6, prep: 2e-6, text: 3e-6, out: 1e-4 },
    applicable() {
      return true;
    },
  };

  prepare() {
    this.tables = this.keys.map((key) => buildHmbsTables(key, this.alphabet));
  }

  search(text, collector) {
    withSentinel(text, this.keys, (buf, key, patternIndex) => {
      searchBm4DnaHmbs(buf, text.length, key, this.tables[patternIndex], this.alphabet.map, (pos) =>
        collector.add(pos, patternIndex),
      );
    });
  }
}

// Atom: Knuth-Morris-Pratt. Çekirdek: src/functions/kmp.js

import { ExactSearchAtom, TASK } from './ExactSearchAtom.js';
import { expectedMatches } from '../functions/shiftModel.js';
import { buildFailure, searchKmp } from '../functions/kmp.js';

export class KmpSearch extends ExactSearchAtom {
  static manifest = {
    name: 'KmpSearch',
    version: '0.1.0',
    kind: 'atom',
    task: TASK,
    title: 'Exact match (Knuth-Morris-Pratt)',
    references: ['Knuth, Morris & Pratt 1977'],
  };

  static selection = {
    // Her desen için metin bir kez okunur: k · n (geri dönüşler sabit çarpana girer).
    features(shape) {
      return { scan: shape.k * shape.n, prep: shape.k * shape.mAvg, text: shape.n, out: expectedMatches(shape) };
    },
    defaults: { scan: 3e-6, prep: 2e-5, text: 2e-6, out: 1e-4 },
    applicable() {
      return true;
    },
  };

  prepare() {
    this.failures = this.keys.map((key) => buildFailure(key));
  }

  searchOne(text, patternIndex, collector) {
    searchKmp(text, this.keys[patternIndex], this.failures[patternIndex], (pos) =>
      collector.add(pos, patternIndex),
    );
  }
}

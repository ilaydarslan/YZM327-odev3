// Atom: Boyer-Moore (kötü karakter + iyi sonek). Çekirdek: src/functions/boyerMoore.js

import { ExactSearchAtom, TASK } from './ExactSearchAtom.js';
import { buildLastOccurrence, buildGoodSuffix, searchBoyerMoore } from '../functions/boyerMoore.js';
import { expectedCharShift, expectedMatches } from '../functions/shiftModel.js';

export class BoyerMooreSearch extends ExactSearchAtom {
  static manifest = {
    name: 'BoyerMooreSearch',
    version: '0.1.0',
    kind: 'atom',
    task: TASK,
    title: 'Exact match (Boyer-Moore)',
    references: ['Boyer & Moore 1977'],
  };

  static selection = {
    // Adım sayısı ≈ k · n / (beklenen kötü karakter kayması); iyi sonek kuralı bunu biraz artırır.
    features(shape) {
      const steps = (shape.k * shape.n) / expectedCharShift(shape.mAvg, shape.sigma);
      return { scan: steps, prep: shape.k * shape.mAvg, text: shape.n, out: expectedMatches(shape) };
    },
    defaults: { scan: 4e-6, prep: 2e-5, text: 2e-6, out: 1e-4 },
    applicable() {
      return true;
    },
  };

  prepare() {
    this.occ = this.keys.map((key) => buildLastOccurrence(key, this.alphabet));
    this.goodSuffix = this.keys.map((key) => buildGoodSuffix(key));
  }

  searchOne(text, patternIndex, collector) {
    searchBoyerMoore(
      text, this.keys[patternIndex], this.occ[patternIndex], this.goodSuffix[patternIndex], this.alphabet.map,
      (pos) => collector.add(pos, patternIndex),
    );
  }
}

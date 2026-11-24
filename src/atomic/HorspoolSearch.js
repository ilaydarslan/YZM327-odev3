// Atom: Horspool. Çekirdek: src/functions/horspool.js

import { ExactSearchAtom, TASK } from './ExactSearchAtom.js';
import { buildHorspoolShift, searchHorspool } from '../functions/horspool.js';
import { expectedCharShift, expectedMatches } from '../functions/shiftModel.js';

export class HorspoolSearch extends ExactSearchAtom {
  static manifest = {
    name: 'HorspoolSearch',
    version: '0.1.0',
    kind: 'atom',
    task: TASK,
    title: 'Exact match (Horspool)',
    references: ['Horspool 1980'],
  };

  static selection = {
    // Beklenen adım sayısı: her desen için n / (beklenen kayma). Beklenen kayma, rastgele metinde
    // pencerenin son karakterinin desende ne kadar geride geçtiğinin ortalamasıdır (shiftModel.js).
    features(shape) {
      const steps = (shape.k * shape.n) / expectedCharShift(shape.mAvg, shape.sigma);
      return { scan: steps, prep: shape.k * shape.mAvg, text: shape.n, out: expectedMatches(shape) };
    },
    defaults: { scan: 3e-6, prep: 2e-5, text: 2e-6, out: 1e-4 },
    applicable() {
      return true;
    },
  };

  prepare() {
    this.shifts = this.keys.map((key) => buildHorspoolShift(key, this.alphabet));
  }

  searchOne(text, patternIndex, collector) {
    searchHorspool(text, this.keys[patternIndex], this.shifts[patternIndex], this.alphabet.map, (pos) =>
      collector.add(pos, patternIndex),
    );
  }
}

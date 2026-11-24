// Referans atom (test oracle'ı). Molekül bunu otomatik seçmez;
// ama strategy: 'NaiveSearch' ile zorla kullanılabilir.

import { ExactSearchAtom, TASK } from './ExactSearchAtom.js';
import { searchNaive } from '../functions/naive.js';

export class NaiveSearch extends ExactSearchAtom {
  static manifest = {
    name: 'NaiveSearch',
    version: '0.1.0',
    kind: 'atom',
    task: TASK,
    title: 'Exact match (naive, reference)',
    references: [],
  };

  static selection = {
    features(shape) {
      return { scan: shape.n * shape.k * shape.mAvg, prep: 0 };
    },
    defaults: { scan: 1e-6, prep: 0 },
    applicable() {
      return 'yalnızca test referansı (oracle); otomatik seçimde kullanılmaz';
    },
  };

  searchOne(text, patternIndex, collector) {
    searchNaive(text, this.keys[patternIndex], (pos) => collector.add(pos, patternIndex));
  }
}

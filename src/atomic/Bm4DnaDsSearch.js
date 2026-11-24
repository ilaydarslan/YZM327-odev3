// Atom: bm4DNADS (Allmer 2016). Çekirdek: src/functions/bm4dnaDs.js

import { ExactSearchAtom, TASK } from './ExactSearchAtom.js';
import { buildDsTables, searchBm4DnaDs } from '../functions/bm4dnaDs.js';
import { expectedCharShift, expectedMatches } from '../functions/shiftModel.js';
import { withSentinel } from '../functions/sentinel.js';

export class Bm4DnaDsSearch extends ExactSearchAtom {
  static manifest = {
    name: 'Bm4DnaDsSearch',
    version: '0.1.0',
    kind: 'atom',
    task: TASK,
    title: 'Exact match (bm4DNADS: double shift table, sentinel, 3-fold unrolled skip loop)',
    references: ['Allmer 2016', 'Hume & Sunday 1991'],
  };

  static selection = {
    // Horspool ile aynı kayma, ama atlama döngüsü karşılaştırmasız ve açılmış: adım başına daha ucuz.
    features(shape) {
      const steps = (shape.k * shape.n) / expectedCharShift(shape.mAvg, shape.sigma);
      return { scan: steps, prep: shape.k * shape.mAvg, text: shape.n, out: expectedMatches(shape) };
    },
    defaults: { scan: 2.5e-6, prep: 2e-5, text: 3e-6, out: 1e-4 },
    applicable() {
      return true;
    },
  };

  prepare() {
    this.tables = this.keys.map((key) => buildDsTables(key, this.alphabet));
  }

  // Desen metnin sonuna eklendiği için desenler tek tek ama ortak bir tamponla aranır.
  search(text, collector) {
    withSentinel(text, this.keys, (buf, key, patternIndex) => {
      searchBm4DnaDs(buf, text.length, key, this.tables[patternIndex], this.alphabet.map, (pos) =>
        collector.add(pos, patternIndex),
      );
    });
  }
}

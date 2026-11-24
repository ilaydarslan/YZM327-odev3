// Atom: Aho-Corasick (çok desen, tek geçiş). Çekirdek: src/functions/ahoCorasick.js

import { ExactSearchAtom, TASK } from './ExactSearchAtom.js';
import { expectedMatches } from '../functions/shiftModel.js';
import { buildAutomaton, searchAhoCorasick } from '../functions/ahoCorasick.js';

export class AhoCorasickSearch extends ExactSearchAtom {
  static manifest = {
    name: 'AhoCorasickSearch',
    version: '0.1.0',
    kind: 'atom',
    task: TASK,
    title: 'Exact match (Aho-Corasick)',
    references: ['Aho & Corasick 1975'],
  };

  static selection = {
    // Desen sayısından bağımsız tek geçiş: n. Ön işleme: otomat (toplam desen uzunluğu × alfabe).
    features(shape) {
      return { scan: shape.n, prep: shape.k * shape.mAvg * (shape.sigma + 1), text: shape.n, out: expectedMatches(shape) };
    },
    defaults: { scan: 6e-6, prep: 1e-6, text: 2e-6, out: 1e-4 },
    applicable() {
      return true;
    },
  };

  prepare() {
    this.automaton = buildAutomaton(this.keys, this.alphabet);
    this.lengths = this.keys.map((key) => key.length);
  }

  // Çok desenli algoritma: varsayılan "desen desen ara" adımını tümden değiştirir.
  search(text, collector) {
    searchAhoCorasick(text, this.automaton, this.alphabet.map, this.lengths, (pos, patternIndex) =>
      collector.add(pos, patternIndex),
    );
  }
}

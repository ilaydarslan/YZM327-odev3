// Atom: Wu-Manber (çok desen, blok kayması). Çekirdek: src/functions/wuManber.js

import { ExactSearchAtom, TASK } from './ExactSearchAtom.js';
import { buildWuManber, searchWuManber } from '../functions/wuManber.js';
import { chooseQ, expectedQgramShift, expectedMatches } from '../functions/shiftModel.js';

export class WuManberSearch extends ExactSearchAtom {
  static manifest = {
    name: 'WuManberSearch',
    version: '0.1.0',
    kind: 'atom',
    task: TASK,
    title: 'Exact match (Wu-Manber, multi-pattern block shift)',
    references: ['Wu & Manber 1994'],
  };

  static selection = {
    // Metin bir kez, en kısa desen boyuna göre atlanarak geçilir. Kayma 0 olan konumlarda
    // o bloğa sahip desenler doğrulanır (beklenen aday ≈ k · σ^-B).
    features(shape) {
      const B = chooseQ(shape.mMin, shape.sigma, shape.k);
      const probes = shape.n / expectedQgramShift(shape.mMin, B, shape.sigma, shape.k);
      const verify = shape.n * Math.min(1, shape.k * Math.pow(Math.max(2, shape.sigma), -B));
      const table = Math.min(65536, Math.pow(shape.sigma + 1, B));
      return { probe: probes, hash: probes * B, verify, prep: table + shape.k * shape.mMin * B, text: shape.n, out: expectedMatches(shape) };
    },
    defaults: { probe: 2e-6, hash: 2e-6, verify: 1e-5, prep: 2e-6, text: 2e-6, out: 1e-4 },
    applicable() {
      return true;
    },
  };

  prepare() {
    this.table = buildWuManber(this.keys, this.alphabet);
  }

  search(text, collector) {
    searchWuManber(text, this.keys, this.table, this.alphabet.map, (pos, patternIndex) =>
      collector.add(pos, patternIndex),
    );
  }
}

// Atom: Shift-Or (bit paralel). Çekirdek: src/functions/shiftOr.js

import { ExactSearchAtom, TASK } from './ExactSearchAtom.js';
import { expectedMatches } from '../functions/shiftModel.js';
import { buildShiftOrMasks, searchShiftOr, SHIFT_OR_MAX_LENGTH } from '../functions/shiftOr.js';

export class ShiftOrSearch extends ExactSearchAtom {
  static manifest = {
    name: 'ShiftOrSearch',
    version: '0.1.0',
    kind: 'atom',
    task: TASK,
    title: 'Exact match (Shift-Or, bit-parallel)',
    references: ['Baeza-Yates & Gonnet 1992'],
  };

  static selection = {
    // Her desen için metnin her karakterine bir adım: k · n.
    features(shape) {
      return { scan: shape.k * shape.n, prep: shape.k * shape.mAvg, text: shape.n, out: expectedMatches(shape) };
    },
    defaults: { scan: 1.5e-6, prep: 2e-5, text: 2e-6, out: 1e-4 },
    applicable(shape) {
      return shape.mMax <= SHIFT_OR_MAX_LENGTH
        ? true
        : `en uzun desen ${shape.mMax} karakter; Shift-Or en fazla ${SHIFT_OR_MAX_LENGTH} karakteri destekler`;
    },
  };

  prepare() {
    for (const key of this.keys) {
      if (key.length > SHIFT_OR_MAX_LENGTH) {
        throw new Error(`ShiftOrSearch: desen en fazla ${SHIFT_OR_MAX_LENGTH} karakter olabilir`);
      }
    }
    this.masks = this.keys.map((key) => buildShiftOrMasks(key, this.alphabet));
  }

  searchOne(text, patternIndex, collector) {
    searchShiftOr(text, this.keys[patternIndex], this.masks[patternIndex], this.alphabet.map, (pos) =>
      collector.add(pos, patternIndex),
    );
  }
}

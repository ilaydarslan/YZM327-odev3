// Ortak atom sınıfı — TEMPLATE METHOD deseni.
//
// process() algoritmanın iskeletini sabitler:
//   1) metni kod dizisine çevir (ignoreCase burada uygulanır)
//   2) arama yap  ← alt sınıfın işi (search / searchOne)
//   3) eşleşmeleri sözleşmedeki sıraya koy ve Sequence.Match üret
// Alt sınıflar yalnızca değişen adımları yazar: prepare() ve search()/searchOne().
// Böylece sıralama, ignoreCase, parametre kontrolü gibi kurallar tek yerde kalır
// ve bütün atomlar aynı sözleşmeye uyar (LSP: hepsi birbirinin yerine kullanılabilir).

import { toCodes, reduceAlphabet } from '../functions/alphabet.js';
import { HitCollector } from '../functions/hits.js';

export const TASK = 'sequence.pattern-match.exact';

export class ExactSearchAtom {
  static manifest = {
    name: 'ExactSearchAtom',
    version: '0.1.0',
    kind: 'abstract',
    task: TASK,
    title: 'Exact match (soyut temel sınıf)',
    references: [],
  };

  /**
   * @param {{ patterns: string[], ignoreCase?: boolean }} params
   */
  constructor(params) {
    const { patterns, ignoreCase = false } = params ?? {};

    if (!Array.isArray(patterns) || patterns.length === 0) {
      throw new Error('patterns boş olmayan bir liste olmalı');
    }
    for (const p of patterns) {
      if (typeof p !== 'string' || p.length === 0) {
        throw new Error('her desen boş olmayan bir string olmalı');
      }
    }
    if (typeof ignoreCase !== 'boolean') {
      throw new Error('ignoreCase true veya false olmalı');
    }

    this.patterns = [...patterns];
    this.ignoreCase = ignoreCase;
    // Desenler bir kez koda çevrilir ve ön işlenir (sözleşme: "desenler burada, bir kez ön işlenir").
    this.keys = this.patterns.map((p) => toCodes(p, ignoreCase));
    this.alphabet = reduceAlphabet(this.keys);
    this.prepare();
  }

  /** Kanca (hook): alt sınıf desen tablolarını burada kurar. */
  prepare() {}

  /**
   * Kanca: bütün desenleri metinde arar ve eşleşmeleri collector'a ekler.
   * Varsayılan: her desen için ayrı searchOne() çağırır (tek desenli algoritmalar için).
   * Çok desenli algoritmalar (Aho-Corasick) bu metodu tümden değiştirir.
   */
  search(text, collector) {
    for (let pi = 0; pi < this.keys.length; pi++) {
      this.searchOne(text, pi, collector);
    }
  }

  /** Kanca: tek bir deseni arar. */
  // eslint-disable-next-line no-unused-vars
  searchOne(text, patternIndex, collector) {
    throw new Error(`${this.constructor.name}.searchOne yazılmamış`);
  }

  /**
   * Şablon metot: bir FASTA.Entry için Sequence.Match nesneleri üretir.
   * @param {{ header: string, seq: string }} entry
   */
  *process(entry) {
    const text = toCodes(entry.seq, this.ignoreCase);
    const collector = new HitCollector(this.keys.length);
    if (text.length > 0) this.search(text, collector);

    for (const [position, patternIndex] of collector.sorted()) {
      const pattern = this.patterns[patternIndex];
      yield { header: entry.header, pattern, position, length: pattern.length };
    }
  }
}

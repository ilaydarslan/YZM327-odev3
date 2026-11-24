// Kirlenme dedektörü — FACADE deseni.
//
// Problem (veri kirlenmesi, "benchmark contamination"): bir dil modelinin ölçüldüğü test soruları
// eğitim verisinde birebir geçiyorsa model cevabı ezberlemiş olabilir ve test puanı yanıltıcıdır.
// Dedektör, test sorularından çıkarılan desenleri eğitim korpusunda tam eşleştirmeyle arar.
//
// detect() şu adımları tek çağrının arkasına saklar:
//   1) sorular normalize edilir, desen çıkarıcı (Strategy) desenleri üretir; tekrar eden desen bir kez aranır
//   2) korpus belgeleri normalize edilir ve '\n' ile TEK metne birleştirilir ('\n' normalize metinde hiç
//      geçmediği için hiçbir desen iki belgenin sınırını aşamaz)
//   3) ExactMatch molekülü bu metinde bütün desenleri arar; atomu korpusun TAMAMININ şekline bakarak seçer
//   4) her eşleşme belgesine (ikili arama) ve desenin geldiği sorulara bağlanır, soru bazında özetlenir
// Bir soru, desenlerinden en az biri korpusta geçiyorsa "kirli" sayılır (GPT-3 ve GPT-4 raporlarındaki tanım).

import { ExactMatch } from '../molecules/ExactMatch.js';
import { normalizeText } from './normalize.js';
import { createExtractor } from './extractors.js';

const SEPARATOR = '\n';

export class ContaminationDetector {
  /**
   * @param {{ extractor?: { extract(text: string): string[], describe(): string },
   *           strategy?: string, registry?: object, coefficients?: object }} options
   */
  constructor({ extractor = createExtractor('ngram'), strategy = 'auto', registry, coefficients } = {}) {
    this.extractor = extractor;
    this.moleculeOptions = { strategy };
    if (registry) this.moleculeOptions.registry = registry;
    if (coefficients) this.moleculeOptions.coefficients = coefficients;
  }

  /**
   * @param {{ id: string, text: string }[]} benchmark  test soruları
   * @param {{ id: string, text: string }[]} corpus     eğitim belgeleri
   */
  detect(benchmark, corpus) {
    const { patterns, owners, perItem } = this.buildPatterns(benchmark);
    const { text, starts } = joinCorpus(corpus);

    const items = benchmark.map((item, i) => ({ id: item.id, patterns: perItem[i], found: new Set(), docs: new Set() }));
    let matches = 0;
    let record = null;

    if (patterns.length > 0 && text.length > 0) {
      const molecule = new ExactMatch({ patterns, ...this.moleculeOptions });
      for (const match of molecule.run([{ id: 'korpus', text }])) {
        matches++;
        const docId = corpus[findDoc(starts, match.position)].id;
        for (const i of owners.get(match.pattern)) {
          items[i].found.add(match.pattern);
          items[i].docs.add(docId);
        }
      }
      record = molecule.record;
    }

    const results = items.map((it) => ({
      id: it.id,
      contaminated: it.found.size > 0,
      matchedPatterns: it.found.size,
      patterns: it.patterns,
      overlap: it.patterns > 0 ? it.found.size / it.patterns : 0,
      docs: [...it.docs].sort(),
    }));
    const contaminated = results.filter((r) => r.contaminated).length;

    return {
      method: this.extractor.describe(),
      summary: {
        items: benchmark.length,
        contaminated,
        rate: benchmark.length > 0 ? contaminated / benchmark.length : 0,
        patterns: patterns.length,
        corpusDocs: corpus.length,
        corpusChars: text.length,
        matches,
      },
      items: results,
      record,
    };
  }

  /** Sorulardan desenleri çıkarır. owners: desen → onu üreten soruların sıra numaraları. */
  buildPatterns(benchmark) {
    const owners = new Map();
    const perItem = [];
    benchmark.forEach((item, i) => {
      const found = new Set(this.extractor.extract(normalizeText(item.text)));
      perItem.push(found.size);
      for (const p of found) {
        if (!owners.has(p)) owners.set(p, []);
        owners.get(p).push(i);
      }
    });
    return { patterns: [...owners.keys()], owners, perItem };
  }
}

/** Belgeleri normalize edip tek metne birleştirir; starts[d] = d. belgenin metindeki başlangıcı. */
export function joinCorpus(corpus) {
  const parts = [];
  const starts = [];
  let offset = 0;
  for (const doc of corpus) {
    const t = normalizeText(doc.text);
    starts.push(offset);
    parts.push(t);
    offset += t.length + SEPARATOR.length;
  }
  return { text: parts.join(SEPARATOR), starts };
}

/** İkili arama: konumu içeren belgenin sıra numarası (başlangıcı ≤ konum olan son belge). */
function findDoc(starts, position) {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= position) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

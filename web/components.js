// İş akışı bileşenleri — IoS'taki gibi kutular. Her bileşen: girdiler (port), tek çıktı, ayarlar, run().
// Editör bileşenleri tanımaz; yalnızca bu ortak biçimi kullanır (Strategy + Registry: yeni bileşen = yeni kayıt).
// Bu dosya DOM kullanmaz: aynı bileşenler tarayıcıda da Node testlerinde de çalışır.
//
// Akan değer türleri:
//   docs      { type: 'docs', docs: [{ id, text }] }
//   patterns  { type: 'patterns', patterns: string[] }
//   matches   { type: 'matches', matches, record }
//   report    { type: 'report', method, summary, items, record }

import { parseFasta } from '../src/fasta.js';
import { parseJsonl, JsonlFastaAdapter } from '../src/corpus.js';
import { ExactMatch } from '../src/molecules/ExactMatch.js';
import { registry } from '../src/registry.js';
import { normalizeText } from '../src/contamination/normalize.js';
import { ContaminationDetector } from '../src/contamination/ContaminationDetector.js';
import { createExtractor, EXTRACTOR_METHODS } from '../src/contamination/extractors.js';

const docsOut = (docs) => ({ type: 'docs', docs });

export const COMPONENTS = {
  'data.lambda': {
    group: 'Veri', title: 'Lambda genomu', note: 'FASTA, şartnamedeki gerçek veri',
    inputs: [], output: 'docs', config: {},
    async run(_in, _cfg, ctx) {
      return docsOut(parseFasta(await ctx.load('lambda_NC_001416.fa')).map((e) => JsonlFastaAdapter.toDoc(e)));
    },
  },
  'data.ecoli': {
    group: 'Veri', title: 'E. coli proteinleri', note: 'FASTA, 126 kayıt',
    inputs: [], output: 'docs', config: {},
    async run(_in, _cfg, ctx) {
      return docsOut(parseFasta(await ctx.load('ecoli_k12_126_proteins.fasta')).map((e) => JsonlFastaAdapter.toDoc(e)));
    },
  },
  'data.gsm8kTrain': {
    group: 'Veri', title: 'GSM8K eğitim korpusu', note: 'JSONL, 1000 kayıt',
    inputs: [], output: 'docs', config: {},
    async run(_in, _cfg, ctx) {
      return docsOut(parseJsonl(await ctx.load('gsm8k_train_1000.jsonl')));
    },
  },
  'data.gsm8kTest': {
    group: 'Veri', title: 'GSM8K test soruları', note: 'JSONL, 200 soru',
    inputs: [], output: 'docs', config: {},
    async run(_in, _cfg, ctx) {
      return docsOut(parseJsonl(await ctx.load('gsm8k_test_200.jsonl')));
    },
  },
  'data.text': {
    group: 'Veri', title: 'Kendi metnin', note: 'her satır bir belge',
    inputs: [], output: 'docs',
    config: { text: { label: 'Metin (her satır bir belge)', kind: 'textarea', value: 'the cat sat on the mat\nthe dog ran' } },
    async run(_in, cfg) {
      const lines = cfg.text.split('\n').filter((l) => l.trim().length > 0);
      return docsOut(lines.map((text, i) => ({ id: `satir-${i + 1}`, text })));
    },
  },
  'patterns.manual': {
    group: 'Desen', title: 'Desenler', note: 'virgülle ayrılmış',
    inputs: [], output: 'patterns',
    config: { patterns: { label: 'Desenler (virgülle)', kind: 'text', value: 'GGATCC,GAATTC,AAGCTT' } },
    async run(_in, cfg) {
      const patterns = cfg.patterns.split(',').filter((p) => p.length > 0);
      if (patterns.length === 0) throw new Error('En az bir desen yazın');
      return { type: 'patterns', patterns };
    },
  },
  'transform.normalize': {
    group: 'İşlem', title: 'Normalize', note: 'küçük harf, noktalama → boşluk',
    inputs: [{ name: 'docs', label: 'belgeler', type: 'docs' }], output: 'docs', config: {},
    async run({ docs }) {
      return docsOut(docs.docs.map((d) => ({ id: d.id, text: normalizeText(d.text) })));
    },
  },
  'search.exactMatch': {
    group: 'Arama', title: 'ExactMatch (molekül)', note: 'en hızlı atomu seçer',
    inputs: [{ name: 'docs', label: 'belgeler', type: 'docs' }, { name: 'patterns', label: 'desenler', type: 'patterns' }],
    output: 'matches',
    config: {
      strategy: { label: 'Strateji', kind: 'select', value: 'auto', options: ['auto', ...registry.names()] },
      ignoreCase: { label: 'Büyük/küçük harf duyarsız', kind: 'checkbox', value: false },
    },
    async run({ docs, patterns }, cfg) {
      const molecule = new ExactMatch({ patterns: patterns.patterns, ignoreCase: cfg.ignoreCase, strategy: cfg.strategy });
      // Adapter: belgeler çekirdeğin sözleşmesindeki FASTA.Entry biçimine çevrilir
      const matches = [...molecule.run(JsonlFastaAdapter.toEntries(docs.docs))].map((m) => JsonlFastaAdapter.toMatch(m));
      return { type: 'matches', matches, record: molecule.record };
    },
  },
  'detect.contamination': {
    group: 'Arama', title: 'Kirlenme dedektörü', note: 'sorular eğitim verisinde mi?',
    inputs: [{ name: 'questions', label: 'sorular', type: 'docs' }, { name: 'corpus', label: 'korpus', type: 'docs' }],
    output: 'report',
    config: { method: { label: 'Yöntem', kind: 'select', value: 'ngram', options: EXTRACTOR_METHODS } },
    async run({ questions, corpus }, cfg) {
      const result = new ContaminationDetector({ extractor: createExtractor(cfg.method) }).detect(questions.docs, corpus.docs);
      return { type: 'report', ...result };
    },
  },
  'view.result': {
    group: 'Çıktı', title: 'Sonuç', note: 'gelen değeri gösterir',
    inputs: [{ name: 'value', label: 'girdi', type: 'any' }], output: null, config: {},
    async run({ value }) {
      return value;
    },
  },
};

/** Değeri kısa bir özete çevirir (kutunun altında görünür). */
export function summarize(value) {
  if (!value) return '';
  switch (value.type) {
    case 'docs': return `${value.docs.length} belge`;
    case 'patterns': return `${value.patterns.length} desen`;
    case 'matches': return `${value.matches.length} eşleşme · ${value.record.selected ?? '—'}`;
    case 'report': return `${value.summary.contaminated}/${value.summary.items} kirli soru · ${value.record?.selected ?? '—'}`;
    default: return '';
  }
}

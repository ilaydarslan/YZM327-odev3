// Kirlenme tespiti testleri: normalleştirme, desen çıkarıcılar (Strategy), dedektör (Facade).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseJsonl } from '../../src/corpus.js';
import { normalizeText } from '../../src/contamination/normalize.js';
import {
  NgramExtractor, SubstringSampleExtractor, createExtractor, EXTRACTOR_METHODS,
} from '../../src/contamination/extractors.js';
import { ContaminationDetector } from '../../src/contamination/ContaminationDetector.js';
import { registry } from '../../src/registry.js';
import { makeRandom, randomInt } from '../../bench/data.js';

const dataPath = (name) => fileURLToPath(new URL(`../data/${name}`, import.meta.url));
const test = parseJsonl(readFileSync(dataPath('gsm8k_test_200.jsonl'), 'utf8'));
const train = parseJsonl(readFileSync(dataPath('gsm8k_train_1000.jsonl'), 'utf8'));

const contaminatedIds = (result) => result.items.filter((r) => r.contaminated).map((r) => r.id);

describe('normalizeText', () => {
  it('küçük harf, noktalama → boşluk, art arda boşluk teke iner', () => {
    assert.equal(normalizeText('Janet’s ducks lay 16 eggs!'), 'janet s ducks lay 16 eggs');
    assert.equal(normalizeText('  $2,500  per   day.\n'), '2 500 per day');
  });

  it('Türkçe harfler korunur, satır sonu kalmaz', () => {
    assert.equal(normalizeText('Çiğdem\nŞUBAT ayında'), 'çiğdem şubat ayında');
    assert.equal(normalizeText('a\nb').includes('\n'), false);
  });

  it('boş ve yalnızca noktalama', () => {
    assert.equal(normalizeText(''), '');
    assert.equal(normalizeText('?!...'), '');
  });
});

describe('Desen çıkarıcılar (Strategy)', () => {
  it('NgramExtractor: kelime sayısı − n + 1 parça; kısa soru tek desen', () => {
    const e = new NgramExtractor({ n: 3 });
    assert.deepEqual(e.extract('a b c d e'), ['a b c', 'b c d', 'c d e']);
    assert.deepEqual(e.extract('a b'), ['a b']);
    assert.deepEqual(e.extract(''), []);
  });

  it('SubstringSampleExtractor: istenen sayıda ve uzunlukta, deterministik', () => {
    const e = new SubstringSampleExtractor({ length: 10, samples: 3, seed: 7 });
    const text = normalizeText(test[0].text);
    const a = e.extract(text);
    assert.equal(a.length, 3);
    for (const p of a) {
      assert.equal(p.length, 10);
      assert.ok(text.includes(p));
    }
    assert.deepEqual(e.extract(text), a);
    assert.deepEqual(e.extract('kısa'), ['kısa']);
  });

  it('createExtractor (Factory Method): adla üretir, bilinmeyen adı reddeder', () => {
    assert.deepEqual(EXTRACTOR_METHODS, ['ngram', 'substring']);
    assert.ok(createExtractor('ngram', { n: 8 }) instanceof NgramExtractor);
    assert.ok(createExtractor('substring') instanceof SubstringSampleExtractor);
    assert.throws(() => createExtractor('yok'), /Geçerli seçenekler: ngram, substring/);
    assert.throws(() => createExtractor('ngram', { n: 0 }));
  });
});

describe('ContaminationDetector', () => {
  it('gerçek bulgu: GSM8K test sorularından 3’ü eğitim setinde 13-gram olarak geçiyor', () => {
    const result = new ContaminationDetector().detect(test, train);
    assert.deepEqual(contaminatedIds(result), ['test-0582', 'test-0603', 'test-0633']);
    const byId = Object.fromEntries(result.items.map((r) => [r.id, r]));
    assert.deepEqual(byId['test-0603'].docs, ['train-1315', 'train-5163']);
    assert.deepEqual(byId['test-0633'].docs, ['train-0021']);
    assert.equal(result.summary.items, 200);
    assert.ok(result.record.selected);
  });

  it('GPT-4 yöntemi (3 × 50 karakter) başka bir kirli soruyu da yakalar: test-0919', () => {
    const result = new ContaminationDetector({ extractor: createExtractor('substring') }).detect(test, train);
    assert.deepEqual(contaminatedIds(result), ['test-0603', 'test-0633', 'test-0919']);
  });

  it('bilinçli eklenen (planted) sorular eksiksiz bulunur, fazladan soru işaretlenmez', () => {
    const random = makeRandom(42);
    const questions = test.slice(0, 100);
    const corpus = train.slice(0, 300).map((d) => ({ ...d }));
    const baseline = new Set(contaminatedIds(new ContaminationDetector().detect(questions, corpus)));
    const planted = new Set();
    for (let i = 0; i < 8; i++) {
      const q = questions[randomInt(random, 0, questions.length - 1)];
      const doc = corpus[randomInt(random, 0, corpus.length - 1)];
      // Büyük harf ve noktalama farkı: normalleştirme bunu yine de eşleştirmeli
      doc.text += `\n\nSoru: ${q.text.toUpperCase().replaceAll(' ', '  ')}`;
      planted.add(q.id);
    }
    const found = new Set(contaminatedIds(new ContaminationDetector().detect(questions, corpus)));
    const expected = new Set([...baseline, ...planted]);
    assert.deepEqual([...found].sort(), [...expected].sort());
  });

  it('desen iki belgenin sınırını aşarak eşleşmez', () => {
    const corpus = [{ id: 'a', text: 'one two three' }, { id: 'b', text: 'four five' }];
    const result = new ContaminationDetector({ extractor: new NgramExtractor({ n: 2 }) })
      .detect([{ id: 'q1', text: 'three four' }, { id: 'q2', text: 'Two, Three!' }], corpus);
    assert.deepEqual(contaminatedIds(result), ['q2']);
    assert.deepEqual(result.items[1].docs, ['a']);
  });

  it('zorla seçilen her atom aynı sonucu verir (molekül atomları birbirinin yerine kullanabilir)', () => {
    const questions = test.slice(-10);
    const reference = new ContaminationDetector({ strategy: 'NaiveSearch' }).detect(questions, train);
    for (const name of registry.names()) {
      if (name === 'ShiftOrSearch') continue; // 13-gram desenleri 32 karakterden uzun: Shift-Or uygulanamaz
      const result = new ContaminationDetector({ strategy: name }).detect(questions, train);
      assert.deepEqual(result.items, reference.items, name);
    }
  });

  it('boş benchmark veya boş korpus: hata yok, kirli soru yok', () => {
    const empty = new ContaminationDetector().detect([], train);
    assert.equal(empty.summary.contaminated, 0);
    assert.equal(empty.record, null);
    const noCorpus = new ContaminationDetector().detect(test.slice(0, 5), []);
    assert.equal(noCorpus.summary.contaminated, 0);
  });
});

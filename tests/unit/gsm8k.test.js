// Gerçek veri testleri: GSM8K (OpenAI'ın matematik sorusu benchmark'ı, tests/data/KAYNAK.md).
// JSONL belgeleri JsonlFastaAdapter ile çekirdeğin FASTA.Entry biçimine çevrilir; her atom ve molekül
// NaiveSearch ile ELEMAN ELEMAN aynı sonucu vermeli.
//   - ham korpus (1000 eğitim kaydı, çok belgeli akış): kısa, uzun, çok sayıda desen, ignoreCase
//   - kirlenme taramasının gerçek iş yükü: normalize korpusta, test sorularından çıkan 13-gram desenleri

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseJsonl, JsonlFastaAdapter } from '../../src/corpus.js';
import { NaiveSearch } from '../../src/atomic/NaiveSearch.js';
import { ExactMatch } from '../../src/molecules/ExactMatch.js';
import { normalizeText } from '../../src/contamination/normalize.js';
import { NgramExtractor, SubstringSampleExtractor } from '../../src/contamination/extractors.js';
import { REAL_ATOMS, runAtom } from './helpers.js';
import { makeRandom, randomInt } from '../../bench/data.js';

const dataPath = (name) => fileURLToPath(new URL(`../data/${name}`, import.meta.url));
const test = parseJsonl(readFileSync(dataPath('gsm8k_test_200.jsonl'), 'utf8'));
const train = parseJsonl(readFileSync(dataPath('gsm8k_train_1000.jsonl'), 'utf8'));

/** Metinlerden kesilmiş desenler (kesin eşleşme olsun). */
function cut(random, docs, count, minLen, maxLen) {
  const out = [];
  while (out.length < count) {
    const text = docs[randomInt(random, 0, docs.length - 1)].text;
    const m = randomInt(random, minLen, maxLen);
    if (text.length < m) continue;
    const start = randomInt(random, 0, text.length - m);
    out.push(text.slice(start, start + m));
  }
  return out;
}

// Binlerce eşleşmelik listelerde deepEqual'in hata mesajı için fark hesaplaması dakikalar sürebilir;
// eşitlik aynı kuralla (deepStrictEqual) ama farkı hesaplamadan denetlenir, hata hemen bildirilir.
function sameResult(got, expected, name) {
  assert.ok(isDeepStrictEqual(got, expected), `${name}: sonuç NaiveSearch ile aynı değil (${got.length} / ${expected.length} eşleşme)`);
}

function checkAll(docs, params) {
  const entries = JsonlFastaAdapter.toEntries(docs);
  const expected = runAtom(new NaiveSearch(params), entries);
  for (const AtomClass of REAL_ATOMS) {
    const mMax = Math.max(...params.patterns.map((p) => p.length));
    if (AtomClass.selection.applicable({ mMax }) !== true) continue;
    const got = runAtom(new AtomClass(params), entries);
    sameResult(got, expected, AtomClass.manifest.name);
  }
  const em = new ExactMatch(params);
  sameResult([...em.run(entries)], expected, `ExactMatch (${em.record.selected})`);
  return expected.length;
}

describe('Gerçek veri: GSM8K eğitim korpusu (ham metin)', () => {
  const random = makeRandom(8);
  const docs = train.slice(0, 300);

  it('veri beklendiği gibi: 200 test sorusu, 1000 eğitim kaydı, benzersiz id', () => {
    assert.equal(test.length, 200);
    assert.equal(train.length, 1000);
    assert.equal(new Set(train.map((d) => d.id)).size, 1000);
    assert.ok(train.every((d) => d.text.length > 0));
  });

  it('Adapter: belge → FASTA.Entry → eşleşme → belge kimliği', () => {
    const [entry] = JsonlFastaAdapter.toEntries([train[0]]);
    assert.deepEqual(entry, { header: '>train-0001', seq: train[0].text });
    assert.deepEqual(JsonlFastaAdapter.toDoc(entry), train[0]);
    const [match] = new NaiveSearch({ patterns: ['Natalia'] }).process(entry);
    assert.deepEqual(JsonlFastaAdapter.toMatch(match), { id: 'train-0001', pattern: 'Natalia', position: 0, length: 7 });
  });

  it('kısa desenler (1–12 karakter) + sık geçen kelimeler', () => {
    const patterns = [...cut(random, docs, 20, 1, 12), 'the', ' ', '$', '####'];
    assert.ok(checkAll(docs, { patterns }) > 0);
  });

  it('uzun desenler (50–300 karakter)', () => {
    const patterns = cut(random, docs, 12, 50, 300);
    assert.ok(checkAll(docs, { patterns }) >= 12);
  });

  it('çok sayıda desen (300, karışık uzunluk, tekrar eden desen dahil)', () => {
    const patterns = cut(random, docs, 300, 4, 40);
    patterns.push(patterns[0], patterns[1]);
    assert.ok(checkAll(docs, { patterns }) >= 302);
  });

  it('ignoreCase: büyük harfli korpus, karışık harfli desenler', () => {
    const upper = docs.slice(0, 100).map((d) => ({ id: d.id, text: d.text.toUpperCase() }));
    const patterns = cut(random, docs.slice(0, 100), 10, 5, 60).map((p, i) => (i % 2 ? p.toLowerCase() : p));
    assert.ok(checkAll(upper, { patterns, ignoreCase: true }) >= 10);
  });
});

describe('Gerçek veri: kirlenme taraması iş yükü (normalize metin)', () => {
  const corpus = [{ id: 'korpus', text: train.map((d) => normalizeText(d.text)).join('\n') }];

  it('13-gram desenleri (son 20 sorudan; kirli test-0582, 0603, 0633 dahil)', () => {
    const extractor = new NgramExtractor({ n: 13 });
    const patterns = [...new Set(test.slice(-20).flatMap((q) => extractor.extract(normalizeText(q.text))))];
    assert.ok(patterns.length > 500);
    assert.ok(checkAll(corpus, { patterns }) >= 23); // tam taramadaki 3 kirli sorunun 23 eşleşmesi
  });

  it('50 karakterlik parçalar (200 sorudan 3’er tane)', () => {
    const extractor = new SubstringSampleExtractor({ length: 50, samples: 3 });
    const patterns = [...new Set(test.flatMap((q) => extractor.extract(normalizeText(q.text))))];
    assert.ok(checkAll(corpus, { patterns }) >= 1);
  });
});

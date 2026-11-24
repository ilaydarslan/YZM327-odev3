// Atom başına özel durum testleri (her atom için en az 5).
// Beklenen değerler elle hesaplanmıştır; ayrıca NaiveSearch ile de karşılaştırılır.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { search, pairs } from './helpers.js';
import { NaiveSearch } from '../../src/atomic/NaiveSearch.js';
import { HorspoolSearch } from '../../src/atomic/HorspoolSearch.js';
import { ShiftOrSearch } from '../../src/atomic/ShiftOrSearch.js';
import { KmpSearch } from '../../src/atomic/KmpSearch.js';
import { AhoCorasickSearch } from '../../src/atomic/AhoCorasickSearch.js';
import { BoyerMooreSearch } from '../../src/atomic/BoyerMooreSearch.js';
import { Bm4DnaDsSearch } from '../../src/atomic/Bm4DnaDsSearch.js';
import { Bm4DnaHmbsSearch } from '../../src/atomic/Bm4DnaHmbsSearch.js';
import { WuManberSearch } from '../../src/atomic/WuManberSearch.js';
import { buildHmbsTables, searchBm4DnaHmbs } from '../../src/functions/bm4dnaHmbs.js';
import { buildWuManber, searchWuManber } from '../../src/functions/wuManber.js';
import { withSentinel } from '../../src/functions/sentinel.js';
import { HitCollector } from '../../src/functions/hits.js';
import { reduceAlphabet, toCodes } from '../../src/functions/alphabet.js';
import { makeRandom, randomText, randomPatterns } from '../../bench/data.js';

// Her atomun geçmesi gereken ortak zor durumlar
const COMMON_CASES = [
  {
    title: 'periyodik desen ABAB (kendisiyle örtüşür)',
    seq: 'ABABABAB', patterns: ['ABAB'],
    expected: [['ABAB', 0], ['ABAB', 2], ['ABAB', 4]],
  },
  {
    title: 'tek karakterlik desen',
    seq: 'GATTACA', patterns: ['A'],
    expected: [['A', 1], ['A', 4], ['A', 6]],
  },
  {
    title: 'metinde desen alfabesinde olmayan karakterler',
    seq: 'xyzACGxyzACGTzz', patterns: ['ACGT'],
    expected: [['ACGT', 9]],
  },
  {
    title: 'desen metnin tamamı',
    seq: 'ACGTACGT', patterns: ['ACGTACGT'],
    expected: [['ACGTACGT', 0]],
  },
  {
    title: 'eşleşme metnin en başında ve en sonunda',
    seq: 'CATxxxxCAT', patterns: ['CAT'],
    expected: [['CAT', 0], ['CAT', 7]],
  },
  {
    title: 'son karakteri tutan ama eşleşmeyen pencereler',
    seq: 'ACGACGACGT', patterns: ['TCG', 'ACGT'],
    expected: [['ACGT', 6]],
  },
  {
    title: 'biri diğerinin içinde olan desenler',
    seq: 'XABCDX', patterns: ['ABCD', 'BC', 'C'],
    expected: [['ABCD', 1], ['BC', 2], ['C', 3]],
  },
  {
    title: 'ikili alfabe (ab), çok tekrarlı',
    seq: 'aaabaaab', patterns: ['aab', 'aaa'],
    expected: [['aaa', 0], ['aab', 1], ['aaa', 4], ['aab', 5]],
  },
];

const ATOMS = [
  HorspoolSearch, ShiftOrSearch, KmpSearch, AhoCorasickSearch,
  BoyerMooreSearch, Bm4DnaDsSearch, Bm4DnaHmbsSearch, WuManberSearch,
];

for (const AtomClass of ATOMS) {
  describe(`Özel durumlar: ${AtomClass.manifest.name}`, () => {
    for (const c of COMMON_CASES) {
      it(c.title, () => {
        const got = pairs(search(AtomClass, c.seq, c.patterns));
        assert.deepEqual(got, c.expected);
        assert.deepEqual(got, pairs(search(NaiveSearch, c.seq, c.patterns)));
      });
    }
  });
}

describe('Atoma özgü durumlar', () => {
  it('Horspool: desende tekrar eden karakter için kayma son geçişe göre (ör. "ANPANMAN")', () => {
    const seq = 'xxANPANMANxANPANMAN';
    assert.deepEqual(pairs(search(HorspoolSearch, seq, ['ANPANMAN'])), [['ANPANMAN', 2], ['ANPANMAN', 11]]);
  });

  it('Shift-Or: 32 karakterlik desen (sınır) çalışır', () => {
    const p = 'ACGT'.repeat(8); // 32
    const seq = 'G' + p + p.slice(0, 4);
    assert.deepEqual(pairs(search(ShiftOrSearch, seq, [p])), [[p, 1], [p, 5]]);
  });

  it('Shift-Or: 33 karakterlik desen hata verir ve uygulanamaz ilan edilir', () => {
    assert.throws(() => new ShiftOrSearch({ patterns: ['A'.repeat(33)] }));
    const verdict = ShiftOrSearch.selection.applicable({ mMax: 33 });
    assert.equal(typeof verdict, 'string');
  });

  it('KMP: failure tablosu geri dönüşü (AABAAAB içinde AAAB)', () => {
    assert.deepEqual(pairs(search(KmpSearch, 'AABAAAB', ['AAAB'])), [['AAAB', 3]]);
  });

  it('Aho-Corasick: failure zincirinden gelen kısa desen (he/she/his/hers)', () => {
    assert.deepEqual(pairs(search(AhoCorasickSearch, 'ushers', ['he', 'she', 'his', 'hers'])), [
      ['she', 1], ['he', 2], ['hers', 2],
    ]);
  });

  it('Aho-Corasick: çok sayıda desen tek geçişte', () => {
    const patterns = ['A', 'AA', 'AAA', 'C', 'CA', 'T'];
    assert.deepEqual(
      pairs(search(AhoCorasickSearch, 'CAAAT', patterns)),
      pairs(search(NaiveSearch, 'CAAAT', patterns)),
    );
  });
});

// Büyük alfabe: 400 farklı karakter. q-gram tablosu 2^16'ya katlanır, çakışmalar olur.
const BIG_ALPHABET = Array.from({ length: 400 }, (_, i) => String.fromCharCode(0x4e00 + i)).join('');

function sameAsNaive(AtomClass, seq, patterns, ignoreCase = false) {
  const got = pairs(search(AtomClass, seq, patterns, ignoreCase));
  assert.deepEqual(got, pairs(search(NaiveSearch, seq, patterns, ignoreCase)));
  return got;
}

describe('Boyer-Moore, bm4DNADS, bm4DNAHMbs, Wu-Manber özel durumları', () => {
  it('Boyer-Moore: iyi sonek kuralı gereken desen (ör. "ABCXXABC")', () => {
    const got = sameAsNaive(BoyerMooreSearch, 'ABCXXABCXXABCABCXXABC', ['ABCXXABC']);
    assert.deepEqual(got, [['ABCXXABC', 0], ['ABCXXABC', 5], ['ABCXXABC', 13]]);
  });

  it('bm4DNADS: tek karakterlik desen (sentinel = son karakter) ve metnin son konumu', () => {
    assert.deepEqual(sameAsNaive(Bm4DnaDsSearch, 'ACGTG', ['G']), [['G', 2], ['G', 4]]);
  });

  it('bm4DNADS: eşleşme metnin tam sonunda (eklenen sentinel kopyasıyla karışmamalı)', () => {
    assert.deepEqual(sameAsNaive(Bm4DnaDsSearch, 'TTTTACGT', ['ACGT']), [['ACGT', 4]]);
    // metnin sonu desenin başıyla bitiyor: sentinel ile birleşince sahte eşleşme oluşmamalı
    assert.deepEqual(sameAsNaive(Bm4DnaDsSearch, 'TTTTAC', ['ACGT']), []);
  });

  it('bm4DNADS: farklı uzunlukta desenler ortak sentinel tamponunu kirletmemeli', () => {
    sameAsNaive(Bm4DnaDsSearch, 'GATTACAGATTACA', ['GATTACAGA', 'CA', 'TTACAGATTACA', 'A']);
  });

  it('bm4DNAHMbs: q-gram desende yoksa m − q + 1 kayar (makaledeki m − w değil)', () => {
    const key = toCodes('ACGTACGGTCA', false);
    const alphabet = reduceAlphabet([key]);
    const t = buildHmbsTables(key, alphabet);
    const unseen = t.shift.indexOf(Math.max(...t.shift)); // test kodu: yasak kural yalnızca atomlar için
    assert.equal(t.shift[unseen], key.length - t.q + 1);
  });

  it('bm4DNAHMbs: sonek içeride tekrar ediyorsa örtüşen eşleşmeler kaçmaz', () => {
    const p = 'ACGACGACG';
    sameAsNaive(Bm4DnaHmbsSearch, 'ACGACGACGACGACGACG', [p]);
  });

  it('bm4DNAHMbs: uzun desen, eşleşme sonda ve başta', () => {
    const r = makeRandom(11);
    const seq = randomText(r, 'ACGT', 3000);
    sameAsNaive(Bm4DnaHmbsSearch, seq, [seq.slice(0, 120), seq.slice(2880), seq.slice(1000, 1300)]);
  });

  it('bm4DNAHMbs ve Wu-Manber: büyük alfabede (özet çakışmalı tablo) doğru sonuç', () => {
    const r = makeRandom(5);
    const seq = randomText(r, BIG_ALPHABET.slice(0, 30), 4000) + randomText(r, BIG_ALPHABET, 4000);
    const patterns = randomPatterns(r, seq, BIG_ALPHABET, 30, 2, 80);
    sameAsNaive(Bm4DnaHmbsSearch, seq, patterns);
    sameAsNaive(WuManberSearch, seq, patterns);
  });

  it('Wu-Manber: farklı uzunlukta desenler, en kısası 1 karakter', () => {
    assert.deepEqual(sameAsNaive(WuManberSearch, 'XABCAB', ['ABC', 'B', 'CAB']), [
      ['ABC', 1], ['B', 2], ['CAB', 3], ['B', 5],
    ]);
  });

  it('Wu-Manber: çok sayıda desen (1000), blok boyu büyür ve tablo katlanır', () => {
    const r = makeRandom(9);
    const seq = randomText(r, 'ACGT', 20000);
    const patterns = randomPatterns(r, seq, 'ACGT', 1000, 8, 20);
    sameAsNaive(WuManberSearch, seq, patterns);
  });

  it('Wu-Manber: desen metnin sonundan taşıyorsa raporlanmaz', () => {
    assert.deepEqual(sameAsNaive(WuManberSearch, 'AAAC', ['AC', 'ACGT']), [['AC', 2]]);
  });
});

// Özet tablosu 1–2 hücreye küçültülünce bütün bloklar çakışır. Algoritmalar çakışmada da doğru olmalı:
// tabloda en küçük kayma tutulur ve her aday karakter karakter doğrulanır. Metne, desenin son karakteri
// hariç her şeyine uyan "tuzak" konumlar eklenir: doğrulamada son karakteri atlayan bir hata burada yakalanır.
describe('q-gram tablosu çakışmalı (1 ve 2 hücre): sonuç yine NaiveSearch ile aynı', () => {
  const random = makeRandom(1616);
  const base = randomPatterns(random, randomText(random, 'ACGT', 500), 'ACGT', 10, 6, 40);
  const patterns = [...base, 'ACGTACGTAC', 'TTTTTTTT'];
  const flipLast = (p) => p.slice(0, -1) + (p.at(-1) === 'A' ? 'C' : 'A');
  let seq = randomText(random, 'ACGT', 2000);
  for (const p of patterns) seq += flipLast(p) + randomText(random, 'ACGT', 7) + p + randomText(random, 'ACGT', 5);
  const keys = patterns.map((p) => toCodes(p, false));
  const alphabet = reduceAlphabet(keys);
  const text = toCodes(seq, false);
  const expected = pairs(search(NaiveSearch, seq, patterns));
  const toPairs = (collector) => [...collector.sorted()].map(([pos, pi]) => [patterns[pi], pos]);

  for (const maxTable of [1, 2]) {
    it(`bm4DNAHMbs, tablo ${maxTable} hücre`, () => {
      const collector = new HitCollector(keys.length);
      withSentinel(text, keys, (buf, key, pi) => {
        const tables = buildHmbsTables(key, alphabet, maxTable);
        assert.equal(tables.hasher.exact, false);
        searchBm4DnaHmbs(buf, text.length, key, tables, alphabet.map, (pos) => collector.add(pos, pi));
      });
      assert.deepEqual(toPairs(collector), expected);
    });

    it(`Wu-Manber, tablo ${maxTable} hücre`, () => {
      const collector = new HitCollector(keys.length);
      const table = buildWuManber(keys, alphabet, maxTable);
      assert.equal(table.hasher.exact, false);
      searchWuManber(text, keys, table, alphabet.map, (pos, pi) => collector.add(pos, pi));
      assert.deepEqual(toPairs(collector), expected);
    });
  }
});

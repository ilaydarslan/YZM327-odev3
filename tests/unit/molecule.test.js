// Molekül testleri (docx Görev 3).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ExactMatch } from '../../src/molecules/ExactMatch.js';
import { registry } from '../../src/registry.js';
import { ExactSearchAtom, TASK } from '../../src/atomic/ExactSearchAtom.js';
import { searchNaive } from '../../src/functions/naive.js';
import { makeRandom, ALPHABETS, randomText, randomPatterns } from '../../bench/data.js';

const random = makeRandom(7);
const labels = randomText(random, ALPHABETS.labels, 5000);
const docs = [
  { id: 'doc1', text: labels },
  { id: 'doc2', text: labels.slice(1000, 3000) },
];
const patterns = randomPatterns(random, labels, ALPHABETS.labels, 5, 4, 20);

describe('ExactMatch molekülü', () => {
  it('record doğru alanları içerir', () => {
    const em = new ExactMatch({ patterns });
    [...em.run(docs)];
    const { record } = em;
    assert.deepEqual(Object.keys(record).sort(), ['estimates', 'requested', 'selected', 'shape', 'why']);
    assert.equal(record.requested, 'auto');
    for (const key of ['n', 'sigma', 'k', 'mMin', 'mMax', 'mAvg']) {
      assert.equal(typeof record.shape[key], 'number', key);
    }
    assert.equal(record.shape.n, 5000);
    assert.equal(record.shape.sigma, 4);
    assert.equal(record.shape.k, 5);
    assert.equal(typeof record.why, 'string');
  });

  it('en ucuz tahmin seçilir', () => {
    const em = new ExactMatch({ patterns });
    const record = em.decide(docs[0]);
    const cheapest = Object.entries(record.estimates)
      .filter(([, e]) => e.applicable)
      .sort((a, b) => a[1].cost - b[1].cost)[0][0];
    assert.equal(record.selected, cheapest);
  });

  it('zorla seçilen her strateji aynı sonucu verir', () => {
    const reference = [...new ExactMatch({ patterns, strategy: 'NaiveSearch' }).run(docs)];
    assert.ok(reference.length > 0);
    for (const name of registry.names()) {
      const em = new ExactMatch({ patterns, strategy: name });
      assert.deepEqual([...em.run(docs)], reference, name);
      assert.equal(em.record.selected, name);
    }
  });

  it('bilinmeyen strateji hata verir ve geçerli seçenekleri listeler', () => {
    assert.throws(
      () => new ExactMatch({ patterns, strategy: 'YokBöyleBirAtom' }),
      (err) => err.message.includes('HorspoolSearch') && err.message.includes('auto'),
    );
  });

  it('boş desen listesi hata verir', () => {
    assert.throws(() => new ExactMatch({ patterns: [] }));
  });

  it('kayıt defterine sahte atom eklenince molekül kodu değişmeden seçilebilir', () => {
    class FakeSearch extends ExactSearchAtom {
      static manifest = { name: 'FakeSearch', version: '0.0.1', kind: 'atom', task: TASK, title: 'Sahte', references: [] };
      static selection = {
        features: () => ({ scan: 0 }), // her zaman bedava görünür
        defaults: { scan: 1 },
        applicable: () => true,
      };
      searchOne(text, pi, collector) {
        searchNaive(text, this.keys[pi], (pos) => collector.add(pos, pi));
      }
    }
    const custom = registry.clone().register(FakeSearch);
    const em = new ExactMatch({ patterns, registry: custom });
    const got = [...em.run(docs)];
    assert.equal(em.record.selected, 'FakeSearch');
    assert.deepEqual(got, [...new ExactMatch({ patterns, strategy: 'NaiveSearch' }).run(docs)]);
    // varsayılan defter etkilenmedi
    assert.equal(registry.has('FakeSearch'), false);
  });

  it('kendini uygulanamaz ilan eden atom hiç seçilmez', () => {
    class NeverSearch extends ExactSearchAtom {
      static manifest = { name: 'NeverSearch', version: '0.0.1', kind: 'atom', task: TASK, title: 'Asla', references: [] };
      static selection = {
        features: () => ({ scan: -1e9 }), // seçilebilseydi kesin kazanırdı
        defaults: { scan: 1 },
        applicable: () => 'test için kapalı',
      };
    }
    const custom = registry.clone().register(NeverSearch);
    const em = new ExactMatch({ patterns, registry: custom });
    [...em.run(docs)];
    assert.notEqual(em.record.selected, 'NeverSearch');
    assert.equal(em.record.estimates.NeverSearch.applicable, false);
    assert.equal(em.record.estimates.NeverSearch.reason, 'test için kapalı');
  });

  it('uzun desende Shift-Or uygulanamaz sayılır', () => {
    const em = new ExactMatch({ patterns: ['A'.repeat(40)] });
    const record = em.decide(docs[0]);
    assert.equal(record.estimates.ShiftOrSearch.applicable, false);
    assert.notEqual(record.selected, 'ShiftOrSearch');
  });

  it('auto: karar ilk belgede verilir ve bütün akış için aynı atom kullanılır', () => {
    const em = new ExactMatch({ patterns });
    const it = em.run(docs);
    it.next();
    const first = em.atom;
    [...it];
    assert.equal(em.atom, first);
  });

  it('boş akış: hata yok, sonuç yok', () => {
    const em = new ExactMatch({ patterns });
    assert.deepEqual([...em.run([])], []);
    assert.equal(em.record.selected, null);
  });
});

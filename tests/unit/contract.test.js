// Sözleşme testleri (docx bölüm 4, belge/korpus biçimine uyarlanmış): HER atom bunları geçmelidir.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_ATOMS, search, pairs, runAtom } from './helpers.js';
import { TASK } from '../../src/atomic/ExactSearchAtom.js';

for (const AtomClass of ALL_ATOMS) {
  const name = AtomClass.manifest.name;

  describe(`Sözleşme: ${name}`, () => {
    it('manifest ve selection alanları eksiksiz', () => {
      const m = AtomClass.manifest;
      assert.equal(m.kind, 'atom');
      assert.equal(m.task, TASK);
      assert.equal(typeof m.version, 'string');
      assert.equal(typeof m.title, 'string');
      assert.ok(Array.isArray(m.references));
      assert.equal(typeof AtomClass.selection.features, 'function');
      assert.equal(typeof AtomClass.selection.defaults, 'object');
    });

    it('örtüşen eşleşmeler raporlanır: "AAAAA" içinde "AA" → 0,1,2,3', () => {
      assert.deepEqual(pairs(search(AtomClass, 'AAAAA', ['AA'])), [
        ['AA', 0], ['AA', 1], ['AA', 2], ['AA', 3],
      ]);
    });

    it('çıktı alanları: id, pattern, position, length', () => {
      const [match] = search(AtomClass, 'xxACGT', ['ACGT']);
      assert.deepEqual(match, { id: 't', pattern: 'ACGT', position: 2, length: 4 });
    });

    it('sıralama: önce konum, eşitse desenin listedeki sırası', () => {
      assert.deepEqual(pairs(search(AtomClass, 'ABAB', ['B', 'AB', 'A'])), [
        ['AB', 0], ['A', 0], ['B', 1], ['AB', 2], ['A', 2], ['B', 3],
      ]);
    });

    it('aynı desen iki kez verilirse ikisi de ayrı raporlanır', () => {
      assert.deepEqual(pairs(search(AtomClass, 'GATTACA', ['TA', 'TA'])), [['TA', 3], ['TA', 3]]);
    });

    it('ignoreCase: yalnızca ASCII A–Z ile a–z eşit; pattern alanı verildiği gibi kalır', () => {
      assert.deepEqual(pairs(search(AtomClass, 'aCgT ACGT', ['AcGt'], true)), [['AcGt', 0], ['AcGt', 5]]);
      // Türkçe/Unicode harfler ignoreCase'ten etkilenmez
      assert.deepEqual(pairs(search(AtomClass, 'İi ıI', ['I'], true)), [['I', 1], ['I', 4]]);
      assert.deepEqual(pairs(search(AtomClass, 'ç Ç', ['ç'], true)), [['ç', 0]]);
    });

    it('ignoreCase kapalıyken büyük/küçük harf farklıdır', () => {
      assert.deepEqual(pairs(search(AtomClass, 'acgt ACGT', ['ACGT'])), [['ACGT', 5]]);
    });

    it('konumlar UTF-16 kod birimi cinsindendir', () => {
      // "😀" iki kod birimidir; ardından gelen "A" 2. konumdadır
      assert.deepEqual(pairs(search(AtomClass, '😀A😀A', ['A'])), [['A', 2], ['A', 5]]);
    });

    it('desen metinden uzunsa veya metin boşsa sonuç boştur', () => {
      assert.deepEqual(search(AtomClass, 'ACG', ['ACGT']), []);
      assert.deepEqual(search(AtomClass, '', ['A']), []);
    });

    it('boş desen listesi veya boş desen hata verir', () => {
      assert.throws(() => new AtomClass({ patterns: [] }));
      assert.throws(() => new AtomClass({ patterns: ['A', ''] }));
      assert.throws(() => new AtomClass({}));
    });

    it('birden çok belge: her belge kendi id’si ve konumlarıyla', () => {
      const atom = new AtomClass({ patterns: ['CG'] });
      const out = runAtom(atom, [
        { id: 'a', text: 'ACGCG' },
        { id: 'b', text: 'TTT' },
        { id: 'c', text: 'CG' },
      ]);
      assert.deepEqual(out.map((m) => [m.id, m.position]), [['a', 1], ['a', 3], ['c', 0]]);
    });

    it('deterministik: aynı girdi → aynı çıktı', () => {
      const atom = new AtomClass({ patterns: ['TA', 'ATA'] });
      const doc = { id: 'x', text: 'TATATATAGGATA' };
      assert.deepEqual(runAtom(atom, [doc]), runAtom(atom, [doc]));
    });
  });
}

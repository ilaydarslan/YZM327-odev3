// Testlerde ortak kullanılan küçük yardımcılar.

import { registry } from '../../src/registry.js';

/** Bir atomun (veya molekülün) bir akış için bütün eşleşmeleri. */
export function runAtom(atom, entries) {
  const out = [];
  for (const entry of entries) for (const match of atom.process(entry)) out.push(match);
  return out;
}

/** Tek metin için kısa yol. */
export function search(AtomClass, seq, patterns, ignoreCase = false) {
  const atom = new AtomClass({ patterns, ignoreCase });
  return runAtom(atom, [{ header: '>t', seq }]);
}

/** Yalnızca [desen, konum] çiftleri: beklenen değerleri yazmak kolay olsun. */
export function pairs(matches) {
  return matches.map((m) => [m.pattern, m.position]);
}

/** Referans dışındaki gerçek atomlar. */
export const REAL_ATOMS = registry.atoms().filter((A) => A.manifest.name !== 'NaiveSearch');
export const ALL_ATOMS = registry.atoms();

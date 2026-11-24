// Kayıt defteri (REGISTRY) + üretici (FACTORY METHOD).
//
// Molekül hangi atomların var olduğunu buradan öğrenir; atomları ismiyle burada üretir.
// YENİ BİR ATOM EKLEMEK için yalnızca bu dosyanın en altına bir register() satırı eklenir;
// molekülün kodu değişmez (OCP: genişlemeye açık, değişikliğe kapalı).

import { TASK } from './atomic/ExactSearchAtom.js';
import { NaiveSearch } from './atomic/NaiveSearch.js';
import { HorspoolSearch } from './atomic/HorspoolSearch.js';
import { ShiftOrSearch } from './atomic/ShiftOrSearch.js';
import { KmpSearch } from './atomic/KmpSearch.js';
import { AhoCorasickSearch } from './atomic/AhoCorasickSearch.js';
import { BoyerMooreSearch } from './atomic/BoyerMooreSearch.js';
import { Bm4DnaDsSearch } from './atomic/Bm4DnaDsSearch.js';
import { Bm4DnaHmbsSearch } from './atomic/Bm4DnaHmbsSearch.js';
import { WuManberSearch } from './atomic/WuManberSearch.js';

export class Registry {
  #atoms = new Map();

  /** Bir atom sınıfını kaydeder. Sınıfın manifest ve selection alanları olmalı. */
  register(AtomClass) {
    const manifest = AtomClass?.manifest;
    if (!manifest?.name) throw new Error('Atomun static manifest.name alanı yok');
    if (manifest.kind !== 'atom') throw new Error(`${manifest.name}: manifest.kind "atom" olmalı`);
    if (typeof AtomClass.selection?.features !== 'function') {
      throw new Error(`${manifest.name}: static selection.features(shape) eksik`);
    }
    if (this.#atoms.has(manifest.name)) throw new Error(`${manifest.name} zaten kayıtlı`);
    this.#atoms.set(manifest.name, AtomClass);
    return this;
  }

  has(name) {
    return this.#atoms.has(name);
  }

  get(name) {
    const AtomClass = this.#atoms.get(name);
    if (!AtomClass) {
      throw new Error(`Bilinmeyen atom "${name}". Geçerli seçenekler: ${this.names().join(', ')}`);
    }
    return AtomClass;
  }

  names() {
    return [...this.#atoms.keys()];
  }

  /** Belirli bir görevi yapan atom sınıfları (kayıt sırasıyla). */
  atoms(task = TASK) {
    return [...this.#atoms.values()].filter((A) => A.manifest.task === task);
  }

  /** Factory Method: atomu ismiyle üretir. */
  create(name, params) {
    const AtomClass = this.get(name);
    return new AtomClass(params);
  }

  /** Testler için bağımsız bir kopya (varsayılan defteri kirletmeden sahte atom eklemek için). */
  clone() {
    const copy = new Registry();
    for (const AtomClass of this.#atoms.values()) copy.register(AtomClass);
    return copy;
  }
}

/** Varsayılan kayıt defteri. Yeni atom = buraya bir satır. */
export const registry = new Registry()
  .register(NaiveSearch)
  .register(HorspoolSearch)
  .register(ShiftOrSearch)
  .register(KmpSearch)
  .register(AhoCorasickSearch)
  .register(BoyerMooreSearch)
  .register(Bm4DnaDsSearch)
  .register(Bm4DnaHmbsSearch)
  .register(WuManberSearch);

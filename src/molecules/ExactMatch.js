// Molekül: ExactMatch — STRATEGY deseninin "Context"i.
//
// Aynı işi (tam eşleştirme) yapan atomlar = stratejiler. Molekül hangisinin en hızlı
// olacağını girdinin şekline bakarak seçer ve işi ona devreder.
// Atomları tek tek tanımaz; yalnızca ortak arayüzlerini (manifest, selection, process) bilir
// ve kayıt defterinden alır (DIP: somut sınıflara değil soyutlamaya bağımlı).
// Bu yüzden yeni bir atom eklemek bu dosyada hiçbir değişiklik gerektirmez.
//
// Seçim yöntemi: MALİYET MODELİ.
//   tahmini maliyet = Σ (atomun özelliği × katsayı)
//   ör. Horspool: scan = k·n / min(m, σ), prep = k·m
//   Katsayılar ölçümle (kalibrasyon) bulunur; yoksa atomun varsayılanı kullanılır.
//   Uygulanamaz atomlar (applicable(shape) bir metin döndürürse) hiç seçilmez.

import { TASK } from '../atomic/ExactSearchAtom.js';
import { registry as defaultRegistry } from '../registry.js';
import { computeShape } from '../shape.js';
import { coefficients as calibrated } from '../calibration.js';

export class ExactMatch {
  static manifest = {
    name: 'ExactMatch',
    version: '0.1.0',
    kind: 'molecule',
    task: TASK,
    title: 'Exact match (girdiye göre atom seçen molekül)',
    references: [],
  };

  /**
   * @param {{ patterns: string[], ignoreCase?: boolean, strategy?: string,
   *           registry?: import('../registry.js').Registry,
   *           coefficients?: Record<string, Record<string, number>> }} options
   */
  constructor({ patterns, ignoreCase = false, strategy = 'auto', registry = defaultRegistry, coefficients = calibrated } = {}) {
    this.params = { patterns, ignoreCase };
    this.registry = registry;
    this.coefficients = coefficients;
    this.strategy = strategy;

    if (strategy !== 'auto' && !registry.has(strategy)) {
      throw new Error(
        `Bilinmeyen strateji "${strategy}". Geçerli seçenekler: auto, ${registry.names().join(', ')}`,
      );
    }

    // Parametreler hemen kontrol edilsin diye (boş desen vb. burada hata verir)
    // seçilen ya da ilk kayıtlı atomla bir deneme örneği oluşturulur.
    const probe = strategy === 'auto' ? registry.atoms(TASK)[0].manifest.name : strategy;
    const atom = registry.create(probe, this.params);
    this.atom = strategy === 'auto' ? null : atom;

    this.record = { requested: strategy, selected: null, shape: null, estimates: null, why: null };
  }

  /** Her atomun tahmini maliyetini hesaplar. */
  estimate(shape) {
    const estimates = {};
    for (const AtomClass of this.registry.atoms(TASK)) {
      const { name } = AtomClass.manifest;
      const selection = AtomClass.selection;
      const verdict = selection.applicable ? selection.applicable(shape) : true;
      if (verdict !== true) {
        estimates[name] = { applicable: false, reason: String(verdict) };
        continue;
      }
      const features = selection.features(shape);
      const coef = { ...selection.defaults, ...(this.coefficients[name] ?? {}) };
      let cost = 0;
      for (const [key, value] of Object.entries(features)) cost += value * (coef[key] ?? 0);
      estimates[name] = { applicable: true, cost, features, coefficients: coef };
    }
    return estimates;
  }

  /** İlk kayda bakarak kararı verir ve record'u doldurur. */
  decide(firstEntry) {
    const shape = computeShape(firstEntry, this.params.patterns, this.params.ignoreCase);
    const estimates = this.estimate(shape);
    const ranked = Object.entries(estimates)
      .filter(([, e]) => e.applicable)
      .sort((a, b) => a[1].cost - b[1].cost);

    let selected;
    let why;
    if (this.strategy !== 'auto') {
      selected = this.strategy;
      why = `strateji kullanıcı tarafından seçildi: ${selected}`;
    } else {
      if (ranked.length === 0) throw new Error('Bu girdi için uygulanabilir atom yok');
      const [best, second] = ranked;
      selected = best[0];
      why =
        `${selected} en düşük tahmini maliyete sahip (${formatMs(best[1].cost)})` +
        (second ? `; ikinci ${second[0]} (${formatMs(second[1].cost)})` : '');
      const skipped = Object.entries(estimates).filter(([, e]) => !e.applicable);
      if (skipped.length) why += `. Uygulanamaz: ${skipped.map(([n, e]) => `${n} (${e.reason})`).join('; ')}`;
      this.atom = this.registry.create(selected, this.params);
    }

    this.record = { requested: this.strategy, selected, shape, estimates, why };
    return this.record;
  }

  /**
   * FASTA.Entry akışını işler, Sequence.Match üretir.
   * "auto"da karar ilk kayıtta verilir ve bütün akış için aynı atom kullanılır.
   */
  *run(entries) {
    let decided = false;
    for (const entry of entries) {
      if (!decided) {
        this.decide(entry);
        decided = true;
      }
      yield* this.atom.process(entry);
    }
  }
}

function formatMs(cost) {
  return `${cost.toPrecision(3)} ms`;
}

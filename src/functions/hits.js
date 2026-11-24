// Sonuç toplayıcı.
//
// Eşleşmeler (konum, desen sırası) çiftleridir. Sözleşme sıralamayı şöyle ister:
// önce konum, konum eşitse desenin listedeki sırası.
// Her çifti tek bir sayıya kodluyoruz: anahtar = konum * k + desenSırası.
// Sonra sayıları sıralamak çiftleri doğru sırada verir.

export class HitCollector {
  /** @param {number} k  desen sayısı */
  constructor(k) {
    this.k = k;
    this.keys = [];
  }

  /** Bir eşleşme ekle. */
  add(position, patternIndex) {
    this.keys.push(position * this.k + patternIndex);
  }

  /** Sıralanmış [konum, desenSırası] çiftlerini üretir. */
  *sorted() {
    const keys = Float64Array.from(this.keys);
    keys.sort();
    const k = this.k;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const patternIndex = key % k;
      yield [(key - patternIndex) / k, patternIndex];
    }
  }
}

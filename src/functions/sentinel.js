// Sentinel tamponu: metin + sonuna eklenmiş desen (Allmer 2016; Hume & Sunday 1991).
// Atlama döngüsü sınır denetimi yapmadan koşar; en geç eklenen desenin sonunda durur.
// Metnin kendisi değişmez: bir kez kopyalanır, her desen için yalnızca kuyruk yeniden yazılır.

/**
 * @param {Uint16Array} text
 * @param {Uint16Array[]} keys
 * @param {(buf: Uint16Array, key: Uint16Array, patternIndex: number) => void} fn
 */
export function withSentinel(text, keys, fn) {
  const n = text.length;
  let mMax = 0;
  for (const key of keys) if (key.length > mMax) mMax = key.length;
  const buf = new Uint16Array(n + mMax);
  buf.set(text);
  for (let pi = 0; pi < keys.length; pi++) {
    buf.set(keys[pi], n);
    fn(buf, keys[pi], pi);
  }
}

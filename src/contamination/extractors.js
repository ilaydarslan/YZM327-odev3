// Desen çıkarıcılar — STRATEGY deseni (+ FACTORY METHOD: createExtractor).
//
// Bir benchmark sorusundan, eğitim korpusunda aranacak desenleri üretir. Literatürdeki iki yöntem:
//   NgramExtractor            GPT-3 (Brown ve ark. 2020): normalize metnin bütün 13 kelimelik parçaları.
//                             Soru 13 kelimeden kısaysa sorunun tamamı tek desendir.
//   SubstringSampleExtractor  GPT-4 (OpenAI 2023): her sorudan rastgele seçilmiş 3 tane 50 karakterlik parça.
//                             Soru 50 karakterden kısaysa sorunun tamamı tek desendir.
// Detektör hangi yöntemin kullanıldığını bilmez; yalnızca extract(metin) çağırır. Yeni bir yöntem
// eklemek için yeni bir sınıf yazıp EXTRACTORS'a eklemek yeter (OCP).

export class NgramExtractor {
  static method = 'ngram';

  constructor({ n = 13 } = {}) {
    if (!Number.isInteger(n) || n < 1) throw new Error('n pozitif bir tam sayı olmalı');
    this.n = n;
  }

  describe() {
    return `${this.n} kelimelik n-gram (GPT-3 yöntemi)`;
  }

  /** @param {string} normalized  normalize edilmiş soru metni */
  extract(normalized) {
    if (normalized.length === 0) return [];
    const words = normalized.split(' ');
    if (words.length <= this.n) return [normalized];
    const out = [];
    for (let i = 0; i + this.n <= words.length; i++) out.push(words.slice(i, i + this.n).join(' '));
    return out;
  }
}

export class SubstringSampleExtractor {
  static method = 'substring';

  constructor({ length = 50, samples = 3, seed = 1 } = {}) {
    if (!Number.isInteger(length) || length < 1) throw new Error('length pozitif bir tam sayı olmalı');
    if (!Number.isInteger(samples) || samples < 1) throw new Error('samples pozitif bir tam sayı olmalı');
    this.length = length;
    this.samples = samples;
    this.seed = seed;
  }

  describe() {
    return `soru başına ${this.samples} rastgele ${this.length} karakterlik parça (GPT-4 yöntemi)`;
  }

  /** Aynı metin ve tohum → hep aynı parçalar (sorunun listedeki yerinden bağımsız). */
  extract(normalized) {
    if (normalized.length === 0) return [];
    if (normalized.length <= this.length) return [normalized];
    const random = makeRandom(hashString(normalized) ^ this.seed);
    const out = [];
    for (let s = 0; s < this.samples; s++) {
      const start = Math.floor(random() * (normalized.length - this.length + 1));
      out.push(normalized.slice(start, start + this.length));
    }
    return out;
  }
}

const EXTRACTORS = {
  [NgramExtractor.method]: NgramExtractor,
  [SubstringSampleExtractor.method]: SubstringSampleExtractor,
};

export const EXTRACTOR_METHODS = Object.keys(EXTRACTORS);

/** Factory Method: yöntem adından çıkarıcı üretir. */
export function createExtractor(method = 'ngram', options = {}) {
  const ExtractorClass = EXTRACTORS[method];
  if (!ExtractorClass) {
    throw new Error(`Bilinmeyen yöntem "${method}". Geçerli seçenekler: ${EXTRACTOR_METHODS.join(', ')}`);
  }
  return new ExtractorClass(options);
}

/** FNV-1a: metinden 32 bitlik tohum. */
function hashString(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mulberry32: küçük, tohumlu rastgele sayı üretici; [0, 1) döndürür. */
function makeRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

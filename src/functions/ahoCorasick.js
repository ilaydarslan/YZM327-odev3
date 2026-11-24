// Aho-Corasick (Aho & Corasick 1975): çok desen, metin üzerinde TEK geçiş.
//
// Fikir: bütün desenler bir ağaca (trie) eklenir. Her düğüm "şu ana kadar okunan
// metnin sonu, hangi desen öneklerine uyuyor" bilgisini tutar. Uyumsuzlukta
// "failure" bağlantısıyla bir sonraki en uzun uyan öneke geçilir.
// Bağlantılar önceden tam bir otomata (her düğüm × her harf → düğüm) dönüştürülür,
// böylece her metin karakteri için tek bir tablo okuması yapılır.
// O(n + toplam desen uzunluğu + eşleşme sayısı). Desen sayısı arttıkça diğerlerinden çok daha iyi.

/**
 * @param {Uint16Array[]} keys  desenler
 * @param {{ map: Uint16Array, size: number }} alphabet
 * @returns {{ delta: Int32Array, width: number, outputs: number[][] }}
 */
export function buildAutomaton(keys, alphabet) {
  const width = alphabet.size + 1; // 0. sütun: desenlerde olmayan karakterler
  const goto = [new Int32Array(width).fill(-1)];
  const own = [[]]; // düğümde biten desenlerin sıra numaraları

  // 1) Trie
  keys.forEach((key, patternIndex) => {
    let node = 0;
    for (let j = 0; j < key.length; j++) {
      const a = alphabet.map[key[j]];
      if (goto[node][a] === -1) {
        goto[node][a] = goto.length;
        goto.push(new Int32Array(width).fill(-1));
        own.push([]);
      }
      node = goto[node][a];
    }
    own[node].push(patternIndex);
  });

  // 2) Genişlik öncelikli dolaşarak failure bağlantıları ve tam geçiş tablosu
  const count = goto.length;
  const failure = new Int32Array(count);
  const outputs = new Array(count);
  const queue = [];
  outputs[0] = own[0];
  for (let a = 0; a < width; a++) {
    const child = goto[0][a];
    if (child === -1) {
      goto[0][a] = 0;
    } else {
      failure[child] = 0;
      queue.push(child);
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const r = queue[head];
    // Bu düğümde bitenler + failure zincirinde bitenler (kısa desenler)
    outputs[r] = own[r].concat(outputs[failure[r]]);
    for (let a = 0; a < width; a++) {
      const s = goto[r][a];
      if (s === -1) {
        goto[r][a] = goto[failure[r]][a];
      } else {
        failure[s] = goto[failure[r]][a];
        queue.push(s);
      }
    }
  }

  // 3) Tek bir düz diziye kopyala (hızlı erişim için)
  const delta = new Int32Array(count * width);
  for (let node = 0; node < count; node++) delta.set(goto[node], node * width);
  return { delta, width, outputs };
}

/**
 * @param {(position: number, patternIndex: number) => void} report
 */
export function searchAhoCorasick(text, automaton, map, lengths, report) {
  const { delta, width, outputs } = automaton;
  let state = 0;
  for (let i = 0; i < text.length; i++) {
    state = delta[state * width + map[text[i]]];
    const out = outputs[state];
    for (let o = 0; o < out.length; o++) {
      const patternIndex = out[o];
      report(i - lengths[patternIndex] + 1, patternIndex);
    }
  }
}

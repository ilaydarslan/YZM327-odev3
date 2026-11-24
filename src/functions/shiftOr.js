// Shift-Or, bit paralel arama (Baeza-Yates & Gonnet 1992).
//
// Fikir: 32 bitlik bir sayının her biti "desenin ilk j+1 karakteri şu an eşleşiyor mu?"
// sorusunun cevabıdır (0 = evet). Her metin karakterinde tek bir kaydırma ve VEYA işlemi
// bütün bitleri birden günceller. Desen uzunluğu ≤ 32 olmalı (bir sayıya sığmalı).
// Her zaman O(n); karşılaştırma yapmaz, dallanma azdır; küçük alfabede güçlüdür.

export const SHIFT_OR_MAX_LENGTH = 32;

/**
 * Her karakter için maske: desenin j. konumunda bu karakter varsa j. bit 0'dır.
 * 0. eleman (desenlerde olmayan karakter) bütün bitleri 1 olan maskedir.
 */
export function buildShiftOrMasks(pattern, alphabet) {
  const masks = new Int32Array(alphabet.size + 1).fill(-1); // -1 = bütün bitler 1
  for (let j = 0; j < pattern.length; j++) {
    masks[alphabet.map[pattern[j]]] &= ~(1 << j);
  }
  return masks;
}

export function searchShiftOr(text, pattern, masks, map, report) {
  const n = text.length;
  const m = pattern.length;
  if (m > n) return;
  const hitBit = 1 << (m - 1);
  let state = -1;
  for (let i = 0; i < n; i++) {
    state = (state << 1) | masks[map[text[i]]];
    if ((state & hitBit) === 0) report(i - m + 1);
  }
}

// Knuth-Morris-Pratt (Knuth, Morris & Pratt 1977).
//
// Fikir: metinde asla geri gidilmez. Bir uyumsuzlukta, desenin zaten eşleşmiş kısmının
// "hem öneki hem soneki olan en uzun parçası" (failure tablosu) kadarı korunur.
// En kötü durumda bile O(n + m). Akış (stream) dostudur.

/** failure[q] = desen[0..q] için, kendisinden kısa en uzun önek=sonek uzunluğu. */
export function buildFailure(pattern) {
  const m = pattern.length;
  const failure = new Int32Array(m);
  let k = 0;
  for (let q = 1; q < m; q++) {
    while (k > 0 && pattern[k] !== pattern[q]) k = failure[k - 1];
    if (pattern[k] === pattern[q]) k++;
    failure[q] = k;
  }
  return failure;
}

export function searchKmp(text, pattern, failure, report) {
  const n = text.length;
  const m = pattern.length;
  if (m > n) return;
  let q = 0; // şu ana kadar eşleşen karakter sayısı
  for (let i = 0; i < n; i++) {
    const c = text[i];
    while (q > 0 && pattern[q] !== c) q = failure[q - 1];
    if (pattern[q] === c) q++;
    if (q === m) {
      report(i - m + 1);
      q = failure[q - 1]; // örtüşen eşleşmeleri de bulmak için
    }
  }
}

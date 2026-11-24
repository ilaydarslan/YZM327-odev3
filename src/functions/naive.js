// Kaba kuvvet arama: metnin her konumunda deseni baştan sona karşılaştırır.
// O(n·m). Yavaştır ama doğruluğu apaçıktır; testlerde referans (oracle) olarak kullanılır.

/**
 * @param {Uint16Array} text
 * @param {Uint16Array} pattern
 * @param {(position: number) => void} report
 */
export function searchNaive(text, pattern, report) {
  const n = text.length;
  const m = pattern.length;
  for (let i = 0; i + m <= n; i++) {
    let j = 0;
    while (j < m && text[i + j] === pattern[j]) j++;
    if (j === m) report(i);
  }
}

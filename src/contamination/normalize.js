// Metin normalleştirme: kirlenme taramasının ilk adımı.
//
// Eğitim verisinde bir test sorusunun "aynısını" ararken küçük yazım farkları (büyük harf, noktalama,
// fazladan boşluk) eşleşmeyi bozmasın diye iki taraf da aynı biçime getirilir (Brown ve ark. 2020):
//   - harfler küçültülür,
//   - harf ve rakam dışındaki her karakter (noktalama, $, satır sonu...) ayraç sayılır,
//   - art arda ayraçlar tek boşluğa iner; baştaki ve sondaki boşluk atılır.
// Örnek: "Janet’s ducks lay 16 eggs!" → "janet s ducks lay 16 eggs"
//
// Harf: büyük ve küçük hâli farklı olan karakter (Latin, Türkçe, Yunan, Kiril...). Sonuçta yalnızca
// harf, rakam ve tek boşluk kalır; satır sonu ('\n') hiç kalmaz. Detektör bunu belge ayracı olarak kullanır.

/** @param {string} text */
export function normalizeText(text) {
  let out = '';
  let pendingSpace = false;
  for (const ch of text) {
    const isDigit = ch >= '0' && ch <= '9';
    const lower = ch.toLowerCase();
    const isLetter = lower !== ch.toUpperCase();
    if (isDigit || isLetter) {
      if (pendingSpace && out.length > 0) out += ' ';
      out += isDigit ? ch : lower;
      pendingSpace = false;
    } else {
      pendingSpace = true;
    }
  }
  return out;
}

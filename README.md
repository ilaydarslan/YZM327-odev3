# IoS tam eşleştirme: atomlar ve seçici ExactMatch molekülü

YZM327 vize projesi. IoS'taki `sequence.pattern-match.exact` görevi için dokuz tam eşleştirme atomu ve
bunlar arasından girdinin şekline (metin uzunluğu, alfabe, desen sayısı ve uzunlukları) göre en hızlısını
seçen `ExactMatch` molekülü. Node.js 22+, dış bağımlılık yok.

**Sonuç (kalibrasyonda kullanılmamış 120 vaka):** molekül vakaların %81,7'sinde en hızlı atomu seçiyor,
%89,2'sinde en hızlının %10 yakınında kalıyor; geometrik ortalama yavaşlama 1,031, toplam süre en iyinin
1,017 katı. En iyi sabit politika (hep Wu-Manber) 1,066 / 1,195; Allmer 2016 kuralı 3,446 / 8,815.
Ayrıntı: [`bench/results/validation.md`](bench/results/validation.md), rapor: [`docs/rapor.pdf`](docs/rapor.pdf).

## Kurulum ve komutlar

Kurulacak bir şey yok; Node.js 22 veya üstü yeterli.

```bash
node --version          # v22 veya üstü
npm test                # 249 test (sözleşme, özel durum, gerçek veri, 420 rastgele vaka, molekül, CLI)
npm run calibrate       # kalibrasyon ızgarasını ölçer, src/calibration.js'i yeniden yazar (~2–5 dk)
npm run bench           # doğrulama kümesi + politika karşılaştırması → bench/results/validation.md (~2 dk)
npm run mutation        # negatif kontrol: koda bilinçli hatalar sokup testlerin yakaladığını gösterir
npm run report          # docs/rapor.pdf'i sonuç dosyalarından yeniden üretir (Chrome gerekir)
```

Başka bir makinede seçim kalitesi için önce `npm run calibrate` çalıştırın: katsayılar makineye bağlıdır.

## Kullanım

```bash
node bin/ios.js run ExactMatch --patterns ACGT,GGCC < girdi.fasta > cikti.jsonl
node bin/ios.js run ExactMatch --patterns acgt --ignoreCase --strategy KmpSearch < girdi.fasta
node bin/ios.js explain --patterns GGATCC,GAATTC < tests/data/lambda_NC_001416.fa   # yalnızca karar (JSON)
```

`run` her satıra bir eşleşme yazar: `{"header":">chr1","pattern":"ACGT","position":0,"length":4}`.
Karar özeti stderr'e yazılır. Kodda:

```js
import { ExactMatch } from './src/molecules/ExactMatch.js';
const em = new ExactMatch({ patterns: ['ACGT', 'GGCC'], ignoreCase: false, strategy: 'auto' });
for (const match of em.run(entries)) { /* ... */ }
console.log(em.record); // { requested, selected, shape, estimates, why }
```

## Atomlar

| Atom | Grup | Kaynak | Güçlü olduğu yer |
| --- | --- | --- | --- |
| `HorspoolSearch` | A | Horspool 1980 | Tek uzun desen, büyük alfabe |
| `ShiftOrSearch` | A | Baeza-Yates & Gonnet 1992 | Kısa desen (m ≤ 32), küçük alfabe |
| `Bm4DnaDsSearch` | A | Allmer 2016 | Kısa desen; sentinel + 3 kez açılmış atlama döngüsü |
| `Bm4DnaHmbsSearch` | A | Allmer 2016; Wu & Manber 1994 | Uzun desen; q-gram kayması |
| `KmpSearch` | B | Knuth, Morris & Pratt 1977 | Akış, en kötü durumda doğrusal |
| `AhoCorasickSearch` | C | Aho & Corasick 1975 | Çok sayıda kısa desen, tek geçiş |
| `WuManberSearch` | C (bonus) | Wu & Manber 1994 | Çok desen, blok kayması |
| `BoyerMooreSearch` | – | Boyer & Moore 1977 | Karşılaştırma için (şartnamede hazır verilen örnek) |
| `NaiveSearch` | – | – | Yalnızca test referansı (oracle); otomatik seçilmez |

Allmer 2016'nın sözde kodundan ayrıldığımız noktalar ve gerekçeleri: [`docs/sapmalar.md`](docs/sapmalar.md).

## Seçim yöntemi

Maliyet modeli: her atom veri şeklinden işini anlatan özellikler hesaplar (ör. Horspool için
k·n / beklenen kayma), bunlar kalibrasyonla bulunan katsayılarla çarpılır, en ucuz tahmin seçilir.
Uygulanamaz atomlar (ör. 32'den uzun desende Shift-Or) hiç seçilmez. Kalibrasyon: 3 alfabe × 3 metin
uzunluğu (10⁴–10⁶) × 5 desen uzunluğu × 4 desen sayısı = 180 vaka, 1404 ölçüm; her ölçüm ısınma turu
+ en az 3 tekrarın medyanı.

## Tasarım

Strategy (atomlar / `ExactMatch`), Template Method (`ExactSearchAtom.process`), Factory Method + Registry
(`src/registry.js`), Facade (`bin/ios.js`); SOLID eşlemesi ve sınıf diyagramı: [`docs/tasarim.md`](docs/tasarim.md).
Yeni bir atom eklemek için `src/registry.js`'e bir `.register(...)` satırı yeterli; molekül değişmez.

## Klasörler

```
src/functions/     algoritma çekirdekleri (saf işlevler)
src/atomic/        atom sınıfları (manifest + selection + process)
src/molecules/     ExactMatch.js (seçici molekül)
src/registry.js    kayıt defteri       src/shape.js   veri şekli       src/calibration.js  katsayılar
bin/ios.js         komut satırı
bench/             veri üretici, süre ölçümü, kalibrasyon, mutasyon testi, results/ (ham sonuçlar)
tests/unit/        birim testleri      tests/benchmarks/validate.js  doğrulama    tests/data/  gerçek veri
docs/              rapor.pdf, sapmalar.md, tasarim.md, sunum.md, figures/
```

## Grup üyelerinin katkıları

- **[Ad Soyad 1]:** …
- **[Ad Soyad 2]:** …

Kodun, testlerin ve raporun hazırlanmasında yapay zekâ aracı (Claude, Anthropic) kullanılmıştır.

# LLM benchmark kirlenmesi tespiti: akıllı tam desen eşleştirme

YZM327 vize projesi. Hocanın verdiği IoS "atomlar ve seçici bir molekül" projesinin (biyolojide: genomda motif arama)
**yapay zekâ mühendisliğine uyarlanmış** hâli.

**Problem.** Büyük dil modelleri, GSM8K gibi benchmark'ların test sorularıyla ölçülür. Bu sorular eğitim verisine
sızmışsa (veri kirlenmesi, *benchmark contamination*) model cevabı ezberleyebilir ve test puanı yanıltıcı olur.
Kirlenme, test sorularından çıkarılan parçaların eğitim korpusunda **birebir** aranmasıyla bulunur (GPT-3: 13 kelimelik
n-gram; GPT-4: soru başına 3 rastgele 50 karakterlik parça). Bu, binlerce desenin milyonlarca karakterde arandığı bir
**tam desen eşleştirme** işidir ve en hızlı arama algoritması iş yükünün şekline göre değişir.

**Çözüm.** Dokuz tam eşleştirme atomu, bunlar arasından girdinin şekline (metin uzunluğu, alfabe, desen sayısı ve
uzunlukları) göre en hızlısını seçen `ExactMatch` molekülü ve bu çekirdeği kullanan `ContaminationDetector`.
Node.js 22+, dış bağımlılık yok.

**Docx sözleşmesi aynen korunur.** Atomlar ve molekül şartnamedeki biçimle çalışır: girdi FASTA kayıtları
`{ header, seq }`, çıktı `{ header, pattern, position, length }`, görev adı `sequence.pattern-match.exact`; lambda genomu
ve E. coli proteinleri testleri de yerinde. Yapay zekâ verisi (JSONL) çekirdeğe `JsonlFastaAdapter` ile bağlanır
(Adapter deseni); çekirdeğin hiçbir satırı yapay zekâ için değişmedi.

**Sonuçlar:** bkz. [`bench/results/validation.md`](bench/results/validation.md) (seçim kalitesi, görülmemiş 120 vaka),
[`bench/results/contamination.md`](bench/results/contamination.md) (GSM8K'de gerçek tarama), rapor: [`docs/rapor.pdf`](docs/rapor.pdf).

## Kurulum ve komutlar

Kurulacak bir şey yok; Node.js 22 veya üstü yeterli.

```bash
node --version          # v22 veya üstü
npm test                # birim testleri (sözleşme, lambda/E. coli/GSM8K, 420 rastgele vaka, molekül, kirlenme, CLI)
npm run calibrate       # kalibrasyon ızgarasını ölçer, src/calibration.js'i yeniden yazar (~8 dk)
npm run bench           # doğrulama kümesi + politika karşılaştırması → bench/results/validation.md
npm run contamination   # GSM8K kirlenme deneyi → bench/results/contamination.md
npm run mutation        # negatif kontrol: koda bilinçli hatalar sokup testlerin yakaladığını gösterir
npm run report          # docs/rapor.pdf'i sonuç dosyalarından yeniden üretir (Python + matplotlib, Chrome/Edge)
```

Başka bir makinede seçim kalitesi için önce `npm run calibrate` çalıştırın: katsayılar makineye bağlıdır.

## Kullanım

Girdi iki biçimde olabilir; komut satırı ilk karaktere bakarak anlar:
**FASTA** (şartnamedeki biçim, `>` ile başlar) ya da **JSONL** (büyük dil modeli eğitim verisinin standart biçimi,
her satır `{"id": "...", "text": "..."}`).

```bash
# Şartnamedeki kullanım (FASTA)
node bin/ios.js run ExactMatch --patterns ACGT,GGCC < tests/data/lambda_NC_001416.fa > cikti.jsonl
node bin/ios.js explain --patterns GGATCC,GAATTC < tests/data/lambda_NC_001416.fa     # yalnızca karar (JSON)

# Kirlenme taraması: hangi test soruları eğitim korpusunda geçiyor?
node bin/ios.js contamination --benchmark tests/data/gsm8k_test_200.jsonl < tests/data/gsm8k_train_1000.jsonl
node bin/ios.js contamination --benchmark sorular.jsonl --method substring --length 50 --samples 3 < korpus.jsonl
node bin/ios.js contamination --benchmark sorular.jsonl --method ngram --n 8 < korpus.jsonl

# Genel tam eşleştirme (molekül doğrudan)
node bin/ios.js run ExactMatch --patterns "how many,in total" < korpus.jsonl > eslesmeler.jsonl
node bin/ios.js run ExactMatch --patterns HOW --ignoreCase --strategy KmpSearch < korpus.jsonl
node bin/ios.js explain --patterns "how many,in total" < korpus.jsonl     # yalnızca karar (JSON)
```

`contamination` kirli soruları, eşleşen desen sayısını, geçtikleri eğitim kayıtlarını ve molekülün kararını yazar.
`run` her satıra bir eşleşme yazar: FASTA girdide `{"header":">chr1","pattern":"ACGT","position":0,"length":4}`,
JSONL girdide `{"id":"train-0004","pattern":"how many","position":188,"length":8}`.
Windows PowerShell `<` yönlendirmesini desteklemez: komutları Komut İstemi (cmd) ya da Git Bash'te çalıştırın, veya
`Get-Content korpus.jsonl | node bin/ios.js ...` yazın. Kodda:

```js
import { ContaminationDetector } from './src/contamination/ContaminationDetector.js';
import { createExtractor } from './src/contamination/extractors.js';
const detector = new ContaminationDetector({ extractor: createExtractor('ngram', { n: 13 }) });
const { summary, items, record } = detector.detect(testSorulari, egitimKorpusu);

import { ExactMatch } from './src/molecules/ExactMatch.js';
const em = new ExactMatch({ patterns: ['ACGT', 'GGCC'], strategy: 'auto' });
for (const match of em.run(parseFasta(metin))) { /* ... */ }             // FASTA.Entry akışı
for (const match of em.run(JsonlFastaAdapter.toEntries(belgeler))) { }   // JSONL belgeleri, Adapter ile
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
| `WuManberSearch` | C (bonus) | Wu & Manber 1994 | Çok desen, blok kayması (kirlenme taramasının tipik kazananı) |
| `BoyerMooreSearch` | – | Boyer & Moore 1977 | Karşılaştırma için (şartnamede hazır verilen örnek) |
| `NaiveSearch` | – | – | Yalnızca test referansı (oracle); otomatik seçilmez |

Allmer 2016'nın sözde kodundan ayrıldığımız noktalar: [`docs/sapmalar.md`](docs/sapmalar.md).

## Kirlenme tespiti nasıl çalışır

1. Test soruları ve eğitim belgeleri **normalize** edilir (küçük harf, noktalama yerine boşluk).
2. Bir **desen çıkarıcı** (Strategy) her sorudan desenleri üretir: `NgramExtractor` (13-gram, GPT-3) ya da
   `SubstringSampleExtractor` (3 × 50 karakter, GPT-4).
3. Korpus belgeleri `\n` ayracıyla **tek metne** birleştirilir; `ExactMatch` bütün desenleri bu metinde arar ve atomu
   korpusun tamamının şekline göre seçer. `\n` normalize metinde hiç geçmediği için desen belge sınırını aşamaz.
4. Her eşleşme belgesine ve desenin geldiği sorulara bağlanır; desenlerinden en az biri geçen soru **kirli** sayılır.

Test verisi: şartnamenin istediği lambda faj genomu ve 126 E. coli proteini (NCBI, UniProt) ile yapay zekâ uyarlaması için
GSM8K'den 200 test sorusu ve 1000 eğitim kaydı (MIT lisansı). Kaynaklar ve seçim yöntemi: [`tests/data/KAYNAK.md`](tests/data/KAYNAK.md).

## Seçim yöntemi

Maliyet modeli: her atom veri şeklinden işini anlatan özellikler hesaplar (ör. Horspool için k·n / beklenen kayma),
bunlar kalibrasyonla bulunan katsayılarla çarpılır, en ucuz tahmin seçilir. Uygulanamaz atomlar (ör. 32'den uzun
desende Shift-Or) hiç seçilmez. Kalibrasyon: 3 alfabe (etiket dizisi σ = 4, normalize metin σ = 37, ham metin/kod
σ = 95) × 3 metin uzunluğu (10⁴–10⁶) × 5 desen uzunluğu (4–64) × 4 desen sayısı (1, 8, 64, 512) = 180 vaka; her ölçüm
ısınma turu + en az 3 tekrarın medyanı.

Doğrulama iki ayrı kümeyle yapıldı: ilk modelin hataları birinci kümede bulundu ([`validation_v1.md`](bench/results/validation_v1.md)),
model düzeltildi (tablolar desen alfabesi σ_p ile; Aho-Corasick'e düğüm başına maliyet), katsayılar yalnızca kalibrasyon
ızgarasından yeniden uyduruldu ve raporlanan sonuçlar hiç görülmemiş ikinci kümede ölçüldü ([`validation.md`](bench/results/validation.md)).

## Tasarım

Strategy (atomlar / `ExactMatch`; desen çıkarıcılar / `ContaminationDetector`), Template Method (`ExactSearchAtom.process`),
Factory Method + Registry (`src/registry.js`, `createExtractor`), Facade (`ContaminationDetector`, `bin/ios.js`),
Adapter (`JsonlFastaAdapter`: JSONL belgelerini şartnamedeki FASTA.Entry biçimine çevirir);
SOLID eşlemesi ve sınıf diyagramı: [`docs/tasarim.md`](docs/tasarim.md). Yeni bir atom eklemek için `src/registry.js`'e
bir `.register(...)` satırı yeterli; molekül değişmez.

## Klasörler

```
src/functions/       algoritma çekirdekleri (saf işlevler)
src/atomic/          atom sınıfları (manifest + selection + process)
src/molecules/       ExactMatch.js (seçici molekül)
src/contamination/   normalize.js, extractors.js (Strategy), ContaminationDetector.js (Facade)
src/registry.js      kayıt defteri      src/shape.js   veri şekli
src/fasta.js         FASTA okuyucu      src/corpus.js  JSONL okuyucu + JsonlFastaAdapter
src/calibration.js   katsayılar
bin/ios.js           komut satırı
bench/               veri üretici, süre ölçümü, kalibrasyon, kirlenme deneyi, mutasyon testi, results/
tests/unit/          birim testleri      tests/benchmarks/validate.js  doğrulama
tests/data/          lambda genomu, E. coli proteinleri, GSM8K
docs/                rapor.pdf, sapmalar.md, tasarim.md, sunum.md, figures/
```

## Grup üyelerinin katkıları

- İlayda Arslan
- Beyza Seray Seyrek

Kod, testler, ölçümler, rapor ve sunum iki üye tarafından birlikte hazırlandı; iki üye de projenin her bölümünü açıklayabilir.

Kodun, testlerin ve raporun hazırlanmasında yapay zekâ aracı (Claude, Anthropic) kullanılmıştır.

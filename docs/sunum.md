# Sunum (5 dakika demo + 3 dakika soru)

Şartnamenin istediği üç şey: **canlı bir `explain` örneği**, **doğrulama tablosu**, **bir yanlış seçimin analizi**.
Her konuşmacı kodun her bölümünü açıklayabilmeli (şartname 10. bölüm): aşağıdaki "olası sorular" kısmına iki kişi de çalışsın.

## Akış

| Süre | Konuşmacı | Ne gösterilir | Ne söylenir |
| --- | --- | --- | --- |
| 0:00–0:40 | 1 | README'nin ilk paragrafı | Problem: tek bir "en hızlı" arama algoritması yok. Biz 8 atom yazdık; molekül girdiye bakıp en ucuzunu seçiyor. |
| 0:40–1:40 | 1 | Terminal: `npm test` | 249 test, bağımlılık yok. Her atom NaiveSearch ile eleman eleman aynı: lambda genomu, 126 E. coli proteini, 420 rastgele vaka. |
| 1:40–2:50 | 2 | Terminal: canlı `explain` (aşağıda) | Veri şekli (n, σ, k, m), her atomun tahmini maliyeti, seçim nedeni. Desen sayısını değiştirip kararın değiştiğini göster. |
| 2:50–3:50 | 2 | `bench/results/validation.md` tablosu | 120 görülmemiş vaka: %81,7 en hızlı, %89,2 %10 içinde, geom. ort. 1,031. Hep Wu-Manber 1,066; Allmer kuralı 3,446. |
| 3:50–4:40 | 1 | Raporun Şekil 1'i + val-3 satırı | Yanlış seçim analizi (aşağıda). |
| 4:40–5:00 | 2 | `docs/tasarim.md` diyagramı | Strategy + Template Method + Registry: yeni atom = tek satır, molekül değişmez (testi var). |

## Canlı demo komutları

```bash
npm test
# 1) Az sayıda kısa DNA deseni
node bin/ios.js explain --patterns GGATCC,GAATTC,AAGCTT < tests/data/lambda_NC_001416.fa
# 2) Tek uzun desen: seçim değişir mi?
node bin/ios.js explain --patterns GCGGCGACCTCGCGGGTTTTCGCTATTTATGAAAATTTTCCGGTTTAAGGCGTTTCCG < tests/data/lambda_NC_001416.fa
# 3) Çalıştırma: JSONL çıktı + stderr'de karar
node bin/ios.js run ExactMatch --patterns GGATCC,GAATTC < tests/data/lambda_NC_001416.fa | head -3
# 4) Zorla strateji + bilinmeyen ad hatası
node bin/ios.js run ExactMatch --patterns GGATCC --strategy Bm4DnaDsSearch < tests/data/lambda_NC_001416.fa | wc -l
node bin/ios.js run ExactMatch --patterns GGATCC --strategy Yok < tests/data/lambda_NC_001416.fa
```

## Yanlış seçim analizi (val-3)

İkili alfabe (`ab`, σ = 2), n = 50 000, 48 desen, m = 40. Model Aho-Corasick'i 0,506 ms, Wu-Manber'i 0,507 ms tahmin etti:
**modelde başa baş**. Ölçümde Wu-Manber 0,48 ms, Aho-Corasick 0,81 ms → 1,70 kat yavaşlama. Neden: σ = 2 kalibrasyonda yoktu
(en küçük alfabe DNA, σ = 4). İkili alfabede Wu-Manber'in blok boyu büyüyor ve kayma modeli (rastgele bloğun desende bulunma
olasılığı) bu bölgede fazla kötümser kaldı. Ders: görülmemiş alfabelerde başa baş kararlar güvenilmez; ızgaraya σ = 2 eklemek düzeltir.

## Olası sorular ve cevaplar

- **Neden maliyet modeli, kural değil?** Yeni atom eklenince molekül değişmesin diye: atom kendi özelliklerini getirir, kalibrasyon katsayıyı bulur.
- **Strategy deseni nerede?** Atomlar ConcreteStrategy, `ExactMatch` Context, ortak arayüz `ExactSearchAtom` + `selection`. Seçim çalışma anında.
- **Template Method nerede?** `ExactSearchAtom.process()`: koda çevir → `search()` → sırala. Alt sınıf yalnızca `prepare()`/`search()` yazar.
- **Yeni atom eklemek molekülü değiştirmiyor, kanıt?** `molecule.test.js` "sahte atom" testi: kayıt defterinin kopyasına atom eklenir, molekül onu seçer.
- **Makaleden nerede ayrıldınız?** Desende olmayan q-gram için m − w yerine m − q + 1 (güvenli en büyük kayma); özet döngüsündeki 0..w hatası;
  ·128 özetinin taşması; q formülü; sentinel'i metnin kopyasına eklemek (`docs/sapmalar.md`).
- **m − q + 1 neden güvenli?** Pencerenin son q karakteri desende hiç yoksa desenin hiçbir hizalaması o bloğu kapsayamaz; desenin başı bloğun hemen sonrasına gelebilir.
- **Bm4DNA algoritmaları neden hiç kazanmıyor?** Açılmış döngü ve sentinel C'de dal ve sınır denetimini kaldırıyordu; JIT'li JavaScript'te Horspool zaten hızlı, kopyalama ek maliyet.
- **Ölçüm nasıl?** Her ölçümden önce ısınma, en az 3 tekrarın medyanı, kısa işler en az 15 ms'lik gruplar halinde. Makine bilgisi sonuç dosyalarında.
- **Doğrulama kümesi neden adil?** Farklı tohumlar, ızgara arası değerler, kalibrasyonda olmayan 3 alfabe; model doğrulama verisine bakılmadan sabitlendi.
- **Negatif kontrol?** `npm run mutation`: koda 12 bilinçli hata sokulur, testlerin her birini yakaladığı gösterilir.

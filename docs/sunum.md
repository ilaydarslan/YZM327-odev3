# Sunum (5 dakika demo + 3 dakika soru)

Şartnamenin istediği üç şey: **canlı bir `explain` örneği**, **doğrulama tablosu**, **bir yanlış seçimin analizi**.
Slaytlar ayrı bir sunum dosyasında; bu belge konuşma akışı, demo komutları ve olası sorulardır.
Her konuşmacı kodun her bölümünü açıklayabilmeli: aşağıdaki "olası sorular" kısmına iki kişi de çalışsın.

## Akış

| Süre | Konuşmacı | Slayt | Ne söylenir |
| --- | --- | --- | --- |
| 0:00–0:30 | 1 | Kapak | Tek cümle: LLM benchmark sorularının eğitim verisine sızıp sızmadığını bulan, aramayı yapan 8 algoritmadan en hızlısını kendisi seçen bir sistem. Hocanın biyoloji örneğini YZ mühendisliğine uyarladık. |
| 0:30–1:00 | 1 | Problem | Kirlenme = sınav soruları önceden sızmış. GPT-3 13-gram, GPT-4 50 karakterlik parça ile kontrol etti. Asıl iş: binlerce deseni büyük bir metinde bulmak. |
| 1:00–1:20 | 1 | Tek en hızlı yok | Strategy slaytındaki navigasyon örneği: tek sorgu ≠ binlerce n-gram. |
| 1:20–1:50 | 2 | Çözüm akışı | Normalize → desen çıkar (Strategy) → ExactMatch seçer → rapor. Dedektör Facade. |
| 1:50–2:50 | 2 | **Canlı demo** (terminal) | `contamination` komutu: 3 kirli soru, seçilen atom ve nedeni. Sonra `explain` ile tek desen: seçimin değiştiğini göster. |
| 2:50–3:20 | 2 | Gerçek bulgu | Tam GSM8K: 1319 sorudan 3'ü (13-gram), test-0633 ↔ train-0021 şablonu. |
| 3:20–4:00 | 1 | **Doğrulama tablosu** | Hiç görülmemiş 120 vaka: %92,5 en hızlı, %95 %10 içinde, toplam süre en iyinin 1,021 katı; hep Wu-Manber 1,158, Allmer kuralı 9,28. |
| 4:00–4:35 | 1 | **Yanlış seçim analizi** | val-103 (aşağıda). |
| 4:35–5:00 | 2 | Tasarım | Strategy ×2, Template Method, Factory Method + Registry, Facade; yeni atom = tek satır. |

## Canlı demo komutları

```bash
npm test
# 0) Şartnamedeki explain örneği (FASTA, lambda genomu)
node bin/ios.js explain --patterns GGATCC,GAATTC,AAGCTT < tests/data/lambda_NC_001416.fa
# 1) Kirlenme taraması (200 test sorusu × 1000 eğitim kaydı): kirli sorular + molekülün kararı
node bin/ios.js contamination --benchmark tests/data/gsm8k_test_200.jsonl < tests/data/gsm8k_train_1000.jsonl
# 2) GPT-4 yöntemi: başka bir kirli soru (test-0919) da çıkar
node bin/ios.js contamination --benchmark tests/data/gsm8k_test_200.jsonl --method substring < tests/data/gsm8k_train_1000.jsonl
# 3) explain: tek kısa sorgu → seçim değişir (binlerce desende Wu-Manber, tek desende başka bir atom)
node bin/ios.js explain --patterns "how many" < tests/data/gsm8k_train_1000.jsonl
# 4) Zorla strateji + bilinmeyen ad hatası
node bin/ios.js run ExactMatch --patterns "post office" --strategy KmpSearch < tests/data/gsm8k_train_1000.jsonl
node bin/ios.js run ExactMatch --patterns "post office" --strategy Yok < tests/data/gsm8k_train_1000.jsonl
```

Windows PowerShell'de `<` yönlendirmesi çalışmaz; bu komutları **Komut İstemi (cmd)** ya da Git Bash'te çalıştırın, veya
PowerShell'de `Get-Content tests/data/gsm8k_train_1000.jsonl | node bin/ios.js contamination --benchmark tests/data/gsm8k_test_200.jsonl` yazın.

## İsteğe bağlı: iş akışı editörü

`npm run editor` → http://127.0.0.1:8080/web/ . "Kirlenme taraması (GSM8K)" hazır akışını yükleyip Çalıştır'a basın;
Sonuç kutusuna tıklayınca kirli sorular görünür. Hoca IoS editörünü sorarsa bunu gösterin.

## Yanlış seçim analizi (val-103)

Normalize metin (σ = 37), n = 20 000, 24 desen, uzunluklar karışık (42–116). Model bm4DNAHMbs'i 0,18 ms, Wu-Manber'i 0,22 ms
tahmin etti ve bm4DNAHMbs'i seçti; ölçümde Wu-Manber 0,12 ms, bm4DNAHMbs 0,22 ms → **1,78 kat yavaşlama** (en kötü vaka).
Neden: metin kısa olduğu için ön işleme baskın. Wu-Manber'in blok boyu B = 3, tablosu 38³ ≈ 55 bin hücre; model bu tabloyu
hücre başına kalibrasyondaki katsayıyla pahalı tahmin etti (0,14 ms), oysa tabloyu doldurmak çok ucuz. Kalibrasyonda tablo boyu
diğer ön işleme işleriyle birlikte büyüdüğü için katsayı onların maliyetini de üstlenmiş. Çözüm önerisi: Aho-Corasick'te yaptığımız
gibi Wu-Manber'in ön işlemesini iki özelliğe ayırmak (tablo hücreleri ve desen blokları).

## Olası sorular ve cevaplar

- **Biyoloji projesini nasıl uyarladınız?** Şartnamedeki çekirdek (atomlar, molekül, FASTA sözleşmesi, lambda ve E. coli testleri) aynen duruyor.
  Yapay zekâ verisi JSONL; onu çekirdeğe `JsonlFastaAdapter` (Adapter deseni) bağlıyor. Üstüne kirlenme dedektörünü (normalleştirme,
  iki çıkarma yöntemi, soru bazında rapor) ekledik. Motif yerine benchmark sorularından çıkan n-gram'ları arıyoruz.
- **Neden maliyet modeli, kural değil?** Yeni atom eklenince molekül değişmesin diye: atom kendi özelliklerini getirir, kalibrasyon katsayıyı bulur.
- **Strategy deseni nerede?** İki yerde: atomlar (ConcreteStrategy) + `ExactMatch` (Context); desen çıkarıcılar + `ContaminationDetector`.
- **Template Method nerede?** `ExactSearchAtom.process()`: koda çevir → `search()` → sırala. Alt sınıf yalnızca `prepare()`/`search()` yazar.
- **Adapter nerede, neden?** `src/corpus.js`, `JsonlFastaAdapter`: JSONL belgesini şartnamedeki FASTA kaydına çevirir. Böylece hocanın
  sözleşmesi (ve gizli testleri) bozulmadan aynı çekirdek yapay zekâ verisinde de çalışır.
- **Facade?** `ContaminationDetector.detect()` dört adımı tek çağrıya saklar; `bin/ios.js` komut satırını.
- **Yeni atom eklemek molekülü değiştirmiyor, kanıt?** `molecule.test.js` "sahte atom" testi.
- **Korpusu neden tek metne birleştiriyorsunuz?** Molekül kararı ilk belgeye bakarak verir; tek tek belgelerde n ≈ 500 olur ve yanlış
  atom seçilir. Birleştirince n = korpusun tamamı. Ayraç `\n` normalize metinde hiç geçmediği için desen belge sınırını aşamaz (testi var).
- **13-gram ile 50 karakter yöntemi neden farklı sorular buluyor?** 13-gram bütün parçalara bakar ama 13 kelimelik ortak parça ister;
  50 karakter yöntemi her sorudan yalnızca 3 parça seçer ama 50 karakter ~9 kelimedir, daha kısa ortak kalıpları yakalayabilir.
- **İki doğrulama kümesi neden?** İlk kümede modelin iki hatasını bulduk (tablo boyu desen alfabesine bağlı; Aho-Corasick'te düğüm başına maliyet).
  Düzelttikten sonra aynı kümede ölçmek kopya olurdu; o yüzden sonuçları hiç görülmemiş ikinci kümede raporladık.
- **Bm4DNA algoritmaları neden nadiren kazanıyor?** Açılmış döngü ve sentinel C'de dal ve sınır denetimini kaldırıyordu; JIT'li JavaScript'te
  Horspool zaten hızlı, sentinel için metnin kopyalanması ek maliyet.
- **Ölçüm nasıl?** Her ölçümden önce ısınma, en az 3 tekrarın medyanı, kısa işler en az 15 ms'lik gruplar halinde. Makine bilgisi sonuç dosyalarında.
- **Negatif kontrol?** `npm run mutation`: koda bilinçli hatalar sokulur, testlerin her birini yakaladığı gösterilir.

# Allmer 2016'dan sapmalar

Kaynak: Allmer J. (2016). *Exact pattern matching: Adapting the Boyer-Moore algorithm for DNA searches.*
PeerJ PrePrints 4:e1758v1, ve çevrimiçi ekindeki sözde kod (OnlineSupplement.pdf).
Şartnamenin uyarısına göre algoritmalar "makalede böyle yazıyor" diye değil, doğru sonuç verecek
şekilde uygulandı. Her sapma kodda da (`src/functions/bm4dnaDs.js`, `src/functions/bm4dnaHmbs.js`)
yorum olarak yazılıdır.

Allmer'in algoritmaları DNA (σ = 4) için tasarlanmıştır; adları öyle kalsa da uygulamamız her alfabede
çalışır (normalize metin, ham metin, Türkçe, 1000 sembollü token alfabesi). Aşağıdaki sapmaların
çoğu tam da bu genellemenin gerektirdiği düzeltmelerdir (ör. 128'den büyük karakter kodları).

## bm4DNADS (`Bm4DnaDsSearch`)

| # | Makale | Bizim uygulama | Gerekçe |
| --- | --- | --- | --- |
| 1 | Desen, sentinel olarak metnin kendisinin sonuna eklenir. | Metin bir kez `n + m_max` boyunda bir tampona kopyalanır; her desen için yalnızca kuyruk yeniden yazılır (`src/functions/sentinel.js`). | Atom girdisini değiştirmemeli (sözleşme 4.3, determinizm). Sonuç ve atlama döngüsünün sınırsız koşması aynıdır. |
| 2 | bmFast'te d0'daki son karakter değeri "2n gibi büyük bir sayı"dır; döngüden çıkış i > n ile anlaşılır. | bm4DNADS'teki gibi 0 kullanılır. | 0, üç kez açılmış döngünün durması için gereken değerdir: `i += 0` konumu korur, ardışık üç adım güvenle yapılabilir. |
| 3 | Eşleşme ya da sentinel denetiminden sonraki kayma sözde kodda açık değil. | `d1[desenin son karakteri]`: son karakterin desende bir önceki geçişine hizalayan Horspool kayması. | Daha büyük bir kayma örtüşen eşleşmeleri atlayabilir ("AAAAA" içinde "AA" testi bunu yakalar). |

## bm4DNAHMbs (`Bm4DnaHmbsSearch`)

| # | Makale | Bizim uygulama | Gerekçe |
| --- | --- | --- | --- |
| 1 | Desende hiç geçmeyen bir q-gram (kelime) için kayma **m − w**. | **m − q + 1**. | Pencerenin son q karakteri desende hiç yoksa, desenin bu q-gramı kapsayan hiçbir hizalaması eşleşemez. Desenin başı q-gramın ilk karakterinin hemen sonrasına, yani m − q + 1 ileriye gelebilir. m − w doğru sonuç verir ama her atlamada bir konum kaybeder; uzun desenlerde atlamaların çoğu bu varsayılan değerle yapıldığı için bu kayıp ölçülebilir. Test: `atoms.test.js` → "q-gram desende yoksa m − q + 1 kayar". |
| 2 | Özet döngüsü `0..w` aralığında koşar. | Tam q karakter: `e − q + 1 .. e`. | `0..w` kapsayıcı yazıldığında w + 1 karakter okur (bir eksik/fazla hatası). |
| 3 | Özet `value · 128 + karakter kodu`. | Küçültülmüş alfabe tabanında (S = σ_desen + 1) birebir özet; S^q > 65 536 ise 2^16'lık tabloya katlanır. | ·128 büyük q'da 32 biti aşar, UTF-16'da karakter kodu 128'den büyük olabilir. Katlanan tabloda çakışma olur: o yerde en **küçük** kayma tutulur (güvenli) ve her aday karakter karakter doğrulanır. Test: büyük alfabe (400 harf) vakası. |
| 4 | w, "Wu ve Manber'in anlattığı gibi" m ve α'dan hesaplanır; formül verilmez. | q = ⌈log_σ(2m)⌉, en az 1, en fazla m (`chooseQ`). | Wu & Manber (1994) önerisi: blok sayısının iki katından fazla farklı blok olabilsin ki rastgele bir blok desende nadiren bulunsun. |
| 5 | Sonek eşleşmesinden sonra desen "sonek kayması" kadar ilerler. | Sonek q-gramının desendeki içerideki en sağ geçişine göre; yoksa m − q + 1. Özet çakışırsa o yerdeki en küçük değer. | Sonek tekrarlanan desenlerde (ör. ACGACGACG) örtüşen eşleşmeleri kaçırmamak için. |
| 6 | Sentinel denetimi tutarsa desenin geri kalanı karşılaştırılır. | Desenin TAMAMI karşılaştırılır (son q karakter dahil). | Katlanan tabloda sonek özeti başka bir q-gramla çakışabilir; özet eşitliği eşleşme kanıtı değildir. |

## Diğer atomlar

Horspool, Shift-Or, KMP, Aho-Corasick, Boyer-Moore ve Wu-Manber ders kitabı tanımlarıyla uygulandı.
Wu-Manber'de şartnamenin "çok desen, blok kayması" tanımı izlendi; ön ek (prefix) özet filtresi
kullanılmadı, kayması 0 olan konumlarda o bloğa sahip bütün desenler doğrudan doğrulanır.

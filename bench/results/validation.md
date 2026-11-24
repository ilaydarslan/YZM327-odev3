# Doğrulama sonuçları

Makine: 11th Gen Intel(R) Core(TM) i7-1165G7 @ 2.80GHz (8 çekirdek), win32 10.0.26200, Node v24.14.0, 2026-11-24T13:09:00.235Z.
Vaka sayısı: 120, küme 2 (tohum 20261125) (kalibrasyonda kullanılmayan tohumlar, ızgara arası ve dışı değerler, yeni alfabeler).

| Politika | En hızlıyı seçme | %10 içinde | Geometrik ort. yavaşlama | En kötü yavaşlama | Toplam / en iyi |
| --- | --- | --- | --- | --- | --- |
| ExactMatch (auto) | 92.5% | 95.0% | 1.014 | 1.776 (val-103) | 1.021 |
| hep WuManberSearch | 79.2% | 85.8% | 1.045 | 1.713 (val-88) | 1.158 |
| hep Bm4DnaHmbsSearch | 1.7% | 9.2% | 3.501 | 116.797 (val-44) | 9.815 |
| hep AhoCorasickSearch | 14.2% | 15.0% | 3.589 | 275.749 (val-5) | 8.688 |
| Allmer 2016 kuralı | 1.7% | 11.7% | 3.878 | 222.956 (val-75) | 9.283 |
| hep BoyerMooreSearch | 0.0% | 5.8% | 4.796 | 126.046 (val-44) | 11.828 |
| hep Bm4DnaDsSearch | 0.0% | 6.7% | 5.112 | 239.200 (val-87) | 15.000 |
| hep HorspoolSearch | 5.0% | 8.3% | 5.310 | 246.913 (val-87) | 15.947 |
| hep KmpSearch | 0.0% | 0.0% | 12.002 | 292.278 (val-16) | 29.122 |
| hep ShiftOrSearch | 0.0% | 1.7% | 12.247 | 315.151 (val-2) | 28.870 |

## ExactMatch'in %10'dan fazla yavaş kaldığı vakalar (6)

| Vaka | Alfabe | n | k | m (ort.) | σ | Seçilen | En hızlı | Yavaşlama |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| val-103 | normalized | 20000 | 24 | 82.4 | 37 | Bm4DnaHmbsSearch | WuManberSearch | 1.776 |
| val-9 | binary | 50000 | 3 | 150.0 | 2 | Bm4DnaHmbsSearch | WuManberSearch | 1.293 |
| val-86 | printable | 300000 | 1 | 100.0 | 95 | WuManberSearch | HorspoolSearch | 1.186 |
| val-26 | printable | 30000 | 1 | 50.0 | 95 | WuManberSearch | HorspoolSearch | 1.178 |
| val-43 | normalized | 20000 | 32 | 147.6 | 37 | Bm4DnaHmbsSearch | WuManberSearch | 1.154 |
| val-27 | binary | 20000 | 200 | 3.0 | 2 | AhoCorasickSearch | WuManberSearch | 1.104 |

Karar süresi (veri şekli + tahminler) ortalaması: 1.311 ms.

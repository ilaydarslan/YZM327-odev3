# Doğrulama sonuçları

Makine: 11th Gen Intel(R) Core(TM) i7-1165G7 @ 2.80GHz (8 çekirdek), win32 10.0.26200, Node v24.14.0, 2026-11-24T13:03:05.127Z.
Vaka sayısı: 120, küme 1 (tohum 20261124), İLK MODEL (σ_p ve Aho-Corasick düğüm maliyeti düzeltmelerinden önce) (kalibrasyonda kullanılmayan tohumlar, ızgara arası değerler, yeni alfabeler).

| Politika | En hızlıyı seçme | %10 içinde | Geometrik ort. yavaşlama | En kötü yavaşlama | Toplam / en iyi |
| --- | --- | --- | --- | --- | --- |
| hep WuManberSearch | 76.7% | 88.3% | 1.045 | 2.432 (val-116) | 1.070 |
| ExactMatch (auto) | 80.0% | 89.2% | 1.058 | 3.482 (val-3) | 1.054 |
| hep Bm4DnaHmbsSearch | 4.2% | 9.2% | 3.224 | 114.937 (val-118) | 10.582 |
| hep AhoCorasickSearch | 9.2% | 12.5% | 3.254 | 167.121 (val-47) | 7.376 |
| Allmer 2016 kuralı | 4.2% | 10.0% | 3.752 | 488.616 (val-21) | 32.676 |
| hep BoyerMooreSearch | 3.3% | 10.8% | 4.137 | 172.811 (val-21) | 19.336 |
| hep Bm4DnaDsSearch | 0.0% | 5.0% | 4.349 | 488.616 (val-21) | 36.017 |
| hep HorspoolSearch | 6.7% | 16.7% | 4.401 | 604.097 (val-21) | 41.810 |
| hep KmpSearch | 0.0% | 0.0% | 9.307 | 542.016 (val-21) | 59.205 |
| hep ShiftOrSearch | 0.0% | 0.0% | 9.720 | 604.097 (val-21) | 60.697 |

## ExactMatch'in %10'dan fazla yavaş kaldığı vakalar (13)

| Vaka | Alfabe | n | k | m (ort.) | σ | Seçilen | En hızlı | Yavaşlama |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| val-3 | binary | 50000 | 200 | 40.0 | 2 | AhoCorasickSearch | WuManberSearch | 3.482 |
| val-81 | binary | 50000 | 1000 | 20.0 | 2 | AhoCorasickSearch | WuManberSearch | 2.912 |
| val-116 | printable | 20000 | 12 | 80.0 | 95 | WuManberSearch | HorspoolSearch | 2.432 |
| val-51 | binary | 20000 | 200 | 20.0 | 2 | AhoCorasickSearch | WuManberSearch | 2.174 |
| val-5 | tokens | 30000 | 6 | 3.0 | 1000 | WuManberSearch | AhoCorasickSearch | 1.683 |
| val-59 | tokens | 50000 | 12 | 3.6 | 1000 | WuManberSearch | AhoCorasickSearch | 1.652 |
| val-21 | binary | 700000 | 1000 | 40.4 | 2 | AhoCorasickSearch | WuManberSearch | 1.575 |
| val-13 | normalized | 20000 | 1 | 54.0 | 37 | WuManberSearch | HorspoolSearch | 1.230 |
| val-113 | tokens | 300000 | 1 | 10.0 | 1000 | WuManberSearch | HorspoolSearch | 1.209 |
| val-101 | tokens | 30000 | 32 | 100.0 | 1000 | Bm4DnaHmbsSearch | HorspoolSearch | 1.192 |
| val-8 | printable | 300000 | 12 | 20.0 | 95 | WuManberSearch | HorspoolSearch | 1.144 |
| val-104 | printable | 50000 | 2 | 53.0 | 95 | HorspoolSearch | WuManberSearch | 1.128 |
| val-79 | normalized | 300000 | 1 | 80.0 | 37 | WuManberSearch | HorspoolSearch | 1.104 |

Karar süresi (veri şekli + tahminler) ortalaması: 1.372 ms.

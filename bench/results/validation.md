# Doğrulama sonuçları

Makine: Intel(R) Xeon(R) Processor @ 2.10GHz (2 çekirdek), linux 6.18.44-fc-v819, Node v22.23.5, 2026-11-24T10:36:07.562Z.
Vaka sayısı: 120 (kalibrasyonda kullanılmayan tohumlar, ızgara arası değerler, yeni alfabeler).

| Politika | En hızlıyı seçme | %10 içinde | Geometrik ort. yavaşlama | En kötü yavaşlama | Toplam / en iyi |
| --- | --- | --- | --- | --- | --- |
| ExactMatch (auto) | 81.7% | 89.2% | 1.031 | 1.701 (val-3) | 1.017 |
| hep WuManberSearch | 75.0% | 84.2% | 1.066 | 1.976 (val-35) | 1.195 |
| hep AhoCorasickSearch | 15.0% | 16.7% | 2.099 | 20.875 (val-92) | 1.668 |
| hep Bm4DnaHmbsSearch | 1.7% | 5.8% | 2.343 | 24.551 (val-26) | 3.285 |
| Allmer 2016 kuralı | 1.7% | 7.5% | 3.446 | 82.335 (val-21) | 8.815 |
| hep BoyerMooreSearch | 3.3% | 5.8% | 4.301 | 59.048 (val-64) | 7.525 |
| hep Bm4DnaDsSearch | 0.0% | 2.5% | 4.880 | 82.335 (val-21) | 11.014 |
| hep HorspoolSearch | 5.0% | 5.8% | 4.999 | 85.103 (val-21) | 11.404 |
| hep ShiftOrSearch | 0.0% | 0.0% | 8.268 | 146.879 (val-64) | 17.542 |
| hep KmpSearch | 0.0% | 0.0% | 9.939 | 146.879 (val-64) | 19.588 |

## ExactMatch'in %10'dan fazla yavaş kaldığı vakalar (13)

| Vaka | Alfabe | n | k | m (ort.) | σ | Seçilen | En hızlı | Yavaşlama |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| val-3 | binary | 50000 | 48 | 40.0 | 2 | AhoCorasickSearch | WuManberSearch | 1.701 |
| val-2 | text | 200000 | 1 | 80.0 | 27 | WuManberSearch | HorspoolSearch | 1.495 |
| val-32 | text | 30000 | 6 | 80.0 | 27 | Bm4DnaHmbsSearch | HorspoolSearch | 1.348 |
| val-12 | dna | 20000 | 32 | 80.0 | 4 | Bm4DnaHmbsSearch | WuManberSearch | 1.324 |
| val-51 | binary | 20000 | 48 | 20.0 | 2 | AhoCorasickSearch | WuManberSearch | 1.314 |
| val-79 | protein | 300000 | 1 | 80.0 | 20 | WuManberSearch | BoyerMooreSearch | 1.303 |
| val-116 | text | 20000 | 8 | 80.0 | 27 | Bm4DnaHmbsSearch | WuManberSearch | 1.239 |
| val-53 | ACDEGHKL | 20000 | 32 | 80.0 | 8 | Bm4DnaHmbsSearch | WuManberSearch | 1.236 |
| val-67 | protein | 500000 | 3 | 31.0 | 20 | WuManberSearch | HorspoolSearch | 1.209 |
| val-48 | dna | 200000 | 12 | 6.0 | 4 | AhoCorasickSearch | WuManberSearch | 1.205 |
| val-85 | protein | 300000 | 3 | 22.7 | 20 | WuManberSearch | HorspoolSearch | 1.184 |
| val-91 | protein | 300000 | 1 | 24.0 | 20 | WuManberSearch | BoyerMooreSearch | 1.123 |
| val-22 | rna | 20000 | 12 | 6.0 | 4 | AhoCorasickSearch | WuManberSearch | 1.119 |

Karar süresi (veri şekli + tahminler) ortalaması: 1.121 ms.

# Kirlenme taraması: GSM8K

Makine: 11th Gen Intel(R) Core(TM) i7-1165G7 @ 2.80GHz (8 çekirdek), win32 10.0.26200, Node v24.14.0, 2026-11-24T13:11:45.582Z.

## Repodaki veri (200 test sorusu × 1000 eğitim kaydı)

### 13 kelimelik n-gram (GPT-3 yöntemi)

7026 desen, korpus 483038 karakter (σ = 39, m = 43–90). Kirli soru: 3 / 200.

Molekülün seçimi: **WuManberSearch**; ölçülen en hızlı: **WuManberSearch** (yavaşlama 1,00×).

| Atom | Süre (ms) | En hızlıya oran |
| --- | --- | --- |
| WuManberSearch (seçilen) | 16,6 | 1,00× |
| AhoCorasickSearch | 462,9 | 27,85× |
| Bm4DnaHmbsSearch | 591,2 | 35,57× |
| Bm4DnaDsSearch | 865,9 | 52,10× |
| HorspoolSearch | 935,9 | 56,31× |
| BoyerMooreSearch | 1089,7 | 65,56× |
| KmpSearch | 6481,8 | 389,97× |

| Kirli soru | Eşleşen desen | Eğitim kaydı |
| --- | --- | --- |
| test-0582 | 3 / 29 | train-0407 |
| test-0603 | 7 / 13 | train-1315, train-5163 |
| test-0633 | 13 / 44 | train-0021 |

### soru başına 3 rastgele 50 karakterlik parça (GPT-4 yöntemi)

596 desen, korpus 483038 karakter (σ = 39, m = 50–50). Kirli soru: 3 / 200.

Molekülün seçimi: **WuManberSearch**; ölçülen en hızlı: **WuManberSearch** (yavaşlama 1,00×).

| Atom | Süre (ms) | En hızlıya oran |
| --- | --- | --- |
| WuManberSearch (seçilen) | 3,2 | 1,00× |
| AhoCorasickSearch | 30,2 | 9,41× |
| Bm4DnaHmbsSearch | 58,8 | 18,32× |
| Bm4DnaDsSearch | 85,4 | 26,58× |
| HorspoolSearch | 88,8 | 27,64× |
| BoyerMooreSearch | 105,5 | 32,84× |
| KmpSearch | 675,7 | 210,33× |

| Kirli soru | Eşleşen desen | Eğitim kaydı |
| --- | --- | --- |
| test-0603 | 2 / 3 | train-1315, train-5163 |
| test-0633 | 1 / 3 | train-0021 |
| test-0919 | 1 / 3 | train-7286 |

## Tam GSM8K (1319 test sorusu × 7473 eğitim kaydı)

| Yöntem | Desen | Kirli soru | Oran | Seçilen atom | Toplam süre |
| --- | --- | --- | --- | --- | --- |
| 13 kelimelik n-gram (GPT-3 yöntemi) | 46281 | 3 | %0,23 | WuManberSearch | 1,13 sn |
| soru başına 3 rastgele 50 karakterlik parça (GPT-4 yöntemi) | 3926 | 3 | %0,23 | WuManberSearch | 0,43 sn |

13 kelimelik n-gram (GPT-3 yöntemi): test-0582 ↔ train-0407 (3/29); test-0603 ↔ train-1315, train-5163 (7/13); test-0633 ↔ train-0021 (13/44)

soru başına 3 rastgele 50 karakterlik parça (GPT-4 yöntemi): test-0603 ↔ train-1315, train-5163 (2/3); test-0633 ↔ train-0021 (1/3); test-0919 ↔ train-7286 (1/3)

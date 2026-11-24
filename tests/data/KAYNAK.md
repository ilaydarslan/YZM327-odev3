# Test verisinin kaynağı

Gerçek veri: **GSM8K** (Cobbe ve ark. 2021, "Training Verifiers to Solve Math Word Problems"), OpenAI'ın
ilkokul düzeyi matematik sorusu benchmark'ı. Büyük dil modellerinin akıl yürütmesini ölçmek için en çok
kullanılan test setlerinden biridir; eğitim verisine sızıp sızmadığı (kirlenme) da bu yüzden önemlidir.

| Dosya | İçerik | Kaynak |
| --- | --- | --- |
| `gsm8k_test_200.jsonl` | Benchmark: test setinden 200 soru, `{ id, text }` (text = soru) | `grade_school_math/data/test.jsonl` (1319 soru) |
| `gsm8k_train_1000.jsonl` | Eğitim korpusu: train setinden 1000 kayıt, `{ id, text }` (text = soru + "\n" + çözüm) | `grade_school_math/data/train.jsonl` (7473 kayıt) |
| `GSM8K_LICENSE` | GSM8K'nin MIT lisansı (verinin bir kısmını dağıttığımız için lisans metni de dosyada durur) | `LICENSE` |

Kaynak depo: https://github.com/openai/grade-school-math (MIT lisansı, Copyright (c) 2021 OpenAI).
İndirme tarihi: 24 Kasım 2026. Adresler:

```
https://raw.githubusercontent.com/openai/grade-school-math/master/grade_school_math/data/test.jsonl
https://raw.githubusercontent.com/openai/grade-school-math/master/grade_school_math/data/train.jsonl
```

## Alt küme nasıl seçildi

`node bench/prepare-gsm8k.js test.jsonl train.jsonl` üretir:

1. `id` orijinal dosyadaki satır numarasıdır (`test-0603` = test.jsonl'ın 603. satırı), böylece her kayıt kaynağına geri bulunabilir.
2. Önce TAM test seti TAM eğitim setinde taranır (13-gram ve 3 × 50 karakter yöntemleri). Kirli çıkan bütün test
   soruları (test-0582, 0603, 0633, 0919) ve eşleştikleri bütün eğitim kayıtları (train-0021, 0407, 1315, 5163, 7286)
   alt kümeye girer.
3. Kalan yer dosyadaki sırayla ilk kayıtlarla doldurulur (toplam 200 soru, 1000 kayıt).

Böylece repo küçük kalır (~600 KB) ama tam taramanın gerçek bulgularını da içerir. Tam veriyle deney:
`node bench/contamination.js --full test.jsonl train.jsonl`.

# Test verisinin kaynağı

İki gerçek veri kümesi var: docx'in istediği biyoloji verisi (aşağıda, lambda genomu ve E. coli proteinleri) ve
yapay zekâ uyarlamasının verisi **GSM8K** (Cobbe ve ark. 2021, "Training Verifiers to Solve Math Word Problems"), OpenAI'ın
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

---

## Docx'teki gerçek veri: lambda faj genomu ve 126 E. coli proteini

Şartnamede (bölüm 5) başlangıç paketinin `tests/data/` klasöründe vereceği söylenen gerçek veriler:
lambda faj genomu ve 126 E. coli proteini. Başlangıç paketi elimize geçmediği için iki dosya da
doğrudan verinin asıl kaynağından (NCBI ve UniProt) indirildi ve hiç değiştirilmeden kaydedildi.
Hocanın paketi gelirse bu dosyalar onunkilerle değiştirilebilir; testler dosya adlarına bağlıdır.

| Dosya | İçerik | Kaynak | Denetim |
| --- | --- | --- | --- |
| `lambda_NC_001416.fa` | Enterobacteria phage lambda, tam genom, 1 kayıt | NCBI RefSeq NC_001416.1 | 48 502 bp (NCBI'deki uzunluk), başlık NC_001416.1 |
| `ecoli_k12_126_proteins.fasta` | Escherichia coli (strain K12), 126 protein, 126 kayıt | UniProtKB/Swiss-Prot (OX=83333) | 126 kayıt, hepsi OS=Escherichia coli (strain K12) OX=83333; yalnızca 20 standart amino asit harfi |

## Nasıl indirildi (24 Kasım 2026)

Lambda genomu, NCBI E-utilities ile:

```
https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=NC_001416.1&rettype=fasta&retmode=text
```

E. coli proteinleri, UniProt REST API ile. Sorgu: E. coli K-12'nin (OX=83333) incelenmiş (Swiss-Prot)
kayıtları, erişim numarasına göre sıralı, ilk 126 kayıt. Sıralama sabit olduğu için aynı adres aynı
listeyi verir (UniProt'a yeni kayıt eklenmedikçe):

```
https://rest.uniprot.org/uniprotkb/search?query=organism_id:83333+AND+reviewed:true&sort=accession+asc&size=126&format=fasta
```

Adresler tarayıcıda açılıp sayfa "farklı kaydet" ile ya da `curl -o <dosya> "<adres>"` ile indirilebilir.

# Test verisinin kaynağı

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

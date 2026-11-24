# Test verisinin kaynağı

Şartnamede (bölüm 5) başlangıç paketinin `tests/data/` klasöründe vereceği söylenen gerçek veriler.
Başlangıç paketi elimize geçmediği için herkese açık kaynaklardaki aynı veriler kullanıldı.
Hocanın paketi gelirse bu dosyalar onunkilerle değiştirilmelidir; testler dosya adlarına bağlıdır.

| Dosya | İçerik | Kaynak | Denetim |
| --- | --- | --- | --- |
| `lambda_NC_001416.fa` | Enterobacteria phage lambda, tam genom, 1 kayıt | NCBI RefSeq NC_001416.1 | 48 502 bp (NCBI'deki uzunluk), başlık NC_001416.1 |
| `ecoli_k12_126_proteins.fasta` | Escherichia coli (strain K12), 126 protein, 126 kayıt | UniProtKB/Swiss-Prot (OX=83333) | 126 kayıt, hepsi OS=Escherichia coli (strain K12) OX=83333; yalnızca 20 standart amino asit harfi |

Dosyalar, aynı ödevi yapan başka bir grubun açık deposundaki (github.com/Baki-B/YZM327-Odev-3,
`tests/data/`) kopyalarından alınmıştır; o deponun kodundan hiçbir şey kullanılmamıştır.
Diziler NCBI ve UniProt'un herkese açık verileridir.

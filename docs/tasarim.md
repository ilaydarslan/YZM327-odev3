# Tasarım: desenler, SOLID ve sınıf diyagramı

Bu belge sunumda "hangi deseni nerede, neden kullandınız?" sorusuna cevaptır.
Diyagramın görüntüsü: `docs/figures/sinif_diyagrami.png` (kaynak: `docs/figures/sinif_diyagrami.mmd`).

## Tasarım desenleri

| Desen (GoF) | Nerede | Neden |
| --- | --- | --- |
| **Strategy** | Her atom (`HorspoolSearch`, `WuManberSearch`, …) bir *ConcreteStrategy*; `ExactMatch` *Context*; ortak arayüz `ExactSearchAtom` (`process`) + `selection`. | Aynı işi (tam eşleştirme) yapan birbirinin yerine geçebilen algoritmalar. Molekül çalışma anında birini seçer ya da kullanıcı `strategy` ile zorlar. Büyük `if/else` bloğu yok. Hocanın slaytındaki "Navigasyon → Otobüs/Taksi/Bisiklet" örneğinin aynısı. |
| **Template Method** | `ExactSearchAtom.process()`: kod çevirme → `search()` → sıralı çıktı. Alt sınıf yalnızca `prepare()` ve `search()`/`searchOne()` yazar. | Sözleşme kuralları (sıralama, ignoreCase, parametre denetimi) tek yerde kalır; her atom aynı kuralları otomatik uygular. Bir atom sıralamayı unutamaz. |
| **Factory Method** | `Registry.create(name, params)`; molekül atomu adıyla ürettirir. | Molekül somut sınıfları `new HorspoolSearch(...)` diye bilmez; adı bilmesi yeter. |
| **Registry** | `src/registry.js`: `register`, `get`, `atoms(task)`, `clone`. | Yeni atom = tek satır. Test içinde sahte atom `clone().register(...)` ile eklenir, varsayılan defter kirlenmez. |
| **Facade** | `bin/ios.js`: FASTA okuma, molekül kurma, karar, JSONL yazma tek komutun arkasında. | Kullanıcı iç yapıyı bilmeden `run` / `explain` ile çalışır. |

## SOLID

| İlke | Nasıl sağlandı | Kanıt |
| --- | --- | --- |
| **S** Tek sorumluluk | `functions/` yalnızca algoritma çekirdeği (saf hesap), `atomic/` yalnızca sözleşme ve seçim bilgisi, `molecules/` yalnızca karar, `shape.js` yalnızca veri şekli, `bin/` yalnızca giriş/çıkış. | Dosya yapısı |
| **O** Açık/kapalı | Yeni atom eklemek molekülün kodunu değiştirmez. | `molecule.test.js`: "sahte atom … molekül kodu değişmeden seçilebilir" |
| **L** Liskov | Her atom diğerinin yerine kullanılabilir: hepsi aynı sözleşme testlerinden geçer ve aynı sonucu verir. | `contract.test.js`, `random.test.js` ("zorla seçilen her strateji aynı sonucu verir") |
| **I** Arayüz ayrımı | Atomdan istenen yalnızca `manifest`, `selection` (`features`, `defaults`, `applicable`) ve `process`. Çok desenli atom `search`'ü, tek desenli `searchOne`'ı yazar; ikisini birden yazmak zorunda değil. | `ExactSearchAtom.js` |
| **D** Bağımlılığın ters çevrilmesi | `ExactMatch` somut atomlara değil, kayıt defterine ve `selection` arayüzüne bağlı; kayıt defteri yapıcıya parametre olarak da verilebilir. | `new ExactMatch({ patterns, registry })` |

## Sınıf diyagramı (tam)

```mermaid
classDiagram
  direction LR
  class ExactSearchAtom {
    <<abstract>>
    +manifest$
    +patterns: string[]
    +ignoreCase: boolean
    #keys: Uint16Array[]
    #alphabet: Alphabet
    +constructor(params)
    #prepare()
    #search(text, collector)
    #searchOne(text, patternIndex, collector)
    +process(entry)* Match
  }
  class NaiveSearch
  class HorspoolSearch
  class ShiftOrSearch
  class KmpSearch
  class BoyerMooreSearch
  class Bm4DnaDsSearch
  class Bm4DnaHmbsSearch
  class AhoCorasickSearch
  class WuManberSearch
  ExactSearchAtom <|-- NaiveSearch
  ExactSearchAtom <|-- HorspoolSearch
  ExactSearchAtom <|-- ShiftOrSearch
  ExactSearchAtom <|-- KmpSearch
  ExactSearchAtom <|-- BoyerMooreSearch
  ExactSearchAtom <|-- Bm4DnaDsSearch
  ExactSearchAtom <|-- Bm4DnaHmbsSearch
  ExactSearchAtom <|-- AhoCorasickSearch
  ExactSearchAtom <|-- WuManberSearch

  class Selection {
    <<interface>>
    +features(shape) Features
    +defaults: Coefficients
    +applicable(shape) true|string
  }
  ExactSearchAtom ..> Selection : static selection

  class Registry {
    -atoms: Map
    +register(AtomClass) Registry
    +get(name) AtomClass
    +has(name) boolean
    +names() string[]
    +atoms(task) AtomClass[]
    +create(name, params) ExactSearchAtom
    +clone() Registry
  }
  Registry o-- ExactSearchAtom : kayıtlı sınıflar

  class ExactMatch {
    +manifest$
    +strategy: string
    +record: Record
    -atom: ExactSearchAtom
    +constructor(options)
    +estimate(shape) Estimates
    +decide(firstEntry) Record
    +run(entries)* Match
  }
  ExactMatch --> Registry : kullanır
  ExactMatch --> ExactSearchAtom : seçilen strateji
  ExactMatch ..> Shape : computeShape()

  class Shape {
    +n, sigma, k
    +mMin, mMax, mAvg
  }
  class HitCollector {
    +add(position, patternIndex)
    +sorted()* pair
  }
  ExactSearchAtom ..> HitCollector

  class Cli {
    <<Facade: bin/ios.js>>
    +run ExactMatch
    +explain
  }
  Cli --> ExactMatch
  Cli ..> Fasta : parseFasta()
  class Fasta {
    +parseFasta(text) Entry[]
  }
```

## Kâğıda çizilecek sade hâli

Sınav/sunumda elle çizmek için yalnızca kutular ve ana metotlar:

```
                 «Facade» bin/ios.js  (run, explain)
                          │
                          ▼
   ┌───────────────── ExactMatch (Context) ──────────────────┐
   │ strategy, record                                         │
   │ decide(firstEntry), estimate(shape), run(entries)        │
   └──────────┬───────────────────────────────┬───────────────┘
              │ kullanır                      │ seçilen atom
              ▼                               ▼
   Registry (Factory)              «abstract» ExactSearchAtom (Template Method)
   register, get, create           process(entry)  ← iskelet, sabit
                                    prepare(), search()  ← alt sınıflar doldurur
                                              ▲ kalıtım
          ┌──────────┬──────────┬─────────────┼─────────────┬──────────┬───────────┐
       Horspool   ShiftOr     KMP     Bm4DnaDs / Bm4DnaHmbs   BoyerMoore  AhoCorasick  WuManber
                         (hepsi: static manifest + static selection)
```

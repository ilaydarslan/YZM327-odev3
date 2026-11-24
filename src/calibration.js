// Kalibrasyondan çıkan katsayılar (ms / özellik birimi). `npm run calibrate` bu dosyayı yeniden yazar.
// Ölçüm: Intel(R) Xeon(R) Processor @ 2.10GHz, Node v22.23.5, 2026-11-24T10:32:28.196Z.
// Bir atomun burada katsayısı yoksa atomun kendi selection.defaults değeri kullanılır.
export const coefficients = {
  "HorspoolSearch": {
    "scan": 0.000007874255139297831,
    "prep": 0.000033947988032566616,
    "text": 0.000003656294379437934,
    "out": 0.00036397937249125367
  },
  "ShiftOrSearch": {
    "scan": 0.000001621725047084378,
    "prep": 0.00008889575273875723,
    "text": 0.000003344661015628108,
    "out": 0.00016435170384546948
  },
  "KmpSearch": {
    "scan": 0.000002391403165480071,
    "prep": 0.0001791862651036912,
    "text": 0.0000035144206427113585,
    "out": 0.0010347816837685746
  },
  "AhoCorasickSearch": {
    "scan": 0.0000069126674916060206,
    "prep": 0.00002780468196503414,
    "text": 0,
    "out": 0.0001260485077886538
  },
  "BoyerMooreSearch": {
    "scan": 0.000008703417370212713,
    "prep": 0.00006254074533954844,
    "text": 0.0000029343831710765835,
    "out": 0.0005972537192584792
  },
  "Bm4DnaDsSearch": {
    "scan": 0.000007499598310300616,
    "prep": 0.000037689259413267713,
    "text": 0.0000035995571484084365,
    "out": 0.0003435708446129322
  },
  "Bm4DnaHmbsSearch": {
    "probe": 0.000006213691584773362,
    "hash": 0.0000013399449666836476,
    "prep": 0.000004637438717788871,
    "text": 0.0000035430825434731377,
    "out": 0.00015106250674987685
  },
  "WuManberSearch": {
    "probe": 0.000006169656384256377,
    "hash": 0.0000011640664146566366,
    "verify": 0.00001655533062954304,
    "prep": 0.0000035028604489277273,
    "text": 0.00000293270340939812,
    "out": 0.00015008542901189347
  }
};

#!/usr/bin/env node
// GSM8K'nin orijinal dosyalarından repodaki küçük test verisini üretir (tests/data/KAYNAK.md).
//
//   node bench/prepare-gsm8k.js <test.jsonl> <train.jsonl>
//
// Alt küme nasıl seçilir: önce TAM test seti (1319 soru) TAM eğitim setinde (7473 kayıt) taranır
// (13-gram ve 50 karakterlik parça yöntemleriyle). Kirli çıkan bütün test soruları ve eşleştikleri bütün
// eğitim kayıtları alt kümeye girer; kalan yer dosyadaki sırayla ilk kayıtlarla doldurulur
// (200 soru, 1000 kayıt). Böylece küçük veri, tam taramanın gerçek bulgularını da içerir.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { formatJsonl } from '../src/corpus.js';
import { ContaminationDetector } from '../src/contamination/ContaminationDetector.js';
import { createExtractor } from '../src/contamination/extractors.js';
import { loadGsm8k } from './gsm8k.js';

const [testPath, trainPath] = process.argv.slice(2);
if (!testPath || !trainPath) {
  console.error('Kullanım: node bench/prepare-gsm8k.js <test.jsonl> <train.jsonl>');
  process.exit(1);
}

const OUT = (name) => fileURLToPath(new URL(`../tests/data/${name}`, import.meta.url));
const test = loadGsm8k(testPath, 'test');
const train = loadGsm8k(trainPath, 'train');

const keepTest = new Set();
const keepTrain = new Set();
for (const method of ['ngram', 'substring']) {
  const result = new ContaminationDetector({ extractor: createExtractor(method) }).detect(test, train);
  for (const item of result.items.filter((r) => r.contaminated)) {
    keepTest.add(item.id);
    for (const doc of item.docs) keepTrain.add(doc);
  }
}

function subset(all, keep, size) {
  const chosen = new Set(keep);
  for (const doc of all) {
    if (chosen.size >= size) break;
    chosen.add(doc.id);
  }
  return all.filter((doc) => chosen.has(doc.id)); // orijinal sıra korunur
}

const testSubset = subset(test, keepTest, 200);
const trainSubset = subset(train, keepTrain, 1000);
writeFileSync(OUT('gsm8k_test_200.jsonl'), formatJsonl(testSubset));
writeFileSync(OUT('gsm8k_train_1000.jsonl'), formatJsonl(trainSubset));
console.log(`Tam taramada kirli: ${[...keepTest].join(', ')} ↔ ${[...keepTrain].join(', ')}`);
console.log(`${testSubset.length} test sorusu ve ${trainSubset.length} eğitim kaydı yazıldı (tests/data/).`);

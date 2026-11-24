// GSM8K'nin orijinal dosyalarını (github.com/openai/grade-school-math) belge listesine çevirir.
//   satır: { "question": "...", "answer": "..." }
//   test  → { id: "test-0603",  text: soru }            (numara = dosyadaki satır)
//   train → { id: "train-1315", text: soru + "\n" + cevap } (eğitim verisinde soru ve çözüm birlikte durur)

import { readFileSync } from 'node:fs';

export function loadGsm8k(path, kind) {
  const rows = readFileSync(path, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
  return rows.map((r, i) => ({
    id: `${kind}-${String(i + 1).padStart(4, '0')}`,
    text: kind === 'test' ? r.question : `${r.question}\n${r.answer}`,
  }));
}

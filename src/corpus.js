// Korpus okuyucu: JSONL metnini Document nesnelerine çevirir.
//   { id: "train-0001", text: "Natalia sold clips to 48 of her friends..." }
// JSONL, büyük dil modeli eğitim verisinin standart biçimidir: her satır bir JSON nesnesi.
// Satırda "text" alanı zorunludur; "id" yoksa satır numarasından üretilir. Boş satırlar atlanır.

/** @param {string} content  JSONL dosyasının içeriği */
export function parseJsonl(content) {
  const docs = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      throw new Error(`JSONL ${i + 1}. satır geçerli JSON değil`);
    }
    if (typeof row?.text !== 'string') {
      throw new Error(`JSONL ${i + 1}. satırda "text" alanı (string) yok`);
    }
    const id = row.id === undefined ? `doc-${i + 1}` : String(row.id);
    docs.push({ id, text: row.text });
  }
  return docs;
}

/** Belgeleri JSONL metnine çevirir (testler ve veri hazırlama için). */
export function formatJsonl(docs) {
  return docs.map((d) => JSON.stringify({ id: d.id, text: d.text })).join('\n') + '\n';
}

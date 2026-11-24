// Korpus okuyucu ve ADAPTER: yapay zekâ verisini (JSONL) çekirdeğin sözleşmesine bağlar.
//
// Çekirdek (atomlar ve ExactMatch) docx'teki sözleşmeyi AYNEN korur: girdi FASTA.Entry { header, seq },
// çıktı Sequence.Match { header, pattern, position, length }. Büyük dil modeli eğitim verisi ise JSONL'dir:
// her satır bir belge { id, text }. JsonlFastaAdapter bu iki dünya arasında çevirir; böylece çekirdeğe
// dokunmadan yeni bir veri biçimi eklenmiş olur (Adapter deseni, OCP).

/** JSONL metnini belgelere çevirir. Satırda "text" zorunlu; "id" yoksa satır numarasından üretilir. */
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

export class JsonlFastaAdapter {
  /** { id, text } → FASTA.Entry { header: ">id", seq: text } */
  static toEntry(doc) {
    return { header: `>${doc.id}`, seq: doc.text };
  }

  static toEntries(docs) {
    return docs.map((doc) => JsonlFastaAdapter.toEntry(doc));
  }

  /** FASTA.Entry → { id, text } (başlıktaki ">" atılır) */
  static toDoc(entry) {
    const id = entry.header[0] === '>' ? entry.header.slice(1) : entry.header;
    return { id, text: entry.seq };
  }

  /** Sequence.Match { header, ... } → { id, pattern, position, length } */
  static toMatch(match) {
    return { id: JsonlFastaAdapter.toDoc({ header: match.header, seq: '' }).id, pattern: match.pattern, position: match.position, length: match.length };
  }
}

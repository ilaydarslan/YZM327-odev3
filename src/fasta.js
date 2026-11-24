// FASTA okuyucu: metni FASTA.Entry nesnelerine çevirir.
//   { header: ">chr1 açıklama", seq: "ACGT..." }
// header ">" ile başlar; seq içindeki boşluklar ve satır sonları atılır.

function stripWhitespace(line) {
  let out = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch !== ' ' && ch !== '\t' && ch !== '\r' && ch !== '\n') out += ch;
  }
  return out;
}

/** @param {string} text  FASTA dosyasının içeriği */
export function parseFasta(text) {
  const entries = [];
  let current = null;
  let parts = [];

  const finish = () => {
    if (current) {
      current.seq = parts.join('');
      entries.push(current);
    }
  };

  for (const rawLine of text.split('\n')) {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
    if (line.startsWith('>')) {
      finish();
      current = { header: line.trimEnd(), seq: '' };
      parts = [];
    } else if (current) {
      const clean = stripWhitespace(line);
      if (clean.length > 0) parts.push(clean);
    }
  }
  finish();
  return entries;
}

/** Kayıtları FASTA metnine çevirir (testler ve ölçüm verisi için). */
export function formatFasta(entries, width = 70) {
  const lines = [];
  for (const { header, seq } of entries) {
    lines.push(header);
    for (let i = 0; i < seq.length; i += width) lines.push(seq.slice(i, i + width));
  }
  return lines.join('\n') + '\n';
}

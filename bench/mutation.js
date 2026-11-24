#!/usr/bin/env node
// Negatif kontrol (mutasyon testi): kodun kopyasına bilerek küçük hatalar sokulur ve test takımının
// her birini yakalayıp yakalamadığına bakılır. Yakalanmayan bir mutasyon, testlerde bir boşluk demektir.
//
//   node bench/mutation.js   → bench/results/mutation.json

import { cpSync, readFileSync, writeFileSync, rmSync, mkdtempSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

const MUTATIONS = [
  ['Horspool: kayma bir fazla', 'src/functions/horspool.js', 'shift[alphabet.map[pattern[j]]] = m - 1 - j;', 'shift[alphabet.map[pattern[j]]] = m - j;'],
  ['Shift-Or: yanlış eşleşme biti', 'src/functions/shiftOr.js', 'const hitBit = 1 << (m - 1);', 'const hitBit = 1 << m;'],
  ['KMP: eşleşmeden sonra baştan başla', 'src/functions/kmp.js', 'q = failure[q - 1]; // örtüşen', 'q = 0; // örtüşen'],
  ['Aho-Corasick: failure çıktıları eklenmez', 'src/functions/ahoCorasick.js', 'outputs[r] = own[r].concat(outputs[failure[r]]);', 'outputs[r] = own[r];'],
  ['Boyer-Moore: eşleşmeden sonra m kay', 'src/functions/boyerMoore.js', 's += goodSuffix[0];', 's += m;'],
  ['bm4DNADS: sonek kayması bir fazla', 'src/functions/bm4dnaDs.js', 'i += suffixShift;', 'i += suffixShift + 1;'],
  ['bm4DNAHMbs: desende olmayan q-gram kayması m − q + 2', 'src/functions/bm4dnaHmbs.js', 'const defaultShift = m - q + 1; // SAPMA 1', 'const defaultShift = m - q + 2; // SAPMA 1'],
  ['bm4DNAHMbs: doğrulamada son karakter atlanır', 'src/functions/bm4dnaHmbs.js', 'while (j < m && buf[s + j] === pattern[j]) j++;', 'while (j < m - 1 && buf[s + j] === pattern[j]) j++;\n      j = j === m - 1 ? m : j;'],
  ['Wu-Manber: kayma 0 iken 2 ilerle', 'src/functions/wuManber.js', '    i += 1;\n  }', '    i += 2;\n  }'],
  ['ExactSearchAtom: sıralama yok', 'src/functions/hits.js', 'keys.sort();', ''],
  ['ignoreCase: bütün harfler küçültülür', 'src/functions/alphabet.js', 'if (ignoreCase && c >= A && c <= Z) c += CASE_GAP;', 'if (ignoreCase && c >= A) c = String.fromCharCode(c).toLowerCase().charCodeAt(0);'],
  ['Molekül: en PAHALI atomu seç', 'src/molecules/ExactMatch.js', '.sort((a, b) => a[1].cost - b[1].cost);', '.sort((a, b) => b[1].cost - a[1].cost);'],
];

const results = [];
for (const [title, file, from, to] of MUTATIONS) {
  const dir = mkdtempSync(join(tmpdir(), 'mut-'));
  cpSync(ROOT, dir, { recursive: true, filter: (p) => !p.includes('/.git') && !p.includes('/bench/results') });
  const path = join(dir, file);
  const code = readFileSync(path, 'utf8');
  if (!code.includes(from)) throw new Error(`Mutasyon uygulanamadı: ${title}`);
  writeFileSync(path, code.replace(from, to));
  // Her test en fazla 20 sn; bozuk bir kayma sonsuz döngüye girebilir (donma da yakalanmış sayılır).
  const run = spawnSync(process.execPath, ['--test', '--test-timeout=20000', 'tests/unit/*.test.js'], {
    cwd: dir, encoding: 'utf8', timeout: 240000,
  });
  const failed = Number(/# fail (\d+)/.exec(run.stdout ?? '')?.[1] ?? 0);
  const passed = Number(/# pass (\d+)/.exec(run.stdout ?? '')?.[1] ?? 0);
  const hung = run.error?.code === 'ETIMEDOUT' || /cancelled [1-9]/.test(run.stdout ?? '');
  const caught = failed > 0 || hung;
  results.push({ title, file, failedTests: failed, passedTests: passed, hung, caught });
  console.log(`${caught ? 'YAKALANDI ' : 'KAÇTI     '} ${String(failed).padStart(3)} test kırmızı${hung ? ' (donma)' : ''} — ${title}`);
  rmSync(dir, { recursive: true, force: true });
}
mkdirSync(join(ROOT, 'bench/results'), { recursive: true });
writeFileSync(join(ROOT, 'bench/results/mutation.json'), JSON.stringify(results, null, 2));
console.log(`${results.filter((r) => r.caught).length}/${results.length} mutasyon yakalandı.`);

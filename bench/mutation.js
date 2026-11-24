#!/usr/bin/env node
// Negatif kontrol (mutasyon testi): kodun kopyasına bilerek küçük hatalar sokulur ve test takımının
// her birini yakalayıp yakalamadığına bakılır. Yakalanmayan bir mutasyon, testlerde bir boşluk demektir.
//
//   node bench/mutation.js   → bench/results/mutation.json

import { cpSync, readFileSync, writeFileSync, rmSync, mkdtempSync, mkdirSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
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
  ['Kirlenme: belgeler boşlukla birleştirilir (desen belge sınırını aşar)', 'src/contamination/ContaminationDetector.js', "const SEPARATOR = '\\n';", "const SEPARATOR = ' ';"],
  ['Normalleştirme: harfler küçültülmez', 'src/contamination/normalize.js', 'out += isDigit ? ch : lower;', 'out += ch;'],
];

// Bozuk bir kayma senkron bir sonsuz döngüye girebilir; node:test'in süre sınırı bunu kesemez.
// Bu yüzden test takımı ayrı bir süreç ağacında çalışır ve süre dolunca AĞACIN TAMAMI kapatılır
// (Windows'ta taskkill /T, diğerlerinde süreç grubu). Donma da "yakalandı" sayılır.
const SUITE_TIMEOUT_MS = 60000; // sağlam kodda bütün takım ~6 sn sürer

function killTree(pid) {
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(pid), '/T', '/F']);
  else {
    try { process.kill(-pid, 'SIGKILL'); } catch { /* zaten kapanmış */ }
  }
}

function runSuite(cwd) {
  return new Promise((resolve) => {
    // TAP biçimi açıkça istenir: Node 23+ varsayılan olarak "spec" biçiminde yazar ve "# fail N" satırı olmaz
    const child = spawn(process.execPath, ['--test', '--test-reporter=tap', '--test-timeout=20000', 'tests/unit/*.test.js'], {
      cwd, detached: process.platform !== 'win32',
    });
    let stdout = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', () => {});
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      killTree(child.pid);
    }, SUITE_TIMEOUT_MS);
    child.on('close', () => {
      clearTimeout(timer);
      resolve({ stdout, timedOut });
    });
  });
}

const results = [];
for (const [title, file, from, to] of MUTATIONS) {
  const dir = mkdtempSync(join(tmpdir(), 'mut-'));
  // Windows'ta yol ayracı '\\'; ikisini de aynı biçime getirip .git ve sonuç klasörünü atla
  cpSync(ROOT, dir, {
    recursive: true,
    filter: (p) => {
      const q = p.replaceAll('\\', '/');
      return !q.includes('/.git') && !q.includes('/bench/results');
    },
  });
  const path = join(dir, file);
  // Windows'ta git dosyaları CRLF satır sonlarıyla açabilir; çok satırlı mutasyonlar eşleşsin diye LF'ye çevir
  const code = readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
  if (!code.includes(from)) throw new Error(`Mutasyon uygulanamadı: ${title}`);
  writeFileSync(path, code.replace(from, to));
  const run = await runSuite(dir);
  const failed = Number(/# fail (\d+)/.exec(run.stdout)?.[1] ?? 0);
  const passed = Number(/# pass (\d+)/.exec(run.stdout)?.[1] ?? 0);
  const hung = run.timedOut || /cancelled [1-9]/.test(run.stdout);
  const caught = failed > 0 || hung;
  results.push({ title, file, failedTests: failed, passedTests: passed, hung, caught });
  console.log(`${caught ? 'YAKALANDI ' : 'KAÇTI     '} ${String(failed).padStart(3)} test kırmızı${hung ? ' (donma)' : ''} — ${title}`);
  rmSync(dir, { recursive: true, force: true });
}
mkdirSync(join(ROOT, 'bench/results'), { recursive: true });
writeFileSync(join(ROOT, 'bench/results/mutation.json'), JSON.stringify(results, null, 2));
console.log(`${results.filter((r) => r.caught).length}/${results.length} mutasyon yakalandı.`);

#!/usr/bin/env node
// Raporu sonuç dosyalarından doldurur ve PDF'e çevirir (Chrome, Chromium veya Edge gerekir).
//   node docs/rapor/build.mjs   → docs/rapor.pdf
// Tablolardaki sayılar elle yazılmaz: bench/results/*.json dosyalarından okunur.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const json = (p) => JSON.parse(readFileSync(here(p), 'utf8'));
const tr = (x, d = 1) => x.toFixed(d).replace('.', ',');
const pct = (x, d = 1) => `%${tr(x * 100, d)}`;
const esc = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const val = json('../../bench/results/validation.json');
const contam = json('../../bench/results/contamination.json');
const authors = json('./yazarlar.json');
const mutation = existsSync(here('../../bench/results/mutation.json')) ? json('../../bench/results/mutation.json') : [];

// Doğrulama tablosu
const rows = [...val.table].sort((a, b) => a.geoMeanSlowdown - b.geoMeanSlowdown).map((r) => {
  const cls = r.policy === 'ExactMatch (auto)' ? ' class="best"' : '';
  const name = r.policy.replace('Search', '');
  return `<tr${cls}><td>${name}</td><td class="num">${pct(r.fastestRate)}</td><td class="num">${pct(r.within10Rate)}</td>` +
    `<td class="num">${tr(r.geoMeanSlowdown, 3)}</td><td class="num">${tr(r.worstSlowdown, 2)}</td><td class="num">${tr(r.totalRatio, 3)}</td></tr>`;
}).join('\n');

// Alt kümeler
function stats(sub, pick) {
  let fast = 0, w10 = 0, logs = 0, total = 0, best = 0;
  for (const c of sub) {
    const ms = c.times[pick(c)] ?? Math.max(...Object.values(c.times));
    const s = ms / c.times[c.fastest];
    if (pick(c) === c.fastest) fast++;
    if (s <= 1.1) w10++;
    logs += Math.log(s); total += ms; best += c.times[c.fastest];
  }
  return { n: sub.length, fast: fast / sub.length, w10: w10 / sub.length, geo: Math.exp(logs / sub.length), tot: total / best };
}
const R = val.results;
const auto = (c) => c.chosen.auto;
const allmer = (c) => (c.shape.mAvg < 50 ? 'Bm4DnaDsSearch' : 'Bm4DnaHmbsSearch');
const seen = ['labels', 'normalized', 'printable'];
const k1 = stats(R.filter((c) => c.k === 1), auto), k1a = stats(R.filter((c) => c.k === 1), allmer);
const kn = stats(R.filter((c) => c.k > 1), auto);
const newA = stats(R.filter((c) => !seen.includes(c.alphabet)), auto), oldA = stats(R.filter((c) => seen.includes(c.alphabet)), auto);
const big = stats(R.filter((c) => c.shape.mMax > 64), auto);
const manyK = stats(R.filter((c) => c.k > 512), auto);
const subsets =
  `Kalibrasyonda görülmemiş alfabelerde (${newA.n} vaka) molekülün geometrik ortalama yavaşlaması ${tr(newA.geo, 3)}, görülenlerde (${oldA.n} vaka) ${tr(oldA.geo, 3)}; ` +
  `ızgaranın dışındaki uzun desenlerde (m &gt; 64, ${big.n} vaka) ${tr(big.geo, 3)}, ızgaranın dışındaki desen sayısında (k = 1000, ${manyK.n} vaka) ${tr(manyK.geo, 3)}. ` +
  `Çok desenli vakalarda (k &gt; 1, ${kn.n} vaka) en hızlıyı seçme oranı ${pct(kn.fast)}, tek desenli vakalarda (k = 1, ${k1.n} vaka) ${pct(k1.fast)}. ` +
  `Allmer kuralı yalnızca tek desen için tasarlandığından adil karşılaştırma k = 1 alt kümesidir: orada kural ${tr(k1a.geo, 3)}, molekül ${tr(k1.geo, 3)} geometrik ortalama yavaşlamada.`;

// Kirlenme deneyi (gerçek iş yükü)
const contamRows = contam.repo.map((r) => {
  const best = r.times[r.fastest];
  const second = Object.entries(r.times).sort((a, b) => a[1] - b[1])[1];
  return `<tr><td>${esc(r.method)}</td><td class="num">${r.summary.patterns}</td><td class="num">${r.summary.contaminated} / ${r.summary.items}</td>` +
    `<td>${r.selected.replace('Search', '')}</td><td>${r.fastest.replace('Search', '')} (${tr(best, 1)} ms)</td>` +
    `<td class="num">${tr(r.slowdown, 2)}×</td><td>${second[0].replace('Search', '')} ${tr(second[1] / best, 1)}×, ` +
    `en yavaş ${tr(Math.max(...Object.values(r.times)) / best, 0)}×</td></tr>`;
}).join('\n');
const full = contam.full ?? [];
const contamFull = full.length
  ? full.map((r) => `${esc(r.method)}: ${r.summary.patterns} desen, <b>${r.summary.contaminated}</b> kirli soru (${pct(r.summary.rate, 2)}), ` +
      `seçilen ${r.selected.replace('Search', '')}, toplam ${tr(r.totalMs / 1000, 2)} sn`).join('; ')
  : 'tam veriyle deney çalıştırılmadı';

// Mutasyon özeti
const caught = mutation.filter((m) => m.caught).length;
const hung = mutation.filter((m) => m.hung).length;
const mutationSummary = mutation.length
  ? `${mutation.length} mutasyonun ${caught} tanesi testlerce yakalandı` + (hung ? `; ${hung} tanesinde bozuk kayma sonsuz döngüye girdi ve zaman aşımıyla yakalandı` : '') +
    `. Sonuçlar: <span class="mono">bench/results/mutation.json</span>.`
  : 'Sonuçlar: <span class="mono">bench/results/mutation.json</span>.';

// explain örneği: kirlenme komutunun kararı
const run = spawnSync(process.execPath, [here('../../bin/ios.js'), 'contamination', '--benchmark', here('../../tests/data/gsm8k_test_200.jsonl')], {
  input: readFileSync(here('../../tests/data/gsm8k_train_1000.jsonl')), encoding: 'utf8',
});
const decision = JSON.parse(run.stdout).decision;
const why = decision.why.replace(/\. Uygulanamaz:.*$/, '; NaiveSearch ve ShiftOrSearch uygulanamaz');
const s = decision.shape;
const contamExplain = `{ "selected": "${decision.selected}",\n  "shape": { "n": ${s.n}, "sigma": ${s.sigma}, "k": ${s.k}, "mMin": ${s.mMin}, "mMax": ${s.mMax}, "mAvg": ${s.mAvg.toFixed(1)} },\n  "why": "${esc(why)}" }`;

const m = val.machine;
const html = readFileSync(here('./rapor.html'), 'utf8')
  .replaceAll('{{YAZARLAR}}', authors.yazarlar)
  .replaceAll('{{REPO}}', authors.repo)
  .replaceAll('{{KATKILAR}}', authors.katkilar)
  .replaceAll('{{VALIDATION_ROWS}}', rows)
  .replaceAll('{{SUBSETS}}', subsets)
  .replaceAll('{{CONTAM_ROWS}}', contamRows)
  .replaceAll('{{CONTAM_FULL}}', contamFull)
  .replaceAll('{{CONTAM_EXPLAIN}}', contamExplain)
  .replaceAll('{{MUTATION_SUMMARY}}', mutationSummary)
  .replaceAll('{{MACHINE}}', `${m.cpu}, ${m.cores} çekirdek, ${m.memoryGB} GB, ${m.platform}, Node ${m.node}`);
if (/\{\{[A-Z_]+\}\}/.test(html) || html.includes('⟦')) throw new Error('Doldurulmamış yer tutucu kaldı');
writeFileSync(here('./rapor.build.html'), html);

function findChrome() {
  const candidates = [
    process.env.CHROME,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  const found = candidates.find((p) => existsSync(p));
  if (found) return found;
  return ['google-chrome', 'chromium', 'chromium-browser'].find((c) => spawnSync('which', [c]).status === 0);
}

const chrome = findChrome();
if (!chrome) throw new Error('PDF için Chrome/Chromium/Edge bulunamadı; docs/rapor/rapor.build.html tarayıcıdan yazdırılabilir.');
const out = here('../rapor.pdf');
const res = spawnSync(chrome, ['--headless', '--no-sandbox', '--disable-gpu', '--no-pdf-header-footer',
  `--print-to-pdf=${out}`, pathToFileURL(here('./rapor.build.html')).href], { encoding: 'utf8' });
if (res.status !== 0) throw new Error(res.stderr);
console.log('docs/rapor.pdf yazıldı');

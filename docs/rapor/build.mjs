#!/usr/bin/env node
// Raporu sonuç dosyalarından doldurur ve PDF'e çevirir (Chrome/Chromium gerekir).
//   node docs/rapor/build.mjs   → docs/rapor.pdf
// Sayılar elle yazılmaz: bench/results/*.json dosyalarından okunur.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const json = (p) => JSON.parse(readFileSync(here(p), 'utf8'));
const tr = (x, d = 1) => x.toFixed(d).replace('.', ',');
const pct = (x) => `%${tr(x * 100)}`;

const val = json('../../bench/results/validation.json');
const authors = json('./yazarlar.json');
const mutation = existsSync(here('../../bench/results/mutation.json')) ? json('../../bench/results/mutation.json') : [];

// Doğrulama tablosu
const NAMES = { 'ExactMatch (auto)': 'ExactMatch (auto)' };
const rows = [...val.table].sort((a, b) => a.geoMeanSlowdown - b.geoMeanSlowdown).map((r) => {
  const cls = r.policy === 'ExactMatch (auto)' ? ' class="best"' : '';
  const name = (NAMES[r.policy] ?? r.policy).replace('Search', '');
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
const seen = ['dna', 'protein', 'text'];
const k1 = stats(R.filter((c) => c.k === 1), auto), k1a = stats(R.filter((c) => c.k === 1), allmer);
const kn = stats(R.filter((c) => c.k > 1), auto);
const newA = stats(R.filter((c) => !seen.includes(c.alphabet)), auto), oldA = stats(R.filter((c) => seen.includes(c.alphabet)), auto);
const big = stats(R.filter((c) => c.shape.mMax > 64), auto);
const subsets =
  `Kalibrasyonda görülmemiş alfabelerde (${newA.n} vaka) molekülün geometrik ortalama yavaşlaması ${tr(newA.geo, 3)}, görülenlerde (${oldA.n} vaka) ${tr(oldA.geo, 3)}; ` +
  `ızgaranın dışındaki uzun desenlerde (m &gt; 64, ${big.n} vaka) ${tr(big.geo, 3)}. Model görülmemiş bölgelere iyi genelleşiyor. ` +
  `Çok desenli vakalarda (k &gt; 1, ${kn.n} vaka) en hızlıyı seçme oranı ${pct(kn.fast)}, tek desenli vakalarda (k = 1, ${k1.n} vaka) ${pct(k1.fast)}'tür. ` +
  `Allmer kuralı yalnızca tek desen için tasarlandığından adil karşılaştırma k = 1 alt kümesidir: orada kural ${tr(k1a.geo, 3)}, molekül ${tr(k1.geo, 3)} geometrik ortalama yavaşlamada; ` +
  `toplam sürede kural ${tr(k1a.tot, 3)}, molekül ${tr(k1.tot, 3)} kat.`;

// Mutasyon özeti
const caught = mutation.filter((m) => m.caught).length;
const hung = mutation.filter((m) => m.hung).length;
const mutationSummary = mutation.length
  ? `${mutation.length} mutasyonun ${caught} tanesi testlerce yakalandı; ${hung} tanesinde bozuk kayma sentinel'i aşıp sonsuz döngüye girdi ve zaman aşımıyla yakalandı. Sonuçlar: <span class="mono">bench/results/mutation.json</span>.`
  : 'Sonuçlar: <span class="mono">bench/results/mutation.json</span>.';

// explain örneği
const explain = spawnSync(process.execPath, [here('../../bin/ios.js'), 'explain', '--patterns', 'GGATCC,GAATTC,AAGCTT'], {
  input: readFileSync(here('../../tests/data/lambda_NC_001416.fa')), encoding: 'utf8',
});
const record = JSON.parse(explain.stdout);
const why = record.why.replace(/\. Uygulanamaz:.*$/, '; NaiveSearch uygulanamaz (yalnızca test referansı)');

const m = val.machine;
const html = readFileSync(here('./rapor.html'), 'utf8')
  .replaceAll('{{YAZARLAR}}', authors.yazarlar)
  .replaceAll('{{REPO}}', authors.repo)
  .replaceAll('{{KATKILAR}}', authors.katkilar)
  .replaceAll('{{VALIDATION_ROWS}}', rows)
  .replaceAll('{{SUBSETS}}', subsets)
  .replaceAll('{{MUTATION_SUMMARY}}', mutationSummary)
  .replaceAll('{{MACHINE}}', `${m.cpu}, ${m.cores} çekirdek, ${m.memoryGB} GB, ${m.platform}, Node ${m.node}`)
  .replaceAll('{{EXPLAIN_SELECTED}}', record.selected)
  .replaceAll('{{EXPLAIN_WHY}}', why);
if (/\{\{[A-Z_]+\}\}/.test(html)) throw new Error('Doldurulmamış yer tutucu kaldı');
writeFileSync(here('./rapor.build.html'), html);

const chrome = ['google-chrome', 'chromium', 'chromium-browser'].find((c) => spawnSync('which', [c]).status === 0);
if (!chrome) throw new Error('PDF için Chrome/Chromium bulunamadı; docs/rapor/rapor.build.html tarayıcıdan yazdırılabilir.');
const out = here('../rapor.pdf');
const res = spawnSync(chrome, ['--headless', '--no-sandbox', '--disable-gpu', '--no-pdf-header-footer',
  `--print-to-pdf=${out}`, 'file://' + here('./rapor.build.html')], { encoding: 'utf8' });
if (res.status !== 0) throw new Error(res.stderr);
console.log('docs/rapor.pdf yazıldı');

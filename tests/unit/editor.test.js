// İş akışı editörünün motoru (web/workflow.js) ve bileşenleri (web/components.js): tarayıcı olmadan test edilir.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { COMPONENTS } from '../../web/components.js';
import { Workflow, PRESETS } from '../../web/workflow.js';
import { ExactMatch } from '../../src/molecules/ExactMatch.js';
import { parseFasta } from '../../src/fasta.js';

const ctx = { load: (name) => readFile(fileURLToPath(new URL(`../data/${name}`, import.meta.url)), 'utf8') };

function preset(name) {
  const wf = new Workflow(COMPONENTS);
  PRESETS[name](wf);
  return wf;
}
const sink = (wf) => [...wf.nodes.values()].find((n) => n.type === 'view.result').id;

describe('İş akışı editörü', () => {
  it('hazır akış: şartnamedeki explain örneği, komut satırıyla aynı karar ve eşleşmeler', async () => {
    const wf = preset('Şartname: explain (lambda)');
    const out = (await wf.run(ctx)).get(sink(wf));
    assert.equal(out.error, undefined);
    const entries = parseFasta(await ctx.load('lambda_NC_001416.fa'));
    const em = new ExactMatch({ patterns: ['GGATCC', 'GAATTC', 'AAGCTT'] });
    const expected = [...em.run(entries)];
    assert.equal(out.value.record.selected, em.record.selected);
    assert.equal(out.value.matches.length, expected.length);
    assert.deepEqual(out.value.matches[0], { id: 'NC_001416.1 Enterobacteria phage lambda, complete genome', pattern: expected[0].pattern, position: expected[0].position, length: expected[0].length });
  });

  it('hazır akış: kirlenme taraması, test-0582/0603/0633', async () => {
    const wf = preset('Kirlenme taraması (GSM8K)');
    const out = (await wf.run(ctx)).get(sink(wf));
    assert.deepEqual(out.value.items.filter((i) => i.contaminated).map((i) => i.id), ['test-0582', 'test-0603', 'test-0633']);
  });

  it('hazır akış: normalize + arama çalışır', async () => {
    const wf = preset('Normalize + arama');
    const out = (await wf.run(ctx)).get(sink(wf));
    assert.ok(out.value.matches.length > 0);
  });

  it('tür uyumsuz bağlantı reddedilir', () => {
    const wf = new Workflow(COMPONENTS);
    const pats = wf.addNode('patterns.manual');
    const norm = wf.addNode('transform.normalize');
    assert.throws(() => wf.connect(pats, norm, 'docs'), /Tür uyumsuz/);
  });

  it('döngü oluşturan bağlantı reddedilir', () => {
    const wf = new Workflow(COMPONENTS);
    const a = wf.addNode('transform.normalize');
    const b = wf.addNode('transform.normalize');
    wf.connect(a, b, 'docs');
    assert.throws(() => wf.connect(b, a, 'docs'), /döngü/);
  });

  it('bağlı olmayan girdi ve sonraki adımlar hata olarak gösterilir', async () => {
    const wf = new Workflow(COMPONENTS);
    const em = wf.addNode('search.exactMatch');
    const view = wf.addNode('view.result');
    wf.connect(em, view, 'value');
    const results = await wf.run(ctx);
    assert.match(results.get(em).error, /bağlı değil/);
    assert.match(results.get(view).error, /Önceki adım/);
  });

  it('zorla strateji ayarı molekülü o atomla çalıştırır', async () => {
    const wf = new Workflow(COMPONENTS);
    const text = wf.addNode('data.text');
    const pats = wf.addNode('patterns.manual');
    wf.nodes.get(pats).config.patterns = 'the';
    const em = wf.addNode('search.exactMatch');
    wf.nodes.get(em).config.strategy = 'KmpSearch';
    wf.connect(text, em, 'docs');
    wf.connect(pats, em, 'patterns');
    const out = (await wf.run(ctx)).get(em).value;
    assert.equal(out.record.selected, 'KmpSearch');
    assert.deepEqual(out.matches.map((m) => [m.id, m.position]), [['satir-1', 0], ['satir-1', 15], ['satir-2', 0]]);
  });
});

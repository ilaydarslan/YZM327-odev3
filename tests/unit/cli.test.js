// Komut satırı testleri (bin/ios.js): run, explain ve contamination.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ExactMatch } from '../../src/molecules/ExactMatch.js';
import { parseJsonl } from '../../src/corpus.js';

const CLI = fileURLToPath(new URL('../../bin/ios.js', import.meta.url));
const DATA = (name) => fileURLToPath(new URL(`../data/${name}`, import.meta.url));
const CORPUS = '{"id":"d1","text":"the cat sat on the mat"}\n{"id":"d2","text":"The Cat ran"}\n';

function cli(args, input = CORPUS) {
  return spawnSync(process.execPath, [CLI, ...args], { input, encoding: 'utf8' });
}

describe('bin/ios.js', () => {
  it('run: JSONL çıktısı molekülle birebir aynı', () => {
    const res = cli(['run', 'ExactMatch', '--patterns', 'cat,the']);
    assert.equal(res.status, 0, res.stderr);
    const lines = res.stdout.trim().split('\n').map((l) => JSON.parse(l));
    const expected = [...new ExactMatch({ patterns: ['cat', 'the'] }).run(parseJsonl(CORPUS))];
    assert.deepEqual(lines, expected);
    assert.match(res.stderr, /seçilen/);
  });

  it('run --ignoreCase --strategy KmpSearch', () => {
    const res = cli(['run', 'ExactMatch', '--patterns', 'CAT', '--ignoreCase', '--strategy', 'KmpSearch']);
    assert.equal(res.status, 0, res.stderr);
    const positions = res.stdout.trim().split('\n').map((l) => JSON.parse(l)).map((m) => [m.id, m.position]);
    assert.deepEqual(positions, [['d1', 4], ['d2', 4]]);
  });

  it('explain: kararı JSON olarak yazar', () => {
    const res = cli(['explain', '--patterns', 'cat,the']);
    assert.equal(res.status, 0, res.stderr);
    const record = JSON.parse(res.stdout);
    for (const key of ['requested', 'selected', 'shape', 'estimates', 'why']) assert.ok(key in record, key);
  });

  it('bilinmeyen strateji: hata kodu ve geçerli seçenekler', () => {
    const res = cli(['run', 'ExactMatch', '--patterns', 'a', '--strategy', 'Yok']);
    assert.notEqual(res.status, 0);
    assert.match(res.stderr, /Geçerli seçenekler: auto, NaiveSearch/);
  });

  it('desen verilmezse hata', () => {
    const res = cli(['run', 'ExactMatch']);
    assert.notEqual(res.status, 0);
  });

  it('geçersiz JSONL satırı hata verir', () => {
    const res = cli(['run', 'ExactMatch', '--patterns', 'a'], '{"id":"x","text":"a"}\nbu json değil\n');
    assert.notEqual(res.status, 0);
    assert.match(res.stderr, /2\. satır/);
  });

  it('contamination: GSM8K örneğinde kirli soruları bulur', () => {
    const res = cli(['contamination', '--benchmark', DATA('gsm8k_test_200.jsonl')], readFileSync(DATA('gsm8k_train_1000.jsonl'), 'utf8'));
    assert.equal(res.status, 0, res.stderr);
    const report = JSON.parse(res.stdout);
    assert.equal(report.summary.items, 200);
    assert.deepEqual(report.contaminated.map((r) => r.id), ['test-0582', 'test-0603', 'test-0633']);
    assert.ok(report.decision.selected);
    assert.match(res.stderr, /Kirlenme/);
  });

  it('contamination: --method substring ve bilinmeyen yöntem', () => {
    const ok = cli(['contamination', '--benchmark', DATA('gsm8k_test_200.jsonl'), '--method', 'substring'], readFileSync(DATA('gsm8k_train_1000.jsonl'), 'utf8'));
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(JSON.parse(ok.stdout).method, /GPT-4/);
    const bad = cli(['contamination', '--benchmark', DATA('gsm8k_test_200.jsonl'), '--method', 'yok']);
    assert.notEqual(bad.status, 0);
    assert.match(bad.stderr, /Geçerli seçenekler: ngram, substring/);
  });
});

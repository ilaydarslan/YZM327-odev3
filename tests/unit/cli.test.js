// Komut satırı testleri (şartname 4.5).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ExactMatch } from '../../src/molecules/ExactMatch.js';
import { parseFasta } from '../../src/fasta.js';

const CLI = fileURLToPath(new URL('../../bin/ios.js', import.meta.url));
const FASTA = '>chr1 deneme\nACGTACGTGGCC\nAAGGCC\n>chr2\nggccACGT\n';

function cli(args, input = FASTA) {
  return spawnSync(process.execPath, [CLI, ...args], { input, encoding: 'utf8' });
}

describe('bin/ios.js', () => {
  it('run: JSONL çıktısı molekülle birebir aynı', () => {
    const res = cli(['run', 'ExactMatch', '--patterns', 'ACGT,GGCC']);
    assert.equal(res.status, 0, res.stderr);
    const lines = res.stdout.trim().split('\n').map((l) => JSON.parse(l));
    const expected = [...new ExactMatch({ patterns: ['ACGT', 'GGCC'] }).run(parseFasta(FASTA))];
    assert.deepEqual(lines, expected);
    assert.match(res.stderr, /seçilen/);
  });

  it('run --ignoreCase --strategy KmpSearch', () => {
    const res = cli(['run', 'ExactMatch', '--patterns', 'ggcc', '--ignoreCase', '--strategy', 'KmpSearch']);
    assert.equal(res.status, 0, res.stderr);
    const positions = res.stdout.trim().split('\n').map((l) => JSON.parse(l)).map((m) => [m.header, m.position]);
    assert.deepEqual(positions, [['>chr1 deneme', 8], ['>chr1 deneme', 14], ['>chr2', 0]]);
  });

  it('explain: kararı JSON olarak yazar', () => {
    const res = cli(['explain', '--patterns', 'ACGT,GGCC']);
    assert.equal(res.status, 0, res.stderr);
    const record = JSON.parse(res.stdout);
    for (const key of ['requested', 'selected', 'shape', 'estimates', 'why']) assert.ok(key in record, key);
  });

  it('bilinmeyen strateji: hata kodu ve geçerli seçenekler', () => {
    const res = cli(['run', 'ExactMatch', '--patterns', 'A', '--strategy', 'Yok']);
    assert.notEqual(res.status, 0);
    assert.match(res.stderr, /Geçerli seçenekler: auto, NaiveSearch/);
  });

  it('desen verilmezse hata', () => {
    const res = cli(['run', 'ExactMatch']);
    assert.notEqual(res.status, 0);
  });
});

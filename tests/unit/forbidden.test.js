// Şartname 4.3: atomların içinde indexOf, includes, startsWith, RegExp ve benzeri hazır arama
// işlevleri kullanılamaz (yalnızca NaiveSearch kullanabilir; biz onda da kullanmıyoruz).
// Bu test kaynak kodu tarar; yorumlar taramadan önce silinir.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../src/', import.meta.url));
const DIRS = ['functions', 'atomic'];
const FORBIDDEN = [
  /\.indexOf\s*\(/, /\.lastIndexOf\s*\(/, /\.includes\s*\(/, /\.startsWith\s*\(/, /\.endsWith\s*\(/,
  /\bRegExp\b/, /\.match(All)?\s*\(/, /\.replace(All)?\s*\(\s*\//, /\/[^/\n*]+\/[gimsuy]*\.(test|exec)\s*\(/,
  /console\.log/, /from\s+['"]node:(fs|net|http|https)['"]/,
];

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('Yasaklı işlevler atomlarda ve çekirdeklerde yok', () => {
  for (const dir of DIRS) {
    for (const file of readdirSync(ROOT + dir).filter((f) => f.endsWith('.js'))) {
      it(`${dir}/${file}`, () => {
        const code = stripComments(readFileSync(ROOT + dir + '/' + file, 'utf8'));
        for (const rule of FORBIDDEN) {
          assert.equal(rule.test(code), false, `${dir}/${file} içinde yasak kullanım: ${rule}`);
        }
      });
    }
  }
});
